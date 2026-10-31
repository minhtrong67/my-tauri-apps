use crate::model::State;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, WebviewWindow};

fn dir(app: &AppHandle, data: bool) -> PathBuf {
    let r = if data { app.path().app_data_dir() } else { app.path().app_config_dir() };
    let p = r.unwrap_or_else(|_| PathBuf::from("."));
    let _ = fs::create_dir_all(&p);
    p
}

pub fn settings_path(app: &AppHandle) -> PathBuf {
    dir(app, false).join("settings.json")
}

pub fn state_path(app: &AppHandle) -> PathBuf {
    dir(app, true).join("state.json")
}

pub fn read_settings(app: &AppHandle) -> Value {
    fs::read_to_string(settings_path(app))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| json!({}))
}

pub fn write_settings(app: &AppHandle, v: &Value) -> Result<(), String> {
    fs::write(settings_path(app), serde_json::to_string_pretty(v).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

/// Frontend-owned settings are replaced, window geometry keys (owned by Rust) are preserved.
pub fn merge_settings(app: &AppHandle, mut incoming: Value) -> Result<(), String> {
    let old = read_settings(app);
    if let (Some(o), Some(n)) = (old.as_object(), incoming.as_object_mut()) {
        for k in ["windowSize", "wasMaximized"] {
            if let Some(v) = o.get(k) {
                n.insert(k.into(), v.clone());
            }
        }
    }
    write_settings(app, &incoming)
}

pub fn read_state(app: &AppHandle) -> State {
    fs::read_to_string(state_path(app))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn write_state(app: &AppHandle, s: &State) -> Result<(), String> {
    fs::write(state_path(app), serde_json::to_string_pretty(s).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

pub fn default_save_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .document_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("Material Menu")
}

pub fn apply_window_settings(app: &AppHandle, win: &WebviewWindow) {
    let s = read_settings(app);
    let mode = s.get("windowMode").and_then(|v| v.as_str()).unwrap_or("remember");
    if mode == "maximized" {
        let _ = win.maximize();
        return;
    }
    if let Some(sz) = s.get("windowSize") {
        let w = sz.get("w").and_then(|v| v.as_f64()).unwrap_or(1100.0).clamp(780.0, 7680.0);
        let h = sz.get("h").and_then(|v| v.as_f64()).unwrap_or(720.0).clamp(560.0, 4320.0);
        let _ = win.set_size(tauri::LogicalSize::new(w, h));
        let _ = win.center();
    }
    if s.get("wasMaximized").and_then(|v| v.as_bool()).unwrap_or(false) {
        let _ = win.maximize();
    }
}

pub fn remember_window(app: &AppHandle, win: &WebviewWindow) {
    let mut s = read_settings(app);
    let mode = s.get("windowMode").and_then(|v| v.as_str()).unwrap_or("remember").to_string();
    if mode != "remember" {
        return;
    }
    let maximized = win.is_maximized().unwrap_or(false);
    let minimized = win.is_minimized().unwrap_or(false);
    if let Some(o) = s.as_object_mut() {
        if !maximized && !minimized {
            let scale = win.scale_factor().unwrap_or(1.0);
            if let Ok(sz) = win.inner_size() {
                let l = sz.to_logical::<f64>(scale);
                o.insert("windowSize".into(), json!({ "w": l.width.round(), "h": l.height.round() }));
            }
        }
        if !minimized {
            o.insert("wasMaximized".into(), json!(maximized));
        }
    }
    let _ = write_settings(app, &s);
}
