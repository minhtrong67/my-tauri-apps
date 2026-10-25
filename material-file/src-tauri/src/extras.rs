//! Extra backend features: advanced search, file watcher, thumbnails, duplicate finder,
//! folder sizes (disk usage), tray + global shortcut. Author: minhtrong67 (with Claude).

use super::*;
use notify::{RecursiveMode, Watcher};
use regex::RegexBuilder;
use serde::Deserialize;
use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
    sync::atomic::AtomicU64,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

/* ------------------------------------------------------------ shared state */

/// Extra runtime state kept next to `OpState`.
#[derive(Default)]
pub struct ExtraState {
    pub search_seq: AtomicU64,
    pub watchers: Mutex<HashMap<String, Watch>>,
    pub tray_on: AtomicBool,
}

pub struct Watch {
    _watcher: notify::RecommendedWatcher,
    alive: Arc<AtomicBool>,
}

impl Drop for Watch {
    fn drop(&mut self) {
        self.alive.store(false, Ordering::Relaxed);
    }
}

/* ---------------------------------------------------------- advanced search */

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct SearchOpts {
    pub id: u64,
    pub regex: bool,
    /// lower-case extensions without dot; empty = any
    pub exts: Vec<String>,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
    pub after: Option<i64>,
    pub before: Option<i64>,
}

/// Recursive name search with optional regex, type, size and date filters.
/// A newer search (higher `id`) cancels the older one.
#[tauri::command]
pub async fn search_dir(
    state: State<'_, ExtraState>,
    root: String,
    query: String,
    limit: usize,
    opts: SearchOpts,
) -> Result<Vec<Entry>, String> {
    state.search_seq.store(opts.id, Ordering::SeqCst);
    let seq = &state.search_seq;
    let re = if opts.regex && !query.is_empty() {
        Some(RegexBuilder::new(&query).case_insensitive(true).build().map_err(|_| "bad-regex".to_string())?)
    } else {
        None
    };
    let needle = query.to_lowercase();
    let file_filters = !opts.exts.is_empty() || opts.min_size.is_some() || opts.max_size.is_some();
    let mut out = Vec::new();
    let mut stack = vec![PathBuf::from(&root)];
    let mut visited = 0usize;
    while let Some(dir) = stack.pop() {
        let Ok(rd) = fs::read_dir(&dir) else { continue };
        for item in rd.flatten() {
            visited += 1;
            if visited % 512 == 0 && seq.load(Ordering::Relaxed) != opts.id {
                return Err("cancelled".into());
            }
            if visited > 400_000 || out.len() >= limit {
                return Ok(out);
            }
            let Ok(md) = item.metadata() else { continue };
            let p = item.path();
            let name = item.file_name().to_string_lossy().into_owned();
            let hit = match &re {
                Some(r) => r.is_match(&name),
                None => needle.is_empty() || name.to_lowercase().contains(&needle),
            };
            if hit {
                let md_follow = fs::metadata(&p).unwrap_or_else(|_| md.clone());
                let is_dir = md_follow.is_dir();
                let mut ok = !(is_dir && file_filters);
                if ok && !is_dir {
                    if !opts.exts.is_empty() {
                        let ext = Path::new(&name)
                            .extension()
                            .map(|e| e.to_string_lossy().to_lowercase())
                            .unwrap_or_default();
                        ok = opts.exts.iter().any(|e| *e == ext);
                    }
                    let len = md_follow.len();
                    ok = ok && opts.min_size.map_or(true, |m| len >= m) && opts.max_size.map_or(true, |m| len <= m);
                }
                if ok && (opts.after.is_some() || opts.before.is_some()) {
                    let m = ms(md_follow.modified()).unwrap_or(0);
                    ok = opts.after.map_or(true, |a| m >= a) && opts.before.map_or(true, |b| m <= b);
                }
                if ok {
                    out.push(make_entry(&p, &md_follow));
                }
            }
            if md.is_dir() && !md.file_type().is_symlink() {
                stack.push(p);
            }
        }
    }
    Ok(out)
}

/* ------------------------------------------------------------- file watcher */

#[derive(Serialize, Clone)]
struct FsChanged {
    id: String,
    path: String,
}

/// Watches one folder (non-recursive) for pane `id` and emits a debounced `fs-changed` event.
#[tauri::command]
pub fn watch_dir(app: AppHandle, state: State<'_, ExtraState>, id: String, path: String) -> Result<(), String> {
    let mut map = state.watchers.lock().map_err(|_| "lock".to_string())?;
    map.remove(&id); // drops the old watcher and stops its debounce thread
    if path.is_empty() || !Path::new(&path).is_dir() {
        return Ok(());
    }
    let dirty = Arc::new(AtomicBool::new(false));
    let alive = Arc::new(AtomicBool::new(true));
    let flag = dirty.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if res.is_ok() {
            flag.store(true, Ordering::Relaxed);
        }
    })
    .map_err(|e| e.to_string())?;
    watcher.watch(Path::new(&path), RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;
    let (alive2, id2, path2) = (alive.clone(), id.clone(), path.clone());
    std::thread::spawn(move || {
        while alive2.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_millis(250));
            if dirty.swap(false, Ordering::Relaxed) {
                let _ = app.emit("fs-changed", FsChanged { id: id2.clone(), path: path2.clone() });
            }
        }
    });
    map.insert(id, Watch { _watcher: watcher, alive });
    Ok(())
}

/* --------------------------------------------------------------- thumbnails */

fn cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("thumbs");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Returns the path of a cached thumbnail (max `size` px) for an image, creating it on demand.
#[tauri::command]
pub async fn get_thumbnail(app: AppHandle, path: String, size: u32) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let src = PathBuf::from(&path);
        let md = fs::metadata(&src).map_err(|e| e.to_string())?;
        if md.len() > 64 * 1024 * 1024 {
            return Err("too-large".to_string());
        }
        let mut h = DefaultHasher::new();
        path.hash(&mut h);
        md.len().hash(&mut h);
        ms(md.modified()).hash(&mut h);
        size.hash(&mut h);
        let stem = format!("{:016x}", h.finish());
        let dir = cache_dir(&app)?;
        for ext in ["jpg", "png"] {
            let c = dir.join(format!("{stem}.{ext}"));
            if c.exists() {
                return Ok(c.to_string_lossy().into_owned());
            }
        }
        let img = image::open(&src).map_err(|e| e.to_string())?;
        let thumb = img.thumbnail(size, size);
        let (ext, target) = if thumb.color().has_alpha() {
            ("png", dir.join(format!("{stem}.png")))
        } else {
            ("jpg", dir.join(format!("{stem}.jpg")))
        };
        if ext == "png" {
            thumb.save_with_format(&target, image::ImageFormat::Png).map_err(|e| e.to_string())?;
        } else {
            let mut f = fs::File::create(&target).map_err(|e| e.to_string())?;
            let enc = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut f, 82);
            image::DynamicImage::ImageRgb8(thumb.to_rgb8()).write_with_encoder(enc).map_err(|e| e.to_string())?;
        }
        Ok(target.to_string_lossy().into_owned())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Deletes every cached thumbnail and returns the number of bytes freed.
#[tauri::command]
pub async fn clear_thumb_cache(app: AppHandle) -> Result<u64, String> {
    let dir = cache_dir(&app)?;
    let mut freed = 0u64;
    if let Ok(rd) = fs::read_dir(&dir) {
        for f in rd.flatten() {
            freed += f.metadata().map(|m| m.len()).unwrap_or(0);
            let _ = fs::remove_file(f.path());
        }
    }
    Ok(freed)
}

/* --------------------------------------------------------- duplicate finder */

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DupGroup {
    size: u64,
    paths: Vec<String>,
}

#[derive(Serialize, Clone)]
struct DupProgress {
    stage: &'static str,
    done: u64,
    total: u64,
}

fn hash_file(p: &Path, limit: Option<u64>, cancel: &AtomicBool) -> Option<u64> {
    let mut f = fs::File::open(p).ok()?;
    let mut h = DefaultHasher::new();
    let mut buf = vec![0u8; 256 * 1024];
    let mut left = limit.unwrap_or(u64::MAX);
    while left > 0 {
        if cancel.load(Ordering::Relaxed) {
            return None;
        }
        let want = buf.len().min(left.min(usize::MAX as u64) as usize);
        let n = f.read(&mut buf[..want]).ok()?;
        if n == 0 {
            break;
        }
        h.write(&buf[..n]);
        left -= n as u64;
    }
    Some(h.finish())
}

/// Finds duplicate files under `root`: same size, then same first-64 KB hash, then same full hash.
#[tauri::command]
pub async fn find_duplicates(
    app: AppHandle,
    state: State<'_, OpState>,
    root: String,
    min_size: u64,
) -> Result<Vec<DupGroup>, String> {
    state.cancel.store(false, Ordering::SeqCst);
    let cancel = state.cancel.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let emit = |stage: &'static str, done: u64, total: u64| {
            let _ = app.emit("dup-progress", DupProgress { stage, done, total });
        };
        // 1. walk and group by size
        let mut by_size: HashMap<u64, Vec<PathBuf>> = HashMap::new();
        let mut stack = vec![PathBuf::from(&root)];
        let mut seen = 0u64;
        while let Some(dir) = stack.pop() {
            let Ok(rd) = fs::read_dir(&dir) else { continue };
            for item in rd.flatten() {
                if cancel.load(Ordering::Relaxed) {
                    return Err("cancelled".to_string());
                }
                let Ok(ft) = item.file_type() else { continue };
                if ft.is_symlink() {
                    continue;
                }
                if ft.is_dir() {
                    stack.push(item.path());
                } else if let Ok(md) = item.metadata() {
                    if md.len() >= min_size.max(1) {
                        by_size.entry(md.len()).or_default().push(item.path());
                        seen += 1;
                        if seen % 400 == 0 {
                            emit("scan", seen, 0);
                        }
                    }
                }
            }
        }
        let cands: Vec<(u64, Vec<PathBuf>)> = by_size.into_iter().filter(|(_, v)| v.len() > 1).collect();
        let total: u64 = cands.iter().map(|(_, v)| v.len() as u64).sum();
        let mut done = 0u64;
        let mut groups = Vec::new();
        for (size, files) in cands {
            // 2. partial hash, 3. full hash
            let mut partial: HashMap<u64, Vec<PathBuf>> = HashMap::new();
            for p in files {
                if cancel.load(Ordering::Relaxed) {
                    return Err("cancelled".to_string());
                }
                done += 1;
                if done % 8 == 0 {
                    emit("hash", done, total);
                }
                if let Some(h) = hash_file(&p, Some(64 * 1024), &cancel) {
                    partial.entry(h).or_default().push(p);
                }
            }
            for (_, same) in partial.into_iter().filter(|(_, v)| v.len() > 1) {
                let mut full: HashMap<u64, Vec<PathBuf>> = HashMap::new();
                for p in same {
                    let h = if size <= 64 * 1024 { Some(0) } else { hash_file(&p, None, &cancel) };
                    if let Some(h) = h {
                        full.entry(h).or_default().push(p);
                    }
                }
                for (_, g) in full.into_iter().filter(|(_, v)| v.len() > 1) {
                    let mut paths: Vec<String> = g.iter().map(|p| p.to_string_lossy().into_owned()).collect();
                    paths.sort();
                    groups.push(DupGroup { size, paths });
                }
            }
        }
        if cancel.load(Ordering::Relaxed) {
            return Err("cancelled".to_string());
        }
        groups.sort_by(|a, b| (b.size * b.paths.len() as u64).cmp(&(a.size * a.paths.len() as u64)));
        Ok(groups)
    })
    .await
    .map_err(|e| e.to_string())?
}

/* ------------------------------------------------------------- disk usage */

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SizeItem {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
}

/// Like `tree_size` but never follows links, so junction cycles cannot loop forever.
fn plain_size(p: &Path) -> u64 {
    let Ok(md) = fs::symlink_metadata(p) else { return 0 };
    if md.file_type().is_symlink() {
        return 0;
    }
    if md.is_dir() {
        fs::read_dir(p).map(|rd| rd.flatten().map(|e| plain_size(&e.path())).sum()).unwrap_or(0)
    } else {
        md.len()
    }
}

/// Size of every direct child of `path` (folders are measured recursively, in parallel).
#[tauri::command]
pub async fn folder_sizes(path: String) -> Result<Vec<SizeItem>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let rd = fs::read_dir(&path).map_err(|e| e.to_string())?;
        let items: Vec<PathBuf> = rd.flatten().map(|e| e.path()).collect();
        let next = std::sync::atomic::AtomicUsize::new(0);
        let results: Mutex<Vec<SizeItem>> = Mutex::new(Vec::new());
        std::thread::scope(|s| {
            for _ in 0..6 {
                s.spawn(|| loop {
                    let i = next.fetch_add(1, Ordering::Relaxed);
                    let Some(p) = items.get(i) else { break };
                    let is_dir = fs::symlink_metadata(p).map(|m| m.is_dir()).unwrap_or(false);
                    let item = SizeItem {
                        name: p.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
                        path: p.to_string_lossy().into_owned(),
                        is_dir,
                        size: plain_size(p),
                    };
                    if let Ok(mut r) = results.lock() {
                        r.push(item);
                    }
                });
            }
        });
        let mut out = results.into_inner().unwrap_or_default();
        out.sort_by(|a, b| b.size.cmp(&a.size));
        Ok(out)
    })
    .await
    .map_err(|e| e.to_string())?
}

/* ------------------------------------------- tray + global shortcut (optional) */

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

pub fn toggle_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false) {
            let _ = w.hide();
        } else {
            show_main(app);
        }
    }
}

/// Turns the system-tray icon (and "close hides the window") on or off.
#[tauri::command]
pub fn set_tray(app: AppHandle, state: State<'_, ExtraState>, enabled: bool, labels: Vec<String>) -> Result<(), String> {
    state.tray_on.store(enabled, Ordering::Relaxed);
    if !enabled {
        let _ = app.remove_tray_by_id("main");
        return Ok(());
    }
    let label = |i: usize, d: &str| labels.get(i).cloned().unwrap_or_else(|| d.to_string());
    let show = MenuItem::with_id(&app, "show", label(0, "Open Material File"), true, None::<&str>).map_err(|e| e.to_string())?;
    let new_w = MenuItem::with_id(&app, "new", label(1, "New window"), true, None::<&str>).map_err(|e| e.to_string())?;
    let quit = MenuItem::with_id(&app, "quit", label(2, "Quit"), true, None::<&str>).map_err(|e| e.to_string())?;
    let menu = Menu::with_items(&app, &[&show, &new_w, &quit]).map_err(|e| e.to_string())?;
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
        return Ok(());
    }
    let mut b = TrayIconBuilder::with_id("main")
        .tooltip("Material File")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, ev| match ev.id.as_ref() {
            "show" => show_main(app),
            "new" => {
                let _ = app.emit("tray-new-window", ());
                show_main(app);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, ev| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = ev {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon().cloned() {
        b = b.icon(icon);
    }
    b.build(&app).map_err(|e| e.to_string())?;
    Ok(())
}

/// Registers (or removes) the global shortcut Ctrl+Alt+E that shows/hides the main window.
#[tauri::command]
pub fn set_global_shortcut(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
    let sc = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyE);
    let gs = app.global_shortcut();
    if enabled {
        if !gs.is_registered(sc.clone()) {
            gs.register(sc.clone()).map_err(|e| e.to_string())?;
        }
    } else if gs.is_registered(sc.clone()) {
        gs.unregister(sc.clone()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/* ----------------------------------------------------- undo delete (Recycle Bin) */

/// Restores items that were just moved to the Recycle Bin, matching them by their original path.
#[tauri::command]
pub async fn restore_trashed(paths: Vec<String>) -> Result<usize, String> {
    tauri::async_runtime::spawn_blocking(move || restore_impl(paths)).await.map_err(|e| e.to_string())?
}

#[cfg(windows)]
fn restore_impl(paths: Vec<String>) -> Result<usize, String> {
    let wanted: Vec<String> = paths.iter().map(|p| p.replace('/', "\\").to_lowercase()).collect();
    let items = trash::os_limited::list().map_err(|e| e.to_string())?;
    // newest deletions first, one item per requested path
    let mut picked = Vec::new();
    for w in &wanted {
        let mut best: Option<trash::TrashItem> = None;
        for it in items.iter() {
            let orig = it.original_path().to_string_lossy().replace('/', "\\").to_lowercase();
            if orig == *w && best.as_ref().map_or(true, |b| it.time_deleted > b.time_deleted) {
                best = Some(it.clone());
            }
        }
        if let Some(b) = best {
            picked.push(b);
        }
    }
    let n = picked.len();
    if n == 0 {
        return Err("not-found".into());
    }
    trash::os_limited::restore_all(picked).map_err(|e| e.to_string())?;
    Ok(n)
}

#[cfg(not(windows))]
fn restore_impl(_paths: Vec<String>) -> Result<usize, String> {
    Err("unsupported".into())
}
