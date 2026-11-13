//! Local streaming proxy (127.0.0.1 only).
//!
//! Why: the web view may not read cross-origin audio into Web Audio (equalizer, visualizer, ReplayGain) unless the server sends CORS
//! headers, and some servers (YouTube) want specific request headers. The proxy fetches the stream itself, adds the CORS headers and
//! passes Range requests through so seeking works. Every stream gets an unguessable token, and nothing but those tokens is served.
use std::collections::hash_map::RandomState;
use std::collections::HashMap;
use std::hash::{BuildHasher, Hasher};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const MAX_HEAD: usize = 8 * 1024;
const MAX_ENTRIES: usize = 512;
const ENTRY_TTL: Duration = Duration::from_secs(8 * 3600);

struct Entry {
    url: String,
    headers: Vec<(String, String)>,
    at: Instant,
    /// YouTube video id: lets the proxy fetch a fresh stream by itself when YouTube starts refusing the current one
    id: Option<String>,
    /// client identities whose streams already failed for this video
    skip: Vec<String>,
    /// a finished local file (served with Range support) instead of an upstream URL
    file: Option<Served>,
}

#[derive(Clone)]
enum Served {
    File(std::path::PathBuf, &'static str),
    Live(std::sync::Arc<super::fetch::Live>),
}

fn registry() -> &'static Mutex<HashMap<String, Entry>> {
    static R: OnceLock<Mutex<HashMap<String, Entry>>> = OnceLock::new();
    R.get_or_init(|| Mutex::new(HashMap::new()))
}

static PORT: Mutex<Option<u16>> = Mutex::new(None);
static LAST: Mutex<String> = Mutex::new(String::new());

pub fn note(msg: String) {
    if let Ok(mut g) = LAST.lock() {
        *g = msg;
    }
}

pub fn last_status() -> String {
    LAST.lock().map(|g| g.clone()).unwrap_or_default()
}

fn upstream_agent() -> &'static ureq::Agent {
    static A: OnceLock<ureq::Agent> = OnceLock::new();
    A.get_or_init(|| {
        ureq::AgentBuilder::new()
            .timeout_connect(Duration::from_secs(8))
            .timeout_read(Duration::from_secs(30))
            .redirects(5)
            .user_agent(super::http::UA)
            .build()
    })
}

fn token() -> String {
    let mut out = String::new();
    for _ in 0..2 {
        let mut h = RandomState::new().build_hasher();
        h.write_u128(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0));
        out.push_str(&format!("{:016x}", h.finish()));
    }
    out
}

/// Registers an upstream URL and returns the local URL the audio element should use
/// Registers a file that is still being downloaded (served as it grows)
pub fn register_live(live: std::sync::Arc<super::fetch::Live>) -> Result<String, String> {
    let port = start()?;
    let tok = token();
    let mut reg = registry().lock().map_err(|_| "E_INTERNAL".to_string())?;
    let now = Instant::now();
    reg.retain(|_, e| now.duration_since(e.at) < ENTRY_TTL);
    if reg.len() >= MAX_ENTRIES {
        if let Some(oldest) = reg.iter().min_by_key(|(_, e)| e.at).map(|(k, _)| k.clone()) {
            reg.remove(&oldest);
        }
    }
    reg.insert(tok.clone(), Entry { url: String::new(), headers: vec![], at: now, id: None, skip: vec![], file: Some(Served::Live(live)) });
    Ok(format!("http://127.0.0.1:{port}/s/{tok}"))
}

/// Registers a local audio file; returns the local URL the audio element should use
pub fn register_file(path: std::path::PathBuf, mime: &'static str) -> Result<String, String> {
    let port = start()?;
    let tok = token();
    let mut reg = registry().lock().map_err(|_| "E_INTERNAL".to_string())?;
    let now = Instant::now();
    reg.retain(|_, e| now.duration_since(e.at) < ENTRY_TTL);
    if reg.len() >= MAX_ENTRIES {
        if let Some(oldest) = reg.iter().min_by_key(|(_, e)| e.at).map(|(k, _)| k.clone()) {
            reg.remove(&oldest);
        }
    }
    reg.insert(tok.clone(), Entry { url: String::new(), headers: vec![], at: now, id: None, skip: vec![], file: Some(Served::File(path, mime)) });
    Ok(format!("http://127.0.0.1:{port}/s/{tok}"))
}

pub fn register(url: &str, headers: Vec<(String, String)>) -> Result<String, String> {
    register_for(url, headers, None, "")
}

/// Like `register`, for a YouTube stream: remembers the video id so a refused stream can be replaced transparently
pub fn register_for(url: &str, headers: Vec<(String, String)>, id: Option<String>, client: &str) -> Result<String, String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("E_BAD_URL".into());
    }
    let port = start()?;
    let tok = token();
    let mut reg = registry().lock().map_err(|_| "E_INTERNAL".to_string())?;
    let now = Instant::now();
    reg.retain(|_, e| now.duration_since(e.at) < ENTRY_TTL);
    if reg.len() >= MAX_ENTRIES {
        if let Some(oldest) = reg.iter().min_by_key(|(_, e)| e.at).map(|(k, _)| k.clone()) {
            reg.remove(&oldest);
        }
    }
    reg.insert(tok.clone(), Entry { url: url.to_string(), headers, at: now, id, skip: if client.is_empty() { vec![] } else { vec![client.to_string()] }, file: None });
    Ok(format!("http://127.0.0.1:{port}/s/{tok}"))
}

fn start() -> Result<u16, String> {
    let mut guard = PORT.lock().map_err(|_| "E_INTERNAL".to_string())?;
    if let Some(p) = *guard {
        return Ok(p);
    }
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| format!("E_PROXY: {e}"))?;
    let port = listener.local_addr().map_err(|e| format!("E_PROXY: {e}"))?.port();
    std::thread::Builder::new()
        .name("stream-proxy".into())
        .spawn(move || {
            for conn in listener.incoming().flatten() {
                let _ = std::thread::Builder::new().name("stream-proxy-conn".into()).spawn(move || {
                    let _ = handle(conn);
                });
            }
        })
        .map_err(|e| format!("E_PROXY: {e}"))?;
    *guard = Some(port);
    Ok(port)
}

#[derive(Debug, PartialEq)]
pub struct Req {
    pub method: String,
    pub path: String,
    pub headers: Vec<(String, String)>,
}

impl Req {
    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers.iter().find(|(k, _)| k == name).map(|(_, v)| v.as_str())
    }
}

pub fn parse_request(head: &str) -> Option<Req> {
    let mut lines = head.split("\r\n");
    let first = lines.next()?;
    let mut parts = first.split(' ');
    let method = parts.next()?.to_string();
    let path = parts.next()?.to_string();
    if !parts.next()?.starts_with("HTTP/1.") {
        return None;
    }
    let headers = lines
        .filter_map(|l| l.split_once(':'))
        .map(|(k, v)| (k.trim().to_ascii_lowercase(), v.trim().to_string()))
        .collect();
    Some(Req { method, path, headers })
}

/// A single "bytes=a-b" range is passed on; anything else is ignored (the whole file is sent)
pub fn clean_range(r: &str) -> Option<String> {
    let rest = r.trim().strip_prefix("bytes=")?;
    let (a, b) = rest.split_once('-')?;
    let ok = |s: &str| s.is_empty() || (s.len() <= 15 && s.chars().all(|c| c.is_ascii_digit()));
    (ok(a) && ok(b) && !(a.is_empty() && b.is_empty())).then(|| format!("bytes={a}-{b}"))
}

/// (start, end) of a "bytes=a-b" / "bytes=a-" / "bytes=-n" range inside a file of `len` bytes
pub fn file_range(r: Option<&str>, len: u64) -> Option<(u64, u64)> {
    let r = r.and_then(clean_range)?;
    let (a, b) = r.strip_prefix("bytes=")?.split_once('-')?;
    let (start, end) = match (a.parse::<u64>().ok(), b.parse::<u64>().ok()) {
        (Some(a), Some(b)) => (a, b.min(len.saturating_sub(1))),
        (Some(a), None) => (a, len.saturating_sub(1)),
        (None, Some(n)) => (len.saturating_sub(n), len.saturating_sub(1)),
        (None, None) => return None,
    };
    (start <= end && start < len).then_some((start, end))
}

/// A file that is still downloading. From the start: stream the bytes as they arrive (no length is known yet). A request that
/// wants a later position (a seek) waits for the download to finish, then gets a normal ranged answer.
fn serve_live(s: &mut TcpStream, live: &super::fetch::Live, range: Option<&str>) -> std::io::Result<()> {
    use std::io::{Seek, SeekFrom};
    let start = range.and_then(clean_range).and_then(|r| r.strip_prefix("bytes=").and_then(|x| x.split('-').next().and_then(|a| a.parse::<u64>().ok()))).unwrap_or(0);
    let (_, done, _, path, mime) = live.snapshot();
    if done {
        return serve_file(s, &path, mime, range);
    }
    if start > 0 {
        let t0 = Instant::now();
        loop {
            let (w, done, err, path, mime) = live.snapshot();
            if done {
                return serve_file(s, &path, mime, range);
            }
            if err.is_some() {
                return status_only(s, 502, "Bad Gateway");
            }
            if t0.elapsed() > Duration::from_secs(90) {
                return status_only(s, 504, "Gateway Timeout");
            }
            live.wait_change(w, 300);
        }
    }
    write!(s, "HTTP/1.1 200 OK\r\n{CORS}Accept-Ranges: none\r\nContent-Type: {mime}\r\n\r\n")?;
    let mut pos: u64 = 0;
    let mut file: Option<std::fs::File> = None;
    let mut buf = vec![0u8; 64 * 1024];
    let t0 = Instant::now();
    loop {
        let (w, done, err, path, _) = live.snapshot();
        if err.is_some() {
            return Ok(()); // closing early makes the player report the failure (and the app retries)
        }
        if file.is_none() {
            file = std::fs::File::open(&path).ok();
        }
        if pos < w {
            if let Some(f) = file.as_mut() {
                f.seek(SeekFrom::Start(pos))?;
                let want = (w - pos).min(buf.len() as u64) as usize;
                let n = f.read(&mut buf[..want])?;
                if n > 0 {
                    s.write_all(&buf[..n])?;
                    pos += n as u64;
                    continue;
                }
            } else {
                std::thread::sleep(Duration::from_millis(50)); // the file was just renamed: reopen
                continue;
            }
        }
        if done && pos >= w {
            return s.flush();
        }
        if t0.elapsed() > Duration::from_secs(600) {
            return Ok(());
        }
        live.wait_change(pos, 300);
    }
}

fn serve_file(s: &mut TcpStream, path: &std::path::Path, mime: &str, range: Option<&str>) -> std::io::Result<()> {
    use std::io::{Seek, SeekFrom};
    let Ok(mut f) = std::fs::File::open(path) else { return status_only(s, 404, "Not Found") };
    let len = f.metadata()?.len();
    let (code, start, end, head) = match (range.is_some(), file_range(range, len)) {
        (true, Some((a, b))) => (206, a, b, format!("Content-Range: bytes {a}-{b}/{len}\r\n")),
        (true, None) if len > 0 => return write!(s, "HTTP/1.1 416 Range Not Satisfiable\r\n{CORS}Content-Range: bytes */{len}\r\nContent-Length: 0\r\n\r\n"),
        _ => (200, 0, len.saturating_sub(1), String::new()),
    };
    let n = if len == 0 { 0 } else { end - start + 1 };
    let reason = if code == 206 { "Partial Content" } else { "OK" };
    write!(s, "HTTP/1.1 {code} {reason}\r\n{CORS}Accept-Ranges: bytes\r\nContent-Type: {mime}\r\nContent-Length: {n}\r\n{head}\r\n")?;
    f.seek(SeekFrom::Start(start))?;
    std::io::copy(&mut f.take(n), s)?;
    s.flush()
}

static REFRESH: Mutex<()> = Mutex::new(());

/// Replaces the stream of entry `tok` after `failed` was refused. Concurrent requests share one refresh.
fn refresh(tok: &str, failed: &str) -> Option<(String, Vec<(String, String)>)> {
    let _g = REFRESH.lock().ok()?;
    let (cur, id, skip) = {
        let r = registry().lock().ok()?;
        let e = r.get(tok)?;
        (e.url.clone(), e.id.clone()?, e.skip.clone())
    };
    if cur != failed {
        // another request already refreshed it
        return registry().lock().ok().and_then(|r| r.get(tok).map(|e| (e.url.clone(), e.headers.clone())));
    }
    let viaytdlp = || super::youtube::find_ytdlp().and_then(|_| super::youtube::resolve(&id).ok()).map(|(u, h)| (u, h, "yt-dlp".to_string()));
    let viainner = || super::innertube::resolve_skip(&id, &skip).ok().map(|s| (s.url, vec![("User-Agent".to_string(), s.ua)], s.client.to_string()));
    // a yt-dlp stream that failed is replaced by a direct one and the other way round
    let (url, headers, client) = if skip.iter().any(|c| c == "yt-dlp") { viainner().or_else(viaytdlp)? } else { viaytdlp().or_else(viainner)? };
    let mut r = registry().lock().ok()?;
    let e = r.get_mut(tok)?;
    e.url = url.clone();
    e.headers = headers.clone();
    if !client.is_empty() && !e.skip.contains(&client) {
        // the new stream may fail too: its identity is skipped next time
        e.skip.push(client);
    }
    note("refreshed stream".into());
    Some((url, headers))
}

const CHUNK: u64 = 8 * 1024 * 1024;

fn is_googlevideo(url: &str) -> bool {
    url.strip_prefix("https://").and_then(|r| r.split('/').next()).is_some_and(|h| h.ends_with(".googlevideo.com") || h.ends_with(".youtube.com"))
}

/// "bytes=a-b" limited to CHUNK bytes; a missing or open-ended range becomes the first/next chunk
pub fn chunk_range(r: Option<&str>) -> String {
    let (a, b) = r
        .and_then(|r| r.strip_prefix("bytes="))
        .and_then(|r| r.split_once('-'))
        .map(|(a, b)| (a.parse::<u64>().ok(), b.parse::<u64>().ok()))
        .unwrap_or((Some(0), None));
    match (a, b) {
        (Some(a), Some(b)) => format!("bytes={a}-{}", b.min(a + CHUNK - 1)),
        (Some(a), None) => format!("bytes={a}-{}", a + CHUNK - 1),
        (None, Some(n)) => format!("bytes=-{n}"), // suffix range: passed on
        (None, None) => format!("bytes=0-{}", CHUNK - 1),
    }
}

/// Only our own address may be used as Host (blocks DNS-rebinding tricks from web pages)
fn host_ok(host: Option<&str>) -> bool {
    match host {
        Some(h) => {
            let name = h.rsplit_once(':').map(|(n, _)| n).unwrap_or(h);
            name == "127.0.0.1" || name == "localhost"
        }
        None => false,
    }
}

fn read_head(s: &mut TcpStream) -> std::io::Result<String> {
    let mut buf = Vec::with_capacity(1024);
    let mut chunk = [0u8; 1024];
    loop {
        let n = s.read(&mut chunk)?;
        if n == 0 {
            break;
        }
        buf.extend_from_slice(&chunk[..n]);
        if buf.windows(4).any(|w| w == b"\r\n\r\n") || buf.len() > MAX_HEAD {
            break;
        }
    }
    Ok(String::from_utf8_lossy(&buf).into_owned())
}

const CORS: &str = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: Range\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges\r\nCache-Control: no-store\r\nConnection: close\r\n";

fn status_only(s: &mut TcpStream, code: u16, reason: &str) -> std::io::Result<()> {
    write!(s, "HTTP/1.1 {code} {reason}\r\n{CORS}Content-Length: 0\r\n\r\n")
}

fn handle(mut s: TcpStream) -> std::io::Result<()> {
    s.set_read_timeout(Some(Duration::from_secs(5)))?;
    s.set_write_timeout(Some(Duration::from_secs(30)))?;
    let head = read_head(&mut s)?;
    let Some(req) = parse_request(&head) else { return status_only(&mut s, 400, "Bad Request") };
    if !host_ok(req.header("host")) {
        return status_only(&mut s, 403, "Forbidden");
    }
    if req.method == "OPTIONS" {
        return status_only(&mut s, 204, "No Content");
    }
    if req.method != "GET" {
        return status_only(&mut s, 405, "Method Not Allowed");
    }
    let tok = req.path.strip_prefix("/s/").unwrap_or("");
    let file = registry().lock().ok().and_then(|r| r.get(tok).and_then(|e| e.file.clone()));
    match file {
        Some(Served::File(path, mime)) => return serve_file(&mut s, &path, mime, req.header("range")),
        Some(Served::Live(live)) => return serve_live(&mut s, &live, req.header("range")),
        None => {}
    }
    let found = registry().lock().ok().and_then(|r| r.get(tok).map(|e| (e.url.clone(), e.headers.clone())));
    let Some((mut url, mut headers)) = found else { return status_only(&mut s, 404, "Not Found") };
    let range = req.header("range").and_then(clean_range);

    // up to three tries: when YouTube refuses the stream (403 / 404 / 410) or the connection breaks, a fresh stream from another
    // client identity (or yt-dlp) replaces it and the very same range is asked again, so playback just continues
    let mut tries = 0;
    let resp = loop {
        let mut up = upstream_agent().get(&url);
        for (k, v) in &headers {
            up = up.set(k, v);
        }
        if is_googlevideo(&url) {
            // googlevideo answers open-ended ranges with 403 / throttles them for several client identities: ask in bounded chunks
            up = up.set("Range", &chunk_range(range.as_deref()));
        } else if let Some(r) = &range {
            up = up.set("Range", r);
        }
        let (retry, r) = match up.call() {
            Ok(r) => (false, Some(r)),
            Err(ureq::Error::Status(c, r)) => (matches!(c, 403 | 404 | 410 | 500..=599), Some(r)),
            Err(e) => {
                note(format!("proxy: {e}"));
                (true, None)
            }
        };
        if let Some(r) = &r {
            note(format!("upstream {} {}", r.status(), r.header("Content-Type").unwrap_or("")));
        }
        if retry && tries < 2 {
            if let Some((u, h)) = refresh(tok, &url) {
                tries += 1;
                url = u;
                headers = h;
                continue;
            }
        }
        match r {
            Some(r) => break r,
            None => return status_only(&mut s, 502, "Bad Gateway"),
        }
    };
    let code = resp.status();
    note(format!("upstream {code} {}", resp.header("Content-Type").unwrap_or("")));
    let mut out = format!("HTTP/1.1 {} {}\r\n{CORS}Accept-Ranges: bytes\r\n", code, resp.status_text());
    for name in ["Content-Type", "Content-Length", "Content-Range"] {
        if let Some(v) = resp.header(name) {
            if !v.contains(['\r', '\n']) {
                out.push_str(&format!("{name}: {v}\r\n"));
            }
        }
    }
    out.push_str("\r\n");
    s.write_all(out.as_bytes())?;
    if code >= 300 {
        return Ok(());
    }
    let mut body = resp.into_reader();
    std::io::copy(&mut body, &mut s)?;
    s.flush()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};

    #[test]
    fn parses_request_head() {
        let r = parse_request("GET /s/abc HTTP/1.1\r\nHost: 127.0.0.1:5555\r\nRange: bytes=10-\r\n\r\n").unwrap();
        assert_eq!(r.method, "GET");
        assert_eq!(r.path, "/s/abc");
        assert_eq!(r.header("range"), Some("bytes=10-"));
        assert!(parse_request("garbage").is_none());
    }

    #[test]
    fn range_is_sanitised() {
        assert_eq!(clean_range("bytes=0-"), Some("bytes=0-".into()));
        assert_eq!(clean_range("bytes=-500"), Some("bytes=-500".into()));
        assert_eq!(clean_range("bytes=1-2,5-9"), None);
        assert_eq!(clean_range("bytes=-"), None);
        assert_eq!(clean_range("items=1-2"), None);
        assert_eq!(clean_range("bytes=1\r\nX: y-"), None);
    }

    #[test]
    fn file_ranges() {
        assert_eq!(file_range(Some("bytes=0-"), 100), Some((0, 99)));
        assert_eq!(file_range(Some("bytes=10-19"), 100), Some((10, 19)));
        assert_eq!(file_range(Some("bytes=90-500"), 100), Some((90, 99)));
        assert_eq!(file_range(Some("bytes=-10"), 100), Some((90, 99)));
        assert_eq!(file_range(Some("bytes=100-"), 100), None);
        assert_eq!(file_range(None, 100), None);
    }

    #[test]
    fn serves_a_local_file_with_ranges() {
        let dir = std::env::temp_dir().join(format!("fm-proxy-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let f = dir.join("a.webm");
        std::fs::write(&f, b"0123456789").unwrap();
        let local = register_file(f, "audio/webm").unwrap();
        let port: u16 = local.split(':').nth(2).unwrap().split('/').next().unwrap().parse().unwrap();
        let path = local.split_once(&format!(":{port}")).unwrap().1.to_string();
        let get = |extra: &str| {
            let mut c = TcpStream::connect(("127.0.0.1", port)).unwrap();
            write!(c, "GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n{extra}\r\n").unwrap();
            let mut out = String::new();
            c.read_to_string(&mut out).unwrap();
            out
        };
        let part = get("Range: bytes=2-5\r\n");
        assert!(part.starts_with("HTTP/1.1 206"), "{part}");
        assert!(part.contains("Content-Range: bytes 2-5/10"));
        assert!(part.ends_with("2345"));
        let all = get("");
        assert!(all.starts_with("HTTP/1.1 200") && all.ends_with("0123456789"), "{all}");
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn chunks_are_bounded() {
        assert_eq!(chunk_range(None), "bytes=0-8388607");
        assert_eq!(chunk_range(Some("bytes=100-")), "bytes=100-8388707");
        assert_eq!(chunk_range(Some("bytes=0-9")), "bytes=0-9");
        assert_eq!(chunk_range(Some("bytes=0-99999999")), "bytes=0-8388607");
        assert_eq!(chunk_range(Some("bytes=-500")), "bytes=-500");
        assert!(is_googlevideo("https://rr1---sn-x.googlevideo.com/videoplayback?a=b"));
        assert!(!is_googlevideo("http://127.0.0.1:1/x"));
    }

    #[test]
    fn only_loopback_hosts() {
        assert!(host_ok(Some("127.0.0.1:1234")));
        assert!(host_ok(Some("localhost:80")));
        assert!(!host_ok(Some("evil.example:80")));
        assert!(!host_ok(None));
    }

    /// End to end: a tiny upstream server, the proxy in front of it, a ranged request through the proxy
    #[test]
    fn relays_ranges_and_adds_cors() {
        let up = TcpListener::bind("127.0.0.1:0").unwrap();
        let up_port = up.local_addr().unwrap().port();
        std::thread::spawn(move || {
            for c in up.incoming().flatten() {
                let mut c = c;
                let head = read_head(&mut c).unwrap_or_default();
                let ranged = head.to_ascii_lowercase().contains("range: bytes=2-");
                let body = if ranged { "cdef" } else { "abcdef" };
                let status = if ranged { "206 Partial Content" } else { "200 OK" };
                let _ = write!(c, "HTTP/1.1 {status}\r\nContent-Type: audio/mpeg\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
            }
        });
        // `register` only takes http(s) URLs; plain http on loopback is fine for the test
        let local = register(&format!("http://127.0.0.1:{up_port}/x.mp3"), vec![]).unwrap();
        let port: u16 = local.split(':').nth(2).unwrap().split('/').next().unwrap().parse().unwrap();
        let path = local.split_once(&format!(":{port}")).unwrap().1.to_string();

        let get = |extra: &str| {
            let mut c = TcpStream::connect(("127.0.0.1", port)).unwrap();
            write!(c, "GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n{extra}\r\n").unwrap();
            let mut out = String::new();
            c.read_to_string(&mut out).unwrap();
            out
        };
        let full = get("");
        assert!(full.starts_with("HTTP/1.1 200"), "{full}");
        assert!(full.contains("Access-Control-Allow-Origin: *"));
        assert!(full.ends_with("abcdef"));
        let part = get("Range: bytes=2-\r\n");
        assert!(part.starts_with("HTTP/1.1 206"), "{part}");
        assert!(part.ends_with("cdef"));
        // wrong token and wrong host are refused
        let mut c = TcpStream::connect(("127.0.0.1", port)).unwrap();
        write!(c, "GET /s/nope HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n").unwrap();
        let mut out = String::new();
        c.read_to_string(&mut out).unwrap();
        assert!(out.starts_with("HTTP/1.1 404"));
        let mut c = TcpStream::connect(("127.0.0.1", port)).unwrap();
        write!(c, "GET {path} HTTP/1.1\r\nHost: evil.example\r\n\r\n").unwrap();
        let mut out = String::new();
        c.read_to_string(&mut out).unwrap();
        assert!(out.starts_with("HTTP/1.1 403"));
    }
}
