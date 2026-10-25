//! Material Xlsx - Tauri backend.
//! The spreadsheet engine lives in the web front-end; Rust provides file access (binary IPC),
//! the clipboard, crash-recovery drafts, single-instance handling and window-state persistence.

use percent_encoding::percent_decode_str;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{Emitter, Manager};
use tauri_plugin_window_state::StateFlags;

const DOC_EXT: [&str; 8] = ["xlsx", "xlsm", "xltx", "xltm", "csv", "tsv", "txt", "json"];

fn err<E: ToString>(e: E) -> String {
    e.to_string()
}

/// Only spreadsheet-like files may be read or written through the IPC bridge.
fn checked(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    let ext = p.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).unwrap_or_default();
    if DOC_EXT.contains(&ext.as_str()) {
        Ok(p)
    } else {
        Err(format!("{path}: unsupported file type"))
    }
}

fn header(req: &Request<'_>, name: &str) -> Result<String, String> {
    let v = req.headers().get(name).and_then(|v| v.to_str().ok()).ok_or_else(|| format!("missing header {name}"))?;
    Ok(percent_decode_str(v).decode_utf8_lossy().into_owned())
}

/// Writes next to the target first so a failed save never corrupts the existing file.
fn write_atomic(target: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = PathBuf::from(format!("{}.tmp", target.display()));
    match std::fs::write(&tmp, bytes).and_then(|_| std::fs::rename(&tmp, target)) {
        Ok(()) => Ok(()),
        Err(_) => {
            let _ = std::fs::remove_file(&tmp);
            std::fs::write(target, bytes).map_err(|e| format!("{}: {e}", target.display()))
        }
    }
}

/// Raw bytes (no base64): returned to JS as an ArrayBuffer.
#[tauri::command]
fn read_file(path: String) -> Result<Response, String> {
    let p = checked(&path)?;
    let bytes = std::fs::read(&p).map_err(|e| format!("{path}: {e}"))?;
    Ok(Response::new(bytes))
}

/// Body = file bytes, header `x-path` = percent-encoded target path.
#[tauri::command]
fn write_file(request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err("invalid payload".into()) };
    let path = header(&request, "x-path")?;
    write_atomic(&checked(&path)?, bytes)
}

#[tauri::command]
fn read_clipboard() -> Result<String, String> {
    arboard::Clipboard::new().map_err(err)?.get_text().map_err(err)
}

#[tauri::command]
fn write_clipboard(text: String) -> Result<(), String> {
    arboard::Clipboard::new().map_err(err)?.set_text(text).map_err(err)
}

fn first_doc<I: Iterator<Item = String>>(args: I) -> Option<String> {
    args.skip(1).find(|a| checked(a).is_ok() && Path::new(a).exists())
}

/// A spreadsheet path passed on the command line ("Open with" / double click), if any.
#[tauri::command]
fn get_launch_file() -> Option<String> {
    first_doc(std::env::args())
}

#[tauri::command]
fn reveal_file(path: String) -> Result<(), String> {
    checked(&path)?;
    tauri_plugin_opener::reveal_item_in_dir(path).map_err(err)
}

// ───────── crash-recovery draft (autosave) ─────────
fn draft_paths(app: &tauri::AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let dir = app.path().app_local_data_dir().map_err(err)?.join("drafts");
    std::fs::create_dir_all(&dir).map_err(err)?;
    Ok((dir.join("draft.xlsx"), dir.join("draft.json")))
}

/// Body = xlsx bytes, header `x-meta` = percent-encoded JSON ({name, path}).
#[tauri::command]
fn save_draft(app: tauri::AppHandle, request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err("invalid payload".into()) };
    let meta = header(&request, "x-meta")?;
    let (data, info) = draft_paths(&app)?;
    write_atomic(&data, bytes)?;
    std::fs::write(info, meta).map_err(err)
}

/// Meta JSON of the pending draft, if one exists.
#[tauri::command]
fn draft_info(app: tauri::AppHandle) -> Option<String> {
    let (data, info) = draft_paths(&app).ok()?;
    if data.exists() { std::fs::read_to_string(info).ok() } else { None }
}

#[tauri::command]
fn read_draft(app: tauri::AppHandle) -> Result<Response, String> {
    let (data, _) = draft_paths(&app)?;
    Ok(Response::new(std::fs::read(data).map_err(err)?))
}

#[tauri::command]
fn clear_draft(app: tauri::AppHandle) {
    if let Ok((data, info)) = draft_paths(&app) {
        let _ = std::fs::remove_file(data);
        let _ = std::fs::remove_file(info);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // A second launch (e.g. double-clicking another .xlsx) focuses this window and hands over the file.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
            if let Some(p) = first_doc(args.into_iter()) {
                let _ = app.emit("open-file", p);
            }
        }));
    }

    builder
        // Remembers the window size / position / maximised state between launches.
        // Full screen is handled by the app's own "always start in full screen" setting.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // The window starts hidden (no size flash); the UI shows it once ready.
            // Safety net in case the front-end fails to start.
            if let Some(win) = app.get_webview_window("main") {
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = win.show();
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            read_clipboard,
            write_clipboard,
            get_launch_file,
            reveal_file,
            save_draft,
            draft_info,
            read_draft,
            clear_draft
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Xlsx");
}
