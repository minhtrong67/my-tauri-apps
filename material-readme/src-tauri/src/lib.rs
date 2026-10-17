use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, PhysicalSize, WindowEvent};

const MAX_TEXT: u64 = 30_000_000;
const MD_EXT: [&str; 5] = [".md", ".markdown", ".mdown", ".mkd", ".txt"];

// ---------------------------------------------------------------- documents

#[derive(Serialize, Clone)]
struct Doc {
    path: String,
    name: String,
    size: u64,
    mtime: u64,
    text: String,
    /// true when the file was not valid UTF-8 and some characters were replaced
    lossy: bool,
}

#[derive(Serialize)]
struct Saved {
    mtime: u64,
    size: u64,
}

fn is_doc_arg(a: &str) -> bool {
    let l = a.to_lowercase();
    MD_EXT.iter().any(|e| l.ends_with(e)) && Path::new(a).is_file()
}

fn mtime(p: &str) -> u64 {
    std::fs::metadata(p)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let (mut o, mut i) = (Vec::new(), 0);
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(v) = std::str::from_utf8(&b[i + 1..i + 3]).ok().and_then(|h| u8::from_str_radix(h, 16).ok()) {
                o.push(v);
                i += 3;
                continue;
            }
        }
        o.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&o).into_owned()
}

#[tauri::command]
fn read_doc(path: String) -> Result<Doc, String> {
    let len = std::fs::metadata(&path).map_err(|e| e.to_string())?.len();
    if len > MAX_TEXT {
        return Err("too large".into());
    }
    let mut bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        bytes.drain(..3); // strip the UTF-8 byte order mark
    }
    let size = bytes.len() as u64;
    let (text, lossy) = match String::from_utf8(bytes) {
        Ok(s) => (s, false),
        Err(e) => (String::from_utf8_lossy(e.as_bytes()).into_owned(), true),
    };
    let name = Path::new(&path)
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    Ok(Doc { mtime: mtime(&path), name, size, text, lossy, path })
}

/// Writes through a temporary file so a crash never leaves a half written document.
#[tauri::command]
fn write_doc(path: String, text: String) -> Result<Saved, String> {
    let target = PathBuf::from(&path);
    let mut tmp = target.clone();
    let tmp_name = format!(
        ".{}.mr-tmp",
        target.file_name().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default()
    );
    tmp.set_file_name(tmp_name);
    let atomic = std::fs::write(&tmp, text.as_bytes()).and_then(|_| std::fs::rename(&tmp, &target));
    if atomic.is_err() {
        let _ = std::fs::remove_file(&tmp);
        std::fs::write(&target, text.as_bytes()).map_err(|e| e.to_string())?;
    }
    Ok(Saved { mtime: mtime(&path), size: text.len() as u64 })
}

/// Files passed on the command line when Windows opens .md files with this app.
#[tauri::command]
fn startup_docs() -> Vec<Doc> {
    std::env::args()
        .skip(1)
        .filter(|a| is_doc_arg(a))
        .filter_map(|p| read_doc(p).ok())
        .collect()
}

#[tauri::command]
fn file_mtime(path: String) -> u64 {
    mtime(&path)
}

/// Loads a local image referenced by a relative path in the Markdown file. Images only.
#[tauri::command]
fn read_asset(base: String, rel: String) -> Result<(String, String), String> {
    let rel = percent_decode(rel.split(|c: char| c == '?' || c == '#').next().unwrap_or(""));
    let dir = Path::new(&base).parent().ok_or("no parent")?;
    let p = dir.join(rel.trim_start_matches("./"));
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        _ => return Err("unsupported".into()),
    };
    let bytes = std::fs::read(&p).map_err(|e| e.to_string())?;
    if bytes.len() > 20_000_000 {
        return Err("too large".into());
    }
    Ok((mime.into(), STANDARD.encode(bytes)))
}

// ------------------------------------------------------------ window state

#[derive(Serialize, Deserialize, Clone)]
struct Prefs {
    /// "remember" or "maximized"
    mode: String,
    width: u32,
    height: u32,
    maximized: bool,
}

impl Default for Prefs {
    fn default() -> Self {
        Prefs { mode: "remember".into(), width: 0, height: 0, maximized: false }
    }
}

struct AppState {
    dirty: AtomicBool,
    prefs: Mutex<Prefs>,
    last_save: Mutex<Instant>,
}

fn prefs_file(app: &tauri::AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join("window.json"))
}

fn load_prefs(app: &tauri::AppHandle) -> Prefs {
    prefs_file(app)
        .and_then(|f| std::fs::read_to_string(f).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_prefs(app: &tauri::AppHandle) {
    let state = app.state::<AppState>();
    let prefs = state.prefs.lock().map(|p| p.clone()).unwrap_or_default();
    if let (Some(f), Ok(s)) = (prefs_file(app), serde_json::to_string(&prefs)) {
        let _ = std::fs::write(f, s);
    }
    if let Ok(mut t) = state.last_save.lock() {
        *t = Instant::now();
    };
}

#[tauri::command]
fn get_window_mode(state: tauri::State<AppState>) -> String {
    state.prefs.lock().map(|p| p.mode.clone()).unwrap_or_else(|_| "remember".into())
}

#[tauri::command]
fn set_window_mode(app: tauri::AppHandle, state: tauri::State<AppState>, mode: String) {
    if mode != "remember" && mode != "maximized" {
        return;
    }
    if let Ok(mut p) = state.prefs.lock() {
        p.mode = mode;
    }
    save_prefs(&app);
}

#[tauri::command]
fn set_dirty(state: tauri::State<AppState>, dirty: bool) {
    state.dirty.store(dirty, Ordering::Relaxed);
}

/// Called by the frontend once it has painted: shows the (initially hidden) window.
#[tauri::command]
fn app_ready(window: tauri::WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

/// Closes the window after the frontend resolved the "unsaved changes" dialog.
#[tauri::command]
fn force_close(app: tauri::AppHandle, state: tauri::State<AppState>, window: tauri::WebviewWindow) {
    state.dirty.store(false, Ordering::Relaxed);
    save_prefs(&app);
    let _ = window.destroy();
}

fn apply_prefs(app: &tauri::AppHandle) {
    let prefs = load_prefs(app);
    if let Some(w) = app.get_webview_window("main") {
        if prefs.mode == "maximized" {
            let _ = w.maximize();
        } else {
            if prefs.width >= 480 && prefs.height >= 360 {
                let _ = w.set_size(PhysicalSize::new(prefs.width, prefs.height));
                let _ = w.center();
            }
            if prefs.maximized {
                let _ = w.maximize();
            }
        }
    }
    *app.state::<AppState>().prefs.lock().unwrap() = prefs;
}

fn on_window_event(window: &tauri::Window, event: &WindowEvent) {
    let app = window.app_handle();
    match event {
        WindowEvent::Resized(size) => {
            let state = app.state::<AppState>();
            let maximized = window.is_maximized().unwrap_or(false);
            let minimized = window.is_minimized().unwrap_or(false);
            if minimized || size.width == 0 || size.height == 0 {
                return;
            }
            if let Ok(mut p) = state.prefs.lock() {
                p.maximized = maximized;
                if !maximized && !window.is_fullscreen().unwrap_or(false) {
                    p.width = size.width;
                    p.height = size.height;
                }
            }
            // Throttled save so the size also survives a crash; the final save happens on close.
            let due = state.last_save.lock().map(|t| t.elapsed() > Duration::from_secs(2)).unwrap_or(false);
            if due {
                save_prefs(app);
            }
        }
        WindowEvent::CloseRequested { api, .. } => {
            save_prefs(app);
            if app.state::<AppState>().dirty.load(Ordering::Relaxed) {
                api.prevent_close();
                let _ = window.emit("close-requested", ());
            }
        }
        _ => {}
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be first: a second launch forwards its files to the running window.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
            let docs: Vec<Doc> = args
                .iter()
                .skip(1)
                .filter(|a| is_doc_arg(a))
                .filter_map(|p| read_doc(p.clone()).ok())
                .collect();
            if !docs.is_empty() {
                let _ = app.emit("open-docs", docs);
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            dirty: AtomicBool::new(false),
            prefs: Mutex::new(Prefs::default()),
            last_save: Mutex::new(Instant::now()),
        })
        .setup(|app| {
            apply_prefs(app.handle());
            // Safety net: never leave the window hidden if the frontend fails to start.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(4));
                if let Some(w) = handle.get_webview_window("main") {
                    let _ = w.show();
                }
            });
            Ok(())
        })
        .on_window_event(on_window_event)
        .invoke_handler(tauri::generate_handler![
            read_doc,
            write_doc,
            startup_docs,
            file_mtime,
            read_asset,
            get_window_mode,
            set_window_mode,
            set_dirty,
            app_ready,
            force_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Readme");
}
