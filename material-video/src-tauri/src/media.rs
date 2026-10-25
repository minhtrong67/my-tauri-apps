//! Loopback range-streaming server for local videos.
//!
//! Tauri's built-in `asset:` protocol buffers every range request in memory, which makes seeking in large files
//! slow. This server streams real byte ranges straight from disk. Design notes (all aimed at fast, smooth seeking):
//!
//! * plain `std::net` with one lightweight thread per connection - there is no worker-pool limit that a handful of
//!   abandoned streams (seek, hover preview, thumbnails) could exhaust;
//! * open-ended ranges (`bytes=N-`) are answered with a bounded (large) chunk, so a stream the player stopped reading never
//!   keeps a thread blocked for the rest of a multi-GB file; the player simply asks for the next range;
//! * HTTP keep-alive, `TCP_NODELAY`, and read/write timeouts so dead connections are always reclaimed;
//! * only files registered by the app are served, under an unguessable per-session token, on 127.0.0.1 only.

use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Largest answer to an open-ended range request
const MAX_OPEN_RANGE: u64 = 128 * 1024 * 1024;
const COPY_BUF: usize = 256 * 1024;
const MAX_HEADER_BYTES: usize = 16 * 1024;

pub struct MediaServer {
    pub port: u16,
    pub token: String,
    pub files: Arc<RwLock<HashMap<String, PathBuf>>>,
}

fn random_token() -> String {
    use std::hash::{BuildHasher, Hasher};
    let mut out = String::new();
    for _ in 0..2 {
        let mut h = std::collections::hash_map::RandomState::new().build_hasher();
        h.write_u128(SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0));
        out.push_str(&format!("{:016x}", h.finish()));
    }
    out
}

fn mime_for(p: &Path) -> &'static str {
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase();
    match ext.as_str() {
        "mp4" | "m4v" => "video/mp4",
        "webm" => "video/webm",
        "mkv" => "video/x-matroska",
        "mov" => "video/quicktime",
        "ogv" => "video/ogg",
        "avi" => "video/x-msvideo",
        "mpg" | "mpeg" => "video/mpeg",
        _ => "application/octet-stream",
    }
}

/// Parse `bytes=start-end`, `bytes=start-` or `bytes=-suffix` into an inclusive (start, end) pair.
/// The flag says whether the range was open-ended (no explicit end).
fn parse_range(h: &str, len: u64) -> Option<(u64, u64, bool)> {
    let spec = h.trim().strip_prefix("bytes=")?;
    let first = spec.split(',').next()?.trim();
    let (a, b) = first.split_once('-')?;
    if len == 0 {
        return None;
    }
    if a.is_empty() {
        let suffix: u64 = b.parse().ok()?;
        if suffix == 0 {
            return None;
        }
        return Some((len.saturating_sub(suffix), len - 1, false));
    }
    let start: u64 = a.parse().ok()?;
    let open = b.is_empty();
    let end: u64 = if open { len - 1 } else { b.parse::<u64>().ok()?.min(len - 1) };
    if start >= len || start > end {
        return None;
    }
    Some((start, end, open))
}

struct Req {
    method: String,
    path: String,
    range: Option<String>,
    close: bool,
}

/// Read one request head. `Ok(None)` = the peer closed the connection (or sent garbage).
fn read_request(r: &mut BufReader<TcpStream>) -> std::io::Result<Option<Req>> {
    let mut line = String::new();
    if r.read_line(&mut line)? == 0 {
        return Ok(None);
    }
    let mut parts = line.split_whitespace();
    let (Some(method), Some(path)) = (parts.next(), parts.next()) else { return Ok(None) };
    let (method, path) = (method.to_ascii_uppercase(), path.to_string());
    let http10 = line.trim_end().ends_with("HTTP/1.0");
    let (mut range, mut close) = (None, http10);
    let mut total = line.len();
    loop {
        line.clear();
        let n = r.read_line(&mut line)?;
        total += n;
        if n == 0 || total > MAX_HEADER_BYTES {
            return Ok(None);
        }
        let l = line.trim_end();
        if l.is_empty() {
            break;
        }
        if let Some((k, v)) = l.split_once(':') {
            if k.eq_ignore_ascii_case("range") {
                range = Some(v.trim().to_string());
            } else if k.eq_ignore_ascii_case("connection") {
                close = v.trim().eq_ignore_ascii_case("close");
            }
        }
    }
    Ok(Some(Req { method, path, range, close }))
}

const CORS: &str = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: Range\r\nAccess-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nAccess-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n";

fn status_only(w: &mut TcpStream, code: u16, reason: &str, extra: &str) -> std::io::Result<()> {
    write!(w, "HTTP/1.1 {code} {reason}\r\n{CORS}{extra}Content-Length: 0\r\n\r\n")
}

fn serve(stream: TcpStream, token: &str, files: &RwLock<HashMap<String, PathBuf>>) -> std::io::Result<()> {
    stream.set_nodelay(true)?;
    stream.set_read_timeout(Some(Duration::from_secs(30)))?;
    stream.set_write_timeout(Some(Duration::from_secs(60)))?;
    let mut w = stream.try_clone()?;
    let mut r = BufReader::new(stream);
    let mut buf = vec![0u8; COPY_BUF];

    while let Some(req) = read_request(&mut r)? {
        if req.method == "OPTIONS" {
            status_only(&mut w, 204, "No Content", "")?;
            if req.close { break; }
            continue;
        }
        if req.method != "GET" && req.method != "HEAD" {
            status_only(&mut w, 405, "Method Not Allowed", "")?;
            break;
        }
        let clean = req.path.split('?').next().unwrap_or("").trim_start_matches('/');
        let mut seg = clean.split('/');
        let (t, id) = (seg.next().unwrap_or(""), seg.next().unwrap_or(""));
        if t != token {
            status_only(&mut w, 403, "Forbidden", "")?;
            break;
        }
        let path = files.read().ok().and_then(|m| m.get(id).cloned());
        let Some(mut file) = path.as_ref().and_then(|p| File::open(p).ok()) else {
            status_only(&mut w, 404, "Not Found", "")?;
            if req.close { break; }
            continue;
        };
        let len = file.metadata().map(|m| m.len()).unwrap_or(0);
        let mime = mime_for(path.as_deref().unwrap());
        // `private` + a short max-age lets the webview keep what it already buffered while the user scrubs back and forth
        let common = format!("{CORS}Cache-Control: private, max-age=600\r\nAccept-Ranges: bytes\r\nContent-Type: {mime}\r\n");
        let conn = if req.close { "Connection: close\r\n" } else { "Connection: keep-alive\r\n" };

        let (head, start, n) = match req.range.as_deref().map(|h| parse_range(h, len)) {
            Some(Some((start, mut end, open))) => {
                if open {
                    end = end.min(start + MAX_OPEN_RANGE - 1);
                }
                let n = end - start + 1;
                (format!("HTTP/1.1 206 Partial Content\r\n{common}{conn}Content-Range: bytes {start}-{end}/{len}\r\nContent-Length: {n}\r\n\r\n"), start, n)
            }
            Some(None) => {
                status_only(&mut w, 416, "Range Not Satisfiable", &format!("Content-Range: bytes */{len}\r\n"))?;
                if req.close { break; }
                continue;
            }
            None => (format!("HTTP/1.1 200 OK\r\n{common}{conn}Content-Length: {len}\r\n\r\n"), 0, len),
        };
        w.write_all(head.as_bytes())?;
        if req.method == "GET" && n > 0 {
            file.seek(SeekFrom::Start(start))?;
            let mut left = n;
            while left > 0 {
                let want = left.min(COPY_BUF as u64) as usize;
                let got = file.read(&mut buf[..want])?;
                if got == 0 {
                    return Ok(()); // file shrank while streaming: drop the connection
                }
                w.write_all(&buf[..got])?;
                left -= got as u64;
            }
        }
        if req.close {
            break;
        }
    }
    Ok(())
}

pub fn start() -> Option<MediaServer> {
    let listener = TcpListener::bind("127.0.0.1:0").ok()?;
    let port = listener.local_addr().ok()?.port();
    let token = random_token();
    let files: Arc<RwLock<HashMap<String, PathBuf>>> = Arc::new(RwLock::new(HashMap::new()));
    let (t, f) = (token.clone(), files.clone());
    std::thread::Builder::new()
        .name("media-accept".into())
        .spawn(move || {
            for stream in listener.incoming().flatten() {
                let (t, f) = (t.clone(), f.clone());
                // a broken pipe (the player aborted the stream to seek) is normal, so errors are ignored
                let _ = std::thread::Builder::new()
                    .name("media-conn".into())
                    .stack_size(512 * 1024)
                    .spawn(move || {
                        let _ = serve(stream, &t, &f);
                    });
            }
        })
        .ok()?;
    Some(MediaServer { port, token, files })
}
