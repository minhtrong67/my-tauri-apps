#![allow(unused_imports)]
mod lyrics;
mod scan;
mod state;
mod system;
mod util;
mod watch;
mod window;
mod scrobble;

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
use crate::{lyrics::*, scan::*, state::*, system::*, util::*, watch::*, window::*};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            show_main(app);
            let paths: Vec<String> = args
                .into_iter()
                .skip(1)
                .filter(|a| !a.starts_with("--") && Path::new(a).exists())
                .collect();
            if !paths.is_empty() {
                let _ = app.emit("open-paths", paths);
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    let combo = shortcut.mods.contains(Modifiers::CONTROL | Modifiers::ALT);
                    let action = match (combo, shortcut.key) {
                        (false, Code::MediaPlayPause) | (true, Code::Space) => "toggle",
                        (false, Code::MediaTrackNext) | (true, Code::ArrowRight) => "next",
                        (false, Code::MediaTrackPrevious) | (true, Code::ArrowLeft) => "prev",
                        (false, Code::MediaStop) => "stop",
                        (true, Code::KeyM) => "mini",
                        (true, Code::KeyT) => "ontop",
                        _ => return,
                    };
                    let _ = app.emit("tray-action", action.to_string());
                })
                .build(),
        )
        .manage(FolderWatcher(Mutex::new(None)))
        .manage(AppFlags {
            close_to_tray: AtomicBool::new(false),
        })
        .manage(Ready(AtomicBool::new(false)))
        .manage(WinTracker {
            track: AtomicBool::new(true),
            dirty: AtomicBool::new(false),
            state: Mutex::new(None),
        })
        .setup(|app| {
            let handle = app.handle();
            // the asset protocol serves nothing by default: only the cover cache here, library folders as they are scanned / loaded
            if let Ok(dir) = app.path().app_cache_dir() {
                let covers = dir.join("covers");
                let _ = fs::create_dir_all(&covers);
                let _ = app.asset_protocol_scope().allow_directory(&covers, true);
            }
            let show = MenuItem::with_id(handle, "show", "Show window", true, None::<&str>)?;
            let toggle = MenuItem::with_id(handle, "toggle", "Play / Pause", true, None::<&str>)?;
            let prev = MenuItem::with_id(handle, "prev", "Previous", true, None::<&str>)?;
            let next = MenuItem::with_id(handle, "next", "Next", true, None::<&str>)?;
            let quit = MenuItem::with_id(handle, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(
                handle,
                &[&show, &toggle, &prev, &next, &PredefinedMenuItem::separator(handle)?, &quit],
            )?;

            let mut builder = TrayIconBuilder::new()
                .tooltip("Material Music")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main(app),
                    "quit" => app.exit(0),
                    other => {
                        let _ = app.emit("tray-action", other.to_string());
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone());
            }
            builder.build(app)?;
            app.manage(TrayItems { show, toggle, prev, next, quit });

            restore_window_state(app.handle());
            // safety net: if the frontend never reports ready (e.g. a startup error), show the window anyway
            let late = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(8));
                if !late.state::<Ready>().0.swap(true, Ordering::SeqCst) {
                    show_main(&late);
                }
            });
            // background saver: writes the window geometry at most twice a second while it changes
            let bg = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_millis(500));
                let tracker = bg.state::<WinTracker>();
                if tracker.dirty.swap(false, Ordering::Relaxed) {
                    write_window_state(&bg);
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            match event {
                tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_) => remember_window(window, false),
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    remember_window(window, true);
                    let flags = window.state::<AppFlags>();
                    if flags.close_to_tray.load(Ordering::Relaxed) {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            scan::scan_paths,
            scan::get_cover,
            scan::read_lyrics,
            scan::find_removed,
            scan::get_music_dir,
            scan::write_tags,
            state::load_state,
            state::save_state,
            state::is_dir,
            state::write_text_file,
            state::read_text_file,
            state::get_cover_dir,
            state::get_backup_dir,
            system::reveal_in_explorer,
            system::open_folder,
            system::get_launch_args,
            system::allow_paths,
            system::set_media_keys,
            system::set_global_hotkeys,
            window::set_close_to_tray,
            window::set_window_tracking,
            window::set_start_mode,
            window::app_ready,
            window::set_tray_labels,
            lyrics::fetch_lyrics_online,
            watch::watch_folders,
            scrobble::scrobble_now_playing,
            scrobble::scrobble_listen,
            scrobble::scrobble_validate
        ])
        .run(tauri::generate_context!())
        .expect("failed to start Material Music");
}
