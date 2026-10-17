// Application state: settings, documents, undo history and the filtered / sorted view.
import { cmpValues, isNumeric, toNumber } from './csv.js';

export const APP_VERSION = '2.0.0';
const KEY = 'materialcsv.settings.v3';

export const DEFAULTS = {
  lang: 'system', theme: 'system', accent: '#769CDF', contrast: 'standard', density: 'normal', zoom: 100,
  anim: true, zebra: true, gridLines: true, windowMode: 'remember', quoteAll: false,
  newEol: 'crlf', newBom: true, details: true, recent: [], lastSize: null,
};

export const app = {
  settings: { ...DEFAULTS },
  docs: [],
  doc: null,       // active document
  hooks: {},       // filled by the UI modules (render callbacks)
  mode: 'table',   // table | cards | list
  find: { open: false, q: '', rep: '', matchCase: false, whole: false, regex: false, filterRows: false, matches: [], cur: -1, re: null, error: false },
};

export function loadSettings() {
  try { Object.assign(app.settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* ignore */ }
}
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(app.settings)); } catch { /* ignore */ }
}

let uid = 0, snapId = 0;

export function newDoc(init = {}) {
  const d = {
    id: ++uid, name: '', path: null, kind: 'csv',
    head: [], rows: [], widths: [], hidden: new Set(),
    delim: ',', enc: 'UTF-8', bom: false, eol: '\r\n', hasHeader: true,
    raw: null, size: 0,
    undo: [], redo: [], cleanId: 0, dirty: false,
    flt: [], cf: {}, sc: -1, sd: 1, showFilterRow: false,
    view: [], identity: true, version: 0,
    sel: { ar: -1, ac: -1, fr: -1, fc: -1 },
    scroll: { top: 0, left: 0 },
    numCache: { v: -1, m: new Map() },
    ...init,
  };
  return d;
}

export const cur = () => app.doc;

/* ------------------------------ history ------------------------------ */

const capture = (d, label, id) => ({
  kind: 'full', id: id ?? ++snapId, label,
  head: d.head, rows: d.rows, widths: d.widths, hasHeader: d.hasHeader,
  hidden: new Set(d.hidden), flt: JSON.parse(JSON.stringify(d.flt)), cf: { ...d.cf }, sc: d.sc, sd: d.sd,
});

function restore(d, s) {
  d.head = s.head; d.rows = s.rows; d.widths = s.widths; d.hasHeader = s.hasHeader;
  d.hidden = new Set(s.hidden); d.flt = JSON.parse(JSON.stringify(s.flt)); d.cf = { ...s.cf };
  d.sc = s.sc; d.sd = s.sd;
}

function topId(d) { return d.undo.length ? d.undo[d.undo.length - 1].id : 0; }

export function updateDirty(d) { d.dirty = topId(d) !== d.cleanId; }
export function markClean(d) { d.cleanId = topId(d); d.dirty = false; }

function pushUndo(d, entry) {
  d.undo.push(entry);
  if (d.undo.length > 200) d.undo.shift();
  d.redo = [];
}

/** Structural edit: snapshot, copy arrays (copy-on-write), run fn, rebuild the view. */
export function edit(label, fn, d = app.doc) {
  if (!d) return;
  pushUndo(d, capture(d, label));
  d.head = d.head.slice(); d.rows = d.rows.slice(); d.widths = d.widths.slice();
  fn(d);
  afterChange(d, true);
}

/** Cell edit: stores a patch (cheap) instead of a full snapshot. changes: [{r,c,o,n}] in source coordinates. */
export function editCells(label, changes, d = app.doc) {
  changes = changes.filter(x => x.o !== x.n);
  if (!d || !changes.length) return 0;
  applyCells(d, changes, 'n');
  pushUndo(d, { kind: 'cells', id: ++snapId, label, ch: changes });
  afterChange(d, false);
  return changes.length;
}

function applyCells(d, ch, key) {
  for (const x of ch) {
    while (x.r >= d.rows.length) d.rows.push(new Array(d.head.length).fill(''));
    const row = d.rows[x.r].slice();
    row[x.c] = x[key];
    d.rows[x.r] = row;
  }
}

function afterChange(d, structural) {
  d.version++;
  updateDirty(d);
  if (structural) rebuildView(d);
  app.hooks.changed?.(structural);
}

export function undo(d = app.doc) {
  const e = d?.undo.pop();
  if (!e) return null;
  if (e.kind === 'cells') { applyCells(d, e.ch, 'o'); d.redo.push(e); }
  else { d.redo.push(capture(d, e.label, e.id)); restore(d, e); }
  d.version++; updateDirty(d); rebuildView(d);
  app.hooks.changed?.(true, 'undo');
  return e;
}
export function redo(d = app.doc) {
  const e = d?.redo.pop();
  if (!e) return null;
  if (e.kind === 'cells') { applyCells(d, e.ch, 'n'); d.undo.push(e); }
  else { d.undo.push(capture(d, e.label, e.id)); restore(d, e); }
  d.version++; updateDirty(d); rebuildView(d);
  app.hooks.changed?.(true, 'redo');
  return e;
}

/* ------------------------------ filters ------------------------------ */

export const OPS = ['ct', 'nc', '=', '≠', '>', '<', '≥', '≤', 'sw', 'ew', 'em', 'ne'];
export const isUnary = o => o === 'em' || o === 'ne';

export function testFilter(v, f) {
  const a = String(v ?? '');
  switch (f.o) {
    case 'em': return a.trim() === '';
    case 'ne': return a.trim() !== '';
  }
  const b = String(f.v);
  const num = a !== '' && b !== '' && isNumeric(a) && isNumeric(b);
  const x = num ? toNumber(a) : a.toLowerCase(), y = num ? toNumber(b) : b.toLowerCase();
  switch (f.o) {
    case '=': return x === y;
    case '≠': return x !== y;
    case '>': return num ? x > y : cmpValues(a, b) > 0;
    case '<': return num ? x < y : cmpValues(a, b) < 0;
    case '≥': return num ? x >= y : cmpValues(a, b) >= 0;
    case '≤': return num ? x <= y : cmpValues(a, b) <= 0;
    case 'ct': return a.toLowerCase().includes(b.toLowerCase());
    case 'nc': return !a.toLowerCase().includes(b.toLowerCase());
    case 'sw': return a.toLowerCase().startsWith(b.toLowerCase());
    case 'ew': return a.toLowerCase().endsWith(b.toLowerCase());
  }
  return true;
}

export const activeFilters = d => d.flt.filter(f => isUnary(f.o) || f.v !== '');

/** Builds the list of source row indexes to display: filters, find-filter, then sort. */
export function rebuildView(d) {
  const rows = d.rows, n = rows.length;
  const af = activeFilters(d);
  const cf = Object.entries(d.cf).filter(([, t]) => t).map(([c, t]) => [+c, t.toLowerCase()]);
  const fd = app.find, fre = fd.open && fd.filterRows && fd.re && fd.q ? fd.re : null;
  let v = null;
  if (af.length || cf.length || fre) {
    v = [];
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      if (af.length && !af.every(f => testFilter(r[f.c], f))) continue;
      if (cf.length && !cf.every(([c, t]) => String(r[c] ?? '').toLowerCase().includes(t))) continue;
      if (fre && !r.some(x => { fre.lastIndex = 0; return fre.test(x); })) continue;
      v.push(i);
    }
  }
  if (!v) { v = new Array(n); for (let i = 0; i < n; i++) v[i] = i; }
  d.identity = !af.length && !cf.length && !fre && d.sc < 0;
  if (d.sc >= 0) {
    const c = d.sc, s = d.sd;
    v.sort((a, b) => s * cmpValues(rows[a][c], rows[b][c]) || a - b);
  }
  d.view = v;
}

/** Visible (not hidden) source column indexes. */
export const visCols = d => {
  const out = [];
  for (let i = 0; i < d.head.length; i++) if (!d.hidden.has(i)) out.push(i);
  return out;
};

/** Cached "this column looks numeric" test (first 200 non empty values). */
export function colIsNum(d, c) {
  const nc = d.numCache;
  if (nc.v !== d.version) { nc.v = d.version; nc.m.clear(); }
  let r = nc.m.get(c);
  if (r === undefined) {
    let seen = 0, ok = true;
    for (let i = 0; i < d.rows.length && seen < 200; i++) {
      const x = d.rows[i][c];
      if (x === '' || x == null) continue;
      seen++;
      if (!isNumeric(x)) { ok = false; break; }
    }
    r = ok && seen > 0;
    nc.m.set(c, r);
  }
  return r;
}

export function autoWidths(head, rows) {
  return head.map((h, c) => {
    let m = String(h).length;
    const lim = Math.min(rows.length, 60);
    for (let i = 0; i < lim; i++) m = Math.max(m, String(rows[i][c] ?? '').length);
    return Math.max(88, Math.min(340, m * 8 + 40));
  });
}
