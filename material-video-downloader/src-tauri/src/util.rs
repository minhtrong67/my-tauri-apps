use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub const DEFAULT_UA: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

pub const MEDIA_EXTS: &[&str] = &[
    "mp4", "m4v", "mkv", "webm", "mov", "avi", "flv", "wmv", "ts", "mpg", "mpeg", "3gp", "ogv", "mp3", "m4a", "aac",
    "flac", "wav", "ogg", "opus",
];

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Make a string safe to use as a file name on every desktop OS.
pub fn sanitize(name: &str) -> String {
    let mut out: String = name
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => ' ',
            c if c.is_control() => ' ',
            c => c,
        })
        .collect();
    out = out.split_whitespace().collect::<Vec<_>>().join(" ");
    let out = out.trim_matches(|c: char| c == '.' || c == ' ').to_string();
    let out: String = out.chars().take(120).collect();
    let out = out.trim().to_string();
    if out.is_empty() {
        return "video".into();
    }
    let upper = out.to_uppercase();
    let reserved = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "LPT1", "LPT2", "LPT3",
    ];
    if reserved.contains(&upper.as_str()) {
        return format!("_{out}");
    }
    out
}

pub fn ext_of(name: &str) -> String {
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default()
}

pub fn stem_of(name: &str) -> String {
    Path::new(name)
        .file_stem()
        .and_then(|e| e.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| name.to_string())
}

pub fn with_ext(name: &str, ext: &str) -> String {
    format!("{}.{}", stem_of(name), ext)
}

/// Pick a file name that does not collide with files on disk or `taken` names.
pub fn unique_name(dir: &Path, name: &str, taken: &[String]) -> String {
    let stem = stem_of(name);
    let ext = ext_of(name);
    let build = |n: u32| -> String {
        let base = if n == 0 { stem.clone() } else { format!("{stem} ({n})") };
        if ext.is_empty() {
            base
        } else {
            format!("{base}.{ext}")
        }
    };
    let mut n = 0;
    loop {
        let candidate = build(n);
        let exists = dir.join(&candidate).exists()
            || dir.join(format!("{candidate}.part")).exists()
            || taken.iter().any(|t| t.eq_ignore_ascii_case(&candidate));
        if !exists {
            return candidate;
        }
        n += 1;
        if n > 9999 {
            return format!("{stem}-{}.{ext}", now_ms());
        }
    }
}

/// Global download speed limiter shared by every running task.
pub struct Limiter {
    bps: AtomicU64,
    next: tokio::sync::Mutex<Instant>,
}

impl Limiter {
    pub fn new() -> Self {
        Self {
            bps: AtomicU64::new(0),
            next: tokio::sync::Mutex::new(Instant::now()),
        }
    }

    pub fn set_kb(&self, kb: u64) {
        self.bps.store(kb.saturating_mul(1024), Ordering::Relaxed);
    }

    pub async fn acquire(&self, n: usize) {
        let bps = self.bps.load(Ordering::Relaxed);
        if bps == 0 {
            return;
        }
        let wait = {
            let mut next = self.next.lock().await;
            let now = Instant::now();
            if *next < now {
                *next = now;
            }
            let wait = *next - now;
            *next += Duration::from_secs_f64(n as f64 / bps as f64);
            wait
        };
        if !wait.is_zero() {
            tokio::time::sleep(wait).await;
        }
    }
}

#[cfg(windows)]
pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Kill a process and every child it spawned.
pub fn kill_tree(pid: u32) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("pkill")
            .args(["-TERM", "-P", &pid.to_string()])
            .output();
        let _ = std::process::Command::new("kill").args(["-TERM", &pid.to_string()]).output();
    }
}

pub fn open_path(path: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path.to_string_lossy()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg(path).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open").arg(path).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
}

pub fn reveal_path(path: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .raw_arg(format!("/select,\"{}\"", path.display()))
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg("-R").arg(path).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let dir: PathBuf = if path.is_dir() {
            path.to_path_buf()
        } else {
            path.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| PathBuf::from("."))
        };
        std::process::Command::new("xdg-open").arg(dir).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
}

/// Search the PATH for an executable.
pub fn which(name: &str) -> Option<PathBuf> {
    let exe = if cfg!(windows) { format!("{name}.exe") } else { name.to_string() };
    let paths = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&paths) {
        let candidate = dir.join(&exe);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

pub fn host_of(url: &str) -> String {
    url::Url::parse(url)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.trim_start_matches("www.").to_string()))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_names() {
        assert_eq!(sanitize("a/b:c*d?.mp4"), "a b c d .mp4");
        assert_eq!(sanitize("   "), "video");
        assert_eq!(sanitize("CON"), "_CON");
        assert_eq!(with_ext("movie.ts", "mp4"), "movie.mp4");
    }

    #[test]
    fn makes_unique_names() {
        let dir = std::env::temp_dir();
        let taken = vec!["clip.mp4".to_string(), "clip (1).mp4".to_string()];
        assert_eq!(unique_name(&dir, "clip.mp4", &taken), "clip (2).mp4");
    }
}
