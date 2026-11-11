use std::path::Path;
use std::time::Duration;
use tauri::window::{Color, Effect, EffectsBuilder};
use tauri::{Emitter, Manager, Theme, WebviewWindow};

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

/// Files passed on the command line (e.g. "Open with Fluent JSON").
#[tauri::command]
fn launch_files() -> Vec<String> {
    file_args(std::env::args())
}

/// Apply a Windows backdrop material to the window.
///
/// * `material` – `"mica"`, `"mica-alt"` (the "Tabbed" backdrop), `"acrylic"` or `"none"`.
/// * `theme`    – `"light"` / `"dark"` to force the window theme, or `None` to follow Windows.
///
/// Returns the material that is now active. Mica and Mica Alt need Windows 11; Acrylic works on
/// Windows 10 1809+ and Windows 11. On any other platform an error is returned and the frontend
/// falls back to solid surfaces.
#[tauri::command]
fn set_window_material(window: WebviewWindow, material: String, theme: Option<String>) -> Result<String, String> {
    let forced = match theme.as_deref() {
        Some("dark") => Some(Theme::Dark),
        Some("light") => Some(Theme::Light),
        _ => None,
    };
    // Keeps the title bar, Mica tone and the webview's colour scheme in step with the app theme.
    window.set_theme(forced).map_err(|e| e.to_string())?;
    let dark = match forced {
        Some(t) => t == Theme::Dark,
        None => window.theme().map(|t| t == Theme::Dark).unwrap_or(false),
    };

    let effects = match material.as_str() {
        "mica" => EffectsBuilder::new()
            .effect(if dark { Effect::MicaDark } else { Effect::MicaLight })
            .build(),
        "mica-alt" => EffectsBuilder::new()
            .effect(if dark { Effect::TabbedDark } else { Effect::TabbedLight })
            .build(),
        "acrylic" => EffectsBuilder::new()
            .effect(Effect::Acrylic)
            .color(if dark { Color(32, 32, 32, 140) } else { Color(243, 243, 243, 140) })
            .build(),
        "none" => {
            window.set_effects(None).map_err(|e| e.to_string())?;
            return Ok(material);
        }
        other => return Err(format!("unknown material: {other}")),
    };
    window.set_effects(effects).map_err(|e| e.to_string())?;
    Ok(material)
}

/// The accent colour chosen in Windows Settings as `#RRGGBB` (errors on other platforms).
#[tauri::command]
fn system_accent_color() -> Result<String, String> {
    #[cfg(windows)]
    {
        use winreg::enums::HKEY_CURRENT_USER;
        use winreg::RegKey;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        // AccentColorMenu is stored as 0xAABBGGRR.
        if let Ok(k) = hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent") {
            if let Ok(v) = k.get_value::<u32, _>("AccentColorMenu") {
                let (r, g, b) = (v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF);
                return Ok(format!("#{:02X}{:02X}{:02X}", r, g, b));
            }
        }
        // Fallback: the DWM colourisation colour, stored as 0xAARRGGBB.
        if let Ok(k) = hkcu.open_subkey("Software\\Microsoft\\Windows\\DWM") {
            if let Ok(v) = k.get_value::<u32, _>("ColorizationColor") {
                let (r, g, b) = ((v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF);
                return Ok(format!("#{:02X}{:02X}{:02X}", r, g, b));
            }
        }
        Err("accent colour not found".into())
    }
    #[cfg(not(windows))]
    {
        Err("only available on Windows".into())
    }
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
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            launch_files,
            set_window_material,
            system_accent_color
        ])
        .setup(|app| {
            // Safety net: the window starts hidden (the frontend reveals it once the saved size is applied).
            // If anything goes wrong in the webview, still show it after a short delay so the app can never stay invisible.
            if let Some(w) = app.get_webview_window("main") {
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(2200));
                    let _ = w.show();
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Fluent JSON");
}
