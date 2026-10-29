use serde_json::{json, Value};
use std::{fs, path::{Path, PathBuf}, sync::atomic::{AtomicU64, Ordering}, time::Duration};
use tauri::{ipc::InvokeBody, AppHandle, Manager, PhysicalSize, State, WebviewWindow, Window, WindowEvent};
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

const IMAGE_EXTS: [&str; 6] = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];

fn is_image(path: &str) -> bool {
    let ext = Path::new(path).extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    IMAGE_EXTS.contains(&ext.as_str())
}

/// Image path passed on the command line / by "Open with" (consumed once by the frontend).
struct LaunchFile(Option<String>);

#[tauri::command]
fn get_launch_file(state: State<LaunchFile>) -> Option<String> {
    state.0.clone()
}

/// Reads an image chosen by the user and returns the raw bytes (binary IPC, no base64 overhead).
#[tauri::command]
async fn read_image(path: String) -> Result<tauri::ipc::Response, String> {
    if !is_image(&path) {
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

/// Minimal percent-decoder for the header values sent by the frontend (names / paths may be non-ASCII).
fn pct_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(v) = s.get(i + 1..i + 3).and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

/// Saves an image sent as raw bytes (binary IPC). Headers (percent-encoded): x-name, x-dir, x-ask ("1" = ask).
/// Without `ask` the file is written straight into the chosen folder (default: Downloads) and never overwrites;
/// with `ask` a native save dialog opens. Returns the saved path, or None when the dialog was cancelled.
#[tauri::command]
async fn save_image(app: AppHandle, request: tauri::ipc::Request<'_>) -> Result<Option<String>, String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected raw bytes".into());
    };
    let header = |k: &str| request.headers().get(k).and_then(|v| v.to_str().ok()).map(pct_decode).unwrap_or_default();
    let name = {
        let n = header("x-name");
        if n.is_empty() { "image.png".to_string() } else { n.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_") }
    };
    let dir = header("x-dir");
    let ask = header("x-ask") == "1";
    let folder = Some(dir)
        .filter(|d| !d.is_empty())
        .map(PathBuf::from)
        .filter(|p| p.is_dir() || fs::create_dir_all(p).is_ok())
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

/// Captures the monitor under the mouse cursor. The window is hidden first (and shown again afterwards).
/// Reply layout: width (u32 LE) + height (u32 LE) + RGBA pixels.
#[tauri::command]
async fn capture_screen(window: WebviewWindow, delay_ms: u64) -> Result<tauri::ipc::Response, String> {
    let win = window.clone();
    let job = tauri::async_runtime::spawn_blocking(move || -> Result<Vec<u8>, String> {
        let _ = win.hide();
        std::thread::sleep(Duration::from_millis(350 + delay_ms.min(10_000)));
        let result = (|| -> Result<Vec<u8>, String> {
            let by_cursor = win
                .cursor_position()
                .ok()
                .and_then(|p| xcap::Monitor::from_point(p.x as i32, p.y as i32).ok());
            let monitor = match by_cursor {
                Some(m) => m,
                None => {
                    let all = xcap::Monitor::all().map_err(|e| e.to_string())?;
                    let primary = all.iter().position(|m| m.is_primary().unwrap_or(false)).unwrap_or(0);
                    all.into_iter().nth(primary).ok_or("no monitor")?
                }
            };
            let img = monitor.capture_image().map_err(|e| e.to_string())?;
            let (w, h) = (img.width(), img.height());
            let raw = img.into_raw();
            let mut out = Vec::with_capacity(raw.len() + 8);
            out.extend_from_slice(&w.to_le_bytes());
            out.extend_from_slice(&h.to_le_bytes());
            out.extend_from_slice(&raw);
            Ok(out)
        })();
        let _ = win.show();
        let _ = win.set_focus();
        result
    });
    let bytes = job.await.map_err(|e| e.to_string())??;
    Ok(tauri::ipc::Response::new(bytes))
}

static RESIZE_SEQ: AtomicU64 = AtomicU64::new(0);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let launch = std::env::args().skip(1).find(|a| is_image(a) && Path::new(a).is_file());
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(LaunchFile(launch))
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
            if window.label() != "main" {
                return;
            }
            match event {
                WindowEvent::CloseRequested { .. } => save_window_state(window),
                // Debounced save so the size survives even if the app is killed.
                WindowEvent::Resized(_) => {
                    let id = RESIZE_SEQ.fetch_add(1, Ordering::SeqCst) + 1;
                    let w = window.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(Duration::from_millis(700));
                        if RESIZE_SEQ.load(Ordering::SeqCst) == id {
                            save_window_state(&w);
                        }
                    });
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            read_image,
            save_image,
            capture_screen,
            get_launch_file,
            get_download_dir,
            get_window_mode,
            set_window_mode,
            app_ready
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Screenshot");
}
