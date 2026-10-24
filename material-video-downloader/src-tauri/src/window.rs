//! Window behaviour: remember the last size, or always open maximized.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, LogicalSize, Manager, WindowEvent};

static GENERATION: AtomicU64 = AtomicU64::new(0);

#[derive(Serialize, Deserialize, Clone, Default)]
struct WinState {
    width: f64,
    height: f64,
    maximized: bool,
}

fn state_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|d| d.join("window.json"))
}

fn load(app: &AppHandle) -> Option<WinState> {
    let text = std::fs::read_to_string(state_path(app)?).ok()?;
    serde_json::from_str(&text).ok()
}

fn save(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else { return };
    if window.is_minimized().unwrap_or(false) {
        return;
    }
    let previous = load(app).unwrap_or_default();
    let maximized = window.is_maximized().unwrap_or(false);
    let state = if maximized {
        WinState { maximized: true, ..previous }
    } else {
        let scale = window.scale_factor().unwrap_or(1.0);
        match window.inner_size() {
            Ok(size) => {
                let logical = size.to_logical::<f64>(scale);
                WinState { width: logical.width, height: logical.height, maximized: false }
            }
            Err(_) => previous,
        }
    };
    if let (Some(path), Ok(json)) = (state_path(app), serde_json::to_string(&state)) {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(path, json);
    }
}

/// Apply the chosen window mode and reveal the window (it starts hidden to avoid flicker).
pub fn apply_startup(app: &AppHandle, mode: &str) {
    let Some(window) = app.get_webview_window("main") else { return };
    if mode == "maximized" {
        let _ = window.maximize();
    } else if let Some(state) = load(app) {
        if state.maximized {
            let _ = window.maximize();
        } else if state.width >= 600.0 && state.height >= 400.0 {
            let _ = window.set_size(LogicalSize::new(state.width, state.height));
            let _ = window.center();
        }
    }
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn on_event(window: &tauri::Window, event: &WindowEvent) {
    if window.label() != "main" {
        return;
    }
    match event {
        WindowEvent::Resized(_) => {
            let app = window.app_handle().clone();
            let generation = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(600));
                if GENERATION.load(Ordering::SeqCst) == generation {
                    save(&app);
                }
            });
        }
        WindowEvent::CloseRequested { .. } => save(window.app_handle()),
        _ => {}
    }
}
