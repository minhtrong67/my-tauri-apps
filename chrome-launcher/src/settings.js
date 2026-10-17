import { MAX_COPIES, uid } from "./sites.js";

export const SEED_URL = "https://claude.ai/new";
const KEY = "chrome-launcher:settings";

const guessLang = () =>
  (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en";

const defaults = () => ({
  lang: guessLang(),
  theme: "system", // light | dark | system
  contrast: "standard", // standard | medium | high
  windowMode: "remember", // remember | maximized
  size: null, // { w, h } kích thước đã nhớ
  tabsOpen: false, // thẻ "Các tab sẽ mở" đang mở rộng
  tabs: [{ id: uid(), url: SEED_URL, count: 1 }], // bộ tab mặc định
  profileTabs: {}, // dir -> bộ tab riêng của profile
  sites: [{ url: SEED_URL, last: 0 }], // các trang đã lưu cho dropdown
});

const cleanTabs = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((e) => e && typeof e.url === "string")
    .map((e) => ({
      id: e.id || uid(),
      url: e.url,
      count: Math.min(MAX_COPIES, Math.max(1, Number(e.count) || 1)),
    }));

export function loadSettings() {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const s = { ...d, ...raw };
    s.tabs = raw.tabs ? cleanTabs(raw.tabs) : d.tabs;
    s.profileTabs = Object.fromEntries(
      Object.entries(raw.profileTabs || {}).map(([k, v]) => [k, cleanTabs(v)])
    );
    s.sites = (Array.isArray(raw.sites) ? raw.sites : d.sites).filter((x) => x && typeof x.url === "string");
    if (!["standard", "medium", "high"].includes(s.contrast)) s.contrast = "standard";
    return s;
  } catch {
    return d;
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
