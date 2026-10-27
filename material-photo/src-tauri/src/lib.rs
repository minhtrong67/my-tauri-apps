mod exif_util;

use serde::{Deserialize, Serialize};
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use notify::{RecursiveMode, Watcher};
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

/// Lets the webview load pictures from a folder the user chose (asset protocol scope).
fn allow_dir(app: &tauri::AppHandle, dir: &Path, recursive: bool) {
    let _ = app.asset_protocol_scope().allow_directory(dir, recursive);
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
    allow_dir(&app, &dir, true);
    blocking(move || Ok(Opened { dir: dir.to_string_lossy().into_owned(), entries: scan_deep(&dir), current: None })).await
}

/// Opens a folder, or the folder that contains the given picture, and lists its pictures.
#[tauri::command]
async fn open_target(app: tauri::AppHandle, path: String) -> Result<Opened, String> {
    let p0 = PathBuf::from(&path);
    let d0 = if p0.is_dir() { p0.clone() } else { p0.parent().map(|p| p.to_path_buf()).unwrap_or(p0.clone()) };
    allow_dir(&app, &d0, false);
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
/// The EXIF orientation is applied, so phone photos are never rotated wrongly.
#[tauri::command]
async fn thumb(app: tauri::AppHandle, path: String, size: u32) -> Result<String, String> {
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("thumbs");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let mut h = std::collections::hash_map::DefaultHasher::new();
    (&path, meta.len(), ms(&meta), size, 2u8).hash(&mut h);
    let out = dir.join(format!("{:016x}.jpg", h.finish()));
    if out.exists() {
        return Ok(out.to_string_lossy().into_owned());
    }
    let o = out.clone();
    blocking(move || {
        let p = Path::new(&path);
        let img = image::open(p).map_err(|e| e.to_string())?;
        let img = exif_util::apply_orientation(img, exif_util::orientation(p));
        let t = img.resize_to_fill(size, size, image::imageops::FilterType::Triangle);
        let mut cur = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgb8(t.to_rgb8())
            .write_to(&mut cur, image::ImageFormat::Jpeg)
            .map_err(|e| e.to_string())?;
        let tmp = o.with_extension("tmp");
        std::fs::write(&tmp, cur.into_inner()).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp, &o).map_err(|e| e.to_string())
    })
    .await?;
    Ok(out.to_string_lossy().into_owned())
}

/// Reads size and metadata for a list of paths (favourites and albums can live in any folder).
#[tauri::command]
async fn stat_paths(app: tauri::AppHandle, paths: Vec<String>) -> Result<Vec<Entry>, String> {
    for p in &paths {
        if let Some(d) = Path::new(p).parent() {
            allow_dir(&app, d, false);
        }
    }
    blocking(move || {
        Ok(paths
            .into_iter()
            .filter_map(|p| {
                let pb = PathBuf::from(&p);
                let m = std::fs::metadata(&pb).ok()?;
                if !m.is_file() || !is_img(&pb) {
                    return None;
                }
                Some(Entry {
                    name: pb.file_name()?.to_string_lossy().into_owned(),
                    folder: pb.parent()?.to_string_lossy().into_owned(),
                    size: m.len(),
                    mtime: ms(&m),
                    path: p,
                })
            })
            .collect())
    })
    .await
}

/// EXIF details (camera, lens, exposure, GPS...) of a picture.
#[tauri::command]
async fn exif_info(path: String) -> Result<exif_util::ExifInfo, String> {
    blocking(move || Ok(exif_util::read_info(Path::new(&path)))).await
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

fn decode_header(v: Option<&tauri::http::HeaderValue>) -> Option<String> {
    let s = v?.to_str().ok()?;
    Some(percent_encoding::percent_decode_str(s).decode_utf8_lossy().into_owned())
}

/// Writes raw picture bytes (sent as a binary request body) to `x-path`.
/// With `x-keep-exif: 1` the EXIF block of the JPEG named in `x-exif-src` (default: the target itself) is copied into the new file.
#[tauri::command]
async fn write_image(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else { return Err("missing data".into()) };
    let path = decode_header(request.headers().get("x-path")).ok_or("missing path")?;
    let keep = request.headers().get("x-keep-exif").and_then(|v| v.to_str().ok()) == Some("1");
    let exif_src = decode_header(request.headers().get("x-exif-src")).unwrap_or_else(|| path.clone());
    let bytes = bytes.clone();
    blocking(move || {
        let p = Path::new(&path);
        let mut data = bytes;
        if keep {
            if let Ok(orig) = std::fs::read(&exif_src) {
                data = exif_util::carry_exif(&orig, data);
            }
        }
        write_atomic(p, &data)
    })
    .await
}

/// Native "save as" dialog. Returns the chosen path, or None when cancelled.
#[tauri::command]
async fn pick_save_path(app: tauri::AppHandle, name: String, dir: Option<String>) -> Result<Option<String>, String> {
    let ext = name.rsplit('.').next().unwrap_or("png").to_string();
    let mut b = app.dialog().file().set_file_name(&name).add_filter(ext.to_uppercase(), &[ext.as_str()]);
    if let Some(d) = dir {
        b = b.set_directory(d);
    }
    let Some(fp) = b.blocking_save_file() else { return Ok(None) };
    let path = fp.into_path().map_err(|e| e.to_string())?;
    if let Some(d) = path.parent() {
        allow_dir(&app, d, false);
    }
    Ok(Some(path.to_string_lossy().into_owned()))
}

/// Rotates a picture on disk by 90, 180 or 270 degrees (clockwise). JPEG keeps its EXIF block.
#[tauri::command]
async fn rotate_file(path: String, deg: u32) -> Result<(), String> {
    blocking(move || {
        let p = Path::new(&path);
        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        let img = image::open(p).map_err(|e| e.to_string())?;
        let img = exif_util::apply_orientation(img, exif_util::orientation(p));
        let img = match deg % 360 {
            90 => img.rotate90(),
            180 => img.rotate180(),
            270 => img.rotate270(),
            _ => img,
        };
        let mut buf = Vec::new();
        match ext.as_str() {
            "jpg" | "jpeg" | "jfif" => {
                let enc = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, 95);
                image::DynamicImage::ImageRgb8(img.to_rgb8()).write_with_encoder(enc).map_err(|e| e.to_string())?;
                if let Ok(orig) = std::fs::read(p) {
                    buf = exif_util::carry_exif(&orig, buf);
                }
            }
            "png" | "bmp" | "webp" => {
                let fmt = match ext.as_str() {
                    "png" => image::ImageFormat::Png,
                    "bmp" => image::ImageFormat::Bmp,
                    _ => image::ImageFormat::WebP,
                };
                img.write_to(&mut std::io::Cursor::new(&mut buf), fmt).map_err(|e| e.to_string())?;
            }
            _ => return Err("unsupported".into()),
        }
        write_atomic(p, &buf)
    })
    .await
}

/// Moves a picture to the Recycle Bin.
#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    blocking(move || trash::delete(&path).map_err(|e| e.to_string())).await
}

/// Puts the most recently deleted copy of a picture back where it was (Windows Recycle Bin).
#[tauri::command]
async fn restore_file(path: String) -> Result<(), String> {
    blocking(move || {
        #[cfg(windows)]
        {
            let mut items: Vec<_> = trash::os_limited::list()
                .map_err(|e| e.to_string())?
                .into_iter()
                .filter(|i| i.original_path().to_string_lossy().to_lowercase() == path.to_lowercase())
                .collect();
            items.sort_by_key(|i| i.time_deleted);
            let last = items.pop().ok_or("not in the Recycle Bin")?;
            trash::os_limited::restore_all([last]).map_err(|e| e.to_string())
        }
        #[cfg(not(windows))]
        {
            let _ = path;
            Err("unsupported".to_string())
        }
    })
    .await
}

fn unique(dest: PathBuf) -> PathBuf {
    if !dest.exists() {
        return dest;
    }
    let stem = dest.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
    let ext = dest.extension().map(|s| format!(".{}", s.to_string_lossy())).unwrap_or_default();
    let dir = dest.parent().map(|p| p.to_path_buf()).unwrap_or_default();
    for n in 2..10_000 {
        let c = dir.join(format!("{stem} ({n}){ext}"));
        if !c.exists() {
            return c;
        }
    }
    dest
}

/// Copies (or moves) pictures into a folder. Name clashes get " (2)", " (3)"... Returns how many succeeded.
#[tauri::command]
async fn transfer_files(app: tauri::AppHandle, paths: Vec<String>, dest: String, mv: bool) -> Result<usize, String> {
    allow_dir(&app, Path::new(&dest), false);
    blocking(move || {
        let d = PathBuf::from(&dest);
        std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
        let mut ok = 0;
        for p in paths {
            let src = PathBuf::from(&p);
            let Some(name) = src.file_name() else { continue };
            let target = unique(d.join(name));
            if target == src {
                continue;
            }
            let done = if mv {
                std::fs::rename(&src, &target).or_else(|_| std::fs::copy(&src, &target).and_then(|_| std::fs::remove_file(&src))).is_ok()
            } else {
                std::fs::copy(&src, &target).is_ok()
            };
            if done {
                ok += 1;
            }
        }
        Ok(ok)
    })
    .await
}

/// Renames a picture inside its folder and returns the new path.
#[tauri::command]
async fn rename_file(path: String, new_name: String) -> Result<String, String> {
    blocking(move || {
        let bad = |c: char| matches!(c, '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|');
        let n = new_name.trim();
        if n.is_empty() || n.chars().any(bad) {
            return Err("invalid name".into());
        }
        let src = PathBuf::from(&path);
        let target = src.with_file_name(n);
        if target == src {
            return Ok(path);
        }
        if target.exists() {
            return Err("exists".into());
        }
        std::fs::rename(&src, &target).map_err(|e| e.to_string())?;
        Ok(target.to_string_lossy().into_owned())
    })
    .await
}

/// Groups byte-identical pictures. Only files with the same size are hashed.
#[tauri::command]
async fn find_duplicates(paths: Vec<String>) -> Result<Vec<Vec<String>>, String> {
    blocking(move || {
        let mut by_size: std::collections::HashMap<u64, Vec<String>> = std::collections::HashMap::new();
        for p in paths {
            if let Ok(m) = std::fs::metadata(&p) {
                by_size.entry(m.len()).or_default().push(p);
            }
        }
        let mut groups = Vec::new();
        for (_, files) in by_size.into_iter().filter(|(_, f)| f.len() > 1) {
            let mut by_hash: std::collections::HashMap<u64, Vec<String>> = std::collections::HashMap::new();
            for f in files {
                if let Ok(bytes) = std::fs::read(&f) {
                    let mut h = std::collections::hash_map::DefaultHasher::new();
                    bytes.hash(&mut h);
                    by_hash.entry(h.finish()).or_default().push(f);
                }
            }
            groups.extend(by_hash.into_values().filter(|g| g.len() > 1));
        }
        groups.sort_by(|a, b| b.len().cmp(&a.len()));
        Ok(groups)
    })
    .await
}

/// Sets the Windows desktop wallpaper.
#[tauri::command]
async fn set_wallpaper(path: String) -> Result<(), String> {
    blocking(move || {
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let script = "Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class WP { [DllImport(\"user32.dll\", CharSet=CharSet.Unicode)] public static extern int SystemParametersInfo(int a, int b, string c, int d); }'; [WP]::SystemParametersInfo(20, 0, $env:MP_WALLPAPER, 3) | Out-Null";
            let st = std::process::Command::new("powershell")
                .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script])
                .env("MP_WALLPAPER", &path)
                .creation_flags(0x0800_0000)
                .status()
                .map_err(|e| e.to_string())?;
            if st.success() { Ok(()) } else { Err("failed".into()) }
        }
        #[cfg(not(windows))]
        {
            let _ = path;
            Err("unsupported".to_string())
        }
    })
    .await
}

struct Watch(Mutex<Option<notify::RecommendedWatcher>>);

/// Watches folders and emits "fs-changed" (debounced) when pictures are added, removed or modified.
#[tauri::command]
fn watch_dirs(app: tauri::AppHandle, state: tauri::State<Watch>, dirs: Vec<String>, recursive: bool) -> Result<(), String> {
    let (tx, rx) = std::sync::mpsc::channel::<()>();
    let mut w = notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
        if let Ok(ev) = res {
            let relevant = matches!(ev.kind, notify::EventKind::Create(_) | notify::EventKind::Remove(_) | notify::EventKind::Modify(_));
            if relevant && ev.paths.iter().any(|p| is_img(p) || p.extension().is_none()) {
                let _ = tx.send(());
            }
        }
    })
    .map_err(|e| e.to_string())?;
    for d in dirs {
        let mode = if recursive { RecursiveMode::Recursive } else { RecursiveMode::NonRecursive };
        let _ = w.watch(Path::new(&d), mode);
    }
    std::thread::spawn(move || {
        // Ends by itself when the watcher (and its sender) is dropped.
        while rx.recv().is_ok() {
            while rx.recv_timeout(Duration::from_millis(700)).is_ok() {}
            let _ = app.emit("fs-changed", ());
        }
    });
    *state.0.lock().map_err(|e| e.to_string())? = Some(w);
    Ok(())
}

#[tauri::command]
fn unwatch(state: tauri::State<Watch>) {
    if let Ok(mut g) = state.0.lock() {
        *g = None;
    }
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
        .manage(Watch(Mutex::new(None)))
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
            thumb, library, open_target, startup_path, stat_paths, exif_info, write_image, pick_save_path, rotate_file,
            delete_file, restore_file, transfer_files, rename_file, find_duplicates, set_wallpaper, watch_dirs, unwatch,
            get_window_mode, set_window_mode, show_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Photo");
}
