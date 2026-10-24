import { icon } from "./lib/icons.js";
import { applyTheme, getPrefs, makeT, resolveLang, setPrefs } from "./lib/i18n.js";
import { PAGE_SITES, findApp, fmtBytes } from "./lib/shared.js";

const app = document.getElementById("app");
let prefs, t, tab, items = [], appState = "checking", view = "main";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function ripple(e) {
  const b = e.currentTarget;
  const r = b.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const s = document.createElement("span");
  s.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;background:currentColor;opacity:.18;width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px;transform:scale(0);transition:transform .5s cubic-bezier(.2,0,0,1),opacity .6s`;
  b.appendChild(s);
  requestAnimationFrame(() => { s.style.transform = "scale(1)"; s.style.opacity = "0"; });
  setTimeout(() => s.remove(), 650);
}

async function refresh() {
  const base = await findApp();
  if (!base) appState = "offline";
  else {
    appState = "on";
    try {
      const r = await fetch(`${base}/ping`);
      if (r.status === 403) appState = "disabled";
    } catch { /* ignore */ }
  }
  const res = await chrome.runtime.sendMessage({ type: "list", tabId: tab.id });
  items = res?.items || [];
  render();
}

function statusHtml() {
  if (appState === "checking") return `<div class="status"><span class="dot"></span><span class="grow">…</span></div>`;
  if (appState === "on") return `<div class="status on"><span class="dot"></span><span class="grow">${t("connected")}</span></div>`;
  const msg = appState === "disabled" ? t("disabled") : `${t("offline")}. ${t("offlineHint")}`;
  return `<div class="status off"><span class="dot"></span><span class="grow">${msg}</span></div>`;
}

function mainHtml() {
  const isPageSite = PAGE_SITES.test(tab.url || "");
  const pageCard = isPageSite
    ? `<div class="page-card">
         <span style="flex-shrink:0">${icon("film", 28)}</span>
         <div class="txt"><b>${t("thisPage")}</b><small>${t("thisPageHint")}</small></div>
         <button class="btn sm" data-send-page>${icon("download", 16)}${t("download")}</button>
       </div>`
    : "";
  const list = items.length
    ? `<div class="sec"><span class="grow">${t("detected")} (${items.length})</span><button data-clear>${t("clear")}</button></div>
       <div class="list">${items
         .map(
           (it, i) => `<div class="item" style="--i:${Math.min(i, 8)}">
             <span class="ico">${icon(it.kind === "hls" ? "radio" : "film", 20)}</span>
             <div class="meta"><div class="name" title="${esc(it.url)}">${esc(it.name || it.url)}</div>
               <div class="sub"><span class="tag">${it.kind === "hls" ? t("hls") : t("file")}</span><span>${esc(fmtBytes(it.size) || it.type || "")}</span></div></div>
             <button class="btn sm tonal" data-send="${i}">${icon("download", 16)}</button>
           </div>`,
         )
         .join("")}</div>`
    : isPageSite
      ? ""
      : `<div class="empty"><div class="badge">${icon("list-video", 30)}</div><b>${t("emptyTitle")}</b>${t("emptyBody")}</div>`;
  return statusHtml() + pageCard + list;
}

function settingsHtml() {
  const seg = (name, value, opts) =>
    `<div class="seg" role="radiogroup">${opts.map(([v, label, ic]) => `<button role="radio" aria-checked="${value === v}" data-${name}="${v}">${ic ? icon(ic, 15) : ""}${label}</button>`).join("")}</div>`;
  return `<div class="settings">
    <div><h2>${t("theme")}</h2>${seg("theme", prefs.theme, [["system", t("system"), "monitor"], ["light", t("light"), "sun"], ["dark", t("dark"), "moon"]])}</div>
    <div><h2>${t("language")}</h2>${seg("lang", prefs.lang, [["system", t("system"), "globe"], ["en", "English"], ["vi", "Tiếng Việt"]])}</div>
    <div class="row"><div>${t("floatBtn")}<small>${t("floatBtnHint")}</small></div><button class="switch" role="switch" aria-checked="${prefs.floatBtn}" data-float></button></div>
  </div>`;
}

function render() {
  const settings = view === "settings";
  app.innerHTML = `<header>
      <img src="icons/icon48.png" alt="" />
      <h1>${settings ? t("settings") : t("title")}</h1>
      <button class="icon-btn" data-view aria-label="${settings ? t("back") : t("settings")}" title="${settings ? t("back") : t("settings")}">${icon(settings ? "x" : "settings", 20)}</button>
    </header>${settings ? settingsHtml() : mainHtml()}`;
  document.documentElement.lang = resolveLang(prefs.lang);
  app.querySelectorAll(".btn, .icon-btn, .seg button").forEach((b) => b.addEventListener("pointerdown", ripple));
}

async function send(btn, payload) {
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = icon("download", 16).replace("<svg", '<svg class="spin"');
  const res = await chrome.runtime.sendMessage({ type: "send", fallback: true, ...payload });
  btn.disabled = false;
  if (res?.ok) {
    btn.classList.add("done");
    btn.innerHTML = icon("check", 16) + (btn.classList.contains("tonal") ? "" : t("sent"));
  } else if (res?.fallback) {
    btn.classList.add("done");
    btn.innerHTML = icon("check", 16);
    btn.title = t("fallbackSaved");
  } else {
    btn.classList.add("fail");
    btn.innerHTML = icon("circle-alert", 16) + (btn.classList.contains("tonal") ? "" : t("failed"));
    setTimeout(() => { btn.classList.remove("fail"); btn.innerHTML = original; }, 2200);
    appState = res?.reason === "disabled" ? "disabled" : "offline";
    const status = app.querySelector(".status");
    if (status) status.outerHTML = statusHtml();
  }
}

app.addEventListener("click", async (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  if (el.dataset.view !== undefined) { view = view === "settings" ? "main" : "settings"; render(); }
  else if (el.dataset.clear !== undefined) { await chrome.runtime.sendMessage({ type: "clear", tabId: tab.id }); items = []; render(); }
  else if (el.dataset.send !== undefined) {
    const it = items[Number(el.dataset.send)];
    await send(el, { url: it.url, title: it.pageTitle, pageUrl: it.pageUrl || tab.url });
  } else if (el.dataset.sendPage !== undefined) {
    await send(el, { url: tab.url, title: tab.title, pageUrl: tab.url });
  } else if (el.dataset.theme) {
    prefs = await setPrefs({ theme: el.dataset.theme }); applyTheme(prefs.theme); render();
  } else if (el.dataset.lang) {
    prefs = await setPrefs({ lang: el.dataset.lang }); t = makeT(resolveLang(prefs.lang)); render();
  } else if (el.dataset.float !== undefined) {
    prefs = await setPrefs({ floatBtn: !prefs.floatBtn }); render();
  }
});

(async () => {
  prefs = await getPrefs();
  t = makeT(resolveLang(prefs.lang));
  applyTheme(prefs.theme);
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  render();
  await refresh();
})();
