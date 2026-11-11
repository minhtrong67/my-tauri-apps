//! YouTube through yt-dlp (optional, off by default). The app never bundles yt-dlp: the user turns it on, and then it is downloaded
//! from the official GitHub releases (checksum verified) into the app data folder, or an existing yt-dlp is used.
use super::OnlineTrack;
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

static BIN_DIR: Mutex<Option<PathBuf>> = Mutex::new(None);
/// yt-dlp path chosen by the user in Settings ("" = managed / PATH)
static CUSTOM: Mutex<String> = Mutex::new(String::new());
/// at most one yt-dlp lookup at a time for resolving (each one is heavy), one for searching
static RESOLVE_LOCK: Mutex<()> = Mutex::new(());
static SEARCH_LOCK: Mutex<()> = Mutex::new(());

pub fn set_bin_dir(dir: PathBuf) {
    if let Ok(mut g) = BIN_DIR.lock() {
        *g = Some(dir);
    }
}

pub fn set_custom_path(p: &str) {
    if let Ok(mut g) = CUSTOM.lock() {
        *g = p.trim().to_string();
    }
}

fn bin_dir() -> Option<PathBuf> {
    BIN_DIR.lock().ok().and_then(|g| g.clone())
}

fn exe(name: &str) -> String {
    if cfg!(windows) { format!("{name}.exe") } else { name.to_string() }
}

/// executable called `name` somewhere on PATH
fn on_path(name: &str) -> Option<PathBuf> {
    let file = exe(name);
    std::env::var_os("PATH").and_then(|p| std::env::split_paths(&p).map(|d| d.join(&file)).find(|c| c.is_file()))
}

pub fn find_ytdlp() -> Option<(PathBuf, bool)> {
    let custom = CUSTOM.lock().map(|g| g.clone()).unwrap_or_default();
    if !custom.is_empty() {
        let p = PathBuf::from(&custom);
        return p.is_file().then_some((p, false));
    }
    if let Some(d) = bin_dir() {
        let p = d.join(exe("yt-dlp"));
        if p.is_file() {
            return Some((p, true));
        }
    }
    on_path("yt-dlp").map(|p| (p, false))
}

/// Which JavaScript runtime yt-dlp can use for YouTube's challenges: (name, path when it is the one we installed)
fn find_runtime() -> Option<(&'static str, Option<PathBuf>)> {
    if let Some(d) = bin_dir() {
        let p = d.join(exe("deno"));
        if p.is_file() {
            return Some(("deno", Some(p)));
        }
    }
    if on_path("deno").is_some() {
        return Some(("deno", None));
    }
    if on_path("node").is_some() {
        return Some(("node", None));
    }
    None
}

fn runtime_args() -> Vec<String> {
    match find_runtime() {
        Some(("deno", Some(p))) => vec!["--js-runtimes".into(), format!("deno:{}", p.display())],
        Some(("node", _)) => vec!["--js-runtimes".into(), "node".into()],
        _ => vec![],
    }
}

/// Turns yt-dlp's complaint into a short code the interface can translate
pub fn classify(stderr: &str) -> String {
    let low = stderr.to_lowercase();
    let code = if low.contains("sign in to confirm") || low.contains("not a bot") {
        "E_BOT"
    } else if low.contains("javascript runtime") || low.contains("js runtime") || low.contains("n challenge") || low.contains("ejs") {
        "E_JS"
    } else if low.contains("429") || low.contains("too many requests") {
        "E_RATE"
    } else if low.contains("video unavailable") || low.contains("private video") || low.contains("not available in your country") || low.contains("blocked it") {
        "E_UNAVAILABLE"
    } else if low.contains("requested format is not available") {
        "E_FORMAT"
    } else if low.contains("getaddrinfo") || low.contains("timed out") || low.contains("unable to download") || low.contains("connection") {
        "E_NETWORK"
    } else {
        ""
    };
    if !code.is_empty() {
        return code.to_string();
    }
    let last = stderr.lines().rev().map(str::trim).find(|l| !l.is_empty()).unwrap_or("unknown error");
    format!("E_YTDLP: {}", last.chars().take(200).collect::<String>())
}

fn run(exe_path: &Path, args: &[String], timeout: Duration) -> Result<String, String> {
    let mut cmd = Command::new(exe_path);
    cmd.args(args).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let mut child = cmd.spawn().map_err(|e| format!("E_SPAWN: {e}"))?;
    let mut so = child.stdout.take().ok_or("E_SPAWN")?;
    let mut se = child.stderr.take().ok_or("E_SPAWN")?;
    let t_out = std::thread::spawn(move || {
        let mut b = Vec::new();
        let _ = so.by_ref().take(32 * 1024 * 1024).read_to_end(&mut b);
        b
    });
    let t_err = std::thread::spawn(move || {
        let mut b = Vec::new();
        let _ = se.by_ref().take(256 * 1024).read_to_end(&mut b);
        b
    });
    let start = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(s)) => break Some(s),
            Ok(None) if start.elapsed() > timeout => {
                let _ = child.kill();
                let _ = child.wait();
                break None;
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(30)),
            Err(e) => return Err(format!("E_SPAWN: {e}")),
        }
    };
    let out = t_out.join().unwrap_or_default();
    let err = t_err.join().unwrap_or_default();
    match status {
        None => Err("E_TIMEOUT".into()),
        Some(s) if s.success() => Ok(String::from_utf8_lossy(&out).into_owned()),
        Some(_) => Err(classify(&String::from_utf8_lossy(&err))),
    }
}

// ---------- search / resolve ----------

/// "Artist - Song (Official Video)" uploads: split into artist and song so lyrics can be matched; otherwise the channel is the artist
pub fn split_title(title: &str, channel: &str) -> (String, String) {
    let channel = channel.trim().trim_end_matches(" - Topic").trim_end_matches("VEVO").trim().to_string();
    let clean = crate::lyrics::strip_noise(title);
    for sep in [" - ", " – ", " — ", " | "] {
        if let Some((a, b)) = clean.split_once(sep) {
            let (a, b) = (a.trim(), b.trim());
            if !a.is_empty() && !b.is_empty() && a.chars().count() <= 60 {
                return (a.to_string(), b.to_string());
            }
        }
    }
    (channel, clean)
}

pub fn parse_search(v: &Value) -> Vec<OnlineTrack> {
    let Some(entries) = v.get("entries").and_then(Value::as_array) else { return vec![] };
    entries
        .iter()
        .filter_map(|e| {
            let id = e.get("id").and_then(Value::as_str)?.to_string();
            if !valid_id(&id) {
                return None;
            }
            let dur = e.get("duration").and_then(Value::as_f64).unwrap_or(0.0);
            // live streams (no length), long mixes / podcasts and tiny clips are not songs
            if !(30.0..=1500.0).contains(&dur) {
                return None;
            }
            let title = e.get("title").and_then(Value::as_str).unwrap_or("").to_string();
            let channel = e.get("channel").and_then(Value::as_str).or_else(|| e.get("uploader").and_then(Value::as_str)).unwrap_or("");
            let (artist, song) = split_title(&title, channel);
            if song.is_empty() {
                return None;
            }
            Some(OnlineTrack {
                source: "youtube".into(),
                cover_url: format!("https://i.ytimg.com/vi/{id}/mqdefault.jpg"),
                id,
                title: song,
                artist,
                album: String::new(),
                duration: dur,
                
            })
        })
        .collect()
}

fn valid_id(id: &str) -> bool {
    id.len() == 11 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn need_ytdlp() -> Result<PathBuf, String> {
    find_ytdlp().map(|(p, _)| p).ok_or_else(|| "E_NO_YTDLP".to_string())
}

pub fn search(q: &str, limit: usize) -> Result<Vec<OnlineTrack>, String> {
    let exe_path = need_ytdlp()?;
    let _g = SEARCH_LOCK.lock().map_err(|_| "E_INTERNAL".to_string())?;
    // ask for a few more than needed: non-song results are filtered out afterwards
    let args: Vec<String> = ["--flat-playlist", "--dump-single-json", "--no-warnings", "--skip-download"]
        .iter()
        .map(|s| s.to_string())
        .chain([format!("ytsearch{}:{}", limit + 6, q)])
        .collect();
    let out = run(&exe_path, &args, Duration::from_secs(25))?;
    let v: Value = serde_json::from_str(&out).map_err(|e| format!("E_BAD_RESPONSE: {e}"))?;
    let mut tracks = parse_search(&v);
    tracks.truncate(limit);
    Ok(tracks)
}

/// (stream url, request headers to send with it)
pub fn resolve(id: &str) -> Result<(String, Vec<(String, String)>), String> {
    if !valid_id(id) {
        return Err("E_BAD_ID".into());
    }
    let exe_path = need_ytdlp()?;
    let _g = RESOLVE_LOCK.lock().map_err(|_| "E_INTERNAL".to_string())?;
    let mut args: Vec<String> = [
        "-f", "bestaudio[protocol=https][ext=m4a]/bestaudio[protocol=https]/bestaudio", "--no-playlist", "--no-warnings",
        "--print", "url", "--print", "%(http_headers)j",
    ]
    .iter()
    .map(|s| s.to_string())
    .collect();
    args.extend(runtime_args());
    args.push("--".into());
    args.push(format!("https://www.youtube.com/watch?v={id}"));
    let out = run(&exe_path, &args, Duration::from_secs(60))?;
    parse_resolved(&out)
}

pub fn parse_resolved(out: &str) -> Result<(String, Vec<(String, String)>), String> {
    let mut lines = out.lines().map(str::trim).filter(|l| !l.is_empty());
    let url = lines.next().ok_or("E_FORMAT")?.to_string();
    if !url.starts_with("https://") {
        return Err("E_FORMAT".into());
    }
    let mut headers = Vec::new();
    if let Some(Ok(Value::Object(m))) = lines.next().map(serde_json::from_str::<Value>) {
        for (k, v) in m {
            // only plain browser-like headers are forwarded (never cookies or anything that could carry an account)
            if ["user-agent", "accept", "accept-language", "sec-fetch-mode"].contains(&k.to_ascii_lowercase().as_str()) {
                if let Some(s) = v.as_str() {
                    headers.push((k, s.to_string()));
                }
            }
        }
    }
    Ok((url, headers))
}

// ---------- status / install ----------

#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct YtdlpStatus {
    pub installed: bool,
    pub path: String,
    pub version: String,
    /// installed by this app (so it can be updated / removed from here)
    pub managed: bool,
    /// "deno" | "node" | ""
    pub runtime: String,
}

pub fn status() -> YtdlpStatus {
    let runtime = find_runtime().map(|(n, _)| n.to_string()).unwrap_or_default();
    match find_ytdlp() {
        Some((p, managed)) => {
            let version = run(&p, &["--version".to_string()], Duration::from_secs(10)).map(|s| s.trim().to_string()).unwrap_or_default();
            YtdlpStatus { installed: true, path: p.display().to_string(), version, managed, runtime }
        }
        None => YtdlpStatus { runtime, ..Default::default() },
    }
}

#[derive(Serialize, Clone)]
pub struct Progress {
    pub stage: String,
    pub done: u64,
    pub total: u64,
}

fn ytdlp_asset() -> &'static str {
    if cfg!(target_os = "windows") {
        if cfg!(target_arch = "aarch64") { "yt-dlp_arm64.exe" } else { "yt-dlp.exe" }
    } else if cfg!(target_os = "macos") {
        "yt-dlp_macos"
    } else {
        "yt-dlp_linux"
    }
}

fn deno_asset() -> Option<&'static str> {
    if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        Some("deno-x86_64-pc-windows-msvc.zip")
    } else if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
        Some("deno-x86_64-unknown-linux-gnu.zip")
    } else if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        Some("deno-aarch64-apple-darwin.zip")
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        Some("deno-x86_64-apple-darwin.zip")
    } else {
        None
    }
}

fn dl_agent() -> ureq::Agent {
    ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(10)).timeout_read(Duration::from_secs(30)).user_agent(super::http::UA).build()
}

fn fetch_text(url: &str) -> Result<String, String> {
    let r = dl_agent().get(url).call().map_err(super::http::map_err)?;
    let mut s = String::new();
    r.into_reader().take(256 * 1024).read_to_string(&mut s).map_err(|e| format!("E_NETWORK: {e}"))?;
    Ok(s)
}

/// Downloads `url` to `dest` and returns the SHA-256 (hex). The file is only renamed into place by the caller after verification.
fn download(url: &str, dest: &Path, stage: &str, on_progress: &dyn Fn(Progress)) -> Result<String, String> {
    let resp = dl_agent().get(url).call().map_err(super::http::map_err)?;
    let total: u64 = resp.header("Content-Length").and_then(|v| v.parse().ok()).unwrap_or(0);
    let mut reader = resp.into_reader().take(300 * 1024 * 1024);
    let mut file = fs::File::create(dest).map_err(|e| format!("E_DISK: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 64 * 1024];
    let mut done = 0u64;
    let mut last = Instant::now();
    loop {
        let n = reader.read(&mut buf).map_err(|e| format!("E_NETWORK: {e}"))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
        file.write_all(&buf[..n]).map_err(|e| format!("E_DISK: {e}"))?;
        done += n as u64;
        if last.elapsed() > Duration::from_millis(200) {
            on_progress(Progress { stage: stage.into(), done, total });
            last = Instant::now();
        }
    }
    file.flush().map_err(|e| format!("E_DISK: {e}"))?;
    on_progress(Progress { stage: stage.into(), done, total: total.max(done) });
    Ok(hasher.finalize().iter().map(|b| format!("{b:02x}")).collect())
}

/// "hash  name" lines (SHA2-256SUMS format): the hash for `name`
pub fn checksum_for(sums: &str, name: &str) -> Option<String> {
    sums.lines().find_map(|l| {
        let mut it = l.split_whitespace();
        let (h, n) = (it.next()?, it.next()?);
        (n.trim_start_matches('*') == name && h.len() == 64).then(|| h.to_lowercase())
    })
}

#[cfg(unix)]
fn make_executable(p: &Path) {
    use std::os::unix::fs::PermissionsExt;
    let _ = fs::set_permissions(p, fs::Permissions::from_mode(0o755));
}
#[cfg(not(unix))]
fn make_executable(_: &Path) {}

pub fn install(with_runtime: bool, on_progress: &dyn Fn(Progress)) -> Result<YtdlpStatus, String> {
    let dir = bin_dir().ok_or("E_INTERNAL")?;
    fs::create_dir_all(&dir).map_err(|e| format!("E_DISK: {e}"))?;
    let asset = ytdlp_asset();
    let base = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";

    on_progress(Progress { stage: "checksum".into(), done: 0, total: 0 });
    let sums = fetch_text(&format!("{base}/SHA2-256SUMS"))?;
    let want = checksum_for(&sums, asset).ok_or("E_CHECKSUM")?;
    let part = dir.join(format!("{asset}.part"));
    let got = download(&format!("{base}/{asset}"), &part, "ytdlp", on_progress)?;
    if got != want {
        let _ = fs::remove_file(&part);
        return Err("E_CHECKSUM".into());
    }
    let target = dir.join(exe("yt-dlp"));
    let _ = fs::remove_file(&target);
    fs::rename(&part, &target).map_err(|e| format!("E_DISK: {e}"))?;
    make_executable(&target);

    if with_runtime && find_runtime().is_none() {
        if let Some(zip_name) = deno_asset() {
            install_deno(&dir, zip_name, on_progress)?;
        }
    }
    Ok(status())
}

fn install_deno(dir: &Path, zip_name: &str, on_progress: &dyn Fn(Progress)) -> Result<(), String> {
    let base = "https://github.com/denoland/deno/releases/latest/download";
    // unverified executables are never run: without a published checksum the install stops
    let sum_text = fetch_text(&format!("{base}/{zip_name}.sha256sum")).map_err(|_| "E_CHECKSUM".to_string())?;
    let want = sum_text.split_whitespace().next().map(str::to_lowercase).filter(|h| h.len() == 64).ok_or("E_CHECKSUM")?;
    let part = dir.join(format!("{zip_name}.part"));
    let got = download(&format!("{base}/{zip_name}"), &part, "runtime", on_progress)?;
    if got != want {
        let _ = fs::remove_file(&part);
        return Err("E_CHECKSUM".into());
    }
    let result = extract_deno(&part, dir);
    let _ = fs::remove_file(&part);
    result
}

fn extract_deno(zip_path: &Path, dir: &Path) -> Result<(), String> {
    let file = fs::File::open(zip_path).map_err(|e| format!("E_DISK: {e}"))?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| format!("E_DISK: {e}"))?;
    let name = exe("deno");
    let mut entry = zip.by_name(&name).map_err(|e| format!("E_DISK: {e}"))?;
    let target = dir.join(&name);
    let mut out = fs::File::create(&target).map_err(|e| format!("E_DISK: {e}"))?;
    std::io::copy(&mut entry.by_ref().take(400 * 1024 * 1024), &mut out).map_err(|e| format!("E_DISK: {e}"))?;
    drop(out);
    make_executable(&target);
    Ok(())
}

/// Removes the yt-dlp / runtime this app installed (a yt-dlp the user installed themselves is never touched)
pub fn remove_managed() -> Result<(), String> {
    if let Some(d) = bin_dir() {
        for n in ["yt-dlp", "deno"] {
            let p = d.join(exe(n));
            if p.is_file() {
                fs::remove_file(&p).map_err(|e| format!("E_DISK: {e}"))?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_artist_dash_title() {
        assert_eq!(split_title("Daft Punk - Harder, Better, Faster, Stronger (Official Video)", "Daft Punk"), ("Daft Punk".into(), "Harder, Better, Faster, Stronger".into()));
        assert_eq!(split_title("Blinding Lights", "The Weeknd - Topic"), ("The Weeknd".into(), "Blinding Lights".into()));
        assert_eq!(split_title("Song Title", "SomeVEVO"), ("Some".into(), "Song Title".into()));
    }

    #[test]
    fn filters_non_songs() {
        let v = serde_json::json!({"entries": [
            {"id": "dQw4w9WgXcQ", "title": "Rick Astley - Never Gonna Give You Up", "channel": "Rick Astley", "duration": 213.0},
            {"id": "live0000001", "title": "Lofi live", "channel": "x", "duration": null},
            {"id": "mix00000001", "title": "10 hour mix", "channel": "x", "duration": 36000.0},
            {"id": "bad id", "title": "x", "channel": "x", "duration": 200.0}
        ]});
        let t = parse_search(&v);
        assert_eq!(t.len(), 1);
        assert_eq!(t[0].artist, "Rick Astley");
        assert_eq!(t[0].title, "Never Gonna Give You Up");
        assert!(t[0].cover_url.contains("dQw4w9WgXcQ"));
    }

    #[test]
    fn parses_resolved_output() {
        let out = "https://rr1.googlevideo.com/videoplayback?x=1\n{\"User-Agent\":\"UA\",\"Cookie\":\"secret\",\"Accept\":\"*/*\"}\n";
        let (url, h) = parse_resolved(out).unwrap();
        assert!(url.starts_with("https://"));
        assert_eq!(h.len(), 2);
        assert!(h.iter().all(|(k, _)| k != "Cookie"));
        assert!(parse_resolved("http://insecure/x\n{}").is_err());
        assert!(parse_resolved("").is_err());
    }

    #[test]
    fn classifies_errors() {
        assert_eq!(classify("ERROR: Sign in to confirm you're not a bot"), "E_BOT");
        assert_eq!(classify("WARNING: No supported JavaScript runtime could be found"), "E_JS");
        assert_eq!(classify("HTTP Error 429: Too Many Requests"), "E_RATE");
        assert!(classify("something odd\n").starts_with("E_YTDLP: something odd"));
    }

    #[test]
    fn reads_checksum_files() {
        let sums = format!("{}  yt-dlp.exe\n{}  yt-dlp_linux\n", "a".repeat(64), "b".repeat(64));
        assert_eq!(checksum_for(&sums, "yt-dlp.exe"), Some("a".repeat(64)));
        assert_eq!(checksum_for(&sums, "yt-dlp_macos"), None);
    }
}
