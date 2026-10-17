// Workbook data model: sheets, cells, styles, evaluation cache, undo/redo and editing operations.
import { key, keyRow, keyCol, MAX_ROWS, MAX_COLS, rewriteFormula, adjustRefLines, shiftFormula } from "./refs.js";
import { parse, evaluate, XErr, E } from "./formula.js";
import { formatValue, parseTyped, isDateFormat, generalText } from "./numfmt.js";

export const DEF_COL_W = 96;
export const DEF_ROW_H = 24;
const HISTORY_LIMIT = 60;

export class Sheet {
  constructor(name) {
    this.name = name;
    this.cells = new Map();      // key -> {v?, f?, s?, rv?}  (cells are immutable; always replaced)
    this.colW = {}; this.rowH = {};
    this.merges = [];            // {r1,c1,r2,c2}
    this.freeze = { r: 0, c: 0 };
    this.hidden = new Set();     // hidden row indexes (filter)
    this.filter = null;          // {r1,c1,r2,c2, excl:{col: Set<string>}}
    this.defW = DEF_COL_W; this.defH = DEF_ROW_H;
    this.tab = null;
    this.mhidden = new Set();    // rows hidden by the user (Hide rows)
    this.chidden = new Set();    // columns hidden by the user
    this.cf = [];                // conditional-format rules
    this.dv = [];                // data-validation rules
    this.charts = [];            // floating charts
    this.ver = 0; this.cache = new Map(); this._b = null; this._bv = -1; this._mm = null; this._mv = -1;
  }
  touch() { this.ver++; }
  rowHidden(r) { return this.hidden.has(r) || this.mhidden.has(r); }
  colHidden(c) { return this.chidden.has(c); }
}
const deep = (x) => JSON.parse(JSON.stringify(x));
let uidN = 0;
const uid = () => "x" + Date.now().toString(36) + (uidN++).toString(36);
const overlaps = (a, b) => !(a.r2 < b.r1 || a.r1 > b.r2 || a.c2 < b.c1 || a.c1 > b.c2);
const inside = (a, b) => a.r1 >= b.r1 && a.r2 <= b.r2 && a.c1 >= b.c1 && a.c2 <= b.c2;
export function splitText(text, delims, consecutive, quote) {
  const out = []; let cur = "", q = false;
  const isD = (ch) => delims.includes(ch === "\t" ? "\t" : ch);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote && ch === quote) { if (q && text[i + 1] === quote) { cur += quote; i++; } else q = !q; continue; }
    if (!q && isD(ch)) { if (!(consecutive && (cur === "" && (out.length === 0 || isD(text[i - 1] || ""))))) out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function cloneSheet(s) {
  const n = new Sheet(s.name);
  n.cells = new Map(s.cells); n.colW = { ...s.colW }; n.rowH = { ...s.rowH };
  n.merges = s.merges.map((m) => ({ ...m })); n.freeze = { ...s.freeze }; n.hidden = new Set(s.hidden);
  n.filter = s.filter ? { ...s.filter, excl: Object.fromEntries(Object.entries(s.filter.excl).map(([k, v]) => [k, new Set(v)])) } : null;
  n.defW = s.defW; n.defH = s.defH; n.tab = s.tab;
  n.mhidden = new Set(s.mhidden); n.chidden = new Set(s.chidden);
  n.cf = deep(s.cf); n.dv = deep(s.dv); n.charts = deep(s.charts);
  return n;
}

const norm = (rg) => ({ r1: Math.min(rg.r1, rg.r2), r2: Math.max(rg.r1, rg.r2), c1: Math.min(rg.c1, rg.c2), c2: Math.max(rg.c1, rg.c2) });
function adjustSpan(a, b, idx, n) {
  if (n > 0) return [a >= idx ? a + n : a, b >= idx ? b + n : b];
  const cnt = -n, end = idx + cnt - 1;
  const na = a < idx ? a : a > end ? a - cnt : idx, nb = b < idx ? b : b > end ? b - cnt : idx - 1;
  return nb < na ? null : [na, nb];
}

export class Book {
  constructor() {
    this.styles = [{}]; this.styleIndex = new Map([["{}", 0]]);
    this.sheets = [new Sheet("Sheet1")]; this.active = 0;
    this.epoch = 0; this.evaluating = new Set(); this._depth = 0;
    this.undoStack = []; this.redoStack = [];
    this.dirty = false; this.path = null; this.lang = "en";
    this.listeners = new Set();
    this.env = {
      sheetByName: (n) => this.sheetByName(n),
      cellValue: (sh, r, c) => this.value(sh, r, c),
      bounds: (sh) => this.bounds(sh),
      now: () => Date.now(),
      eachInRange: (sh, r1, c1, r2, c2, cb) => this.eachValue(sh, { r1, c1, r2, c2 }, cb),
      rowHidden: (sh, r, manual) => sh.hidden.has(r) || (manual && sh.mhidden.has(r)),
      isSubtotal: (sh, r, c) => { const x = sh.cells.get(key(r, c)); return !!(x && x.f !== undefined && /SUBTOTAL\s*\(/i.test(x.f)); },
      isFormula: (sh, r, c) => { const x = sh.cells.get(key(r, c)); return !!(x && x.f !== undefined); },
    };
  }
  get sheet() { return this.sheets[this.active]; }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(kind = "change") { for (const l of this.listeners) l(kind); }
  sheetByName(n) { const l = String(n).toLowerCase(); return this.sheets.find((s) => s.name.toLowerCase() === l) || null; }

  // ── styles ──
  intern(st) {
    const o = {};
    for (const k of Object.keys(st).sort()) { const v = st[k]; if (v !== undefined && v !== null && v !== false && v !== "" && !(k === "nf" && v === "General")) o[k] = v; }
    const k = JSON.stringify(o);
    let id = this.styleIndex.get(k);
    if (id === undefined) { id = this.styles.length; this.styles.push(o); this.styleIndex.set(k, id); }
    return id;
  }
  styleOf(cell) { return this.styles[(cell && cell.s) || 0]; }

  // ── cells ──
  get(sh, r, c) { return sh.cells.get(key(r, c)); }
  put(sh, r, c, cell) {
    const k = key(r, c);
    if (!cell || (cell.v === undefined && cell.f === undefined && !cell.s && !cell.h && !cell.n)) sh.cells.delete(k);
    else sh.cells.set(k, cell);
    sh.touch();
  }
  bounds(sh) {
    if (sh._bv === sh.ver && sh._b) return sh._b;
    let R = -1, C = -1;
    for (const k of sh.cells.keys()) { const r = keyRow(k), c = keyCol(k); if (r > R) R = r; if (c > C) C = c; }
    for (const m of sh.merges) { R = Math.max(R, m.r2); C = Math.max(C, m.c2); }
    sh._b = { maxR: R, maxC: C }; sh._bv = sh.ver;
    return sh._b;
  }
  mergeAt(sh, r, c) {
    if (!sh.merges.length) return null;
    if (sh._mv !== sh.ver) {
      const m = new Map();
      for (const g of sh.merges) for (let rr = g.r1; rr <= g.r2; rr++) for (let cc = g.c1; cc <= g.c2; cc++) m.set(key(rr, cc), g);
      sh._mm = m; sh._mv = sh.ver;
    }
    return sh._mm.get(key(r, c)) || null;
  }

  value(sh, r, c) {
    const k = key(r, c), cell = sh.cells.get(k);
    if (!cell) return null;
    if (cell.f === undefined) return cell.v === undefined ? null : cell.v;
    const hit = sh.cache.get(k);
    if (hit !== undefined && hit.e === this.epoch) return hit.v;
    if (this.evaluating.has(cell)) return E.CIRC;
    this.evaluating.add(cell);
    let v;
    try { v = evaluate(parse(cell.f), { env: this.env, sheet: sh, r, c }); }
    catch (e) { v = e instanceof XErr ? e : E.VALUE; }
    finally { this.evaluating.delete(cell); }
    if (v instanceof XErr && v.code === "#NAME?" && cell.rv !== undefined) v = cell.rv; // unsupported function: keep value saved in the file
    if (v === undefined) v = null;
    sh.cache.set(k, { e: this.epoch, v });
    return v;
  }
  eachValue(sh, rg, cb) {
    const area = (rg.r2 - rg.r1 + 1) * (rg.c2 - rg.c1 + 1);
    if (area <= sh.cells.size * 2 + 16) {
      const b = this.bounds(sh);
      for (let r = rg.r1; r <= Math.min(rg.r2, b.maxR); r++) for (let c = rg.c1; c <= Math.min(rg.c2, b.maxC); c++) {
        if (!sh.cells.has(key(r, c))) continue;
        const v = this.value(sh, r, c); if (v !== null) cb(v, r, c);
      }
    } else {
      for (const k of sh.cells.keys()) {
        const r = keyRow(k), c = keyCol(k);
        if (r < rg.r1 || r > rg.r2 || c < rg.c1 || c > rg.c2) continue;
        const v = this.value(sh, r, c); if (v !== null) cb(v, r, c);
      }
    }
  }
  eachCell(sh, rg, cb) { // existing cells only
    const area = (rg.r2 - rg.r1 + 1) * (rg.c2 - rg.c1 + 1);
    if (area <= sh.cells.size) {
      for (let r = rg.r1; r <= rg.r2; r++) for (let c = rg.c1; c <= rg.c2; c++) { const cell = sh.cells.get(key(r, c)); if (cell) cb(cell, r, c); }
    } else {
      for (const [k, cell] of [...sh.cells]) { const r = keyRow(k), c = keyCol(k); if (r >= rg.r1 && r <= rg.r2 && c >= rg.c1 && c <= rg.c2) cb(cell, r, c); }
    }
  }
  display(sh, r, c) {
    const cell = sh.cells.get(key(r, c));
    if (!cell) return { text: "", v: null, st: this.styles[0], err: false };
    const st = this.styles[cell.s || 0], v = this.value(sh, r, c);
    if (v instanceof XErr) return { text: v.code, v, st, err: true };
    return { text: formatValue(v, st.nf), v, st, err: false };
  }
  // text shown in the editor / formula bar
  rawInput(sh, r, c) {
    const cell = sh.cells.get(key(r, c));
    if (!cell) return "";
    if (cell.f !== undefined) return "=" + cell.f;
    const st = this.styles[cell.s || 0], v = cell.v;
    if (v === undefined || v === null) return "";
    if (typeof v === "number") {
      if (isDateFormat(st.nf)) return formatValue(v, st.nf);
      if (st.nf && st.nf.includes("%") && !isDateFormat(st.nf)) return generalText(parseFloat((v * 100).toPrecision(12))) + "%";
      return this.lang === "vi" ? String(v).replace(".", ",") : String(v);
    }
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    return /^[=']/.test(v) || (parseTyped(v, this.lang) && !(st.nf === "@")) ? "'" + v : v;
  }
  usedRange(sh) { const b = this.bounds(sh); return b.maxR < 0 ? null : { r1: 0, c1: 0, r2: b.maxR, c2: b.maxC }; }

  // ── history ──
  snapshot() { return { sheets: this.sheets.map(cloneSheet), active: this.active }; }
  load(snap) {
    this.sheets = snap.sheets; this.active = Math.min(snap.active, snap.sheets.length - 1);
    this.invalidate();
  }
  invalidate() { this.epoch++; for (const s of this.sheets) { s.cache.clear(); s.touch(); } }
  pushUndo(snap) {
    this.undoStack.push(snap); if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }
  tx(fn) {
    if (this._depth > 0) { fn(); return; } // nested: part of the outer undo step
    const snap = this.snapshot();
    this._depth = 1;
    try { fn(); } catch (e) { this._depth = 0; this.load(snap); throw e; }
    this._depth = 0;
    this.pushUndo(snap); this.dirty = true; this.invalidate(); this.emit();
  }
  manualBegin() { return this.snapshot(); }
  manualCommit(snap) { this.pushUndo(snap); this.dirty = true; this.invalidate(); this.emit(); }
  undo() { const s = this.undoStack.pop(); if (!s) return false; this.redoStack.push(this.snapshot()); this.load(s); this.dirty = true; this.emit(); return true; }
  redo() { const s = this.redoStack.pop(); if (!s) return false; this.undoStack.push(this.snapshot()); this.load(s); this.dirty = true; this.emit(); return true; }
  reset(sheets, styles) {
    this.sheets = sheets; this.active = 0;
    if (styles) { this.styles = styles; this.styleIndex = new Map(styles.map((s, i) => [JSON.stringify(s), i])); }
    this.undoStack = []; this.redoStack = []; this.dirty = false; this.invalidate(); this.emit("reset");
  }

  // ── editing ──
  _setInput(sh, r, c, text) {
    const old = this.get(sh, r, c), s = old ? old.s || 0 : 0;
    text = String(text);
    let cell;
    const keep = (x) => { if (x && old) { if (old.h) x.h = old.h; if (old.n) x.n = old.n; } return x; };
    if (text.startsWith("=") && text.length > 1) cell = { f: text.slice(1), s };
    else if (text.startsWith("'")) cell = { v: text.slice(1), s };
    else if (text === "") cell = s ? { s } : null;
    else {
      const st = this.styles[s];
      const p = st.nf === "@" ? null : parseTyped(text, this.lang);
      if (p) {
        cell = { v: p.v, s };
        if (p.nf && (!st.nf || st.nf === "General")) cell.s = this.intern({ ...st, nf: p.nf });
      } else cell = { v: text, s };
    }
    this.put(sh, r, c, keep(cell) || (old && old.n ? { n: old.n } : null));
  }
  setInput(sh, r, c, text) { this.tx(() => this._setInput(sh, r, c, text)); }

  clear(sh, rg, what = "contents") {
    rg = norm(rg);
    this.tx(() => {
      this.eachCell(sh, this.clampArea(sh, rg), (cell, r, c) => {
        if (what === "contents") this.put(sh, r, c, cell.s || cell.n ? { ...(cell.s ? { s: cell.s } : {}), ...(cell.n ? { n: cell.n } : {}) } : null);
        else if (what === "formats") this.put(sh, r, c, cell.v !== undefined || cell.f !== undefined ? { ...cell, s: 0 } : null);
        else this.put(sh, r, c, null);
      });
    });
  }
  clampArea(sh, rg) {
    const b = this.bounds(sh);
    return { r1: rg.r1, c1: rg.c1, r2: Math.min(rg.r2, Math.max(b.maxR, rg.r1) + 200), c2: Math.min(rg.c2, Math.max(b.maxC, rg.c1) + 30) };
  }
  applyStyle(sh, rg, patch) {
    rg = this.clampArea(sh, norm(rg));
    const memo = new Map();
    const next = (id) => {
      let n = memo.get(id);
      if (n === undefined) { n = this.intern({ ...this.styles[id], ...patch }); memo.set(id, n); }
      return n;
    };
    this.tx(() => {
      for (let r = rg.r1; r <= rg.r2; r++) for (let c = rg.c1; c <= rg.c2; c++) {
        const cell = this.get(sh, r, c), id = cell ? cell.s || 0 : 0, nid = next(id);
        if (nid !== id || !cell) this.put(sh, r, c, { ...(cell || {}), s: nid });
      }
    });
  }
  // borders: mode all|outer|top|bottom|left|right|none
  applyBorder(sh, rg, mode, color = "#444444") {
    rg = this.clampArea(sh, norm(rg));
    this.tx(() => {
      for (let r = rg.r1; r <= rg.r2; r++) for (let c = rg.c1; c <= rg.c2; c++) {
        const cell = this.get(sh, r, c), st = { ...this.styles[cell ? cell.s || 0 : 0] };
        const set = (k, on) => { st[k] = on ? color : undefined; };
        if (mode === "none") { set("bT", 0); set("bB", 0); set("bL", 0); set("bR", 0); }
        else {
          if (mode === "all" || (mode === "outer" && r === rg.r1) || mode === "top" && r === rg.r1) set("bT", 1);
          if (mode === "all" || (mode === "outer" && r === rg.r2) || mode === "bottom" && r === rg.r2) set("bB", 1);
          if (mode === "all" || (mode === "outer" && c === rg.c1) || mode === "left" && c === rg.c1) set("bL", 1);
          if (mode === "all" || (mode === "outer" && c === rg.c2) || mode === "right" && c === rg.c2) set("bR", 1);
        }
        const nid = this.intern(st);
        if (nid !== (cell ? cell.s || 0 : 0) || !cell) this.put(sh, r, c, { ...(cell || {}), s: nid });
      }
    });
  }

  merge(sh, rg) {
    rg = norm(rg);
    if (rg.r1 === rg.r2 && rg.c1 === rg.c2) return;
    this.tx(() => {
      sh.merges = sh.merges.filter((m) => m.r2 < rg.r1 || m.r1 > rg.r2 || m.c2 < rg.c1 || m.c1 > rg.c2);
      this.eachCell(sh, rg, (cell, r, c) => { if (r !== rg.r1 || c !== rg.c1) this.put(sh, r, c, cell.s ? { s: cell.s } : null); });
      sh.merges.push({ ...rg }); sh.touch();
    });
  }
  unmerge(sh, rg) {
    rg = norm(rg);
    this.tx(() => { sh.merges = sh.merges.filter((m) => m.r2 < rg.r1 || m.r1 > rg.r2 || m.c2 < rg.c1 || m.c1 > rg.c2); sh.touch(); });
  }

  // ── rows / columns ──
  insertLines(sh, axis, idx, n = 1) { this.tx(() => this._shift(sh, axis, idx, n)); }
  deleteLines(sh, axis, idx, n = 1) { this.tx(() => this._shift(sh, axis, idx, -n)); }
  _shift(sh, axis, idx, n) {
    const isRow = axis === "row", cnt = Math.abs(n);
    for (const other of this.sheets) {
      for (const [k, cell] of [...other.cells]) {
        if (cell.f === undefined) continue;
        const nf = rewriteFormula(cell.f, (ref) => {
          const target = ref.sheet ? this.sheetByName(ref.sheet) : other;
          return target === sh ? adjustRefLines(ref, axis, idx, n) : ref;
        });
        if (nf !== cell.f) other.cells.set(k, { ...cell, f: nf });
      }
    }
    const nm = new Map();
    for (const [k, cell] of sh.cells) {
      let r = keyRow(k), c = keyCol(k);
      const p = isRow ? r : c;
      if (n > 0) { if (p >= idx) { if (isRow) r += n; else c += n; } }
      else { if (p >= idx && p < idx + cnt) continue; if (p >= idx + cnt) { if (isRow) r -= cnt; else c -= cnt; } }
      if (r >= MAX_ROWS || c >= MAX_COLS) continue;
      nm.set(key(r, c), cell);
    }
    sh.cells = nm;
    const mapSizes = (obj) => {
      const o = {};
      for (const [i, v] of Object.entries(obj)) {
        let p = +i;
        if (n > 0) { if (p >= idx) p += n; } else { if (p >= idx && p < idx + cnt) continue; if (p >= idx + cnt) p -= cnt; }
        o[p] = v;
      }
      return o;
    };
    const mapSet = (set) => new Set([...set].map((i) => { const sp = adjustSpan(i, i, idx, n); return sp ? sp[0] : -1; }).filter((i) => i >= 0));
    if (isRow) sh.mhidden = mapSet(sh.mhidden); else sh.chidden = mapSet(sh.chidden);
    if (isRow) {
      sh.rowH = mapSizes(sh.rowH);
      sh.hidden = new Set([...sh.hidden].map((r) => { const s = adjustSpan(r, r, idx, n); return s ? s[0] : -1; }).filter((r) => r >= 0));
    } else sh.colW = mapSizes(sh.colW);
    sh.merges = sh.merges.map((m) => {
      const s = isRow ? adjustSpan(m.r1, m.r2, idx, n) : adjustSpan(m.c1, m.c2, idx, n);
      if (!s) return null;
      return isRow ? { ...m, r1: s[0], r2: s[1] } : { ...m, c1: s[0], c2: s[1] };
    }).filter((m) => m && (m.r1 !== m.r2 || m.c1 !== m.c2));
    if (sh.filter) {
      const f = sh.filter, s = isRow ? adjustSpan(f.r1, f.r2, idx, n) : adjustSpan(f.c1, f.c2, idx, n);
      if (!s) sh.filter = null; else if (isRow) { f.r1 = s[0]; f.r2 = s[1]; } else { f.c1 = s[0]; f.c2 = s[1]; f.excl = {}; }
    }
    // conditional-format / validation ranges follow the data
    const fixRg = (rule) => {
      const g = rule.rg, sp = isRow ? adjustSpan(g.r1, g.r2, idx, n) : adjustSpan(g.c1, g.c2, idx, n);
      if (!sp) return false;
      if (isRow) { g.r1 = sp[0]; g.r2 = sp[1]; } else { g.c1 = sp[0]; g.c2 = sp[1]; }
      return true;
    };
    sh.cf = sh.cf.filter(fixRg); sh.dv = sh.dv.filter(fixRg);
    for (const holder of this.sheets) {
      const rw = (txt) => {
        if (typeof txt !== "string" || !txt) return txt;
        const lead = txt.startsWith("="), f = lead ? txt.slice(1) : txt;
        const nf = rewriteFormula(f, (ref) => ((ref.sheet ? this.sheetByName(ref.sheet) : holder) === sh ? adjustRefLines(ref, axis, idx, n) : ref));
        return lead ? "=" + nf : nf;
      };
      for (const rule of [...holder.cf, ...holder.dv]) { if (rule.expr) rule.expr = rw(rule.expr); if (rule.f1) rule.f1 = rw(rule.f1); if (rule.f2) rule.f2 = rw(rule.f2); if (rule.list) rule.list = rw(rule.list); }
    }
    sh.touch();
  }
  setColWidth(sh, c, w) { if (w == null) delete sh.colW[c]; else sh.colW[c] = Math.max(8, Math.round(w)); sh.touch(); }
  setRowHeight(sh, r, h) { if (h == null) delete sh.rowH[r]; else sh.rowH[r] = Math.max(8, Math.round(h)); sh.touch(); }
  setFreeze(sh, r, c) { this.tx(() => { sh.freeze = { r, c }; sh.touch(); }); }

  // ── clipboard / fill / sort ──
  copyPayload(sh, rg) {
    rg = norm(rg);
    const cells = [], lines = [];
    for (let r = rg.r1; r <= rg.r2; r++) {
      const row = [], tl = [];
      for (let c = rg.c1; c <= rg.c2; c++) {
        const cell = this.get(sh, r, c), d = this.display(sh, r, c);
        row.push(cell ? { f: cell.f, v: cell.v, cv: d.err ? undefined : d.v, st: this.styles[cell.s || 0], h: cell.h, n: cell.n } : null);
        tl.push(d.text);
      }
      cells.push(row); lines.push(tl);
    }
    const q = (t) => (/[\t\n"]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t);
    return { rows: rg.r2 - rg.r1 + 1, cols: rg.c2 - rg.c1 + 1, cells, origin: { r: rg.r1, c: rg.c1, sheet: sh.name }, text: lines.map((l) => l.map(q).join("\t")).join("\n") };
  }
  pasteCells(sh, target, payload, mode = "all", skipBlanks = false) {
    const t = norm(target);
    const tw = t.c2 - t.c1 + 1, th = t.r2 - t.r1 + 1;
    const tileR = th > payload.rows && th % payload.rows === 0 ? th / payload.rows : 1;
    const tileC = tw > payload.cols && tw % payload.cols === 0 ? tw / payload.cols : 1;
    this.tx(() => {
      for (let tr = 0; tr < tileR; tr++) for (let tc = 0; tc < tileC; tc++) {
        const r0 = t.r1 + tr * payload.rows, c0 = t.c1 + tc * payload.cols;
        const dr = r0 - payload.origin.r, dc = c0 - payload.origin.c;
        for (let i = 0; i < payload.rows; i++) for (let j = 0; j < payload.cols; j++) {
          const r = r0 + i, c = c0 + j;
          if (r >= MAX_ROWS || c >= MAX_COLS) continue;
          const src = payload.cells[i][j], old = this.get(sh, r, c);
          if (!src) { if (mode !== "formats" && !skipBlanks) this.put(sh, r, c, old && old.s && (mode === "values" || mode === "formulas") ? { s: old.s } : null); continue; }
          const sid = mode === "values" || mode === "formulas" ? (old ? old.s || 0 : 0) : this.intern(src.st);
          let cell;
          if (mode === "formats") cell = { ...(old || {}), s: sid };
          else if (mode === "formulas") cell = src.f !== undefined ? { f: shiftFormula(src.f, dr, dc), s: sid } : { v: src.v, s: sid };
          else if (mode === "values") { const v = src.f !== undefined ? src.cv : src.v; cell = { v: v === null ? undefined : v, s: sid }; }
          else cell = src.f !== undefined ? { f: shiftFormula(src.f, dr, dc), s: sid } : { v: src.v, s: sid };
          if (mode === "all") { if (src.h) cell.h = src.h; if (src.n) cell.n = src.n; }
          this.put(sh, r, c, cell);
        }
      }
    });
    return { r1: t.r1, c1: t.c1, r2: t.r1 + payload.rows * tileR - 1, c2: t.c1 + payload.cols * tileC - 1 };
  }
  pasteText(sh, r0, c0, grid) {
    this.tx(() => grid.forEach((row, i) => row.forEach((t, j) => { if (r0 + i < MAX_ROWS && c0 + j < MAX_COLS) this._setInput(sh, r0 + i, c0 + j, t); })));
    return { r1: r0, c1: c0, r2: r0 + grid.length - 1, c2: c0 + Math.max(...grid.map((r) => r.length)) - 1 };
  }

  // Fill src (normalized range) into tgt (range containing src, extended in one direction)
  fill(sh, src, tgt) {
    src = norm(src); tgt = norm(tgt);
    const down = tgt.r2 > src.r2, up = tgt.r1 < src.r1, right = tgt.c2 > src.c2, left = tgt.c1 < src.c1;
    if (!(down || up || right || left)) return;
    const vertical = down || up;
    this.tx(() => {
      const lines = vertical ? src.c2 - src.c1 + 1 : src.r2 - src.r1 + 1;
      for (let li = 0; li < lines; li++) {
        const pos = [];
        const len = vertical ? src.r2 - src.r1 + 1 : src.c2 - src.c1 + 1;
        for (let k = 0; k < len; k++) pos.push(vertical ? [src.r1 + k, src.c1 + li] : [src.r1 + li, src.c1 + k]);
        const cells = pos.map(([r, c]) => this.get(sh, r, c));
        const dirFwd = down || right;
        const count = vertical ? (down ? tgt.r2 - src.r2 : src.r1 - tgt.r1) : (right ? tgt.c2 - src.c2 : src.c1 - tgt.c1);
        const gen = this._series(cells, count, dirFwd);
        for (let k = 1; k <= count; k++) {
          const [sr, sc] = dirFwd ? pos[pos.length - 1] : pos[0];
          const r = vertical ? (dirFwd ? sr + k : sr - k) : sr, c = vertical ? sc : (dirFwd ? sc + k : sc - k);
          const srcIdx = dirFwd ? (k - 1) % len : len - 1 - ((k - 1) % len);
          const base = cells[srcIdx], [br, bc] = pos[srcIdx];
          const out = gen[k - 1];
          if (out !== undefined) this.put(sh, r, c, out === null ? null : { v: out.v, s: out.s });
          else if (base && base.f !== undefined) this.put(sh, r, c, { f: shiftFormula(base.f, r - br, c - bc), s: base.s });
          else this.put(sh, r, c, base ? { ...base, rv: undefined } : null);
        }
      }
    });
  }
  // returns array (length count) of {v,s} for linear/text series, or undefined entries meaning "copy"
  _series(cells, count, fwd) {
    const out = new Array(count).fill(undefined);
    const raw = cells.map((c) => (c && c.f === undefined ? c.v : undefined));
    const n = cells.length;
    if (cells.some((c) => c && c.f !== undefined)) return out;
    const s0 = cells[0] ? cells[0].s || 0 : 0;
    const numericAll = n >= 1 && raw.every((v) => typeof v === "number");
    if (numericAll && (n >= 2 || isDateFormat(this.styles[s0].nf))) {
      const step = n >= 2 ? (raw[n - 1] - raw[0]) / (n - 1) : 1;
      const base = fwd ? raw[n - 1] : raw[0], sid = fwd ? (cells[n - 1].s || 0) : s0;
      for (let k = 1; k <= count; k++) out[k - 1] = { v: base + (fwd ? step : -step) * k, s: sid };
      return out;
    }
    const m = n >= 1 && raw.every((v) => typeof v === "string") ? raw.map((v) => /^(.*?)(\d+)$/.exec(v)) : null;
    if (m && m.every((x) => x && x[1] === m[0][1])) {
      const nums = m.map((x) => parseInt(x[2], 10)), width = m[0][2].length;
      const step = n >= 2 ? (nums[n - 1] - nums[0]) / (n - 1) : 1;
      const base = fwd ? nums[n - 1] : nums[0], sid = fwd ? (cells[n - 1].s || 0) : s0;
      for (let k = 1; k <= count; k++) {
        const val = base + (fwd ? step : -step) * k;
        out[k - 1] = { v: m[0][1] + (m[0][2].startsWith("0") ? String(Math.max(val, 0)).padStart(width, "0") : String(val)), s: sid };
      }
      return out;
    }
    return out;
  }

  sort(sh, rg, col, asc = true, header = false) { this.sortMulti(sh, rg, [{ col, asc }], header); }
  /** keys: [{col, asc}] applied in order (Excel's custom sort) */
  sortMulti(sh, rg, keys, header = false) {
    rg = norm(rg);
    const r0 = rg.r1 + (header ? 1 : 0);
    if (r0 >= rg.r2 || !keys.length) return;
    const rank = (v) => (v === null || v === "" ? 9 : typeof v === "number" ? 1 : typeof v === "string" ? 2 : typeof v === "boolean" ? 3 : 4);
    const rows = [];
    for (let r = r0; r <= rg.r2; r++) {
      const cells = []; for (let c = rg.c1; c <= rg.c2; c++) cells.push(this.get(sh, r, c));
      rows.push({ r, cells, ks: keys.map((k) => this.value(sh, r, k.col)) });
    }
    rows.sort((a, b) => {
      for (let i = 0; i < keys.length; i++) {
        const x = a.ks[i], y = b.ks[i], ra = rank(x), rb = rank(y);
        if (ra === 9 || rb === 9) { if (ra !== rb) return ra === 9 ? 1 : -1; continue; }
        const d = ra !== rb ? ra - rb : typeof x === "string" ? x.localeCompare(y, undefined, { sensitivity: "base", numeric: true }) : x < y ? -1 : x > y ? 1 : 0;
        if (d !== 0) return keys[i].asc === false ? -d : d;
      }
      return a.r - b.r;
    });
    this.tx(() => {
      rows.forEach((row, i) => {
        const nr = r0 + i;
        row.cells.forEach((cell, j) => {
          const c = rg.c1 + j;
          this.put(sh, nr, c, cell && cell.f !== undefined ? { ...cell, f: shiftFormula(cell.f, nr - row.r, 0) } : cell || null);
        });
      });
    });
  }

  // ── filter ──
  setFilter(sh, rg) { this.tx(() => { sh.filter = rg ? { ...norm(rg), excl: {} } : null; sh.hidden = new Set(); sh.touch(); }); }
  applyFilter(sh, excl) {
    this.tx(() => {
      const f = sh.filter; if (!f) return;
      f.excl = excl; sh.hidden = new Set();
      for (let r = f.r1 + 1; r <= f.r2; r++) {
        for (const [col, set] of Object.entries(excl)) {
          if (set.size && set.has(this.display(sh, r, +col).text)) { sh.hidden.add(r); break; }
        }
      }
      sh.touch();
    });
  }

  // ── sheets ──
  uniqueName(base, except = null) {
    let name = base, i = 2;
    while (this.sheets.some((s) => s !== except && s.name.toLowerCase() === name.toLowerCase())) name = `${base} (${i++})`;
    return name;
  }
  addSheet(name) { this.tx(() => { this.sheets.push(new Sheet(this.uniqueName(name || "Sheet" + (this.sheets.length + 1)))); this.active = this.sheets.length - 1; }); }
  deleteSheet(i) {
    if (this.sheets.length < 2) return;
    this.tx(() => {
      const gone = this.sheets[i];
      this.sheets.splice(i, 1);
      for (const sh of this.sheets) sh.charts = sh.charts.filter((ch) => ch.src.sheet.toLowerCase() !== gone.name.toLowerCase());
      for (const sh of this.sheets) for (const [k, cell] of [...sh.cells]) {
        if (cell.f === undefined) continue;
        const nf = rewriteFormula(cell.f, (ref) => (ref.sheet && ref.sheet.toLowerCase() === gone.name.toLowerCase() ? null : ref));
        if (nf !== cell.f) sh.cells.set(k, { ...cell, f: nf });
      }
      this.active = Math.min(this.active, this.sheets.length - 1);
    });
  }
  renameSheet(i, name) {
    name = name.trim();
    if (!name || name.length > 31 || /[\[\]:*?/\\]/.test(name) || this.sheets.some((s, k) => k !== i && s.name.toLowerCase() === name.toLowerCase())) return false;
    this.tx(() => {
      const old = this.sheets[i].name;
      for (const sh of this.sheets) for (const [k, cell] of [...sh.cells]) {
        if (cell.f === undefined) continue;
        const nf = rewriteFormula(cell.f, (ref) => (ref.sheet && ref.sheet.toLowerCase() === old.toLowerCase() ? { ...ref, sheet: name } : ref));
        if (nf !== cell.f) sh.cells.set(k, { ...cell, f: nf });
      }
      for (const sh of this.sheets) for (const ch of sh.charts) if (ch.src.sheet.toLowerCase() === old.toLowerCase()) ch.src.sheet = name;
      this.sheets[i].name = name;
    });
    return true;
  }
  duplicateSheet(i) {
    this.tx(() => { const c = cloneSheet(this.sheets[i]); c.name = this.uniqueName(this.sheets[i].name); this.sheets.splice(i + 1, 0, c); this.active = i + 1; });
  }
  moveSheet(i, d) {
    const j = i + d; if (j < 0 || j >= this.sheets.length) return;
    this.tx(() => { const [s] = this.sheets.splice(i, 1); this.sheets.splice(j, 0, s); this.active = j; });
  }
  setTabColor(i, color) { this.tx(() => { this.sheets[i].tab = color; }); }

  // ── conditional formatting & data validation ──
  setCF(sh, rules) { this.tx(() => { sh.cf = deep(rules); sh.touch(); }); }
  addCF(sh, rule) { this.tx(() => { sh.cf.push({ ...deep(rule), id: rule.id || uid() }); sh.touch(); }); }
  clearCF(sh, rg) { this.tx(() => { sh.cf = rg ? sh.cf.filter((r) => !overlaps(r.rg, norm(rg))) : []; sh.touch(); }); }
  setDV(sh, rg, rule) {
    rg = norm(rg);
    this.tx(() => {
      sh.dv = sh.dv.filter((d) => !inside(d.rg, rg));
      if (rule) sh.dv.push({ ...deep(rule), id: uid(), rg: { ...rg } });
      sh.touch();
    });
  }
  dvAt(sh, r, c) { for (let i = sh.dv.length - 1; i >= 0; i--) { const g = sh.dv[i].rg; if (r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2) return sh.dv[i]; } return null; }

  // ── notes, hyperlinks ──
  setNote(sh, r, c, text) {
    this.tx(() => {
      const cell = { ...(this.get(sh, r, c) || {}) };
      if (text) cell.n = text; else delete cell.n;
      this.put(sh, r, c, cell);
    });
  }
  setLink(sh, r, c, url, text) {
    this.tx(() => {
      const old = this.get(sh, r, c), cell = { ...(old || {}) };
      if (url) {
        cell.h = url;
        if (text) { delete cell.f; cell.v = text; } else if (cell.v === undefined && cell.f === undefined) cell.v = url;
        const st = this.styles[cell.s || 0];
        if (!st.u || !st.fc) cell.s = this.intern({ ...st, u: true, fc: "#0b57d0" });
      } else {
        delete cell.h;
        const st = this.styles[cell.s || 0];
        if (st.u && st.fc === "#0b57d0") { const n = { ...st }; delete n.u; delete n.fc; cell.s = this.intern(n); }
      }
      this.put(sh, r, c, cell);
    });
  }

  // ── hide / unhide ──
  hideLines(sh, axis, a, b, hide) {
    this.tx(() => {
      const set = axis === "row" ? sh.mhidden : sh.chidden;
      for (let i = Math.max(0, a); i <= b; i++) { if (hide) set.add(i); else { set.delete(i); if (axis === "row") sh.hidden.delete(i); } }
      sh.touch();
    });
  }

  // ── data tools ──
  removeDuplicates(sh, rg, cols, header) {
    rg = norm(rg);
    const r0 = rg.r1 + (header ? 1 : 0), seen = new Set(), keep = [];
    let removed = 0;
    for (let r = r0; r <= rg.r2; r++) {
      const k = cols.map((c) => this.display(sh, r, c).text.toLowerCase()).join("\u0001");
      if (seen.has(k)) { removed++; continue; }
      seen.add(k); keep.push(r);
    }
    if (!removed) return 0;
    this.tx(() => {
      const rows = keep.map((r) => ({ r, cells: Array.from({ length: rg.c2 - rg.c1 + 1 }, (_, j) => this.get(sh, r, rg.c1 + j)) }));
      rows.forEach((row, i) => row.cells.forEach((cell, j) => this.put(sh, r0 + i, rg.c1 + j, cell && cell.f !== undefined ? { ...cell, f: shiftFormula(cell.f, r0 + i - row.r, 0) } : cell || null)));
      for (let r = r0 + rows.length; r <= rg.r2; r++) for (let c = rg.c1; c <= rg.c2; c++) this.put(sh, r, c, null);
    });
    return removed;
  }
  /** splits the text of every cell in `rg` (one column) into the cells on its right */
  textToColumns(sh, rg, { delims = [","], consecutive = false, quote = '"' } = {}) {
    rg = norm(rg);
    this.tx(() => {
      for (let r = rg.r1; r <= rg.r2; r++) {
        const text = this.rawInput(sh, r, rg.c1); if (text === "") continue;
        const parts = splitText(text.replace(/^'/, ""), delims, consecutive, quote);
        parts.forEach((p, i) => { if (rg.c1 + i < MAX_COLS) this._setInput(sh, r, rg.c1 + i, p); });
      }
    });
  }
  setStyleId(sh, rg, id) {
    rg = this.clampArea(sh, norm(rg));
    this.tx(() => { for (let r = rg.r1; r <= rg.r2; r++) for (let c = rg.c1; c <= rg.c2; c++) { const cell = this.get(sh, r, c); if ((cell ? cell.s || 0 : 0) !== id) this.put(sh, r, c, { ...(cell || {}), s: id }); } });
  }
  /** Paste special: mode all|values|formulas|formats|notes, op none|add|sub|mul|div, skipBlanks, transpose */
  pasteSpecial(sh, target, payload, { mode = "all", op = "none", skipBlanks = false, transpose = false } = {}) {
    let p = payload;
    if (transpose) {
      const cells = Array.from({ length: p.cols }, (_, j) => Array.from({ length: p.rows }, (_, i) => { const x = p.cells[i][j]; return x ? { ...x, f: undefined, v: x.f !== undefined ? x.cv : x.v, h: x.h, n: x.n } : null; }));
      p = { ...p, rows: p.cols, cols: p.rows, cells };
    }
    const t = norm(target);
    if (op !== "none") {
      this.tx(() => {
        for (let i = 0; i < p.rows; i++) for (let j = 0; j < p.cols; j++) {
          const src = p.cells[i][j], r = t.r1 + i, c = t.c1 + j; if (!src) continue;
          const sv = src.f !== undefined ? src.cv : src.v; if (typeof sv !== "number") continue;
          const cur = this.value(sh, r, c), old = this.get(sh, r, c);
          if (typeof cur !== "number") { if (cur === null) this.put(sh, r, c, { ...(old || {}), v: op === "sub" ? -sv : sv }); continue; }
          const v = op === "add" ? cur + sv : op === "sub" ? cur - sv : op === "mul" ? cur * sv : sv === 0 ? undefined : cur / sv;
          if (v !== undefined) this.put(sh, r, c, { ...(old || {}), v, f: undefined });
        }
      });
      return { r1: t.r1, c1: t.c1, r2: t.r1 + p.rows - 1, c2: t.c1 + p.cols - 1 };
    }
    const cells = skipBlanks ? p.cells.map((row) => row.map((x) => x)) : p.cells;
    const rg = this.pasteCells(sh, target, { ...p, cells }, mode === "values" || mode === "formats" ? mode : mode === "formulas" ? "formulas" : "all", skipBlanks);
    return rg;
  }
  /** Formats a range as a table: coloured header, banded rows, thin borders, filter buttons */
  formatTable(sh, rg, scheme, header = true) {
    rg = norm(rg);
    this.tx(() => {
      for (let r = rg.r1; r <= rg.r2; r++) for (let c = rg.c1; c <= rg.c2; c++) {
        const cell = this.get(sh, r, c), st = { ...this.styles[cell ? cell.s || 0 : 0] };
        const isHead = header && r === rg.r1, band = (r - rg.r1 - (header ? 1 : 0)) % 2 === 1;
        delete st.bg; delete st.fc;
        if (isHead) { st.bg = scheme.head; st.fc = scheme.headText || "#ffffff"; st.b = true; }
        else if (band) st.bg = scheme.band;
        st.bB = scheme.line; if (r === rg.r1) st.bT = scheme.line;
        this.put(sh, r, c, { ...(cell || {}), s: this.intern(st) });
      }
      if (header && !sh.filter && rg.r2 > rg.r1) { sh.filter = { ...rg, excl: {} }; sh.hidden = new Set(); }
      sh.touch();
    });
  }

  // ── charts ──
  addChart(sh, chart) { const id = uid(); this.tx(() => { sh.charts.push({ ...deep(chart), id }); sh.touch(); }); return id; }
  updateChart(sh, id, patch) { this.tx(() => { const i = sh.charts.findIndex((c) => c.id === id); if (i >= 0) sh.charts[i] = { ...sh.charts[i], ...patch }; sh.touch(); }); }
  deleteChart(sh, id) { this.tx(() => { sh.charts = sh.charts.filter((c) => c.id !== id); sh.touch(); }); }

  // ── statistics for the status bar ──
  stats(sh, rg) {
    rg = norm(rg);
    let sum = 0, count = 0, nums = 0, min = Infinity, max = -Infinity;
    this.eachValue(sh, rg, (v) => {
      if (v instanceof XErr) return;
      if (v !== "") count++;
      if (typeof v === "number") { nums++; sum += v; if (v < min) min = v; if (v > max) max = v; }
    });
    return { sum, count, nums, min: nums ? min : null, max: nums ? max : null, avg: nums ? sum / nums : null };
  }
}
