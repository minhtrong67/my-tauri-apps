#![allow(unused_imports)]
use base64::{engine::general_purpose::STANDARD, Engine as _};
use lofty::picture::PictureType;
use lofty::prelude::*;
use lofty::tag::ItemKey;
use lofty::config::{ParseOptions, ParsingMode, WriteOptions};
use lofty::file::TaggedFile;
use lofty::probe::Probe;
use lofty::tag::Tag;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Component, Path, PathBuf};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use rayon::prelude::*;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, Window};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};
use walkdir::WalkDir;
use crate::{util::*, window::*};
use serde::de::IgnoredAny;

/// Data folders used by earlier builds (before the project was named "Material Music").
const LEGACY_IDS: [&str; 2] = ["com.minhtrong67.material-music-player", "com.minhtrong67.melodia"];
/// A copy of the previous good file is refreshed at most this often (seconds).
const BAK_EVERY_SECS: u64 = 600;
/// Number of daily copies of `user.json` that are kept.
const KEEP_DAILY: usize = 5;

#[derive(Serialize)]
pub struct LoadedState {
    pub data: Option<String>,
    /// true when the main file was damaged and an older copy was used instead (or nothing could be recovered)
    pub recovered: bool,
}

fn is_valid_json(s: &str) -> bool {
    serde_json::from_str::<IgnoredAny>(s).is_ok()
}

/// State is split in two files so frequent small changes (position, play counts, settings) never rewrite the whole library:
/// "library" (tracks) and "user" (playlists, favorites, history, settings, session).
pub fn state_path(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let name = if name == "user" { "user" } else { "library" };
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{}.json", name)))
}

fn backup_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// (year, month, day) of a day count since 1970-01-01 (proleptic Gregorian, UTC)
fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

fn today_stamp() -> String {
    let (y, m, d) = civil_from_days((now_secs() / 86_400) as i64);
    format!("{:04}-{:02}-{:02}", y, m, d)
}

/// Daily copies of the (small) user file: playlists, favorites, history, settings
fn daily_backup(app: &AppHandle, data: &str) {
    let Ok(dir) = backup_dir(app) else { return };
    let file = dir.join(format!("user-{}.json", today_stamp()));
    if file.exists() {
        return;
    }
    if fs::write(&file, data).is_err() {
        return;
    }
    let mut all: Vec<PathBuf> = fs::read_dir(&dir)
        .map(|rd| {
            rd.filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| {
                    p.file_name()
                        .map(|n| {
                            let n = n.to_string_lossy();
                            n.starts_with("user-") && n.ends_with(".json")
                        })
                        .unwrap_or(false)
                })
                .collect()
        })
        .unwrap_or_default();
    all.sort();
    while all.len() > KEEP_DAILY {
        let old = all.remove(0);
        let _ = fs::remove_file(old);
    }
}

fn latest_daily_backup(app: &AppHandle) -> Option<String> {
    let dir = backup_dir(app).ok()?;
    let mut all: Vec<PathBuf> = fs::read_dir(dir).ok()?.filter_map(|e| e.ok()).map(|e| e.path()).collect();
    all.sort();
    all.into_iter()
        .rev()
        .filter(|p| p.file_name().map(|n| n.to_string_lossy().starts_with("user-")).unwrap_or(false))
        .find_map(|p| fs::read_to_string(p).ok().filter(|s| is_valid_json(s)))
}

#[tauri::command]
pub fn load_state(app: AppHandle, name: String) -> Result<LoadedState, String> {
    let p = state_path(&app, &name)?;
    let bak = p.with_extension("json.bak");
    if p.exists() {
        let text = fs::read_to_string(&p).ok();
        if let Some(s) = text.filter(|s| is_valid_json(s)) {
            return Ok(LoadedState { data: Some(s), recovered: false });
        }
        // the file is damaged: keep it aside for inspection, then fall back to the latest good copy
        let _ = fs::copy(&p, p.with_extension("json.corrupt"));
        let fallback = fs::read_to_string(&bak)
            .ok()
            .filter(|s| is_valid_json(s))
            .or_else(|| if name == "user" { latest_daily_backup(&app) } else { None });
        if let Some(s) = &fallback {
            let _ = fs::write(&p, s);
        }
        return Ok(LoadedState { data: fallback, recovered: true });
    }
    // First launch of a renamed build: reuse the data saved under an older app identifier
    let stem = if name == "user" { "user" } else { "library" };
    if let Some(root) = p.parent().and_then(|d| d.parent()) {
        for id in LEGACY_IDS {
            let old = root.join(id).join(format!("{}.json", stem));
            if let Some(s) = fs::read_to_string(old).ok().filter(|s| is_valid_json(s)) {
                return Ok(LoadedState { data: Some(s), recovered: false });
            }
        }
    }
    Ok(LoadedState { data: None, recovered: false })
}

#[tauri::command]
pub fn save_state(app: AppHandle, name: String, data: String) -> Result<(), String> {
    use std::io::Write;
    let p = state_path(&app, &name)?;
    // the file on disk is always a complete earlier write: keep it as `.bak` (refreshed every few minutes)
    if fs::metadata(&p).map(|m| m.len() > 0).unwrap_or(false) {
        let bak = p.with_extension("json.bak");
        let stale = fs::metadata(&bak)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.elapsed().ok())
            .map(|e| e.as_secs() >= BAK_EVERY_SECS)
            .unwrap_or(true);
        if stale {
            let _ = fs::copy(&p, &bak);
        }
    }
    let tmp = p.with_extension("json.tmp");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, &p).map_err(|e| e.to_string())?;
    if name == "user" {
        daily_backup(&app, &data);
    }
    Ok(())
}

/// Folder with the automatic daily backups of the user data
#[tauri::command]
pub fn get_backup_dir(app: AppHandle) -> Option<String> {
    backup_dir(&app).ok().map(|d| d.to_string_lossy().to_string())
}

/// Folder where extracted cover art is cached (used to detect covers saved by an older build / other folder)
#[tauri::command]
pub fn get_cover_dir(app: AppHandle) -> Option<String> {
    app.path()
        .app_cache_dir()
        .ok()
        .map(|d| d.join("covers").to_string_lossy().to_string())
}

#[tauri::command]
pub fn is_dir(path: String) -> bool {
    Path::new(&path).is_dir()
}

pub const TEXT_EXTS: [&str; 4] = ["m3u", "m3u8", "lrc", "json"];

/// Playlists / lyrics are small; backups (`.json`) hold the whole library, so they get a bigger limit
const MAX_TEXT_BYTES: u64 = 8 * 1024 * 1024;
const MAX_JSON_BYTES: u64 = 64 * 1024 * 1024;

/// Only absolute paths to playlist / lyrics / backup files are accepted, never anything inside the app's own data folder
pub fn check_text_path(app: &AppHandle, path: &str, write: bool) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    if !p.is_absolute() || p.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err("Invalid path".to_string());
    }
    let ext = p.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
    if !TEXT_EXTS.contains(&ext.as_str()) {
        return Err(format!("File type .{} is not allowed", ext));
    }
    if write {
        if let Ok(dir) = app.path().app_data_dir() {
            if norm_key(&p.to_string_lossy()).starts_with(&norm_key(&dir.to_string_lossy())) {
                return Err("Invalid path".to_string());
            }
        }
    }
    Ok(p)
}

#[tauri::command]
pub fn write_text_file(app: AppHandle, path: String, content: String) -> Result<(), String> {
    let p = check_text_path(&app, &path, true)?;
    fs::write(p, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_text_file(app: AppHandle, path: String) -> Result<String, String> {
    let p = check_text_path(&app, &path, false)?;
    let limit = if p.extension().map(|e| e.eq_ignore_ascii_case("json")).unwrap_or(false) { MAX_JSON_BYTES } else { MAX_TEXT_BYTES };
    let len = fs::metadata(&p).map_err(|e| e.to_string())?.len();
    if len > limit {
        return Err("File is too large".to_string());
    }
    let b = fs::read(p).map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&b).trim_start_matches('\u{feff}').to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dates_from_day_numbers() {
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        assert_eq!(civil_from_days(11_016), (2000, 2, 29));
        assert_eq!(civil_from_days(20_751), (2026, 10, 25));
        assert_eq!(civil_from_days(47_541), (2100, 3, 1));
    }

    #[test]
    fn json_validation() {
        assert!(is_valid_json(r#"{"a":[1,2,3]}"#));
        assert!(is_valid_json("[]"));
        assert!(!is_valid_json(r#"{"a":[1,2"#));
        assert!(!is_valid_json(""));
    }
}
