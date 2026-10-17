use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_window_state::StateFlags;

const EXTS: [&str; 10] = ["png", "jpg", "jpeg", "jfif", "gif", "webp", "bmp", "ico", "avif", "svg"];

fn is_img(p: &Path) -> bool {
    p.extension().and_then(|e| e.to_str()).map(|e| EXTS.contains(&e.to_lowercase().as_str())).unwrap_or(false)
}

fn ms(m: &std::fs::Metadata) -> u64 {
    m.modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[derive(Serialize, Clone)]
struct Entry {
    path: String,
    name: String,
    size: u64,
    mtime: u64,
    folder: String,
}

#[derive(Serialize, Clone)]
struct Opened {
    dir: String,
    entries: Vec<Entry>,
    current: Option<String>,
}

/// Runs blocking file work on a worker thread so the window never freezes.
async fn blocking<T: Send + 'static>(f: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| e.to_string())?
}

/// App settings that Rust must know before the window is shown.
#[derive(Serialize, Deserialize, Default)]
struct Settings {
    /// "remember" (default) keeps the last window size, "maximized" always opens maximized.
    #[serde(default)]
    window_mode: String,
}

fn settings_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("settings.json"))
}

fn load_settings(app: &tauri::AppHandle) -> Settings {
    settings_path(app)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

/// Returns the startup window mode: "remember" or "maximized".
#[tauri::command]
fn get_window_mode(app: tauri::AppHandle) -> String {
    if load_settings(&app).window_mode == "maximized" { "maximized".into() } else { "remember".into() }
}

/// Saves the startup window mode. Choosing "maximized" also maximizes the window right away.
#[tauri::command]
fn set_window_mode(app: tauri::AppHandle, window: tauri::WebviewWindow, mode: String) -> Result<(), String> {
    let mode = if mode == "maximized" { "maximized" } else { "remember" };
    let path = settings_path(&app).ok_or("no config dir")?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&Settings { window_mode: mode.into() }).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())?;
    if mode == "maximized" {
        let _ = window.maximize();
    }
    Ok(())
}

/// The window starts hidden; the page calls this after its first paint so there is no white flash.
#[tauri::command]
fn show_window(window: tauri::WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

/// Removes cached thumbnails that have not been refreshed for a long time.
fn prune_thumbs(dir: &Path) {
    let Some(cutoff) = SystemTime::now().checked_sub(Duration::from_secs(60 * 60 * 24 * 45)) else { return };
    if let Ok(rd) = std::fs::read_dir(dir) {
        for e in rd.flatten() {
            if let Ok(t) = e.metadata().and_then(|m| m.modified()) {
                if t < cutoff {
                    let _ = std::fs::remove_file(e.path());
                }
            }
        }
    }
}

fn scan(dir: &Path) -> Vec<Entry> {
    let mut v = Vec::new();
    if let Ok(rd) = std::fs::read_dir(dir) {
        for e in rd.flatten() {
            let p = e.path();
            if p.is_file() && is_img(&p) {
                if let Ok(m) = e.metadata() {
                    v.push(Entry {
                        path: p.to_string_lossy().into_owned(),
                        name: e.file_name().to_string_lossy().into_owned(),
                        size: m.len(),
                        mtime: ms(&m),
                        folder: dir.to_string_lossy().into_owned(),
                    });
                }
            }
        }
    }
    v
}

/// Scans a folder and all of its sub folders (up to 8 levels deep).
fn scan_deep(root: &Path) -> Vec<Entry> {
    let mut out = Vec::new();
    let mut stack = vec![(root.to_path_buf(), 0usize)];
    while let Some((d, depth)) = stack.pop() {
        if let Ok(rd) = std::fs::read_dir(&d) {
            for e in rd.flatten() {
                let name = e.file_name().to_string_lossy().into_owned();
                if name.starts_with('.') || name.starts_with('$') {
                    continue;
                }
                let p = e.path();
                if p.is_dir() {
                    if depth < 8 {
                        stack.push((p, depth + 1));
                    }
                } else if is_img(&p) {
                    if let Ok(m) = e.metadata() {
                        out.push(Entry {
                            path: p.to_string_lossy().into_owned(),
                            name,
                            size: m.len(),
                            mtime: ms(&m),
                            folder: d.to_string_lossy().into_owned(),
                        });
                        if out.len() >= 50_000 {
                            return out;
                        }
                    }
                }
            }
        }
    }
    out
}

/// Scans the user's Pictures folder (including sub folders) so it can be imported automatically.
#[tauri::command]
async fn library(app: tauri::AppHandle) -> Result<Opened, String> {
    let dir = app.path().picture_dir().map_err(|e| e.to_string())?;
    blocking(move || Ok(Opened { dir: dir.to_string_lossy().into_owned(), entries: scan_deep(&dir), current: None })).await
}

/// Opens a folder, or the folder that contains the given picture, and lists its pictures.
#[tauri::command]
async fn open_target(path: String) -> Result<Opened, String> {
    blocking(move || {
        let p = PathBuf::from(&path);
        if p.is_dir() {
            Ok(Opened { dir: path, entries: scan(&p), current: None })
        } else if p.is_file() {
            let dir = p.parent().ok_or("no parent")?.to_path_buf();
            Ok(Opened { dir: dir.to_string_lossy().into_owned(), entries: scan(&dir), current: Some(path) })
        } else {
            Err("not found".into())
        }
    })
    .await
}

fn arg_target(args: &[String]) -> Option<String> {
    args.iter().skip(1).find(|a| {
        let p = Path::new(a);
        p.is_dir() || (p.is_file() && is_img(p))
    }).cloned()
}

/// Picture or folder passed on the command line when Windows opens a file with this app.
#[tauri::command]
fn startup_path() -> Option<String> {
    arg_target(&std::env::args().collect::<Vec<_>>())
}

/// Returns the path of a cached square JPEG thumbnail, creating it on first use.
/// Thumbnails live in the app cache folder, so scrolling a big library stays fast and later launches are instant.
#[tauri::command]
async fn thumb(app: tauri::AppHandle, path: String, size: u32) -> Result<String, String> {
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("thumbs");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let mut h = std::collections::hash_map::DefaultHasher::new();
    (&path, meta.len(), ms(&meta), size).hash(&mut h);
    let out = dir.join(format!("{:016x}.jpg", h.finish()));
    if out.exists() {
        return Ok(out.to_string_lossy().into_owned());
    }
    let o = out.clone();
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let img = image::open(&path).map_err(|e| e.to_string())?;
        let t = img.resize_to_fill(size, size, image::imageops::FilterType::Triangle);
        let mut cur = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgb8(t.to_rgb8())
            .write_to(&mut cur, image::ImageFormat::Jpeg)
            .map_err(|e| e.to_string())?;
        let tmp = o.with_extension("tmp");
        std::fs::write(&tmp, cur.into_inner()).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp, &o).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())??;
    Ok(out.to_string_lossy().into_owned())
}

/// Reads a picture and returns (mime type, base64 data) so it can be edited on a canvas.
#[tauri::command]
async fn read_image(path: String) -> Result<(String, String), String> {
    blocking(move || {
        let ext = Path::new(&path).extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        let mime = match ext.as_str() {
            "png" => "image/png",
            "jpg" | "jpeg" | "jfif" => "image/jpeg",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "bmp" => "image/bmp",
            "ico" => "image/x-icon",
            "avif" => "image/avif",
            "svg" => "image/svg+xml",
            _ => return Err("unsupported".into()),
        };
        let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
        if bytes.len() > 120_000_000 {
            return Err("too large".into());
        }
        Ok((mime.into(), STANDARD.encode(bytes)))
    })
    .await
}

/// Writes bytes to a temporary file first, then swaps it in, so a crash never leaves a half written picture.
fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("mp-tmp");
    std::fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, path).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        e.to_string()
    })
}

/// Overwrites an existing picture with base64 encoded data.
#[tauri::command]
async fn write_image(path: String, data: String) -> Result<(), String> {
    blocking(move || {
        let bytes = STANDARD.decode(data).map_err(|e| e.to_string())?;
        write_atomic(Path::new(&path), &bytes)
    })
    .await
}

/// Shows a native save dialog, writes the picture and returns the chosen path (None if cancelled).
#[tauri::command]
async fn save_image(app: tauri::AppHandle, name: String, data: String, dir: Option<String>) -> Result<Option<String>, String> {
    let ext = name.rsplit('.').next().unwrap_or("png").to_string();
    let mut b = app.dialog().file().set_file_name(&name).add_filter(ext.to_uppercase(), &[ext.as_str()]);
    if let Some(d) = dir {
        b = b.set_directory(d);
    }
    let Some(fp) = b.blocking_save_file() else { return Ok(None) };
    let path = fp.into_path().map_err(|e| e.to_string())?;
    let bytes = STANDARD.decode(data).map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

/// Moves a picture to the Recycle Bin.
#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    blocking(move || trash::delete(&path).map_err(|e| e.to_string())).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be first: a second launch forwards its file to the running window.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
            if let Some(p) = arg_target(&args) {
                let _ = app.emit("open-path", p);
            }
        }))
        // Remembers the window size, position and maximized state between launches.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(w) = app.get_webview_window("main") {
                // The window is created hidden. Saved size and position are already restored by the window state plugin.
                if load_settings(app.handle()).window_mode == "maximized" {
                    let _ = w.maximize();
                }
                // Safety net: if the page never asks to be shown, show it anyway.
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(3000));
                    if !w.is_visible().unwrap_or(false) {
                        let _ = w.show();
                    }
                });
            }
            if let Ok(dir) = app.path().app_cache_dir() {
                let dir = dir.join("thumbs");
                std::thread::spawn(move || prune_thumbs(&dir));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            thumb, library, open_target, startup_path, read_image, write_image, save_image, delete_file,
            get_window_mode, set_window_mode, show_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Photo");
}
