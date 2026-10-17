use base64::{engine::general_purpose::STANDARD, Engine};
use encoding_rs::Encoding;
use serde::Serialize;
use std::path::Path;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_window_state::StateFlags;

const TEXT_EXT: [&str; 4] = ["csv", "tsv", "txt", "tab"];
const SHEET_EXT: [&str; 4] = ["xlsx", "xlsm", "xls", "ods"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Opened {
    path: String,
    name: String,
    size: u64,
    /// "text" for delimited text, "sheet" for spreadsheet formats (data is base64).
    kind: String,
    text: String,
    data: String,
    encoding: String,
    bom: bool,
}

fn ext_of(p: &str) -> String {
    Path::new(p)
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

fn is_supported(p: &str) -> bool {
    let e = ext_of(p);
    (TEXT_EXT.contains(&e.as_str()) || SHEET_EXT.contains(&e.as_str())) && Path::new(p).is_file()
}

/// Decodes bytes. `forced` is an encoding label chosen by the user; otherwise BOM and UTF-8 are sniffed.
fn decode(bytes: &[u8], forced: Option<&str>) -> Result<(String, String, bool), String> {
    let bom = bytes.starts_with(&[0xEF, 0xBB, 0xBF])
        || bytes.starts_with(&[0xFF, 0xFE])
        || bytes.starts_with(&[0xFE, 0xFF]);
    if let Some(label) = forced.filter(|l| !l.is_empty() && !l.eq_ignore_ascii_case("auto")) {
        let enc = Encoding::for_label(label.as_bytes()).ok_or_else(|| format!("Unknown encoding: {label}"))?;
        let (text, _) = enc.decode_with_bom_removal(bytes);
        return Ok((text.into_owned(), enc.name().to_string(), bom));
    }
    if bom {
        let (text, enc, _) = encoding_rs::Encoding::decode(
            encoding_rs::UTF_8, // fallback if no BOM matches
            bytes,
        );
        return Ok((text.into_owned(), enc.name().to_string(), true));
    }
    match std::str::from_utf8(bytes) {
        Ok(s) => Ok((s.to_string(), "UTF-8".into(), false)),
        Err(_) => {
            let (text, _) = encoding_rs::WINDOWS_1252.decode_without_bom_handling(bytes);
            Ok((text.into_owned(), "windows-1252".into(), false))
        }
    }
}

fn read(path: &str, encoding: Option<&str>) -> Result<Opened, String> {
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    let name = Path::new(path)
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    let size = bytes.len() as u64;
    if SHEET_EXT.contains(&ext_of(path).as_str()) {
        return Ok(Opened {
            path: path.into(),
            name,
            size,
            kind: "sheet".into(),
            text: String::new(),
            data: STANDARD.encode(&bytes),
            encoding: "UTF-8".into(),
            bom: false,
        });
    }
    let (text, enc, bom) = decode(&bytes, encoding)?;
    Ok(Opened { path: path.into(), name, size, kind: "text".into(), text, data: String::new(), encoding: enc, bom })
}

/// Files passed on the command line when Windows opens a file with this app.
#[tauri::command]
fn startup_files() -> Vec<String> {
    std::env::args().skip(1).filter(|a| is_supported(a)).collect()
}

/// Reads a CSV/TSV/text file (decoded) or a spreadsheet (base64 bytes).
#[tauri::command]
fn open_file(path: String, encoding: Option<String>) -> Result<Opened, String> {
    read(&path, encoding.as_deref())
}

/// Writes text to disk using the requested encoding. UTF-16 is encoded manually because
/// encoding_rs only decodes it.
#[tauri::command]
fn write_text(path: String, text: String, encoding: String, bom: bool) -> Result<u64, String> {
    let label = encoding.to_lowercase();
    let bytes: Vec<u8> = match label.as_str() {
        "utf-8" | "utf8" => {
            let mut v = Vec::with_capacity(text.len() + 3);
            if bom {
                v.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
            }
            v.extend_from_slice(text.as_bytes());
            v
        }
        "utf-16le" | "utf-16be" => {
            let le = label == "utf-16le";
            let mut v = Vec::with_capacity(text.len() * 2 + 2);
            if bom {
                let mark: [u8; 2] = if le { [0xFF, 0xFE] } else { [0xFE, 0xFF] };
                v.extend_from_slice(&mark);
            }
            for u in text.encode_utf16() {
                v.extend_from_slice(&if le { u.to_le_bytes() } else { u.to_be_bytes() });
            }
            v
        }
        _ => {
            let enc = Encoding::for_label(label.as_bytes()).ok_or_else(|| format!("Unknown encoding: {encoding}"))?;
            let (cow, _, unmappable) = enc.encode(&text);
            if unmappable {
                return Err("unmappable".into());
            }
            cow.into_owned()
        }
    };
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    Ok(bytes.len() as u64)
}

/// Writes base64 encoded binary data (xlsx exports).
#[tauri::command]
fn write_bytes(path: String, data: String) -> Result<u64, String> {
    let bytes = STANDARD.decode(data).map_err(|e| e.to_string())?;
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    Ok(bytes.len() as u64)
}

/// Shows the file in Windows Explorer.
#[tauri::command]
fn reveal(path: String) {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer").arg(format!("/select,{}", path)).spawn();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch forwards its files to the running window.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
            let files: Vec<String> = args.iter().skip(1).filter(|a| is_supported(a)).cloned().collect();
            if !files.is_empty() {
                let _ = app.emit("open-files", files);
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        // Remembers size, position and maximized state. Fullscreen is controlled by the app setting.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .build(),
        )
        .setup(|app| {
            // The window starts hidden to avoid a white flash; the UI shows it once rendered.
            // This fallback guarantees it can never stay hidden.
            let handle: AppHandle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(3000));
                if let Some(w) = handle.get_webview_window("main") {
                    let _ = w.show();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![startup_files, open_file, write_text, write_bytes, reveal])
        .run(tauri::generate_context!())
        .expect("error while running Material CSV");
}
