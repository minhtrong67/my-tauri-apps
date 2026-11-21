//! Custom Folder Icon backend.
//!
//! Icons are applied with the native Windows `desktop.ini` mechanism, so they
//! survive restarts and travel with the folder.

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_window_state::StateFlags;

const ICO_PREFIX: &str = "custom-folder-icon-";
/// Icons written by earlier builds (the app used to be called "Fluent Folder Icon").
const LEGACY_PREFIX: &str = "fluent-folder-icon-";
const ATTR_READONLY: u32 = 0x1;
const ATTR_HIDDEN: u32 = 0x2;
const ATTR_SYSTEM: u32 = 0x4;
const ATTR_NORMAL: u32 = 0x80;
const ATTR_ARCHIVE: u32 = 0x20;

/// Set when a folder got its very first custom icon in the current batch (needs one global shell refresh).
static GLOBAL_NEEDED: AtomicBool = AtomicBool::new(false);

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
    // Hidden/system files cannot be overwritten until the attributes are cleared (they are restored below).
    remove_attrs(p, ATTR_READONLY | ATTR_HIDDEN | ATTR_SYSTEM);
    // Drop any "Mark of the Web" stream, which recent Windows 11 updates use to decide whether to ignore a desktop.ini.
    // The file itself is overwritten in place and never deleted, so Explorer never sees the folder without it.
    #[cfg(windows)]
    {
        let _ = fs::remove_file(format!("{}:Zone.Identifier", p.display()));
    }
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

fn is_ours(name: &str) -> bool {
    (name.starts_with(ICO_PREFIX) || name.starts_with(LEGACY_PREFIX)) && name.ends_with(".ico")
}

/// Name of the icon file desktop.ini currently points at (the `IconFile=` line).
fn referenced_icon(ini: &str) -> Option<String> {
    ini.lines().find_map(|l| {
        let l = l.trim();
        // `get` (not slicing) so lines with non-ASCII text can never panic
        match l.get(..9) {
            Some(head) if head.eq_ignore_ascii_case("iconfile=") => Some(l[9..].trim().to_string()),
            _ => None,
        }
    })
}

/// Remove every icon file of ours that desktop.ini no longer references. Run well after the switch,
/// so Explorer can never be left holding a path to a file we already deleted.
fn cleanup_icons(dir: &Path) {
    let keep = referenced_icon(&read_ini(&ini_path(dir))).unwrap_or_default();
    remove_icons_except(dir, &keep);
}

/// Delete our icon files except `keep`. Called only after desktop.ini points at `keep`,
/// so desktop.ini never references a missing file.
fn remove_icons_except(dir: &Path, keep: &str) {
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if name != keep && is_ours(&name) {
                let p = e.path();
                win::set_attrs(&p, ATTR_NORMAL);
                let _ = fs::remove_file(p);
            }
        }
    }
}

fn remove_old_icons(dir: &Path) {
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if is_ours(&name) {
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
            let customized = is_dir && {
                let ini = read_ini(&ini_path(path));
                ini.contains(ICO_PREFIX) || ini.contains(LEGACY_PREFIX)
            };
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

    // Order matters and nothing is ever deleted here: write the new icon, point desktop.ini at it, notify.
    // Old icons stay for a while (see `refresh_shell`), because Explorer may still read the previous path
    // for a moment; deleting it right away made it fall back to the default icon on re-apply.
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let ico_name = format!("{ICO_PREFIX}{stamp}.ico");
    let ico = dir.join(&ico_name);
    fs::write(&ico, &bytes).map_err(|e| format!("{ico_name}: {e}"))?;
    win::set_attrs(&ico, ATTR_HIDDEN | ATTR_SYSTEM);

    let ini = ini_path(&dir);
    let existing = read_ini(&ini);
    if !(existing.contains(ICO_PREFIX) || existing.contains(LEGACY_PREFIX)) {
        GLOBAL_NEEDED.store(true, Ordering::SeqCst);
    }
    let mut lines = strip_icon_keys(&existing);
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

    // READONLY makes Windows honor desktop.ini. Flipping the harmless ARCHIVE bit gives Explorer a real
    // attribute change to react to on every apply, not only the first one; READONLY itself is never removed.
    let a = win::attrs(&dir);
    if a != u32::MAX {
        let mut n = a | ATTR_READONLY;
        n = if n & ATTR_ARCHIVE != 0 { n & !ATTR_ARCHIVE } else { n | ATTR_ARCHIVE };
        win::set_attrs(&dir, n);
    }
    win::notify(&dir);

    // make sure the change really landed
    if !read_ini(&ini).contains(&ico_name) {
        return Err("desktop.ini was not updated.".into());
    }
    Ok(())
}

#[tauri::command]
fn restore_icon(path: String) -> Result<(), String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("Not a folder: {path}"));
    }
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
    // icon files go last, after nothing references them any more
    remove_old_icons(&dir);
    Ok(())
}

/// Picks the ~128px image out of a folder's custom .ico and returns it as a data URL (small, ~10-20 KB).
fn icon_data_url(dir: &Path) -> Option<String> {
    let referenced = referenced_icon(&read_ini(&ini_path(dir)));
    let name = referenced
        .filter(|n| is_ours(n) && dir.join(n).exists())
        .or_else(|| {
            let mut all: Vec<String> = fs::read_dir(dir)
                .ok()?
                .flatten()
                .map(|e| e.file_name().to_string_lossy().to_string())
                .filter(|n| is_ours(n))
                .collect();
            all.sort();
            all.pop()
        })?;
    let bytes = fs::read(dir.join(name)).ok()?;
    if bytes.len() < 22 {
        return None;
    }
    let count = u16::from_le_bytes([bytes[4], bytes[5]]) as usize;
    let mut best: Option<(u32, usize, usize)> = None; // (width, offset, size)
    for i in 0..count {
        let o = 6 + i * 16;
        if o + 16 > bytes.len() {
            break;
        }
        let w = if bytes[o] == 0 { 256 } else { bytes[o] as u32 };
        let size = u32::from_le_bytes([bytes[o + 8], bytes[o + 9], bytes[o + 10], bytes[o + 11]]) as usize;
        let off = u32::from_le_bytes([bytes[o + 12], bytes[o + 13], bytes[o + 14], bytes[o + 15]]) as usize;
        let better = match best {
            None => true,
            Some((bw, _, _)) => (w >= 128 && (bw < 128 || w < bw)) || (bw < 128 && w > bw),
        };
        if better && off + size <= bytes.len() {
            best = Some((w, off, size));
        }
    }
    let (_, off, size) = best?;
    let slice = &bytes[off..off + size];
    if slice.starts_with(&[0x89, b'P', b'N', b'G']) {
        Some(format!("data:image/png;base64,{}", STANDARD.encode(slice)))
    } else {
        Some(format!("data:image/x-icon;base64,{}", STANDARD.encode(&bytes)))
    }
}

/// One entry per path: the folder's current custom icon, or null when it has none.
#[tauri::command]
fn folder_icons(paths: Vec<String>) -> Vec<Option<String>> {
    paths.iter().map(|p| icon_data_url(Path::new(p))).collect()
}

/// Call once after a batch. Returns immediately; a background thread then
///  - re-sends the "this folder changed" notifications a few times (Explorer sometimes misses the first ones),
///  - does one global icon refresh, only when a folder got its first custom icon (re-applies do not need it,
///    and the global refresh keeps Explorer busy for a few seconds),
///  - finally deletes the old icon files, long after Explorer switched to the new one.
#[tauri::command]
fn refresh_shell(paths: Vec<String>) {
    std::thread::spawn(move || {
        let global = GLOBAL_NEEDED.swap(false, Ordering::SeqCst);
        let mut elapsed = 0u64;
        for (i, at) in [0u64, 900, 2500, 6000].iter().enumerate() {
            std::thread::sleep(std::time::Duration::from_millis(at - elapsed));
            elapsed = *at;
            for p in &paths {
                win::notify(Path::new(p));
            }
            if i == 1 && global {
                win::notify_assoc();
                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    let _ = std::process::Command::new("ie4uinit.exe")
                        .arg("-show")
                        .creation_flags(0x0800_0000)
                        .spawn();
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_secs(10));
        for p in &paths {
            let dir = Path::new(p);
            if dir.is_dir() {
                cleanup_icons(dir);
            }
        }
    });
}

/// Restart the Explorer shell safely.
///
/// The work is handed to a small hidden batch file that runs on its own, so Explorer is brought back
/// even if this app is closed meanwhile. It kills Explorer, waits, and starts it again only if Windows
/// has not already done so (checked twice), so the shell is never left dead.
#[tauri::command]
fn restart_explorer() -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
        let exe = Path::new(&root).join("explorer.exe");
        // never kill Explorer unless we know we can start it again
        if !exe.exists() {
            return Err(format!("{} was not found, Explorer was not touched.", exe.display()));
        }
        let script = r#"@echo off
taskkill /f /im explorer.exe >nul 2>&1
ping -n 3 127.0.0.1 >nul
tasklist /fi "imagename eq explorer.exe" 2>nul | find /i "explorer.exe" >nul
if errorlevel 1 start "" "%SystemRoot%\explorer.exe"
ping -n 5 127.0.0.1 >nul
tasklist /fi "imagename eq explorer.exe" 2>nul | find /i "explorer.exe" >nul
if errorlevel 1 start "" "%SystemRoot%\explorer.exe"
(goto) 2>nul & del "%~f0"
"#;
        let bat = std::env::temp_dir().join(format!("custom-folder-icon-restart-explorer-{}.bat", std::process::id()));
        fs::write(&bat, script.replace('\n', "\r\n")).map_err(|e| e.to_string())?;
        std::process::Command::new(&bat)
            .creation_flags(0x0800_0000 | 0x0000_0200) // CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP
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
const MENU_KEY: &str = "Software\\Classes\\Directory\\shell\\CustomFolderIcon";
#[cfg(windows)]
const LEGACY_MENU_KEY: &str = "Software\\Classes\\Directory\\shell\\FluentFolderIcon";

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
        let _ = hkcu.delete_subkey_all(LEGACY_MENU_KEY);
        if enabled {
            let exe = std::env::current_exe()
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .to_string();
            let (k, _) = hkcu.create_subkey(MENU_KEY).map_err(|e| e.to_string())?;
            k.set_value("", &"Customize with Custom Folder Icon")
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
            folder_icons,
            save_bytes,
            read_text,
            write_text,
            take_launch_paths,
            get_context_menu,
            set_context_menu
        ])
        .run(tauri::generate_context!())
        .expect("error while running Custom Folder Icon");
}
