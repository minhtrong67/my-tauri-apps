"use strict";

const T = window.__TAURI__;
const invoke = T ? T.core.invoke : async () => { throw "@no_tauri"; };
const listen = T ? T.event.listen : async () => () => {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const IS_WINDOWS = /Windows/i.test(navigator.userAgent);
const APP_VERSION_FALLBACK = "0.4.0";

/* ───────────────────────── Hằng số & cài đặt ───────────────────────── */
const QUALITY_IDS = ["best", "320", "256", "192", "128"];
const MODES = [["auto", "monitor"], ["light", "sun"], ["dark", "moon"]];
const LANGS = ["auto", "en", "vi"];
const FONTS = [
  { id: "system", key: "font.system", stack: 'system-ui, -apple-system, "Segoe UI Variable Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif' },
  { id: "roboto", name: "Roboto" },
  { id: "inter", name: "Inter" },
  { id: "opensans", name: "Open Sans" },
  { id: "bevietnam", name: "Be Vietnam Pro" },
  { id: "nunito", name: "Nunito" },
  { id: "serif", key: "font.serif", stack: 'Georgia, "Times New Roman", serif' },
  { id: "mono", key: "font.mono", stack: '"Cascadia Mono", Consolas, "SF Mono", Menlo, monospace' },
];
// Bảng màu 500 của Material Design
const PRESETS = [
  ["#F44336", "red"], ["#E91E63", "pink"], ["#9C27B0", "purple"], ["#673AB7", "deepPurple"],
  ["#3F51B5", "indigo"], ["#2196F3", "blue"], ["#00BCD4", "cyan"], ["#009688", "teal"],
  ["#4CAF50", "green"], ["#8BC34A", "lightGreen"], ["#CDDC39", "lime"], ["#FFC107", "amber"],
  ["#FF9800", "orange"], ["#FF5722", "deepOrange"], ["#795548", "brown"], ["#607D8B", "blueGrey"],
];

const DEFAULTS = { seed: "#8BC34A", mode: "auto", lang: "auto", font: "roboto", quality: "best", outDir: "", crop: true };
const SETTINGS_VER = 4;
const S = { ...DEFAULTS };
try { Object.assign(S, JSON.parse(localStorage.getItem("mp3dl.settings") || "{}")); } catch {}
// v3: thư mục lưu mặc định là Downloads → bỏ các đường dẫn mặc định cũ
if ((S.ver || 0) < 3 && (!S.outDir || /[\\/](Music|Downloads)[\\/]MP3 Downloader$/i.test(S.outDir))) S.outDir = "";
// v4: màu mặc định mới (xanh lá mạ, trùng icon app)
if ((S.ver || 0) < 4 && String(S.seed).toUpperCase() === "#6750A4") S.seed = DEFAULTS.seed;
S.ver = SETTINGS_VER;
// Kiểm tra giá trị đã lưu
if (!/^#[0-9a-f]{6}$/i.test(S.seed)) S.seed = DEFAULTS.seed;
if (!MODES.some(([m]) => m === S.mode)) S.mode = DEFAULTS.mode;
if (!LANGS.includes(S.lang)) S.lang = DEFAULTS.lang;
if (!FONTS.some((f) => f.id === S.font)) S.font = DEFAULTS.font;
if (!QUALITY_IDS.includes(S.quality)) S.quality = DEFAULTS.quality;
S.crop = !!S.crop;
const save = () => { try { localStorage.setItem("mp3dl.settings", JSON.stringify(S)); } catch {} };

/* ───────────────────────── Ngôn ngữ ───────────────────────── */
let LANG = "en";
function detectLang() {
  const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
  for (const l of list) {
    const c = String(l).toLowerCase();
    if (c.startsWith("vi")) return "vi";
    if (c.startsWith("en")) return "en";
  }
  return "en";
}
const resolveLang = () => (S.lang === "auto" ? detectLang() : S.lang);
function t(key, params) {
  const s = window.I18N[LANG][key] ?? window.I18N.en[key] ?? key;
  return params ? s.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : "")) : s;
}
/** Dịch thông báo từ backend: "@ma" hoặc "@ma|chi_tiet" → chuỗi theo ngôn ngữ hiện tại; chuỗi thường giữ nguyên. */
function tr(msg) {
  msg = String(msg ?? "");
  if (msg[0] !== "@") return msg;
  const i = msg.indexOf("|");
  const code = i < 0 ? msg.slice(1) : msg.slice(1, i);
  const detail = i < 0 ? "" : msg.slice(i + 1);
  const s = window.I18N[LANG]["e." + code] ?? window.I18N.en["e." + code];
  return s ? s.replace("{d}", detail) : detail || code;
}

/* ───────────────────────── Chủ đề Material 3 & phông chữ ───────────────────────── */
const kebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
const darkQuery = matchMedia("(prefers-color-scheme: dark)");

function applyTheme() {
  const { themeFromSourceColor, argbFromHex, hexFromArgb } = window.MCU;
  const theme = themeFromSourceColor(argbFromHex(S.seed));
  const dark = S.mode === "dark" || (S.mode === "auto" && darkQuery.matches);
  const scheme = (dark ? theme.schemes.dark : theme.schemes.light).toJSON();
  const root = document.documentElement;
  for (const [k, v] of Object.entries(scheme)) root.style.setProperty("--md-" + kebab(k), hexFromArgb(v));
  const n = theme.palettes.neutral;
  const tones = dark
    ? { lowest: 6, low: 12, base: 17, high: 22, highest: 27 }
    : { lowest: 100, low: 97, base: 95, high: 93, highest: 91 };
  root.style.setProperty("--md-surface-container-lowest", hexFromArgb(n.tone(tones.lowest)));
  root.style.setProperty("--md-surface-container-low", hexFromArgb(n.tone(tones.low)));
  root.style.setProperty("--md-surface-container", hexFromArgb(n.tone(tones.base)));
  root.style.setProperty("--md-surface-container-high", hexFromArgb(n.tone(tones.high)));
  root.style.setProperty("--md-surface-container-highest", hexFromArgb(n.tone(tones.highest)));
  root.dataset.scheme = dark ? "dark" : "light";
}
darkQuery.addEventListener("change", () => S.mode === "auto" && applyTheme());

const fontStack = (f) => f.stack || `"${f.name}", system-ui, "Segoe UI", Arial, sans-serif`;
function applyFont() {
  const f = FONTS.find((x) => x.id === S.font) || FONTS[1];
  document.documentElement.style.setProperty("--font", fontStack(f));
}

/** Màu chữ/icon dễ đọc trên nền `hex` (đen hoặc trắng). */
function onColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.179 ? "#1b1b1f" : "#ffffff";
}

/* ───────────────────────── Tiện ích UI ───────────────────────── */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const SVGNS = "http://www.w3.org/2000/svg";
function icon(id) {
  const s = document.createElementNS(SVGNS, "svg");
  s.setAttribute("class", "icon");
  const u = document.createElementNS(SVGNS, "use");
  u.setAttribute("href", "#i-" + id);
  s.appendChild(u);
  return s;
}
let toastTimer;
function toast(msg, action) {
  const sb = $("#snackbar");
  $("#snack-text").textContent = msg;
  const ab = $("#snack-action");
  if (action) {
    ab.hidden = false;
    ab.textContent = action.label;
    ab.onclick = () => { action.fn(); sb.classList.remove("show"); };
  } else { ab.hidden = true; ab.onclick = null; }
  sb.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => sb.classList.remove("show"), action ? 7000 : 4500);
}
const debounce = (fn, ms) => { let tm; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); }; };
const fmtTime = (s) => (s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "");
const baseName = (p) => (p || "").split(/[\\/]/).pop();

/** Nhóm lựa chọn (radiogroup) dùng cho chip / segmented. Cập nhật tại chỗ (không dựng lại) để hiệu ứng chuyển mượt. */
function renderChoice(container, options, value, onPick, cls, { check = false } = {}) {
  container.replaceChildren();
  const btns = [];
  const sync = (v) => btns.forEach(([b, o]) => {
    const on = o.v === v;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  for (const o of options) {
    const b = el("button", cls);
    b.type = "button";
    b.setAttribute("role", "radio");
    if (o.icon) b.appendChild(icon(o.icon));
    else if (check) b.appendChild(icon("check"));
    b.appendChild(el("span", "", o.label));
    if (o.font) b.style.fontFamily = o.font;
    b.addEventListener("click", () => { sync(o.v); onPick(o.v); });
    container.appendChild(b);
    btns.push([b, o]);
  }
  container.onkeydown = (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    const i = btns.findIndex(([b]) => b === document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    const nb = btns[(i + (fwd ? 1 : btns.length - 1)) % btns.length][0];
    nb.focus();
    nb.click();
  };
  sync(value);
  return { set: sync };
}

/** Thẻ lựa chọn lớn (radio) có icon + tiêu đề + mô tả. */
function renderOptions(container, options, value, onPick) {
  container.replaceChildren();
  const btns = [];
  const sync = (v) => btns.forEach(([b, o]) => {
    const on = o.v === v;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  for (const o of options) {
    const b = el("button", "opt");
    b.type = "button";
    b.setAttribute("role", "radio");
    const ic = el("span", "opt-icon");
    ic.appendChild(icon(o.icon));
    const tx = el("span", "opt-text");
    tx.append(el("span", "title-medium", o.title), el("span", "body-small muted", o.desc));
    const radio = el("span", "radio");
    b.append(ic, tx, radio);
    b.addEventListener("click", () => { sync(o.v); onPick(o.v); });
    container.appendChild(b);
    btns.push([b, o]);
  }
  container.onkeydown = (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    const i = btns.findIndex(([b]) => b === document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    const nb = btns[(i + (fwd ? 1 : btns.length - 1)) % btns.length][0];
    nb.focus();
    nb.click();
  };
  sync(value);
}

/* Hiệu ứng gợn sóng (ripple) cho nút, chip, thẻ chọn */
document.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  let host = e.target.closest(".btn, .chip, .icon-btn, .seg button, .opt, .rail-item");
  if (!host || host.disabled) return;
  if (host.classList.contains("rail-item")) host = $(".rail-indicator", host);
  const r = host.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const rp = el("span", "ripple");
  rp.style.width = rp.style.height = size + "px";
  rp.style.left = e.clientX - r.left - size / 2 + "px";
  rp.style.top = e.clientY - r.top - size / 2 + "px";
  host.appendChild(rp);
  rp.addEventListener("animationend", () => rp.remove());
}, { passive: true });

/* ───────────────────────── Điều hướng ───────────────────────── */
function showPage(name) {
  $$(".rail-item[data-page]").forEach((b) => {
    const on = b.dataset.page === name;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  $$(".page").forEach((p) => p.classList.toggle("active", p.id === "page-" + name));
  $("#main").scrollTop = 0;
}
$$(".rail-item[data-page]").forEach((btn) => btn.addEventListener("click", () => showPage(btn.dataset.page)));

/* ───────────────────────── Hộp thoại giới thiệu ───────────────────────── */
let dialogOpener = null;
let closeTimer;
function openAbout() {
  const sc = $("#about-scrim");
  clearTimeout(closeTimer);
  dialogOpener = document.activeElement;
  sc.hidden = false;
  void sc.offsetWidth; // ép trình duyệt tính style trước để hiệu ứng chạy
  sc.classList.add("open");
  $("#about-close").focus({ preventScroll: true });
}
function closeAbout() {
  const sc = $("#about-scrim");
  if (sc.hidden) return;
  sc.classList.remove("open");
  closeTimer = setTimeout(() => {
    sc.hidden = true;
    if (dialogOpener && dialogOpener.focus) dialogOpener.focus({ preventScroll: true });
  }, 220);
}
$("#about-btn").addEventListener("click", openAbout);
$("#about-close").addEventListener("click", closeAbout);
$("#about-scrim").addEventListener("pointerdown", (e) => { if (e.target === e.currentTarget) closeAbout(); });
document.addEventListener("keydown", (e) => {
  const open = !$("#about-scrim").hidden;
  if (e.key === "Escape" && open) closeAbout();
  if (e.key === "Tab" && open) { e.preventDefault(); $("#about-close").focus(); } // hộp thoại chỉ có 1 nút
});

/* ───────────────────────── Trang tải về ───────────────────────── */
let quality = S.quality;
let currentInfo = null;
let previewToken = 0;
let previewMsg = null; // () => string cho trạng thái "đang đọc / nhiều link / lỗi"
let qualityChips = null;

const input = $("#url-input");
const dlBtn = $("#download-btn");
const preview = $("#preview");

const qualityLabel = (q) => (q === "best" ? t("q.best") : q + " kbps");
const qualityOptions = () => QUALITY_IDS.map((q) => ({ v: q, label: qualityLabel(q) }));

// Bắt link http(s), bỏ dấu câu thừa ở cuối, loại trùng
function urlsIn(text) {
  const found = (text.match(/https?:\/\/[^\s"'<>]+/g) || []).map((u) => u.replace(/[.,;:!?)\]}]+$/, ""));
  return [...new Set(found)];
}
const sourceName = (s) => ({ youtube: "YouTube", tiktok: "TikTok", spotify: "Spotify" }[s] || t("src.other"));

function artBox(url, cls = "art") {
  const a = el("div", cls);
  if (url) a.style.backgroundImage = `url("${url.replace(/"/g, "%22")}")`;
  else a.appendChild(icon("music"));
  return a;
}

function showPreview(info) {
  currentInfo = info;
  previewMsg = null;
  preview.className = "preview";
  preview.hidden = false;
  preview.replaceChildren();
  const body = el("div", "preview-body");
  body.appendChild(el("div", "preview-title", info.title || t("pv.untitled")));
  if (info.artist) body.appendChild(el("div", "body-medium muted", info.artist));
  const tags = el("div", "tags");
  tags.appendChild(el("span", "tag source", sourceName(info.source)));
  if (info.album) tags.appendChild(el("span", "tag", t("pv.album", { v: info.album })));
  if (info.year) tags.appendChild(el("span", "tag", info.year));
  if (info.duration) tags.appendChild(el("span", "tag", fmtTime(info.duration)));
  body.appendChild(tags);
  if (info.source === "spotify") body.appendChild(el("p", "body-small preview-note", t("pv.spotify")));
  preview.append(artBox(info.thumbnail), body);
}

function showPreviewMessage(kind, getText) {
  currentInfo = null;
  previewMsg = { kind, getText };
  preview.className = "preview " + kind;
  preview.hidden = false;
  preview.replaceChildren();
  if (kind === "loading") preview.appendChild(el("span", "spinner"));
  else preview.appendChild(icon("circle-alert"));
  preview.appendChild(el("span", "body-medium", getText()));
}

async function onUrlChange() {
  const urls = urlsIn(input.value);
  dlBtn.disabled = urls.length === 0;
  const token = ++previewToken;
  if (urls.length === 0) { preview.hidden = true; currentInfo = null; previewMsg = null; return; }
  if (urls.length > 1) { showPreviewMessage("loading", () => t("pv.multi", { n: urls.length })); return; }
  showPreviewMessage("loading", () => t("pv.reading"));
  try {
    const info = await invoke("fetch_info", { url: urls[0] });
    if (token === previewToken) showPreview(info);
  } catch (e) {
    if (token === previewToken) showPreviewMessage("error", () => tr(e));
  }
}
const debouncedUrl = debounce(onUrlChange, 450);
input.addEventListener("input", () => { dlBtn.disabled = urlsIn(input.value).length === 0; debouncedUrl(); });
input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !dlBtn.disabled) dlBtn.click(); });

$("#paste-btn").addEventListener("click", async () => {
  let text = "";
  try { text = await invoke("read_clipboard"); }                      // đọc clipboard hệ thống qua Rust
  catch { try { text = await navigator.clipboard.readText(); } catch {} }
  text = (text || "").trim();
  if (!text) { toast(t("toast.pasteEmpty")); return; }
  input.value = text;
  input.dispatchEvent(new Event("input"));
  input.focus();
});

/* ───────────────────────── Hàng đợi ───────────────────────── */
const MAX_PARALLEL = 2;
const items = new Map();   // id -> item (thứ tự chèn = cũ nhất trước)
const jobMap = new Map();  // jobId (mỗi lần chạy) -> item.id, để bỏ qua sự kiện của lần chạy đã huỷ
const ACTIVE = new Set(["downloading", "converting", "tagging"]);
const FINISHED = new Set(["done", "error", "cancelled"]);

function addItem(url, info) {
  const id = crypto.randomUUID();
  const item = { id, jobId: null, url, info, quality, stage: "queued", percent: 0, speed: "", eta: "", message: "", file: null };
  items.set(id, item);
  const row = el("div", "item");
  row.dataset.id = id;
  $("#queue").prepend(row);
  buildRow(item, row);
  refreshQueueChrome();
  return item;
}

function buildRow(item, row) {
  const body = el("div", "item-body");
  const prog = el("div", "progress");
  prog.appendChild(el("span"));
  body.append(el("div", "item-title"), el("div", "item-sub body-medium"), prog);
  row.replaceChildren(artBox(item.info && item.info.thumbnail, "art sm"), body, el("div", "item-actions"));
  row.dataset.stage = "";
  updateRow(item);
}

function actionBtn(act, ic, label) {
  const b = el("button", "icon-btn");
  b.type = "button";
  b.dataset.act = act;
  b.title = label;
  b.setAttribute("aria-label", label);
  b.appendChild(icon(ic));
  return b;
}

const rowOf = (item) => $(`.item[data-id="${item.id}"]`);

function updateRow(item) {
  const row = rowOf(item);
  if (!row) return;
  row.className = "item " + item.stage;
  $(".item-title", row).textContent = (item.info && item.info.title) || (item.file ? baseName(item.file) : item.url);

  let sub = "";
  switch (item.stage) {
    case "queued": sub = t("st.queued"); break;
    case "downloading": {
      const parts = [];
      if (item.percent > 0) parts.push(item.percent.toFixed(0) + "%");
      if (item.speed && !/unknown/i.test(item.speed)) parts.push(item.speed);
      if (item.eta && !/unknown/i.test(item.eta)) parts.push(t("st.eta", { eta: item.eta }));
      sub = parts.length ? parts.join(" · ") : tr(item.message) || t("st.starting");
      break;
    }
    case "converting": sub = t("st.converting"); break;
    case "tagging": sub = tr(item.message); break;
    case "done": {
      const w = tr(item.message);
      sub = (item.info && item.info.artist ? item.info.artist + " · " : "") + t("st.saved", { file: baseName(item.file) }) + (w ? " · " + w : "");
      break;
    }
    case "error": sub = tr(item.message); break;
    case "cancelled": sub = t("st.cancelled"); break;
  }
  $(".item-sub", row).textContent = sub;

  const prog = $(".progress", row);
  prog.classList.toggle("indeterminate", item.stage === "converting" || item.stage === "tagging" || (item.stage === "downloading" && item.percent === 0));
  $("span", prog).style.width = item.stage === "downloading" && item.percent > 0 ? item.percent + "%" : "";

  if (row.dataset.stage !== item.stage) {
    row.dataset.stage = item.stage;
    const acts = $(".item-actions", row);
    acts.replaceChildren();
    if (item.stage === "done") acts.append(actionBtn("reveal", "folder-open", t("act.reveal")), actionBtn("remove", "x", t("act.remove")));
    else if (item.stage === "error" || item.stage === "cancelled") acts.append(actionBtn("retry", "rotate-ccw", t("act.retry")), actionBtn("remove", "x", t("act.remove")));
    else acts.append(actionBtn("cancel", "x", t("act.cancel")));
  }
}

function refreshQueueChrome() {
  $("#queue-empty").hidden = items.size > 0;
  $("#clear-done").hidden = ![...items.values()].some((i) => FINISHED.has(i.stage));
}

function pump() {
  let running = [...items.values()].filter((i) => ACTIVE.has(i.stage)).length;
  const queued = [...items.values()].filter((i) => i.stage === "queued"); // cũ nhất trước
  for (const item of queued) {
    if (running >= MAX_PARALLEL) break;
    running++;
    item.stage = "downloading";
    item.percent = 0;
    item.speed = "";
    item.eta = "";
    item.message = "@m_downloading";
    item.jobId = crypto.randomUUID();
    jobMap.set(item.jobId, item.id);
    updateRow(item);
    invoke("start_download", {
      req: { id: item.jobId, url: item.url, out_dir: S.outDir, quality: item.quality, crop_thumb: S.crop, info: item.info || null },
    }).catch((e) => { item.stage = "error"; item.message = String(e); updateRow(item); refreshQueueChrome(); pump(); });
  }
}

listen("download-progress", ({ payload: p }) => {
  const terminal = FINISHED.has(p.stage);
  const item = items.get(jobMap.get(p.id));
  if (terminal) jobMap.delete(p.id);
  if (!item || item.jobId !== p.id || item.stage === "cancelled") return;
  item.stage = p.stage;
  item.percent = p.percent;
  item.speed = p.speed;
  item.eta = p.eta;
  item.message = p.message;
  if (p.file) item.file = p.file;
  updateRow(item);
  if (p.stage === "done" && p.file) {
    toast(t("toast.done", { name: baseName(p.file).replace(/\.mp3$/i, "") }), {
      label: t("toast.show"),
      fn: () => invoke("reveal_file", { path: p.file }).catch((err) => toast(tr(err))),
    });
  }
  if (terminal) { refreshQueueChrome(); pump(); }
});

$("#queue").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const row = btn.closest(".item");
  const item = items.get(row.dataset.id);
  if (!item) return;
  switch (btn.dataset.act) {
    case "cancel": {
      const wasQueued = item.stage === "queued";
      const jobId = item.jobId;
      item.stage = "cancelled";
      item.message = "";
      updateRow(item);
      refreshQueueChrome();
      if (!wasQueued) { invoke("cancel_download", { id: jobId }).catch(() => {}); pump(); } // huỷ ngay trên UI, backend dừng ở phía sau
      break;
    }
    case "reveal": invoke("reveal_file", { path: item.file }).catch((err) => toast(tr(err))); break;
    case "retry": item.stage = "queued"; item.percent = 0; item.message = ""; updateRow(item); refreshQueueChrome(); pump(); break;
    case "remove": items.delete(item.id); row.remove(); refreshQueueChrome(); break;
  }
});

$("#clear-done").addEventListener("click", () => {
  for (const [id, i] of [...items]) if (FINISHED.has(i.stage)) { items.delete(id); const r = $(`.item[data-id="${id}"]`); if (r) r.remove(); }
  refreshQueueChrome();
});

dlBtn.addEventListener("click", () => {
  const urls = urlsIn(input.value);
  if (!urls.length) return;
  if (tools && tools.ytdlp == null) { toast(t("toast.needYtdlp")); return; }
  if (tools && tools.ffmpeg == null) { toast(t("toast.needFfmpeg")); return; }
  for (const u of urls) addItem(u, urls.length === 1 && currentInfo && currentInfo.url === u ? currentInfo : null);
  input.value = "";
  previewToken++;
  preview.hidden = true;
  currentInfo = null;
  previewMsg = null;
  dlBtn.disabled = true;
  pump();
});

/* ───────────────────────── Trang cài đặt ───────────────────────── */
let swatchBox = null;
function setSeed(hex) {
  S.seed = hex.toUpperCase();
  save();
  applyTheme();
  renderSwatches();
  if (document.activeElement !== $("#hex-input")) $("#hex-input").value = S.seed;
}

function renderSwatches() {
  const box = $("#swatches");
  const hadFocus = box.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.hex : null;
  box.replaceChildren();
  let matched = false;
  for (const [hex, key] of PRESETS) {
    const sel = hex.toLowerCase() === S.seed.toLowerCase();
    matched ||= sel;
    const b = el("button", "swatch");
    b.type = "button";
    b.dataset.hex = hex;
    b.style.background = hex;
    b.style.color = onColor(hex);
    b.title = t("c." + key);
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", t("c." + key));
    b.setAttribute("aria-checked", String(sel));
    b.appendChild(icon("check"));
    b.addEventListener("click", () => setSeed(hex));
    box.appendChild(b);
  }
  const custom = el("label", "swatch custom");
  custom.title = t("set.custom");
  custom.setAttribute("aria-checked", String(!matched));
  if (!matched) { custom.style.background = S.seed; custom.style.color = onColor(S.seed); }
  custom.appendChild(icon(!matched ? "check" : "palette"));
  const picker = el("input");
  picker.type = "color";
  picker.value = S.seed.toLowerCase();
  picker.setAttribute("aria-label", t("set.custom"));
  picker.addEventListener("input", () => setSeed(picker.value));
  custom.appendChild(picker);
  box.appendChild(custom);
  if (hadFocus) { const f = $(`.swatch[data-hex="${hadFocus}"]`, box); if (f) f.focus(); }
}

$("#hex-input").addEventListener("input", (e) => {
  let v = e.target.value.trim();
  if (v && !v.startsWith("#")) v = "#" + v;
  const ok = /^#[0-9a-f]{6}$/i.test(v);
  e.target.parentElement.classList.toggle("invalid", !!e.target.value && !ok);
  if (ok) setSeed(v);
});
$("#hex-input").addEventListener("blur", (e) => { e.target.value = S.seed; e.target.parentElement.classList.remove("invalid"); });

$("#crop-switch").addEventListener("change", (e) => { S.crop = e.target.checked; save(); });

function showOutDir() { $("#out-dir").textContent = "\u200E" + S.outDir; }
$("#pick-dir").addEventListener("click", async () => {
  try {
    const dir = await T.dialog.open({ directory: true, multiple: false, defaultPath: S.outDir || undefined });
    if (dir) { S.outDir = dir; save(); showOutDir(); }
  } catch (e) { toast(tr(e)); }
});
$("#open-dir").addEventListener("click", () => invoke("open_folder", { path: S.outDir }).catch((e) => toast(tr(e))));

/* Cửa sổ khi mở app (do backend lưu & áp dụng) */
let winMode = "remember";
function renderWindowOpts() {
  renderOptions($("#window-opts"), [
    { v: "remember", icon: "move-diagonal-2", title: t("win.remember"), desc: t("win.rememberDesc") },
    { v: "maximized", icon: "maximize", title: t("win.maximized"), desc: t("win.maximizedDesc") },
  ], winMode, async (v) => {
    const prev = winMode;
    winMode = v;
    try { await invoke("set_window_mode", { mode: v }); }
    catch (e) { winMode = prev; renderWindowOpts(); toast(tr(e)); }
  });
}

function renderSettings() {
  renderChoice($("#mode-seg"), MODES.map(([m, ic]) => ({ v: m, icon: ic, label: t("mode." + m) })), S.mode,
    (v) => { S.mode = v; save(); applyTheme(); }, "");
  renderChoice($("#lang-seg"), LANGS.map((l) => ({ v: l, label: t("lang." + l) })), S.lang,
    (v) => { S.lang = v; save(); LANG = resolveLang(); applyLang(); }, "");
  renderChoice($("#font-chips"), FONTS.map((f) => ({ v: f.id, label: f.key ? t(f.key) : f.name, font: fontStack(f) })), S.font,
    (v) => { S.font = v; save(); applyFont(); }, "chip", { check: true });
  renderChoice($("#default-quality-chips"), qualityOptions(), S.quality,
    (v) => { S.quality = v; save(); quality = v; qualityChips.set(v); }, "chip", { check: true });
  renderSwatches();
  renderWindowOpts();
  $("#crop-switch").checked = S.crop;
  if (document.activeElement !== $("#hex-input")) $("#hex-input").value = S.seed;
  showOutDir();
}

/* ───────────────────────── Công cụ (yt-dlp, ffmpeg, Deno) ───────────────────────── */
let tools = null;          // { ytdlp, ffmpeg, deno } — null = chưa cài, chuỗi = phiên bản
let installing = false;
let bannerMode = "required";
const TOOL_IDS = ["ytdlp", "ffmpeg", "deno"];
const TOOL_LABEL = { ytdlp: "yt-dlp", ffmpeg: "ffmpeg", deno: "Deno" };
const INSTALL_CMD = { ytdlp: "install_ytdlp", ffmpeg: "install_ffmpeg", deno: "install_deno" };
const has = (v) => v != null;
const denoDismissed = () => { try { return sessionStorage.getItem("mp3dl.denoDismissed") === "1"; } catch { return false; } };

function renderTools() {
  for (const id of TOOL_IDS) {
    const row = $(`.tool[data-tool="${id}"]`);
    const status = $(".tool-status", row);
    const btn = $(".tool-btn", row);
    const label = $("span", btn);
    const ver = tools ? tools[id] : undefined;
    row.classList.toggle("ok", tools != null && has(ver));
    if (!tools) {
      status.textContent = t("tool.checking");
      btn.hidden = true;
      continue;
    }
    if (has(ver)) {
      status.textContent = ver ? t("tool.installed", { v: ver }) : t("tool.installedNoVer");
      btn.hidden = id !== "ytdlp";            // chỉ yt-dlp có nút "Cập nhật"
      label.textContent = t("tool.update");
    } else {
      status.textContent = id === "deno" ? t(IS_WINDOWS ? "tool.denoHint" : "tool.denoHintOther") : t("tool.missing");
      btn.hidden = false;
      label.textContent = t("tool.install");
    }
  }
}

function updateBanner() {
  const banner = $("#tools-banner");
  if (!tools) { banner.hidden = true; return; }
  const missing = [!has(tools.ytdlp) && "yt-dlp", !has(tools.ffmpeg) && "ffmpeg"].filter(Boolean);
  const install = $("#banner-install");
  const dismiss = $("#banner-dismiss");
  if (missing.length) {
    bannerMode = "required";
    banner.hidden = false;
    $("#banner-title").textContent = t("ban.missing", { list: missing.join(t("ban.and")) });
    const manual = !IS_WINDOWS && !has(tools.ffmpeg);
    $("#banner-desc").textContent = t(manual ? "ban.manual" : "ban.auto");
    $("#banner-install-label").textContent = t("ban.install");
    install.hidden = manual && has(tools.ytdlp);
    dismiss.hidden = true;
  } else if (!has(tools.deno) && IS_WINDOWS && !denoDismissed()) {
    bannerMode = "deno";
    banner.hidden = false;
    $("#banner-title").textContent = t("ban.denoTitle");
    $("#banner-desc").textContent = t("ban.denoDesc");
    $("#banner-install-label").textContent = t("ban.denoInstall");
    install.hidden = false;
    dismiss.hidden = false;
  } else {
    banner.hidden = true;
  }
}

async function refreshTools() {
  try { tools = await invoke("check_tools"); } catch { return; }
  renderTools();
  updateBanner();
}

listen("tool-progress", ({ payload: { tool, percent } }) => {
  const bars = [$(`.tool[data-tool="${tool}"] .tool-progress`), $("#banner-progress")].filter(Boolean);
  for (const bar of bars) {
    bar.hidden = false;
    bar.classList.toggle("indeterminate", percent >= 100);
    $("span", bar).style.width = percent + "%";
  }
});

async function installTool(tool) {
  try {
    await invoke(INSTALL_CMD[tool]);
    toast(t("toast.installed", { tool: TOOL_LABEL[tool] }));
  } catch (e) {
    toast(tr(e));
    return false;
  } finally {
    const bar = $(`.tool[data-tool="${tool}"] .tool-progress`);
    if (bar) bar.hidden = true;
    $("#banner-progress").hidden = true;
  }
  return true;
}

const INSTALL_BTNS = ".tool-btn, #banner-install";
async function runInstall(list) {
  if (installing) return;
  installing = true;
  $$(INSTALL_BTNS).forEach((b) => (b.disabled = true));
  for (const id of list) if (!(await installTool(id))) break;
  installing = false;
  $$(INSTALL_BTNS).forEach((b) => (b.disabled = false));
  refreshTools();
}
$$(".tool").forEach((row) => $(".tool-btn", row).addEventListener("click", () => runInstall([row.dataset.tool])));
$("#banner-install").addEventListener("click", () => {
  if (bannerMode === "deno") return runInstall(["deno"]);
  const list = [];
  if (!tools || !has(tools.ytdlp)) list.push("ytdlp");
  if ((!tools || !has(tools.ffmpeg)) && IS_WINDOWS) list.push("ffmpeg");
  if ((!tools || !has(tools.deno)) && IS_WINDOWS) list.push("deno");
  runInstall(list);
});
$("#banner-dismiss").addEventListener("click", () => {
  try { sessionStorage.setItem("mp3dl.denoDismissed", "1"); } catch {}
  $("#tools-banner").hidden = true;
});

/* ───────────────────────── Áp dụng ngôn ngữ cho toàn bộ giao diện ───────────────────────── */
let appVersion = APP_VERSION_FALLBACK;
function applyLang() {
  document.documentElement.lang = LANG;
  $$("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n); });
  $$("[data-i18n-title]").forEach((n) => { const s = t(n.dataset.i18nTitle); n.title = s; n.setAttribute("aria-label", s); });
  $$("[data-i18n-aria]").forEach((n) => n.setAttribute("aria-label", t(n.dataset.i18nAria)));
  $("#about-version").textContent = t("about.version", { v: appVersion });

  qualityChips = renderChoice($("#quality-chips"), qualityOptions(), quality, (v) => { quality = v; }, "chip", { check: true });
  renderSettings();
  renderTools();
  updateBanner();

  for (const item of items.values()) { const r = rowOf(item); if (r) { r.dataset.stage = ""; updateRow(item); } }
  if (currentInfo) showPreview(currentInfo);
  else if (previewMsg && !preview.hidden) showPreviewMessage(previewMsg.kind, previewMsg.getText);
}

/* ───────────────────────── Khởi động ───────────────────────── */
(function init() {
  LANG = resolveLang();
  applyTheme();
  applyFont();
  applyLang();
  refreshQueueChrome();

  // Hiện cửa sổ sau khi giao diện đã vẽ xong (tránh nháy trắng); backend cũng có bộ đếm giờ dự phòng.
  requestAnimationFrame(() => requestAnimationFrame(() => invoke("show_main").catch(() => {})));

  (async () => {
    try { winMode = await invoke("get_window_mode"); renderWindowOpts(); } catch {}
    try { if (!S.outDir) { S.outDir = await invoke("default_output_dir"); save(); } } catch {}
    showOutDir();
    refreshTools();
    try { appVersion = await T.app.getVersion(); $("#about-version").textContent = t("about.version", { v: appVersion }); } catch {}
  })();
})();
