// On-page download button (icon only) + video metadata for the popup (thumbnails, durations).
// Runs in every frame. The button lives in a Shadow DOM so site CSS cannot break it, and it is
// positioned from the pointer location (not from mouseover targets), so overlays, custom players
// and feeds on social sites cannot hide it.
(() => {
  if (window.__mvdLoaded) return;
  window.__mvdLoaded = true;

  const IS_TOP = window.top === window;
  const MIN_W = 150;
  const MIN_H = 84;
  const IDLE_MS = 3000;
  const alive = () => !!(chrome.runtime && chrome.runtime.id);

  // ------------------------------------------------------------------ prefs
  let prefs = { floatBtn: true, floatPos: "right", theme: "system", lang: "system", accent: null };
  const loadPrefs = (p) => (prefs = { ...prefs, ...(p || {}) });
  try {
    chrome.storage.local.get("prefs").then((r) => { loadPrefs(r.prefs); paint(); });
    chrome.storage.onChanged.addListener((c) => { if (c.prefs) { loadPrefs(c.prefs.newValue); paint(); if (!prefs.floatBtn) hide(true); } });
  } catch { /* extension reloaded */ }

  const LANG = () => (prefs.lang === "vi" || prefs.lang === "en" ? prefs.lang : (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en");
  const TEXT = { en: { tip: "Download video", ok: "Sent to app", err: "Could not send", unres: "Open the post, then try again" }, vi: { tip: "Tải video này", ok: "Đã gửi sang ứng dụng", err: "Không gửi được", unres: "Hãy mở bài đăng rồi thử lại" } };
  const tr = (k) => TEXT[LANG()][k];

  // ------------------------------------------------------------------ helpers
  const abs = (u) => { try { return u ? new URL(u, location.href).href : ""; } catch { return ""; } };
  const isHttp = (u) => /^https?:/i.test(u || "");

  // Per-site knowledge: which URLs are "a post" (page), which links inside a feed lead to one (link),
  // and how to read the post id straight from the player markup (mine).
  const xgId = (video) => {
    const w = video.closest && video.closest('[id^="xgwrapper-"]');
    const m = w && /^xgwrapper-\d+-(\d{10,})$/.exec(w.id);
    return m ? m[1] : "";
  };
  const handleNear = (video) => {
    for (let el = video, i = 0; el && i < 14; i++, el = el.parentElement) {
      const a = el.querySelector && el.querySelector('a[href^="/@"],a[href*="tiktok.com/@"]');
      const m = a && /\/@([\w.-]+)/.exec(a.getAttribute("href"));
      if (m) return m[1];
    }
    return "";
  };
  const RULES = [
    { host: /(^|\.)youtube(-nocookie)?\.com$|^youtu\.be$/, page: /^\/(watch|shorts\/|live\/)/, link: /^\/(watch\?|shorts\/|live\/)/, preferPage: true },
    { host: /(^|\.)vimeo\.com$/, page: /^\/\d+/, link: /^\/\d+/, preferPage: true },
    { host: /(^|\.)dailymotion\.com$/, page: /^\/video\//, link: /^\/video\//, preferPage: true },
    { host: /(^|\.)twitch\.tv$/, page: /\/(videos|clip)\//, link: /\/(videos|clip)\//, preferPage: true },
    { host: /(^|\.)(facebook|fb)\.com$|^fb\.watch$/, page: /\/(videos|reel|watch|share\/[rv])\/|\/watch\/?\?v=|\/posts\/|\/permalink|story\.php/, link: /\/(videos|reel|watch|share\/[rv])\/|\/watch\/?\?v=|\/posts\/|story\.php|\/permalink/ },
    { host: /(^|\.)instagram\.com$/, page: /^\/(reel|reels|p|tv)\/[\w-]+|^\/stories\/[\w.]+\/\d+/, link: /^\/(reel|reels|p|tv)\/[\w-]+|^\/stories\/[\w.]+\/\d+/ },
    { host: /(^|\.)tiktok\.com$/, page: /\/(video|photo)\/\d+/, link: /\/(video|photo)\/\d+/,
      mine: (v) => { const id = xgId(v); return id ? `https://www.tiktok.com/@${handleNear(v)}/video/${id}` : ""; } },
    { host: /(^|\.)douyin\.com$/, page: /^\/(video|note)\/\d+/, link: /^\/(video|note)\/\d+/,
      mine: (v) => { const id = xgId(v); return id ? `https://www.douyin.com/video/${id}` : ""; } },
    { host: /(^|\.)(twitter|x)\.com$/, page: /\/status\/\d+/, link: /\/status\/\d+/ },
    { host: /(^|\.)threads\.(net|com)$/, page: /\/post\/[\w-]+/, link: /\/post\/[\w-]+/ },
    { host: /(^|\.)reddit\.com$/, page: /\/comments\//, link: /\/comments\// },
    { host: /(^|\.)linkedin\.com$/, page: /\/(feed\/update|posts|video)\//, link: /\/(feed\/update|posts|video)\// },
    { host: /(^|\.)pinterest\.[a-z.]+$/, page: /^\/pin\/\d+/, link: /^\/pin\/\d+/ },
    { host: /(^|\.)bsky\.app$/, page: /\/post\/\w+/, link: /\/post\/\w+/ },
    { host: /(^|\.)(vk\.com|vkvideo\.ru)$/, page: /\/video-?\d+_\d+/, link: /\/video-?\d+_\d+/ },
    { host: /(^|\.)bilibili\.com$/, page: /\/video\/(BV|av)/i, link: /\/video\/(BV|av)/i },
    { host: /(^|\.)rumble\.com$/, page: /^\/v[\w-]+/, link: /^\/v[\w-]+/ },
  ];
  const ruleFor = () => RULES.find((r) => r.host.test(location.hostname));
  const KNOWN_SITE = () => !!ruleFor();

  /** Turn an embedded-player frame URL into the public watch URL. */
  function embedToWatch(u) {
    let m = /(?:youtube(?:-nocookie)?\.com)\/embed\/([\w-]{11})/i.exec(u);
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
    m = /player\.vimeo\.com\/video\/(\d+)/i.exec(u);
    if (m) return `https://vimeo.com/${m[1]}`;
    m = /dailymotion\.com\/embed\/video\/(\w+)/i.exec(u);
    if (m) return `https://www.dailymotion.com/video/${m[1]}`;
    return "";
  }

  /** Find the permalink of the post/tile that contains this <video> (feeds, timelines, reels). */
  function permalinkFor(video, rule) {
    const test = (a) => { try { return rule.link.test(a.pathname + a.search); } catch { return false; } };
    let el = video;
    for (let depth = 0; el && depth < 18; depth++) {
      if (el.tagName === "BODY" || el.tagName === "HTML" || el.tagName === "MAIN") break; // too broad to belong to one video
      if (el.nodeType === 1) {
        if (el.tagName === "A" && el.href && test(el)) return el.href;
        if (depth > 0) {
          if (el.querySelectorAll("video").length > 1) break; // container holds several videos: too broad
          const links = [...el.querySelectorAll("a[href]")].filter(test);
          // Prefer the timestamp/permalink link (usually wraps <time> or sits in the header)
          const best = links.find((a) => a.querySelector("time")) || links[0];
          if (best) return best.href;
        }
      }
      el = el.parentElement || (el.getRootNode && el.getRootNode().host) || null;
    }
    return "";
  }

  const canonical = () => {
    const el = document.querySelector('link[rel="canonical"],meta[property="og:url"]');
    return abs(el && (el.href || el.content));
  };

  /**
   * Decide what to hand to the desktop app for this video.
   * kind: "post" (a page yt-dlp understands) | "direct" (a plain media file) | "page" (generic fallback) | "none" (could not tell)
   */
  function resolve(video) {
    if (!IS_TOP) {
      const w = embedToWatch(location.href);
      if (w) return { url: w, kind: "post" };
    }
    const rule = ruleFor();
    const src = video.currentSrc || video.src || "";
    if (rule) {
      const here = location.pathname + location.search;
      const onPage = rule.page.test(here);
      if (rule.preferPage && onPage) return { url: location.href, kind: "post" };
      const mined = rule.mine && rule.mine(video);
      if (mined) return { url: mined, kind: "post" };
      const link = permalinkFor(video, rule);
      if (link) return { url: link, kind: "post" };
      if (onPage) return { url: location.href, kind: "post" };
      const c = canonical();
      try { if (c && rule.page.test(new URL(c).pathname + new URL(c).search)) return { url: c, kind: "post" }; } catch { /* ignore */ }
      if (isHttp(src)) return { url: src, kind: "direct" };
      return { url: "", kind: "none" }; // blob/MSE player in a feed: the service worker looks at network requests
    }
    if (isHttp(src)) return { url: src, kind: "direct" };
    return { url: IS_TOP ? location.href : "", kind: IS_TOP ? "page" : "none" };
  }
  const urlFor = (v) => resolve(v).url;

  function ogImage() {
    const m = document.querySelector('meta[property="og:image"],meta[name="twitter:image"],meta[property="og:image:url"]');
    return abs(m && m.content);
  }

  // ------------------------------------------------------------------ thumbnails
  /** Grab the current frame as a small JPEG. Fails quietly for cross-origin/DRM video. */
  function grab(v) {
    try {
      if (v.readyState < 2 || !v.videoWidth || !v.videoHeight) return "";
      const c = document.createElement("canvas");
      c.width = Math.min(320, v.videoWidth);
      c.height = Math.max(1, Math.round((c.width * v.videoHeight) / v.videoWidth));
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(v, 0, 0, c.width, c.height);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, n = 0;
      for (let i = 0; i < px.length; i += 160) { sum += px[i] + px[i + 1] + px[i + 2]; n += 3; }
      if (sum / n < 10) return ""; // black frame: keep waiting for a better one
      return c.toDataURL("image/jpeg", 0.72);
    } catch {
      return "";
    }
  }

  const thumbs = new WeakMap(); // video -> { data, at }
  function snap(v, force) {
    const old = thumbs.get(v);
    if (old && !force && Date.now() - old.at < 10000) return;
    const data = grab(v);
    if (data) { thumbs.set(v, { data, at: Date.now() }); scheduleReport(); }
  }
  const thumbOf = (v) => abs(v.poster) || (thumbs.get(v) && thumbs.get(v).data) || "";

  // ------------------------------------------------------------------ video discovery
  const known = new Set();
  function collect(root, out) {
    root.querySelectorAll("video").forEach((v) => out.add(v));
    for (const el of root.querySelectorAll("*")) if (el.shadowRoot) collect(el.shadowRoot, out);
  }
  let lastDeep = 0;
  function scan(deep) {
    const found = new Set();
    document.querySelectorAll("video").forEach((v) => found.add(v));
    if (deep || Date.now() - lastDeep > 4000) { lastDeep = Date.now(); collect(document, found); }
    let changed = false;
    for (const v of found) if (!known.has(v)) { known.add(v); changed = true; watch(v); }
    for (const v of [...known]) if (!v.isConnected) { known.delete(v); changed = true; }
    if (changed) scheduleReport();
  }
  function watch(v) {
    const grabSoon = (ms) => setTimeout(() => snap(v), ms);
    v.addEventListener("loadeddata", () => grabSoon(350), { passive: true });
    v.addEventListener("playing", () => grabSoon(900), { passive: true });
    v.addEventListener("seeked", () => grabSoon(250), { passive: true });
    v.addEventListener("durationchange", scheduleReport, { passive: true });
    if (v.readyState >= 2) grabSoon(500);
  }
  let scanTimer = 0;
  const scheduleScan = () => { clearTimeout(scanTimer); scanTimer = setTimeout(() => scan(false), 700); };

  // ------------------------------------------------------------------ report metadata to the service worker
  let reportTimer = 0, lastSig = "";
  function scheduleReport() { clearTimeout(reportTimer); reportTimer = setTimeout(report, 900); }
  function report() {
    if (!alive()) return;
    const videos = [...known].filter((v) => v.isConnected).slice(0, 8).map((v) => {
      const r = v.getBoundingClientRect();
      return {
        srcs: [v.currentSrc, v.src].filter(Boolean),
        thumb: thumbOf(v),
        duration: isFinite(v.duration) ? v.duration : 0,
        w: Math.round(r.width), h: Math.round(r.height),
        playing: !v.paused && !v.ended,
        pageUrl: urlFor(v),
      };
    });
    const top = IS_TOP ? { title: document.title, og: ogImage(), url: location.href } : null;
    const sig = JSON.stringify([top, videos.map((v) => [v.srcs, v.thumb.length, v.duration | 0, v.playing, v.pageUrl])]);
    if (sig === lastSig) return;
    lastSig = sig;
    chrome.runtime.sendMessage({ type: "meta", top, videos }).catch(() => undefined);
  }
  addEventListener("pagehide", () => { lastSig = ""; });

  // ------------------------------------------------------------------ the button
  const NS = "http://www.w3.org/2000/svg";
  function svg(shapes, size = 22) {
    const s = document.createElementNS(NS, "svg");
    for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, v);
    for (const [tag, attrs] of shapes) {
      const e = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      s.appendChild(e);
    }
    return s;
  }
  const ICONS = {
    download: [["path", { d: "M12 15V3" }], ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }], ["path", { d: "m7 10 5 5 5-5" }]],
    spin: [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }]],
    check: [["path", { d: "M20 6 9 17l-5-5" }]],
    alert: [["circle", { cx: 12, cy: 12, r: 10 }], ["line", { x1: 12, x2: 12, y1: 8, y2: 12 }], ["line", { x1: 12, x2: 12.01, y1: 16, y2: 16 }]],
  };

  const CSS = `
:host { all: initial; }
.pos { position: fixed; left: 0; top: 0; width: 44px; height: 44px; z-index: 2147483647; pointer-events: none; will-change: transform; }
button { all: unset; box-sizing: border-box; position: relative; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; cursor: pointer;
  background: var(--bg, #415f91); color: var(--fg, #fff); opacity: 0; transform: scale(.55) rotate(-24deg); pointer-events: none;
  box-shadow: 0 1px 3px rgb(0 0 0 / .4), 0 8px 22px rgb(0 0 0 / .32);
  transition: opacity .16s ease, transform .42s cubic-bezier(.34, 1.56, .64, 1), border-radius .42s cubic-bezier(.34, 1.56, .64, 1), background .2s, color .2s, box-shadow .2s; }
.show button { opacity: 1; transform: none; pointer-events: auto; }
button:hover { border-radius: 15px; box-shadow: 0 2px 4px rgb(0 0 0 / .4), 0 12px 28px rgb(0 0 0 / .4); }
button:active { transform: scale(.9); border-radius: 12px; }
button:focus-visible { outline: 3px solid var(--bg, #415f91); outline-offset: 3px; }
button svg { display: block; grid-area: 1 / 1; transition: transform .35s cubic-bezier(.34, 1.56, .64, 1); }
button:hover svg { transform: translateY(1px) scale(1.06); }
.busy svg { animation: spin .8s linear infinite; }
.ok { background: #2e7d32; color: #fff; animation: pop .5s cubic-bezier(.34, 1.56, .64, 1); }
.err { background: #ba1a1a; color: #fff; animation: shake .45s ease; }
.tip { position: absolute; top: 50%; padding: 7px 12px; border-radius: 10px; font: 600 12.5px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; white-space: nowrap;
  background: #2e3036; color: #f0f0f7; box-shadow: 0 4px 14px rgb(0 0 0 / .35); opacity: 0; pointer-events: none; transition: opacity .15s, transform .25s cubic-bezier(.2, 0, 0, 1); }
.right .tip { right: 54px; transform: translate(6px, -50%); }
.left .tip { left: 54px; transform: translate(-6px, -50%); }
.show:hover .tip, .show.flash .tip { opacity: 1; transform: translate(0, -50%); }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pop { 0% { transform: scale(.8); } 60% { transform: scale(1.14); } 100% { transform: none; } }
@keyframes shake { 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
@media (prefers-reduced-motion: reduce) { button, button svg, .tip { transition: opacity .1s; animation: none !important; } }
`;

  const host = document.createElement("mvd-button");
  host.style.cssText = "all:initial;position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS;
  const pos = document.createElement("div");
  pos.className = "pos right";
  const btn = document.createElement("button");
  btn.type = "button";
  const tip = document.createElement("div");
  tip.className = "tip";
  pos.append(btn, tip);
  root.append(style, pos);
  const mount = (parent) => { if (host.parentNode !== parent) parent.appendChild(host); };
  const setIcon = (name) => btn.replaceChildren(svg(ICONS[name]));
  setIcon("download");

  function paint() {
    const dark = prefs.theme === "dark" || (prefs.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    const a = prefs.accent && prefs.accent[dark ? "dark" : "light"];
    pos.style.setProperty("--bg", (a && a.bg) || "#415f91");
    pos.style.setProperty("--fg", (a && a.fg) || "#ffffff");
    pos.classList.toggle("left", prefs.floatPos === "left");
    pos.classList.toggle("right", prefs.floatPos !== "left");
    btn.setAttribute("aria-label", tr("tip"));
    if (!btn.dataset.state) tip.textContent = tr("tip");
  }
  paint();

  let target = null; // video the button currently belongs to
  let visible = false;
  let lastMove = 0;
  let px = -1, py = -1;
  let overBtn = false;
  let raf = 0;
  let busy = false;

  function eligible(v) {
    if (!v.isConnected) return null;
    const r = v.getBoundingClientRect();
    if (r.width < MIN_W || r.height < MIN_H) return null;
    const iw = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
    const ih = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    if (iw < MIN_W * 0.7 || ih < MIN_H * 0.7) return null;
    const cs = getComputedStyle(v);
    if (cs.visibility === "hidden" || cs.display === "none") return null;
    // Decorative background loops (muted, looping, no controls, short) are not downloads, except on known sites.
    if (!KNOWN_SITE() && v.loop && v.muted && !v.controls && (!isFinite(v.duration) || v.duration < 20)) return null;
    return r;
  }

  function pick() {
    let best = null, bestArea = Infinity;
    for (const v of known) {
      const r = eligible(v);
      if (!r) continue;
      if (px < r.left || px > r.right || py < r.top || py > r.bottom) continue;
      const area = r.width * r.height;
      if (area < bestArea) { best = v; bestArea = area; }
    }
    return best;
  }

  function place() {
    if (!target) return;
    const r = eligible(target);
    if (!r) return hide(true);
    const m = 12;
    let x = prefs.floatPos === "left" ? Math.max(r.left, 0) + m : Math.min(r.right, innerWidth) - 44 - m;
    let y = Math.max(r.top, 0) + m;
    x = Math.max(6, Math.min(innerWidth - 50, x));
    y = Math.max(6, Math.min(innerHeight - 50, y));
    pos.style.transform = `translate(${x}px, ${y}px)`;
  }

  function frame() {
    raf = 0;
    if (!visible) return;
    place();
    if (!visible) return;
    if (!overBtn && !busy) {
      const idle = Date.now() - lastMove;
      const r = target && target.getBoundingClientRect();
      const inside = r && px >= r.left - 8 && px <= r.right + 8 && py >= r.top - 8 && py <= r.bottom + 8;
      if (idle > IDLE_MS || (!inside && idle > 450)) return hide(false);
    }
    raf = requestAnimationFrame(frame);
  }

  function resetState() {
    btn.className = "";
    delete btn.dataset.state;
    pos.classList.remove("flash");
    setIcon("download");
    tip.textContent = tr("tip");
  }

  function show(v) {
    if (!prefs.floatBtn || !alive()) return;
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs && fs.tagName === "VIDEO") return; // cannot draw over a fullscreen <video> element itself
    mount(fs || document.documentElement);
    if (target !== v) { target = v; if (!busy) resetState(); snap(v, false); }
    place();
    if (!visible) {
      visible = true;
      pos.classList.add("show");
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function hide(now) {
    if (!visible) return;
    if (!now && (overBtn || busy)) return;
    visible = false;
    pos.classList.remove("show");
    target = null;
  }

  function evaluate() {
    const v = pick();
    if (v) show(v);
    else if (visible && !overBtn && Date.now() - lastMove > 400) hide(false);
  }

  let moveRaf = 0;
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    px = e.clientX; py = e.clientY; lastMove = Date.now();
    if (!prefs.floatBtn || moveRaf) return;
    moveRaf = requestAnimationFrame(() => { moveRaf = 0; evaluate(); });
  }, { passive: true, capture: true });
  document.addEventListener("mouseleave", () => setTimeout(() => hide(false), 350), { passive: true });
  addEventListener("blur", () => setTimeout(() => hide(false), 350));
  const fsChange = () => { hide(true); };
  document.addEventListener("fullscreenchange", fsChange);
  document.addEventListener("webkitfullscreenchange", fsChange);

  btn.addEventListener("pointerenter", () => { overBtn = true; lastMove = Date.now(); });
  btn.addEventListener("pointerleave", () => { overBtn = false; lastMove = Date.now(); });
  for (const type of ["pointerdown", "mousedown", "mouseup", "dblclick", "contextmenu"]) btn.addEventListener(type, (e) => e.stopPropagation());

  function flash(state, label) {
    btn.className = state;
    btn.dataset.state = state;
    setIcon(state === "ok" ? "check" : "alert");
    tip.textContent = label;
    pos.classList.add("flash");
    setTimeout(resetState, 2200);
  }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!target || busy) return;
    const v = target;
    busy = true;
    btn.className = "busy";
    setIcon("spin");
    snap(v, true);
    try {
      const r = resolve(v);
      const res = await chrome.runtime.sendMessage({
        type: "send",
        fallback: true,
        url: r.url,
        unresolved: r.kind === "none",
        srcs: [v.currentSrc, v.src].filter(Boolean),
        frameUrl: location.href,
        title: document.title,
        pageUrl: IS_TOP ? location.href : "",
        thumbnail: thumbOf(v) || (IS_TOP ? ogImage() : ""),
      });
      busy = false;
      const good = res && (res.ok || res.fallback);
      flash(good ? "ok" : "err", good ? tr("ok") : tr(res && res.reason === "unresolved" ? "unres" : "err"));
    } catch {
      busy = false;
      flash("err", tr("err"));
    }
  });

  // ------------------------------------------------------------------ start (after every binding exists)
  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => document.visibilityState === "visible" && scan(true), 5000);
  scan(true);
  if (IS_TOP) setTimeout(scheduleReport, 1200);
})();
