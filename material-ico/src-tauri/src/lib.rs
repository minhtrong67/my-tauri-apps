use std::fs;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request, Response};

const SECTION: &str = "[.ShellClassInfo]";
const ICON_PREFIX: &str = "folder_icon_";

fn header(req: &Request, key: &str) -> Result<String, String> {
    let value = req
        .headers()
        .get(key)
        .ok_or_else(|| format!("Missing header: {key}"))?
        .to_str()
        .map_err(|e| e.to_string())?;
    urlencoding::decode(value)
        .map(|v| v.into_owned())
        .map_err(|e| e.to_string())
}

fn body<'a>(req: &'a Request<'a>) -> Result<&'a Vec<u8>, String> {
    match req.body() {
        InvokeBody::Raw(data) => Ok(data),
        _ => Err("Expected a raw binary body".into()),
    }
}

/// Reads a file and returns it as raw bytes (ArrayBuffer on the JS side).
#[tauri::command]
fn read_file(path: String) -> Result<Response, String> {
    fs::read(&path).map(Response::new).map_err(|e| e.to_string())
}

/// Saves the raw request body to the path given in the `path` header.
#[tauri::command]
fn save_file(req: Request) -> Result<(), String> {
    let path = header(&req, "path")?;
    fs::write(path, body(&req)?).map_err(|e| e.to_string())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).is_dir()
}

/// Returns `dir/name`, or `dir/name (1).ext`, `(2)`... when the file already exists.
#[tauri::command]
fn unique_path(dir: String, name: String) -> String {
    let d = PathBuf::from(dir);
    let mut p = d.join(&name);
    let stem = Path::new(&name)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| name.clone());
    let ext = Path::new(&name)
        .extension()
        .map(|s| format!(".{}", s.to_string_lossy()))
        .unwrap_or_default();
    let mut i = 1;
    while p.exists() {
        p = d.join(format!("{stem} ({i}){ext}"));
        i += 1;
    }
    p.to_string_lossy().to_string()
}

/// Opens the folder in Explorer.
#[tauri::command]
fn reveal_in_explorer(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .arg(&path)
            .creation_flags(0x0800_0000)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Err("Only available on Windows".into())
    }
}

#[allow(unused_variables)]
fn attrib(flags: &[&str], target: &Path) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("attrib")
            .args(flags)
            .arg(target)
            .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
            .status();
    }
}

/// Tells Explorer the folder changed and flushes the icon cache so every view
/// (details, large icons, tiles...) picks up the new icon.
#[allow(unused_variables)]
fn refresh_shell(dir: &Path) {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use std::os::windows::process::CommandExt;
        use windows_sys::Win32::UI::Shell::SHChangeNotify;
        let wide: Vec<u16> = dir.as_os_str().encode_wide().chain(Some(0)).collect();
        let p = wide.as_ptr() as *const std::ffi::c_void;
        unsafe {
            // SHCNF_PATHW = 0x5, SHCNF_FLUSH = 0x1000
            SHChangeNotify(0x0000_0800, 0x1005, p, std::ptr::null()); // SHCNE_ATTRIBUTES
            SHChangeNotify(0x0000_2000, 0x1005, p, std::ptr::null()); // SHCNE_UPDATEITEM
            SHChangeNotify(0x0000_1000, 0x1005, p, std::ptr::null()); // SHCNE_UPDATEDIR
            SHChangeNotify(0x0800_0000, 0, std::ptr::null(), std::ptr::null()); // SHCNE_ASSOCCHANGED
        }
        // Rebuilds the cached icons used by large/extra-large views.
        let _ = std::process::Command::new("ie4uinit.exe")
            .arg("-show")
            .creation_flags(0x0800_0000)
            .spawn();
    }
}

fn remove_old_icons(dir: &Path) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(ICON_PREFIX) && name.ends_with(".ico") {
                let p = entry.path();
                attrib(&["-s", "-h", "-r"], &p);
                let _ = fs::remove_file(p);
            }
        }
    }
}

fn read_text(p: &Path) -> String {
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

/// desktop.ini is written as UTF-16 LE with BOM, exactly like Explorer does.
fn write_text(p: &Path, s: &str) -> Result<(), String> {
    let mut b = vec![0xFF, 0xFE];
    for u in s.encode_utf16() {
        b.extend_from_slice(&u.to_le_bytes());
    }
    fs::write(p, b).map_err(|e| e.to_string())
}

/// Removes icon keys from an existing desktop.ini while keeping everything else.
fn strip_icon_keys(content: &str) -> Vec<String> {
    content
        .lines()
        .filter(|l| {
            let k = l.trim().to_lowercase();
            !(k.starts_with("iconresource=")
                || k.starts_with("iconfile=")
                || k.starts_with("iconindex="))
        })
        .map(|l| l.to_string())
        .collect()
}

fn write_ini(ini: &Path, icon_name: Option<&str>) -> Result<(), String> {
    attrib(&["-s", "-h", "-r"], ini);
    let mut lines = strip_icon_keys(&read_text(ini));
    if let Some(name) = icon_name {
        let entries = vec![
            format!("IconResource={name},0"),
            format!("IconFile={name}"),
            "IconIndex=0".to_string(),
        ];
        match lines
            .iter()
            .position(|l| l.trim().eq_ignore_ascii_case(SECTION))
        {
            Some(i) => {
                for (k, e) in entries.into_iter().enumerate() {
                    lines.insert(i + 1 + k, e);
                }
            }
            None => {
                lines.insert(0, SECTION.to_string());
                for (k, e) in entries.into_iter().enumerate() {
                    lines.insert(1 + k, e);
                }
            }
        }
    }
    let meaningful = lines
        .iter()
        .any(|l| !l.trim().is_empty() && !l.trim().eq_ignore_ascii_case(SECTION));
    if meaningful {
        write_text(ini, &(lines.join("\r\n") + "\r\n"))?;
        attrib(&["+s", "+h"], ini);
    } else if ini.exists() {
        let _ = fs::remove_file(ini);
    }
    Ok(())
}

/// Applies the ICO in the request body to the folder in the `folder` header.
#[tauri::command]
fn apply_folder_icon(req: Request) -> Result<String, String> {
    #[cfg(not(windows))]
    {
        let _ = req;
        Err("Folder icons are only supported on Windows".into())
    }
    #[cfg(windows)]
    {
        let folder = header(&req, "folder")?;
        let data = body(&req)?;
        if data.len() < 6 || data[0..4] != [0, 0, 1, 0] {
            return Err("The file is not a valid .ico".into());
        }
        let dir = PathBuf::from(&folder);
        if !dir.is_dir() {
            return Err("Folder not found".into());
        }
        remove_old_icons(&dir);
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        // A new file name each time defeats Explorer's per-path icon cache.
        let name = format!("{ICON_PREFIX}{stamp}.ico");
        let ico = dir.join(&name);
        fs::write(&ico, data).map_err(|e| e.to_string())?;
        write_ini(&dir.join("desktop.ini"), Some(&name))?;
        attrib(&["+s", "+h"], &ico);
        attrib(&["+s"], &dir);
        refresh_shell(&dir);
        Ok(name)
    }
}

/// Restores the default Windows folder icon.
#[tauri::command]
fn remove_folder_icon(folder: String) -> Result<(), String> {
    let dir = PathBuf::from(&folder);
    if !dir.is_dir() {
        return Ok(());
    }
    remove_old_icons(&dir);
    write_ini(&dir.join("desktop.ini"), None)?;
    if !dir.join("desktop.ini").exists() {
        attrib(&["-s"], &dir);
    }
    refresh_shell(&dir);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            save_file,
            path_exists,
            unique_path,
            reveal_in_explorer,
            apply_folder_icon,
            remove_folder_icon
        ])
        .run(tauri::generate_context!())
        .expect("error while running Material Ico");
}
