use crate::model::*;
use crate::{registry, store, sys};
use serde_json::Value;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

type R<T> = Result<T, String>;

fn full(app: &AppHandle) -> FullState {
    FullState { state: store::read_state(app), classic: registry::is_classic() }
}

#[tauri::command]
pub fn app_ready(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Value {
    store::read_settings(&app)
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> R<()> {
    store::merge_settings(&app, settings)
}

#[tauri::command]
pub fn default_save_dir(app: AppHandle) -> String {
    store::default_save_dir(&app).to_string_lossy().into_owned()
}

#[tauri::command]
pub fn get_state(app: AppHandle) -> FullState {
    full(&app)
}

#[tauri::command]
pub fn get_os_info() -> OsInfo {
    registry::os_info()
}

#[tauri::command]
pub fn set_classic_menu(enabled: bool) -> R<()> {
    registry::set_classic(enabled)
}

#[tauri::command]
pub fn save_entries(app: AppHandle, entries: Vec<Entry>) -> R<FullState> {
    let mut st = store::read_state(&app);
    registry::apply_entries(&st.entries, &entries)?;
    st.entries = entries;
    store::write_state(&app, &st)?;
    Ok(full(&app))
}

#[tauri::command]
pub fn scan_system_items(app: AppHandle) -> Vec<SystemItem> {
    registry::scan(&store::read_state(&app))
}

#[tauri::command]
pub fn set_item_hidden(app: AppHandle, kind: String, base: String, name: String, clsid: String, hidden: bool) -> R<()> {
    let mut st = store::read_state(&app);
    if kind == "verb" {
        registry::set_verb_hidden(&base, &name, hidden)?;
        st.hidden_verbs.retain(|h| !(h.base.eq_ignore_ascii_case(&base) && h.name.eq_ignore_ascii_case(&name)));
        if hidden {
            st.hidden_verbs.push(registry::hidden_verb(&base, &name));
        }
    } else {
        let clsid = clsid.to_uppercase();
        registry::set_handler_blocked(&clsid, hidden)?;
        st.blocked_clsids.retain(|c| !c.eq_ignore_ascii_case(&clsid));
        if hidden {
            st.blocked_clsids.push(clsid);
        }
    }
    store::write_state(&app, &st)
}

#[tauri::command]
pub fn restart_explorer() -> R<()> {
    sys::restart_explorer()
}

#[tauri::command]
pub fn open_uri(uri: String) -> R<()> {
    sys::open_uri(&uri)
}

#[tauri::command]
pub fn open_path(path: String) -> R<()> {
    let _ = fs::create_dir_all(&path);
    sys::open_path(&path)
}

fn safe_name(n: &str) -> R<String> {
    let ok = !n.is_empty() && n.len() < 120 && !n.contains(['/', '\\', ':']) && !n.contains("..");
    if ok { Ok(n.to_string()) } else { Err("Invalid file name".into()) }
}

#[tauri::command]
pub fn write_backup(dir: String, file_name: String, content: String) -> R<String> {
    let name = safe_name(&file_name)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let p = Path::new(&dir).join(name);
    fs::write(&p, content).map_err(|e| e.to_string())?;
    Ok(p.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn read_text(path: String) -> R<String> {
    if fs::metadata(&path).map(|m| m.len()).unwrap_or(0) > 8 * 1024 * 1024 {
        return Err("File too large".into());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_backups(dir: String) -> Vec<BackupFile> {
    let mut v = Vec::new();
    if let Ok(rd) = fs::read_dir(&dir) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().into_owned();
            if !(name.starts_with("material-menu-") && name.ends_with(".json")) {
                continue;
            }
            if let Ok(m) = e.metadata() {
                let modified = m
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                v.push(BackupFile { name, path: e.path().to_string_lossy().into_owned(), size: m.len(), modified });
            }
        }
    }
    v.sort_by(|a, b| b.modified.cmp(&a.modified));
    v
}

#[tauri::command]
pub fn delete_backup(path: String) -> R<()> {
    let p = Path::new(&path);
    let name = p.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
    if !(name.starts_with("material-menu-") && name.ends_with(".json")) {
        return Err("Not a backup file".into());
    }
    fs::remove_file(p).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_all(app: AppHandle) -> R<FullState> {
    let st = store::read_state(&app);
    registry::reset(&st)?;
    store::write_state(&app, &State::default())?;
    Ok(full(&app))
}

#[tauri::command]
pub fn restore_state(app: AppHandle, incoming: FullState) -> R<FullState> {
    let old = store::read_state(&app);
    registry::reset(&old)?;
    let mut st = State::default();
    registry::apply_entries(&[], &incoming.state.entries)?;
    st.entries = incoming.state.entries;
    for h in incoming.state.hidden_verbs {
        registry::set_verb_hidden(&h.base, &h.name, true)?;
        st.hidden_verbs.push(h);
    }
    for c in incoming.state.blocked_clsids {
        let c = c.to_uppercase();
        registry::set_handler_blocked(&c, true)?;
        st.blocked_clsids.push(c);
    }
    registry::set_classic(incoming.classic)?;
    store::write_state(&app, &st)?;
    Ok(full(&app))
}
