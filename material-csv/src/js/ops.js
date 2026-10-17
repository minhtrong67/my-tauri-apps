// Data operations on the active document. Every mutation goes through edit()/editCells() so it is undoable.
import { app, cur, edit, editCells, visCols, autoWidths } from './state.js';
import { parseCSV, stringifyCSV, cmpValues, isNumeric, toNumber } from './csv.js';
import { toast } from './ui.js';
import { t } from './i18n.js';

const MAX_PASTE_ROWS = 2_000_000;

/* ----------------------------- selection helpers ----------------------------- */

export function rect(d = cur()) {
  const s = d?.sel;
  if (!s || s.ar < 0) return null;
  return { r1: Math.min(s.ar, s.fr), r2: Math.max(s.ar, s.fr), c1: Math.min(s.ac, s.fc), c2: Math.max(s.ac, s.fc) };
}

/** Selection resolved to source indexes. */
export function selection(d = cur()) {
  const r = rect(d);
  if (!r) return null;
  return { r, cols: visCols(d).slice(r.c1, r.c2 + 1), rows: d.view.slice(r.r1, r.r2 + 1) };
}

export const isMulti = d => { const r = rect(d); return !!r && (r.r1 !== r.r2 || r.c1 !== r.c2); };
const minOf = a => { let m = Infinity; for (const x of a) if (x < m) m = x; return m; };
const maxOf = a => { let m = -Infinity; for (const x of a) if (x > m) m = x; return m; };
const select = (...a) => app.hooks.select?.(...a);

export function cellValue(d, vr, vc) {
  const r = d.view[vr], c = visCols(d)[vc];
  return r == null || c == null ? '' : d.rows[r][c] ?? '';
}

/* ------------------------------- cell edits ------------------------------- */

export function setCell(d, r, c, v) {
  return editCells(t('h_edit'), [{ r, c, o: d.rows[r][c] ?? '', n: v }], d);
}

export function clearSelection() {
  const d = cur(), s = selection(d);
  if (!s) return;
  const ch = [];
  for (const r of s.rows) for (const c of s.cols) ch.push({ r, c, o: d.rows[r][c], n: '' });
  editCells(t('h_clear'), ch, d);
}

export function fill(dir) {
  const d = cur(), s = selection(d);
  if (!s) return;
  const { r } = s, vc = visCols(d), ch = [];
  if (dir === 'down') {
    const srcRow = r.r1 === r.r2 ? r.r1 - 1 : r.r1;
    if (srcRow < 0) return;
    const from = d.rows[d.view[srcRow]];
    const start = r.r1 === r.r2 ? r.r1 : r.r1 + 1;
    for (let i = start; i <= r.r2; i++) for (const c of s.cols) ch.push({ r: d.view[i], c, o: d.rows[d.view[i]][c], n: from[c] });
  } else {
    const srcCol = r.c1 === r.c2 ? r.c1 - 1 : r.c1;
    if (srcCol < 0) return;
    const sc = vc[srcCol], start = r.c1 === r.c2 ? r.c1 : r.c1 + 1;
    for (const row of s.rows) for (let j = start; j <= r.c2; j++) ch.push({ r: row, c: vc[j], o: d.rows[row][vc[j]], n: d.rows[row][sc] });
  }
  editCells(dir === 'down' ? t('h_filldown') : t('h_fillright'), ch, d);
}

/* --------------------------------- clipboard --------------------------------- */

export function selectionText(withHeader = false) {
  const d = cur(), s = selection(d);
  if (!s) return '';
  const rows = s.rows.map(r => s.cols.map(c => d.rows[r][c] ?? ''));
  return stringifyCSV(s.cols.map(c => d.head[c]), rows, { delim: '\t', eol: '\r\n', header: withHeader }).replace(/\r\n$/, '');
}

export function pasteText(text) {
  const d = cur();
  if (!d || !text) return;
  let m = parseCSV(text, '\t', { keepBlank: true });
  if (m.length > 1 && m[m.length - 1].length === 1 && m[m.length - 1][0] === '') m.pop();
  if (!m.length || m.length > MAX_PASTE_ROWS) return;
  const sel = rect(d);
  const vc = visCols(d);
  const r0 = sel ? sel.r1 : 0, c0 = sel ? sel.c1 : 0;
  const single = m.length === 1 && m[0].length === 1;
  let h = m.length, w = Math.max(...m.map(r => r.length));
  if (single && sel && (sel.r2 > sel.r1 || sel.c2 > sel.c1)) { h = sel.r2 - sel.r1 + 1; w = sel.c2 - sel.c1 + 1; }
  const at = (i, j) => single ? m[0][0] : (m[i][j] ?? '');
  const needRows = Math.max(0, r0 + h - d.view.length);
  const needCols = Math.max(0, c0 + w - vc.length);
  const baseRows = d.rows.length, baseCols = d.head.length;
  const dstRow = i => (r0 + i < d.view.length ? d.view[r0 + i] : baseRows + (r0 + i - d.view.length));
  const dstCol = j => (c0 + j < vc.length ? vc[c0 + j] : baseCols + (c0 + j - vc.length));
  if (needRows || needCols) {
    edit(t('h_paste'), x => {
      for (let k = 0; k < needCols; k++) { x.head.push(uniqueColName(x.head)); x.widths.push(120); }
      if (needCols) x.rows = x.rows.map(r => r.concat(new Array(needCols).fill('')));
      for (let k = 0; k < needRows; k++) x.rows.push(new Array(x.head.length).fill(''));
      for (let i = 0; i < h; i++) {
        const ri = dstRow(i);
        const row = x.rows[ri].slice();
        for (let j = 0; j < w; j++) row[dstCol(j)] = at(i, j);
        x.rows[ri] = row;
      }
    });
  } else {
    const ch = [];
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) {
      const r = dstRow(i), c = dstCol(j);
      ch.push({ r, c, o: d.rows[r][c] ?? '', n: at(i, j) });
    }
    editCells(t('h_paste'), ch, d);
  }
  select(r0, c0, r0 + h - 1, c0 + w - 1);
  toast(t('pasted', { n: h * w }), 'ok');
}

/* --------------------------------- rows --------------------------------- */

/** Selects `count` whole rows starting at the view position of a source row. */
function focusRow(srcIndex, count = 1) {
  const d = cur();
  const vi = d.view.indexOf(srcIndex);
  if (vi >= 0) select(vi, 0, vi + count - 1, Math.max(0, visCols(d).length - 1));
}

export function insertRows(where) {
  const d = cur();
  const s = selection(d);
  const n = s ? Math.min(500, s.rows.length || 1) : 1;
  const at = s && s.rows.length ? (where === 'above' ? minOf(s.rows) : maxOf(s.rows) + 1) : d.rows.length;
  if (!d.head.length) return;
  edit(t('h_insrow'), x => x.rows.splice(at, 0, ...Array.from({ length: n }, () => new Array(x.head.length).fill(''))), d);
  focusRow(at, n);
}

export function deleteRows() {
  const d = cur(), s = selection(d);
  if (!s || !s.rows.length) return;
  const del = new Set(s.rows), vr = s.r.r1, vc = s.r.c1;
  edit(t('h_delrow'), x => { x.rows = x.rows.filter((_, i) => !del.has(i)); }, d);
  if (d.view.length) select(Math.min(vr, d.view.length - 1), vc, Math.min(vr, d.view.length - 1), vc);
  toast(t('deletedRows', { n: del.size }), 'ok');
}

export function duplicateRows() {
  const d = cur(), s = selection(d);
  if (!s || !s.rows.length) return;
  const src = s.rows.slice().sort((a, b) => a - b), after = src[src.length - 1] + 1;
  edit(t('h_duprow'), x => x.rows.splice(after, 0, ...src.map(i => x.rows[i].slice())), d);
  focusRow(after, src.length);
}

export function moveRows(dir) {
  const d = cur(), s = selection(d);
  if (!s) return;
  if (!d.identity) return toast(t('clearViewFirst'), 'err');
  const { r1, r2 } = s.r;
  if ((dir < 0 && r1 === 0) || (dir > 0 && r2 >= d.rows.length - 1)) return;
  edit(t('h_moverow'), x => {
    if (dir < 0) { const [m] = x.rows.splice(r1 - 1, 1); x.rows.splice(r2, 0, m); }
    else { const [m] = x.rows.splice(r2 + 1, 1); x.rows.splice(r1, 0, m); }
  }, d);
  select(r1 + dir, s.r.c1, r2 + dir, s.r.c2);
}

/* -------------------------------- columns -------------------------------- */

export function uniqueColName(head) {
  let k = head.length + 1;
  while (head.includes(t('colN', { n: k }))) k++;
  return t('colN', { n: k });
}

/** Remaps every per-column structure after columns were inserted, removed or moved. map(old) -> new | -1. */
function remapCols(d, map) {
  d.hidden = new Set([...d.hidden].map(map).filter(i => i >= 0));
  d.flt = d.flt.map(f => ({ ...f, c: map(f.c) })).filter(f => f.c >= 0);
  const cf = {};
  for (const [c, v] of Object.entries(d.cf)) { const n = map(+c); if (n >= 0) cf[n] = v; }
  d.cf = cf;
  if (d.sc >= 0) { d.sc = map(d.sc); if (d.sc < 0) d.sc = -1; }
}

export function insertCols(side) {
  const d = cur(), s = selection(d);
  const n = s ? Math.min(100, s.cols.length || 1) : 1;
  const at = s && s.cols.length ? (side === 'left' ? minOf(s.cols) : maxOf(s.cols) + 1) : d.head.length;
  const vrow = s ? s.r.r1 : 0;
  edit(t('h_inscol'), x => {
    const names = [];
    for (let i = 0; i < n; i++) names.push(uniqueColName(x.head.concat(names)));
    x.head.splice(at, 0, ...names);
    x.widths.splice(at, 0, ...names.map(() => 120));
    x.rows = x.rows.map(r => { const y = r.slice(); y.splice(at, 0, ...names.map(() => '')); return y; });
    remapCols(x, i => (i >= at ? i + n : i));
  }, d);
  const vp = visCols(d).indexOf(at);
  if (vp >= 0) select(vrow, vp, vrow, vp + n - 1);
}

export function deleteCols() {
  const d = cur(), s = selection(d);
  if (!s || !s.cols.length) return;
  const del = new Set(s.cols);
  if (del.size >= d.head.length) return toast(t('keepOneCol'), 'err');
  const keep = []; d.head.forEach((_, i) => { if (!del.has(i)) keep.push(i); });
  const idx = new Map(keep.map((o, n) => [o, n]));
  const pos = s.r.c1;
  edit(t('h_delcol'), x => {
    x.head = keep.map(i => x.head[i]); x.widths = keep.map(i => x.widths[i]);
    x.rows = x.rows.map(r => keep.map(i => r[i]));
    remapCols(x, i => (idx.has(i) ? idx.get(i) : -1));
  }, d);
  const p = Math.min(pos, visCols(d).length - 1);
  select(Math.min(s.r.r1, Math.max(0, d.view.length - 1)), p, Math.min(s.r.r1, Math.max(0, d.view.length - 1)), p);
  toast(t('deletedCols', { n: del.size }), 'ok');
}

export function renameCol(c, name) {
  const d = cur();
  if (name == null || name === d.head[c]) return;
  edit(t('h_rename'), x => { x.head[c] = name; }, d);
}

export function duplicateCol() {
  const d = cur(), s = selection(d);
  if (!s || !s.cols.length) return;
  const c = maxOf(s.cols);
  edit(t('h_dupcol'), x => {
    x.head.splice(c + 1, 0, x.head[c] + t('copySuffix'));
    x.widths.splice(c + 1, 0, x.widths[c]);
    x.rows = x.rows.map(r => { const y = r.slice(); y.splice(c + 1, 0, r[c]); return y; });
    remapCols(x, i => (i > c ? i + 1 : i));
  }, d);
  const p = visCols(d).indexOf(c + 1);
  if (p >= 0) select(s.r.r1, p, s.r.r1, p);
}

export function moveCols(dir) {
  const d = cur(), s = selection(d);
  if (!s || !s.cols.length) return;
  const a = minOf(s.cols), b = maxOf(s.cols), n = d.head.length;
  if ((dir < 0 && a === 0) || (dir > 0 && b >= n - 1)) return;
  const order = Array.from({ length: n }, (_, i) => i);
  if (dir < 0) { const [m] = order.splice(a - 1, 1); order.splice(b, 0, m); }
  else { const [m] = order.splice(b + 1, 1); order.splice(a, 0, m); }
  const inv = new Array(n); order.forEach((o, i) => { inv[o] = i; });
  edit(t('h_movecol'), x => {
    x.head = order.map(i => x.head[i]); x.widths = order.map(i => x.widths[i]);
    x.rows = x.rows.map(r => order.map(i => r[i]));
    remapCols(x, i => inv[i]);
  }, d);
  const vc = visCols(d);
  const p1 = vc.indexOf(inv[a]), p2 = vc.indexOf(inv[b]);
  if (p1 >= 0 && p2 >= 0) select(s.r.r1, Math.min(p1, p2), s.r.r2, Math.max(p1, p2));
}

/* --------------------------------- data tools --------------------------------- */

/** Permanently sorts all rows (undoable). */
export function sortData(c, dir) {
  const d = cur();
  if (c == null || c < 0) return;
  edit(t('h_sort'), x => { x.rows.sort((p, q) => dir * cmpValues(p[c], q[c])); x.sc = -1; }, d);
  toast(t('sortedBy', { c: d.head[c] }), 'ok');
}

function targetCells(d) {
  if (isMulti(d)) { const s = selection(d); return { rows: s.rows, cols: s.cols, all: false }; }
  const rows = d.rows.map((_, i) => i), cols = d.head.map((_, i) => i);
  return { rows, cols, all: true };
}

export function transform(label, fn) {
  const d = cur();
  if (!d) return;
  const { rows, cols } = targetCells(d), ch = [];
  for (const r of rows) for (const c of cols) {
    const o = d.rows[r][c] ?? '', n = fn(o);
    if (n !== o) ch.push({ r, c, o, n });
  }
  const n = editCells(label, ch, d);
  toast(n ? t('cellsChanged', { n }) : t('nothingToDo'), n ? 'ok' : 'info');
}

export const T = {
  trim: v => v.replace(/^\s+|\s+$/g, ''),
  upper: v => v.toLocaleUpperCase(),
  lower: v => v.toLocaleLowerCase(),
  title: v => v.toLocaleLowerCase().replace(/(^|[\s\-_/(])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase()),
};

export function removeDuplicates() {
  const d = cur();
  const seen = new Set(), keep = [];
  d.rows.forEach((r, i) => { const k = JSON.stringify(r); if (!seen.has(k)) { seen.add(k); keep.push(i); } });
  const n = d.rows.length - keep.length;
  if (!n) return toast(t('nothingToDo'));
  edit(t('h_dedupe'), x => { x.rows = keep.map(i => x.rows[i]); }, d);
  toast(t('removedRows', { n }), 'ok');
}

export function removeEmptyRows() {
  const d = cur();
  const keep = d.rows.filter(r => r.some(v => String(v).trim() !== ''));
  const n = d.rows.length - keep.length;
  if (!n) return toast(t('nothingToDo'));
  edit(t('h_rmempty'), x => { x.rows = keep; }, d);
  toast(t('removedRows', { n }), 'ok');
}

export function toggleHeader() {
  const d = cur();
  if (!d) return;
  edit(t('h_header'), x => {
    if (x.hasHeader) {
      x.rows.unshift(x.head.slice());
      x.head = x.head.map((_, i) => t('colN', { n: i + 1 }));
      x.hasHeader = false;
    } else if (x.rows.length) {
      x.head = x.rows.shift().slice();
      x.hasHeader = true;
    }
    x.sc = -1;
  }, d);
}

export function newTable(rows = 20, cols = 6) {
  const head = Array.from({ length: cols }, (_, i) => t('colN', { n: i + 1 }));
  return { head, rows: Array.from({ length: rows }, () => new Array(cols).fill('')), widths: autoWidths(head, []) };
}

/* ----------------------------- statistics & profile ----------------------------- */

export function selectionStats(d = cur()) {
  const s = selection(d);
  if (!s) return null;
  const cells = s.rows.length * s.cols.length;
  const out = { cells, nums: 0, sum: 0, min: Infinity, max: -Infinity };
  if (cells > 600000) return out;
  for (const r of s.rows) {
    const row = d.rows[r];
    for (const c of s.cols) {
      const v = row[c];
      if (v !== '' && v != null && isNumeric(v)) {
        const x = toNumber(v);
        out.nums++; out.sum += x;
        if (x < out.min) out.min = x;
        if (x > out.max) out.max = x;
      }
    }
  }
  return out;
}

export function profileColumn(d, c) {
  const n = d.rows.length, freq = new Map();
  let empty = 0, nums = 0, sum = 0, min = Infinity, max = -Infinity, minLen = Infinity, maxLen = 0;
  for (let i = 0; i < n; i++) {
    const v = d.rows[i][c] ?? '';
    if (v === '') { empty++; continue; }
    freq.set(v, (freq.get(v) || 0) + 1);
    minLen = Math.min(minLen, v.length); maxLen = Math.max(maxLen, v.length);
    if (isNumeric(v)) { const x = toNumber(v); nums++; sum += x; if (x < min) min = x; if (x > max) max = x; }
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const filled = n - empty;
  return { name: d.head[c], n, empty, filled, unique: freq.size, numeric: nums > 0 && nums === filled, nums, sum, min, max, avg: nums ? sum / nums : 0, minLen: filled ? minLen : 0, maxLen, top };
}
