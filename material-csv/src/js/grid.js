// Virtualised spreadsheet-style grid: only the visible rows and columns exist in the DOM.
import { app, cur, visCols, colIsNum, editCells } from './state.js';
import { colName } from './csv.js';
import { $, esc, clamp, fmtNum } from './ui.js';
import { rect, selection, selectionStats } from './ops.js';
import { icon } from './icons.js';
import { t } from './i18n.js';

const BASE = { compact: 28, normal: 32, comfy: 42 };
const OVERSCAN = 6;
const G = { rowH: 32, hdrH: 36, fltH: 34, rnW: 56, z: 1, cols: [], lefts: [0], total: 0, first: -1, last: -1, c0: -1, c1: -1, editing: null, drag: null };
export const grid = G;

let scroller, body, rowsLayer, hdr, selbox, actbox, editor;

/* ------------------------------ layout ------------------------------ */

export function initGrid() {
  scroller = $('#scroller'); body = $('#gbody'); rowsLayer = $('#rows'); hdr = $('#ghdr');
  selbox = $('#selbox'); actbox = $('#actbox'); editor = $('#editor');
  scroller.addEventListener('scroll', onScroll, { passive: true });
  scroller.addEventListener('mousedown', onMouseDown);
  scroller.addEventListener('dblclick', onDblClick);
  scroller.addEventListener('contextmenu', onContext);
  scroller.addEventListener('keydown', onKeyDown);
  scroller.addEventListener('input', onFilterInput);
  scroller.addEventListener('wheel', e => {
    if (e.ctrlKey) { e.preventDefault(); app.hooks.zoom?.(e.deltaY < 0 ? 10 : -10); }
  }, { passive: false });
  editor.addEventListener('keydown', onEditorKey);
  editor.addEventListener('blur', () => { if (G.editing && !G.editing.cancel) commitEdit(); });
  editor.addEventListener('input', fitEditor);
  new ResizeObserver(() => { if (cur()) renderRows(true); }).observe(scroller);
  app.hooks.select = (r1, c1, r2, c2) => setSel(r1, c1, r2, c2);
  app.hooks.zoom = null;
}

function metrics() {
  const s = app.settings, z = clamp(s.zoom, 60, 200) / 100;
  G.z = z;
  G.rowH = Math.round(BASE[s.density] * z);
  G.hdrH = Math.round((BASE[s.density] + 6) * z);
  G.fltH = Math.round((BASE[s.density] + 2) * z);
  const d = cur();
  const digits = String(Math.max(d ? d.rows.length : 0, 99)).length;
  G.rnW = Math.round((digits * 8 + 30) * z);
  const r = document.documentElement.style;
  r.setProperty('--rh', G.rowH + 'px'); r.setProperty('--hh', G.hdrH + 'px');
  r.setProperty('--fh', G.fltH + 'px'); r.setProperty('--rnw', G.rnW + 'px');
  r.setProperty('--gfs', (13 * z).toFixed(2) + 'px');
}

function layout() {
  const d = cur();
  metrics();
  G.cols = visCols(d);
  G.lefts = [0];
  for (const c of G.cols) G.lefts.push(G.lefts[G.lefts.length - 1] + Math.round((d.widths[c] || 120) * G.z));
  G.total = G.rnW + G.lefts[G.lefts.length - 1];
  G.hdrTotal = G.hdrH + (d.showFilterRow ? G.fltH : 0);
}

const nRows = () => cur().view.length;

/** Renders header, rows and selection. Called after structural changes. */
export function renderAll() {
  const d = cur();
  if (!d) return;
  layout();
  body.style.height = Math.max(nRows() * G.rowH, 0) + 'px';
  body.style.width = G.total + 'px';
  renderHeader();
  G.first = G.last = G.c0 = G.c1 = -1;
  renderRows(true);
  clampSel();
  updateSelection(false);
  $('#gempty').hidden = nRows() > 0;
  $('#gempty').textContent = d.rows.length ? t('noMatch') : t('noRows');
}

function clampSel() {
  const d = cur(), s = d.sel, n = nRows(), m = G.cols.length;
  if (!n || !m) { d.sel = { ar: -1, ac: -1, fr: -1, fc: -1 }; return; }
  if (s.ar < 0) return;
  d.sel = { ar: clamp(s.ar, 0, n - 1), ac: clamp(s.ac, 0, m - 1), fr: clamp(s.fr, 0, n - 1), fc: clamp(s.fc, 0, m - 1) };
}

export function renderHeader() {
  const d = cur();
  const { cols, lefts, rnW } = G;
  const sel = rect(d);
  let h = `<div class="hrow" style="width:${G.total}px;height:${G.hdrH}px"><div class="hcell corner" style="width:${rnW}px" data-act="all" title="${esc(t('selectAll'))}"></div>`;
  cols.forEach((c, i) => {
    const hl = sel && i >= sel.c1 && i <= sel.c2;
    const sorted = d.sc === c;
    h += `<div class="hcell${hl ? ' hl' : ''}${sorted ? ' sorted' : ''}" data-v="${i}" style="left:${rnW + lefts[i]}px;width:${lefts[i + 1] - lefts[i]}px">` +
      `<span class="hn" title="${esc(d.head[c])}">${esc(d.head[c])}</span>` +
      `<span class="hbs"><button class="hb sortb" data-act="sort" tabindex="-1" title="${esc(t('sortToggle'))}">${sorted ? icon(d.sd > 0 ? 'sortasc' : 'sortdesc') : icon('sort')}</button>` +
      `<button class="hb" data-act="menu" tabindex="-1" title="${esc(t('colMenu'))}">${icon('down')}</button></span>` +
      `<i class="rz" data-act="resize"></i></div>`;
  });
  h += '</div>';
  if (d.showFilterRow) {
    h += `<div class="hrow frow" style="width:${G.total}px;height:${G.fltH}px"><div class="hcell corner" style="width:${rnW}px">${icon('filter')}</div>`;
    cols.forEach((c, i) => {
      h += `<div class="hcell fcell" style="left:${rnW + lefts[i]}px;width:${lefts[i + 1] - lefts[i]}px"><input data-cf="${c}" placeholder="${esc(t('filterPh'))}" value="${esc(d.cf[c] || '')}"></div>`;
    });
    h += '</div>';
  }
  hdr.style.width = G.total + 'px';
  hdr.innerHTML = h;
}

/* ------------------------------ rows ------------------------------ */

function onScroll() {
  cur().scroll = { top: scroller.scrollTop, left: scroller.scrollLeft };
  if (!onScroll.raf) onScroll.raf = requestAnimationFrame(() => { onScroll.raf = 0; renderRows(false); });
}

function colAtX(x) {
  const L = G.lefts;
  let lo = 0, hi = L.length - 2;
  if (hi < 0) return -1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (L[mid] <= x) lo = mid; else hi = mid - 1; }
  return lo;
}

export function renderRows(force) {
  const d = cur();
  if (!d || !G.cols) return;
  const n = nRows(), st = scroller.scrollTop, sl = scroller.scrollLeft;
  const vh = scroller.clientHeight - G.hdrTotal, vw = scroller.clientWidth;
  const first = clamp(Math.floor(st / G.rowH) - OVERSCAN, 0, Math.max(0, n - 1));
  const last = Math.min(n - 1, Math.ceil((st + vh) / G.rowH) + OVERSCAN);
  let c0 = G.cols.length ? clamp(colAtX(sl - G.rnW) - 1, 0, G.cols.length - 1) : 0;
  let c1 = G.cols.length ? clamp(colAtX(sl + vw - G.rnW) + 1, 0, G.cols.length - 1) : -1;
  if (!force && first === G.first && last === G.last && c0 === G.c0 && c1 === G.c1) return;
  G.first = first; G.last = last; G.c0 = c0; G.c1 = c1;
  const f = app.find, re = f.open && f.q && f.re ? f.re : null;
  const curHit = f.cur >= 0 ? f.matches[f.cur] : null;
  const numCols = new Map();
  for (let i = c0; i <= c1; i++) numCols.set(i, colIsNum(d, G.cols[i]));
  let h = '';
  for (let vi = first; vi <= last; vi++) {
    const si = d.view[vi], row = d.rows[si];
    h += `<div class="r${vi % 2 ? ' odd' : ''}" style="top:${vi * G.rowH}px;width:${G.total}px;height:${G.rowH}px" data-vi="${vi}"><div class="rn" style="width:${G.rnW}px">${si + 1}</div>`;
    for (let i = c0; i <= c1; i++) {
      const v = row[G.cols[i]] ?? '';
      let cls = 'c';
      if (numCols.get(i)) cls += ' n';
      if (re) { re.lastIndex = 0; if (v !== '' && re.test(v)) cls += curHit && curHit.vi === vi && curHit.vc === i ? ' hit cur' : ' hit'; }
      h += `<div class="${cls}" style="left:${G.rnW + G.lefts[i]}px;width:${G.lefts[i + 1] - G.lefts[i]}px">${esc(v)}</div>`;
    }
    h += '</div>';
  }
  rowsLayer.innerHTML = h;
  markRowHeaders();
}

function markRowHeaders() {
  const s = rect(cur());
  rowsLayer.querySelectorAll('.rn.hl').forEach(e => e.classList.remove('hl'));
  if (!s) return;
  rowsLayer.querySelectorAll('.r').forEach(r => {
    const vi = +r.dataset.vi;
    if (vi >= s.r1 && vi <= s.r2) r.firstChild.classList.add('hl');
  });
}

/* ------------------------------ selection ------------------------------ */

export function setSel(ar, ac, fr = ar, fc = ac, { scroll = true, keepEdit = false } = {}) {
  const d = cur();
  if (!d) return;
  if (G.editing && !keepEdit) commitEdit();
  const n = nRows(), m = G.cols.length;
  if (!n || !m) { d.sel = { ar: -1, ac: -1, fr: -1, fc: -1 }; }
  else d.sel = { ar: clamp(ar, 0, n - 1), ac: clamp(ac, 0, m - 1), fr: clamp(fr, 0, n - 1), fc: clamp(fc, 0, m - 1) };
  updateSelection(scroll);
  app.hooks.selChanged?.();
}

function cellBox(r1, c1, r2, c2) {
  return {
    left: G.rnW + G.lefts[c1], width: G.lefts[c2 + 1] - G.lefts[c1],
    top: r1 * G.rowH, height: (r2 - r1 + 1) * G.rowH,
  };
}

export function updateSelection(scroll) {
  const d = cur();
  const s = rect(d);
  if (!s) { selbox.hidden = actbox.hidden = true; markRowHeaders(); refreshHeaderHl(); return; }
  const b = cellBox(s.r1, s.c1, s.r2, s.c2), a = cellBox(d.sel.ar, d.sel.ac, d.sel.ar, d.sel.ac);
  selbox.hidden = actbox.hidden = false;
  selbox.style.cssText = `left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px`;
  actbox.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
  selbox.classList.toggle('single', s.r1 === s.r2 && s.c1 === s.c2);
  if (scroll) ensureVisible(d.sel.fr, d.sel.fc);
  markRowHeaders(); refreshHeaderHl();
}

function refreshHeaderHl() {
  const s = rect(cur());
  hdr.querySelectorAll('.hcell[data-v]').forEach(e => {
    const i = +e.dataset.v;
    e.classList.toggle('hl', !!s && i >= s.c1 && i <= s.c2);
  });
}

export function ensureVisible(vr, vc) {
  const d = cur();
  if (!d || vr < 0 || vc < 0 || !G.cols.length) return;
  const top = vr * G.rowH, bottom = top + G.rowH, vh = scroller.clientHeight - G.hdrTotal;
  if (top < scroller.scrollTop) scroller.scrollTop = top;
  else if (bottom > scroller.scrollTop + vh) scroller.scrollTop = bottom - vh;
  const left = G.rnW + G.lefts[vc], right = G.rnW + G.lefts[vc + 1];
  if (left - G.rnW < scroller.scrollLeft) scroller.scrollLeft = left - G.rnW;
  else if (right > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = right - scroller.clientWidth;
}

export function restoreScroll() {
  const d = cur();
  scroller.scrollTop = d.scroll.top; scroller.scrollLeft = d.scroll.left;
}

/* ------------------------------ mouse ------------------------------ */

function hit(e) {
  const rc = scroller.getBoundingClientRect();
  const x = e.clientX - rc.left, y = e.clientY - rc.top;
  const n = nRows(), m = G.cols.length;
  const ry = y - G.hdrTotal + scroller.scrollTop;
  const cx = x + scroller.scrollLeft - G.rnW;
  return {
    x, y, inRn: x < G.rnW, inHdr: y < G.hdrTotal,
    scrollbar: x >= scroller.clientWidth || y >= scroller.clientHeight,
    vr: n ? clamp(Math.floor(ry / G.rowH), 0, n - 1) : -1,
    vc: m ? clamp(colAtX(cx), 0, m - 1) : -1,
  };
}

function onMouseDown(e) {
  const d = cur();
  if (!d) return;
  const act = e.target.closest('[data-act]');
  if (e.target.closest('input')) return;
  const h = hit(e);
  if (h.scrollbar) return;
  if (G.editing && e.target !== editor) commitEdit();
  if (e.target === editor) return;
  if (act?.dataset.act === 'resize') return startResize(e, +act.closest('.hcell').dataset.v);
  if (act?.dataset.act === 'sort') { e.preventDefault(); return app.hooks.toggleSort?.(G.cols[+act.closest('.hcell').dataset.v]); }
  if (act?.dataset.act === 'menu') { e.preventDefault(); return app.hooks.colMenu?.(act, +act.closest('.hcell').dataset.v); }
  scroller.focus({ preventScroll: true });
  if (h.inHdr) {
    if (act?.dataset.act === 'all' || h.inRn) return selectAll();
    if (e.target.closest('.frow')) return;
    const vc = h.vc; if (vc < 0) return;
    const n = nRows();
    if (e.button === 2) {
      const s = rect(d);
      if (!(s && vc >= s.c1 && vc <= s.c2 && s.r1 === 0 && s.r2 === n - 1)) setSel(0, vc, n - 1, vc);
      return;
    }
    const anchor = e.shiftKey ? d.sel.ac : vc;
    setSel(0, anchor, Math.max(0, n - 1), vc);
    startDrag('col', vc);
    return;
  }
  if (h.vr < 0) return;
  if (h.inRn) {
    if (e.button === 2 && inSel(h.vr, 0, true)) return;
    const m = G.cols.length;
    const anchor = e.shiftKey ? d.sel.ar : h.vr;
    setSel(anchor, 0, h.vr, m - 1);
    startDrag('row', h.vr);
    return;
  }
  if (e.button === 2 && inSel(h.vr, h.vc)) return;
  if (e.shiftKey) setSel(d.sel.ar, d.sel.ac, h.vr, h.vc);
  else setSel(h.vr, h.vc, h.vr, h.vc);
  if (e.button === 0) startDrag('cell');
}

function inSel(vr, vc, rowOnly) {
  const s = rect(cur());
  return !!s && vr >= s.r1 && vr <= s.r2 && (rowOnly || (vc >= s.c1 && vc <= s.c2));
}

function startDrag(kind, anchorIdx) {
  const d = cur();
  scroller.classList.add('dragging');
  let last = null, timer = null;
  const mv = ev => { last = ev; };
  const tick = () => {
    if (!last) return;
    const rc = scroller.getBoundingClientRect();
    let dx = 0, dy = 0;
    if (last.clientY > rc.bottom - 24) dy = Math.min(40, (last.clientY - rc.bottom + 24) / 2 + 6);
    else if (last.clientY < rc.top + G.hdrTotal + 16) dy = -Math.min(40, (rc.top + G.hdrTotal + 16 - last.clientY) / 2 + 6);
    if (last.clientX > rc.right - 24) dx = 18; else if (last.clientX < rc.left + G.rnW + 16) dx = -18;
    if (dx || dy) { scroller.scrollTop += dy; scroller.scrollLeft += dx; }
    const h = hit(last);
    if (kind === 'cell') { if (h.vr >= 0 && h.vc >= 0) setSel(d.sel.ar, d.sel.ac, h.vr, h.vc, { scroll: false }); }
    else if (kind === 'row') { if (h.vr >= 0) setSel(d.sel.ar, 0, h.vr, G.cols.length - 1, { scroll: false }); }
    else if (h.vc >= 0) setSel(0, d.sel.ac, nRows() - 1, h.vc, { scroll: false });
  };
  const up = () => {
    clearInterval(timer);
    document.removeEventListener('mousemove', mv);
    document.removeEventListener('mouseup', up);
    scroller.classList.remove('dragging');
  };
  timer = setInterval(tick, 30);
  document.addEventListener('mousemove', mv);
  document.addEventListener('mouseup', up);
}

function startResize(e, vi) {
  e.preventDefault();
  const d = cur(), c = G.cols[vi], x0 = e.clientX, w0 = d.widths[c];
  const cell = e.target.closest('.hcell');
  cell.classList.add('resizing');
  const mv = ev => {
    d.widths = d.widths.slice();
    d.widths[c] = Math.max(48, Math.round(w0 + (ev.clientX - x0) / G.z));
    renderAll();
    $('#ghdr').querySelector(`[data-v="${vi}"]`)?.classList.add('resizing');
  };
  const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); renderAll(); };
  document.addEventListener('mousemove', mv);
  document.addEventListener('mouseup', up);
}

export function autoFitColumn(vi) {
  const d = cur(), c = G.cols[vi];
  let m = String(d.head[c]).length + 4;
  const lim = Math.min(d.rows.length, 400);
  for (let i = 0; i < lim; i++) m = Math.max(m, String(d.rows[i][c] ?? '').length);
  d.widths = d.widths.slice();
  d.widths[c] = clamp(m * 8 + 36, 60, 520);
  renderAll();
}

function onDblClick(e) {
  if (e.target.closest('input,.hb')) return;
  const h = hit(e);
  if (h.scrollbar) return;
  if (e.target.closest('[data-act="resize"]')) return autoFitColumn(+e.target.closest('.hcell').dataset.v);
  if (h.inHdr) { if (!h.inRn && !e.target.closest('.frow')) app.hooks.renameCol?.(G.cols[h.vc]); return; }
  if (h.inRn || h.vr < 0) return;
  startEdit();
}

function onContext(e) {
  const d = cur();
  if (!d || e.target.closest('input')) return;
  e.preventDefault();
  const h = hit(e);
  if (h.scrollbar) return;
  app.hooks.context?.(e, h.inHdr ? 'col' : h.inRn ? 'row' : 'cell');
}

export function selectAll() {
  const d = cur();
  if (!d || !nRows()) return;
  setSel(0, 0, nRows() - 1, G.cols.length - 1);
}

/* ------------------------------ editing ------------------------------ */

export function startEdit(initial = null) {
  const d = cur();
  if (!d || d.sel.ar < 0) return;
  const vr = d.sel.ar, vc = d.sel.ac, src = d.view[vr], col = G.cols[vc];
  if (src == null || col == null) return;
  ensureVisible(vr, vc);
  const b = cellBox(vr, vc, vr, vc);
  const orig = d.rows[src][col] ?? '';
  G.editing = { vr, vc, src, col, orig, cancel: false };
  editor.hidden = false;
  editor.style.cssText = `left:${b.left}px;top:${b.top}px;min-width:${b.width}px;height:${b.height}px`;
  editor.value = initial ?? orig;
  fitEditor();
  editor.focus({ preventScroll: true });
  const end = editor.value.length;
  editor.setSelectionRange(end, end);
  scroller.classList.add('editing');
}

function fitEditor() {
  if (!G.editing) return;
  editor.style.height = G.rowH + 'px';
  const need = editor.scrollHeight;
  if (need > G.rowH + 2) editor.style.height = Math.min(need + 2, G.rowH * 6) + 'px';
  const lines = editor.value.split('\n').reduce((a, l) => Math.max(a, l.length), 0);
  editor.style.width = clamp(lines * 8 * G.z + 24, 0, 520) + 'px';
}

export function commitEdit(move = null) {
  const ed = G.editing, d = cur();
  if (!ed) return;
  G.editing = null;
  const v = editor.value;
  editor.hidden = true;
  scroller.classList.remove('editing');
  if (d && v !== ed.orig && d.rows[ed.src]) {
    editCells(t('h_edit'), [{ r: ed.src, c: ed.col, o: ed.orig, n: v }], d);
  }
  scroller.focus({ preventScroll: true });
  if (move) moveActive(move.dr, move.dc, false);
}

export function cancelEdit() {
  if (!G.editing) return;
  G.editing.cancel = true;
  G.editing = null;
  editor.hidden = true;
  scroller.classList.remove('editing');
  scroller.focus({ preventScroll: true });
}

function onEditorKey(e) {
  if (e.key === 'Enter' && !e.altKey) { e.preventDefault(); commitEdit({ dr: e.shiftKey ? -1 : 1, dc: 0 }); }
  else if (e.key === 'Enter' && e.altKey) {
    e.preventDefault();
    const s = editor.selectionStart;
    editor.setRangeText('\n', s, editor.selectionEnd, 'end');
    fitEditor();
  }
  else if (e.key === 'Tab') { e.preventDefault(); commitEdit({ dr: 0, dc: e.shiftKey ? -1 : 1 }); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelEdit(); }
  e.stopPropagation();
}

/* ------------------------------ keyboard ------------------------------ */

function moveActive(dr, dc, extend) {
  const d = cur(), s = d.sel;
  if (s.ar < 0) return;
  if (extend) setSel(s.ar, s.ac, s.fr + dr, s.fc + dc);
  else {
    const r = clamp(s.fr + dr, 0, nRows() - 1), c = clamp(s.fc + dc, 0, G.cols.length - 1);
    setSel(r, c, r, c);
  }
}

function jump(dir, axis, extend) {
  const d = cur(), s = d.sel;
  if (s.ar < 0) return;
  const val = (r, c) => (d.rows[d.view[r]]?.[G.cols[c]] ?? '') !== '';
  const maxR = nRows() - 1, maxC = G.cols.length - 1;
  const ok = (r, c) => r >= 0 && r <= maxR && c >= 0 && c <= maxC;
  const step = (r, c) => (axis === 'r' ? [r + dir, c] : [r, c + dir]);
  let r = s.fr, c = s.fc;
  const [nr, nc] = step(r, c);
  if (!ok(nr, nc)) return;
  if (val(r, c) && val(nr, nc)) {            // inside a filled run: go to its end
    for (;;) { const [a, b] = step(r, c); if (!ok(a, b) || !val(a, b)) break; r = a; c = b; }
  } else {                                    // otherwise: go to the next filled cell (or the edge)
    r = nr; c = nc;
    while (!val(r, c)) { const [a, b] = step(r, c); if (!ok(a, b)) break; r = a; c = b; }
  }
  extend ? setSel(s.ar, s.ac, r, c) : setSel(r, c, r, c);
}

function onKeyDown(e) {
  const d = cur();
  if (!d || e.target === editor || e.target.closest('input')) return;
  const ctrl = e.ctrlKey || e.metaKey, shift = e.shiftKey;
  const page = Math.max(1, Math.floor((scroller.clientHeight - G.hdrTotal) / G.rowH) - 1);
  const arrows = { ArrowUp: ['r', -1], ArrowDown: ['r', 1], ArrowLeft: ['c', -1], ArrowRight: ['c', 1] };
  if (arrows[e.key]) {
    e.preventDefault();
    const [axis, dir] = arrows[e.key];
    if (ctrl) jump(dir, axis, shift);
    else moveActive(axis === 'r' ? dir : 0, axis === 'c' ? dir : 0, shift);
    return;
  }
  switch (e.key) {
    case 'Tab': e.preventDefault(); moveActive(0, shift ? -1 : 1, false); return;
    case 'Enter': e.preventDefault(); moveActive(shift ? -1 : 1, 0, false); return;
    case 'F2': e.preventDefault(); startEdit(); return;
    case 'PageDown': e.preventDefault(); moveActive(page, 0, shift); return;
    case 'PageUp': e.preventDefault(); moveActive(-page, 0, shift); return;
    case 'Home': e.preventDefault(); {
      const s = d.sel; const r = ctrl ? 0 : s.fr;
      shift ? setSel(s.ar, s.ac, r, 0) : setSel(r, 0, r, 0); return;
    }
    case 'End': e.preventDefault(); {
      const s = d.sel; const r = ctrl ? nRows() - 1 : s.fr, c = G.cols.length - 1;
      shift ? setSel(s.ar, s.ac, r, c) : setSel(r, c, r, c); return;
    }
    case 'Backspace': e.preventDefault(); app.hooks.run?.('edit.clear'); return;
    case ' ':
      if (ctrl) { e.preventDefault(); const c = d.sel.fc; setSel(0, c, nRows() - 1, c); return; }
      if (shift) { e.preventDefault(); const r = d.sel.fr; setSel(r, 0, r, G.cols.length - 1); return; }
  }
  if (!ctrl && !e.altKey && e.key.length === 1 && d.sel.ar >= 0) { e.preventDefault(); startEdit(e.key); }
}

/* ------------------------------ filters row ------------------------------ */

function onFilterInput(e) {
  const c = e.target.dataset?.cf;
  if (c == null) return;
  const d = cur();
  d.cf = { ...d.cf, [c]: e.target.value };
  if (!e.target.value) delete d.cf[c];
  app.hooks.viewChanged?.('typing');
}

/* ------------------------------ status stats ------------------------------ */

export function describeSelection() {
  const d = cur(), r = rect(d);
  if (!r) return '';
  const rows = r.r2 - r.r1 + 1, cols = r.c2 - r.c1 + 1;
  if (rows === 1 && cols === 1) return '';
  const st = selectionStats(d);
  let s = t('selCells', { n: fmtNum(rows * cols) });
  if (st && st.nums > 1) s += ` · ${t('sum')} ${fmtNum(st.sum)} · ${t('avg')} ${fmtNum(st.sum / st.nums)} · ${t('min')} ${fmtNum(st.min)} · ${t('max')} ${fmtNum(st.max)}`;
  return s;
}

export function cellRef(d = cur()) {
  if (!d || d.sel.ar < 0) return '';
  return colName(G.cols[d.sel.ac] ?? 0) + (d.view[d.sel.ar] + 1);
}

export function scrollerEl() { return scroller; }

/** Lightweight refresh after the view changed but the header must stay untouched (typing in filter inputs). */
export function refreshBody() {
  const d = cur();
  if (!d) return;
  body.style.height = Math.max(nRows() * G.rowH, 0) + 'px';
  renderRows(true);
  clampSel();
  updateSelection(false);
  $('#gempty').hidden = nRows() > 0;
  $('#gempty').textContent = d.rows.length ? t('noMatch') : t('noRows');
}
