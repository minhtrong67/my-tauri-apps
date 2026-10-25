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
use crate::{lyrics::*, scan::*, state::*, system::*, util::*, window::*};

pub struct FolderWatcher(pub Mutex<Option<RecommendedWatcher>>);

/// Watch the library folders; any change in them (after a quiet moment) emits `library-changed`
#[tauri::command]
pub fn watch_folders(app: AppHandle, state: State<FolderWatcher>, paths: Vec<String>, enabled: bool) {
    let Ok(mut guard) = state.0.lock() else { return };
    *guard = None; // dropping the old watcher also stops its debounce thread
    if !enabled || paths.is_empty() {
        return;
    }
    let (tx, rx) = std::sync::mpsc::channel::<()>();
    let watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        let Ok(ev) = res else { return };
        let relevant = matches!(
            ev.kind,
            notify::EventKind::Create(_)
                | notify::EventKind::Remove(_)
                | notify::EventKind::Modify(notify::event::ModifyKind::Name(_))
                | notify::EventKind::Modify(notify::event::ModifyKind::Data(_))
        );
        if relevant && ev.paths.iter().any(|p| is_audio(p) || p.extension().is_none()) {
            let _ = tx.send(());
        }
    });
    let Ok(mut watcher) = watcher else { return };
    let mut any = false;
    for p in &paths {
        let pb = Path::new(p);
        if pb.is_dir() && watcher.watch(pb, RecursiveMode::Recursive).is_ok() {
            any = true;
        }
    }
    if !any {
        return;
    }
    let handle = app.clone();
    std::thread::spawn(move || {
        while rx.recv().is_ok() {
            while rx.recv_timeout(Duration::from_millis(2500)).is_ok() {}
            let _ = handle.emit("library-changed", ());
        }
    });
    *guard = Some(watcher);
}

// ---------- khởi chạy ----------
