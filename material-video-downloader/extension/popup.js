import { icon } from "./lib/icons.js";
import { SWATCH_IDS, applyTheme, getPrefs, makeT, resolveLang, setPrefs, swatchColor } from "./lib/i18n.js";
import { PAGE_SITES, findApp, fmtBytes } from "./lib/shared.js";

const app = document.getElementById("app");
let prefs, t, tab, items = [], appState = "checking", view = "main", filter = "all";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

function ripple(e) {
  const b = e.currentTarget;
  const r = b.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const s = document.createElement("span");
  s.className = "ripple";
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  b.appendChild(s);
  setTimeout(() => s.remove(), 650);
}

async function refresh() {
  const base = await findApp();
  appState = base ? "on" : "offline";
  if (base) {
    try {
      const r = await fetch(`${base}/ping`);
      if (r.status === 403) appState = "disabled";
    } catch { /* ignore */ }
  }
  const res = await chrome.runtime.sendMessage({ type: "list", tabId: tab.id });
  items = res?.items || [];
  render();
}

const statusText = () =>
  appState === "on" ? t("connected") : appState === "disabled" ? t("disabled") : appState === "checking" ? "…" : t("offline");

function bar(title) {
  const settings = view === "settings";
  return `<div class="bar ${appState === "on" ? "on" : appState === "checking" ? "" : "off"}">
    <div class="logo shape-cookie">${icon("download", 22)}</div>
    <h1>${title}<small><span class="dot"></span>${esc(statusText())}</small></h1>
    <button class="ibtn ${settings ? "tonal" : ""}" data-view aria-label="${settings ? t("back") : t("settings")}" title="${settings ? t("back") : t("settings")}">${icon(settings ? "x" : "settings", 22)}</button>
  </div>`;
}

function visibleItems() {
  return items.filter((i) => filter === "all" || (filter === "stream" ? i.kind === "hls" : i.kind !== "hls"));
}

function mainHtml() {
  const isPageSite = PAGE_SITES.test(tab.url || "");
  const count = (f) => items.filter((i) => (f === "stream" ? i.kind === "hls" : f === "video" ? i.kind !== "hls" : true)).length;
  const fav = tab.favIconUrl ? `<img src="${esc(tab.favIconUrl)}" alt="" />` : icon("globe", 24);

  if (appState === "offline" || appState === "disabled") {
    return `<div class="scroll">
      <div class="state">
        <div class="art"><span class="a shape-flower"></span><span class="b shape-cookie"></span><span class="c">${icon(appState === "disabled" ? "plug-zap" : "wifi-off", 38)}</span></div>
        <h2>${appState === "disabled" ? t("disabled") : t("offlineTitle")}</h2>
        ${appState === "disabled" ? "" : `<p>${t("offlineBody")}</p>
        <ul class="steps"><li><i>1</i>${t("step1")}</li><li><i>2</i>${t("step2")}</li><li><i>3</i>${t("step3")}</li></ul>`}
        <button class="btn" data-retry>${icon("zap", 18)}${t("retry")}</button>
      </div>
      ${items.length ? listHtml() : ""}
    </div>`;
  }

  const hero = `<section class="hero"><span class="deco shape-flower"></span>
    <div class="page"><div class="fav">${fav}</div>
      <div class="t"><b>${esc(tab.title || host(tab.url))}</b><span>${esc(host(tab.url))}</span></div>
      <span class="stat">${items.length} ${t("found")}</span></div>
    ${isPageSite ? `<button class="btn" data-send-page>${icon("download", 20)}${t("thisPage")}</button>` : ""}
  </section>`;

  const chips = items.length
    ? `<div class="chips">${["all", "video", "stream"].map((f) => `<button class="chip" aria-pressed="${filter === f}" data-filter="${f}">${t(f)}<span class="n">${count(f)}</span></button>`).join("")}</div>`
    : "";

  const empty = items.length
    ? ""
    : `<div class="state">
        <div class="art"><span class="a shape-flower"></span><span class="b shape-cookie"></span><span class="c">${icon("list-video", 38)}</span></div>
        <h2>${t("emptyTitle")}</h2><p>${t("emptyBody")}</p>
      </div>`;

  return `${hero}${chips}<div class="scroll">${items.length ? listHtml() : empty}</div>${
    items.length
      ? `<div class="foot"><button class="link" data-clear>${t("clear")}</button><span class="grow"></span>${
          visibleItems().length > 1 ? `<button class="btn" data-all>${icon("download", 18)}${t("downloadAll")}</button>` : ""
        }</div>`
      : ""
  }`;
}

function listHtml() {
  const list = visibleItems();
  return `<div class="list">${list
    .map((it, i) => {
      const stream = it.kind === "hls";
      return `<div class="item" style="--i:${Math.min(i, 8)}">
        <span class="badge ${stream ? "stream shape-flower" : "shape-cookie"}">${icon(stream ? "radio" : "film", 20)}</span>
        <div class="meta"><div class="name" title="${esc(it.url)}">${esc(it.name || it.url)}</div>
          <div class="sub"><span class="tag ${stream ? "hls" : ""}">${stream ? "HLS" : esc((it.type.split("/")[1] || "FILE").toUpperCase())}</span><span>${esc(fmtBytes(it.size) || host(it.url))}</span></div></div>
        <div class="acts">
          <button class="ibtn sm" data-copy="${items.indexOf(it)}" aria-label="${t("copy")}" title="${t("copy")}">${icon("link-2", 18)}</button>
          <button class="btn sm" data-send="${items.indexOf(it)}">${icon("download", 16)}</button>
        </div></div>`;
    })
    .join("")}</div>`;
}

function settingsHtml() {
  const seg = (name, value, opts) =>
    `<div class="seg" role="radiogroup">${opts.map(([v, label, ic]) => `<button role="radio" aria-checked="${value === v}" data-${name}="${v}">${ic ? icon(ic, 16) : ""}${label}</button>`).join("")}</div>`;
  return `<div class="scroll"><div class="set">
    <div class="card"><h2>${t("theme")}</h2>${seg("theme", prefs.theme, [["system", t("system"), "monitor"], ["light", t("light"), "sun"], ["dark", t("dark"), "moon"]])}</div>
    <div class="card"><h2>${t("themeColor")}</h2><div class="swatches">${SWATCH_IDS.map((id) => `<button class="sw" style="background:${swatchColor(id)};--c:${swatchColor(id)}" aria-pressed="${prefs.color === id}" data-color="${id}" aria-label="${id}">${prefs.color === id ? icon("check", 16) : ""}</button>`).join("")}</div></div>
    <div class="card"><h2>${t("language")}</h2>${seg("lang", prefs.lang, [["system", t("system"), "globe"], ["en", "English"], ["vi", "Tiếng Việt"]])}</div>
    <div class="card"><div class="row"><div><b>${t("floatBtn")}</b><small>${t("floatBtnHint")}</small></div><button class="switch" role="switch" aria-checked="${prefs.floatBtn}" data-float></button></div></div>
    <div class="card"><div class="about"><div class="logo shape-cookie">${icon("download", 24)}</div><div><p><b>Material Video Downloader</b></p><small>v${chrome.runtime.getManifest().version} · ${t("madeBy")}</small></div></div></div>
  </div></div>`;
}

function render() {
  const settings = view === "settings";
  app.innerHTML = bar(settings ? t("settings") : t("title")) + (settings ? settingsHtml() : mainHtml());
  document.documentElement.lang = resolveLang(prefs.lang);
  app.querySelectorAll(".btn, .ibtn, .chip, .seg button").forEach((b) => b.addEventListener("pointerdown", ripple));
}

async function send(btn, payload) {
  btn.disabled = true;
  const original = btn.innerHTML;
  const compact = btn.classList.contains("sm");
  btn.innerHTML = icon("download", 18).replace("<svg", '<svg class="spin"');
  const res = await chrome.runtime.sendMessage({ type: "send", fallback: true, ...payload });
  btn.disabled = false;
  if (res?.ok || res?.fallback) {
    btn.classList.add("ok");
    btn.innerHTML = icon("check", 18) + (compact ? "" : t("sent"));
    btn.title = res.ok ? t("sent") : t("fallbackSaved");
    return true;
  }
  btn.classList.add("bad");
  btn.innerHTML = icon("circle-alert", 18) + (compact ? "" : t("failed"));
  setTimeout(() => { btn.classList.remove("bad"); btn.innerHTML = original; }, 2000);
  appState = res?.reason === "disabled" ? "disabled" : "offline";
  setTimeout(render, 900);
  return false;
}

app.addEventListener("click", async (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  const d = el.dataset;
  if (d.view !== undefined) { view = view === "settings" ? "main" : "settings"; render(); }
  else if (d.retry !== undefined) { appState = "checking"; render(); await refresh(); }
  else if (d.filter) { filter = d.filter; render(); }
  else if (d.clear !== undefined) { await chrome.runtime.sendMessage({ type: "clear", tabId: tab.id }); items = []; render(); }
  else if (d.copy !== undefined) { await navigator.clipboard.writeText(items[Number(d.copy)].url); el.innerHTML = icon("check", 18); setTimeout(() => (el.innerHTML = icon("link-2", 18)), 1200); }
  else if (d.send !== undefined) { const it = items[Number(d.send)]; await send(el, { url: it.url, title: it.pageTitle, pageUrl: it.pageUrl || tab.url }); }
  else if (d.sendPage !== undefined) { await send(el, { url: tab.url, title: tab.title, pageUrl: tab.url }); }
  else if (d.all !== undefined) {
    el.disabled = true;
    for (const it of visibleItems()) await chrome.runtime.sendMessage({ type: "send", fallback: true, url: it.url, title: it.pageTitle, pageUrl: it.pageUrl || tab.url });
    el.disabled = false; el.classList.add("ok"); el.innerHTML = icon("check", 18) + t("sent");
  }
  else if (d.theme) { prefs = await setPrefs({ theme: d.theme }); applyTheme(prefs.theme, prefs.color); render(); }
  else if (d.color) { prefs = await setPrefs({ color: d.color }); applyTheme(prefs.theme, prefs.color); render(); }
  else if (d.lang) { prefs = await setPrefs({ lang: d.lang }); t = makeT(resolveLang(prefs.lang)); render(); }
  else if (d.float !== undefined) { prefs = await setPrefs({ floatBtn: !prefs.floatBtn }); render(); }
});

(async () => {
  prefs = await getPrefs();
  t = makeT(resolveLang(prefs.lang));
  applyTheme(prefs.theme, prefs.color);
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  render();
  await refresh();
})();
