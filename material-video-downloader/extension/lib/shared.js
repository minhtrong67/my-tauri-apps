// Shared by the service worker and the popup.
export const FIRST_PORT = 38517;
export const LAST_PORT = 38527;

/** Find the desktop app by scanning its small port range. Returns a base URL or null. */
export async function findApp() {
  const cached = (await chrome.storage.session.get("appBase")).appBase;
  const candidates = cached ? [cached] : [];
  for (let p = FIRST_PORT; p <= LAST_PORT; p++) {
    const base = `http://127.0.0.1:${p}`;
    if (!candidates.includes(base)) candidates.push(base);
  }
  for (const base of candidates) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 600);
      const res = await fetch(`${base}/ping`, { signal: ctl.signal, cache: "no-store" });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.app === "material-video-downloader") {
          await chrome.storage.session.set({ appBase: base });
          return base;
        }
      }
    } catch {
      /* try next port */
    }
  }
  await chrome.storage.session.remove("appBase");
  return null;
}

/** Send a link to the app. Resolves to { ok, reason }. */
export async function sendToApp(payload) {
  const base = await findApp();
  if (!base) return { ok: false, reason: "offline" };
  try {
    const res = await fetch(`${base}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-MVD-Client": "extension" },
      body: JSON.stringify(payload),
    });
    if (res.status === 403) return { ok: false, reason: "disabled" };
    return { ok: res.ok, reason: res.ok ? "" : "error" };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

export async function pageCookies(url) {
  try {
    const list = await chrome.cookies.getAll({ url });
    return list.map((c) => `${c.name}=${c.value}`).join("; ");
  } catch {
    return "";
  }
}

const MEDIA_EXT = /\.(mp4|m4v|webm|mkv|mov|flv|avi|wmv|mpg|mpeg|3gp|ogv|mp3|m4a|aac|flac|wav|ogg|opus|m3u8|ts)(\?|#|$)/i;
export const isMediaUrl = (u) => MEDIA_EXT.test(u);

export function fileNameOf(url) {
  try {
    const path = new URL(url).pathname;
    const name = decodeURIComponent(path.split("/").pop() || "");
    return name || new URL(url).hostname;
  } catch {
    return url;
  }
}

export function fmtBytes(n) {
  if (!n) return "";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`;
}

/** Sites where the page URL itself should go to yt-dlp (streams are blob/MSE based). */
export const PAGE_SITES =
  /(youtube\.com\/(watch|shorts)|youtu\.be\/|vimeo\.com\/\d|facebook\.com\/.*(videos|watch|reel)|fb\.watch|tiktok\.com\/|twitter\.com\/.*\/status|x\.com\/.*\/status|instagram\.com\/(p|reel|tv)\/|dailymotion\.com\/video|twitch\.tv\/(videos|clip)|bilibili\.com\/video|reddit\.com\/r\/.*\/comments)/i;

/** Requests that are only pieces of a stream (byte ranges, ad pings): never useful as a download. */
export function isNoise(url) {
  try {
    const u = new URL(url);
    if (/(^|\.)googlevideo\.com$/.test(u.hostname)) return true;
    if (/[?&](bytestart|byteend|range|rn|rbuf)=/i.test(u.search)) return true;
    if (/\/(videoplayback|seg-\d+|fragment)/i.test(u.pathname) && u.search.length > 80) return true;
  } catch { /* ignore */ }
  return false;
}

/** A thumbnail we can derive from the page URL alone (no page access needed). */
export function siteThumb(url) {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/i.exec(url || "");
  return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : "";
}

export function fmtDuration(sec) {
  if (!sec || !isFinite(sec)) return "";
  const s = Math.round(sec), h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60), se = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(mi)}:${p(se)}` : `${mi}:${p(se)}`;
}
