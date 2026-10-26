#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, Local, Timelike, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::Read,
    path::PathBuf,
    process::Command,
    sync::{
        atomic::{AtomicI64, AtomicU64, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt as _;
use tauri_plugin_notification::NotificationExt;
use tiny_http::{Header, Method, Request, Response, Server};

const DEFAULT_PORT: u16 = 47821;
const HISTORY_CAP: usize = 600;

/// Lỗi mở cổng (nếu có) để giao diện báo cho người dùng thay vì im lặng
static SERVER_ERR: Mutex<Option<String>> = Mutex::new(None);

/// Tăng mỗi khi nhận được dữ liệu từ một extension (giao diện dựa vào đây để biết "đã có dữ liệu mới")
static INGEST_SEQ: AtomicU64 = AtomicU64::new(0);
/// Lần cuối có extension hợp lệ gọi tới app (ms epoch). 0 = chưa từng
static EXT_SEEN: AtomicI64 = AtomicI64::new(0);

// ---------- Data model ----------

#[derive(Serialize, Deserialize, Clone, Default)]
struct Limit {
    key: String,
    label: String,
    utilization: Option<f64>,
    resets_at: Option<String>,
    #[serde(default)]
    notified_for: Option<String>,
    /// Mốc reset đã được cảnh báo "sắp hết lượt" (mỗi chu kỳ chỉ cảnh báo một lần)
    #[serde(default)]
    warned_for: Option<String>,
}

/// Một mẫu mức dùng theo thời gian (vẽ biểu đồ nhỏ + dự báo)
#[derive(Serialize, Deserialize, Clone)]
struct Sample {
    t: i64,
    k: String,
    u: f64,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct Account {
    id: String,
    label: String,
    email: Option<String>,
    org_name: Option<String>,
    plan: Option<String>,
    profile_dir: Option<String>,
    chrome_email: Option<String>,
    #[serde(default)]
    profile_auto: bool,
    #[serde(default)]
    limits: Vec<Limit>,
    fetched_at: Option<i64>,
    last_error: Option<String>,
    last_raw: Option<Value>,
    #[serde(default)]
    created_at: i64,
    /// "Xoá" = ẩn: giữ dữ liệu để extension gửi lại không làm tài khoản hiện lại
    #[serde(default)]
    hidden: bool,
    #[serde(default)]
    pinned: bool,
    #[serde(default)]
    alias: Option<String>,
    #[serde(default)]
    note: Option<String>,
    #[serde(default)]
    history: Vec<Sample>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
struct Settings {
    notify_enabled: bool,
    /// Chỉ thông báo khi mức dùng >= ngưỡng này (100 = chỉ khi đã hết lượt)
    notify_threshold: f64,
    /// Cảnh báo khi mức dùng đạt `warn_at`% (trước khi hết lượt)
    warn_enabled: bool,
    warn_at: f64,
    /// Giờ yên lặng: không bật thông báo trong khoảng này (phút kể từ 00:00)
    quiet_enabled: bool,
    quiet_from: u32,
    quiet_to: u32,
    /// Đóng cửa sổ = thu xuống khay (false = thoát hẳn)
    close_to_tray: bool,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            notify_enabled: true,
            notify_threshold: 100.0,
            warn_enabled: true,
            warn_at: 80.0,
            quiet_enabled: false,
            quiet_from: 22 * 60,
            quiet_to: 7 * 60,
            close_to_tray: true,
        }
    }
}

/// Tuỳ chọn cửa sổ khi mở app
/// - mode = "remember": nhớ kích thước/vị trí lần cuối người dùng chỉnh
/// - mode = "maximized": luôn mở phóng to tối đa
#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
struct WindowPrefs {
    mode: String,
    width: Option<u32>,
    height: Option<u32>,
    x: Option<i32>,
    y: Option<i32>,
    maximized: bool,
}
impl Default for WindowPrefs {
    fn default() -> Self {
        Self { mode: "remember".into(), width: None, height: None, x: None, y: None, maximized: false }
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
struct Store {
    token: String,
    accounts: Vec<Account>,
    settings: Settings,
    window: WindowPrefs,
    /// Ngôn ngữ giao diện đang dùng ("vi" | "en"), giao diện báo xuống để thông báo/khay hiển thị đúng ngôn ngữ
    lang: String,
    port: u16,
    /// Đã báo "app vẫn chạy dưới khay" lần đầu chưa
    tray_hint: bool,
}
impl Default for Store {
    fn default() -> Self {
        Self {
            token: uuid::Uuid::new_v4().simple().to_string(),
            accounts: vec![],
            settings: Settings::default(),
            window: WindowPrefs::default(),
            lang: "vi".into(),
            port: DEFAULT_PORT,
            tray_hint: false,
        }
    }
}

struct TrayHandles {
    show: MenuItem<tauri::Wry>,
    refresh: MenuItem<tauri::Wry>,
    open_all: MenuItem<tauri::Wry>,
    quit: MenuItem<tauri::Wry>,
    icon: TrayIcon,
}

struct AppState {
    store: Arc<Mutex<Store>>,
    path: PathBuf,
    refresh: Arc<AtomicU64>,
    tray: Mutex<Option<TrayHandles>>,
}

/// Khoá không bao giờ panic: nếu một luồng từng panic khi đang giữ khoá, vẫn lấy lại dữ liệu
fn lock(m: &Mutex<Store>) -> std::sync::MutexGuard<'_, Store> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

/// So sánh token không phụ thuộc thời gian
fn ct_eq(a: &str, b: &str) -> bool {
    a.len() == b.len() && a.bytes().zip(b.bytes()).fold(0u8, |r, (x, y)| r | (x ^ y)) == 0
}

/// Chuỗi dịch cho phần chạy ở backend (menu khay, thông báo Windows)
fn tr(lang: &str, key: &str) -> &'static str {
    match (lang, key) {
        ("en", "tray.show") => "Open dashboard",
        ("en", "tray.quit") => "Quit",
        ("en", "tray.refresh") => "Refresh now",
        ("en", "tray.openall") => "Open all Chrome profiles",
        ("en", "notif.hint") => "Claude Tracker keeps running in the system tray so it can notify you.",
        ("en", "notif.test") => "Notifications are working.",
        (_, "tray.show") => "Mở dashboard",
        (_, "tray.quit") => "Thoát",
        (_, "tray.refresh") => "Làm mới ngay",
        (_, "tray.openall") => "Mở tất cả Chrome profile",
        (_, "notif.hint") => "Claude Tracker vẫn chạy dưới khay hệ thống để có thể thông báo cho bạn.",
        (_, "notif.test") => "Thông báo hoạt động bình thường.",
        _ => "",
    }
}

fn limit_name(lang: &str, l: &Limit) -> String {
    if lang == "en" {
        match l.key.as_str() {
            "five_hour" => return "5-hour session".into(),
            "seven_day" => return "Weekly (7 days)".into(),
            "seven_day_opus" => return "Weekly · Opus".into(),
            "seven_day_sonnet" => return "Weekly · Sonnet".into(),
            "free_window" => return "Message limit (Free)".into(),
            _ => {}
        }
    }
    l.label.clone()
}

fn read_store(path: &PathBuf) -> Option<Store> {
    fs::read_to_string(path).ok().and_then(|t| serde_json::from_str(&t).ok())
}

/// Đọc file chính; hỏng thì dùng bản sao lưu .bak
fn load(path: &PathBuf) -> Store {
    read_store(path).or_else(|| read_store(&path.with_extension("json.bak"))).unwrap_or_default()
}

/// Ghi an toàn: ghi ra file tạm rồi đổi tên (mất điện giữa chừng không làm hỏng dữ liệu), giữ một bản .bak
fn persist(path: &PathBuf, s: &Store) {
    let Ok(bytes) = serde_json::to_vec_pretty(s) else { return };
    let tmp = path.with_extension("json.tmp");
    if fs::write(&tmp, &bytes).is_err() {
        return;
    }
    if path.exists() {
        let _ = fs::copy(path, path.with_extension("json.bak"));
    }
    if fs::rename(&tmp, path).is_err() {
        let _ = fs::write(path, &bytes);
        let _ = fs::remove_file(&tmp);
    }
}

// ---------- Usage parsing (chịu được thay đổi định dạng) ----------

fn label_for(key: &str) -> String {
    match key {
        "five_hour" => "Phiên 5 giờ".into(),
        "seven_day" => "Tuần (7 ngày)".into(),
        "seven_day_opus" => "Tuần · Opus".into(),
        "seven_day_sonnet" => "Tuần · Sonnet".into(),
        k => k.replace('_', " "),
    }
}

type Obj = serde_json::Map<String, Value>;

fn pick_f64(o: &Obj, keys: &[&str]) -> Option<f64> {
    keys.iter().find_map(|k| o.get(*k).and_then(|x| x.as_f64()))
}
fn pick_str(o: &Obj, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|k| o.get(*k).and_then(|x| x.as_str()).map(String::from))
}
fn limit_from(key: String, label: Option<String>, o: &Obj) -> Option<Limit> {
    let util = pick_f64(o, &["utilization", "used_percent", "percent_used", "percentage"]);
    let reset = pick_str(o, &["resets_at", "reset_at", "resetsAt"]);
    if util.is_none() && reset.is_none() {
        return None;
    }
    Some(Limit { label: label.unwrap_or_else(|| label_for(&key)), key, utilization: util, resets_at: reset, notified_for: None, warned_for: None })
}

/// Nhận (1) mọi khóa cấp 1 dạng { utilization?, resets_at? } và (2) từng phần tử của mảng `limits`.
fn parse_usage(v: &Value) -> Vec<Limit> {
    let mut out: Vec<Limit> = vec![];
    if let Some(obj) = v.as_object() {
        for (k, val) in obj {
            if let Some(o) = val.as_object() {
                if let Some(l) = limit_from(k.clone(), None, o) {
                    out.push(l);
                }
            }
        }
        if let Some(arr) = obj.get("limits").and_then(|x| x.as_array()) {
            for (i, el) in arr.iter().enumerate() {
                let Some(o) = el.as_object() else { continue };
                let key = pick_str(o, &["key", "id", "type", "kind", "name"]).unwrap_or_else(|| format!("limit_{i}"));
                if out.iter().any(|l| l.key == key) {
                    continue;
                }
                if let Some(l) = limit_from(key, pick_str(o, &["label", "title", "name"]), o) {
                    out.push(l);
                }
            }
        }
    }
    out.sort_by_key(|l| match l.key.as_str() {
        "five_hour" => 0,
        "seven_day" => 1,
        _ => 2,
    });
    out
}

// ---------- Lịch sử mức dùng ----------

/// Ghi một mẫu khi mức dùng đổi >= 1% hoặc đã qua 4 phút kể từ mẫu trước (để vẽ biểu đồ + dự báo)
fn record_history(a: &mut Account, now: i64) {
    for l in a.limits.iter() {
        if l.key == "free_window" {
            continue;
        }
        let Some(u) = l.utilization else { continue };
        let push = match a.history.iter().rev().find(|x| x.k == l.key) {
            Some(x) => now - x.t >= 240_000 || (x.u - u).abs() >= 1.0,
            None => true,
        };
        if push {
            a.history.push(Sample { t: now, k: l.key.clone(), u });
        }
    }
    if a.history.len() > HISTORY_CAP {
        let n = a.history.len() - HISTORY_CAP;
        a.history.drain(0..n);
    }
}

// ---------- Ingest từ extension ----------

#[derive(Deserialize, Default, Clone)]
struct IngestAccount {
    email: Option<String>,
    name: Option<String>,
    org_uuid: Option<String>,
    org_name: Option<String>,
    plan: Option<String>,
}

#[derive(Deserialize)]
struct Ingest {
    account: Option<IngestAccount>,
    usage: Option<Value>,
    error: Option<String>,
    profile_hint: Option<String>,
    banner: Option<Banner>,
    chrome_email: Option<String>,
}

/// Banner "Your free messages return at …" đọc từ trang claude.ai (gói Free)
#[derive(Deserialize)]
struct Banner {
    limited: bool,
    resets_at: Option<String>,
}

fn ingest(app: &AppHandle, st: &Arc<Mutex<Store>>, path: &PathBuf, body: &str) -> Result<(), String> {
    let p: Ingest = serde_json::from_str(body).map_err(|e| e.to_string())?;
    let acc = p.account.unwrap_or_default();
    let id = acc
        .email
        .clone()
        .map(|e| e.to_lowercase())
        .or(acc.org_uuid.clone())
        .or(p.profile_hint.clone().filter(|h| !h.is_empty()))
        .ok_or("thiếu định danh tài khoản (email / org / profile_hint)")?;
    let now = Utc::now().timestamp_millis();

    let mut s = lock(st);
    let idx = match s.accounts.iter().position(|a| a.id == id) {
        Some(i) => i,
        None => {
            let label = acc.email.clone().or(acc.name.clone()).unwrap_or_else(|| id.clone());
            s.accounts.push(Account { id: id.clone(), label, created_at: now, ..Default::default() });
            s.accounts.len() - 1
        }
    };
    let a = &mut s.accounts[idx];
    if acc.email.is_some() { a.email = acc.email.clone(); }
    if acc.org_name.is_some() { a.org_name = acc.org_name.clone(); }
    if acc.plan.is_some() { a.plan = acc.plan.clone(); }

    if let Some(u) = p.usage {
        let mut limits = parse_usage(&u);
        // Gói Free: endpoint trả rỗng -> giữ nguyên dữ liệu cũ, KHÔNG coi là dữ liệu mới
        if !limits.is_empty() {
            for l in limits.iter_mut() {
                if let Some(old) = a.limits.iter().find(|o| o.key == l.key) {
                    l.notified_for = old.notified_for.clone();
                    l.warned_for = old.warned_for.clone();
                }
            }
            a.limits = limits;
            a.fetched_at = Some(now);
        }
        a.last_raw = Some(u);
        a.last_error = None;
    } else if let Some(e) = p.error {
        a.last_error = Some(e);
    }

    if let Some(b) = p.banner {
        let old = a
            .limits
            .iter()
            .find(|l| l.key == "free_window")
            .and_then(|l| l.notified_for.clone());
        a.limits.retain(|l| l.key != "free_window");
        let (util, reset) = if b.limited { (100.0, b.resets_at.clone()) } else { (0.0, None) };
        let notified = if b.limited && old == b.resets_at { old } else { None };
        a.limits.push(Limit {
            key: "free_window".into(),
            label: "Giới hạn tin nhắn (Free)".into(),
            utilization: Some(util),
            resets_at: reset,
            notified_for: notified,
            warned_for: None,
        });
        a.fetched_at = Some(now);
    }
    // Email tài khoản là định danh cố định; Chrome Profile tự gán theo email đăng nhập Chrome của profile
    if let Some(e) = acc.email.clone() {
        a.label = e;
    }
    if let Some(ce) = p.chrome_email.clone().filter(|x| !x.is_empty()) {
        a.chrome_email = Some(ce.to_lowercase());
        let m: Vec<Prof> = read_profiles().into_iter().filter(|x| x.email.eq_ignore_ascii_case(&ce)).collect();
        if m.len() == 1 {
            a.profile_dir = Some(m[0].dir.clone());
            a.profile_auto = true;
        }
    }
    record_history(&mut s.accounts[idx], now);
    persist(path, &s);
    drop(s);
    INGEST_SEQ.fetch_add(1, Ordering::Relaxed);
    let _ = app.emit("store-updated", ());
    refresh_tray(app);
    Ok(())
}

// ---------- HTTP server loopback ----------

fn origin_of(req: &Request) -> Option<String> {
    req.headers().iter().find(|h| h.field.equiv("origin")).map(|h| h.value.as_str().to_string())
}

fn reply(req: Request, code: u16, body: Value) {
    // Chỉ phản hồi CORS cho extension Chrome (không dùng "*")
    let allow = origin_of(&req).filter(|o| o.starts_with("chrome-extension://")).unwrap_or_default();
    let mut r = Response::from_string(body.to_string()).with_status_code(code);
    let mut hs = vec![
        ("Content-Type", "application/json".to_string()),
        ("Access-Control-Allow-Headers", "content-type, x-tracker-token".to_string()),
        ("Access-Control-Allow-Methods", "GET, POST, OPTIONS".to_string()),
        ("Vary", "Origin".to_string()),
    ];
    if !allow.is_empty() {
        hs.push(("Access-Control-Allow-Origin", allow));
    }
    for (k, v) in hs {
        if let Ok(h) = Header::from_bytes(k.as_bytes(), v.as_bytes()) {
            r.add_header(h);
        }
    }
    let _ = req.respond(r);
}

fn handle(app: &AppHandle, st: &Arc<Mutex<Store>>, path: &PathBuf, refresh: &Arc<AtomicU64>, mut req: Request) {
    let method = req.method().clone();
    let url = req.url().to_string();
    // Trình duyệt thường (trang web bất kỳ) gửi kèm Origin http(s) -> từ chối; extension dùng chrome-extension://
    if let Some(o) = origin_of(&req) {
        if !o.starts_with("chrome-extension://") {
            return reply(req, 403, json!({ "error": "origin không hợp lệ" }));
        }
    }
    if method == Method::Options {
        return reply(req, 204, json!({}));
    }
    let token = lock(st).token.clone();
    let ok = req
        .headers()
        .iter()
        .any(|h| h.field.equiv("x-tracker-token") && ct_eq(h.value.as_str(), &token));
    if !ok {
        return reply(req, 401, json!({ "error": "token không hợp lệ" }));
    }
    EXT_SEEN.store(Utc::now().timestamp_millis(), Ordering::Relaxed);
    let (route, query) = match url.split_once('?') {
        Some((r, q)) => (r.to_string(), q.to_string()),
        None => (url.clone(), String::new()),
    };
    match (method, route.as_str()) {
        (Method::Get, "/ping") => reply(req, 200, json!({ "ok": true, "refresh": refresh.load(Ordering::Relaxed) })),
        // Long-poll: giữ yêu cầu tối đa 15 giây cho tới khi số thứ tự refresh khác `seen`
        (Method::Get, "/wait") => {
            let seen: u64 = query
                .split('&')
                .find_map(|kv| kv.strip_prefix("seen="))
                .and_then(|v| v.parse().ok())
                .unwrap_or(u64::MAX);
            for _ in 0..75 {
                if refresh.load(Ordering::Relaxed) != seen {
                    break;
                }
                thread::sleep(Duration::from_millis(200));
            }
            reply(req, 200, json!({ "ok": true, "refresh": refresh.load(Ordering::Relaxed) }))
        }
        (Method::Post, "/ingest") => {
            let mut body = String::new();
            let _ = req.as_reader().take(4_000_000).read_to_string(&mut body);
            match ingest(app, st, path, &body) {
                Ok(()) => reply(req, 200, json!({ "ok": true })),
                Err(e) => reply(req, 400, json!({ "error": e })),
            }
        }
        _ => reply(req, 404, json!({ "error": "not found" })),
    }
}

fn start_server(app: AppHandle, st: Arc<Mutex<Store>>, path: PathBuf, refresh: Arc<AtomicU64>, port: u16) {
    thread::spawn(move || {
        let server = match Server::http(("127.0.0.1", port)) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Không mở được cổng {port}: {e}");
                if let Ok(mut g) = SERVER_ERR.lock() {
                    *g = Some(format!("{port}: {e}"));
                }
                let _ = app.emit("store-updated", ());
                return;
            }
        };
        // Mỗi yêu cầu một luồng riêng để /wait không chặn các extension khác
        while let Ok(req) = server.recv() {
            let (app, st, path, refresh) = (app.clone(), st.clone(), path.clone(), refresh.clone());
            thread::spawn(move || handle(&app, &st, &path, &refresh, req));
        }
    });
}

// ---------- Watcher: thông báo khi tới giờ dự kiến reset ----------

/// Đang trong giờ yên lặng (theo giờ máy) hay không
fn in_quiet(st: &Settings) -> bool {
    if !st.quiet_enabled || st.quiet_from == st.quiet_to {
        return false;
    }
    let n = Local::now();
    let m = n.hour() * 60 + n.minute();
    if st.quiet_from < st.quiet_to {
        m >= st.quiet_from && m < st.quiet_to
    } else {
        m >= st.quiet_from || m < st.quiet_to
    }
}

fn start_watcher(app: AppHandle, st: Arc<Mutex<Store>>, path: PathBuf) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(20));
        let mut notes: Vec<(String, String)> = vec![];
        {
            let mut s = lock(&st);
            if s.settings.notify_enabled && !in_quiet(&s.settings) {
                let thr = s.settings.notify_threshold;
                let warn_on = s.settings.warn_enabled;
                let warn_at = s.settings.warn_at;
                let lang = s.lang.clone();
                let now = Utc::now();
                let mut dirty = false;
                for a in s.accounts.iter_mut().filter(|a| !a.hidden) {
                    let who = a.alias.clone().unwrap_or_else(|| a.label.clone());
                    for l in a.limits.iter_mut() {
                        let (Some(r), Some(u)) = (l.resets_at.clone(), l.utilization) else { continue };
                        let Ok(t) = DateTime::parse_from_rfc3339(&r) else { continue };
                        let t = t.with_timezone(&Utc);
                        let at = t.with_timezone(&Local).format("%H:%M").to_string();
                        let name = limit_name(&lang, l);
                        // 1) Sắp hết lượt: đã dùng >= warn_at% nhưng chưa chạm 100%
                        if warn_on && u >= warn_at && u < 100.0 && t > now && l.warned_for.as_deref() != Some(r.as_str()) {
                            notes.push(if lang == "en" {
                                (format!("{who} · {:.0}% used", u), format!("{name} is almost used up. It resets at {at}."))
                            } else {
                                (format!("{who} · đã dùng {:.0}%", u), format!("{name} sắp hết lượt. Reset lúc {at}."))
                            });
                            l.warned_for = Some(r.clone());
                            dirty = true;
                        }
                        // 2) Tới giờ dự kiến reset
                        if u >= thr && t <= now && l.notified_for.as_deref() != Some(r.as_str()) {
                            notes.push(if lang == "en" {
                                (
                                    format!("{who} · expected to reset"),
                                    format!("{name} is expected to recover at {at}. Not confirmed yet — open Claude to check."),
                                )
                            } else {
                                (
                                    format!("{who} · dự kiến đã reset"),
                                    format!("{name} dự kiến hồi lúc {at}. Chưa xác nhận — mở Claude để kiểm tra."),
                                )
                            });
                            l.notified_for = Some(r);
                            dirty = true;
                        }
                    }
                }
                if dirty {
                    persist(&path, &s);
                }
            }
        }
        for (t, b) in notes {
            let _ = app.notification().builder().title(t).body(b).show();
        }
        refresh_tray(&app);
    });
}

/// Tooltip khay hệ thống: số tài khoản sẵn sàng / đang chờ + giờ hồi sớm nhất
fn refresh_tray(app: &AppHandle) {
    let st = app.state::<AppState>();
    let (lang, ready, waiting, next) = {
        let s = lock(&st.store);
        let now = Utc::now().timestamp_millis();
        let (mut ready, mut waiting) = (0usize, 0usize);
        let mut next: Option<i64> = None;
        for a in s.accounts.iter().filter(|a| !a.hidden) {
            if a.limits.is_empty() {
                continue;
            }
            let avail = a
                .limits
                .iter()
                .filter(|l| l.utilization.unwrap_or(0.0) >= 100.0)
                .filter_map(|l| l.resets_at.as_deref().and_then(|r| DateTime::parse_from_rfc3339(r).ok()))
                .map(|d| d.timestamp_millis())
                .filter(|&t| t > now)
                .max();
            match avail {
                Some(t) => {
                    waiting += 1;
                    next = Some(next.map_or(t, |n| n.min(t)));
                }
                None => ready += 1,
            }
        }
        (s.lang.clone(), ready, waiting, next)
    };
    let at = next
        .and_then(DateTime::<Utc>::from_timestamp_millis)
        .map(|d| d.with_timezone(&Local).format("%H:%M").to_string());
    let tip = if lang == "en" {
        let mut t = format!("Claude Tracker\n{ready} ready · {waiting} waiting");
        if let Some(a) = at {
            t.push_str(&format!("\nNext: {a}"));
        }
        t
    } else {
        let mut t = format!("Claude Tracker\n{ready} sẵn sàng · {waiting} đang chờ");
        if let Some(a) = at {
            t.push_str(&format!("\nSớm nhất: {a}"));
        }
        t
    };
    if let Ok(g) = st.tray.lock() {
        if let Some(h) = g.as_ref() {
            let _ = h.icon.set_tooltip(Some(tip));
        }
    }
}

// ---------- Chrome ----------

fn chrome_user_data() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(|p| PathBuf::from(p).join("Google").join("Chrome").join("User Data"))
}

fn find_chrome() -> Option<PathBuf> {
    ["PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"]
        .iter()
        .filter_map(|v| std::env::var_os(v))
        .map(|b| PathBuf::from(b).join("Google").join("Chrome").join("Application").join("chrome.exe"))
        .find(|p| p.exists())
}

// ---------- Commands ----------

fn emit(app: &AppHandle) {
    let _ = app.emit("store-updated", ());
}

#[tauri::command]
fn get_state(app: AppHandle, st: State<AppState>) -> Value {
    let s = lock(&st.store);
    let mut v = serde_json::to_value(&*s).unwrap_or_else(|_| json!({}));
    // Lịch sử có endpoint riêng (get_histories) để trạng thái chính luôn gọn
    if let Some(arr) = v.get_mut("accounts").and_then(|x| x.as_array_mut()) {
        for a in arr {
            if let Some(o) = a.as_object_mut() {
                o.remove("history");
            }
        }
    }
    v["ingest_seq"] = json!(INGEST_SEQ.load(Ordering::Relaxed));
    v["ext_seen"] = json!(EXT_SEEN.load(Ordering::Relaxed));
    v["autostart"] = json!(app.autolaunch().is_enabled().unwrap_or(false));
    v["server_error"] = json!(SERVER_ERR.lock().ok().and_then(|g| g.clone()));
    v
}

/// { id: [[t, key, utilization], ...] } cho các tài khoản đang hiển thị
#[tauri::command]
fn get_histories(st: State<AppState>) -> Value {
    let s = lock(&st.store);
    let mut m = serde_json::Map::new();
    for a in s.accounts.iter().filter(|a| !a.hidden) {
        let arr: Vec<Value> = a.history.iter().map(|x| json!([x.t, x.k, x.u])).collect();
        m.insert(a.id.clone(), Value::Array(arr));
    }
    Value::Object(m)
}

fn clean(o: Option<String>) -> Option<Option<String>> {
    o.map(|x| {
        let t = x.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    })
}

#[tauri::command]
fn update_account(
    app: AppHandle,
    st: State<AppState>,
    id: String,
    profile_dir: Option<String>,
    alias: Option<String>,
    note: Option<String>,
    pinned: Option<bool>,
) {
    {
        let mut s = lock(&st.store);
        if let Some(a) = s.accounts.iter_mut().find(|a| a.id == id) {
            if let Some(p) = profile_dir {
                a.profile_dir = if p.is_empty() { None } else { Some(p) };
                a.profile_auto = false;
            }
            if let Some(v) = clean(alias) {
                a.alias = v;
            }
            if let Some(v) = clean(note) {
                a.note = v;
            }
            if let Some(p) = pinned {
                a.pinned = p;
            }
        }
        persist(&st.path, &s);
    }
    emit(&app);
}

/// "Xoá" tài khoản = ẩn (dữ liệu giữ lại, extension gửi tiếp cũng không làm nó hiện lại)
#[tauri::command]
fn remove_account(app: AppHandle, st: State<AppState>, id: String) {
    set_hidden(&app, &st, &id, true);
}

#[tauri::command]
fn restore_account(app: AppHandle, st: State<AppState>, id: String) {
    set_hidden(&app, &st, &id, false);
}

fn set_hidden(app: &AppHandle, st: &State<AppState>, id: &str, hidden: bool) {
    {
        let mut s = lock(&st.store);
        if let Some(a) = s.accounts.iter_mut().find(|a| a.id == id) {
            a.hidden = hidden;
        }
        persist(&st.path, &s);
    }
    emit(app);
    refresh_tray(app);
}

/// Xoá hẳn một tài khoản đã ẩn (kèm lịch sử). Nếu extension còn chạy, tài khoản sẽ tự xuất hiện lại.
#[tauri::command]
fn forget_account(app: AppHandle, st: State<AppState>, id: String) {
    {
        let mut s = lock(&st.store);
        s.accounts.retain(|a| !(a.id == id && a.hidden));
        persist(&st.path, &s);
    }
    emit(&app);
}

#[tauri::command]
fn set_settings(app: AppHandle, st: State<AppState>, settings: Settings) {
    {
        let mut s = lock(&st.store);
        s.settings = settings;
        persist(&st.path, &s);
    }
    emit(&app);
}

/// Yêu cầu mọi extension đồng bộ lại (extension hỏi /ping mỗi ~30 giây và so số thứ tự này)
#[tauri::command]
fn request_refresh(app: AppHandle, st: State<AppState>) {
    st.refresh.fetch_add(1, Ordering::Relaxed);
    emit(&app);
}

/// Sao chép văn bản qua clip.exe (dự phòng khi clipboard của WebView không dùng được)
#[tauri::command]
fn copy_text(text: String) -> Result<(), String> {
    use std::io::Write;
    use std::process::Stdio;
    let mut cmd = Command::new("clip");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    let mut child = cmd.stdin(Stdio::piped()).spawn().map_err(|e| e.to_string())?;
    let mut stdin = child.stdin.take().ok_or("không mở được stdin")?;
    stdin.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
    drop(stdin);
    child.wait().map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn test_notification(app: AppHandle, st: State<AppState>) {
    let lang = lock(&st.store).lang.clone();
    let _ = app.notification().builder().title("Claude Tracker").body(tr(&lang, "notif.test")).show();
}

/// Giao diện báo ngôn ngữ đang dùng -> cập nhật menu khay và ngôn ngữ thông báo
#[tauri::command]
fn set_lang(app: AppHandle, st: State<AppState>, lang: String) {
    let lang = if lang == "en" { "en" } else { "vi" };
    {
        let mut s = lock(&st.store);
        if s.lang == lang {
            return;
        }
        s.lang = lang.into();
        persist(&st.path, &s);
    }
    if let Ok(g) = st.tray.lock() {
        if let Some(h) = g.as_ref() {
            let _ = h.show.set_text(tr(lang, "tray.show"));
            let _ = h.refresh.set_text(tr(lang, "tray.refresh"));
            let _ = h.open_all.set_text(tr(lang, "tray.openall"));
            let _ = h.quit.set_text(tr(lang, "tray.quit"));
        }
    }
    refresh_tray(&app);
}

#[tauri::command]
fn get_autostart(app: AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let m = app.autolaunch();
    let r = if enabled { m.enable() } else { m.disable() };
    r.map_err(|e| e.to_string())?;
    Ok(m.is_enabled().unwrap_or(enabled))
}

/// Đổi cổng lắng nghe rồi khởi động lại app (extension cũng phải đổi cổng tương ứng)
#[tauri::command]
fn set_port(app: AppHandle, st: State<AppState>, port: u16) -> Result<(), String> {
    if port < 1024 {
        return Err("Cổng phải từ 1024 trở lên".into());
    }
    {
        let mut s = lock(&st.store);
        s.port = port;
        persist(&st.path, &s);
    }
    app.restart()
}

/// Tạo token mới (extension phải nhập lại token mới)
#[tauri::command]
fn regenerate_token(app: AppHandle, st: State<AppState>) -> String {
    let t = uuid::Uuid::new_v4().simple().to_string();
    {
        let mut s = lock(&st.store);
        s.token = t.clone();
        persist(&st.path, &s);
    }
    emit(&app);
    t
}

/// Xuất lịch sử mức dùng ra CSV trong thư mục Downloads, trả về đường dẫn file
#[tauri::command]
fn export_csv(app: AppHandle, st: State<AppState>) -> Result<String, String> {
    let dir = app.path().download_dir().map_err(|e| e.to_string())?;
    let file = dir.join(format!("claude-tracker-history-{}.csv", Local::now().format("%Y%m%d-%H%M%S")));
    let mut out = String::from("account,limit,time,utilization\n");
    {
        let s = lock(&st.store);
        for a in s.accounts.iter() {
            let who = a.email.clone().unwrap_or_else(|| a.id.clone()).replace('"', "\"\"");
            for x in a.history.iter() {
                let t = DateTime::<Utc>::from_timestamp_millis(x.t).map(|d| d.to_rfc3339()).unwrap_or_default();
                out.push_str(&format!("\"{}\",{},{},{}\n", who, x.k, t, x.u));
            }
        }
    }
    fs::write(&file, out).map_err(|e| e.to_string())?;
    Ok(file.to_string_lossy().into_owned())
}

fn snapshot_window(app: &AppHandle, w: &mut WindowPrefs) {
    let Some(win) = app.get_webview_window("main") else { return };
    if win.is_minimized().unwrap_or(false) {
        return;
    }
    w.maximized = win.is_maximized().unwrap_or(false);
    if !w.maximized {
        if let (Ok(sz), Ok(pos)) = (win.inner_size(), win.outer_position()) {
            if sz.width >= 200 && sz.height >= 200 {
                w.width = Some(sz.width);
                w.height = Some(sz.height);
                w.x = Some(pos.x);
                w.y = Some(pos.y);
            }
        }
    }
}

#[tauri::command]
fn set_window_mode(app: AppHandle, st: State<AppState>, mode: String) {
    let mode = if mode == "maximized" { "maximized" } else { "remember" };
    {
        let mut s = lock(&st.store);
        s.window.mode = mode.into();
        if mode == "remember" {
            snapshot_window(&app, &mut s.window); // lưu ngay kích thước hiện tại làm mốc
        }
        persist(&st.path, &s);
    }
    emit(&app);
}

struct Prof {
    dir: String,
    name: String,
    email: String,
    /// Tên người dùng của tài khoản Google đăng nhập trong profile (gaia_name)
    user_name: String,
    /// Ảnh đại diện thật của profile dạng data URL (rỗng nếu profile không có ảnh)
    avatar: String,
}

/// Đọc ảnh đại diện Google mà Chrome đã lưu trong thư mục profile ("Google Profile Picture.png")
fn read_avatar(user_data: &std::path::Path, dir: &str, info: &Value) -> String {
    use base64::{engine::general_purpose::STANDARD, Engine};
    let file = info
        .get("gaia_picture_file_name")
        .and_then(|x| x.as_str())
        .filter(|x| !x.is_empty() && !x.contains('/') && !x.contains('\\'))
        .unwrap_or("Google Profile Picture.png");
    let Ok(bytes) = fs::read(user_data.join(dir).join(file)) else { return String::new() };
    if bytes.is_empty() || bytes.len() > 600_000 {
        return String::new();
    }
    let mime = if bytes.starts_with(&[0xFF, 0xD8]) { "image/jpeg" } else { "image/png" };
    format!("data:{mime};base64,{}", STANDARD.encode(bytes))
}

fn read_profiles() -> Vec<Prof> {
    let Some(dir) = chrome_user_data() else { return vec![] };
    let Ok(txt) = fs::read_to_string(dir.join("Local State")) else { return vec![] };
    let Ok(v) = serde_json::from_str::<Value>(&txt) else { return vec![] };
    let mut out = vec![];
    if let Some(map) = v.pointer("/profile/info_cache").and_then(|x| x.as_object()) {
        for (k, p) in map {
            out.push(Prof {
                dir: k.clone(),
                name: p.get("name").and_then(|x| x.as_str()).unwrap_or(k.as_str()).to_string(),
                email: p.get("user_name").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                user_name: ["gaia_name", "gaia_given_name"]
                    .iter()
                    .find_map(|k| p.get(*k).and_then(|x| x.as_str()).filter(|x| !x.trim().is_empty()))
                    .unwrap_or("")
                    .to_string(),
                avatar: read_avatar(&dir, k, p),
            });
        }
    }
    out.sort_by(|a, b| a.dir.cmp(&b.dir));
    out
}

#[tauri::command]
fn list_chrome_profiles() -> Vec<Value> {
    read_profiles()
        .into_iter()
        .map(|p| json!({ "dir": p.dir, "name": p.name, "email": p.email, "user_name": p.user_name, "avatar": p.avatar }))
        .collect()
}

#[tauri::command]
fn open_profile(profile_dir: String, url: Option<String>) -> Result<(), String> {
    let chrome = find_chrome().ok_or("Không tìm thấy chrome.exe")?;
    Command::new(chrome)
        .arg(format!("--profile-directory={profile_dir}"))
        .arg(url.unwrap_or_else(|| "https://claude.ai/new".into()))
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Mở nhiều Chrome Profile cùng lúc, mỗi profile một cửa sổ ở trang chủ Claude.
/// Chạy ở luồng riêng và cách nhau một nhịp ngắn để Chrome kịp nhận từng yêu cầu.
fn spawn_profiles(profile_dirs: Vec<String>, url: String) -> Result<usize, String> {
    let chrome = find_chrome().ok_or("Không tìm thấy chrome.exe")?;
    let mut dirs: Vec<String> = vec![];
    for d in profile_dirs {
        if !d.is_empty() && !dirs.contains(&d) {
            dirs.push(d);
        }
    }
    let n = dirs.len();
    thread::spawn(move || {
        for d in dirs {
            let _ = Command::new(&chrome).arg(format!("--profile-directory={d}")).arg(&url).spawn();
            thread::sleep(Duration::from_millis(450));
        }
    });
    Ok(n)
}

#[tauri::command]
fn open_profiles(profile_dirs: Vec<String>, url: Option<String>) -> Result<usize, String> {
    spawn_profiles(profile_dirs, url.unwrap_or_else(|| "https://claude.ai/".into()))
}

// ---------- Tray / main ----------

/// Có ít nhất một phần cửa sổ nằm trong một màn hình đang cắm (tránh mở ra ngoài màn hình khi đã rút màn hình phụ)
fn position_visible(app: &AppHandle, x: i32, y: i32) -> bool {
    app.available_monitors()
        .map(|ms| {
            ms.iter().any(|m| {
                let (p, s) = (m.position(), m.size());
                x + 120 > p.x && x < p.x + s.width as i32 - 120 && y + 40 > p.y && y < p.y + s.height as i32 - 120
            })
        })
        .unwrap_or(true)
}

/// Áp dụng tuỳ chọn cửa sổ rồi mới hiện cửa sổ (cửa sổ khai báo visible=false để không bị nháy sai kích thước).
/// `show` = false khi khởi động cùng Windows (--minimized): chỉ nằm dưới khay.
fn apply_window(app: &AppHandle, w: &WindowPrefs, show: bool) {
    let Some(win) = app.get_webview_window("main") else { return };
    if w.mode == "maximized" {
        let _ = win.maximize();
    } else {
        if let (Some(wd), Some(ht)) = (w.width, w.height) {
            let _ = win.set_size(PhysicalSize::new(wd, ht));
            match (w.x, w.y) {
                (Some(x), Some(y)) if position_visible(app, x, y) => {
                    let _ = win.set_position(PhysicalPosition::new(x, y));
                }
                _ => {
                    let _ = win.center();
                }
            }
        }
        if w.maximized {
            let _ = win.maximize();
        }
    }
    if show {
        let _ = win.show();
    }
}

static WIN_GEN: AtomicU64 = AtomicU64::new(0);

/// Ghi nhớ kích thước/vị trí khi người dùng kéo/resize (chỉ ở chế độ "remember"); ghi file sau khi dừng 600ms
fn track_window(window: &tauri::Window) {
    if window.label() != "main" {
        return;
    }
    let app = window.app_handle().clone();
    let st = app.state::<AppState>();
    {
        let mut s = lock(&st.store);
        if s.window.mode != "remember" {
            return;
        }
        snapshot_window(&app, &mut s.window);
    }
    let generation = WIN_GEN.fetch_add(1, Ordering::SeqCst) + 1;
    let (store, path) = (st.store.clone(), st.path.clone());
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(600));
        if WIN_GEN.load(Ordering::SeqCst) == generation {
            persist(&path, &lock(&store));
        }
    });
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Đóng cửa sổ: thu xuống khay (mặc định, báo một lần) hoặc thoát hẳn tuỳ cài đặt
fn on_close(window: &tauri::Window) -> bool {
    let app = window.app_handle().clone();
    let st = app.state::<AppState>();
    let (to_tray, hint, lang) = {
        let mut s = lock(&st.store);
        let hint = s.settings.close_to_tray && !s.tray_hint;
        if hint {
            s.tray_hint = true;
            persist(&st.path, &s);
        }
        (s.settings.close_to_tray, hint, s.lang.clone())
    };
    if !to_tray {
        app.exit(0);
        return false;
    }
    if hint {
        let _ = app.notification().builder().title("Claude Tracker").body(tr(&lang, "notif.hint")).show();
    }
    let _ = window.hide();
    true
}

fn main() {
    tauri::Builder::default()
        // Phải đăng ký đầu tiên: mở lần hai chỉ đưa cửa sổ cũ lên (không tranh cổng / ghi đè dữ liệu)
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--minimized"])))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            fs::create_dir_all(&dir)?;
            let path = dir.join("tracker.json");
            // Đổi tên app -> đổi thư mục dữ liệu; chép dữ liệu cũ sang để giữ token/tài khoản đã kết nối
            if !path.exists() {
                if let Some(parent) = dir.parent() {
                    let old = parent.join("com.minhtrong67.claude-multi-profile-tracker").join("tracker.json");
                    if old.exists() {
                        let _ = fs::copy(&old, &path);
                    }
                }
            }
            let store = Arc::new(Mutex::new(load(&path)));
            persist(&path, &lock(&store));
            let refresh = Arc::new(AtomicU64::new(0));
            app.manage(AppState { store: store.clone(), path: path.clone(), refresh: refresh.clone(), tray: Mutex::new(None) });

            let (lang, win_prefs, port) = {
                let s = lock(&store);
                (s.lang.clone(), s.window.clone(), s.port)
            };
            start_server(app.handle().clone(), store.clone(), path.clone(), refresh, port);
            start_watcher(app.handle().clone(), store.clone(), path);

            let show = MenuItem::with_id(app, "show", tr(&lang, "tray.show"), true, None::<&str>)?;
            let refresh_i = MenuItem::with_id(app, "refresh", tr(&lang, "tray.refresh"), true, None::<&str>)?;
            let open_all = MenuItem::with_id(app, "openall", tr(&lang, "tray.openall"), true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", tr(&lang, "tray.quit"), true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&show, &refresh_i, &open_all, &sep, &quit])?;
            let icon = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Claude Tracker")
                .menu(&menu)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "show" => show_main(app),
                    "refresh" => {
                        app.state::<AppState>().refresh.fetch_add(1, Ordering::Relaxed);
                        emit(app);
                    }
                    "openall" => {
                        let dirs: Vec<String> = {
                            let st = app.state::<AppState>();
                            let s = lock(&st.store);
                            s.accounts.iter().filter(|a| !a.hidden).filter_map(|a| a.profile_dir.clone()).collect()
                        };
                        let _ = spawn_profiles(dirs, "https://claude.ai/".into());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;
            *app.state::<AppState>().tray.lock().unwrap_or_else(|e| e.into_inner()) =
                Some(TrayHandles { show, refresh: refresh_i, open_all, quit, icon });
            refresh_tray(app.handle());
            let minimized = std::env::args().any(|a| a == "--minimized");
            apply_window(app.handle(), &win_prefs, !minimized);
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                // Luôn chặn đóng thật: on_close tự ẩn xuống khay hoặc gọi exit
                api.prevent_close();
                on_close(window);
            }
            WindowEvent::Resized(_) | WindowEvent::Moved(_) => track_window(window),
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            get_histories,
            update_account,
            remove_account,
            restore_account,
            forget_account,
            set_settings,
            test_notification,
            set_lang,
            get_autostart,
            set_autostart,
            set_port,
            regenerate_token,
            export_csv,
            set_window_mode,
            request_refresh,
            copy_text,
            list_chrome_profiles,
            open_profile,
            open_profiles
        ])
        .run(tauri::generate_context!())
        .expect("không chạy được ứng dụng");
}
