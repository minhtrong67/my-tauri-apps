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
use crate::{scan::*, state::*, system::*, util::*, watch::*, window::*};

#[derive(Serialize)]
pub struct OnlineLyrics {
    pub synced: String,
    pub plain: String,
}

pub fn lrclib_pick(v: &serde_json::Value) -> Option<OnlineLyrics> {
    let synced = v.get("syncedLyrics").and_then(|x| x.as_str()).unwrap_or("").to_string();
    let plain = v.get("plainLyrics").and_then(|x| x.as_str()).unwrap_or("").to_string();
    if synced.trim().is_empty() && plain.trim().is_empty() {
        None
    } else {
        Some(OnlineLyrics { synced, plain })
    }
}

/// Look the lyrics up on LRCLIB (free, no key). Only called when the user asks for it.
#[tauri::command]
pub async fn fetch_lyrics_online(title: String, artist: String, album: String, duration: f64) -> Result<Option<OnlineLyrics>, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<Option<OnlineLyrics>, String> {
        let agent = ureq::AgentBuilder::new()
            .timeout(Duration::from_secs(10))
            .user_agent("Material Music/1.1 (https://github.com/minhtrong67)")
            .build();
        let mut req = agent
            .get("https://lrclib.net/api/get")
            .query("track_name", &title)
            .query("artist_name", &artist);
        if !album.trim().is_empty() {
            req = req.query("album_name", &album);
        }
        if duration > 0.0 {
            req = req.query("duration", &format!("{}", duration.round() as u64));
        }
        match req.call() {
            Ok(resp) => {
                let v: serde_json::Value = resp.into_json().map_err(|e| e.to_string())?;
                if let Some(l) = lrclib_pick(&v) {
                    return Ok(Some(l));
                }
            }
            Err(ureq::Error::Status(404, _)) => {}
            Err(e) => return Err(e.to_string()),
        }
        // fall back to a fuzzy search and take the first result that has lyrics
        let q = format!("{} {}", artist, title);
        let resp = agent
            .get("https://lrclib.net/api/search")
            .query("q", q.trim())
            .call()
            .map_err(|e| e.to_string())?;
        let v: serde_json::Value = resp.into_json().map_err(|e| e.to_string())?;
        Ok(v.as_array().and_then(|a| a.iter().find_map(lrclib_pick)))
    })
    .await
    .map_err(|e| e.to_string())?
}
