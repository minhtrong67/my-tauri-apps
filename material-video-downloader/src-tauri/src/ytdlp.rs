//! yt-dlp integration: engine discovery/installation, media analysis and downloading
//! for the hundreds of sites that yt-dlp supports.

use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde_json::Value;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

use crate::manager::{Control, Manager};
use crate::models::*;
use crate::util::*;

pub fn bin_dir(m: &Manager) -> PathBuf {
    m.data_dir.join("bin")
}

fn exe(name: &str) -> String {
    if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    }
}

fn resolve_tool(m: &Manager, custom: &str, name: &str) -> Option<PathBuf> {
    if !custom.trim().is_empty() {
        let p = PathBuf::from(custom.trim());
        if p.is_file() {
            return Some(p);
        }
    }
    let managed = bin_dir(m).join(exe(name));
    if managed.is_file() {
        return Some(managed);
    }
    which(name)
}

pub fn ytdlp_path(m: &Manager) -> Option<PathBuf> {
    resolve_tool(m, &m.settings().ytdlp_path, "yt-dlp")
}

pub fn ffmpeg_path(m: &Manager) -> Option<PathBuf> {
    resolve_tool(m, &m.settings().ffmpeg_path, "ffmpeg")
}

fn command(path: &Path) -> Command {
    let mut cmd = Command::new(path);
    cmd.stdin(Stdio::null()).kill_on_drop(true);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

async fn version_of(path: &Path, arg: &str) -> Option<String> {
    let out = tokio::time::timeout(Duration::from_secs(10), command(path).arg(arg).output())
        .await
        .ok()?
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout).to_string();
    let line = text.lines().next()?.trim().to_string();
    if line.is_empty() {
        None
    } else if arg == "-version" {
        // "ffmpeg version 7.1 Copyright ..." -> "7.1"
        Some(line.split_whitespace().nth(2).unwrap_or(&line).to_string())
    } else {
        Some(line)
    }
}

pub async fn engine_status(m: &Arc<Manager>) -> EngineStatus {
    let managed_dir = bin_dir(m);
    let y = ytdlp_path(m);
    let f = ffmpeg_path(m);
    let ytdlp = match &y {
        Some(p) => EngineTool {
            found: true,
            path: Some(p.to_string_lossy().to_string()),
            version: version_of(p, "--version").await,
            managed: p.starts_with(&managed_dir),
        },
        None => EngineTool::default(),
    };
    let ffmpeg = match &f {
        Some(p) => EngineTool {
            found: true,
            path: Some(p.to_string_lossy().to_string()),
            version: version_of(p, "-version").await,
            managed: p.starts_with(&managed_dir),
        },
        None => EngineTool::default(),
    };
    EngineStatus { ytdlp, ffmpeg, can_install_ffmpeg: cfg!(windows) }
}

// ---------------------------------------------------------------- installing

async fn download_to(m: &Arc<Manager>, url: &str, dest: &Path, name: &str) -> Result<(), String> {
    let resp = m
        .http
        .get(url)
        .header(reqwest::header::USER_AGENT, DEFAULT_UA)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Download failed (HTTP {}).", resp.status().as_u16()));
    }
    let total = resp.content_length().unwrap_or(0);
    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }
    let tmp = dest.with_extension("download");
    let mut file = tokio::fs::File::create(&tmp).await.map_err(|e| e.to_string())?;
    let mut stream = resp.bytes_stream();
    let mut downloaded = 0u64;
    let mut last = Instant::now();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        if last.elapsed() > Duration::from_millis(150) {
            last = Instant::now();
            let _ = m.app.emit(
                "engine-progress",
                EngineProgress { name: name.into(), downloaded, total, done: false },
            );
        }
    }
    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);
    tokio::fs::rename(&tmp, dest).await.map_err(|e| e.to_string())?;
    let _ = m.app.emit(
        "engine-progress",
        EngineProgress { name: name.into(), downloaded, total: total.max(downloaded), done: true },
    );
    Ok(())
}

#[cfg(unix)]
fn make_executable(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(meta) = std::fs::metadata(path) {
        let mut perms = meta.permissions();
        perms.set_mode(0o755);
        let _ = std::fs::set_permissions(path, perms);
    }
}

#[cfg(not(unix))]
fn make_executable(_path: &Path) {}

pub async fn install_ytdlp(m: &Arc<Manager>) -> Result<(), String> {
    let asset = if cfg!(windows) {
        "yt-dlp.exe"
    } else if cfg!(target_os = "macos") {
        "yt-dlp_macos"
    } else if std::env::consts::ARCH == "aarch64" {
        "yt-dlp_linux_aarch64"
    } else {
        "yt-dlp_linux"
    };
    let url = format!("https://github.com/yt-dlp/yt-dlp/releases/latest/download/{asset}");
    let dest = bin_dir(m).join(exe("yt-dlp"));
    download_to(m, &url, &dest, "yt-dlp").await?;
    make_executable(&dest);
    Ok(())
}

pub async fn install_ffmpeg(m: &Arc<Manager>) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("Automatic ffmpeg setup is only available on Windows. Install it with your package manager (for example `brew install ffmpeg` or `sudo apt install ffmpeg`).".into());
    }
    let url = "https://github.com/yt-dlp/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip";
    let zip_path = bin_dir(m).join("ffmpeg.zip");
    download_to(m, url, &zip_path, "ffmpeg").await?;
    let dest = bin_dir(m).join(exe("ffmpeg"));
    let zip_clone = zip_path.clone();
    let dest_clone = dest.clone();
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let file = std::fs::File::open(&zip_clone).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
        for i in 0..archive.len() {
            let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
            let name = entry.name().replace('\\', "/");
            if name.ends_with("/bin/ffmpeg.exe") {
                let mut out = std::fs::File::create(&dest_clone).map_err(|e| e.to_string())?;
                std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
                return Ok(());
            }
        }
        Err("ffmpeg.exe was not found in the downloaded archive.".into())
    })
    .await
    .map_err(|e| e.to_string())??;
    let _ = tokio::fs::remove_file(&zip_path).await;
    Ok(())
}

// ------------------------------------------------------------------ analysis

fn common_args(m: &Manager, referer: Option<&str>, ua: Option<&str>) -> Vec<String> {
    let s = m.settings();
    let mut a: Vec<String> = Vec::new();
    if s.cookies_browser != "none" && !s.cookies_browser.is_empty() {
        a.push("--cookies-from-browser".into());
        a.push(s.cookies_browser.clone());
    }
    if let Some(r) = referer.filter(|r| !r.is_empty()) {
        a.push("--add-header".into());
        a.push(format!("Referer:{r}"));
    }
    if let Some(u) = ua.filter(|u| !u.is_empty()) {
        a.push("--user-agent".into());
        a.push(u.to_string());
    }
    if let Some(ff) = ffmpeg_path(m) {
        a.push("--ffmpeg-location".into());
        a.push(ff.to_string_lossy().to_string());
    }
    a
}

fn codec_family(vcodec: &str) -> &'static str {
    let v = vcodec.to_lowercase();
    if v.starts_with("avc") || v.starts_with("h264") {
        "H.264"
    } else if v.starts_with("vp9") || v.starts_with("vp09") {
        "VP9"
    } else if v.starts_with("av01") || v.starts_with("av1") {
        "AV1"
    } else if v.starts_with("hev") || v.starts_with("hvc") || v.starts_with("h265") {
        "HEVC"
    } else {
        ""
    }
}

fn fsize(f: &Value) -> Option<u64> {
    f.get("filesize")
        .and_then(|v| v.as_f64())
        .or_else(|| f.get("filesize_approx").and_then(|v| v.as_f64()))
        .map(|v| v as u64)
        .filter(|v| *v > 0)
}

fn is_video(f: &Value) -> bool {
    let v = f.get("vcodec").and_then(|v| v.as_str()).unwrap_or("none");
    v != "none" && f.get("height").and_then(|h| h.as_u64()).unwrap_or(0) > 0
}

fn is_audio_only(f: &Value) -> bool {
    let v = f.get("vcodec").and_then(|v| v.as_str()).unwrap_or("none");
    let a = f.get("acodec").and_then(|v| v.as_str()).unwrap_or("none");
    v == "none" && a != "none"
}

fn is_combined(f: &Value) -> bool {
    let a = f.get("acodec").and_then(|v| v.as_str()).unwrap_or("none");
    is_video(f) && a != "none"
}

pub async fn info(
    m: &Arc<Manager>,
    url: &str,
    referer: Option<&str>,
    ua: Option<&str>,
) -> Result<MediaInfo, String> {
    let bin = ytdlp_path(m).ok_or_else(|| "ENGINE_MISSING".to_string())?;
    let has_ffmpeg = ffmpeg_path(m).is_some();
    let mut cmd = command(&bin);
    cmd.args(["-J", "--no-playlist", "--no-warnings", "--no-colors", "--skip-download", "--socket-timeout", "20"]);
    cmd.args(common_args(m, referer, ua));
    cmd.arg(url);
    let out = tokio::time::timeout(Duration::from_secs(90), cmd.output())
        .await
        .map_err(|_| "Timed out while reading the video page.".to_string())?
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        let line = err
            .lines()
            .rev()
            .find(|l| l.contains("ERROR"))
            .unwrap_or("This link is not supported or the video is unavailable.");
        return Err(line.replace("ERROR:", "").trim().to_string());
    }
    let mut v: Value = serde_json::from_slice(&out.stdout).map_err(|e| e.to_string())?;
    if v.get("_type").and_then(|t| t.as_str()) == Some("playlist") {
        let first = v
            .get("entries")
            .and_then(|e| e.as_array())
            .and_then(|a| a.iter().find(|x| !x.is_null()))
            .cloned();
        v = first.ok_or_else(|| "No downloadable video was found at this link.".to_string())?;
    }

    let title = v.get("title").and_then(|t| t.as_str()).unwrap_or("video").to_string();
    let formats: Vec<Value> = v.get("formats").and_then(|f| f.as_array()).cloned().unwrap_or_default();
    let best_audio_size = formats.iter().filter(|f| is_audio_only(f)).filter_map(fsize).max();

    let mut heights: Vec<u64> = formats
        .iter()
        .filter(|f| is_video(f))
        .filter_map(|f| f.get("height").and_then(|h| h.as_u64()))
        .collect();
    heights.sort_unstable_by(|a, b| b.cmp(a));
    heights.dedup();

    let mut options: Vec<QualityOption> = Vec::new();
    for h in heights.iter().copied() {
        let at: Vec<&Value> = formats
            .iter()
            .filter(|f| is_video(f) && f.get("height").and_then(|x| x.as_u64()) == Some(h))
            .collect();
        if !has_ffmpeg && !at.iter().any(|f| is_combined(f)) {
            continue;
        }
        let fps = at.iter().filter_map(|f| f.get("fps").and_then(|x| x.as_f64())).fold(0.0, f64::max);
        let video_size = at.iter().filter_map(|f| fsize(f)).max();
        let size = match (has_ffmpeg, video_size) {
            (true, Some(vs)) => Some(vs + best_audio_size.unwrap_or(0)),
            (false, Some(vs)) => Some(vs),
            _ => None,
        };
        let preferred = at
            .iter()
            .find(|f| codec_family(f.get("vcodec").and_then(|c| c.as_str()).unwrap_or("")) == "H.264")
            .or_else(|| at.first())
            .copied();
        let detail = preferred
            .map(|f| codec_family(f.get("vcodec").and_then(|c| c.as_str()).unwrap_or("")).to_string())
            .unwrap_or_default();
        let label = if fps >= 50.0 { format!("{h}p{}", fps.round() as u32) } else { format!("{h}p") };
        let selector = if has_ffmpeg {
            format!("bv*[height<={h}]+ba/b[height<={h}]/b")
        } else {
            format!("b[height<={h}]/b")
        };
        options.push(QualityOption {
            id: format!("v{h}"),
            label,
            detail,
            selector,
            audio_only: false,
            audio_format: String::new(),
            height: h as u32,
            size,
        });
    }

    let best_selector = if has_ffmpeg { "bv*+ba/b" } else { "b" }.to_string();
    let best_size = options.first().and_then(|o| o.size);
    let mut all = vec![QualityOption {
        id: "best".into(),
        label: "best".into(),
        detail: options.first().map(|o| o.label.clone()).unwrap_or_default(),
        selector: best_selector,
        audio_only: false,
        audio_format: String::new(),
        height: options.first().map(|o| o.height).unwrap_or(0),
        size: best_size,
    }];
    all.extend(options);
    if has_ffmpeg {
        all.push(QualityOption {
            id: "audio-mp3".into(),
            label: "MP3".into(),
            detail: "audio".into(),
            selector: "ba/b".into(),
            audio_only: true,
            audio_format: "mp3".into(),
            height: 0,
            size: best_audio_size,
        });
    }
    all.push(QualityOption {
        id: "audio-m4a".into(),
        label: "M4A".into(),
        detail: "audio".into(),
        selector: "ba[ext=m4a]/ba/b".into(),
        audio_only: true,
        audio_format: "m4a".into(),
        height: 0,
        size: best_audio_size,
    });

    let site = v
        .get("extractor_key")
        .and_then(|s| s.as_str())
        .or_else(|| v.get("webpage_url_domain").and_then(|s| s.as_str()))
        .unwrap_or("")
        .to_string();

    Ok(MediaInfo {
        kind: Kind::Ytdlp,
        url: url.to_string(),
        filename: format!("{}.mp4", sanitize(&title)),
        title,
        thumbnail: v.get("thumbnail").and_then(|t| t.as_str()).map(|s| s.to_string()),
        site,
        duration: v.get("duration").and_then(|d| d.as_f64()),
        uploader: v
            .get("uploader")
            .and_then(|s| s.as_str())
            .or_else(|| v.get("channel").and_then(|s| s.as_str()))
            .map(|s| s.to_string()),
        size: best_size,
        options: all,
        referer: referer.map(|s| s.to_string()),
        user_agent: ua.map(|s| s.to_string()),
        cookie: None,
    })
}

// ------------------------------------------------------------------- running

fn parse_num<T: std::str::FromStr>(s: Option<&&str>) -> Option<T> {
    s.and_then(|v| v.trim().parse::<T>().ok())
}

pub async fn run(m: &Arc<Manager>, id: &str, ctl: &Arc<Control>) -> Result<(), Stop> {
    let d = m.get(id).ok_or(Stop::Canceled)?;
    let bin = ytdlp_path(m).ok_or_else(|| Stop::Failed("ENGINE_MISSING".into()))?;
    let settings = m.settings();
    let has_ffmpeg = ffmpeg_path(m).is_some();
    let dir = PathBuf::from(&d.dir);
    tokio::fs::create_dir_all(&dir).await?;
    let stem = stem_of(&d.filename);
    let path_file = m.data_dir.join(format!("{}.path", d.id));
    let _ = tokio::fs::remove_file(&path_file).await;

    let esc = |s: &str| s.replace('%', "%%");
    let out_template = format!("{}{}{}.%(ext)s", esc(&d.dir), std::path::MAIN_SEPARATOR, esc(&stem));

    let selector = if !d.selector.is_empty() {
        d.selector.clone()
    } else if has_ffmpeg {
        "bv*+ba/b".to_string()
    } else {
        "b".to_string()
    };

    let mut args: Vec<String> = vec![
        "--newline".into(),
        "--no-playlist".into(),
        "--no-warnings".into(),
        "--no-colors".into(),
        "--windows-filenames".into(),
        "--no-mtime".into(),
        "--retries".into(),
        "10".into(),
        "--fragment-retries".into(),
        "10".into(),
        "--concurrent-fragments".into(),
        settings.connections.clamp(1, 8).to_string(),
        "--progress".into(),
        "--progress-template".into(),
        "download:MVD|%(progress.status)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s".into(),
        "--print-to-file".into(),
        "after_move:filepath".into(),
        path_file.to_string_lossy().to_string(),
        "-f".into(),
        selector.clone(),
        "-o".into(),
        out_template,
    ];
    if d.audio_only {
        if d.audio_format == "mp3" {
            args.extend(["-x", "--audio-format", "mp3", "--audio-quality", "0"].map(String::from));
        }
    } else if has_ffmpeg {
        args.extend(["--merge-output-format", "mp4"].map(String::from));
    }
    if settings.speed_limit_kb > 0 {
        args.push("--limit-rate".into());
        args.push(format!("{}K", settings.speed_limit_kb));
    }
    args.extend(common_args(m, d.referer.as_deref(), d.user_agent.as_deref()));
    args.push(d.url.clone());

    let mut child = command(&bin)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| Stop::Failed(format!("Could not start yt-dlp: {e}")))?;
    let pid = child.id();
    let stdout = child.stdout.take().ok_or_else(|| Stop::Failed("No output from yt-dlp".into()))?;
    let stderr = child.stderr.take().ok_or_else(|| Stop::Failed("No output from yt-dlp".into()))?;

    let errors: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    {
        let errors = errors.clone();
        tokio::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if line.contains("ERROR") {
                    errors.lock().unwrap_or_else(|e| e.into_inner()).push(line);
                }
            }
        });
    }

    let expected_stages = if !d.audio_only && has_ffmpeg && selector.contains('+') { 2 } else { 1 };
    let mut stage = 0usize;
    let mut prev_bytes = 0u64;
    let mut prev_total = 0u64;
    let mut last_emit = Instant::now() - Duration::from_secs(1);
    let mut lines = BufReader::new(stdout).lines();
    let mut tick = tokio::time::interval(Duration::from_millis(250));

    loop {
        tokio::select! {
            line = lines.next_line() => {
                let Ok(Some(line)) = line else { break };
                if let Some(rest) = line.strip_prefix("MVD|") {
                    let parts: Vec<&str> = rest.split('|').collect();
                    let status = parts.first().copied().unwrap_or("");
                    let cur: u64 = parse_num(parts.get(1)).unwrap_or(0);
                    let total: u64 = parse_num::<u64>(parts.get(2))
                        .or_else(|| parse_num::<f64>(parts.get(3)).map(|f| f as u64))
                        .unwrap_or(0);
                    let speed: f64 = parse_num(parts.get(4)).unwrap_or(0.0);
                    let eta: Option<u64> = parse_num::<f64>(parts.get(5)).map(|e| e as u64);
                    let frac = if total > 0 { (cur as f64 / total as f64).clamp(0.0, 1.0) } else { 0.0 };
                    let progress = if expected_stages == 2 {
                        if stage == 0 { frac * 85.0 } else { 85.0 + frac * 15.0 }
                    } else {
                        frac * 100.0
                    };
                    if status == "finished" {
                        if expected_stages == 2 && stage == 0 {
                            stage = 1;
                            prev_bytes = cur.max(total);
                            prev_total = prev_bytes;
                        }
                        continue;
                    }
                    if last_emit.elapsed() >= Duration::from_millis(300) {
                        last_emit = Instant::now();
                        m.update(id, |x| {
                            if x.status == Status::Downloading {
                                x.downloaded = prev_bytes + cur;
                                x.total = prev_total + total;
                                x.progress = progress.min(99.5);
                                x.speed = speed;
                                x.eta = eta;
                            }
                        });
                    }
                } else if line.starts_with("[Merger]")
                    || line.starts_with("[ExtractAudio]")
                    || line.starts_with("[VideoConvertor]")
                    || line.starts_with("[Fixup")
                    || line.starts_with("[Metadata]")
                {
                    m.update(id, |x| {
                        x.status = Status::Merging;
                        x.progress = 99.5;
                        x.speed = 0.0;
                        x.eta = None;
                    });
                }
            }
            _ = tick.tick() => {
                if let Err(stop) = ctl.check() {
                    if let Some(pid) = pid { kill_tree(pid); }
                    let _ = child.start_kill();
                    let _ = child.wait().await;
                    return Err(stop);
                }
            }
        }
    }

    let status = child.wait().await.map_err(|e| Stop::Failed(e.to_string()))?;
    ctl.check()?;
    if !status.success() {
        let msg = errors
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .last()
            .cloned()
            .unwrap_or_else(|| "yt-dlp stopped unexpectedly.".into());
        let msg = msg.replace("ERROR:", "").trim().to_string();
        let _ = tokio::fs::remove_file(&path_file).await;
        return Err(Stop::Failed(msg));
    }

    let recorded = tokio::fs::read_to_string(&path_file)
        .await
        .ok()
        .and_then(|s| s.lines().rev().find(|l| !l.trim().is_empty()).map(|l| l.trim().to_string()));
    let _ = tokio::fs::remove_file(&path_file).await;
    let final_path = match recorded {
        Some(p) if Path::new(&p).exists() => PathBuf::from(p),
        _ => find_by_stem(&dir, &stem).ok_or_else(|| Stop::Failed("The finished file could not be found.".into()))?,
    };
    let size = tokio::fs::metadata(&final_path).await.map(|x| x.len()).unwrap_or(0);
    let name = final_path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or(d.filename.clone());
    let path_str = final_path.to_string_lossy().to_string();
    m.update(id, |x| {
        x.filename = name;
        x.path = Some(path_str);
        x.total = size;
        x.downloaded = size;
    });
    Ok(())
}

fn find_by_stem(dir: &Path, stem: &str) -> Option<PathBuf> {
    let prefix = format!("{stem}.");
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    for entry in std::fs::read_dir(dir).ok()?.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&prefix) && !name.ends_with(".part") && !name.ends_with(".ytdl") {
            let modified = entry.metadata().and_then(|m| m.modified()).unwrap_or(std::time::UNIX_EPOCH);
            if best.as_ref().map(|(t, _)| modified > *t).unwrap_or(true) {
                best = Some((modified, entry.path()));
            }
        }
    }
    best.map(|(_, p)| p)
}

/// Remove yt-dlp leftovers (`.part`, `.ytdl`, intermediate `.f137.mp4` streams).
pub fn cleanup_partials(dir: &Path, stem: &str) {
    let prefix = format!("{stem}.");
    let Ok(rd) = std::fs::read_dir(dir) else { return };
    for entry in rd.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if let Some(rest) = name.strip_prefix(&prefix) {
            let intermediate = rest.starts_with('f') && rest[1..].chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false);
            if rest.ends_with(".part") || rest.ends_with(".ytdl") || rest.contains(".part-") || intermediate {
                let _ = std::fs::remove_file(entry.path());
            }
        }
    }
}
