// Application state: settings, documents, undo history and the filtered / sorted view.
// A tiny external store: logic modules mutate `app` and call emit(); React reads it through useApp().
import { useSyncExternalStore } from 'react';
import { cmpValues, isNumeric, toNumber } from './csv';
import { t, type LangPref } from './i18n';

export const APP_VERSION = '3.0.0';
const KEY = 'materialcsv.settings.v4';

export type ThemePref = 'system' | 'light' | 'dark';
export type FontId = 'system' | 'googlesans' | 'robotoflex' | 'roboto' | 'arial' | 'inter' | 'bevietnam';
export type SizeId = 'small' | 'medium' | 'large';
export type VariantId = 'tonal' | 'vibrant' | 'expressive';

export interface Settings {
  lang: LangPref; theme: ThemePref; accent: string; variant: VariantId; contrast: 'standard' | 'medium' | 'high';
  density: 'compact' | 'normal' | 'comfy'; zoom: number; font: FontId; fontSize: SizeId;
  anim: boolean; zebra: boolean; gridLines: boolean; windowMode: 'remember' | 'maximized';
  quoteAll: boolean; newEol: 'crlf' | 'lf'; newBom: boolean; details: boolean; autosave: boolean; recent: string[];
}

export const DEFAULTS: Settings = {
  lang: 'system', theme: 'system', accent: '#769CDF', variant: 'vibrant', contrast: 'standard', density: 'normal', zoom: 100,
  font: 'system', fontSize: 'medium', anim: true, zebra: true, gridLines: true, windowMode: 'remember',
  quoteAll: false, newEol: 'crlf', newBom: true, details: true, autosave: true, recent: [],
};

export interface Filter { c: number; o: string; v: string }
export interface Sel { ar: number; ac: number; fr: number; fc: number }
export interface CellChange { r: number; c: number; o: string; n: string }
type Entry =
  | { kind: 'cells'; id: number; label: string; ch: CellChange[] }
  | { kind: 'full'; id: number; label: string; head: string[]; rows: string[][]; widths: number[]; hasHeader: boolean; hidden: Set<number>; flt: Filter[]; cf: Record<string, string>; sc: number; sd: number };

export interface Doc {
  id: number; name: string; path: string | null; kind: string;
  head: string[]; rows: string[][]; widths: number[]; hidden: Set<number>;
  delim: string; enc: string; bom: boolean; eol: string; hasHeader: boolean;
  raw: string | null; size: number;
  undo: Entry[]; redo: Entry[]; cleanId: number; dirty: boolean;
  flt: Filter[]; cf: Record<string, string>; sc: number; sd: number; showFilterRow: boolean; freeze: boolean;
  view: number[]; identity: boolean; version: number;
  sel: Sel; scroll: { top: number; left: number };
  numCache: { v: number; m: Map<number, boolean> };
  blank?: boolean; imported?: boolean; sourceName?: string;
}

export interface FindState {
  open: boolean; replace: boolean; q: string; rep: string; matchCase: boolean; whole: boolean; regex: boolean; filterRows: boolean;
  matches: { vi: number; vc: number }[]; cur: number; re: RegExp | null; error: boolean;
}

export interface Editing { vr: number; vc: number; src: number; col: number; orig: string; initial: string | null }

export const app = {
  settings: { ...DEFAULTS } as Settings,
  docs: [] as Doc[],
  doc: null as Doc | null,
  mode: 'table' as 'table' | 'cards' | 'list',
  advOpen: false,
  find: { open: false, replace: false, q: '', rep: '', matchCase: false, whole: false, regex: false, filterRows: false, matches: [], cur: -1, re: null, error: false } as FindState,
  editing: null as Editing | null,
  /** one-shot request for the grid to scroll a view cell into sight */
  scrollReq: null as { vr: number; vc: number } | null,
  /** one-shot request to focus the grid after a dialog or menu closed */
  focusGrid: 0,
  findFocus: 0,
};

/* ------------------------------ subscription ------------------------------ */

let tick = 0;
const subs = new Set<() => void>();
let queued = false;
export function emit() {
  tick++;
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; subs.forEach(f => f()); });
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Re-renders the calling component whenever the store changes. Returns the change counter. */
export function useApp() { return useSyncExternalStore(subscribe, () => tick); }

export function loadSettings() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || '{}');
    // older builds defaulted to purple/vibrant: move those users to the new blue default
    if (o.accent === '#6750A4' && o.variant === 'vibrant') { delete o.accent; delete o.variant; }
    if (o.accent === '#2196F3' && (o.variant === 'tonal' || o.variant === 'vibrant')) { delete o.accent; delete o.variant; }
    Object.assign(app.settings, o);
  } catch { /* ignore */ }
}
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(app.settings)); } catch { /* ignore */ }
  emit();
}

let uid = 0, snapId = 0;

export function newDoc(init: Partial<Doc> = {}): Doc {
  return {
    id: ++uid, name: '', path: null, kind: 'csv',
    head: [], rows: [], widths: [], hidden: new Set(),
    delim: ',', enc: 'UTF-8', bom: false, eol: '\r\n', hasHeader: true,
    raw: null, size: 0,
    undo: [], redo: [], cleanId: 0, dirty: false,
    flt: [], cf: {}, sc: -1, sd: 1, showFilterRow: false, freeze: false,
    view: [], identity: true, version: 0,
    sel: { ar: -1, ac: -1, fr: -1, fc: -1 },
    scroll: { top: 0, left: 0 },
    numCache: { v: -1, m: new Map() },
    ...init,
  };
}

export const cur = () => app.doc;

/* ------------------------------ history ------------------------------ */

const capture = (d: Doc, label: string, id?: number): Entry => ({
  kind: 'full', id: id ?? ++snapId, label,
  head: d.head, rows: d.rows, widths: d.widths, hasHeader: d.hasHeader,
  hidden: new Set(d.hidden), flt: JSON.parse(JSON.stringify(d.flt)), cf: { ...d.cf }, sc: d.sc, sd: d.sd,
});

function restore(d: Doc, s: Entry) {
  if (s.kind !== 'full') return;
  d.head = s.head; d.rows = s.rows; d.widths = s.widths; d.hasHeader = s.hasHeader;
  d.hidden = new Set(s.hidden); d.flt = JSON.parse(JSON.stringify(s.flt)); d.cf = { ...s.cf };
  d.sc = s.sc; d.sd = s.sd;
}

const topId = (d: Doc) => (d.undo.length ? d.undo[d.undo.length - 1].id : 0);
export function updateDirty(d: Doc) { d.dirty = topId(d) !== d.cleanId; }
export function markClean(d: Doc) { d.cleanId = topId(d); d.dirty = false; }

function pushUndo(d: Doc, entry: Entry) {
  d.undo.push(entry);
  if (d.undo.length > 200) d.undo.shift();
  d.redo = [];
}

/** Structural edit: snapshot, copy arrays (copy-on-write), run fn, rebuild the view. */
export function edit(label: string, fn: (d: Doc) => void, d: Doc | null = app.doc) {
  if (!d) return;
  commitEditing();
  pushUndo(d, capture(d, label));
  d.head = d.head.slice(); d.rows = d.rows.slice(); d.widths = d.widths.slice();
  fn(d);
  afterChange(d, true);
}

/** Cell edit: stores a patch (cheap) instead of a full snapshot. changes use source coordinates. */
export function editCells(label: string, changes: CellChange[], d: Doc | null = app.doc): number {
  changes = changes.filter(x => x.o !== x.n);
  if (!d || !changes.length) return 0;
  applyCells(d, changes, 'n');
  pushUndo(d, { kind: 'cells', id: ++snapId, label, ch: changes });
  afterChange(d, false);
  return changes.length;
}

function applyCells(d: Doc, ch: CellChange[], key: 'o' | 'n') {
  d.rows = d.rows.slice();
  const touched = new Map<number, string[]>();
  for (const x of ch) {
    while (x.r >= d.rows.length) d.rows.push(new Array(d.head.length).fill(''));
    let row = touched.get(x.r);
    if (!row) { row = d.rows[x.r].slice(); touched.set(x.r, row); d.rows[x.r] = row; }
    row[x.c] = x[key];
  }
}

function afterChange(d: Doc, structural: boolean) {
  d.version++;
  updateDirty(d);
  if (structural || d.sc >= 0 || d.flt.length || Object.keys(d.cf).length || (app.find.open && app.find.filterRows)) rebuildView(d);
  clampSel(d);
  emit();
}

export function undo(d: Doc | null = app.doc) {
  const e = d?.undo.pop();
  if (!d || !e) return null;
  commitEditing(true);
  if (e.kind === 'cells') { applyCells(d, e.ch, 'o'); d.redo.push(e); }
  else { d.redo.push(capture(d, e.label, e.id)); restore(d, e); }
  d.version++; updateDirty(d); rebuildView(d); clampSel(d); emit();
  return e;
}
export function redo(d: Doc | null = app.doc) {
  const e = d?.redo.pop();
  if (!d || !e) return null;
  commitEditing(true);
  if (e.kind === 'cells') { applyCells(d, e.ch, 'n'); d.undo.push(e); }
  else { d.undo.push(capture(d, e.label, e.id)); restore(d, e); }
  d.version++; updateDirty(d); rebuildView(d); clampSel(d); emit();
  return e;
}

/* ------------------------------ filters ------------------------------ */

export const OPS = ['ct', 'nc', '=', '≠', '>', '<', '≥', '≤', 'sw', 'ew', 'em', 'ne'];
export const isUnary = (o: string) => o === 'em' || o === 'ne';

export function testFilter(v: string | undefined, f: Filter): boolean {
  const a = String(v ?? '');
  if (f.o === 'em') return a.trim() === '';
  if (f.o === 'ne') return a.trim() !== '';
  const b = String(f.v);
  const num = a !== '' && b !== '' && isNumeric(a) && isNumeric(b);
  const x = num ? toNumber(a) : a.toLowerCase(), y = num ? toNumber(b) : b.toLowerCase();
  switch (f.o) {
    case '=': return x === y;
    case '≠': return x !== y;
    case '>': return num ? (x as number) > (y as number) : cmpValues(a, b) > 0;
    case '<': return num ? (x as number) < (y as number) : cmpValues(a, b) < 0;
    case '≥': return num ? (x as number) >= (y as number) : cmpValues(a, b) >= 0;
    case '≤': return num ? (x as number) <= (y as number) : cmpValues(a, b) <= 0;
    case 'ct': return a.toLowerCase().includes(b.toLowerCase());
    case 'nc': return !a.toLowerCase().includes(b.toLowerCase());
    case 'sw': return a.toLowerCase().startsWith(b.toLowerCase());
    case 'ew': return a.toLowerCase().endsWith(b.toLowerCase());
  }
  return true;
}

export const activeFilters = (d: Doc) => d.flt.filter(f => isUnary(f.o) || f.v !== '');

/** Builds the list of source row indexes to display: filters, find-filter, then sort. */
export function rebuildView(d: Doc) {
  const rows = d.rows, n = rows.length;
  const af = activeFilters(d);
  const cf = Object.entries(d.cf).filter(([, v]) => v).map(([c, v]) => [+c, v.toLowerCase()] as [number, string]);
  const fd = app.find, fre = fd.open && fd.filterRows && fd.re && fd.q ? fd.re : null;
  let v: number[] | null = null;
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
  d.numCache.v = -1;
}

/** Visible (not hidden) source column indexes. */
export const visCols = (d: Doc) => {
  const out: number[] = [];
  for (let i = 0; i < d.head.length; i++) if (!d.hidden.has(i)) out.push(i);
  return out;
};

/** Cached "this column looks numeric" test (first 200 non empty values). */
export function colIsNum(d: Doc, c: number): boolean {
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

export function autoWidths(head: string[], rows: string[][]): number[] {
  return head.map((h, c) => {
    let m = String(h).length;
    const lim = Math.min(rows.length, 60);
    for (let i = 0; i < lim; i++) m = Math.max(m, String(rows[i][c] ?? '').length);
    return Math.max(88, Math.min(340, m * 8 + 40));
  });
}

/* ------------------------------ selection ------------------------------ */

export function clampSel(d: Doc) {
  const s = d.sel, n = d.view.length, m = visCols(d).length;
  if (!n || !m) { d.sel = { ar: -1, ac: -1, fr: -1, fc: -1 }; return; }
  if (s.ar < 0) return;
  const k = (v: number, hi: number) => Math.max(0, Math.min(hi, v));
  d.sel = { ar: k(s.ar, n - 1), ac: k(s.ac, m - 1), fr: k(s.fr, n - 1), fc: k(s.fc, m - 1) };
}

export function setSel(ar: number, ac: number, fr = ar, fc = ac, { scroll = true } = {}) {
  const d = cur();
  if (!d) return;
  commitEditing();
  const n = d.view.length, m = visCols(d).length;
  const k = (v: number, hi: number) => Math.max(0, Math.min(hi, v));
  if (!n || !m) d.sel = { ar: -1, ac: -1, fr: -1, fc: -1 };
  else d.sel = { ar: k(ar, n - 1), ac: k(ac, m - 1), fr: k(fr, n - 1), fc: k(fc, m - 1) };
  if (scroll && d.sel.fr >= 0) app.scrollReq = { vr: d.sel.fr, vc: d.sel.fc };
  emit();
}

/* ------------------------------ inline editing ------------------------------ */

export function startEdit(initial: string | null = null) {
  const d = cur();
  if (!d || d.sel.ar < 0) return;
  const vr = d.sel.ar, vc = d.sel.ac, src = d.view[vr], col = visCols(d)[vc];
  if (src == null || col == null) return;
  app.scrollReq = { vr, vc };
  app.editing = { vr, vc, src, col, orig: d.rows[src][col] ?? '', initial };
  emit();
}

/** Commits the open editor with the given value (the textarea reports it). */
let editorValue: (() => string) | null = null;
export const bindEditorValue = (f: (() => string) | null) => { editorValue = f; };
export function commitEditing(silent = false, move: { dr: number; dc: number } | null = null) {
  const ed = app.editing, d = cur();
  if (!ed) return;
  app.editing = null;
  const v = editorValue ? editorValue() : ed.orig;
  if (d && v !== ed.orig && d.rows[ed.src]) editCells(t('h_edit'), [{ r: ed.src, c: ed.col, o: ed.orig, n: v }], d);
  if (move && d) {
    const s = d.sel, nRows = d.view.length, nCols = visCols(d).length;
    const r = Math.max(0, Math.min(nRows - 1, s.fr + move.dr)), c = Math.max(0, Math.min(nCols - 1, s.fc + move.dc));
    d.sel = { ar: r, ac: c, fr: r, fc: c };
    app.scrollReq = { vr: r, vc: c };
  }
  app.focusGrid++;
  if (!silent) emit();
}
export function cancelEditing() {
  if (!app.editing) return;
  app.editing = null;
  app.focusGrid++;
  emit();
}
