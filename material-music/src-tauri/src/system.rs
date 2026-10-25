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
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use walkdir::WalkDir;
use crate::{lyrics::*, scan::*, state::*, util::*, watch::*, window::*};

#[tauri::command]
pub fn reveal_in_explorer(path: String) -> Result<(), String> {
    if path.contains('"') || !Path::new(&path).exists() {
        return Err("Invalid path".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .raw_arg(format!("/select,\"{}\"", path))
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Err("Windows only".to_string())
    }
}

#[tauri::command]
pub fn get_launch_args() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|a| !a.starts_with("--") && Path::new(a).exists())
        .collect()
}

/// The asset protocol only serves folders that were explicitly allowed (library folders + the cover cache)
#[tauri::command]
pub fn allow_paths(app: AppHandle, paths: Vec<String>) {
    let scope = app.asset_protocol_scope();
    let mut seen: HashSet<String> = HashSet::new();
    for p in paths {
        let pb = PathBuf::from(&p);
        let dir = if pb.is_dir() {
            pb
        } else {
            match pb.parent() {
                Some(d) => d.to_path_buf(),
                None => continue,
            }
        };
        if seen.insert(norm_key(&dir.to_string_lossy())) {
            let _ = scope.allow_directory(&dir, false);
        }
    }
}

pub const MEDIA_KEYS: [Code; 4] = [Code::MediaPlayPause, Code::MediaTrackNext, Code::MediaTrackPrevious, Code::MediaStop];

/// Global media keys (work while the window is hidden / in the tray)
#[tauri::command]
pub fn set_media_keys(app: AppHandle, enabled: bool) {
    let gs = app.global_shortcut();
    for code in MEDIA_KEYS {
        if enabled {
            if !gs.is_registered(Shortcut::new(None, code)) {
                let _ = gs.register(Shortcut::new(None, code));
            }
        } else {
            let _ = gs.unregister(Shortcut::new(None, code));
        }
    }
}

/// Ctrl+Alt+... hotkeys that work in every app: play/pause, next, previous, mini player, always on top
pub const HOTKEYS: [Code; 5] = [Code::Space, Code::ArrowRight, Code::ArrowLeft, Code::KeyM, Code::KeyT];

fn hotkey(code: Code) -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), code)
}

/// Returns false when another program already owns one of the combinations
#[tauri::command]
pub fn set_global_hotkeys(app: AppHandle, enabled: bool) -> bool {
    let gs = app.global_shortcut();
    let mut ok = true;
    for code in HOTKEYS {
        let sc = hotkey(code);
        if enabled {
            if !gs.is_registered(sc) && gs.register(sc).is_err() {
                ok = false;
            }
        } else {
            let _ = gs.unregister(sc);
        }
    }
    if !ok {
        for code in HOTKEYS {
            let _ = gs.unregister(hotkey(code));
        }
    }
    ok
}

/// Open a folder in the file manager (used for the automatic-backup folder)
#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err("Invalid path".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer").arg(p).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Windows only".to_string())
    }
}
