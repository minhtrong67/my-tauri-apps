import { PAGE_SITES, fileNameOf, isMediaUrl, isNoise, pageCookies, sendToApp, siteThumb } from "./lib/shared.js";

// Media requests detected per tab: Map<tabId, Map<url, item>>
const found = new Map();
const MEDIA_TYPES = ["media"];

function remember(tabId, item) {
  if (tabId < 0) return;
  let tab = found.get(tabId);
  if (!tab) found.set(tabId, (tab = new Map()));
  if (tab.has(item.url)) return;
  tab.set(item.url, item);
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#415F91" });
  chrome.action.setBadgeText({ tabId, text: String(tab.size) });
  // Keep the list in session storage so it survives service-worker restarts.
  chrome.storage.session.set({ [`tab:${tabId}`]: [...tab.values()] });
}

async function restore(tabId) {
  if (found.has(tabId)) return found.get(tabId);
  const stored = (await chrome.storage.session.get(`tab:${tabId}`))[`tab:${tabId}`] || [];
  const map = new Map(stored.map((i) => [i.url, i]));
  found.set(tabId, map);
  return map;
}

chrome.webRequest.onResponseStarted.addListener(
  (d) => {
    const headers = d.responseHeaders || [];
    const get = (n) => headers.find((h) => h.name.toLowerCase() === n)?.value || "";
    const type = get("content-type").toLowerCase();
    const length = Number(get("content-length")) || 0;
    const range = get("content-range");
    const total = range ? Number(range.split("/")[1]) || length : length;

    const isPlaylist = type.includes("mpegurl") || /\.m3u8(\?|$)/i.test(d.url);
    const isVideo = type.startsWith("video/") || type.startsWith("audio/") || type.includes("application/mp4");
    const isMedia = isPlaylist || isVideo || (d.type === "media" && isMediaUrl(d.url));
    if (!isMedia) return;
    // Skip tiny probes/segments (ads, previews, HLS/DASH chunks).
    if (!isPlaylist && total > 0 && total < 150 * 1024) return;
    if (/\.(ts|m4s)(\?|$)/i.test(d.url) || /\/(seg|chunk|frag)[-_]?\d+/i.test(d.url)) return;
    if (/\.mpd(\?|$)/i.test(d.url)) return;
    if (isNoise(d.url)) return;

    chrome.tabs.get(d.tabId).then(
      (tab) =>
        remember(d.tabId, {
          url: d.url,
          kind: isPlaylist ? "hls" : "file",
          type: type.split(";")[0],
          size: isPlaylist ? 0 : total,
          name: fileNameOf(d.url),
          pageUrl: tab.url || "",
          pageTitle: tab.title || "",
          at: Date.now(),
        }),
      () => undefined,
    );
  },
  { urls: ["http://*/*", "https://*/*"], types: ["media", "xmlhttprequest", "other"] },
  ["responseHeaders"],
);

const lastPage = new Map(); // tabId -> URL without hash (detects SPA navigation)
const metas = new Map();    // tabId -> { top, frames: { [frameId]: video[] } }

function forget(tabId) {
  found.set(tabId, new Map());
  metas.delete(tabId);
  chrome.storage.session.remove([`tab:${tabId}`, `meta:${tabId}`]);
  chrome.action.setBadgeText({ tabId, text: "" }).catch(() => undefined);
}

chrome.tabs.onRemoved.addListener((tabId) => {
  found.delete(tabId);
  metas.delete(tabId);
  lastPage.delete(tabId);
  chrome.storage.session.remove([`tab:${tabId}`, `meta:${tabId}`]);
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  // A new page, or an in-page (SPA) navigation: forget what the previous page played.
  if (!info.url && info.status !== "loading") return;
  const url = (info.url || "").split("#")[0];
  if (info.url && lastPage.get(tabId) === url) return;
  if (info.url) lastPage.set(tabId, url);
  if (info.url || info.status === "loading") forget(tabId);
});

// ---- metadata (thumbnails, durations) reported by content scripts in every frame
async function restoreMeta(tabId) {
  if (metas.has(tabId)) return metas.get(tabId);
  const stored = (await chrome.storage.session.get(`meta:${tabId}`))[`meta:${tabId}`] || { top: null, frames: {} };
  metas.set(tabId, stored);
  return stored;
}

async function storeMeta(sender, msg) {
  const tabId = sender.tab?.id;
  if (tabId === undefined || tabId < 0) return;
  const m = await restoreMeta(tabId);
  if (msg.top) m.top = msg.top;
  m.frames[sender.frameId ?? 0] = (msg.videos || []).map((v) => ({ ...v, frameId: sender.frameId ?? 0 }));
  chrome.storage.session.set({ [`meta:${tabId}`]: m }).catch(() => undefined);
}

/** A blob/MSE player gives us no URL: use the media request the tab fetched most recently (HLS playlist or file). */
async function bestNetwork(tabId, srcs = []) {
  if (tabId === undefined) return null;
  const items = [...(await restore(tabId)).values()].sort((a, b) => b.at - a.at);
  return items.find((i) => srcs.includes(i.url)) || items.find((i) => i.kind === "hls") || items[0] || null;
}

function pickPrimary(videos) {
  return [...videos].sort((a, b) => Number(b.playing) - Number(a.playing) || b.w * b.h - a.w * a.h)[0];
}

/** Add a thumbnail, duration and a readable title to each detected item. */
function enrich(items, meta, tab) {
  const videos = Object.values(meta.frames || {}).flat();
  const primary = pickPrimary(videos.filter((v) => v.thumb)) || pickPrimary(videos);
  const pageThumb = siteThumb(tab?.url) || meta.top?.og || "";
  return items.map((it) => {
    const own = videos.find((v) => v.srcs?.includes(it.url));
    const v = own || primary;
    return {
      ...it,
      thumb: (own && own.thumb) || (!own && v && v.thumb) || pageThumb || "",
      duration: (v && v.duration) || 0,
      title: (meta.top && meta.top.title) || it.pageTitle || "",
    };
  });
}

// Fallback for plain files when the desktop app is not running.
async function browserDownload(url, referer) {
  try {
    await chrome.downloads.download({ url });
    return true;
  } catch {
    return false;
  }
}

async function send(payload) {
  const res = await sendToApp(payload);
  return res;
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === "list") {
      const [tabItems, meta, tabInfo] = await Promise.all([restore(msg.tabId), restoreMeta(msg.tabId), chrome.tabs.get(msg.tabId).catch(() => null)]);
      const items = enrich([...tabItems.values()].sort((a, b) => b.at - a.at), meta, tabInfo);
      const pageThumb = siteThumb(tabInfo?.url) || meta.top?.og || "";
      const primary = pickPrimary(Object.values(meta.frames || {}).flat().filter((v) => v.thumb));
      reply({ items, page: { thumb: siteThumb(tabInfo?.url) || primary?.thumb || pageThumb || "", duration: primary?.duration || 0 } });
    } else if (msg.type === "meta") {
      await storeMeta(sender, msg);
      reply({ ok: true });
    } else if (msg.type === "send") {
      const pageUrl = msg.pageUrl || sender.tab?.url || msg.frameUrl || "";
      let url = msg.url;
      if (!url && msg.unresolved) url = (await bestNetwork(sender.tab?.id, msg.srcs))?.url || "";
      if (!url && msg.unresolved) { reply({ ok: false, reason: "unresolved" }); return; }
      url = url || pageUrl;
      const cookie = msg.withCookies === false ? "" : await pageCookies(pageUrl || url);
      const res = await send({
        url,
        title: msg.title || sender.tab?.title || "",
        referer: pageUrl,
        userAgent: navigator.userAgent,
        cookie,
        pageUrl,
        thumbnail: msg.thumbnail || siteThumb(pageUrl) || "",
      });
      if (!res.ok && res.reason === "offline" && msg.fallback && isMediaUrl(url) && !/\.m3u8/i.test(url)) {
        res.fallback = await browserDownload(url, pageUrl);
      }
      reply(res);
    } else if (msg.type === "clear") {
      forget(msg.tabId);
      reply({ ok: true });
    } else if (msg.type === "isPageSite") {
      reply({ ok: PAGE_SITES.test(msg.url || "") });
    }
  })();
  return true; // async reply
});

// Context menu: "Download with Material Video Downloader"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "mvd-link",
    title: "Download with Material Video Downloader",
    contexts: ["link", "video", "audio", "page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.srcUrl || info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;
  const res = await send({
    url,
    title: tab?.title,
    referer: tab?.url,
    userAgent: navigator.userAgent,
    cookie: await pageCookies(tab?.url || url),
    pageUrl: tab?.url,
    thumbnail: siteThumb(url) || siteThumb(tab?.url),
  });
  chrome.action.setBadgeBackgroundColor({ color: res.ok ? "#2E7D32" : "#BA1A1A" });
  chrome.action.setBadgeText({ text: res.ok ? "✓" : "!" });
  setTimeout(() => tab?.id !== undefined && chrome.action.setBadgeText({ text: "" }), 2000);
});
