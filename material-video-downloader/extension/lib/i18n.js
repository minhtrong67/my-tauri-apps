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
  all: "All", video: "Videos", stream: "Streams",
  downloadAll: "Download all", copy: "Copy link", copied: "Link copied",
  thisPageTitle: "This page", found: "found",
  offlineTitle: "Desktop app not connected", offlineBody: "Start the app so videos can be sent to it. Plain files can still be saved with the browser.",
  step1: "Install Material Video Downloader", step2: "Open the app and keep it running", step3: "Come back and press Retry",
  retry: "Retry", themeColor: "Theme color", about: "About", madeBy: "By minhtrong67 · built with Claude",
  floatBtnShort: "Video overlay button",
  floatPos: "Button position", posLeft: "Top left", posRight: "Top right", downloadVideo: "Download video",
  pageEmptyHint: "Use the button above to download this page's video.", untitled: "Untitled video",

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
  all: "Tất cả", video: "Video", stream: "Luồng",
  downloadAll: "Tải tất cả", copy: "Sao chép liên kết", copied: "Đã sao chép liên kết",
  thisPageTitle: "Trang này", found: "đã tìm thấy",
  offlineTitle: "Chưa kết nối ứng dụng máy tính", offlineBody: "Hãy mở ứng dụng để gửi video sang đó. Tệp thường vẫn có thể lưu bằng trình duyệt.",
  step1: "Cài đặt Material Video Downloader", step2: "Mở ứng dụng và để nó chạy", step3: "Quay lại và bấm Thử lại",
  retry: "Thử lại", themeColor: "Màu chủ đề", about: "Giới thiệu", madeBy: "Tác giả minhtrong67 · xây dựng cùng Claude",
  floatBtnShort: "Nút tải trên video",
  floatPos: "Vị trí nút tải", posLeft: "Trên trái", posRight: "Trên phải", downloadVideo: "Tải video này",
  pageEmptyHint: "Dùng nút phía trên để tải video của trang này.", untitled: "Video chưa đặt tên",

};
const dict = { en, vi };

export async function getPrefs() {
  const p = (await chrome.storage.local.get("prefs")).prefs || {};
  return { theme: "system", lang: "system", floatBtn: true, floatPos: "right", color: "blue", ...p };
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
import { PALETTES } from "./palettes.js";

export function applyTheme(theme, color = "blue") {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
  const pal = (PALETTES[color] || PALETTES.blue)[dark ? "dark" : "light"];
  for (const [k, v] of Object.entries(pal)) root.style.setProperty(`--${k}`, v);
}

/** Colors the on-page download button reads (it cannot import this module). */
export function accentFor(color = "blue") {
  const p = PALETTES[color] || PALETTES.blue;
  return { light: { bg: p.light.primary, fg: p.light["on-primary"] }, dark: { bg: p.dark.primary, fg: p.dark["on-primary"] } };
}
export const SWATCH_IDS = Object.keys(PALETTES);
export const swatchColor = (id) => PALETTES[id].seed;
