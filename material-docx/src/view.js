// View layer: zoom, view modes, ruler, navigation pane, status bar.
import { $, el, esc, clamp, pxToCm, cmToPx, round } from './util.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { doc, bus, pageDims } from './state.js';
import { settings, saveSettings, units } from './settings.js';
import { editor, sheet, workspace, run, settle, selInEditor } from './editor.js';
import { layout, paginate, applyPageVars, pageAt, pageStartY } from './paginate.js';
import { headingList } from './cmds.js';
import { tip } from './popup.js';

const zoomer = $('#zoomer');
let zoom = 1;
export const getZoom = () => zoom;

/* ------------------------------ zoom ------------------------------ */
export function sizeZoomer() {
  const w = sheet.offsetWidth, h = sheet.offsetHeight;
  zoomer.style.width = Math.round(w * zoom) + 'px';
  zoomer.style.height = Math.round(h * zoom) + 'px';
  const r = $('#ruler-wrap');
  if (r) r.style.setProperty('--rw', Math.round(w * zoom) + 'px');
}
export function setZoom(pct, persist = true) {
  pct = clamp(Math.round(pct), 25, 400);
  zoom = pct / 100;
  document.documentElement.style.setProperty('--z', zoom);
  if (persist) { settings.zoom = pct; saveSettings(); }
  sizeZoomer();
  updateStatus();
  drawRuler();
  bus.emit('zoom', pct);
}
const sheetW = () => (settings.view === 'print' ? pageDims().w : sheet.offsetWidth);
export const fitWidth = () => setZoom(((workspace.clientWidth - 64) / sheetW()) * 100);
export const fitPage = () => setZoom(Math.min((workspace.clientWidth - 64) / sheetW(), (workspace.clientHeight - 60) / pageDims().h) * 100);
export const zoomBy = (d) => setZoom(Math.round((zoom * 100 + d) / 5) * 5);

workspace.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  zoomBy(e.deltaY < 0 ? 10 : -10);
}, { passive: false });

/* ------------------------------ view modes ------------------------------ */
export function setView(mode, persist = true) {
  if (!['print', 'web', 'read'].includes(mode)) mode = 'print';
  settings.view = mode;
  if (persist) saveSettings();
  document.body.classList.remove('view-print', 'view-web', 'view-read');
  document.body.classList.add('view-' + mode);
  layout.enabled = mode === 'print';
  editor.contentEditable = mode === 'read' ? 'false' : 'true';
  applyWebWidth();
  settle({ record: false });
  bus.emit('view', mode);
  drawRuler();
}
export function applyWebWidth() {
  const w = clamp(Math.floor(workspace.clientWidth / zoom - 56), 360, mode() === 'read' ? 760 : 1100);
  document.documentElement.style.setProperty('--web-w', w + 'px');
}
const mode = () => settings.view;

/* ------------------------------ formatting marks ------------------------------ */
export function toggleMarks(on) {
  settings.marks = on == null ? !settings.marks : !!on;
  saveSettings();
  document.body.classList.toggle('marks', settings.marks);
  bus.emit('selection');
}

/* ------------------------------ ruler ------------------------------ */
let rulerOn = false;
export function showRuler(on) {
  rulerOn = on;
  settings.ruler = on;
  saveSettings();
  $('#ruler-wrap').hidden = !on || settings.view !== 'print';
  drawRuler();
}
export function drawRuler() {
  const wrap = $('#ruler-wrap');
  wrap.hidden = !rulerOn || settings.view !== 'print';
  if (wrap.hidden) return;
  const d = pageDims();
  const U = units();
  const ruler = $('#ruler');
  const unitPx = U === 'cm' ? cmToPx(1) : 96;
  const sub = U === 'cm' ? 2 : 8; // minor ticks per unit
  const ml = doc.page.margins.left, mr = doc.page.margins.right;
  let h = `<div class="r-pad l" style="width:${ml * zoom}px"></div><div class="r-pad r" style="width:${mr * zoom}px"></div>`;
  const n = Math.floor(d.w / unitPx * sub);
  for (let i = 0; i <= n; i++) {
    const x = (i * unitPx) / sub;
    const isMajor = i % sub === 0, isMid = sub % 2 === 0 && i % (sub / 2) === 0;
    const rel = (x - ml) / unitPx; // number relative to the left margin
    h += `<i class="tk ${isMajor ? 'maj' : isMid ? 'mid' : ''}" style="left:${x * zoom}px"></i>`;
    if (isMajor && x > 4 && x < d.w - 4) {
      const v = Math.abs(Math.round(rel));
      if (Math.abs(rel - Math.round(rel)) < 0.01 && v > 0) h += `<b class="tn" style="left:${x * zoom}px">${v}</b>`;
    }
  }
  h += `<div class="r-h l" data-side="left" style="left:${ml * zoom}px" title="${esc(t('ruler.left'))}"></div><div class="r-h r" data-side="right" style="left:${(d.w - mr) * zoom}px" title="${esc(t('ruler.right'))}"></div>`;
  ruler.innerHTML = h;
}
export function initRuler() {
  const ruler = $('#ruler');
  ruler.addEventListener('mousedown', (e) => {
    const side = e.target.dataset && e.target.dataset.side;
    if (!side) return;
    e.preventDefault();
    const d = pageDims();
    const x0 = e.clientX;
    const m0 = doc.page.margins[side];
    let raf = 0;
    document.body.classList.add('resizing-margin');
    const tipEl = el('div', { class: 'tooltip show' });
    document.body.append(tipEl);
    const move = (ev) => {
      let m = m0 + ((side === 'left' ? 1 : -1) * (ev.clientX - x0)) / zoom;
      const other = doc.page.margins[side === 'left' ? 'right' : 'left'];
      m = clamp(Math.round(m / 3) * 3, 0, d.w - other - 96);
      doc.page.margins[side] = m;
      const U = units();
      tipEl.textContent = (U === 'cm' ? round(pxToCm(m), 2) + ' cm' : round(m / 96, 2) + ' in');
      tipEl.style.left = ev.clientX + 12 + 'px';
      tipEl.style.top = ev.clientY + 16 + 'px';
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; applyPageVars(); paginate(); sizeZoomer(); drawRuler(); });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      tipEl.remove();
      document.body.classList.remove('resizing-margin');
      run(() => { applyPageVars(); bus.emit('meta'); });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
}

/* ------------------------------ status bar ------------------------------ */
let sb = {};
export function buildStatus() {
  const bar = $('#statusbar');
  bar.innerHTML = '';
  const btn = (cls, html, fn, tp) => { const b = el('button', { class: cls, type: 'button', html }); if (fn) b.addEventListener('click', fn); if (tp) tip(b, tp); return b; };
  sb.page = btn('sb-item', '', () => bus.emit('goto-page'), t('sb.goto'));
  sb.words = btn('sb-item', '', () => bus.emit('word-count'), t('sb.wordcount'));
  sb.lang = btn('sb-item', '', () => bus.emit('language'), t('sb.language'));
  sb.save = el('span', { class: 'sb-item static' });
  const views = el('div', { class: 'sb-views' });
  sb.views = {};
  for (const [id, ic] of [['read', 'readview'], ['print', 'printview'], ['web', 'webview']]) {
    const b = btn('icon-btn sm', icon(ic), () => setView(id), t('view.' + id));
    sb.views[id] = b;
    views.append(b);
  }
  const out = btn('icon-btn sm', icon('minus'), () => zoomBy(-10), t('tip.zoomOut'));
  const inn = btn('icon-btn sm', icon('plus'), () => zoomBy(10), t('tip.zoomIn'));
  sb.slider = el('input', { type: 'range', min: 25, max: 300, step: 5, class: 'zoom-range', 'aria-label': t('tip.zoom') });
  sb.slider.addEventListener('input', () => setZoom(+sb.slider.value));
  sb.pct = btn('sb-pct', '100%', () => setZoom(100), t('tip.zoom100'));
  bar.append(sb.page, sb.words, sb.lang, sb.save, el('span', { class: 'spacer' }), views, out, sb.slider, inn, sb.pct,
    btn('icon-btn sm', icon('fitpage'), fitPage, t('tip.fitPage')));
  updateStatus();
}
let words = 0, chars = 0;
export function countText() {
  const txt = editor.innerText || '';
  const m = txt.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-_.]*/gu);
  words = m ? m.length : 0;
  chars = txt.replace(/\n/g, '').length;
  return { words, chars, charsNoSpaces: txt.replace(/\s/g, '').length, paragraphs: [...editor.children].filter((c) => !c.classList.contains('pg-sp') && (c.textContent.trim() || c.tagName === 'TABLE')).length, pages: layout.count };
}
export function updateStatus() {
  if (!sb.page) return;
  const s = getSelection();
  let curPage = 1;
  if (selInEditor() && layout.enabled) {
    const r = s.getRangeAt(0);
    const rect = r.getClientRects()[0] || (r.startContainer.nodeType === 1 ? r.startContainer.getBoundingClientRect() : r.startContainer.parentElement.getBoundingClientRect());
    const er = editor.getBoundingClientRect();
    curPage = pageAt(((rect.top - er.top) / (zoom || 1)) + 2);
  }
  sb.page.textContent = layout.enabled ? t('sb.page', { n: curPage, total: layout.count }) : t('sb.pages', { total: layout.count });
  const selTxt = s.rangeCount && !s.isCollapsed && selInEditor() ? String(s).match(/[\p{L}\p{N}][\p{L}\p{N}'’\-_.]*/gu) : null;
  sb.words.textContent = selTxt ? t('sb.wordsSel', { n: selTxt.length, total: words }) : t('sb.words', { n: words });
  sb.lang.innerHTML = icon('globe') + `<span>${esc(t('lang.' + (document.documentElement.lang === 'vi' ? 'vi' : 'en')))}</span>`;
  const pct = Math.round(zoom * 100);
  sb.pct.textContent = pct + '%';
  sb.slider.value = pct;
  for (const [id, b] of Object.entries(sb.views)) b.classList.toggle('on', settings.view === id);
}
export function setSaveState(text, cls = '') {
  if (!sb.save) return;
  sb.save.textContent = text;
  sb.save.className = 'sb-item static ' + cls;
}

/* ------------------------------ side pane ------------------------------ */
let sideTab = 'headings';
export function buildSide() {
  const tabs = $('#side-tabs');
  tabs.innerHTML = '';
  for (const id of ['headings', 'pages']) {
    const b = el('button', { type: 'button', class: id === sideTab ? 'on' : '', text: t('nav.' + id) });
    b.onclick = () => { sideTab = id; buildSide(); fillSide(); };
    tabs.append(b);
  }
  tip($('#side-close'), t('btn.close'));
  $('#side-close').innerHTML = icon('close');
}
export function fillSide() {
  const c = $('#side-content');
  if ($('#sidepane').hidden) return;
  c.innerHTML = '';
  if (sideTab === 'headings') {
    const hs = headingList();
    if (!hs.length) { c.append(el('p', { class: 'side-empty', text: t('nav.noHeadings') })); return; }
    for (const h of hs) {
      const b = el('button', { class: 'nav-h l' + h.level, type: 'button', text: h.text });
      b.onclick = () => goToElement(h.el);
      c.append(b);
    }
  } else {
    const grid = el('div', { class: 'nav-pages' });
    for (let i = 1; i <= layout.count; i++) {
      const b = el('button', { class: 'nav-pg', type: 'button' });
      const first = firstTextOnPage(i);
      b.innerHTML = `<span class="np-sheet" style="aspect-ratio:${pageDims().w}/${pageDims().h}"><i>${esc(first)}</i></span><span class="np-n">${i}</span>`;
      b.onclick = () => goToPage(i);
      grid.append(b);
    }
    c.append(grid);
  }
}
function firstTextOnPage(n) {
  for (const [elm, pg] of layout.pageOf) if (pg === n && elm.textContent && elm.textContent.trim()) return elm.textContent.trim().slice(0, 90);
  return '';
}
export function toggleSide(on) {
  const sp = $('#sidepane');
  const show = on == null ? sp.hidden : on;
  sp.hidden = !show;
  settings.nav = show;
  saveSettings();
  if (show) { buildSide(); fillSide(); }
  requestAnimationFrame(() => { applyWebWidth(); sizeZoomer(); });
}
let navT;
bus.on('settled', () => { clearTimeout(navT); navT = setTimeout(fillSide, 350); });

export function goToElement(node) {
  const r = node.getBoundingClientRect();
  const w = workspace.getBoundingClientRect();
  workspace.scrollTo({ top: workspace.scrollTop + r.top - w.top - 90, behavior: 'smooth' });
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(true);
  const s = getSelection();
  editor.focus({ preventScroll: true });
  s.removeAllRanges();
  s.addRange(range);
}
export function goToPage(n) {
  n = clamp(n, 1, layout.count);
  const top = pageStartY(n) * zoom;
  const er = editor.getBoundingClientRect();
  const w = workspace.getBoundingClientRect();
  workspace.scrollTo({ top: workspace.scrollTop + (er.top - w.top) + top - 56, behavior: 'smooth' });
}

/* ------------------------------ init ------------------------------ */
export function initView() {
  new ResizeObserver(() => { sizeZoomer(); drawRuler(); }).observe(sheet);
  new ResizeObserver(() => { if (settings.view !== 'print') { applyWebWidth(); } }).observe(workspace);
  let t0;
  workspace.addEventListener('scroll', () => { clearTimeout(t0); t0 = setTimeout(updateStatus, 120); }, { passive: true });
  bus.on('settled', () => { countText(); updateStatus(); sizeZoomer(); });
  bus.on('selection', () => { clearTimeout(t0); t0 = setTimeout(updateStatus, 80); });
  bus.on('meta', () => { applyPageVars(); drawRuler(); });
  initRuler();
}
