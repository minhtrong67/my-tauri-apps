const en = {
  title: "Video Downloader",
  connected: "Connected to the desktop app",
  offline: "The desktop app is not running",
  offlineHint: "Open Material Video Downloader to send videos to it.",
  disabled: "Extension access is turned off in the app (Settings → Browser extension).",
  thisPage: "Download this page's video",
  thisPageHint: "Handled by the app's yt-dlp engine",
  detected: "Detected on this page",
  clear: "Clear",
  emptyTitle: "No video detected yet",
  emptyBody: "Play a video on the page and it will show up here.",
  download: "Download",
  sent: "Sent",
  failed: "Failed",
  hls: "Stream",
  file: "File",
  settings: "Settings",
  back: "Back",
  theme: "Theme",
  system: "System",
  light: "Light",
  dark: "Dark",
  language: "Language",
  floatBtn: "Show a download button over videos",
  floatBtnHint: "Appears when you hover a video",
  fallbackSaved: "Saved with the browser instead",
};
const vi = {
  title: "Trình tải video",
  connected: "Đã kết nối với ứng dụng máy tính",
  offline: "Ứng dụng máy tính chưa chạy",
  offlineHint: "Hãy mở Material Video Downloader để gửi video sang đó.",
  disabled: "Quyền truy cập của tiện ích đang tắt trong ứng dụng (Cài đặt → Tiện ích trình duyệt).",
  thisPage: "Tải video của trang này",
  thisPageHint: "Do công cụ yt-dlp của ứng dụng xử lý",
  detected: "Phát hiện trên trang này",
  clear: "Xóa",
  emptyTitle: "Chưa phát hiện video nào",
  emptyBody: "Hãy phát một video trên trang, nó sẽ xuất hiện ở đây.",
  download: "Tải xuống",
  sent: "Đã gửi",
  failed: "Lỗi",
  hls: "Luồng",
  file: "Tệp",
  settings: "Cài đặt",
  back: "Quay lại",
  theme: "Giao diện",
  system: "Hệ thống",
  light: "Sáng",
  dark: "Tối",
  language: "Ngôn ngữ",
  floatBtn: "Hiện nút tải trên video",
  floatBtnHint: "Xuất hiện khi bạn rê chuột lên video",
  fallbackSaved: "Đã tải bằng trình duyệt",
};
const dict = { en, vi };

export async function getPrefs() {
  const p = (await chrome.storage.local.get("prefs")).prefs || {};
  return { theme: "system", lang: "system", floatBtn: true, ...p };
}
export async function setPrefs(patch) {
  const next = { ...(await getPrefs()), ...patch };
  await chrome.storage.local.set({ prefs: next });
  return next;
}
export function resolveLang(pref) {
  if (pref === "en" || pref === "vi") return pref;
  return (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en";
}
export function makeT(lang) {
  return (k) => dict[lang][k] ?? dict.en[k] ?? k;
}
export function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
