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
use crate::{lyrics::*, state::*, system::*, util::*, watch::*, window::*};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TrackInfo {
    pub id: String,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: String,
    pub genre: String,
    pub year: u32,
    pub track_no: u32,
    pub duration: f64,
    pub bitrate: u32,
    pub sample_rate: u32,
    pub format: String,
    pub size: u64,
    pub added_at: u64,
    pub folder: String,
    pub has_cover: bool,
    pub modified: u64,
    pub cover: String,
    /// ReplayGain (dB) and peak read from the tags; `rgv` = 1 once the file has been read by a build that knows ReplayGain
    pub rg_track: Option<f32>,
    pub rg_album: Option<f32>,
    pub rg_track_peak: Option<f32>,
    pub rg_album_peak: Option<f32>,
    pub rgv: u8,
}

#[derive(Serialize)]
pub struct Found {
    pub id: String,
    pub path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub tracks: Vec<TrackInfo>,
    pub found: Vec<Found>,
}

#[derive(Deserialize)]
pub struct Known {
    pub path: String,
    pub size: u64,
    pub modified: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverResult {
    pub file: String,
    pub data_url: Option<String>,
}

// ---------- tiện ích ----------

pub fn track_id(path: &str) -> String {
    fnv(&norm_key(path))
}

pub fn open_tagged(path: &Path) -> Option<TaggedFile> {
    Probe::open(path)
        .ok()
        .and_then(|p| {
            p.options(ParseOptions::new().parsing_mode(ParsingMode::Relaxed))
                .guess_file_type()
                .ok()
        })
        .and_then(|p| p.read().ok())
        .or_else(|| lofty::read_from_path(path).ok())
}

pub fn cover_bytes(tags: &[Tag], path: &Path) -> Option<Vec<u8>> {
    for tag in tags {
        if let Some(p) = tag
            .pictures()
            .iter()
            .find(|x| x.pic_type() == PictureType::CoverFront && !x.data().is_empty())
        {
            return Some(p.data().to_vec());
        }
    }
    for tag in tags {
        if let Some(p) = tag.pictures().iter().find(|x| !x.data().is_empty()) {
            return Some(p.data().to_vec());
        }
    }
    // Ảnh cạnh bài hát chỉ dùng cho bài thuộc một album thật (có thẻ album),
    // tránh gán nhầm ảnh của album khác cho các bài lẻ trong cùng thư mục.
    let has_album = tags
        .iter()
        .any(|t| t.album().map(|a| !a.trim().is_empty()).unwrap_or(false));
    if !has_album {
        return None;
    }
    let dir = path.parent()?;
    for name in ["cover", "folder", "front", "albumart"] {
        for ext in ["jpg", "jpeg", "png", "webp"] {
            let c = dir.join(format!("{}.{}", name, ext));
            if c.is_file() {
                return fs::read(c).ok();
            }
        }
    }
    None
}

/// Ghi ảnh bìa vào bộ nhớ đệm (tên tệp = mã băm nội dung nên không bị trùng lặp)
pub fn save_cover(dir: &Path, bytes: &[u8]) -> Option<String> {
    let (ext, _) = sniff(bytes);
    fs::create_dir_all(dir).ok()?;
    let file = dir.join(format!("{}.{}", fnv_bytes(bytes), ext));
    if !file.exists() {
        fs::write(&file, bytes).ok()?;
    }
    Some(file.to_string_lossy().to_string())
}

/// "-6.48 dB" / "0.988" -> number
pub fn parse_float(s: &str) -> Option<f32> {
    let t = s.trim().trim_end_matches("dB").trim_end_matches("db").trim().replace(',', ".");
    t.parse::<f32>().ok().filter(|v| v.is_finite())
}

pub fn tag_float(tags: &[Tag], key: &ItemKey) -> Option<f32> {
    tags.iter().find_map(|t| t.get_string(key).and_then(parse_float))
}

pub fn read_track(path: &Path, path_str: String, id: String, size: u64, modified: u64, cover_dir: &Path) -> Option<TrackInfo> {
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let folder = path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let mut info = TrackInfo {
        id,
        path: path_str,
        title: stem,
        artist: String::new(),
        album: String::new(),
        album_artist: String::new(),
        genre: String::new(),
        year: 0,
        track_no: 0,
        duration: 0.0,
        bitrate: 0,
        sample_rate: 0,
        format: ext,
        size,
        added_at: now_secs(),
        folder,
        has_cover: false,
        modified,
        cover: String::new(),
        rg_track: None,
        rg_album: None,
        rg_track_peak: None,
        rg_album_peak: None,
        rgv: 1,
    };

    if let Some(tagged) = open_tagged(path) {
        let props = tagged.properties();
        info.duration = props.duration().as_secs_f64();
        info.bitrate = props.audio_bitrate().unwrap_or(0);
        info.sample_rate = props.sample_rate().unwrap_or(0);
        if let Some(tag) = tagged.primary_tag().or_else(|| tagged.first_tag()) {
            if let Some(t) = non_empty(tag.title().map(|c| c.to_string())) {
                info.title = t;
            }
            info.artist = non_empty(tag.artist().map(|c| c.to_string())).unwrap_or_default();
            info.album = non_empty(tag.album().map(|c| c.to_string())).unwrap_or_default();
            info.genre = non_empty(tag.genre().map(|c| c.to_string())).unwrap_or_default();
            info.album_artist = non_empty(tag.get_string(&ItemKey::AlbumArtist).map(|s| s.to_string()))
                .unwrap_or_default();
            info.year = tag.year().unwrap_or(0);
            info.track_no = tag.track().unwrap_or(0);
        }
        info.rg_track = tag_float(tagged.tags(), &ItemKey::ReplayGainTrackGain);
        info.rg_album = tag_float(tagged.tags(), &ItemKey::ReplayGainAlbumGain);
        info.rg_track_peak = tag_float(tagged.tags(), &ItemKey::ReplayGainTrackPeak);
        info.rg_album_peak = tag_float(tagged.tags(), &ItemKey::ReplayGainAlbumPeak);
        if let Some(bytes) = cover_bytes(tagged.tags(), path) {
            if let Some(f) = save_cover(cover_dir, &bytes) {
                info.cover = f;
                info.has_cover = true;
            }
        }
    }
    Some(info)
}

pub fn sniff(bytes: &[u8]) -> (&'static str, &'static str) {
    if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        ("png", "image/png")
    } else if bytes.len() > 12 && &bytes[8..12] == b"WEBP" {
        ("webp", "image/webp")
    } else {
        ("jpg", "image/jpeg")
    }
}

#[tauri::command]
pub async fn scan_paths(app: AppHandle, paths: Vec<String>, known: Option<Vec<Known>>) -> Result<ScanResult, String> {
    let cover_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("covers");
    tauri::async_runtime::spawn_blocking(move || {
        let known_map: HashMap<String, (u64, u64)> = known
            .unwrap_or_default()
            .into_iter()
            .map(|k| (norm_key(&k.path), (k.size, k.modified)))
            .collect();

        let mut files: Vec<PathBuf> = Vec::new();
        let mut seen: HashSet<String> = HashSet::new();
        let mut push = |p: PathBuf, files: &mut Vec<PathBuf>| {
            if seen.insert(norm_key(&p.to_string_lossy())) {
                files.push(p);
            }
        };
        for p in &paths {
            let pb = PathBuf::from(p);
            if pb.is_dir() {
                let root = fs::canonicalize(&pb).map(strip_verbatim).unwrap_or(pb);
                for e in WalkDir::new(&root)
                    .follow_links(true)
                    .sort_by_file_name()
                    .into_iter()
                    .filter_map(|e| e.ok())
                {
                    if e.file_type().is_file() && is_audio(e.path()) {
                        push(e.path().to_path_buf(), &mut files);
                    }
                }
            } else if pb.is_file() && is_audio(&pb) {
                let f = fs::canonicalize(&pb).map(strip_verbatim).unwrap_or(pb);
                push(f, &mut files);
            }
        }

        // the asset protocol scope starts empty: allow exactly the folders that hold the scanned songs
        let scope = app.asset_protocol_scope();
        let mut allowed: HashSet<String> = HashSet::new();
        for f in &files {
            if let Some(d) = f.parent() {
                if allowed.insert(norm_key(&d.to_string_lossy())) {
                    let _ = scope.allow_directory(d, false);
                }
            }
        }

        let total = files.len();
        let done = AtomicUsize::new(0);
        let threads = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(2).clamp(2, 8);
        let work = || -> Vec<(Found, Option<TrackInfo>)> {
            files
                .par_iter()
                .filter_map(|f| {
                    let path_str = f.to_string_lossy().to_string();
                    let id = track_id(&path_str);
                    let out = match fs::metadata(f) {
                        Ok(m) => {
                            let modified = mtime(&m);
                            let unchanged = modified > 0
                                && known_map
                                    .get(&norm_key(&path_str))
                                    .map(|(sz, md)| *sz == m.len() && *md == modified)
                                    .unwrap_or(false);
                            let track = if unchanged {
                                None
                            } else {
                                read_track(f, path_str.clone(), id.clone(), m.len(), modified, &cover_dir)
                            };
                            Some((Found { id, path: path_str }, track))
                        }
                        Err(_) => None,
                    };
                    let n = done.fetch_add(1, Ordering::Relaxed) + 1;
                    if n % 10 == 0 || n == total {
                        let _ = app.emit("scan-progress", serde_json::json!({ "done": n, "total": total }));
                    }
                    out
                })
                .collect()
        };
        // tags are read in parallel (ordered result), on a small dedicated pool so the UI stays responsive
        let results = match rayon::ThreadPoolBuilder::new().num_threads(threads).build() {
            Ok(pool) => pool.install(work),
            Err(_) => work(),
        };
        let mut tracks = Vec::new();
        let mut found = Vec::with_capacity(total);
        for (f, t) in results {
            found.push(f);
            if let Some(t) = t {
                tracks.push(t);
            }
        }
        ScanResult { tracks, found }
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cover(app: AppHandle, path: String, want_data: bool) -> Result<Option<CoverResult>, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("covers");
    tauri::async_runtime::spawn_blocking(move || -> Option<CoverResult> {
        let p = Path::new(&path);
        let tagged = open_tagged(p)?;
        let bytes = cover_bytes(tagged.tags(), p)?;
        let (_, mime) = sniff(&bytes);
        let file = save_cover(&dir, &bytes)?;
        let data_url = if want_data {
            Some(format!("data:{};base64,{}", mime, STANDARD.encode(&bytes)))
        } else {
            None
        };
        Some(CoverResult { file, data_url })
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_music_dir(app: AppHandle) -> Option<String> {
    app.path()
        .audio_dir()
        .ok()
        .map(|p| strip_verbatim(p).to_string_lossy().to_string())
}

/// Các tệp đã bị xóa khỏi ổ đĩa (bỏ qua nếu ổ đĩa / thư mục gốc đang không truy cập được)
#[tauri::command]
pub fn find_removed(paths: Vec<String>) -> Vec<String> {
    paths
        .into_iter()
        .filter(|p| {
            let pb = Path::new(p);
            !pb.exists() && root_exists(pb)
        })
        .collect()
}

#[tauri::command]
pub async fn read_lyrics(path: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || -> Option<String> {
        let p = Path::new(&path);
        let lrc = p.with_extension("lrc");
        if lrc.is_file() {
            if let Ok(b) = fs::read(&lrc) {
                let s = String::from_utf8_lossy(&b).to_string();
                return Some(s.trim_start_matches('\u{feff}').to_string());
            }
        }
        let tagged = open_tagged(p)?;
        for tag in tagged.tags() {
            if let Some(l) = tag.get_string(&ItemKey::Lyrics) {
                if !l.trim().is_empty() {
                    return Some(l.to_string());
                }
            }
        }
        None
    })
    .await
    .map_err(|e| e.to_string())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagEdit {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: String,
    pub genre: String,
    pub year: u32,
    pub track_no: u32,
}

/// Write title / artist / album / ... into the audio file and return the refreshed track
#[tauri::command]
pub async fn write_tags(app: AppHandle, path: String, edit: TagEdit) -> Result<TrackInfo, String> {
    let cover_dir = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("covers");
    tauri::async_runtime::spawn_blocking(move || -> Result<TrackInfo, String> {
        let p = PathBuf::from(&path);
        if !p.is_file() || !is_audio(&p) {
            return Err("Not an audio file".to_string());
        }
        let mut tagged = lofty::read_from_path(&p).map_err(|e| e.to_string())?;
        if tagged.primary_tag().is_none() && tagged.first_tag().is_none() {
            let tt = tagged.file_type().primary_tag_type();
            tagged.insert_tag(Tag::new(tt));
        }
        {
            let tag = tagged
                .primary_tag_mut()
                .ok_or_else(|| "This file does not support tags".to_string())?;
            let text = |v: &str| v.trim().to_string();
            if text(&edit.title).is_empty() { tag.remove_title(); } else { tag.set_title(text(&edit.title)); }
            if text(&edit.artist).is_empty() { tag.remove_artist(); } else { tag.set_artist(text(&edit.artist)); }
            if text(&edit.album).is_empty() { tag.remove_album(); } else { tag.set_album(text(&edit.album)); }
            if text(&edit.genre).is_empty() { tag.remove_genre(); } else { tag.set_genre(text(&edit.genre)); }
            if text(&edit.album_artist).is_empty() {
                tag.remove_key(&ItemKey::AlbumArtist);
            } else {
                tag.insert_text(ItemKey::AlbumArtist, text(&edit.album_artist));
            }
            if edit.year == 0 { tag.remove_year(); } else { tag.set_year(edit.year); }
            if edit.track_no == 0 { tag.remove_track(); } else { tag.set_track(edit.track_no); }
        }
        tagged
            .save_to_path(&p, WriteOptions::default())
            .map_err(|e| e.to_string())?;
        let m = fs::metadata(&p).map_err(|e| e.to_string())?;
        let path_str = p.to_string_lossy().to_string();
        let id = track_id(&path_str);
        read_track(&p, path_str, id, m.len(), mtime(&m), &cover_dir).ok_or_else(|| "Could not read the file again".to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
