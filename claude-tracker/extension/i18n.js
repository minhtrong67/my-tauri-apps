// Song ngữ EN/VI cho extension. Ngôn ngữ: tự nhận theo trình duyệt, có thể đổi trong Cài đặt (lưu ở storage "lang").
const DICT = {
  en: {
    profile: "This Chrome profile", sync: "Sync now", settings: "Settings", syncing: "Syncing…",
    limited: "Limited · resets at", status: "Status", usable: "Available", unknown: "Unknown", openClaude: "Open claude.ai/new to confirm",
    notConfigured: "Not configured", connected: "Connected to app", disconnected: "App unreachable", waitingSync: "Waiting to sync", notLoggedIn: "Not signed in to claude.ai",
    connection: "Connection", account: "Account", chromeProfile: "Chrome profile", lastSync: "Last sync", noChrome: "Not signed in to Chrome",
    enterToken: "Open Settings and enter the token from the app.",
    "s.no_token": "No token entered", "s.synced": "Synced", "s.bad_token": "Wrong token", "s.http": "App rejected the request (HTTP {n})", "s.offline": "Cannot reach the app (is it running?)",
    optTitle: "Claude Tracker Reporter · Settings", optSub: "Reports limit status to the Claude Tracker app", connTitle: "Connect to the app",
    connHint: "Open the app → Settings → Connection to get the port and token. Data only travels over 127.0.0.1.",
    port: "Port", token: "Token", show: "Show", hide: "Hide", interval: "Sync interval (minutes)", save: "Save & connect", test: "Test connection", lang: "Language", auto: "Auto",
    detected: "Detected account", claudeEmail: "Claude email", org: "Organization", plan: "Plan", chromeEmail: "Chrome email", noChromeLong: "Not signed in to Chrome — the app can't assign the Chrome profile automatically",
    connecting: "Connecting…", ok: "Connected successfully", badToken: "Wrong token", httpErr: "App replied HTTP {n}", noApp: "Cannot connect — is the app running?",
    adv: "Advanced · Probe endpoints", advHint: "Lists keys related to limit/reset in a few claude.ai endpoints to find the data source. Review before sharing: the result may contain your organization name.", probe: "Probe endpoints", probing: "Probing…", noKeys: "(no relevant keys)",
    justNow: "just now", minAgo: "{n} min ago", hrAgo: "{n} h ago",
  },
  vi: {
    profile: "Chrome Profile này", sync: "Đồng bộ ngay", settings: "Cài đặt", syncing: "Đang đồng bộ…",
    limited: "Đang bị giới hạn · reset xong lúc", status: "Trạng thái", usable: "Dùng được", unknown: "Chưa xác định", openClaude: "Mở claude.ai/new để xác nhận",
    notConfigured: "Chưa cấu hình", connected: "Đã kết nối app", disconnected: "Mất kết nối app", waitingSync: "Đang chờ đồng bộ", notLoggedIn: "Chưa đăng nhập claude.ai",
    connection: "Kết nối", account: "Tài khoản", chromeProfile: "Chrome profile", lastSync: "Đồng bộ", noChrome: "Chưa đăng nhập Chrome",
    enterToken: "Mở Cài đặt để nhập token từ app.",
    "s.no_token": "Chưa nhập token", "s.synced": "Đã đồng bộ", "s.bad_token": "Token không đúng", "s.http": "App từ chối (HTTP {n})", "s.offline": "Không kết nối được app (đã mở chưa?)",
    optTitle: "Claude Tracker Reporter · Cài đặt", optSub: "Gửi trạng thái giới hạn về app Claude Tracker", connTitle: "Kết nối với app",
    connHint: "Mở app, vào Cài đặt → Kết nối để lấy cổng và token. Dữ liệu chỉ đi qua 127.0.0.1.",
    port: "Cổng", token: "Token", show: "Hiện", hide: "Ẩn", interval: "Chu kỳ đồng bộ (phút)", save: "Lưu & kết nối", test: "Kiểm tra kết nối", lang: "Ngôn ngữ", auto: "Tự động",
    detected: "Tài khoản đang nhận diện", claudeEmail: "Email Claude", org: "Tổ chức", plan: "Gói", chromeEmail: "Email Chrome", noChromeLong: "Chưa đăng nhập Chrome — app sẽ không tự gán được Chrome Profile",
    connecting: "Đang kết nối…", ok: "Kết nối thành công", badToken: "Token không đúng", httpErr: "App phản hồi HTTP {n}", noApp: "Không kết nối được — app đã chạy chưa?",
    adv: "Nâng cao · Dò endpoint", advHint: "Liệt kê các khóa liên quan tới limit/reset trong vài endpoint của claude.ai để tìm nguồn dữ liệu. Kiểm tra trước khi gửi cho ai: kết quả có thể chứa tên tổ chức.", probe: "Dò endpoint", probing: "Đang dò…", noKeys: "(không có khóa liên quan)",
    justNow: "vừa xong", minAgo: "{n} phút trước", hrAgo: "{n} giờ trước",
  },
};
let LANG = "en";
async function initLang() {
  const { lang } = await chrome.storage.local.get("lang");
  const auto = (chrome.i18n.getUILanguage() || navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en";
  LANG = lang === "en" || lang === "vi" ? lang : auto;
  document.documentElement.lang = LANG;
}
function t(k, v) {
  let s = (DICT[LANG] && DICT[LANG][k]) ?? DICT.en[k] ?? k;
  if (v) for (const x in v) s = s.replace("{" + x + "}", v[x]);
  return s;
}
const locale = () => (LANG === "vi" ? "vi-VN" : "en-GB");
/** Mã trạng thái từ background ("s.http:401") -> chữ theo ngôn ngữ */
function statusText(code) {
  if (!code) return "";
  const [k, n] = String(code).split(":");
  return DICT.en["s." + k] ? t("s." + k, { n }) : code;
}
function applyI18n() {
  document.querySelectorAll("[data-i]").forEach((el) => (el.textContent = t(el.dataset.i)));
  document.querySelectorAll("[data-ph]").forEach((el) => (el.placeholder = t(el.dataset.ph)));
}
