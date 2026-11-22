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

/// Asks the Windows shell for an image of `path` (its real thumbnail, or its icon when `icon_only`), exactly like Explorer does.
/// This uses the system thumbnail cache, so it is fast and also works for videos, PDFs, Office files, shortcuts and executables.
#[cfg(windows)]
fn shell_image(path: &str, px: i32, icon_only: bool) -> Result<image::RgbaImage, String> {
    use windows::{
        core::HSTRING,
        Win32::{
            Foundation::SIZE,
            Graphics::Gdi::{
                CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, GetObjectW, BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HGDIOBJ,
            },
            System::Com::{CoInitializeEx, COINIT_MULTITHREADED},
            UI::Shell::{IShellItemImageFactory, SHCreateItemFromParsingName, SIIGBF_BIGGERSIZEOK, SIIGBF_ICONONLY, SIIGBF_THUMBNAILONLY},
        },
    };
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let wide = HSTRING::from(path);
        let factory: IShellItemImageFactory = SHCreateItemFromParsingName(&wide, None).map_err(|e| e.to_string())?;
        let flags = if icon_only { SIIGBF_ICONONLY | SIIGBF_BIGGERSIZEOK } else { SIIGBF_THUMBNAILONLY | SIIGBF_BIGGERSIZEOK };
        let hbmp = factory.GetImage(SIZE { cx: px, cy: px }, flags).map_err(|e| e.to_string())?;
        let mut bm = BITMAP::default();
        let got = GetObjectW(HGDIOBJ(hbmp.0), std::mem::size_of::<BITMAP>() as i32, Some(&mut bm as *mut BITMAP as *mut std::ffi::c_void));
        if got == 0 || bm.bmWidth <= 0 || bm.bmHeight <= 0 {
            let _ = DeleteObject(HGDIOBJ(hbmp.0));
            return Err("bad-bitmap".into());
        }
        let (w, h) = (bm.bmWidth, bm.bmHeight);
        let mut bi = BITMAPINFO::default();
        bi.bmiHeader = BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: w,
            biHeight: -h,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        };
        let mut buf = vec![0u8; (w as usize) * (h as usize) * 4];
        let hdc = CreateCompatibleDC(None);
        let lines = GetDIBits(hdc, hbmp, 0, h as u32, Some(buf.as_mut_ptr() as *mut std::ffi::c_void), &mut bi, DIB_RGB_COLORS);
        let _ = DeleteDC(hdc);
        let _ = DeleteObject(HGDIOBJ(hbmp.0));
        if lines == 0 {
            return Err("no-bits".into());
        }
        for px in buf.chunks_exact_mut(4) {
            let (b, g, r, a) = (px[0], px[1], px[2], px[3]);
            // the shell returns premultiplied alpha
            let un = |c: u8| if a == 0 || a == 255 { c } else { ((c as u32 * 255 + a as u32 / 2) / a as u32).min(255) as u8 };
            px[0] = un(r);
            px[1] = un(g);
            px[2] = un(b);
            px[3] = a;
        }
        image::RgbaImage::from_raw(w as u32, h as u32, buf).ok_or_else(|| "bad-size".to_string())
    }
}

/// Returns the path of a cached thumbnail (max `size` px) for a file, creating it on demand.
/// `kind`: "thumb" (real content thumbnail) or "icon" (the file's shell icon, e.g. for .lnk / .exe).
#[tauri::command]
pub async fn get_thumbnail(app: AppHandle, path: String, size: u32, kind: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let src = PathBuf::from(&path);
        let md = fs::metadata(&src).map_err(|e| e.to_string())?;
        let icon_only = kind.as_deref() == Some("icon");
        if !icon_only && md.len() > 256 * 1024 * 1024 {
            return Err("too-large".to_string());
        }
        let mut h = DefaultHasher::new();
        path.hash(&mut h);
        md.len().hash(&mut h);
        ms(md.modified()).hash(&mut h);
        size.hash(&mut h);
        icon_only.hash(&mut h);
        let stem = format!("{:016x}", h.finish());
        let dir = cache_dir(&app)?;
        for ext in ["jpg", "png"] {
            let c = dir.join(format!("{stem}.{ext}"));
            if c.exists() {
                return Ok(c.to_string_lossy().into_owned());
            }
        }
        #[cfg(windows)]
        {
            if let Ok(img) = shell_image(&path, size as i32, icon_only) {
                let target = dir.join(format!("{stem}.png"));
                let t = image::DynamicImage::ImageRgba8(img);
                let t = if t.width() > size || t.height() > size { t.thumbnail(size, size) } else { t };
                if t.save_with_format(&target, image::ImageFormat::Png).is_ok() {
                    return Ok(target.to_string_lossy().into_owned());
                }
            }
            if icon_only {
                return Err("no-icon".into());
            }
        }
        if icon_only {
            return Err("unsupported".into());
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

/// Starts a user-defined context-menu command (program + arguments, no shell involved).
#[tauri::command]
pub fn run_custom(program: String, args: Vec<String>) -> Result<(), String> {
    if program.trim().is_empty() {
        return Err("empty-program".into());
    }
    let mut cmd = std::process::Command::new(program.trim());
    cmd.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// Opens a built-in Windows tool (Control Panel, Task Manager, Device Manager ...).
#[tauri::command]
pub fn run_system(kind: String) -> Result<(), String> {
    let (prog, args): (&str, &[&str]) = match kind.as_str() {
        "control" => ("control.exe", &[]),
        "settings" => ("explorer.exe", &["ms-settings:"]),
        "taskmgr" => ("taskmgr.exe", &[]),
        "devmgmt" => ("mmc.exe", &["devmgmt.msc"]),
        "diskmgmt" => ("mmc.exe", &["diskmgmt.msc"]),
        "services" => ("mmc.exe", &["services.msc"]),
        "eventvwr" => ("mmc.exe", &["eventvwr.msc"]),
        "cleanmgr" => ("cleanmgr.exe", &[]),
        "sysinfo" => ("msinfo32.exe", &[]),
        "envvars" => ("rundll32.exe", &["sysdm.cpl,EditEnvironmentVariables"]),
        "network" => ("control.exe", &["ncpa.cpl"]),
        "programs" => ("control.exe", &["appwiz.cpl"]),
        "regedit" => ("regedit.exe", &[]),
        _ => return Err("unknown-tool".into()),
    };
    std::process::Command::new(prog).args(args).spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct CleanResult {
    freed: u64,
    files: u32,
    skipped: u32,
}

fn clean_dir(dir: &Path, cutoff: std::time::SystemTime, r: &mut CleanResult, depth: u32) {
    let Ok(rd) = fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let p = e.path();
        let Ok(ft) = e.file_type() else { continue };
        if ft.is_symlink() {
            continue;
        }
        let old = e.metadata().ok().and_then(|m| m.modified().ok()).map(|t| t < cutoff).unwrap_or(false);
        if ft.is_dir() {
            if depth < 8 {
                clean_dir(&p, cutoff, r, depth + 1);
                if old {
                    let _ = fs::remove_dir(&p); // only succeeds when it is empty
                }
            }
        } else if old {
            let len = e.metadata().map(|m| m.len()).unwrap_or(0);
            if fs::remove_file(&p).is_ok() {
                r.freed += len;
                r.files += 1;
            } else {
                r.skipped += 1; // in use
            }
        }
    }
}

/// Deletes temp files that have not been modified for a day (files in use are skipped).
#[tauri::command]
pub async fn clean_temp() -> Result<CleanResult, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let cutoff = std::time::SystemTime::now() - std::time::Duration::from_secs(24 * 3600);
        let mut r = CleanResult { freed: 0, files: 0, skipped: 0 };
        clean_dir(&std::env::temp_dir(), cutoff, &mut r, 0);
        r
    })
    .await
    .map_err(|e| e.to_string())
}

/// The Windows accent colour ("#RRGGBB"), read from the registry; None on other systems.
#[tauri::command]
pub fn get_accent_color() -> Option<String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let out = std::process::Command::new("reg")
            .args(["query", r"HKCU\Software\Microsoft\Windows\DWM", "/v", "AccentColor"])
            .creation_flags(0x0800_0000)
            .output()
            .ok()?;
        let text = String::from_utf8_lossy(&out.stdout).into_owned();
        let hex = text.split_whitespace().find(|w| w.starts_with("0x"))?;
        let v = u32::from_str_radix(&hex[2..], 16).ok()?;
        // DWORD is 0xAABBGGRR
        return Some(format!("#{:02X}{:02X}{:02X}", v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff));
    }
    #[allow(unreachable_code)]
    None
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

/* ------------------------------------------------ folder sizes for the Size column */

/// one cancellation token per caller slot (each file list asks for its own sizes)
const TOKEN_ZERO: AtomicU64 = AtomicU64::new(0);
static SIZE_TOKENS: [AtomicU64; 64] = [TOKEN_ZERO; 64];

#[derive(Serialize, Clone)]
struct DirSize {
    path: String,
    size: u64,
    partial: bool,
}

/// Total size of a folder tree (links are not followed). Stops early when a newer request supersedes `token` or the deadline passes.
fn walk_size(root: &Path, slot: &AtomicU64, token: u64, deadline: std::time::Instant) -> (u64, bool) {
    let mut total = 0u64;
    let mut stack = vec![root.to_path_buf()];
    let mut n = 0u32;
    while let Some(dir) = stack.pop() {
        let Ok(rd) = fs::read_dir(&dir) else { continue };
        for e in rd.flatten() {
            n += 1;
            if n % 256 == 0 && (slot.load(Ordering::Relaxed) != token || std::time::Instant::now() > deadline) {
                return (total, true);
            }
            let Ok(ft) = e.file_type() else { continue };
            if ft.is_symlink() {
                continue;
            }
            if ft.is_dir() {
                stack.push(e.path());
            } else if let Ok(m) = e.metadata() {
                total += m.len();
            }
        }
    }
    (total, false)
}

/// Measures several folders in the background and emits a `dir-size` event as each one finishes. A newer call (higher
/// `token` for the same `slot`) cancels the work of older ones, so navigating away never leaves threads busy.
#[tauri::command]
pub async fn dir_sizes(app: AppHandle, paths: Vec<String>, slot: u32, token: u64) -> Result<(), String> {
    let slot = (slot % 64) as usize;
    SIZE_TOKENS[slot].store(token, Ordering::Relaxed);
    tauri::async_runtime::spawn_blocking(move || {
        let next = std::sync::atomic::AtomicUsize::new(0);
        std::thread::scope(|s| {
            for _ in 0..3 {
                s.spawn(|| loop {
                    if SIZE_TOKENS[slot].load(Ordering::Relaxed) != token {
                        break;
                    }
                    let i = next.fetch_add(1, Ordering::Relaxed);
                    let Some(p) = paths.get(i) else { break };
                    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(8);
                    let (size, partial) = walk_size(Path::new(p), &SIZE_TOKENS[slot], token, deadline);
                    if SIZE_TOKENS[slot].load(Ordering::Relaxed) == token {
                        let _ = app.emit("dir-size", DirSize { path: p.clone(), size, partial });
                    }
                });
            }
        });
    })
    .await
    .map_err(|e| e.to_string())
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
    let show = MenuItem::with_id(&app, "show", label(0, "Open Fluent File"), true, None::<&str>).map_err(|e| e.to_string())?;
    let new_w = MenuItem::with_id(&app, "new", label(1, "New window"), true, None::<&str>).map_err(|e| e.to_string())?;
    let quit = MenuItem::with_id(&app, "quit", label(2, "Quit"), true, None::<&str>).map_err(|e| e.to_string())?;
    let menu = Menu::with_items(&app, &[&show, &new_w, &quit]).map_err(|e| e.to_string())?;
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
        return Ok(());
    }
    let mut b = TrayIconBuilder::with_id("main")
        .tooltip("Fluent File")
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
