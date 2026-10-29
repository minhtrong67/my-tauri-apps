use std::path::Path;
use std::time::Duration;
use tauri::{Emitter, Manager};

/// Read a text file as UTF-8 (BOM stripped, invalid bytes replaced).
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("{path}: {e}"))?;
    let slice = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(&bytes[..]);
    Ok(String::from_utf8_lossy(slice).into_owned())
}

/// Write a text file as UTF-8 (creates parent folders when missing).
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    if let Some(dir) = Path::new(&path).parent() {
        if !dir.as_os_str().is_empty() {
            std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
    }
    std::fs::write(&path, content).map_err(|e| format!("{path}: {e}"))
}

fn file_args<I: IntoIterator<Item = String>>(args: I) -> Vec<String> {
    args.into_iter()
        .skip(1)
        .filter(|a| !a.starts_with('-') && Path::new(a).is_file())
        .collect()
}

/// Files passed on the command line (e.g. "Open with Material JSON").
#[tauri::command]
fn launch_files() -> Vec<String> {
    file_args(std::env::args())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // A second launch (double-clicking another .json) is forwarded to the running window.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let files = file_args(args);
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
            if !files.is_empty() {
                let _ = app.emit("open-files", files);
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_text_file, write_text_file, launch_files])
        .setup(|app| {
            // Safety net: the window starts hidden (the frontend reveals it once the saved size is applied).
            // If anything goes wrong in the webview, still show it after a short delay so the app can never stay invisible.
            if let Some(w) = app.get_webview_window("main") {
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(1800));
                    let _ = w.show();
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Material JSON");
}
