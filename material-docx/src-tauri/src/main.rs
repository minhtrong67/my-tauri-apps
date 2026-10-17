// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_window_state::{Builder as WindowState, StateFlags};

/// Read a file and return its bytes as a base64 string.
#[tauri::command]
fn read_file_b64(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("{path}: {e}"))?;
    Ok(STANDARD.encode(bytes))
}

/// Write base64-encoded bytes to a file. The data is written to a temporary file first and then
/// renamed, so a crash while saving can never leave a half-written document behind.
#[tauri::command]
fn write_file_b64(path: String, data: String) -> Result<(), String> {
    let bytes = STANDARD.decode(data).map_err(|e| e.to_string())?;
    let target = PathBuf::from(&path);
    let mut tmp = target.clone().into_os_string();
    tmp.push(".mdtmp");
    let tmp = PathBuf::from(tmp);
    std::fs::write(&tmp, &bytes).map_err(|e| format!("{path}: {e}"))?;
    if let Err(e) = std::fs::rename(&tmp, &target) {
        // Some file systems refuse to replace an existing file: fall back to a plain write.
        let _ = std::fs::remove_file(&tmp);
        std::fs::write(&target, &bytes).map_err(|e2| format!("{path}: {e2} ({e})"))?;
    }
    Ok(())
}

/// File passed on the command line ("Open with…"), if it exists.
#[tauri::command]
fn initial_file() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|a| !a.starts_with('-') && Path::new(a).is_file())
}

/// Opens http(s)/mailto links in the default browser / mail client.
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    let ok = ["http://", "https://", "mailto:"].iter().any(|p| url.to_lowercase().starts_with(p));
    if !ok || url.chars().any(|c| c.is_control()) { return Err("unsupported link".into()); }
    #[cfg(target_os = "windows")]
    { use std::os::windows::process::CommandExt; std::process::Command::new("rundll32").args(["url.dll,FileProtocolHandler", &url]).creation_flags(0x08000000).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "macos")]
    { std::process::Command::new("open").arg(&url).spawn().map_err(|e| e.to_string())?; }
    #[cfg(all(unix, not(target_os = "macos")))]
    { std::process::Command::new("xdg-open").arg(&url).spawn().map_err(|e| e.to_string())?; }
    Ok(())
}

/// Which of the given paths still exist (used to prune the "recent documents" list).
#[tauri::command]
fn existing_files(paths: Vec<String>) -> Vec<String> {
    paths.into_iter().filter(|p| Path::new(p).is_file()).collect()
}

fn draft_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("autorecover.json"))
}

/// Stores the auto-recovery snapshot (JSON) in the app data folder — no storage quota like localStorage.
#[tauri::command]
fn draft_write(app: tauri::AppHandle, data: String) -> Result<(), String> {
    std::fs::write(draft_path(&app)?, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn draft_read(app: tauri::AppHandle) -> Option<String> {
    std::fs::read_to_string(draft_path(&app).ok()?).ok()
}

#[tauri::command]
fn draft_clear(app: tauri::AppHandle) {
    if let Ok(p) = draft_path(&app) {
        let _ = std::fs::remove_file(p);
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        // Remembers the window size / position / maximised state between launches. The VISIBLE flag is left
        // out on purpose: the UI shows the window itself once the layout is ready (no flash of an empty window).
        .plugin(
            WindowState::default()
                .with_state_flags(StateFlags::all() - StateFlags::VISIBLE)
                .build(),
        )
        .setup(|app| {
            // The window starts hidden and is shown by the UI once the saved layout is applied
            // (no flash from the default size to the remembered one). Safety net in case that never happens.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(6));
                if let Some(w) = handle.get_webview_window("main") {
                    let _ = w.show();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file_b64,
            write_file_b64,
            initial_file,
            existing_files,
            draft_write,
            draft_read,
            draft_clear,
            open_external
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Docx");
}
