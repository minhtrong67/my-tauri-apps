// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request, Response};
#[cfg(desktop)]
use tauri::{Emitter, Manager};

/// Read a whole file and return it as a raw binary IPC response (no JSON overhead).
#[tauri::command]
fn read_file(path: String) -> Result<Response, String> {
    std::fs::read(&path)
        .map(Response::new)
        .map_err(|e| format!("{path}: {e}"))
}

/// Crash-safe write: data goes to a temp file next to the target (flushed to disk) and is then
/// renamed over it, so a power cut or error can never leave a half-written PDF behind.
fn write_atomic(path: &Path, data: &[u8]) -> std::io::Result<()> {
    let mut tmp: PathBuf = path.to_path_buf();
    let mut name = path.file_name().map(|n| n.to_os_string()).unwrap_or_default();
    name.push(".mpdf-tmp");
    tmp.set_file_name(name);
    let result = (|| {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(data)?;
        f.sync_all()?;
        drop(f);
        std::fs::rename(&tmp, path)
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&tmp);
    }
    result
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
        InvokeBody::Raw(data) => write_atomic(Path::new(&path), data).map_err(|e| format!("{path}: {e}")),
        _ => Err("expected a raw binary body".into()),
    }
}

/// File size in bytes.
#[tauri::command]
fn file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path).map(|m| m.len()).map_err(|e| e.to_string())
}

/// First existing .pdf among the command-line arguments (program name already skipped).
fn pick_pdf<'a>(mut args: impl Iterator<Item = &'a String>) -> Option<String> {
    args.find(|a| a.to_lowercase().ends_with(".pdf") && Path::new(a.as_str()).is_file())
        .cloned()
}

/// PDF path passed on the command line (double-click / "Open with").
#[tauri::command]
fn launch_file() -> Option<String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    pick_pdf(args.iter())
}

fn main() {
    let builder = tauri::Builder::default();

    // A second launch ("Open with" while Material PDF is already running) hands its file to the
    // running window instead of starting another process.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.unminimize();
            let _ = w.show();
            let _ = w.set_focus();
        }
        if let Some(path) = pick_pdf(args.iter().skip(1)) {
            let _ = app.emit("open-file", path);
        }
    }));

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_file, write_file, file_size, launch_file])
        .run(tauri::generate_context!())
        .expect("error while running Material PDF");
}
