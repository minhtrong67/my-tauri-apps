//! Fluent Folder Icon backend.
//!
//! Icons are applied with the native Windows `desktop.ini` mechanism, so they
//! survive restarts and travel with the folder.

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_window_state::StateFlags;

const ICO_PREFIX: &str = "fluent-folder-icon-";
const ATTR_READONLY: u32 = 0x1;
const ATTR_HIDDEN: u32 = 0x2;
const ATTR_SYSTEM: u32 = 0x4;
const ATTR_NORMAL: u32 = 0x80;

// ---------------------------------------------------------------- Win32 glue

#[cfg(windows)]
mod win {
    use std::{os::windows::ffi::OsStrExt, path::Path, ptr};
    use windows_sys::Win32::Storage::FileSystem::{GetFileAttributesW, SetFileAttributesW};
    use windows_sys::Win32::UI::Shell::SHChangeNotify;

    fn wide(p: &Path) -> Vec<u16> {
        p.as_os_str().encode_wide().chain(std::iter::once(0)).collect()
    }

    pub fn attrs(p: &Path) -> u32 {
        unsafe { GetFileAttributesW(wide(p).as_ptr()) }
    }

    pub fn set_attrs(p: &Path, a: u32) {
        unsafe {
            SetFileAttributesW(wide(p).as_ptr(), a);
        }
    }

    const FLUSHED_PATH: u32 = 0x1005; // SHCNF_PATHW | SHCNF_FLUSH

    /// Ask Explorer to redraw one folder (and its parent) right now.
    pub fn notify(p: &Path) {
        unsafe {
            let w = wide(p);
            SHChangeNotify(0x0000_0800, FLUSHED_PATH, w.as_ptr() as *const _, ptr::null()); // SHCNE_ATTRIBUTES
            SHChangeNotify(0x0000_2000, FLUSHED_PATH, w.as_ptr() as *const _, ptr::null()); // SHCNE_UPDATEITEM
            if let Some(parent) = p.parent() {
                let pw = wide(parent);
                SHChangeNotify(0x0000_1000, FLUSHED_PATH, pw.as_ptr() as *const _, ptr::null()); // SHCNE_UPDATEDIR
            }
        }
    }

    /// Global "associations changed" broadcast: makes every Explorer window reload its icons.
    pub fn notify_assoc() {
        unsafe {
            SHChangeNotify(0x0800_0000, 0x1000, ptr::null(), ptr::null()); // SHCNE_ASSOCCHANGED | SHCNF_FLUSH
        }
    }
}

#[cfg(not(windows))]
mod win {
    use std::path::Path;
    pub fn attrs(_: &Path) -> u32 {
        u32::MAX
    }
    pub fn set_attrs(_: &Path, _: u32) {}
    pub fn notify(_: &Path) {}
    pub fn notify_assoc() {}
}

fn add_attrs(p: &Path, flags: u32) {
    let a = win::attrs(p);
    if a != u32::MAX {
        win::set_attrs(p, a | flags);
    }
}

fn remove_attrs(p: &Path, flags: u32) {
    let a = win::attrs(p);
    if a != u32::MAX {
        let next = a & !flags;
        win::set_attrs(p, if next == 0 { ATTR_NORMAL } else { next });
    }
}

// ---------------------------------------------------------------- desktop.ini

fn ini_path(dir: &Path) -> PathBuf {
    dir.join("desktop.ini")
}

fn read_ini(p: &Path) -> String {
    match fs::read(p) {
        Ok(b) if b.starts_with(&[0xFF, 0xFE]) => {
            let u: Vec<u16> = b[2..]
                .chunks_exact(2)
                .map(|c| u16::from_le_bytes([c[0], c[1]]))
                .collect();
            String::from_utf16_lossy(&u)
        }
        Ok(b) => String::from_utf8_lossy(&b).trim_start_matches('\u{feff}').to_string(),
        Err(_) => String::new(),
    }
}

fn write_ini(p: &Path, lines: &[String]) -> Result<(), String> {
    let text = format!("{}\r\n", lines.join("\r\n"));
    let mut bytes: Vec<u8> = vec![0xFF, 0xFE];
    for u in text.encode_utf16() {
        bytes.extend_from_slice(&u.to_le_bytes());
    }
    remove_attrs(p, ATTR_READONLY | ATTR_HIDDEN | ATTR_SYSTEM);
    // Delete first, then recreate: this also drops any "Mark of the Web" stream the old file carried,
    // which recent Windows 11 updates use to decide whether to ignore a desktop.ini.
    let _ = fs::remove_file(p);
    fs::write(p, bytes).map_err(|e| format!("desktop.ini: {e}"))?;
    win::set_attrs(p, ATTR_HIDDEN | ATTR_SYSTEM);
    Ok(())
}

/// Existing desktop.ini lines without any icon keys and blank lines.
fn strip_icon_keys(ini: &str) -> Vec<String> {
    ini.lines()
        .map(|l| l.trim_end().to_string())
        .filter(|l| {
            let k = l.trim().to_ascii_lowercase();
            !k.is_empty()
                && !(k.starts_with("iconresource=")
                    || k.starts_with("iconfile=")
                    || k.starts_with("iconindex="))
        })
        .collect()
}

fn is_header(l: &str) -> bool {
    l.trim().eq_ignore_ascii_case("[.ShellClassInfo]")
}

fn remove_old_icons(dir: &Path) {
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if name.starts_with(ICO_PREFIX) && name.ends_with(".ico") {
                let p = e.path();
                win::set_attrs(&p, ATTR_NORMAL);
                let _ = fs::remove_file(p);
            }
        }
    }
}

// ---------------------------------------------------------------- commands

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FolderInfo {
    path: String,
    name: String,
    is_dir: bool,
    customized: bool,
}

#[tauri::command]
fn inspect_folders(paths: Vec<String>) -> Vec<FolderInfo> {
    paths
        .into_iter()
        .map(|p| {
            let path = Path::new(&p);
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| p.clone());
            let is_dir = path.is_dir();
            let customized = is_dir && read_ini(&ini_path(path)).contains(ICO_PREFIX);
            FolderInfo { path: p, name, is_dir, customized }
        })
        .collect()
}

#[tauri::command]
fn apply_icon(path: String, data: String) -> Result<(), String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("Not a folder: {path}"));
    }
    let bytes = STANDARD.decode(data).map_err(|e| e.to_string())?;

    // A fresh file name each time defeats Explorer's icon cache.
    remove_old_icons(&dir);
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let ico_name = format!("{ICO_PREFIX}{stamp}.ico");
    let ico = dir.join(&ico_name);
    fs::write(&ico, &bytes).map_err(|e| format!("{ico_name}: {e}"))?;
    win::set_attrs(&ico, ATTR_HIDDEN | ATTR_SYSTEM);

    let ini = ini_path(&dir);
    let mut lines = strip_icon_keys(&read_ini(&ini));
    let header_at = match lines.iter().position(|l| is_header(l)) {
        Some(i) => i,
        None => {
            lines.insert(0, "[.ShellClassInfo]".to_string());
            0
        }
    };
    lines.insert(header_at + 1, "IconIndex=0".to_string());
    lines.insert(header_at + 1, format!("IconFile={ico_name}"));
    lines.insert(header_at + 1, format!("IconResource={ico_name},0"));
    write_ini(&ini, &lines)?;

    // Toggle the attribute with a notification in between so Explorer re-reads desktop.ini.
    remove_attrs(&dir, ATTR_READONLY);
    win::notify(&dir);
    add_attrs(&dir, ATTR_READONLY);
    win::notify(&dir);
    Ok(())
}

#[tauri::command]
fn restore_icon(path: String) -> Result<(), String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("Not a folder: {path}"));
    }
    remove_old_icons(&dir);
    let ini = ini_path(&dir);
    if ini.exists() {
        let lines = strip_icon_keys(&read_ini(&ini));
        let meaningful = lines.iter().any(|l| !is_header(l));
        if meaningful {
            write_ini(&ini, &lines)?;
        } else {
            win::set_attrs(&ini, ATTR_NORMAL);
            fs::remove_file(&ini).map_err(|e| format!("desktop.ini: {e}"))?;
            remove_attrs(&dir, ATTR_READONLY);
        }
    }
    win::notify(&dir);
    Ok(())
}

/// Call once after a batch: refreshes the shell icon cache so changes show without restarting Explorer.
#[tauri::command]
fn refresh_shell() {
    win::notify_assoc();
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // "ie4uinit -show" rebuilds the icon cache; hidden window, fire and forget.
        let _ = std::process::Command::new("ie4uinit.exe")
            .arg("-show")
            .creation_flags(0x0800_0000)
            .spawn();
    }
}

/// Last resort when icons still look stale: restart the Explorer shell (Windows relaunches it by itself).
#[tauri::command]
fn restart_explorer() -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("taskkill")
            .args(["/f", "/im", "explorer.exe"])
            .creation_flags(0x0800_0000)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(not(windows))]
    Err("Windows only.".into())
}

#[tauri::command]
fn save_bytes(path: String, data: String) -> Result<(), String> {
    let bytes = STANDARD.decode(data).map_err(|e| e.to_string())?;
    fs::write(path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

/// Folders passed on the command line (e.g. from the Explorer context menu).
#[tauri::command]
fn take_launch_paths() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|a| Path::new(a).is_dir())
        .collect()
}

// ---------------------------------------------------------------- context menu

#[cfg(windows)]
const MENU_KEY: &str = "Software\\Classes\\Directory\\shell\\FluentFolderIcon";

#[tauri::command]
fn get_context_menu() -> bool {
    #[cfg(windows)]
    {
        use winreg::{enums::HKEY_CURRENT_USER, RegKey};
        return RegKey::predef(HKEY_CURRENT_USER).open_subkey(MENU_KEY).is_ok();
    }
    #[cfg(not(windows))]
    false
}

#[tauri::command]
fn set_context_menu(enabled: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        use winreg::{enums::HKEY_CURRENT_USER, RegKey};
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if enabled {
            let exe = std::env::current_exe()
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .to_string();
            let (k, _) = hkcu.create_subkey(MENU_KEY).map_err(|e| e.to_string())?;
            k.set_value("", &"Customize with Fluent Folder Icon")
                .map_err(|e| e.to_string())?;
            k.set_value("Icon", &format!("\"{exe}\",0"))
                .map_err(|e| e.to_string())?;
            let (c, _) = hkcu
                .create_subkey(format!("{MENU_KEY}\\command"))
                .map_err(|e| e.to_string())?;
            c.set_value("", &format!("\"{exe}\" \"%1\""))
                .map_err(|e| e.to_string())?;
        } else {
            let _ = hkcu.delete_subkey_all(MENU_KEY);
        }
        return Ok(());
    }
    #[cfg(not(windows))]
    {
        let _ = enabled;
        Err("The Explorer context menu is only available on Windows.".into())
    }
}

// ---------------------------------------------------------------- entry

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app: &AppHandle, args, _cwd| {
            let paths: Vec<String> = args
                .into_iter()
                .skip(1)
                .filter(|a| Path::new(a).is_dir())
                .collect();
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
            let _ = app.emit("open-paths", paths);
        }))
        .plugin(tauri_plugin_dialog::init())
        // The frontend shows the window once it has painted; the plugin must only restore size/position.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all() & !StateFlags::VISIBLE)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            inspect_folders,
            apply_icon,
            restore_icon,
            refresh_shell,
            restart_explorer,
            save_bytes,
            read_text,
            write_text,
            take_launch_paths,
            get_context_menu,
            set_context_menu
        ])
        .run(tauri::generate_context!())
        .expect("error while running Fluent Folder Icon");
}
