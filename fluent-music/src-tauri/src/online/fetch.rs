//! Audio for online songs. A YouTube link is never handed to the player directly (YouTube refuses such requests, usually half way
//! through the song). The audio is downloaded by yt-dlp (or, without it, by our own chunked download) into a cache file, and the
//! player reads that file through the stream proxy. Playback starts as soon as the first part has arrived, the rest keeps
//! downloading behind it. Finished files stay in the cache (liked / saved songs are never deleted), so replaying is instant.
use super::{innertube, youtube};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Condvar, Mutex, OnceLock};
use std::time::Duration;

const CHUNK: u64 = 1024 * 1024;
const MAX_BYTES: u64 = 80 * 1024 * 1024;
/// playback starts when this much has arrived (about 6 s of Opus audio)
const START_BYTES: u64 = 96 * 1024;
/// how many finished files are kept (the oldest are deleted; pinned ones are never counted or deleted)
const KEEP_FILES: usize = 60;

static DIR: Mutex<Option<PathBuf>> = Mutex::new(None);
static PINNED: Mutex<Option<HashSet<String>>> = Mutex::new(None);

pub fn set_dir(d: PathBuf) {
    if let Ok(mut g) = DIR.lock() {
        *g = Some(d);
    }
}

/// songs that must stay in the cache (liked / saved online songs)
pub fn set_pinned(ids: Vec<String>) {
    if let Ok(mut g) = PINNED.lock() {
        *g = Some(ids.into_iter().filter(|i| innertube::valid_id(i)).collect());
    }
}

fn is_pinned(id: &str) -> bool {
    PINNED.lock().ok().and_then(|g| g.as_ref().map(|s| s.contains(id))).unwrap_or(false)
}

fn dir() -> Result<PathBuf, String> {
    let d = DIR.lock().map_err(|_| "E_INTERNAL".to_string())?.clone().ok_or("E_INTERNAL")?;
    fs::create_dir_all(&d).map_err(|e| format!("E_DISK: {e}"))?;
    Ok(d)
}

// ---------- a file that is still being downloaded ----------

pub struct LiveState {
    pub written: u64,
    pub done: bool,
    pub err: Option<String>,
    pub path: PathBuf,
    pub mime: &'static str,
}

pub struct Live {
    st: Mutex<LiveState>,
    cv: Condvar,
}

impl Live {
    fn new(path: PathBuf) -> Self {
        Live { st: Mutex::new(LiveState { written: 0, done: false, err: None, path, mime: "audio/webm" }), cv: Condvar::new() }
    }
    fn update(&self, f: impl FnOnce(&mut LiveState)) {
        let mut g = self.st.lock().unwrap_or_else(|e| e.into_inner());
        f(&mut g);
        drop(g);
        self.cv.notify_all();
    }
    /// (bytes written, finished, error, current path, mime)
    pub fn snapshot(&self) -> (u64, bool, Option<String>, PathBuf, &'static str) {
        let g = self.st.lock().unwrap_or_else(|e| e.into_inner());
        (g.written, g.done, g.err.clone(), g.path.clone(), g.mime)
    }
    /// waits (at most `ms`) until more than `seen` bytes exist, or the download finished or failed
    pub fn wait_change(&self, seen: u64, ms: u64) {
        let g = self.st.lock().unwrap_or_else(|e| e.into_inner());
        let _ = self.cv.wait_timeout_while(g, Duration::from_millis(ms), |s| s.written <= seen && !s.done && s.err.is_none());
    }
    #[cfg(test)]
    pub fn finished_for_test(path: PathBuf, len: u64) -> Arc<Live> {
        let l = Arc::new(Live::new(path));
        l.update(|s| {
            s.written = len;
            s.done = true;
        });
        l
    }
}

pub enum Ready {
    File(PathBuf, &'static str),
    Live(Arc<Live>),
}

fn lives() -> &'static Mutex<HashMap<String, Arc<Live>>> {
    static L: OnceLock<Mutex<HashMap<String, Arc<Live>>>> = OnceLock::new();
    L.get_or_init(|| Mutex::new(HashMap::new()))
}

// ---------- cache files ----------

const EXTS: [&str; 6] = ["webm", "m4a", "mp4", "opus", "ogg", "mp3"];

fn files_of(dir: &Path, id: &str) -> Vec<PathBuf> {
    let prefix = format!("{id}.");
    fs::read_dir(dir)
        .map(|rd| rd.flatten().map(|e| e.path()).filter(|p| p.file_name().and_then(|n| n.to_str()).is_some_and(|n| n.starts_with(&prefix))).collect())
        .unwrap_or_default()
}

fn finished(dir: &Path, id: &str) -> Option<PathBuf> {
    files_of(dir, id).into_iter().find(|p| {
        p.extension().and_then(|e| e.to_str()).is_some_and(|e| EXTS.contains(&e)) && fs::metadata(p).map(|m| m.len()).unwrap_or(0) > 4096
    })
}

fn forget(dir: &Path, id: &str) {
    if let Ok(mut m) = lives().lock() {
        m.remove(id);
    }
    for p in files_of(dir, id) {
        let _ = fs::remove_file(p);
    }
}

fn prune(dir: &Path) {
    let Ok(rd) = fs::read_dir(dir) else { return };
    let mut files: Vec<(std::time::SystemTime, PathBuf)> = rd
        .flatten()
        .filter(|e| {
            let n = e.file_name().to_string_lossy().into_owned();
            n.split('.').next().is_some_and(|id| !is_pinned(id)) && !n.ends_with(".part")
        })
        .filter_map(|e| Some((e.metadata().ok()?.modified().ok()?, e.path())))
        .collect();
    if files.len() <= KEEP_FILES {
        return;
    }
    files.sort_by_key(|(t, _)| std::cmp::Reverse(*t));
    for (_, p) in files.into_iter().skip(KEEP_FILES) {
        let _ = fs::remove_file(p);
    }
}

// ---------- the writer ----------

struct Sink {
    file: fs::File,
    live: Arc<Live>,
    id: String,
    written: u64,
    reported: u64,
}

impl Sink {
    fn push(&mut self, chunk: &[u8]) -> Result<(), String> {
        if self.written == 0 && chunk.len() >= 8 {
            // MP4 / M4A starts with "....ftyp", WebM with the EBML header
            let mime = if &chunk[4..8] == b"ftyp" { "audio/mp4" } else { "audio/webm" };
            self.live.update(|s| s.mime = mime);
        }
        self.file.write_all(chunk).map_err(|e| format!("E_DISK: {e}"))?;
        self.written += chunk.len() as u64;
        let w = self.written;
        self.live.update(|s| s.written = w);
        if self.written - self.reported >= 256 * 1024 || self.reported == 0 {
            self.reported = self.written;
            super::emit_load(&self.id, "downloading", self.written);
        }
        Ok(())
    }
}

/// Our own download of a resolved stream: sequential 1 MB ranges, like a browser would ask. Any refusal fails the whole attempt.
fn download_stream(s: &innertube::Stream, sink: &mut dyn FnMut(&[u8]) -> Result<(), String>) -> Result<(), String> {
    let agent = ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(8)).timeout_read(Duration::from_secs(20)).redirects(5).build();
    let mut pos: u64 = 0;
    let mut total: Option<u64> = None;
    loop {
        let end = pos + CHUNK - 1;
        let mut last_err = String::new();
        let mut got = None;
        for _ in 0..3 {
            match agent.get(&s.url).set("User-Agent", &s.ua).set("Range", &format!("bytes={pos}-{end}")).call() {
                Ok(r) if r.status() == 200 || r.status() == 206 => {
                    if let Some(t) = r.header("Content-Range").and_then(|v| v.rsplit('/').next()).and_then(|v| v.parse::<u64>().ok()) {
                        total = Some(t);
                    } else if r.status() == 200 {
                        total = r.header("Content-Length").and_then(|v| v.parse().ok());
                    }
                    let full = r.status() == 200;
                    let mut buf = Vec::new();
                    r.into_reader().take(MAX_BYTES).read_to_end(&mut buf).map_err(|e| format!("E_NETWORK: {e}"))?;
                    got = Some((buf, full));
                    break;
                }
                Ok(r) => last_err = format!("E_HTTP: {}", r.status()),
                Err(ureq::Error::Status(c, _)) => {
                    last_err = format!("E_HTTP: {c}");
                    if c == 403 || c == 404 || c == 410 {
                        break; // retrying the same URL cannot help
                    }
                }
                Err(e) => last_err = super::http::map_err(e),
            }
        }
        let (buf, full) = got.ok_or_else(|| if last_err.contains("403") { "E_FORBIDDEN".to_string() } else { last_err.clone() })?;
        if buf.is_empty() {
            return Err("E_FORMAT".into());
        }
        sink(&buf)?;
        pos += buf.len() as u64;
        if full || total.is_some_and(|t| pos >= t) || pos >= MAX_BYTES {
            return Ok(());
        }
    }
}

fn worker(id: String, live: Arc<Live>, d: PathBuf) {
    let t0 = std::time::Instant::now();
    super::emit_load(&id, "resolving", 0);
    let part = d.join(format!("{id}.s.part"));
    let file = match fs::File::create(&part) {
        Ok(f) => f,
        Err(e) => {
            live.update(|s| s.err = Some(format!("E_DISK: {e}")));
            return;
        }
    };
    live.update(|s| s.path = part.clone());
    let mut sink = Sink { file, live: live.clone(), id: id.clone(), written: 0, reported: 0 };
    let mut ok = false;
    let mut yt_err: Option<String> = None;
    // 1. yt-dlp (when installed): the quick VR identity first, then the thorough default
    if youtube::find_ytdlp().is_some() {
        for fast in [true, false] {
            match youtube::stream_audio(&id, fast, &mut |c| sink.push(c)) {
                Ok(()) => {
                    ok = true;
                    break;
                }
                Err(e) => {
                    let stop = e == "E_UNAVAILABLE" || sink.written > 0; // cannot restart once bytes were handed to the player
                    yt_err = Some(e);
                    if stop {
                        break;
                    }
                }
            }
        }
    }
    // 2. our own download, trying client identities one after the other
    let mut last = String::from("E_FORMAT");
    if !ok && sink.written == 0 && yt_err.as_deref() != Some("E_UNAVAILABLE") {
        let mut skip: Vec<String> = Vec::new();
        for _ in 0..3 {
            match innertube::resolve_skip(&id, &skip) {
                Ok(s) => match download_stream(&s, &mut |c| sink.push(c)) {
                    Ok(()) => {
                        ok = true;
                        break;
                    }
                    Err(e) => {
                        last = e;
                        if sink.written > 0 {
                            break;
                        }
                        skip.push(s.client.to_string());
                    }
                },
                Err(e) => {
                    last = e;
                    break;
                }
            }
        }
    }
    let written = sink.written;
    drop(sink);
    if ok && written > 4096 {
        let (_, _, _, _, mime) = live.snapshot();
        let fin = d.join(format!("{id}.s.{}", if mime == "audio/mp4" { "m4a" } else { "webm" }));
        let _ = fs::remove_file(&fin);
        match fs::rename(&part, &fin) {
            Ok(()) => live.update(|s| {
                s.path = fin.clone();
                s.done = true;
            }),
            Err(_) => live.update(|s| s.done = true), // still readable under its old name
        }
        super::proxy::note(format!("downloaded {:.0} KB in {:.1}s", written as f32 / 1024.0, t0.elapsed().as_secs_f32()));
        super::emit_load(&id, "ready", written);
        prune(&d);
    } else {
        // when yt-dlp was tried, its reason is the more useful one (e.g. "sign in to confirm", "JavaScript runtime")
        let err = match (yt_err, last.as_str()) {
            (Some(y), "E_FORBIDDEN" | "E_FORMAT" | "E_LOGIN") => y,
            (_, _) => last,
        };
        let _ = fs::remove_file(&part);
        if let Ok(mut m) = lives().lock() {
            m.remove(&id);
        }
        super::emit_load(&id, "failed", 0);
        live.update(|s| s.err = Some(err));
    }
}

/// Makes sure the audio of `id` is in the cache, or on its way with enough data to start playing. `fresh`: start over.
pub fn ensure(id: &str, fresh: bool) -> Result<Ready, String> {
    if !innertube::valid_id(id) {
        return Err("E_BAD_ID".into());
    }
    let d = dir()?;
    if fresh {
        forget(&d, id);
    } else if let Some(p) = finished(&d, id) {
        let _ = fs::File::open(&p).and_then(|f| f.set_modified(std::time::SystemTime::now())); // keeps it among the newest
        let m = youtube::mime_of(&p);
        return Ok(Ready::File(p, m));
    }
    let live = {
        let mut m = lives().lock().map_err(|_| "E_INTERNAL".to_string())?;
        match m.get(id) {
            Some(l) if l.snapshot().2.is_none() => l.clone(),
            _ => {
                let l = Arc::new(Live::new(d.join(format!("{id}.s.part"))));
                m.insert(id.to_string(), l.clone());
                let (idc, lc, dc) = (id.to_string(), l.clone(), d.clone());
                std::thread::spawn(move || worker(idc, lc, dc));
                l
            }
        }
    };
    // wait for the first part (the wait is over as soon as playback can begin)
    let t0 = std::time::Instant::now();
    loop {
        let (w, done, err, _, _) = live.snapshot();
        if let Some(e) = err {
            return Err(e);
        }
        if done || w >= START_BYTES {
            return Ok(Ready::Live(live));
        }
        if t0.elapsed() > Duration::from_secs(150) {
            return Err("E_TIMEOUT".into());
        }
        live.wait_change(w, 250);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpStream;

    fn get(local: &str, extra: &str) -> Vec<u8> {
        let port: u16 = local.split(':').nth(2).unwrap().split('/').next().unwrap().parse().unwrap();
        let path = local.split_once(&format!(":{port}")).unwrap().1.to_string();
        let mut c = TcpStream::connect(("127.0.0.1", port)).unwrap();
        write!(c, "GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n{extra}\r\n").unwrap();
        let mut out = Vec::new();
        c.read_to_end(&mut out).unwrap();
        out
    }

    /// a download that is still running: the player gets the bytes as they are written, in order, until the end
    #[test]
    fn streams_a_growing_file() {
        let dir = std::env::temp_dir().join(format!("fm-live-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let part = dir.join("x.s.part");
        let fin = dir.join("x.s.webm");
        let live = Arc::new(Live::new(part.clone()));
        let local = super::super::proxy::register_live(live.clone()).unwrap();
        let (l2, p2, f2) = (live.clone(), part.clone(), fin.clone());
        let writer = std::thread::spawn(move || {
            let mut f = fs::File::create(&p2).unwrap();
            let mut n = 0u64;
            for i in 0..5u8 {
                f.write_all(&[i; 1000]).unwrap();
                n += 1000;
                l2.update(|s| s.written = n);
                std::thread::sleep(Duration::from_millis(60));
            }
            drop(f);
            fs::rename(&p2, &f2).unwrap();
            l2.update(|s| {
                s.path = f2.clone();
                s.done = true;
            });
        });
        let out = get(&local, "Range: bytes=0-\r\n");
        writer.join().unwrap();
        let split = out.windows(4).position(|w| w == b"\r\n\r\n").unwrap() + 4;
        let head = String::from_utf8_lossy(&out[..split]).to_string();
        assert!(head.starts_with("HTTP/1.1 200"), "{head}");
        let body = &out[split..];
        assert_eq!(body.len(), 5000);
        assert!(body.iter().enumerate().all(|(i, b)| *b == (i / 1000) as u8));
        // once finished, a seek gets a normal ranged answer
        let part2 = get(&local, "Range: bytes=4000-\r\n");
        assert!(String::from_utf8_lossy(&part2).starts_with("HTTP/1.1 206"));
        let _ = fs::remove_dir_all(dir);
    }
}
