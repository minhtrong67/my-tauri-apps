// Hide the extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod files;

use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{Emitter, Manager};

#[derive(Serialize)]
struct FileData {
    /// File content, always normalised to `\n` line endings.
    content: String,
    /// Original line ending style: `"crlf"` or `"lf"`.
    eol: String,
    /// Detected (or requested) encoding id, e.g. `utf-8`, `utf-16le`, `windows-1252`.
    encoding: String,
    /// Modification time in ms since the Unix epoch (used to detect outside changes).
    mtime: u64,
}

/// Reads a text file. The encoding is detected unless one is requested ("Reopen with encoding").
#[tauri::command]
fn read_text_file(path: String, encoding: Option<String>) -> Result<FileData, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    let d = files::decode(&bytes, encoding.as_deref());
    Ok(FileData {
        eol: files::eol_of(&d.text).to_string(),
        content: files::normalise(&d.text),
        encoding: d.encoding,
        mtime: files::mtime_ms(Path::new(&path)).unwrap_or(0),
    })
}

/// Writes a text file atomically with the requested line endings and encoding.
/// Returns the new modification time.
#[tauri::command]
fn write_text_file(
    path: String,
    content: String,
    eol: String,
    encoding: String,
) -> Result<u64, String> {
    let bytes = files::encode(&files::apply_eol(&content, &eol), &encoding)?;
    files::write_atomic(Path::new(&path), &bytes)?;
    Ok(files::mtime_ms(Path::new(&path)).unwrap_or(0))
}

/// Modification time of a file (None when it does not exist any more).
#[tauri::command]
fn file_mtime(path: String) -> Option<u64> {
    files::mtime_ms(Path::new(&path))
}

/// Existing files among the given arguments (relative ones are resolved against `cwd`).
fn existing_files<I: IntoIterator<Item = String>>(args: I, cwd: Option<&Path>) -> Vec<String> {
    args.into_iter()
        .filter_map(|a| {
            let p = PathBuf::from(&a);
            let p = if p.is_absolute() {
                p
            } else {
                cwd.map(|c| c.join(&p)).unwrap_or(p)
            };
            p.is_file().then(|| p.to_string_lossy().into_owned())
        })
        .collect()
}

/// Files passed on the command line (e.g. "Open with" or double-click).
#[tauri::command]
fn startup_files() -> Vec<String> {
    existing_files(std::env::args().skip(1), None)
}

/// Opens the project page in the default browser (only links to the author's GitHub are allowed).
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://github.com/minhtrong67/") {
        return Err("This link is not allowed".into());
    }
    #[cfg(windows)]
    let r = std::process::Command::new("rundll32")
        .args(["url.dll,FileProtocolHandler", &url])
        .spawn();
    #[cfg(target_os = "macos")]
    let r = std::process::Command::new("open").arg(&url).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let r = std::process::Command::new("xdg-open").arg(&url).spawn();
    r.map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(windows)]
mod cursor {
    #[repr(C)]
    pub struct Point {
        pub x: i32,
        pub y: i32,
    }

    #[link(name = "user32")]
    extern "system" {
        pub fn GetCursorPos(point: *mut Point) -> i32;
        pub fn SetCursorPos(x: i32, y: i32) -> i32;
        pub fn ShowCursor(show: i32) -> i32;
    }

    pub fn reveal() {
        unsafe {
            // read the display counter (+1 then -1), then raise it to >= 0
            ShowCursor(1);
            let mut count = ShowCursor(0);
            let mut guard = 0;
            while count < 0 && guard < 32 {
                count = ShowCursor(1);
                guard += 1;
            }
            // a 1px nudge and back counts as mouse movement and un-hides the pointer
            let mut p = Point { x: 0, y: 0 };
            if GetCursorPos(&mut p) != 0 {
                SetCursorPos(p.x + 1, p.y);
                SetCursorPos(p.x, p.y);
            }
        }
    }
}

/// Called around native file dialogs. Synchronous, so it runs on the main thread.
#[tauri::command]
fn reveal_cursor() {
    #[cfg(windows)]
    cursor::reveal();
}

fn main() {
    let builder = tauri::Builder::default();

    // A second launch (e.g. double-clicking another .txt) hands its files to the running window.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
        let list = existing_files(args.into_iter().skip(1), Some(Path::new(&cwd)));
        let _ = app.emit("open-files", list);
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    }));

    builder
        .setup(|app| {
            // The window starts hidden and the page shows it after the first paint (no
            // white flash). This is a safety net in case the page never signals readiness.
            if let Some(window) = app.get_webview_window("main") {
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let _ = window.show();
                });
            }
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            file_mtime,
            startup_files,
            open_url,
            reveal_cursor
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Note");
}
