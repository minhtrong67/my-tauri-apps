import { PAGE_SITES, fileNameOf, isMediaUrl, pageCookies, sendToApp } from "./lib/shared.js";

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

chrome.tabs.onRemoved.addListener((tabId) => {
  found.delete(tabId);
  chrome.storage.session.remove(`tab:${tabId}`);
});

chrome.webNavigation?.onCommitted?.addListener?.(() => undefined);
chrome.tabs.onUpdated.addListener((tabId, info) => {
  // New page in the same tab: forget the previous page's media.
  if (info.status === "loading" && info.url) {
    found.set(tabId, new Map());
    chrome.storage.session.remove(`tab:${tabId}`);
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});

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
      const tab = await restore(msg.tabId);
      reply({ items: [...tab.values()].sort((a, b) => b.at - a.at) });
    } else if (msg.type === "send") {
      const cookie = msg.withCookies === false ? "" : await pageCookies(msg.pageUrl || msg.url);
      const res = await send({
        url: msg.url,
        title: msg.title,
        referer: msg.pageUrl,
        userAgent: navigator.userAgent,
        cookie,
        pageUrl: msg.pageUrl,
      });
      if (!res.ok && res.reason === "offline" && msg.fallback && isMediaUrl(msg.url) && !/\.m3u8/i.test(msg.url)) {
        res.fallback = await browserDownload(msg.url, msg.pageUrl);
      }
      reply(res);
    } else if (msg.type === "clear") {
      found.set(msg.tabId, new Map());
      chrome.storage.session.remove(`tab:${msg.tabId}`);
      chrome.action.setBadgeText({ tabId: msg.tabId, text: "" });
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
  });
  chrome.action.setBadgeBackgroundColor({ color: res.ok ? "#2E7D32" : "#BA1A1A" });
  chrome.action.setBadgeText({ text: res.ok ? "✓" : "!" });
  setTimeout(() => tab?.id !== undefined && chrome.action.setBadgeText({ text: "" }), 2000);
});
