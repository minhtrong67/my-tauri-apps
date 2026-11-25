#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    env, fs,
    path::{Path, PathBuf},
    process::Command,
    sync::{Mutex, OnceLock},
    thread,
    time::{Duration, Instant},
};
use tauri::Manager;

// Mỗi lượt mở tối đa 5 trang web (5 tab)
const MAX_URLS: usize = 5;

// Chrome, Edge, Cốc Cốc... đều lưu ảnh đại diện trong thư mục profile với các tên này
const AVATARS: [&str; 3] = [
    "Google Profile Picture.png",
    "Edge Profile Picture.png",
    "Accounts Profile Picture.png",
];

#[derive(Clone, Copy, PartialEq)]
enum Kind {
    Chromium, // Chrome, Edge, Brave, Vivaldi, Cốc Cốc: --profile-directory
    Firefox,  // profiles.ini và tham số -P
}

struct Def {
    id: &'static str,
    name: &'static str,
    kind: Kind,
}

const DEFS: &[Def] = &[
    Def { id: "chrome", name: "Google Chrome", kind: Kind::Chromium },
    Def { id: "edge", name: "Microsoft Edge", kind: Kind::Chromium },
    Def { id: "brave", name: "Brave", kind: Kind::Chromium },
    Def { id: "vivaldi", name: "Vivaldi", kind: Kind::Chromium },
    Def { id: "coccoc", name: "Cốc Cốc", kind: Kind::Chromium },
    Def { id: "firefox", name: "Mozilla Firefox", kind: Kind::Firefox },
];

fn def(id: &str) -> Result<&'static Def, String> {
    DEFS.iter()
        .find(|d| d.id == id)
        .ok_or_else(|| "unknown_browser".to_string())
}

#[derive(Serialize)]
struct Browser {
    id: &'static str,
    name: &'static str,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Profile {
    dir: String,
    name: String,
    email: String,
    has_avatar: bool,
}

// Một lượt mở: profile nào và các tab cần mở (rỗng = chỉ mở profile)
#[derive(Deserialize)]
struct Launch {
    dir: String,
    urls: Vec<String>,
}

// Theo từng trình duyệt: (thư mục, tên hiển thị) — cache để việc dò profile đang mở không phải đọc lại file
fn names() -> &'static Mutex<HashMap<String, Vec<(String, String)>>> {
    static N: OnceLock<Mutex<HashMap<String, Vec<(String, String)>>>> = OnceLock::new();
    N.get_or_init(Default::default)
}

// Cửa sổ do app này mở, khóa là "trình duyệt:profile"
fn tracked() -> &'static Mutex<HashMap<String, Vec<isize>>> {
    static T: OnceLock<Mutex<HashMap<String, Vec<isize>>>> = OnceLock::new();
    T.get_or_init(Default::default)
}

static LAUNCH_LOCK: Mutex<()> = Mutex::new(());

fn env_path(v: &str) -> Option<PathBuf> {
    env::var_os(v).map(PathBuf::from)
}

// Tên tiến trình và lớp cửa sổ dùng để nhận diện cửa sổ của từng trình duyệt
fn exe_name(id: &str) -> &'static str {
    match id {
        "chrome" => "chrome.exe",
        "edge" => "msedge.exe",
        "brave" => "brave.exe",
        "vivaldi" => "vivaldi.exe",
        "coccoc" => "browser.exe",
        _ => "firefox.exe",
    }
}

fn window_class(id: &str) -> &'static str {
    if id == "firefox" {
        "MozillaWindowClass"
    } else {
        "Chrome_WidgetWin_1"
    }
}

// ---- Vị trí file chạy ----
#[cfg(target_os = "windows")]
fn exe_path(id: &str) -> Option<PathBuf> {
    let rel = match id {
        "chrome" => r"Google\Chrome\Application\chrome.exe",
        "edge" => r"Microsoft\Edge\Application\msedge.exe",
        "brave" => r"BraveSoftware\Brave-Browser\Application\brave.exe",
        "vivaldi" => r"Vivaldi\Application\vivaldi.exe",
        "coccoc" => r"CocCoc\Browser\Application\browser.exe",
        "firefox" => r"Mozilla Firefox\firefox.exe",
        _ => return None,
    };
    ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"]
        .iter()
        .filter_map(|v| env_path(v))
        .map(|base| base.join(rel))
        .find(|p| p.exists())
}
#[cfg(target_os = "macos")]
fn exe_path(id: &str) -> Option<PathBuf> {
    let p = match id {
        "chrome" => "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "edge" => "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "brave" => "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "vivaldi" => "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi",
        "firefox" => "/Applications/Firefox.app/Contents/MacOS/firefox",
        _ => return None,
    };
    let p = PathBuf::from(p);
    p.exists().then_some(p)
}
#[cfg(target_os = "linux")]
fn exe_path(id: &str) -> Option<PathBuf> {
    let names: &[&str] = match id {
        "chrome" => &["google-chrome", "google-chrome-stable"],
        "edge" => &["microsoft-edge", "microsoft-edge-stable"],
        "brave" => &["brave-browser", "brave"],
        "vivaldi" => &["vivaldi", "vivaldi-stable"],
        "firefox" => &["firefox"],
        _ => return None,
    };
    let path = env::var_os("PATH")?;
    for dir in env::split_paths(&path) {
        for n in names {
            let p = dir.join(n);
            if p.is_file() {
                return Some(p);
            }
        }
    }
    None
}

// ---- Thư mục dữ liệu (Chromium) ----
#[cfg(target_os = "windows")]
fn data_dir(id: &str) -> Option<PathBuf> {
    let rel = match id {
        "chrome" => r"Google\Chrome\User Data",
        "edge" => r"Microsoft\Edge\User Data",
        "brave" => r"BraveSoftware\Brave-Browser\User Data",
        "vivaldi" => r"Vivaldi\User Data",
        "coccoc" => r"CocCoc\Browser\User Data",
        _ => return None,
    };
    env_path("LOCALAPPDATA").map(|p| p.join(rel))
}
#[cfg(target_os = "macos")]
fn data_dir(id: &str) -> Option<PathBuf> {
    let rel = match id {
        "chrome" => "Google/Chrome",
        "edge" => "Microsoft Edge",
        "brave" => "BraveSoftware/Brave-Browser",
        "vivaldi" => "Vivaldi",
        _ => return None,
    };
    env_path("HOME").map(|p| p.join("Library/Application Support").join(rel))
}
#[cfg(target_os = "linux")]
fn data_dir(id: &str) -> Option<PathBuf> {
    let rel = match id {
        "chrome" => "google-chrome",
        "edge" => "microsoft-edge",
        "brave" => "BraveSoftware/Brave-Browser",
        "vivaldi" => "vivaldi",
        _ => return None,
    };
    env_path("HOME").map(|p| p.join(".config").join(rel))
}

// ---- Thư mục chứa profiles.ini của Firefox ----
#[cfg(target_os = "windows")]
fn firefox_root() -> Option<PathBuf> {
    env_path("APPDATA").map(|p| p.join(r"Mozilla\Firefox"))
}
#[cfg(target_os = "macos")]
fn firefox_root() -> Option<PathBuf> {
    env_path("HOME").map(|p| p.join("Library/Application Support/Firefox"))
}
#[cfg(target_os = "linux")]
fn firefox_root() -> Option<PathBuf> {
    env_path("HOME").map(|p| p.join(".mozilla/firefox"))
}

// Win32 thuần (user32/kernel32), không cần thêm crate
#[cfg(windows)]
mod win {
    use std::ffi::c_void;

    type Hwnd = *mut c_void;
    type Handle = *mut c_void;
    type EnumProc = unsafe extern "system" fn(Hwnd, isize) -> i32;

    #[link(name = "user32")]
    extern "system" {
        fn EnumWindows(cb: EnumProc, lparam: isize) -> i32;
        fn IsWindowVisible(h: Hwnd) -> i32;
        fn GetClassNameW(h: Hwnd, buf: *mut u16, max: i32) -> i32;
        fn GetWindowTextW(h: Hwnd, buf: *mut u16, max: i32) -> i32;
        fn GetWindowThreadProcessId(h: Hwnd, pid: *mut u32) -> u32;
        fn PostMessageW(h: Hwnd, msg: u32, w: usize, l: isize) -> i32;
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn OpenProcess(access: u32, inherit: i32, pid: u32) -> Handle;
        fn QueryFullProcessImageNameW(p: Handle, flags: u32, buf: *mut u16, size: *mut u32) -> i32;
        fn CloseHandle(h: Handle) -> i32;
    }

    const WM_CLOSE: u32 = 0x0010;
    const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;

    struct Ctx<'a> {
        exe: &'a str,
        class: &'a str,
        out: Vec<(isize, String)>,
    }

    // Cửa sổ có thuộc file chạy `exe` (ví dụ chrome.exe) hay không
    fn is_exe(h: Hwnd, exe: &str) -> bool {
        unsafe {
            let mut pid = 0u32;
            GetWindowThreadProcessId(h, &mut pid);
            let p = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if p.is_null() {
                return false;
            }
            let mut buf = [0u16; 520];
            let mut len = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(p, 0, buf.as_mut_ptr(), &mut len);
            CloseHandle(p);
            ok != 0
                && String::from_utf16_lossy(&buf[..len as usize])
                    .to_lowercase()
                    .ends_with(&format!("\\{exe}"))
        }
    }

    unsafe extern "system" fn collect(h: Hwnd, lp: isize) -> i32 {
        let ctx = &mut *(lp as *mut Ctx);
        if IsWindowVisible(h) != 0 {
            let mut cls = [0u16; 64];
            let n = GetClassNameW(h, cls.as_mut_ptr(), 64);
            if n > 0 && String::from_utf16_lossy(&cls[..n as usize]) == ctx.class {
                let mut t = [0u16; 512];
                let n = GetWindowTextW(h, t.as_mut_ptr(), 512);
                if n > 0 && is_exe(h, ctx.exe) {
                    ctx.out.push((h as isize, String::from_utf16_lossy(&t[..n as usize])));
                }
            }
        }
        1
    }

    // Các cửa sổ đang hiện của một trình duyệt: (handle, tiêu đề)
    pub fn windows(exe: &str, class: &str) -> Vec<(isize, String)> {
        let mut ctx = Ctx { exe, class, out: Vec::new() };
        unsafe {
            EnumWindows(collect, &mut ctx as *mut Ctx as isize);
        }
        ctx.out
    }

    // Gửi yêu cầu đóng bình thường, trình duyệt vẫn hỏi/lưu phiên như khi bấm X
    pub fn close(h: isize) {
        unsafe {
            PostMessageW(h as Hwnd, WM_CLOSE, 0, 0);
        }
    }
}

#[cfg(not(windows))]
mod win {
    pub fn windows(_: &str, _: &str) -> Vec<(isize, String)> {
        Vec::new()
    }
    pub fn close(_: isize) {}
}

// Đọc danh sách profile từ file Local State (Chrome, Edge, Brave, Vivaldi, Cốc Cốc)
fn read_chromium(id: &str) -> Result<Vec<Profile>, String> {
    let root = data_dir(id).ok_or("no_data_dir")?;
    let raw = fs::read_to_string(root.join("Local State"))
        .map_err(|e| format!("read_failed:{e}"))?;
    let json: serde_json::Value = serde_json::from_str(&raw).map_err(|_| "bad_state")?;
    let cache = json["profile"]["info_cache"].as_object().ok_or("bad_state")?;

    let list: Vec<Profile> = cache
        .iter()
        .map(|(dir, v)| {
            let text = |k: &str| v[k].as_str().unwrap_or("").to_string();
            Profile {
                dir: dir.clone(),
                name: text("name"),
                email: text("user_name"),
                has_avatar: AVATARS.iter().any(|f| root.join(dir).join(f).is_file()),
            }
        })
        .collect();
    Ok(list)
}

// Đọc danh sách profile từ profiles.ini của Firefox (khóa là tên profile)
fn read_firefox() -> Result<Vec<Profile>, String> {
    let root = firefox_root().ok_or("no_data_dir")?;
    let raw = fs::read_to_string(root.join("profiles.ini"))
        .map_err(|e| format!("read_failed:{e}"))?;

    let mut names: Vec<String> = Vec::new();
    let mut in_profile = false;
    let mut name = String::new();
    for line in raw.lines() {
        let line = line.trim().trim_start_matches('\u{feff}');
        if line.starts_with('[') {
            if in_profile && !name.is_empty() {
                names.push(std::mem::take(&mut name));
            }
            name.clear();
            in_profile = line.starts_with("[Profile");
        } else if in_profile {
            if let Some(v) = line.strip_prefix("Name=") {
                name = v.trim().to_string();
            }
        }
    }
    if in_profile && !name.is_empty() {
        names.push(name);
    }

    Ok(names
        .into_iter()
        .map(|n| Profile { dir: n.clone(), name: n, email: String::new(), has_avatar: false })
        .collect())
}

fn read_profiles(id: &str) -> Result<Vec<Profile>, String> {
    let mut list = match def(id)?.kind {
        Kind::Chromium => read_chromium(id)?,
        Kind::Firefox => read_firefox()?,
    };
    list.sort_by_key(|p| p.name.to_lowercase());
    names().lock().unwrap().insert(
        id.to_string(),
        list.iter().map(|p| (p.dir.clone(), p.name.clone())).collect(),
    );
    Ok(list)
}

// Tiêu đề cửa sổ có dạng "Trang - Tên profile" hoặc "Trang - Tên profile - Tên trình duyệt"
fn title_has(title: &str, name: &str) -> bool {
    let pat = format!(" - {name}");
    title.match_indices(pat.as_str()).any(|(i, _)| {
        let rest = &title[i + pat.len()..];
        rest.is_empty() || rest.starts_with(" - ")
    })
}

// Gom cửa sổ theo profile: ưu tiên cửa sổ app đã mở, bổ sung bằng tiêu đề cửa sổ (Chromium)
fn profile_windows(id: &str) -> HashMap<String, Vec<isize>> {
    let wins = win::windows(exe_name(id), window_class(id));
    let live: HashSet<isize> = wins.iter().map(|w| w.0).collect();
    let mut map: HashMap<String, Vec<isize>> = HashMap::new();
    let prefix = format!("{id}:");

    {
        let mut t = tracked().lock().unwrap();
        for (key, hs) in t.iter_mut() {
            if let Some(dir) = key.strip_prefix(prefix.as_str()) {
                hs.retain(|h| live.contains(h));
                if !hs.is_empty() {
                    map.insert(dir.to_string(), hs.clone());
                }
            }
        }
    }

    // Firefox không ghi tên profile lên tiêu đề, nên chỉ nhận diện cửa sổ do app mở
    if def(id).map(|d| d.kind == Kind::Chromium).unwrap_or(false) {
        let empty = names().lock().unwrap().get(id).map_or(true, |v| v.is_empty());
        if empty {
            let _ = read_profiles(id);
        }
        let known = names().lock().unwrap().get(id).cloned().unwrap_or_default();

        for (h, title) in &wins {
            let best = known
                .iter()
                .filter(|(_, n)| !n.is_empty() && title_has(title, n))
                .max_by_key(|(_, n)| n.len());
            if let Some((dir, _)) = best {
                let e = map.entry(dir.clone()).or_default();
                if !e.contains(h) {
                    e.push(*h);
                }
            }
        }
    }
    map
}

// Mở một profile cùng các tab, rồi đợi cửa sổ mới xuất hiện để ghi nhận
fn launch_one(id: &str, kind: Kind, exe: &Path, dir: &str, urls: &[String]) {
    let (exe_file, class) = (exe_name(id), window_class(id));
    let before: HashSet<isize> = win::windows(exe_file, class).into_iter().map(|w| w.0).collect();

    let mut cmd = Command::new(exe);
    match kind {
        Kind::Chromium => {
            cmd.arg(format!("--profile-directory={dir}"))
                .arg("--new-window")
                .args(urls);
        }
        Kind::Firefox => {
            // -no-remote để mỗi profile chạy trong một tiến trình riêng
            cmd.arg("-no-remote").arg("-P").arg(dir).arg("-new-window");
            let mut it = urls.iter();
            cmd.arg(it.next().map(String::as_str).unwrap_or("about:newtab"));
            for u in it {
                cmd.arg("-new-tab").arg(u);
            }
        }
    }
    if cmd.spawn().is_err() {
        return;
    }
    if !cfg!(windows) {
        thread::sleep(Duration::from_millis(700));
        return;
    }
    let key = format!("{id}:{dir}");
    let start = Instant::now();
    while start.elapsed() < Duration::from_secs(6) {
        thread::sleep(Duration::from_millis(150));
        if win::windows(exe_file, class).iter().any(|w| !before.contains(&w.0)) {
            thread::sleep(Duration::from_millis(250));
            let fresh: Vec<isize> = win::windows(exe_file, class)
                .into_iter()
                .map(|w| w.0)
                .filter(|h| !before.contains(h))
                .collect();
            tracked().lock().unwrap().entry(key).or_default().extend(fresh);
            return;
        }
    }
}

// Các trình duyệt hỗ trợ đang được cài trên máy
#[tauri::command]
async fn list_browsers() -> Vec<Browser> {
    DEFS.iter()
        .filter(|d| exe_path(d.id).is_some())
        .map(|d| Browser { id: d.id, name: d.name })
        .collect()
}

#[tauri::command]
async fn list_profiles(browser: String) -> Result<Vec<Profile>, String> {
    read_profiles(&browser)
}

// Trả ảnh dạng byte thô, nhẹ hơn base64 và chỉ tải khi hàng được hiển thị
#[tauri::command]
async fn profile_avatar(browser: String, dir: String) -> Result<tauri::ipc::Response, String> {
    if def(&browser)?.kind != Kind::Chromium {
        return Err("no_avatar".into());
    }
    if dir.is_empty() || dir.contains(['/', '\\']) || dir.contains("..") {
        return Err("bad_dir".into());
    }
    let root = data_dir(&browser).ok_or("no_data_dir")?;
    for f in AVATARS {
        if let Ok(bytes) = fs::read(root.join(&dir).join(f)) {
            return Ok(tauri::ipc::Response::new(bytes));
        }
    }
    Err("no_avatar".into())
}

#[tauri::command]
async fn launch_profiles(browser: String, launches: Vec<Launch>) -> Result<usize, String> {
    let kind = def(&browser)?.kind;
    for l in &launches {
        if l.urls.len() > MAX_URLS {
            return Err("too_many".into());
        }
        if l.urls.iter().any(|u| !(u.starts_with("https://") || u.starts_with("http://"))) {
            return Err("invalid_url".into());
        }
    }
    let exe = exe_path(&browser).ok_or("browser_not_found")?;
    let count = launches.len();
    thread::spawn(move || {
        let _guard = LAUNCH_LOCK.lock().unwrap();
        for l in launches {
            launch_one(&browser, kind, &exe, &l.dir, &l.urls);
        }
    });
    Ok(count)
}

#[tauri::command]
async fn running_profiles(browser: String) -> Vec<String> {
    profile_windows(&browser).into_keys().collect()
}

// Trả về số cửa sổ đã gửi yêu cầu đóng
#[tauri::command]
async fn close_profiles(browser: String, dirs: Vec<String>) -> Result<usize, String> {
    if !cfg!(windows) {
        return Err("unsupported".into());
    }
    let map = profile_windows(&browser);
    let mut n = 0;
    for d in &dirs {
        if let Some(hs) = map.get(d) {
            for h in hs {
                win::close(*h);
                n += 1;
            }
        }
    }
    Ok(n)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Cửa sổ ẩn lúc đầu để áp dụng kích thước; phòng khi giao diện lỗi thì vẫn hiện sau 4 giây
            if let Some(w) = app.get_webview_window("main") {
                thread::spawn(move || {
                    thread::sleep(Duration::from_secs(4));
                    if !w.is_visible().unwrap_or(false) {
                        let _ = w.show();
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_browsers,
            list_profiles,
            profile_avatar,
            launch_profiles,
            running_profiles,
            close_profiles
        ])
        .run(tauri::generate_context!())
        .expect("failed to start the app");
}
