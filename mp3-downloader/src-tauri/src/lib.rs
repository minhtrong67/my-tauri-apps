use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    process::Stdio,
    sync::{Mutex as StdMutex, OnceLock},
    time::Duration,
};

use futures_util::StreamExt;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, State};
use tauri_plugin_opener::OpenerExt;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::Command,
    sync::{oneshot, Mutex},
};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const BROWSER_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

#[derive(Default)]
struct AppState {
    jobs: Mutex<HashMap<String, oneshot::Sender<()>>>,
}

fn es<E: ToString>(e: E) -> String {
    e.to_string()
}

// ───────────────────────── Công cụ ngoài (yt-dlp, ffmpeg) ─────────────────────────

/// Thư mục tạm cho các tệp đang tải dở (xoá sạch mỗi lần mở app).
fn tmp_root(app: &AppHandle) -> PathBuf {
    app.path().app_cache_dir().unwrap_or_else(|_| std::env::temp_dir()).join("tmp")
}

fn default_dir(app: &AppHandle) -> PathBuf {
    // Thư mục Downloads thật của người dùng (kể cả khi đã chuyển sang ổ khác)
    app.path()
        .download_dir()
        .or_else(|_| app.path().audio_dir())
        .unwrap_or_else(|_| std::env::temp_dir())
}

fn bin_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_local_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir())
        .join("bin")
}

fn exe_name(name: &str) -> String {
    if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    }
}

/// Tạo lệnh chạy tool: ưu tiên bản đã tải trong thư mục của app, nếu không có thì dùng PATH.
fn make_cmd(app: &AppHandle, name: &str) -> Command {
    let dir = bin_dir(app);
    let exe = dir.join(exe_name(name));
    let program = if exe.exists() { exe } else { PathBuf::from(name) };
    let mut c = Command::new(program);
    let old = std::env::var_os("PATH").unwrap_or_default();
    let mut paths = vec![dir];
    paths.extend(std::env::split_paths(&old));
    if let Ok(joined) = std::env::join_paths(paths) {
        c.env("PATH", joined);
    }
    // Ép Python (yt-dlp) xuất UTF-8 thay vì cp1252 trên Windows
    c.env("PYTHONUTF8", "1").env("PYTHONIOENCODING", "utf-8");
    c.stdin(Stdio::null());
    c.kill_on_drop(true);
    #[cfg(windows)]
    c.creation_flags(CREATE_NO_WINDOW);
    c
}

#[derive(Serialize)]
struct ToolStatus {
    ytdlp: Option<String>,
    ffmpeg: Option<String>,
    deno: Option<String>,
}

/// Chạy `tool <arg>` (tối đa 10 giây) và trích phiên bản: `word` = vị trí từ trong dòng đầu, None = cả dòng.
async fn tool_version(app: &AppHandle, name: &str, arg: &str, word: Option<usize>) -> Option<String> {
    let mut cmd = make_cmd(app, name);
    cmd.arg(arg);
    let out = tokio::time::timeout(Duration::from_secs(10), cmd.output()).await.ok()?.ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let first = text.lines().next().unwrap_or("").trim();
    Some(match word {
        Some(n) => first.split_whitespace().nth(n).unwrap_or("").to_string(),
        None => first.to_string(),
    })
}

#[tauri::command]
async fn check_tools(app: AppHandle) -> ToolStatus {
    let (ytdlp, ffmpeg, deno) = tokio::join!(
        tool_version(&app, "yt-dlp", "--version", None),
        tool_version(&app, "ffmpeg", "-version", Some(2)),
        tool_version(&app, "deno", "--version", Some(1)),
    );
    ToolStatus { ytdlp, ffmpeg, deno }
}

#[derive(Serialize, Clone)]
struct ToolProgress {
    tool: String,
    percent: u32,
}

async fn download_file(app: &AppHandle, tool: &str, url: &str, dest: &Path) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("mp3-downloader")
        .build()
        .map_err(es)?;
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(es)?
        .error_for_status()
        .map_err(es)?;
    let total = resp.content_length().unwrap_or(0);
    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(es)?;
    }
    let mut file = tokio::fs::File::create(dest).await.map_err(es)?;
    let mut stream = resp.bytes_stream();
    let (mut got, mut last) = (0u64, 101u32);
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(es)?;
        file.write_all(&chunk).await.map_err(es)?;
        got += chunk.len() as u64;
        if total > 0 {
            let p = (got * 100 / total) as u32;
            if p != last {
                last = p;
                let _ = app.emit("tool-progress", ToolProgress { tool: tool.into(), percent: p });
            }
        }
    }
    file.flush().await.map_err(es)?;
    Ok(())
}

// ───────────────────────── Kiểm tra toàn vẹn (SHA-256) ─────────────────────────

fn sha256_file(path: &Path) -> Result<String, String> {
    use std::io::Read;
    let mut f = std::fs::File::open(path).map_err(es)?;
    let mut h = Sha256::new();
    let mut buf = [0u8; 65536];
    loop {
        let n = f.read(&mut buf).map_err(es)?;
        if n == 0 {
            break;
        }
        h.update(&buf[..n]);
    }
    Ok(h.finalize().iter().map(|b| format!("{b:02x}")).collect())
}

/// Lấy mã SHA-256 mong đợi từ tệp checksum do nhà phát hành công bố (dạng "hash  tên-tệp" hoặc chỉ "hash").
async fn expected_sha(sums_url: &str, asset: &str) -> Option<String> {
    let client = reqwest::Client::builder().user_agent("mp3-downloader").timeout(Duration::from_secs(20)).build().ok()?;
    let text = client.get(sums_url).send().await.ok()?.error_for_status().ok()?.text().await.ok()?;
    let lines: Vec<&str> = text.lines().map(str::trim).filter(|l| !l.is_empty()).collect();
    for l in &lines {
        let mut p = l.split_whitespace();
        if let (Some(h), Some(n)) = (p.next(), p.next()) {
            if n.trim_start_matches('*') == asset && h.len() == 64 {
                return Some(h.to_lowercase());
            }
        }
    }
    if lines.len() == 1 {
        let h = lines[0].split_whitespace().next()?;
        if h.len() == 64 {
            return Some(h.to_lowercase());
        }
    }
    None
}

/// Đối chiếu tệp vừa tải với checksum công bố. Sai mã → xoá tệp và báo lỗi.
/// (Nếu không lấy được tệp checksum thì bỏ qua bước này để việc cài đặt không bị chặn.)
async fn verify_download(path: &Path, sums_url: &str, asset: &str) -> Result<(), String> {
    let Some(expected) = expected_sha(sums_url, asset).await else { return Ok(()) };
    let p = path.to_path_buf();
    let actual = tokio::task::spawn_blocking(move || sha256_file(&p)).await.map_err(es)??;
    if actual != expected {
        let _ = tokio::fs::remove_file(path).await;
        return Err("@sha_mismatch".into());
    }
    Ok(())
}

#[derive(Serialize)]
struct UpdateInfo {
    current: String,
    latest: String,
    outdated: bool,
}

/// So phiên bản yt-dlp đang dùng với bản phát hành mới nhất trên GitHub.
#[tauri::command]
async fn check_ytdlp_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let current = tool_version(&app, "yt-dlp", "--version", None).await.ok_or_else(|| "@ytdlp_run|yt-dlp".to_string())?;
    let client = reqwest::Client::builder().user_agent("mp3-downloader").timeout(Duration::from_secs(15)).build().map_err(es)?;
    let v: Value = client
        .get("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest")
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| format!("@update_check|{e}"))?
        .json()
        .await
        .map_err(|e| format!("@update_check|{e}"))?;
    let latest = v.get("tag_name").and_then(|x| x.as_str()).unwrap_or("").trim().to_string();
    // Phiên bản dạng ngày (2025.09.26[.hhmmss]) so sánh theo chuỗi là đúng
    let outdated = !latest.is_empty() && current.as_str() < latest.as_str();
    Ok(UpdateInfo { current, latest, outdated })
}

#[tauri::command]
async fn install_ytdlp(app: AppHandle) -> Result<(), String> {
    let asset = if cfg!(windows) {
        "yt-dlp.exe"
    } else if cfg!(target_os = "macos") {
        "yt-dlp_macos"
    } else {
        "yt-dlp_linux"
    };
    let url = format!("https://github.com/yt-dlp/yt-dlp/releases/latest/download/{asset}");
    let dest = bin_dir(&app).join(exe_name("yt-dlp"));
    let tmp = dest.with_extension("download");
    download_file(&app, "ytdlp", &url, &tmp).await?;
    verify_download(&tmp, "https://github.com/yt-dlp/yt-dlp/releases/latest/download/SHA2-256SUMS", asset).await?;
    let _ = tokio::fs::remove_file(&dest).await;
    tokio::fs::rename(&tmp, &dest).await.map_err(es)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perm = std::fs::metadata(&dest).map_err(es)?.permissions();
        perm.set_mode(0o755);
        std::fs::set_permissions(&dest, perm).map_err(es)?;
    }
    Ok(())
}

#[tauri::command]
async fn install_ffmpeg(app: AppHandle) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("@ffmpeg_manual".into());
    }
    let dir = bin_dir(&app);
    let zip_path = dir.join("ffmpeg.zip");
    let urls = [
        "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
        "https://github.com/yt-dlp/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip",
    ];
    let mut last_err = String::new();
    let mut ok = false;
    for u in urls {
        match download_file(&app, "ffmpeg", u, &zip_path).await {
            Ok(_) => {
                ok = true;
                break;
            }
            Err(e) => last_err = e,
        }
    }
    if !ok {
        return Err(format!("@ffmpeg_download|{last_err}"));
    }
    verify_download(&zip_path, "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/checksums.sha256", "ffmpeg-master-latest-win64-gpl.zip").await?;
    let (zp, d2) = (zip_path.clone(), dir.clone());
    tokio::task::spawn_blocking(move || unzip_flat(&zp, &d2, &["ffmpeg.exe", "ffprobe.exe"]))
        .await
        .map_err(es)??;
    let _ = tokio::fs::remove_file(&zip_path).await;
    Ok(())
}

/// Giải nén các tệp có tên chỉ định (bỏ qua cấu trúc thư mục trong zip).
fn unzip_flat(zip_path: &Path, dest: &Path, names: &[&str]) -> Result<(), String> {
    let file = std::fs::File::open(zip_path).map_err(es)?;
    let mut archive = zip::ZipArchive::new(file).map_err(es)?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(es)?;
        let entry_name = entry.name().replace('\\', "/");
        let base = entry_name.rsplit('/').next().unwrap_or("").to_string();
        if names.iter().any(|n| n.eq_ignore_ascii_case(&base)) {
            let mut out = std::fs::File::create(dest.join(&base)).map_err(es)?;
            std::io::copy(&mut entry, &mut out).map_err(es)?;
        }
    }
    Ok(())
}

/// Deno là runtime JavaScript mà yt-dlp dùng để giải mã link YouTube (giúp tránh lỗi HTTP 403).
#[tauri::command]
async fn install_deno(app: AppHandle) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("@deno_manual".into());
    }
    let arch = if cfg!(target_arch = "aarch64") { "aarch64" } else { "x86_64" };
    let url = format!("https://github.com/denoland/deno/releases/latest/download/deno-{arch}-pc-windows-msvc.zip");
    let dir = bin_dir(&app);
    let zip_path = dir.join("deno.zip");
    download_file(&app, "deno", &url, &zip_path).await.map_err(|e| format!("@deno_download|{e}"))?;
    verify_download(&zip_path, &format!("{url}.sha256sum"), &format!("deno-{arch}-pc-windows-msvc.zip")).await?;
    let (zp, d2) = (zip_path.clone(), dir.clone());
    tokio::task::spawn_blocking(move || unzip_flat(&zp, &d2, &["deno.exe"]))
        .await
        .map_err(es)??;
    let _ = tokio::fs::remove_file(&zip_path).await;
    Ok(())
}

// ───────────────────────── Thông tin bài hát ─────────────────────────

#[derive(Serialize, Deserialize, Clone, Default)]
struct TrackInfo {
    source: String,
    url: String,
    title: String,
    artist: String,
    album: String,
    year: String,
    thumbnail: String,
    duration: u64,
}

fn detect_source(url: &str) -> &'static str {
    let u = url.to_lowercase();
    if u.contains("spotify.com") || u.contains("spotify.link") {
        "spotify"
    } else if u.contains("tiktok.com") {
        "tiktok"
    } else if u.contains("youtube.com") || u.contains("youtu.be") {
        "youtube"
    } else {
        "other"
    }
}

fn html_unescape(s: &str) -> String {
    s.replace("&quot;", "\"")
        .replace("&#x27;", "'")
        .replace("&#39;", "'")
        .replace("&#039;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
}

fn parse_meta(html: &str) -> HashMap<String, String> {
    static META_TAG: OnceLock<Regex> = OnceLock::new();
    static META_ATTR: OnceLock<Regex> = OnceLock::new();
    let tag = META_TAG.get_or_init(|| Regex::new(r#"(?is)<meta\s+([^>]*?)/?>"#).unwrap());
    let attr = META_ATTR.get_or_init(|| Regex::new(r#"([a-zA-Z_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')"#).unwrap());
    let mut map = HashMap::new();
    for t in tag.captures_iter(html) {
        let (mut key, mut content) = (None, None);
        for a in attr.captures_iter(&t[1]) {
            let val = a.get(2).or(a.get(3)).map(|m| m.as_str()).unwrap_or("");
            match a[1].to_lowercase().as_str() {
                "property" | "name" => key = Some(val.to_string()),
                "content" => content = Some(html_unescape(val)),
                _ => {}
            }
        }
        if let (Some(k), Some(c)) = (key, content) {
            map.entry(k).or_insert(c);
        }
    }
    map
}

const CRAWLER_UA: &str = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

async fn get_text(client: &reqwest::Client, url: &str, ua: &str) -> Result<String, String> {
    let r = client
        .get(url)
        .header(reqwest::header::USER_AGENT, ua)
        .header(reqwest::header::ACCEPT_LANGUAGE, "en-US,en;q=0.9")
        .send()
        .await
        .map_err(es)?;
    let status = r.status();
    let text = r.text().await.map_err(es)?;
    if !status.is_success() {
        return Err(format!("HTTP {status}"));
    }
    Ok(text)
}

async fn spotify_info(url: &str) -> Result<TrackInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(es)?;

    // Link rút gọn (spotify.link) → lấy URL đích sau khi chuyển hướng
    let mut final_url = url.to_string();
    if url.contains("spotify.link") {
        let r = client
            .get(url)
            .header(reqwest::header::USER_AGENT, BROWSER_UA)
            .send()
            .await
            .map_err(es)?;
        final_url = r.url().to_string();
    }
    // Chấp nhận cả dạng có tiền tố ngôn ngữ: open.spotify.com/intl-vi/track/<id>?si=…
    let re = Regex::new(r"/(track|album|playlist|artist|episode|show)/([A-Za-z0-9]+)").map_err(es)?;
    let caps = re
        .captures(&final_url)
        .ok_or("@spotify_bad_link")?;
    if &caps[1] != "track" {
        return Err("@spotify_only_track".into());
    }
    let id = caps[2].to_string();
    let page_url = format!("https://open.spotify.com/track/{id}");

    // Thử lấy trang với UA của bot mạng xã hội (luôn có đủ thẻ og), rồi mới tới UA trình duyệt
    let mut meta: HashMap<String, String> = HashMap::new();
    let mut last_err = String::new();
    for ua in [CRAWLER_UA, BROWSER_UA] {
        match get_text(&client, &page_url, ua).await {
            Ok(html) => {
                let m = parse_meta(&html);
                if m.contains_key("og:title") {
                    meta = m;
                    break;
                }
                last_err = "no track metadata".into();
            }
            Err(e) => last_err = e,
        }
    }

    // Dự phòng: oEmbed (chỉ có tên bài + ảnh bìa)
    if meta.is_empty() {
        let api = format!("https://open.spotify.com/oembed?url={page_url}");
        if let Ok(text) = get_text(&client, &api, BROWSER_UA).await {
            if let Ok(v) = serde_json::from_str::<Value>(&text) {
                if let Some(t) = v.get("title").and_then(|x| x.as_str()) {
                    meta.insert("og:title".into(), t.to_string());
                }
                if let Some(t) = v.get("thumbnail_url").and_then(|x| x.as_str()) {
                    meta.insert("og:image".into(), t.to_string());
                }
            }
        }
    }
    let title = meta.get("og:title").cloned().unwrap_or_default();
    if title.is_empty() {
        return Err(format!("@spotify_read|{last_err}"));
    }

    // og:description dạng "Nghệ sĩ · Album · Bài hát · 2019" (hoặc 3 phần nếu không có album)
    let desc = meta.get("og:description").cloned().unwrap_or_default();
    let desc = match desc.find("on Spotify. ") {
        Some(i) => desc[i + "on Spotify. ".len()..].to_string(),
        None => desc,
    };
    let parts: Vec<String> = desc.split('·').map(|p| p.trim().to_string()).filter(|p| !p.is_empty()).collect();

    let mut artist = parts.first().cloned().unwrap_or_default();
    if artist.is_empty() {
        artist = meta.get("music:musician_description").cloned().unwrap_or_default();
    }
    let mut album = if parts.len() >= 4 { parts[1].clone() } else { String::new() };
    if album.is_empty() {
        // Lấy tên album từ trang album (thẻ music:album)
        if let Some(album_url) = meta.get("music:album") {
            if let Some(c) = Regex::new(r"/album/([A-Za-z0-9]+)").map_err(es)?.captures(album_url) {
                let u = format!("https://open.spotify.com/album/{}", &c[1]);
                if let Ok(html) = get_text(&client, &u, CRAWLER_UA).await {
                    if let Some(t) = parse_meta(&html).get("og:title") {
                        album = t.clone();
                    }
                }
            }
        }
    }
    let year = meta
        .get("music:release_date")
        .map(|d| d.chars().take(4).collect::<String>())
        .filter(|y| y.len() == 4 && y.chars().all(|c| c.is_ascii_digit()))
        .or_else(|| {
            parts.last().filter(|l| l.len() == 4 && l.chars().all(|c| c.is_ascii_digit())).cloned()
        })
        .unwrap_or_default();
    let duration = meta.get("music:duration").and_then(|d| d.parse::<u64>().ok()).unwrap_or(0);

    Ok(TrackInfo {
        source: "spotify".into(),
        url: url.to_string(),
        title,
        artist,
        album,
        year,
        thumbnail: meta.get("og:image").cloned().unwrap_or_default(),
        duration,
    })
}

#[tauri::command]
async fn fetch_info(app: AppHandle, url: String) -> Result<TrackInfo, String> {
    load_info(&app, url.trim()).await
}

async fn load_info(app: &AppHandle, url: &str) -> Result<TrackInfo, String> {
    let url = url.to_string();
    if !url.starts_with("http") {
        return Err("@url_invalid".into());
    }
    let source = detect_source(&url);
    if source == "spotify" {
        return spotify_info(&url).await;
    }

    let out = make_cmd(&app, "yt-dlp")
        .args(["-J", "--no-playlist", "--no-warnings", url.as_str()])
        .output()
        .await
        .map_err(|e| format!("@ytdlp_run|{e}"))?;
    if !out.status.success() {
        return Err(clean_error(&String::from_utf8_lossy(&out.stderr)));
    }
    let v: Value = serde_json::from_str(&String::from_utf8_lossy(&out.stdout)).map_err(es)?;
    let s = |keys: &[&str]| -> String {
        for k in keys {
            if let Some(t) = v.get(*k).and_then(|x| x.as_str()) {
                if !t.is_empty() {
                    return t.to_string();
                }
            }
        }
        String::new()
    };
    let year = v
        .get("release_year")
        .and_then(|y| y.as_u64())
        .map(|y| y.to_string())
        .or_else(|| v.get("upload_date").and_then(|d| d.as_str()).map(|d| d.chars().take(4).collect()))
        .unwrap_or_default();

    Ok(TrackInfo {
        source: source.into(),
        url,
        title: if source == "tiktok" { s(&["title", "track"]) } else { s(&["track", "title"]) },
        artist: if source == "tiktok" {
            s(&["uploader", "creator", "artist"])
        } else {
            s(&["artist", "creator", "uploader", "channel"]).trim_end_matches(" - Topic").to_string()
        },
        album: s(&["album"]),
        year,
        thumbnail: s(&["thumbnail"]),
        duration: v.get("duration").and_then(|d| d.as_f64()).unwrap_or(0.0) as u64,
    })
}

// ───────────────────────── Tải xuống ─────────────────────────

#[derive(Deserialize)]
struct DownloadReq {
    id: String,
    url: String,
    out_dir: String,
    quality: String, // "best" | "320" | "256" | "192" | "128"
    crop_thumb: bool,
    info: Option<TrackInfo>,
    /// Người dùng đã sửa thông tin bài hát → ghi lại thẻ ID3 kể cả với YouTube/TikTok
    #[serde(default)]
    edited: bool,
    /// "artist-title" | "title" | "title-artist" | "artist-album-title"
    #[serde(default)]
    name_tpl: String,
    #[serde(default)]
    artist_folder: bool,
    /// "rename" | "skip" | "overwrite"
    #[serde(default)]
    dup: String,
    #[serde(default)]
    speed_limit: String,
    #[serde(default)]
    cookies_browser: String,
    #[serde(default)]
    proxy: String,
}

#[derive(Serialize, Clone)]
struct Progress {
    id: String,
    stage: String, // downloading | converting | tagging | done | error | cancelled
    percent: f32,
    speed: String,
    eta: String,
    message: String,
    file: Option<String>,
}

fn emit(app: &AppHandle, id: &str, stage: &str, percent: f32, speed: &str, eta: &str, message: &str, file: Option<String>) {
    let _ = app.emit(
        "download-progress",
        Progress {
            id: id.into(),
            stage: stage.into(),
            percent,
            speed: speed.into(),
            eta: eta.into(),
            message: message.into(),
            file,
        },
    );
}

fn strip_ansi(s: &str) -> String {
    static ANSI: OnceLock<Regex> = OnceLock::new();
    ANSI.get_or_init(|| Regex::new(r"\x1b\[[0-9;]*m").unwrap()).replace_all(s, "").to_string()
}

fn clean_error(stderr: &str) -> String {
    let lines: Vec<&str> = stderr.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    let line = lines
        .iter()
        .rev()
        .find(|l| l.starts_with("ERROR"))
        .or(lines.last())
        .copied()
        .unwrap_or("@unknown");
    let lower = line.to_lowercase();
    if lower.contains("ffmpeg") || lower.contains("ffprobe") {
        return "@ffmpeg_missing".into();
    }
    if lower.contains("sign in") || lower.contains("confirm you") {
        return "@yt_signin".into();
    }
    if lower.contains("403") || lower.contains("forbidden") {
        return "@http_403".into();
    }
    if lower.contains("requested format is not available") {
        return "@no_format".into();
    }
    line.trim_start_matches("ERROR: ").to_string()
}

fn safe_name(s: &str) -> String {
    let cleaned: String = s
        .chars()
        .map(|c| if "<>:\"/\\|?*%".contains(c) || c.is_control() { ' ' } else { c })
        .collect();
    let joined = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");
    let short: String = joined.chars().take(120).collect();
    // Windows không cho tên tệp kết thúc bằng dấu chấm hoặc khoảng trắng
    let name = short.trim_end_matches(|c: char| c == '.' || c == ' ').to_string();
    // ...và cấm các tên thiết bị dành riêng (CON, NUL, COM1, LPT1…)
    let up = name.to_uppercase();
    let reserved = matches!(up.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || ((up.starts_with("COM") || up.starts_with("LPT")) && up.len() == 4 && up.as_bytes()[3].is_ascii_digit());
    if reserved { format!("_{name}") } else { name }
}

/// Đặt tên tệp theo mẫu người dùng chọn; mẫu mặc định dùng logic "Nghệ sĩ - Tên bài hát" ở trên.
fn named_stem(info: &TrackInfo, spotify: bool, tpl: &str) -> String {
    let (a, t, al) = (info.artist.trim(), info.title.trim(), info.album.trim());
    let full = match tpl {
        "title" => t.to_string(),
        "title-artist" if !a.is_empty() => format!("{t} - {a}"),
        "artist-album-title" => [a, al, t].iter().copied().filter(|x| !x.is_empty()).collect::<Vec<_>>().join(" - "),
        _ => return file_stem_for(info, spotify),
    };
    let name = safe_name(&full);
    if name.is_empty() { "audio".to_string() } else { name }
}

/// Tên tệp: "Nghệ sĩ - Tên bài hát". Với Spotify, "(feat. X)" được đổi thành "ft. X"
/// và nghệ sĩ khách mời được bỏ khỏi phần nghệ sĩ, vd: "Gryffin, ILLENIUM - Feel Good ft. Daya".
fn file_stem_for(info: &TrackInfo, spotify: bool) -> String {
    let t = info.title.trim();
    let a = info.artist.trim();
    let (mut title, mut artist) = (t.to_string(), a.to_string());
    if spotify {
        if let Ok(re) = Regex::new(r"(?i)\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring)\s+([^\)\]]+)[\)\]]") {
            if let Some(c) = re.captures(t) {
                let feat = c[1].trim().to_string();
                title = re.replace(t, regex::NoExpand(&format!(" ft. {feat}"))).trim().to_string();
                let feats: Vec<String> = feat
                    .split(|ch: char| ch == ',' || ch == '&')
                    .map(|x| x.trim().to_lowercase())
                    .filter(|x| !x.is_empty())
                    .collect();
                let kept: Vec<&str> = a
                    .split(',')
                    .map(|x| x.trim())
                    .filter(|x| !x.is_empty() && !feats.contains(&x.to_lowercase()))
                    .collect();
                if !kept.is_empty() {
                    artist = kept.join(", ");
                }
            }
        }
    }
    let full = if artist.is_empty() {
        title
    } else if !spotify && (title.contains(" - ") || title.to_lowercase().starts_with(&artist.to_lowercase())) {
        title // tiêu đề video đã có dạng "Nghệ sĩ - Bài hát"
    } else {
        format!("{artist} - {title}")
    };
    let name = safe_name(&full);
    if name.is_empty() { "audio".to_string() } else { name }
}

async fn fetch_cover(url: &str, dir: &Path) -> Option<PathBuf> {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(20)).build().ok()?;
    let r = client.get(url).header(reqwest::header::USER_AGENT, BROWSER_UA).send().await.ok()?;
    if !r.status().is_success() {
        return None;
    }
    let bytes = r.bytes().await.ok()?;
    if bytes.len() < 500 {
        return None;
    }
    let ext = if bytes.starts_with(&[0x89, b'P', b'N', b'G']) { "png" } else { "jpg" };
    let path = dir.join(format!("cover.{ext}"));
    tokio::fs::write(&path, &bytes).await.ok()?;
    Some(path)
}

/// Ghi thẻ ID3v2.3 (Windows Explorer đọc ảnh bìa ổn định nhất) bằng ffmpeg, không mã hoá lại âm thanh.
async fn tag_with_ffmpeg(app: &AppHandle, path: &Path, info: &TrackInfo, cover: Option<&Path>) -> Result<(), String> {
    let out = path.with_file_name("tagged.tmp.mp3");
    let mut c = make_cmd(app, "ffmpeg");
    c.args(["-y", "-v", "error", "-i"]).arg(path);
    if let Some(cv) = cover {
        c.arg("-i").arg(cv);
    }
    // Không có ảnh bìa mới → giữ nguyên mọi luồng (kể cả ảnh bìa đã nhúng sẵn)
    c.args(["-map", if cover.is_some() { "0:a" } else { "0" }]);
    if cover.is_some() {
        c.args(["-map", "1:v"]);
    }
    c.args(["-c", "copy", "-id3v2_version", "3", "-write_id3v1", "1"]);
    c.arg("-metadata").arg(format!("title={}", info.title));
    if !info.artist.is_empty() {
        c.arg("-metadata").arg(format!("artist={}", info.artist));
    }
    if !info.album.is_empty() {
        c.arg("-metadata").arg(format!("album={}", info.album));
    }
    if !info.year.is_empty() {
        c.arg("-metadata").arg(format!("date={}", info.year));
    }
    if cover.is_some() {
        c.args(["-metadata:s:v", "title=Album cover", "-metadata:s:v", "comment=Cover (front)"]);
    }
    c.arg(&out);
    let o = c.output().await.map_err(es)?;
    if !o.status.success() {
        let _ = tokio::fs::remove_file(&out).await;
        return Err(String::from_utf8_lossy(&o.stderr).trim().to_string());
    }
    tokio::fs::rename(&out, path).await.map_err(es)
}

#[tauri::command]
async fn start_download(app: AppHandle, state: State<'_, AppState>, req: DownloadReq) -> Result<(), String> {
    let (tx, rx) = oneshot::channel::<()>();
    state.jobs.lock().await.insert(req.id.clone(), tx);
    let app2 = app.clone();
    tokio::spawn(async move {
        let id = req.id.clone();
        let result = run_download(&app2, req, rx).await;
        let state = app2.state::<AppState>();
        state.jobs.lock().await.remove(&id);
        match result {
            Ok(Some((file, warn))) => emit(&app2, &id, "done", 100.0, "", "", &warn, Some(file)),
            Ok(None) => emit(&app2, &id, "cancelled", 0.0, "", "", "", None),
            Err(e) => emit(&app2, &id, "error", 0.0, "", "", &e, None),
        }
    });
    Ok(())
}

#[tauri::command]
async fn cancel_download(state: State<'_, AppState>, id: String) -> Result<(), String> {
    if let Some(tx) = state.jobs.lock().await.remove(&id) {
        let _ = tx.send(());
    }
    Ok(())
}

/// Kết thúc cả cây tiến trình (yt-dlp.exe sinh ra tiến trình con python/ffmpeg, kill thường không đủ).
async fn kill_tree(pid: Option<u32>) {
    let Some(pid) = pid else { return };
    let p = pid.to_string();
    #[cfg(windows)]
    {
        let mut c = Command::new("taskkill");
        c.args(["/PID", p.as_str(), "/T", "/F"]);
        c.stdin(Stdio::null());
        c.creation_flags(CREATE_NO_WINDOW);
        let _ = c.output().await;
    }
    #[cfg(not(windows))]
    {
        let _ = Command::new("pkill").args(["-KILL", "-P", p.as_str()]).output().await;
    }
}

/// Chạy một tác vụ nhưng dừng ngay (trả về None) nếu người dùng bấm huỷ.
async fn cancellable<T, F: std::future::Future<Output = T>>(rx: &mut oneshot::Receiver<()>, fut: F) -> Option<T> {
    tokio::pin!(fut);
    tokio::select! {
        r = &mut fut => Some(r),
        _ = &mut *rx => None,
    }
}

enum Exit {
    Cancelled,
    Finished { stderr: String },
}

/// Đọc từng dòng, chấp nhận byte không phải UTF-8 (tránh dừng giữa chừng trên Windows).
async fn for_each_line<R: tokio::io::AsyncRead + Unpin>(r: R, mut f: impl FnMut(String)) {
    let mut br = BufReader::new(r);
    let mut buf = Vec::new();
    loop {
        buf.clear();
        match br.read_until(b'\n', &mut buf).await {
            Ok(0) | Err(_) => break,
            Ok(_) => f(String::from_utf8_lossy(&buf).trim().to_string()),
        }
    }
}

async fn exec_ytdlp(app: &AppHandle, id: &str, args: &[String], rx: &mut oneshot::Receiver<()>) -> Result<Exit, String> {
    let mut child = make_cmd(app, "yt-dlp")
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("@ytdlp_run|{e}"))?;
    let pid = child.id();
    let stdout = child.stdout.take().ok_or("@ytdlp_io")?;
    let stderr = child.stderr.take().ok_or("@ytdlp_io")?;

    let err_task = tokio::spawn(async move {
        let mut lines = Vec::new();
        for_each_line(stderr, |l| lines.push(l)).await;
        lines.join("\n")
    });
    let (app_c, id_c) = (app.clone(), id.to_string());
    let out_task = tokio::spawn(async move {
        for_each_line(stdout, |raw| {
            let line = strip_ansi(&raw);
            if let Some(rest) = line.trim().strip_prefix("[PROG]") {
                let mut it = rest.split('|');
                let pct = it.next().unwrap_or("").trim().trim_end_matches('%').trim().parse::<f32>().unwrap_or(0.0);
                let speed = it.next().unwrap_or("").trim();
                let eta = it.next().unwrap_or("").trim();
                if pct >= 100.0 {
                    emit(&app_c, &id_c, "converting", 100.0, "", "", "", None);
                } else {
                    emit(&app_c, &id_c, "downloading", pct, speed, eta, "@m_downloading", None);
                }
            }
        })
        .await;
    });

    let status = tokio::select! {
        s = child.wait() => Some(s),
        _ = &mut *rx => {
            kill_tree(pid).await;
            let _ = child.kill().await;
            None
        }
    };
    if status.is_none() {
        // Huỷ: không chờ các luồng đọc, trả về ngay
        out_task.abort();
        err_task.abort();
        return Ok(Exit::Cancelled);
    }
    let _ = out_task.await;
    let stderr = err_task.await.unwrap_or_default();
    match status {
        None => Ok(Exit::Cancelled),
        Some(s) => {
            // Mã thoát 101 (đạt --max-downloads) hay lỗi ở bước gắn metadata đều xử lý qua việc kiểm tra tệp MP3
            s.map_err(es)?;
            Ok(Exit::Finished { stderr })
        }
    }
}

fn find_mp3(dir: &Path) -> Option<PathBuf> {
    std::fs::read_dir(dir)
        .ok()?
        .flatten()
        .filter(|e| e.path().extension().map(|x| x.eq_ignore_ascii_case("mp3")).unwrap_or(false))
        .max_by_key(|e| e.metadata().and_then(|m| m.modified()).ok())
        .map(|e| e.path())
}

/// Tải vào thư mục tạm riêng của từng bài rồi chuyển ra thư mục đích:
/// không phụ thuộc vào việc phân tích đường dẫn từ đầu ra của yt-dlp.
/// Trả về Ok(Some(path)) nếu thành công, Ok(None) nếu bị huỷ.
async fn run_download(app: &AppHandle, req: DownloadReq, mut rx: oneshot::Receiver<()>) -> Result<Option<(String, String)>, String> {
    let out_dir = if req.out_dir.trim().is_empty() { default_dir(app) } else { PathBuf::from(&req.out_dir) };
    std::fs::create_dir_all(&out_dir).map_err(|e| format!("@mkdir_out|{e}"))?;
    let tmp_dir = tmp_root(app).join(format!("job-{}", req.id.chars().take(8).collect::<String>()));
    std::fs::create_dir_all(&tmp_dir).map_err(|e| format!("@mkdir_tmp|{e}"))?;

    let result = download_into(app, &req, &tmp_dir, &mut rx).await;
    let moved = match result {
        Ok(Some((src, warn, artist))) => {
            let stem = src.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "audio".into());
            // Thư mục con theo nghệ sĩ (lấy nghệ sĩ đầu tiên nếu có nhiều người)
            let mut dir = out_dir.clone();
            if req.artist_folder {
                let sub = safe_name(artist.split(',').next().unwrap_or("").trim());
                if !sub.is_empty() {
                    dir = out_dir.join(sub);
                }
            }
            std::fs::create_dir_all(&dir).map_err(|e| format!("@mkdir_out|{e}"))?;
            let mut dest = dir.join(format!("{stem}.mp3"));
            let mut warn = warn;
            let mut skip = false;
            if dest.exists() {
                match req.dup.as_str() {
                    "skip" => {
                        skip = true;
                        warn = "@w_skipped".into();
                    }
                    "overwrite" => {
                        let _ = std::fs::remove_file(&dest);
                    }
                    _ => {
                        let mut n = 1;
                        while dest.exists() {
                            dest = dir.join(format!("{stem} ({n}).mp3"));
                            n += 1;
                        }
                    }
                }
            }
            if !skip && std::fs::rename(&src, &dest).is_err() {
                std::fs::copy(&src, &dest).map_err(|e| format!("@save_file|{e}")).map(|_| ())?;
            }
            Ok(Some((dest.to_string_lossy().to_string(), warn)))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e),
    };
    for _ in 0..6 {
        if std::fs::remove_dir_all(&tmp_dir).is_ok() || !tmp_dir.exists() {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }
    moved
}

fn url_encode(s: &str) -> String {
    let mut o = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => o.push(b as char),
            _ => o.push_str(&format!("%{b:02X}")),
        }
    }
    o
}

fn has_other_audio(dir: &Path) -> bool {
    std::fs::read_dir(dir)
        .map(|rd| {
            rd.flatten().any(|e| {
                e.path()
                    .extension()
                    .map(|x| ["m4a", "opus", "webm", "ogg", "wav", "aac", "mp4"].iter().any(|k| x.eq_ignore_ascii_case(k)))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

/// Các cách tải thay thế khi gặp HTTP 403 (đổi client YouTube, ép IPv4, thêm Referer cho TikTok).
fn variants_for(target: &str) -> Vec<Vec<String>> {
    let v = |a: &[&str]| a.iter().map(|x| x.to_string()).collect::<Vec<String>>();
    if target.contains("youtube.com") || target.contains("youtu.be") || target.starts_with("ytsearch") {
        vec![
            vec![],
            v(&["--extractor-args", "youtube:player_client=android_vr"]),
            v(&["--extractor-args", "youtube:player_client=tv"]),
            v(&["--extractor-args", "youtube:player_client=ios"]),
            v(&["--extractor-args", "youtube:player_client=mweb", "--force-ipv4"]),
        ]
    } else if target.contains("tiktok.com") {
        vec![vec![], v(&["--force-ipv4", "--add-header", "Referer:https://www.tiktok.com/"])]
    } else {
        vec![vec![], v(&["--force-ipv4"])]
    }
}

async fn download_into(app: &AppHandle, req: &DownloadReq, tmp_dir: &Path, rx: &mut oneshot::Receiver<()>) -> Result<Option<(PathBuf, String, String)>, String> {
    let id = req.id.clone();
    let mut artist_out = String::new();
    let is_spotify = detect_source(&req.url) == "spotify";
    let tmp_str = tmp_dir.to_string_lossy().replace('%', "%%");

    // Spotify: DRM nên không tải trực tiếp → lấy metadata từ Spotify rồi tìm bản âm thanh khớp trên YouTube Music / YouTube.
    let mut spotify: Option<TrackInfo> = None;
    // (đối tượng tải, bộ lọc thời lượng)
    let mut attempts: Vec<(String, Option<String>)> = Vec::new();
    let out_tpl: String;
    if is_spotify {
        emit(app, &id, "downloading", 0.0, "", "", "@m_spotify_read", None);
        let info = match req.info.clone() {
            Some(i) if !i.title.is_empty() => i,
            _ => match cancellable(rx, spotify_info(&req.url)).await {
                None => return Ok(None),
                Some(r) => r?,
            },
        };
        let plain = if info.artist.is_empty() { info.title.clone() } else { format!("{} {}", info.artist, info.title) };
        if info.duration > 20 {
            let filter = format!("duration>={} & duration<={}", info.duration - 10, info.duration + 10);
            attempts.push((format!("https://music.youtube.com/search?q={}", url_encode(&plain)), Some(filter.clone())));
            attempts.push((format!("ytsearch8:{plain} audio"), Some(filter)));
        }
        attempts.push((format!("ytsearch1:{plain} audio"), None));
        out_tpl = format!("{tmp_str}/{}.%(ext)s", named_stem(&info, true, &req.name_tpl));
        artist_out = info.artist.clone();
        spotify = Some(info);
    } else {
        // Đặt tên "Nghệ sĩ - Tên bài hát" nếu lấy được thông tin, nếu không thì dùng tiêu đề video
        let info = match req.info.clone() {
            Some(i) if !i.title.is_empty() => Some(i),
            _ => match cancellable(rx, load_info(app, &req.url)).await {
                None => return Ok(None),
                Some(r) => r.ok(),
            },
        };
        if let Some(i) = &info {
            artist_out = i.artist.clone();
        }
        out_tpl = match info {
            Some(i) if !i.title.is_empty() => format!("{tmp_str}/{}.%(ext)s", named_stem(&i, false, &req.name_tpl)),
            _ => format!("{tmp_str}/%(title).100s.%(ext)s"),
        };
        attempts.push((req.url.clone(), None));
    }

    let quality = match req.quality.as_str() {
        "320" | "256" | "192" | "128" => format!("{}K", req.quality),
        _ => "0".to_string(),
    };
    // Tuỳ chọn cốt lõi: chỉ cần tải và chuyển MP3
    let mut core: Vec<String> = vec![
        "-f".into(), "bestaudio/best".into(),
        "-x".into(), "--audio-format".into(), "mp3".into(),
        "--audio-quality".into(), quality,
        "--no-playlist".into(), "--no-warnings".into(),
        "--retries".into(), "10".into(), "--fragment-retries".into(), "10".into(),
        "--extractor-retries".into(), "3".into(),
        "-o".into(), out_tpl,
        "-q".into(), "--progress".into(), "--newline".into(),
        "--progress-template".into(),
        "download:[PROG]%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s".into(),
    ];
    if !req.speed_limit.trim().is_empty() {
        core.extend(["--limit-rate".into(), req.speed_limit.trim().to_string()]);
    }
    if !req.cookies_browser.trim().is_empty() {
        core.extend(["--cookies-from-browser".into(), req.cookies_browser.trim().to_string()]);
    }
    if !req.proxy.trim().is_empty() {
        core.extend(["--proxy".into(), req.proxy.trim().to_string()]);
    }
    // Tuỳ chọn thêm: metadata + ảnh bìa. Nếu phần này lỗi thì tải lại bản không có nó.
    let mut extras: Vec<String> = vec!["--embed-metadata".into()];
    if !is_spotify {
        extras.extend(["--embed-thumbnail".into(), "--convert-thumbnails".into(), "jpg".into()]);
        if req.crop_thumb {
            extras.extend([
                "--ppa".into(),
                r#"ThumbnailsConvertor+FFmpeg_o:-c:v mjpeg -vf crop="'if(gt(ih,iw),iw,ih)':'if(gt(iw,ih),ih,iw)'""#.into(),
            ]);
        }
    }

    let mut last_err = String::new();
    let mut file: Option<PathBuf> = None;
    'outer: for (target, filter) in &attempts {
        let variants = variants_for(target);
        let (mut vi, mut full) = (0usize, true);
        loop {
            if is_spotify && vi == 0 && full {
                emit(app, &id, "downloading", 0.0, "", "", "@m_searching", None);
            } else if vi > 0 {
                emit(app, &id, "downloading", 0.0, "", "", "@m_retry", None);
            }
            let mut args = core.clone();
            if full {
                args.extend(extras.clone());
            }
            args.extend(variants[vi].clone());
            if let Some(f) = filter {
                args.extend(["--match-filter".into(), f.clone(), "--max-downloads".into(), "1".into()]);
            }
            if target.contains("/search?") {
                args.extend(["--playlist-items".into(), "1-8".into()]);
            }
            args.push(target.clone());
            match exec_ytdlp(app, &id, &args, rx).await? {
                Exit::Cancelled => return Ok(None),
                Exit::Finished { stderr } => {
                    // Có tệp MP3 là coi như thành công, kể cả khi yt-dlp báo lỗi ở bước gắn ảnh/metadata
                    if let Some(f) = find_mp3(tmp_dir) {
                        file = Some(f);
                        break 'outer;
                    }
                    if !stderr.trim().is_empty() {
                        last_err = clean_error(&stderr);
                    }
                    let low = stderr.to_lowercase();
                    let forbidden = low.contains("403") || low.contains("forbidden") || low.contains("unable to download video data");
                    let embed_problem = ["thumbnail", "metadata", "postprocess", "embed"].iter().any(|k| low.contains(k));
                    if full && embed_problem && !forbidden {
                        full = false;
                        continue;
                    }
                    if forbidden && vi + 1 < variants.len() {
                        vi += 1;
                        continue;
                    }
                    break;
                }
            }
        }
    }
    let file = file.ok_or_else(|| {
        if last_err.is_empty() {
            if has_other_audio(tmp_dir) {
                "@mp3_failed".to_string()
            } else if is_spotify {
                "@spotify_no_match".to_string()
            } else {
                "@ytdlp_no_output".to_string()
            }
        } else {
            last_err
        }
    })?;

    // Metadata Spotify: có thì gắn, lỗi thì bỏ qua (tệp vẫn được giữ, chỉ kèm ghi chú)
    let mut warn = String::new();
    if rx.try_recv().is_ok() {
        return Ok(None);
    }
    if let Some(info) = spotify {
        emit(app, &id, "tagging", 100.0, "", "", "@m_tagging", None);
        let cover = if info.thumbnail.is_empty() { None } else { fetch_cover(&info.thumbnail, tmp_dir).await };
        if !info.thumbnail.is_empty() && cover.is_none() {
            warn = "@w_cover_download".into();
        }
        let mut r = tag_with_ffmpeg(app, &file, &info, cover.as_deref()).await;
        if r.is_err() && cover.is_some() {
            r = tag_with_ffmpeg(app, &file, &info, None).await;
            warn = "@w_cover_embed".into();
        }
        if r.is_err() {
            warn = "@w_tags".into();
        }
    } else if req.edited {
        // Người dùng đã sửa thông tin bài hát → ghi đè thẻ ID3 (giữ nguyên ảnh bìa có sẵn)
        if let Some(info) = req.info.clone() {
            emit(app, &id, "tagging", 100.0, "", "", "@m_tagging", None);
            if tag_with_ffmpeg(app, &file, &info, None).await.is_err() {
                warn = "@w_tags".into();
            }
        }
    }
    Ok(Some((file, warn, artist_out)))
}

// ───────────────────────── Tìm kiếm & playlist ─────────────────────────

#[derive(Serialize)]
struct SearchItem {
    id: String,
    url: String,
    title: String,
    channel: String,
    duration: u64,
    thumbnail: String,
}

#[derive(Serialize)]
struct PlaylistData {
    title: String,
    entries: Vec<SearchItem>,
}

fn parse_entries(v: &Value) -> Vec<SearchItem> {
    let Some(arr) = v.get("entries").and_then(|e| e.as_array()) else { return Vec::new() };
    arr.iter()
        .filter_map(|e| {
            let id = e.get("id")?.as_str()?.to_string();
            let title = e.get("title").and_then(|x| x.as_str()).unwrap_or("").to_string();
            if title.is_empty() || title == "[Private video]" || title == "[Deleted video]" {
                return None;
            }
            let channel = ["channel", "uploader", "artist"]
                .iter()
                .find_map(|k| e.get(*k).and_then(|x| x.as_str()).filter(|s| !s.is_empty()))
                .unwrap_or("")
                .to_string();
            let duration = e.get("duration").and_then(|x| x.as_f64()).unwrap_or(0.0) as u64;
            let url = e
                .get("url")
                .and_then(|x| x.as_str())
                .filter(|u| u.starts_with("http"))
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("https://www.youtube.com/watch?v={id}"));
            let thumbnail = format!("https://i.ytimg.com/vi/{id}/mqdefault.jpg");
            Some(SearchItem { id, url, title, channel, duration, thumbnail })
        })
        .collect()
}

async fn ytdlp_json(app: &AppHandle, args: &[&str]) -> Result<Value, String> {
    let out = make_cmd(app, "yt-dlp").args(args).output().await.map_err(|e| format!("@ytdlp_run|{e}"))?;
    if !out.status.success() {
        return Err(clean_error(&String::from_utf8_lossy(&out.stderr)));
    }
    serde_json::from_str(&String::from_utf8_lossy(&out.stdout)).map_err(es)
}

/// Tìm bài hát theo tên trên YouTube (10 kết quả đầu).
#[tauri::command]
async fn search_tracks(app: AppHandle, query: String) -> Result<Vec<SearchItem>, String> {
    let q = format!("ytsearch10:{}", query.trim());
    let v = ytdlp_json(&app, &["-J", "--flat-playlist", "--no-warnings", q.as_str()]).await?;
    Ok(parse_entries(&v))
}

/// Đọc danh sách bài trong một playlist (tối đa 300 bài).
#[tauri::command]
async fn fetch_playlist(app: AppHandle, url: String) -> Result<PlaylistData, String> {
    let url = url.trim().to_string();
    if !url.starts_with("http") {
        return Err("@url_invalid".into());
    }
    let v = ytdlp_json(&app, &["-J", "--flat-playlist", "--no-warnings", "--playlist-end", "300", url.as_str()]).await?;
    let title = v.get("title").and_then(|x| x.as_str()).unwrap_or("").to_string();
    Ok(PlaylistData { title, entries: parse_entries(&v) })
}

/// Xoá một tệp MP3 đã tải (chỉ chấp nhận đuôi .mp3 để tránh xoá nhầm).
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.extension().map(|x| x.eq_ignore_ascii_case("mp3")).unwrap_or(false) {
        return Err("@delete_failed|not an mp3".into());
    }
    std::fs::remove_file(&p).map_err(|e| format!("@delete_failed|{e}"))
}

// ───────────────────────── Tiện ích ─────────────────────────

#[tauri::command]
fn default_output_dir(app: AppHandle) -> String {
    let dir = default_dir(&app);
    let _ = std::fs::create_dir_all(&dir);
    dir.to_string_lossy().to_string()
}

#[tauri::command]
fn read_clipboard() -> Result<String, String> {
    arboard::Clipboard::new().map_err(es)?.get_text().map_err(es)
}

#[tauri::command]
fn reveal_file(path: String) -> Result<(), String> {
    tauri_plugin_opener::reveal_item_in_dir(path).map_err(es)
}

#[tauri::command]
fn open_folder(app: AppHandle, path: String) -> Result<(), String> {
    app.opener().open_path(path, None::<&str>).map_err(es)
}

// ───────────────────────── Cửa sổ khi mở app ─────────────────────────

/// Tuỳ chọn cửa sổ lưu trong app_config_dir/window.json.
/// mode: "remember" (nhớ kích thước lần trước) | "maximized" (luôn phóng to tối đa).
#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
struct WinPrefs {
    mode: String,
    width: f64,
    height: f64,
    maximized: bool,
}

impl Default for WinPrefs {
    fn default() -> Self {
        Self { mode: "remember".into(), width: 1000.0, height: 720.0, maximized: false }
    }
}

struct WinState {
    prefs: StdMutex<WinPrefs>,
}

fn prefs_path(app: &AppHandle) -> PathBuf {
    app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir()).join("window.json")
}

fn load_prefs(app: &AppHandle) -> WinPrefs {
    std::fs::read_to_string(prefs_path(app))
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

fn save_prefs(app: &AppHandle, p: &WinPrefs) {
    let path = prefs_path(app);
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(text) = serde_json::to_string_pretty(p) {
        let _ = std::fs::write(path, text);
    }
}

/// Ghi nhận kích thước (không tính khi thu nhỏ / phóng to / toàn màn hình) để lưu lúc đóng app.
fn track_window(window: &tauri::Window) {
    let Some(state) = window.try_state::<WinState>() else { return };
    if window.is_minimized().unwrap_or(false) {
        return;
    }
    let maximized = window.is_maximized().unwrap_or(false);
    let mut p = state.prefs.lock().unwrap_or_else(|e| e.into_inner());
    p.maximized = maximized;
    if !maximized && !window.is_fullscreen().unwrap_or(false) {
        if let (Ok(size), Ok(scale)) = (window.inner_size(), window.scale_factor()) {
            let l = size.to_logical::<f64>(scale);
            if l.width >= 300.0 && l.height >= 300.0 {
                p.width = l.width;
                p.height = l.height;
            }
        }
    }
}

#[tauri::command]
fn get_window_mode(state: State<'_, WinState>) -> String {
    state.prefs.lock().unwrap_or_else(|e| e.into_inner()).mode.clone()
}

#[tauri::command]
fn set_window_mode(app: AppHandle, state: State<'_, WinState>, mode: String) -> Result<(), String> {
    if mode != "remember" && mode != "maximized" {
        return Err("@bad_mode".into());
    }
    let mut p = state.prefs.lock().unwrap_or_else(|e| e.into_inner());
    p.mode = mode;
    save_prefs(&app, &p);
    Ok(())
}

/// Cửa sổ được tạo ẩn; giao diện gọi lệnh này sau khi vẽ xong để tránh nháy trắng.
#[tauri::command]
fn show_main(window: tauri::WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

// ───────────────────────── Di chuyển dữ liệu từ identifier cũ ─────────────────────────

const LEGACY_ID: &str = "com.myproject.mp3downloader";

fn legacy_sibling(p: &Path) -> Option<PathBuf> {
    let old = p.parent()?.join(LEGACY_ID);
    old.exists().then_some(old)
}

fn copy_dir(src: &Path, dst: &Path) {
    if std::fs::create_dir_all(dst).is_err() {
        return;
    }
    if let Ok(rd) = std::fs::read_dir(src) {
        for e in rd.flatten() {
            let (p, t) = (e.path(), dst.join(e.file_name()));
            if p.is_dir() {
                copy_dir(&p, &t);
            } else if !t.exists() {
                let _ = std::fs::copy(&p, &t);
            }
        }
    }
}

/// Giữ lại công cụ đã tải (yt-dlp, ffmpeg, Deno) và tuỳ chọn cửa sổ từ bản cũ để người dùng không phải cài lại.
fn migrate_legacy(app: &AppHandle) {
    if let Ok(new_local) = app.path().app_local_data_dir() {
        if !new_local.join("bin").exists() {
            if let Some(old) = legacy_sibling(&new_local) {
                if old.join("bin").exists() {
                    copy_dir(&old.join("bin"), &new_local.join("bin"));
                }
            }
        }
    }
    if let Ok(new_cfg) = app.path().app_config_dir() {
        let f = new_cfg.join("window.json");
        if !f.exists() {
            if let Some(old) = legacy_sibling(&new_cfg) {
                let of = old.join("window.json");
                if of.exists() {
                    let _ = std::fs::create_dir_all(&new_cfg);
                    let _ = std::fs::copy(of, f);
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();
    // Chỉ cho chạy một cửa sổ: mở lần hai sẽ đưa cửa sổ đang chạy lên trước
    // (đồng thời tránh việc bản thứ hai dọn mất tệp tạm của bản thứ nhất).
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }));
    }
    builder
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            // Dọn các tệp tải dở còn sót từ lần chạy trước
            let _ = std::fs::remove_dir_all(tmp_root(&handle));
            migrate_legacy(&handle);

            let prefs = load_prefs(&handle);
            app.manage(WinState { prefs: StdMutex::new(prefs.clone()) });
            if let Some(w) = app.get_webview_window("main") {
                if prefs.mode == "maximized" {
                    let _ = w.maximize();
                } else {
                    if prefs.width >= 300.0 && prefs.height >= 300.0 {
                        let _ = w.set_size(LogicalSize::new(prefs.width, prefs.height));
                        let _ = w.center();
                    }
                    if prefs.maximized {
                        let _ = w.maximize();
                    }
                }
                // Dự phòng: nếu giao diện không gọi show_main thì vẫn hiện cửa sổ sau 3 giây
                let w2 = w.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_secs(3));
                    let _ = w2.show();
                });
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            match event {
                tauri::WindowEvent::Resized(_) => track_window(window),
                tauri::WindowEvent::CloseRequested { .. } => {
                    track_window(window);
                    if let Some(state) = window.try_state::<WinState>() {
                        let p = state.prefs.lock().unwrap_or_else(|e| e.into_inner()).clone();
                        save_prefs(window.app_handle(), &p);
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            check_tools,
            install_ytdlp,
            install_ffmpeg,
            install_deno,
            check_ytdlp_update,
            search_tracks,
            fetch_playlist,
            delete_file,
            fetch_info,
            start_download,
            cancel_download,
            default_output_dir,
            reveal_file,
            open_folder,
            read_clipboard,
            get_window_mode,
            set_window_mode,
            show_main
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Tauri application");
}
