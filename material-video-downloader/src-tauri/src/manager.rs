use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicU8, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Duration;

use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;

use crate::models::*;
use crate::util::*;
use crate::{direct, hls, ytdlp};

pub const CTL_RUN: u8 = 0;
pub const CTL_PAUSE: u8 = 1;
pub const CTL_CANCEL: u8 = 2;

pub struct Control {
    pub flag: AtomicU8,
}

impl Control {
    pub fn check(&self) -> Result<(), Stop> {
        match self.flag.load(Ordering::Relaxed) {
            CTL_PAUSE => Err(Stop::Paused),
            CTL_CANCEL => Err(Stop::Canceled),
            _ => Ok(()),
        }
    }
}

/// Counters shared between a running task and its progress reporter.
pub struct Shared {
    pub downloaded: AtomicU64,
    pub total: AtomicU64,
    pub stop: AtomicBool,
}

impl Shared {
    pub fn new(downloaded: u64, total: u64) -> Arc<Self> {
        Arc::new(Self {
            downloaded: AtomicU64::new(downloaded),
            total: AtomicU64::new(total),
            stop: AtomicBool::new(false),
        })
    }
}

pub struct Manager {
    pub app: AppHandle,
    pub data_dir: PathBuf,
    pub downloads: Mutex<Vec<Download>>,
    pub controls: Mutex<HashMap<String, Arc<Control>>>,
    pub settings: Mutex<Settings>,
    pub limiter: Arc<Limiter>,
    pub http: reqwest::Client,
    pub server_port: Mutex<Option<u16>>,
    pub install_lock: tokio::sync::Mutex<()>,
}

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

impl Manager {
    pub fn new(app: AppHandle, data_dir: PathBuf) -> Arc<Self> {
        let _ = std::fs::create_dir_all(&data_dir);
        let settings: Settings = std::fs::read_to_string(data_dir.join("settings.json"))
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        let mut downloads: Vec<Download> = std::fs::read_to_string(data_dir.join("downloads.json"))
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        // Anything that was in flight when the app closed becomes resumable.
        for d in downloads.iter_mut() {
            if matches!(d.status, Status::Queued | Status::Downloading | Status::Merging) {
                d.status = Status::Paused;
                d.speed = 0.0;
                d.eta = None;
            }
        }
        let http = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::limited(10))
            .connect_timeout(Duration::from_secs(20))
            .read_timeout(Duration::from_secs(45))
            .build()
            .expect("failed to build HTTP client");
        let limiter = Arc::new(Limiter::new());
        limiter.set_kb(settings.speed_limit_kb);
        Arc::new(Self {
            app,
            data_dir,
            downloads: Mutex::new(downloads),
            controls: Mutex::new(HashMap::new()),
            settings: Mutex::new(settings),
            limiter,
            http,
            server_port: Mutex::new(None),
            install_lock: tokio::sync::Mutex::new(()),
        })
    }

    // ---------- settings ----------

    pub fn settings(&self) -> Settings {
        lock(&self.settings).clone()
    }

    pub fn default_dir(&self) -> PathBuf {
        use tauri::Manager as _;
        let base = self
            .app
            .path()
            .download_dir()
            .or_else(|_| self.app.path().home_dir())
            .unwrap_or_else(|_| PathBuf::from("."));
        base.join("Material Video Downloader")
    }

    pub fn download_dir(&self) -> PathBuf {
        let s = self.settings();
        if s.download_dir.trim().is_empty() {
            self.default_dir()
        } else {
            PathBuf::from(s.download_dir)
        }
    }

    pub fn save_settings(self: &Arc<Self>, mut new: Settings) {
        new.max_concurrent = new.max_concurrent.clamp(1, 10);
        new.connections = new.connections.clamp(1, 16);
        self.limiter.set_kb(new.speed_limit_kb);
        if let Ok(json) = serde_json::to_string_pretty(&new) {
            let _ = std::fs::write(self.data_dir.join("settings.json"), json);
        }
        *lock(&self.settings) = new;
        self.schedule();
    }

    // ---------- persistence ----------

    pub fn persist(&self) {
        let json = {
            let list = lock(&self.downloads);
            serde_json::to_string(&*list)
        };
        if let Ok(json) = json {
            let tmp = self.data_dir.join("downloads.json.tmp");
            if std::fs::write(&tmp, json).is_ok() {
                let _ = std::fs::rename(&tmp, self.data_dir.join("downloads.json"));
            }
        }
    }

    // ---------- queries ----------

    pub fn list(&self) -> Vec<Download> {
        lock(&self.downloads).clone()
    }

    pub fn get(&self, id: &str) -> Option<Download> {
        lock(&self.downloads).iter().find(|d| d.id == id).cloned()
    }

    /// Mutate a download and push the new state to the UI.
    pub fn update<F: FnOnce(&mut Download)>(&self, id: &str, f: F) -> Option<Download> {
        let snapshot = {
            let mut list = lock(&self.downloads);
            let d = list.iter_mut().find(|d| d.id == id)?;
            f(d);
            d.clone()
        };
        let _ = self.app.emit("download-update", &snapshot);
        Some(snapshot)
    }

    /// Store segment progress without notifying the UI (used for resume data).
    pub fn set_segments(&self, id: &str, segs: Vec<Seg>) {
        let mut list = lock(&self.downloads);
        if let Some(d) = list.iter_mut().find(|d| d.id == id) {
            d.segments = segs;
        }
    }

    pub fn control(&self, id: &str) -> Option<Arc<Control>> {
        lock(&self.controls).get(id).cloned()
    }

    // ---------- adding ----------

    pub fn add(self: &Arc<Self>, req: AddRequest) -> Result<Download, String> {
        let dir = match req.dir.as_ref().filter(|d| !d.trim().is_empty()) {
            Some(d) => PathBuf::from(d),
            None => self.download_dir(),
        };
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        let kind = req.kind.unwrap_or(Kind::Direct);
        let mut filename = sanitize(if req.filename.is_empty() { &req.title } else { &req.filename });
        if ext_of(&filename).is_empty() {
            filename = match kind {
                Kind::Hls | Kind::Ytdlp => format!("{filename}.mp4"),
                Kind::Direct => format!("{filename}.mp4"),
            };
        }
        if req.audio_only && kind == Kind::Ytdlp {
            let ext = if req.audio_format.is_empty() { "m4a" } else { req.audio_format.as_str() };
            filename = with_ext(&filename, ext);
        }
        let taken: Vec<String> = self
            .list()
            .iter()
            .filter(|d| d.dir == dir.to_string_lossy() && d.status != Status::Completed)
            .map(|d| d.filename.clone())
            .collect();
        let filename = unique_name(&dir, &filename, &taken);

        let start = req.start.unwrap_or(true);
        let d = Download {
            id: uuid::Uuid::new_v4().to_string(),
            url: req.url,
            kind,
            title: if req.title.is_empty() { stem_of(&filename) } else { req.title },
            thumbnail: req.thumbnail,
            site: req.site,
            filename,
            dir: dir.to_string_lossy().to_string(),
            status: if start { Status::Queued } else { Status::Paused },
            total: req.size.unwrap_or(0),
            quality: req.quality,
            selector: req.selector,
            audio_only: req.audio_only,
            audio_format: req.audio_format,
            referer: req.referer,
            user_agent: req.user_agent,
            cookie: req.cookie,
            duration: req.duration,
            created_at: now_ms(),
            ..Default::default()
        };
        lock(&self.downloads).insert(0, d.clone());
        let _ = self.app.emit("download-update", &d);
        self.persist();
        self.schedule();
        Ok(d)
    }

    // ---------- scheduling ----------

    pub fn schedule(self: &Arc<Self>) {
        let max = self.settings().max_concurrent as usize;
        let to_start: Vec<String> = {
            let list = lock(&self.downloads);
            let running = list
                .iter()
                .filter(|d| matches!(d.status, Status::Downloading | Status::Merging))
                .count();
            let controls = lock(&self.controls);
            if running >= max {
                Vec::new()
            } else {
                // Oldest queued first.
                list.iter()
                    .rev()
                    .filter(|d| d.status == Status::Queued && !controls.contains_key(&d.id))
                    .take(max - running)
                    .map(|d| d.id.clone())
                    .collect()
            }
        };
        for id in to_start {
            self.start(&id);
        }
    }

    fn start(self: &Arc<Self>, id: &str) {
        let ctl = Arc::new(Control { flag: AtomicU8::new(CTL_RUN) });
        {
            let mut controls = lock(&self.controls);
            if controls.contains_key(id) {
                return;
            }
            controls.insert(id.to_string(), ctl.clone());
        }
        self.update(id, |d| {
            d.status = Status::Downloading;
            d.error = None;
            d.speed = 0.0;
        });
        let m = self.clone();
        let id = id.to_string();
        tauri::async_runtime::spawn(async move {
            let kind = m.get(&id).map(|d| d.kind);
            let result = match kind {
                Some(Kind::Direct) => direct::run(&m, &id, &ctl).await,
                Some(Kind::Hls) => hls::run(&m, &id, &ctl).await,
                Some(Kind::Ytdlp) => ytdlp::run(&m, &id, &ctl).await,
                None => Err(Stop::Canceled),
            };
            lock(&m.controls).remove(&id);
            match result {
                Ok(()) => m.finish_ok(&id),
                Err(Stop::Paused) => {
                    m.update(&id, |d| {
                        d.status = Status::Paused;
                        d.speed = 0.0;
                        d.eta = None;
                    });
                }
                Err(Stop::Canceled) => { /* removal already handled by remove() */ }
                Err(Stop::Failed(msg)) => {
                    m.update(&id, |d| {
                        d.status = Status::Failed;
                        d.speed = 0.0;
                        d.eta = None;
                        d.error = Some(msg);
                    });
                    if m.settings().notifications {
                        if let Some(d) = m.get(&id) {
                            let _ = m
                                .app
                                .notification()
                                .builder()
                                .title("Download failed")
                                .body(d.title.clone())
                                .show();
                        }
                    }
                }
            }
            m.persist();
            m.schedule();
        });
    }

    fn finish_ok(&self, id: &str) {
        let done = self.update(id, |d| {
            d.status = Status::Completed;
            d.progress = 100.0;
            d.speed = 0.0;
            d.eta = None;
            d.segments.clear();
            d.completed_at = Some(now_ms());
            if d.total == 0 {
                d.total = d.downloaded;
            } else {
                d.downloaded = d.total.max(d.downloaded);
            }
        });
        if let Some(d) = done {
            if self.settings().notifications {
                let _ = self
                    .app
                    .notification()
                    .builder()
                    .title("Download complete")
                    .body(d.title)
                    .show();
            }
        }
    }

    /// Emit progress every 400 ms until `shared.stop` is raised.
    pub fn spawn_reporter(self: &Arc<Self>, id: &str, shared: Arc<Shared>) {
        let m = self.clone();
        let id = id.to_string();
        tauri::async_runtime::spawn(async move {
            let mut last_bytes = shared.downloaded.load(Ordering::Relaxed);
            let mut speed = 0.0f64;
            let mut ticks = 0u32;
            while !shared.stop.load(Ordering::Relaxed) {
                tokio::time::sleep(Duration::from_millis(400)).await;
                let now = shared.downloaded.load(Ordering::Relaxed);
                let total = shared.total.load(Ordering::Relaxed);
                let inst = (now.saturating_sub(last_bytes)) as f64 / 0.4;
                speed = if speed == 0.0 { inst } else { speed * 0.6 + inst * 0.4 };
                last_bytes = now;
                let progress = if total > 0 { (now as f64 / total as f64 * 100.0).min(99.9) } else { 0.0 };
                let eta = if speed > 1.0 && total > now { Some(((total - now) as f64 / speed) as u64) } else { None };
                m.update(&id, |d| {
                    if d.status == Status::Downloading {
                        d.downloaded = now;
                        d.total = total;
                        d.progress = progress;
                        d.speed = speed;
                        d.eta = eta;
                    }
                });
                ticks += 1;
                if ticks % 5 == 0 {
                    m.persist();
                }
            }
        });
    }

    // ---------- user actions ----------

    pub fn pause(&self, id: &str) {
        if let Some(ctl) = self.control(id) {
            ctl.flag.store(CTL_PAUSE, Ordering::Relaxed);
        } else {
            self.update(id, |d| {
                if d.status == Status::Queued {
                    d.status = Status::Paused;
                }
            });
            self.persist();
        }
    }

    pub fn resume(self: &Arc<Self>, id: &str) {
        self.update(id, |d| {
            if matches!(d.status, Status::Paused | Status::Failed) {
                d.status = Status::Queued;
                d.error = None;
            }
        });
        self.persist();
        self.schedule();
    }

    pub fn pause_all(&self) {
        let ids: Vec<String> = self
            .list()
            .into_iter()
            .filter(|d| matches!(d.status, Status::Queued | Status::Downloading | Status::Merging))
            .map(|d| d.id)
            .collect();
        for id in ids {
            self.pause(&id);
        }
    }

    pub fn resume_all(self: &Arc<Self>) {
        let ids: Vec<String> = self
            .list()
            .into_iter()
            .filter(|d| matches!(d.status, Status::Paused | Status::Failed))
            .map(|d| d.id)
            .collect();
        for id in ids {
            self.update(&id, |d| {
                d.status = Status::Queued;
                d.error = None;
            });
        }
        self.persist();
        self.schedule();
    }

    pub fn remove(self: &Arc<Self>, id: &str, delete_file: bool) {
        if let Some(ctl) = self.control(id) {
            ctl.flag.store(CTL_CANCEL, Ordering::Relaxed);
        }
        let removed = {
            let mut list = lock(&self.downloads);
            list.iter().position(|d| d.id == id).map(|i| list.remove(i))
        };
        if let Some(d) = removed {
            let dir = PathBuf::from(&d.dir);
            let part = dir.join(format!("{}.part", d.filename));
            let _ = std::fs::remove_file(&part);
            let _ = std::fs::remove_dir_all(dir.join(format!(".{}.hls", d.id)));
            if d.status != Status::Completed {
                ytdlp::cleanup_partials(&dir, &stem_of(&d.filename));
            }
            if delete_file && d.status == Status::Completed {
                if let Some(p) = d.path {
                    let _ = std::fs::remove_file(p);
                }
            }
        }
        let _ = self.app.emit("download-removed", id.to_string());
        self.persist();
        self.schedule();
    }

    pub fn clear_finished(self: &Arc<Self>) {
        let ids: Vec<String> = self
            .list()
            .into_iter()
            .filter(|d| d.status == Status::Completed)
            .map(|d| d.id)
            .collect();
        for id in ids {
            self.remove(&id, false);
        }
    }
}
