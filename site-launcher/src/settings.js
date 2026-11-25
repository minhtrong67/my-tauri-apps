import { SEED_URL, cleanUrls } from "./sites.js";

const KEY = "site-launcher:settings";

const guessLang = () =>
  (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en";

const EFFECTS = ["mica", "tabbed", "acrylic", "none"];

const defaults = () => ({
  lang: guessLang(),
  theme: "system", // light | dark | system
  effect: "mica", // mica | tabbed (Mica Alt) | acrylic | none
  windowMode: "remember", // remember | maximized
  size: null, // { w, h } kích thước đã nhớ
  browser: "", // trình duyệt đang chọn
  tabs: [SEED_URL], // các trang mặc định sẽ mở (tối đa 5)
  profileTabs: {}, // "trình duyệt:profile" -> các trang riêng của profile
  sites: [{ url: SEED_URL, last: 0 }], // các trang đã lưu cho dropdown
});

export function loadSettings() {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const s = { ...d, ...raw };
    s.tabs = raw.tabs ? cleanUrls(raw.tabs) : d.tabs;
    s.profileTabs = Object.fromEntries(
      Object.entries(raw.profileTabs || {}).map(([k, v]) => [k, cleanUrls(v)])
    );
    s.sites = (Array.isArray(raw.sites) ? raw.sites : d.sites).filter((x) => x && typeof x.url === "string");
    if (!EFFECTS.includes(s.effect)) s.effect = "mica";
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
