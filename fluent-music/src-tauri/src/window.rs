#![allow(unused_imports)]
use base64::{engine::general_purpose::STANDARD, Engine as _};
use lofty::picture::PictureType;
use lofty::prelude::*;
use lofty::tag::ItemKey;
use lofty::config::{ParseOptions, ParsingMode, WriteOptions};
use lofty::file::TaggedFile;
use lofty::probe::Probe;
use lofty::tag::Tag;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Component, Path, PathBuf};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use rayon::prelude::*;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, Window};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};
use walkdir::WalkDir;
use crate::{lyrics::*, scan::*, state::*, system::*, util::*, watch::*};

pub struct AppFlags {
    pub close_to_tray: AtomicBool,
}

pub fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

// ---------- lệnh ----------

/// Last "normal" (not maximized, not fullscreen, not mini) window geometry, in physical pixels.
#[derive(Serialize, Deserialize, Clone)]
pub struct WinState {
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub maximized: bool,
}

pub struct WinTracker {
    /// Disabled while the app is in fullscreen / mini-player mode so those sizes are never saved
    pub track: AtomicBool,
    pub dirty: AtomicBool,
    pub state: Mutex<Option<WinState>>,
}

pub fn window_state_path(app: &AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_data_dir().ok()?;
    fs::create_dir_all(&dir).ok()?;
    Some(dir.join("window.json"))
}

pub fn write_window_state(app: &AppHandle) {
    let tracker = app.state::<WinTracker>();
    let st = tracker.state.lock().ok().and_then(|g| g.clone());
    if let (Some(st), Some(path)) = (st, window_state_path(app)) {
        if let Ok(json) = serde_json::to_string(&st) {
            let _ = fs::write(path, json);
        }
    }
}

pub fn capture_window_state(window: &Window) -> Option<WinState> {
    let tracker = window.state::<WinTracker>();
    if !tracker.track.load(Ordering::Relaxed) {
        return None;
    }
    if window.is_fullscreen().unwrap_or(false) || window.is_minimized().unwrap_or(false) {
        return None;
    }
    let mut cur = tracker.state.lock().ok().and_then(|g| g.clone()).unwrap_or(WinState {
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        maximized: false,
    });
    if window.is_maximized().unwrap_or(false) {
        cur.maximized = true; // keep the previous normal size so "restore down" returns to it
        if cur.width == 0 {
            return None;
        }
    } else {
        let size = window.inner_size().ok()?;
        let pos = window.outer_position().ok()?;
        if pos.x <= -30000 || pos.y <= -30000 {
            return None; // Windows reports huge negative coordinates for minimized windows
        }
        cur = WinState { width: size.width, height: size.height, x: pos.x, y: pos.y, maximized: false };
    }
    Some(cur)
}

pub fn remember_window(window: &Window, flush: bool) {
    if let Some(st) = capture_window_state(window) {
        let tracker = window.state::<WinTracker>();
        if let Ok(mut g) = tracker.state.lock() {
            *g = Some(st);
        }
        if flush {
            write_window_state(window.app_handle());
            tracker.dirty.store(false, Ordering::Relaxed);
        } else {
            tracker.dirty.store(true, Ordering::Relaxed);
        }
    }
}

/// Is enough of the saved window visible on a connected monitor? (monitors may have been unplugged)
pub fn on_screen(w: &tauri::WebviewWindow, st: &WinState) -> bool {
    let Ok(monitors) = w.available_monitors() else { return true };
    if monitors.is_empty() {
        return true;
    }
    monitors.iter().any(|m| {
        let p = m.position();
        let s = m.size();
        let overlap_x = (st.x + st.width as i32).min(p.x + s.width as i32) - st.x.max(p.x);
        overlap_x >= 120 && st.y >= p.y - 20 && st.y <= p.y + s.height as i32 - 80
    })
}

#[derive(Serialize, Deserialize)]
pub struct Prefs {
    /// "remember" = restore the last window size/position, "maximized" = always open maximized
    #[serde(default = "default_start_mode")]
    pub start_mode: String,
    /// Window material: "mica" | "acrylic" | "mica-alt" (applied before the window is first shown)
    #[serde(default = "default_backdrop")]
    pub backdrop: String,
    /// Whether the app is currently in dark mode (Mica / Acrylic need to know)
    #[serde(default)]
    pub dark: bool,
}

pub fn default_backdrop() -> String {
    "mica".to_string()
}

fn normalize_backdrop(kind: &str) -> &'static str {
    match kind {
        "acrylic" => "acrylic",
        "mica-alt" => "mica-alt",
        _ => "mica",
    }
}

pub fn write_prefs(app: &AppHandle, prefs: &Prefs) {
    if let (Some(p), Ok(json)) = (prefs_path(app), serde_json::to_string(prefs)) {
        let _ = fs::write(p, json);
    }
}

#[cfg(windows)]
fn windows_build() -> u32 {
    windows_version::OsVersion::current().build
}

#[cfg(not(windows))]
fn windows_build() -> u32 {
    0
}

/// Which window materials this Windows build can draw
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackdropSupport {
    pub build: u32,
    pub mica: bool,
    pub mica_alt: bool,
    pub acrylic: bool,
}

#[tauri::command]
pub fn backdrop_support() -> BackdropSupport {
    let build = windows_build();
    BackdropSupport {
        build,
        mica: build >= 22000,
        mica_alt: build >= 22523,
        // window-vibrancy itself requires 17763 (Windows 10 1809)
        acrylic: build >= 17763,
    }
}

/// Applies the material and returns the one that really got applied ("none" = unsupported, the UI draws solid colours).
/// Fallbacks: mica-alt -> mica -> none, acrylic -> none, mica -> none. Must run on the main thread.
#[cfg(windows)]
pub fn apply_backdrop(w: &tauri::WebviewWindow, kind: &str, dark: bool) -> String {
    use window_vibrancy as v;
    // set_effects() would swallow errors, so window-vibrancy is called directly to learn whether the OS accepted it
    let _ = v::clear_mica(w);
    let _ = v::clear_tabbed(w);
    let _ = v::clear_acrylic(w);
    let _ = v::clear_blur(w);
    let tint: (u8, u8, u8, u8) = if dark { (32, 32, 32, 150) } else { (243, 243, 243, 150) };
    let chain: &[&str] = match normalize_backdrop(kind) {
        "mica-alt" => &["mica-alt", "mica"],
        "acrylic" => &["acrylic"],
        _ => &["mica"],
    };
    for k in chain {
        let ok = match *k {
            "mica-alt" => v::apply_tabbed(w, Some(dark)).is_ok(),
            "acrylic" => v::apply_acrylic(w, Some(tint)).is_ok(),
            _ => v::apply_mica(w, Some(dark)).is_ok(),
        };
        if ok {
            return (*k).to_string();
        }
    }
    "none".to_string()
}

#[cfg(not(windows))]
pub fn apply_backdrop(_w: &tauri::WebviewWindow, _kind: &str, _dark: bool) -> String {
    "none".to_string()
}

/// Settings -> "Window material". Sync command = runs on the main thread, as the Win32 calls require.
#[tauri::command]
pub fn set_backdrop(app: AppHandle, kind: String, dark: bool) -> Result<String, String> {
    let kind = normalize_backdrop(&kind);
    let mut prefs = read_prefs(&app);
    if prefs.backdrop != kind || prefs.dark != dark {
        prefs.backdrop = kind.to_string();
        prefs.dark = dark;
        write_prefs(&app, &prefs);
    }
    let w = app.get_webview_window("main").ok_or_else(|| "main window not found".to_string())?;
    Ok(apply_backdrop(&w, kind, dark))
}

pub fn default_start_mode() -> String {
    "remember".to_string()
}

pub fn prefs_path(app: &AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_data_dir().ok()?;
    fs::create_dir_all(&dir).ok()?;
    Some(dir.join("prefs.json"))
}

pub fn read_prefs(app: &AppHandle) -> Prefs {
    prefs_path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn restore_window_state(app: &AppHandle) {
    let Some(w) = app.get_webview_window("main") else { return };
    if let Some(path) = window_state_path(app) {
        if let Ok(txt) = fs::read_to_string(path) {
            if let Ok(st) = serde_json::from_str::<WinState>(&txt) {
                if st.width >= 300 && st.height >= 200 {
                    let _ = w.set_size(tauri::PhysicalSize::new(st.width, st.height));
                    if on_screen(&w, &st) {
                        let _ = w.set_position(tauri::PhysicalPosition::new(st.x, st.y));
                    } else {
                        let _ = w.center();
                    }
                    if st.maximized {
                        let _ = w.maximize();
                    }
                    if let Ok(mut g) = app.state::<WinTracker>().state.lock() {
                        *g = Some(st);
                    }
                }
            }
        }
    }
    let prefs = read_prefs(app);
    // material first, so the very first frame already shows it
    apply_backdrop(&w, &prefs.backdrop, prefs.dark);
    if prefs.start_mode == "maximized" {
        let _ = w.maximize(); // the remembered normal size is kept for "restore down"
    }
    // the window stays hidden until the frontend calls `app_ready` (see tauri.conf.json), so there is no white flash
}

#[tauri::command]
pub fn set_window_tracking(tracker: State<WinTracker>, enabled: bool) {
    tracker.track.store(enabled, Ordering::Relaxed);
}

/// "Window when the app opens" option (read at startup, before the window is shown)
#[tauri::command]
pub fn set_start_mode(app: AppHandle, mode: String) {
    let mut prefs = read_prefs(&app);
    prefs.start_mode = (if mode == "maximized" { "maximized" } else { "remember" }).to_string();
    write_prefs(&app, &prefs);
}

/// Frontend finished its first paint: reveal the window (it is created hidden, so no white flash)
pub struct Ready(pub AtomicBool);

#[tauri::command]
pub fn app_ready(app: AppHandle, ready: State<Ready>) {
    if !ready.0.swap(true, Ordering::SeqCst) {
        show_main(&app);
    }
}

pub struct TrayItems {
    pub show: MenuItem<tauri::Wry>,
    pub toggle: MenuItem<tauri::Wry>,
    pub prev: MenuItem<tauri::Wry>,
    pub next: MenuItem<tauri::Wry>,
    pub quit: MenuItem<tauri::Wry>,
}

/// Translate the tray menu (labels: show, play/pause, previous, next, quit)
#[tauri::command]
pub fn set_tray_labels(items: State<TrayItems>, labels: Vec<String>) {
    if labels.len() >= 5 {
        let _ = items.show.set_text(&labels[0]);
        let _ = items.toggle.set_text(&labels[1]);
        let _ = items.prev.set_text(&labels[2]);
        let _ = items.next.set_text(&labels[3]);
        let _ = items.quit.set_text(&labels[4]);
    }
}

#[tauri::command]
pub fn set_close_to_tray(flags: State<AppFlags>, enabled: bool) {
    flags.close_to_tray.store(enabled, Ordering::Relaxed);
}

impl Default for Prefs {
    fn default() -> Self {
        Prefs { start_mode: default_start_mode(), backdrop: default_backdrop(), dark: false }
    }
}
