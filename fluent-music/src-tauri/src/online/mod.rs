//! Online music from YouTube Music. Search and stream lookup talk to YouTube's own web API directly (see `innertube`), which is far
//! faster and more reliable than starting a helper program. yt-dlp is only an optional last resort for videos the direct lookup cannot
//! play. Streams are served to the player through a local CORS proxy (see `proxy`). Lyrics reuse the LRCLIB lookup in `lyrics.rs`;
//! this module only adds a small on-disk cache for them.
mod fetch;
mod http;
pub mod innertube;
pub mod proxy;
pub mod youtube;

use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OnlineTrack {
    /// always "youtube" (kept as a field so saved tracks stay self-describing)
    pub source: String,
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    pub cover_url: String,
}

#[derive(Serialize)]
pub struct Resolved {
    pub url: String,
}

static APP: std::sync::OnceLock<AppHandle> = std::sync::OnceLock::new();

/// progress of an online song's download for the interface: stage = "resolving" | "downloading" | "ready" | "failed"
pub(crate) fn emit_load(id: &str, stage: &str, bytes: u64) {
    if let Some(app) = APP.get() {
        let _ = app.emit("online-load", serde_json::json!({ "id": id, "stage": stage, "bytes": bytes }));
    }
}

/// the songs the user keeps (liked / saved): their cached audio is never deleted
#[tauri::command]
pub fn online_pin(ids: Vec<String>) {
    fetch::set_pinned(ids);
}

pub fn init(app: &AppHandle) {
    let _ = APP.set(app.clone());
    if let Ok(dir) = app.path().app_data_dir() {
        youtube::set_bin_dir(dir.join("bin"));
    }
    if let Ok(dir) = app.path().app_cache_dir() {
        fetch::set_dir(dir.join("audio"));
    }
}

/// finished searches: going back to a query is instant
type SearchCache = HashMap<String, (Instant, Vec<OnlineTrack>)>;
static SEARCHED: Mutex<Option<SearchCache>> = Mutex::new(None);
const SEARCH_TTL: Duration = Duration::from_secs(600);

fn search_blocking(q: &str, limit: usize) -> Result<Vec<OnlineTrack>, String> {
    let key = format!("{limit}:{}", q.to_lowercase());
    if let Some((at, t)) = SEARCHED.lock().ok().and_then(|g| g.as_ref().and_then(|m| m.get(&key).cloned())) {
        if at.elapsed() < SEARCH_TTL {
            return Ok(t);
        }
    }
    // songs first (clean metadata + square art); when YouTube Music has none, fall back to plain videos, then to yt-dlp
    let mut res = innertube::search(q, false, limit);
    if matches!(&res, Ok(t) if t.is_empty()) {
        res = innertube::search(q, true, limit);
    }
    let tracks = match res {
        Ok(t) if !t.is_empty() => t,
        other => match youtube::find_ytdlp().map(|_| youtube::search(q, limit)) {
            Some(Ok(t)) if !t.is_empty() => t,
            _ => other?,
        },
    };
    if let Ok(mut g) = SEARCHED.lock() {
        let m = g.get_or_insert_with(HashMap::new);
        m.retain(|_, (at, _)| at.elapsed() < SEARCH_TTL);
        m.insert(key, (Instant::now(), tracks.clone()));
    }
    Ok(tracks)
}

#[tauri::command]
pub async fn online_search(query: String, limit: Option<usize>) -> Result<Vec<OnlineTrack>, String> {
    let q = query.trim().chars().take(200).collect::<String>();
    if q.is_empty() {
        return Ok(vec![]);
    }
    let limit = limit.unwrap_or(20).clamp(1, 40);
    tauri::async_runtime::spawn_blocking(move || search_blocking(&q, limit)).await.map_err(|e| e.to_string())?
}

/// finished lookups: the local address of a cached file stays valid as long as the file does
static RESOLVED: Mutex<Option<HashMap<String, (Instant, String)>>> = Mutex::new(None);
const RESOLVE_TTL: Duration = Duration::from_secs(8 * 3600);

fn resolve_blocking(id: &str, fresh: bool) -> Result<Resolved, String> {
    if !innertube::valid_id(id) {
        return Err("E_BAD_ID".into());
    }
    if !fresh {
        if let Some((at, url)) = RESOLVED.lock().ok().and_then(|g| g.as_ref().and_then(|m| m.get(id).cloned())) {
            if at.elapsed() < RESOLVE_TTL {
                return Ok(Resolved { url });
            }
        }
    }
    // the audio is downloaded into the cache first and played from there (see `fetch`)
    let local = match fetch::ensure(id, fresh)? {
        fetch::Ready::File(path, mime) => proxy::register_file(path, mime)?,
        fetch::Ready::Live(live) => proxy::register_live(live)?,
    };
    if let Ok(mut g) = RESOLVED.lock() {
        let m = g.get_or_insert_with(HashMap::new);
        m.retain(|_, (at, _)| at.elapsed() < RESOLVE_TTL);
        m.insert(id.to_string(), (Instant::now(), local.clone()));
    }
    Ok(Resolved { url: local })
}

#[tauri::command]
pub async fn online_resolve(id: String, fresh: Option<bool>) -> Result<Resolved, String> {
    tauri::async_runtime::spawn_blocking(move || resolve_blocking(&id, fresh.unwrap_or(false))).await.map_err(|e| e.to_string())?
}

/// What the stream proxy last saw from YouTube (shown with a playback error so a failure can be understood)
#[tauri::command]
pub fn online_diag() -> String {
    proxy::last_status()
}

/// cover bytes for the theme colour (the web view cannot read cross-origin pixels itself)
#[tauri::command]
pub async fn online_image(url: String) -> Result<tauri::ipc::Response, String> {
    tauri::async_runtime::spawn_blocking(move || innertube::fetch_image(&url)).await.map_err(|e| e.to_string())?.map(tauri::ipc::Response::new)
}

// ---------- yt-dlp management ----------

#[tauri::command]
pub async fn online_ytdlp_configure(path: String) -> Result<youtube::YtdlpStatus, String> {
    youtube::set_custom_path(&path);
    tauri::async_runtime::spawn_blocking(youtube::status).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn online_ytdlp_status() -> Result<youtube::YtdlpStatus, String> {
    tauri::async_runtime::spawn_blocking(youtube::status).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn online_ytdlp_install(app: AppHandle, runtime: bool) -> Result<youtube::YtdlpStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let r = youtube::install(runtime, &|p| {
            let _ = app.emit("online-progress", p);
        });
        if let Ok(mut g) = RESOLVED.lock() {
            *g = None; // streams resolved by an older yt-dlp are not trusted any more
        }
        r
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn online_ytdlp_remove() -> Result<youtube::YtdlpStatus, String> {
    tauri::async_runtime::spawn_blocking(|| youtube::remove_managed().map(|_| youtube::status())).await.map_err(|e| e.to_string())?
}

// ---------- lyrics cache ----------

fn lyrics_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let d = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("lyrics");
    fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

fn cache_file(app: &AppHandle, key: &str) -> Result<PathBuf, String> {
    Ok(lyrics_dir(app)?.join(format!("{}.json", crate::util::fnv(key))))
}

#[tauri::command]
pub fn lyrics_cache_get(app: AppHandle, key: String) -> Option<String> {
    let f = cache_file(&app, &key).ok()?;
    fs::read_to_string(f).ok()
}

#[tauri::command]
pub fn lyrics_cache_put(app: AppHandle, key: String, data: String) -> Result<(), String> {
    if data.len() > 512 * 1024 {
        return Err("too large".into());
    }
    fs::write(cache_file(&app, &key)?, data).map_err(|e| e.to_string())
}

/// Deletes every cached lyrics file; returns how many
#[tauri::command]
pub fn lyrics_cache_clear(app: AppHandle) -> Result<usize, String> {
    let dir = lyrics_dir(&app)?;
    let mut n = 0;
    for e in fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
        if e.path().extension().and_then(|x| x.to_str()) == Some("json") && fs::remove_file(e.path()).is_ok() {
            n += 1;
        }
    }
    Ok(n)
}
