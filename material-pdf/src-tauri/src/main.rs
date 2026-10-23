// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::ipc::{InvokeBody, Request, Response};

/// Read a whole file and return it as a raw binary IPC response (no JSON overhead).
#[tauri::command]
fn read_file(path: String) -> Result<Response, String> {
    std::fs::read(&path)
        .map(Response::new)
        .map_err(|e| format!("{path}: {e}"))
}

/// Write raw bytes to the path given (percent-encoded) in the `x-path` header.
#[tauri::command]
fn write_file(request: Request<'_>) -> Result<(), String> {
    let raw = request
        .headers()
        .get("x-path")
        .and_then(|v| v.to_str().ok())
        .ok_or("missing x-path header")?;
    let path = urlencoding::decode(raw).map_err(|e| e.to_string())?.into_owned();
    match request.body() {
        InvokeBody::Raw(data) => std::fs::write(&path, data).map_err(|e| format!("{path}: {e}")),
        _ => Err("expected a raw binary body".into()),
    }
}

/// File size in bytes.
#[tauri::command]
fn file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path).map(|m| m.len()).map_err(|e| e.to_string())
}

/// PDF path passed on the command line (double-click / "Open with").
#[tauri::command]
fn launch_file() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|a| a.to_lowercase().ends_with(".pdf") && std::path::Path::new(a).is_file())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_file, write_file, file_size, launch_file])
        .run(tauri::generate_context!())
        .expect("error while running Material PDF");
}
