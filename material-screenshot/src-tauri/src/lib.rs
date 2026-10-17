use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::{fs, path::{Path, PathBuf}, time::Duration};
use tauri::{AppHandle, Manager, PhysicalSize, WebviewWindow, Window, WindowEvent};
use tauri_plugin_dialog::DialogExt;

/* ---------- window preferences (stored in the app config folder) ---------- */

fn prefs_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("window.json"))
}

fn load_prefs(app: &AppHandle) -> Value {
    prefs_path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .filter(|v| v.is_object())
        .unwrap_or_else(|| json!({}))
}

fn store_prefs(app: &AppHandle, v: &Value) {
    if let Some(p) = prefs_path(app) {
        if let Some(dir) = p.parent() {
            let _ = fs::create_dir_all(dir);
        }
        let _ = fs::write(p, v.to_string());
    }
}

/// "remember" (reopen at the last size) or "maximized" (always start maximized).
#[tauri::command]
fn get_window_mode(app: AppHandle) -> String {
    match load_prefs(&app).get("mode").and_then(Value::as_str) {
        Some("maximized") => "maximized".into(),
        _ => "remember".into(),
    }
}

#[tauri::command]
fn set_window_mode(app: AppHandle, mode: String) {
    let mut v = load_prefs(&app);
    v["mode"] = json!(if mode == "maximized" { "maximized" } else { "remember" });
    store_prefs(&app, &v);
}

/// Called by the frontend after its first paint; the window is created hidden to avoid a white flash.
#[tauri::command]
fn app_ready(window: WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

fn apply_window_prefs(win: &WebviewWindow) {
    let prefs = load_prefs(win.app_handle());
    if prefs.get("mode").and_then(Value::as_str) == Some("maximized") {
        let _ = win.maximize();
        return;
    }
    if let (Some(mut w), Some(mut h)) = (
        prefs.get("width").and_then(Value::as_u64),
        prefs.get("height").and_then(Value::as_u64),
    ) {
        if let Ok(Some(m)) = win.current_monitor() {
            w = w.min(m.size().width as u64);
            h = h.min(m.size().height as u64);
        }
        if w >= 480 && h >= 360 {
            let _ = win.set_size(PhysicalSize::new(w as u32, h as u32));
            let _ = win.center();
        }
    }
    if prefs.get("maximized").and_then(Value::as_bool) == Some(true) {
        let _ = win.maximize();
    }
}

fn save_window_state(window: &Window) {
    let app = window.app_handle();
    let mut v = load_prefs(app);
    let maximized = window.is_maximized().unwrap_or(false);
    let minimized = window.is_minimized().unwrap_or(false);
    if !maximized && !minimized {
        if let Ok(s) = window.inner_size() {
            v["width"] = json!(s.width);
            v["height"] = json!(s.height);
        }
    }
    v["maximized"] = json!(maximized);
    store_prefs(app, &v);
}

/* ---------- image commands ---------- */

/// Reads an image chosen by the user and returns the raw bytes (binary IPC, no base64 overhead).
#[tauri::command]
async fn read_image(path: String) -> Result<tauri::ipc::Response, String> {
    let ext = Path::new(&path).extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    if !matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp") {
        return Err("unsupported".into());
    }
    let len = fs::metadata(&path).map_err(|e| e.to_string())?.len();
    if len > 120_000_000 {
        return Err("too large".into());
    }
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Windows "Downloads" folder (used as the default save location).
#[tauri::command]
fn get_download_dir(app: AppHandle) -> String {
    app.path().download_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
}

fn unique_path(dir: &Path, name: &str) -> PathBuf {
    let first = dir.join(name);
    if !first.exists() {
        return first;
    }
    let p = Path::new(name);
    let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
    let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("png");
    for i in 1..10_000 {
        let c = dir.join(format!("{stem} ({i}).{ext}"));
        if !c.exists() {
            return c;
        }
    }
    first
}

/// Saves the base64 encoded image. Without `ask` it is written straight into the chosen folder
/// (default: Downloads); with `ask` a native save dialog opens in that folder.
/// Returns the saved path, or None when the dialog was cancelled.
#[tauri::command]
async fn save_image(app: AppHandle, name: String, data: String, dir: Option<String>, ask: bool) -> Result<Option<String>, String> {
    let bytes = STANDARD.decode(data).map_err(|e| e.to_string())?;
    let folder = dir
        .filter(|d| !d.is_empty())
        .map(PathBuf::from)
        .filter(|p| p.is_dir())
        .or_else(|| app.path().download_dir().ok());
    let target = if ask {
        let ext = name.rsplit('.').next().unwrap_or("png").to_string();
        let mut dlg = app.dialog().file().set_file_name(&name).add_filter(ext.to_uppercase(), &[ext.as_str()]);
        if let Some(f) = &folder {
            dlg = dlg.set_directory(f);
        }
        let Some(fp) = dlg.blocking_save_file() else { return Ok(None) };
        fp.into_path().map_err(|e| e.to_string())?
    } else {
        let f = folder.ok_or("no save folder")?;
        fs::create_dir_all(&f).map_err(|e| e.to_string())?;
        unique_path(&f, &name)
    };
    fs::write(&target, bytes).map_err(|e| e.to_string())?;
    Ok(Some(target.to_string_lossy().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if let Some(win) = app.get_webview_window("main") {
                apply_window_prefs(&win);
                // Safety net: never leave the window hidden if the frontend fails to start.
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(4000));
                    let _ = win.show();
                });
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { .. } = event {
                    save_window_state(window);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            read_image,
            save_image,
            get_download_dir,
            get_window_mode,
            set_window_mode,
            app_ready
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Screenshot");
}
