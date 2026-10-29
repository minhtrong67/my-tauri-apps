use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{Mutex, MutexGuard},
    time::Duration,
};
use tauri::{AppHandle, LogicalSize, Manager, State, WebviewWindow, WindowEvent};
use tauri_plugin_dialog::DialogExt;

const MIN_W: f64 = 360.0;
const MIN_H: f64 = 480.0;
const MAX_FILE_BYTES: u64 = 10 * 1024 * 1024;

/// Window startup preferences, stored in the app config folder as `window.json`.
#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
struct WindowPrefs {
    /// "remember" (restore last size) or "maximized" (always start maximized)
    mode: String,
    width: f64,
    height: f64,
    maximized: bool,
}

impl Default for WindowPrefs {
    fn default() -> Self {
        Self { mode: "remember".into(), width: 1100.0, height: 760.0, maximized: false }
    }
}

struct PrefsState(Mutex<WindowPrefs>);

fn lock(state: &PrefsState) -> MutexGuard<'_, WindowPrefs> {
    state.0.lock().unwrap_or_else(|e| e.into_inner())
}

fn prefs_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("window.json"))
}

fn load_prefs(app: &AppHandle) -> WindowPrefs {
    prefs_path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<WindowPrefs>(&s).ok())
        .map(|mut p| {
            if p.mode != "maximized" {
                p.mode = "remember".into();
            }
            p.width = p.width.max(MIN_W);
            p.height = p.height.max(MIN_H);
            p
        })
        .unwrap_or_default()
}

fn save_prefs(app: &AppHandle, prefs: &WindowPrefs) {
    if let Some(path) = prefs_path(app) {
        if let Some(dir) = path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        if let Ok(json) = serde_json::to_string_pretty(prefs) {
            let _ = fs::write(path, json);
        }
    }
}

/// Applies the startup behaviour before the window is shown.
fn apply_window(win: &WebviewWindow, prefs: &WindowPrefs) {
    if prefs.mode == "maximized" {
        let _ = win.maximize();
        return;
    }
    let (mut w, mut h) = (prefs.width, prefs.height);
    if let Ok(Some(monitor)) = win.current_monitor() {
        let sf = monitor.scale_factor();
        let size = monitor.size();
        w = w.min(size.width as f64 / sf);
        h = h.min(size.height as f64 / sf);
    }
    let _ = win.set_size(LogicalSize::new(w.max(MIN_W), h.max(MIN_H)));
    let _ = win.center();
    if prefs.maximized {
        let _ = win.maximize();
    }
}

/// Decodes UTF-8 (with or without BOM) and UTF-16 text files.
fn decode_text(bytes: Vec<u8>) -> String {
    if bytes.starts_with(&[0xFF, 0xFE]) || bytes.starts_with(&[0xFE, 0xFF]) {
        let le = bytes[0] == 0xFF;
        let units: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|c| if le { u16::from_le_bytes([c[0], c[1]]) } else { u16::from_be_bytes([c[0], c[1]]) })
            .collect();
        return String::from_utf16_lossy(&units);
    }
    let body = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(&bytes);
    String::from_utf8_lossy(body).into_owned()
}

/// True when the data looks like a binary file (NUL bytes in the first 8 KB, and not UTF-16 text).
fn looks_binary(bytes: &[u8]) -> bool {
    if bytes.starts_with(&[0xFF, 0xFE]) || bytes.starts_with(&[0xFE, 0xFF]) {
        return false;
    }
    bytes.iter().take(8192).any(|&b| b == 0)
}

/// Reads a text file chosen by the user (max 10 MB). Errors: "too_large", "binary" or the OS message.
#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_FILE_BYTES {
        return Err("too_large".into());
    }
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    if looks_binary(&bytes) {
        return Err("binary".into());
    }
    Ok(decode_text(bytes))
}

/// Shows a native save dialog and writes the text as UTF-8. Returns false if cancelled.
#[tauri::command]
async fn save_text(app: AppHandle, name: String, text: String) -> Result<bool, String> {
    let picked = app
        .dialog()
        .file()
        .set_file_name(&name)
        .add_filter("Text", &["txt"])
        .blocking_save_file();
    let Some(fp) = picked else { return Ok(false) };
    let path = fp.into_path().map_err(|e| e.to_string())?;
    fs::write(path, text).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn get_window_mode(state: State<'_, PrefsState>) -> String {
    lock(&state).mode.clone()
}

#[tauri::command]
fn set_window_mode(app: AppHandle, state: State<'_, PrefsState>, mode: String) -> Result<(), String> {
    if mode != "remember" && mode != "maximized" {
        return Err("invalid mode".into());
    }
    let mut prefs = lock(&state);
    prefs.mode = mode;
    save_prefs(&app, &prefs);
    Ok(())
}

/// Called by the frontend after its first paint so the window never flashes blank.
#[tauri::command]
fn app_ready(window: WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![read_text, save_text, get_window_mode, set_window_mode, app_ready])
        .setup(|app| {
            let handle = app.handle().clone();
            let prefs = load_prefs(&handle);
            app.manage(PrefsState(Mutex::new(prefs.clone())));
            if let Some(win) = app.get_webview_window("main") {
                apply_window(&win, &prefs);
                // Safety net: show the window even if the frontend fails to start.
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(4000));
                    let _ = win.show();
                });
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            let Some(state) = window.try_state::<PrefsState>() else { return };
            match event {
                WindowEvent::Resized(_) => {
                    if window.is_minimized().unwrap_or(false) {
                        return;
                    }
                    let maximized = window.is_maximized().unwrap_or(false);
                    let mut prefs = lock(&state);
                    prefs.maximized = maximized;
                    if !maximized && !window.is_fullscreen().unwrap_or(false) {
                        if let (Ok(size), Ok(sf)) = (window.inner_size(), window.scale_factor()) {
                            let (w, h) = (size.width as f64 / sf, size.height as f64 / sf);
                            if w >= MIN_W && h >= MIN_H {
                                prefs.width = w;
                                prefs.height = h;
                            }
                        }
                    }
                }
                WindowEvent::CloseRequested { .. } => {
                    let prefs = lock(&state).clone();
                    save_prefs(window.app_handle(), &prefs);
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Case Converter");
}
