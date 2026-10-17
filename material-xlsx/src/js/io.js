// File I/O: XLSX (via ExcelJS), CSV/TSV and base64 helpers for the Rust bridge.
import { Book, Sheet } from "./model.js";
import { key, keyRow, keyCol, parseAddr } from "./refs.js";
import { XErr } from "./formula.js";
import { isDateFormat, parseTyped, formatValue } from "./numfmt.js";

const THEME = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];
const DEFAULT_FONT = "Calibri", DEFAULT_SIZE = 11;
const px2w = (px) => Math.max(0, (px - 5) / 7);
const w2px = (w) => Math.round(w * 7 + 5);

function tint(hex, t) {
  const ch = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const f = (c) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t);
  return ch.map((c) => f(c).toString(16).padStart(2, "0")).join("");
}
function colorOf(c) {
  if (!c) return undefined;
  if (c.argb) return "#" + String(c.argb).slice(-6).toLowerCase();
  if (c.theme !== undefined) { let h = THEME[c.theme] || "000000"; if (c.tint) h = tint(h, c.tint); return "#" + h.toLowerCase(); }
  return undefined;
}
const argb = (hex) => ({ argb: "FF" + hex.replace("#", "").toUpperCase() });
const dateToSerialJS = (d) => d.getTime() / 86400000 + 25569;

function convertValue(v) {
  if (v instanceof Date) return dateToSerialJS(v);
  if (v && typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return typeof v.text === "object" ? convertValue(v.text) : String(v.text);
    if ("error" in v) return String(v.error);
  }
  return v === undefined ? null : v;
}

// ───────────────────────── rule <-> Excel mapping ─────────────────────────
export const META_SHEET = "__MaterialXlsx";
const quote = (t) => '"' + String(t).replace(/"/g, '""') + '"';
const OPS = { gt: "greaterThan", lt: "lessThan", ge: "greaterThanOrEqual", le: "lessThanOrEqual", eq: "equal", ne: "notEqual", between: "between", nbetween: "notBetween" };
const OPS_BACK = Object.fromEntries(Object.entries(OPS).map(([k, v]) => [v, k]));
/** user text (number, date, text or =formula) -> formula text understood by Excel */
function opOut(txt) {
  txt = String(txt ?? "");
  if (txt.startsWith("=")) return txt.slice(1);
  const p = parseTyped(txt, "en");
  return p && typeof p.v === "number" ? String(p.v) : quote(txt);
}
/** Excel formula text -> user text */
function opIn(f, asDate) {
  f = String(f ?? "").trim();
  if (/^".*"$/.test(f)) return f.slice(1, -1).replace(/""/g, '"');
  if (/^[+-]?\d+(\.\d+)?$/.test(f)) return asDate ? formatValue(parseFloat(f), "yyyy-mm-dd") : f;
  return "=" + f;
}
const dxfOut = (st = {}) => {
  const o = {};
  if (st.fc || st.b || st.i || st.u || st.st) o.font = { ...(st.fc ? { color: argb(st.fc) } : {}), ...(st.b ? { bold: true } : {}), ...(st.i ? { italic: true } : {}), ...(st.u ? { underline: true } : {}), ...(st.st ? { strike: true } : {}) };
  if (st.bg) o.fill = { type: "pattern", pattern: "solid", bgColor: argb(st.bg) };
  return o;
};
const dxfIn = (x = {}) => {
  const st = {}, f = x.font || {}, fl = x.fill || {};
  const fc = colorOf(f.color); if (fc) st.fc = fc;
  if (f.bold) st.b = true; if (f.italic) st.i = true; if (f.underline) st.u = true; if (f.strike) st.st = true;
  const bg = colorOf(fl.bgColor) || colorOf(fl.fgColor); if (bg) st.bg = bg;
  return st;
};
const addrOf = (r, c) => { let n = c + 1, s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s + (r + 1); };
const refOf = (g) => addrOf(Math.min(g.r1, g.r2), Math.min(g.c1, g.c2)) + ":" + addrOf(Math.max(g.r1, g.r2), Math.max(g.c1, g.c2));
const absRef = (g) => refOf(g).replace(/([A-Z]+)(\d+)/g, "$$$1$$$2");

function cfOut(sh) {
  const groups = [];
  let pri = 1;
  for (const r of sh.cf) {
    const tl = addrOf(r.rg.r1, r.rg.c1), rules = [];
    const base = { priority: pri++ };
    switch (r.type) {
      case "cell": rules.push({ ...base, type: "cellIs", operator: OPS[r.op] || "equal", formulae: r.op === "between" || r.op === "nbetween" ? [opOut(r.v1), opOut(r.v2)] : [opOut(r.v1)], style: dxfOut(r.style) }); break;
      case "text": {
        const q = quote(r.text || ""), n = (r.text || "").length;
        const f = r.op === "contains" ? `NOT(ISERROR(SEARCH(${q},${tl})))` : r.op === "ncontains" ? `ISERROR(SEARCH(${q},${tl}))` : r.op === "begins" ? `LEFT(${tl},${n})=${q}` : `RIGHT(${tl},${n})=${q}`;
        rules.push({ ...base, type: "expression", formulae: [f], style: dxfOut(r.style) }); break;
      }
      case "dup": rules.push({ ...base, type: "expression", formulae: [`COUNTIF(${absRef(r.rg)},${tl})${r.unique ? "=1" : ">1"}`], style: dxfOut(r.style) }); break;
      case "top": rules.push({ ...base, type: "top10", rank: r.n, percent: !!r.percent, bottom: !!r.bottom, style: dxfOut(r.style) }); break;
      case "avg": rules.push({ ...base, type: "aboveAverage", aboveAverage: !r.below, style: dxfOut(r.style) }); break;
      case "blank": rules.push({ ...base, type: "expression", formulae: [`LEN(TRIM(${tl}))${r.not ? ">0" : "=0"}`], style: dxfOut(r.style) }); break;
      case "expr": rules.push({ ...base, type: "expression", formulae: [String(r.expr || "").replace(/^=/, "")], style: dxfOut(r.style) }); break;
      case "scale": {
        const three = r.colors.length === 3;
        rules.push({ ...base, type: "colorScale", cfvo: three ? [{ type: "min" }, { type: "percentile", value: 50 }, { type: "max" }] : [{ type: "min" }, { type: "max" }], color: r.colors.map(argb) }); break;
      }
      default: break; // data bars are kept in the hidden metadata sheet
    }
    if (rules.length) groups.push({ ref: refOf(r.rg), rules });
  }
  return groups;
}
function cfIn(ws, sh) {
  for (const group of ws.conditionalFormattings || []) {
    const ranges = String(group.ref || "").split(/\s+/).filter(Boolean);
    for (const ref of ranges) {
      const [a, b] = ref.split(":"), p1 = parseAddr(a), p2 = parseAddr(b || a);
      if (!p1 || !p2) continue;
      const rg = { r1: p1.r, c1: p1.c, r2: p2.r, c2: p2.c };
      for (const x of group.rules || []) {
        const style = dxfIn(x.style), f = x.formulae || [];
        let rule = null;
        if (x.type === "cellIs") rule = { type: "cell", op: OPS_BACK[x.operator] || "eq", v1: opIn(f[0]), v2: f[1] !== undefined ? opIn(f[1]) : "", style };
        else if (x.type === "containsText") rule = { type: "text", op: x.operator === "notContains" ? "ncontains" : x.operator === "beginsWith" ? "begins" : x.operator === "endsWith" ? "ends" : "contains", text: x.text || "", style };
        else if (x.type === "top10") rule = { type: "top", n: x.rank || 10, percent: !!x.percent, bottom: !!x.bottom, style };
        else if (x.type === "aboveAverage") rule = { type: "avg", below: x.aboveAverage === false, style };
        else if (x.type === "colorScale" && x.color && x.color.length >= 2) rule = { type: "scale", colors: x.color.map((c) => colorOf(c) || "#ffffff") };
        else if (x.type === "expression" && f[0]) rule = { type: "expr", expr: f[0], style };
        if (rule) sh.cf.push({ ...rule, rg: { ...rg }, id: "i" + Math.random().toString(36).slice(2, 8) });
      }
    }
  }
}
const DV_TYPES = { whole: "whole", decimal: "decimal", date: "date", length: "textLength", custom: "custom", list: "list" };
function dvOut(d) {
  const base = { allowBlank: d.allowBlank !== false, showErrorMessage: d.showError !== false, errorStyle: { stop: "stop", warn: "warning", info: "information" }[d.alert || "stop"], ...(d.title ? { errorTitle: d.title } : {}), ...(d.msg ? { error: d.msg } : {}), showInputMessage: !!(d.inTitle || d.inMsg), ...(d.inTitle ? { promptTitle: d.inTitle } : {}), ...(d.inMsg ? { prompt: d.inMsg } : {}) };
  if (d.type === "list") {
    const l = String(d.list || "");
    return { ...base, type: "list", formulae: [l.startsWith("=") ? l.slice(1) : quote(l.split(/[,;]/).map((x) => x.trim()).filter(Boolean).join(","))] };
  }
  if (d.type === "custom") return { ...base, type: "custom", formulae: [String(d.expr || "").replace(/^=/, "") || "TRUE"] };
  const two = d.op === "between" || d.op === "nbetween";
  return { ...base, type: DV_TYPES[d.type], operator: OPS[d.op] || "between", formulae: two ? [opOut(d.f1), opOut(d.f2)] : [opOut(d.f1)] };
}
function dvIn(x) {
  const type = Object.keys(DV_TYPES).find((k) => DV_TYPES[k] === x.type);
  if (!type) return null;
  const f = x.formulae || [];
  const d = { type, allowBlank: x.allowBlank !== false, showError: x.showErrorMessage !== false, alert: { stop: "stop", warning: "warn", information: "info" }[x.errorStyle || "stop"] || "stop", title: x.errorTitle || "", msg: x.error || "", inTitle: x.promptTitle || "", inMsg: x.prompt || "" };
  if (type === "list") { const t = String(f[0] ?? ""); d.list = /^".*"$/.test(t) ? t.slice(1, -1).replace(/""/g, '"') : "=" + t; }
  else if (type === "custom") d.expr = String(f[0] ?? "");
  else { d.op = OPS_BACK[x.operator] || "between"; d.f1 = opIn(f[0], type === "date"); d.f2 = f[1] !== undefined ? opIn(f[1], type === "date") : ""; }
  return d;
}

// ───────────────────────── XLSX import ─────────────────────────
export async function importXlsx(bytes) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  const book = new Book();
  const sheets = [];
  let meta = null;
  wb.eachSheet((ws) => {
    if (ws.name === META_SHEET) {
      try { let txt = ""; ws.eachRow((row) => { txt += String(row.getCell(1).value ?? ""); }); meta = JSON.parse(txt); } catch { meta = null; }
      return;
    }
    const sh = new Sheet(ws.name);
    const props = ws.properties || {};
    sh.defW = props.defaultColWidth ? w2px(props.defaultColWidth) : 64;
    sh.defH = props.defaultRowHeight ? Math.round(props.defaultRowHeight * 4 / 3) : 20;
    if (props.tabColor) sh.tab = colorOf(props.tabColor) || null;
    const styleOf = (cell) => {
      const st = {};
      const f = cell.font || {};
      if (f.name && f.name !== DEFAULT_FONT) st.ff = f.name;
      if (f.size && f.size !== DEFAULT_SIZE) st.fs = f.size;
      if (f.bold) st.b = true; if (f.italic) st.i = true; if (f.underline) st.u = true; if (f.strike) st.st = true;
      const fc = colorOf(f.color); if (fc && fc !== "#000000") st.fc = fc;
      const fl = cell.fill;
      if (fl && fl.type === "pattern" && fl.pattern === "solid") { const bg = colorOf(fl.fgColor); if (bg && bg !== "#ffffff") st.bg = bg; }
      const al = cell.alignment || {};
      if (["left", "center", "right"].includes(al.horizontal)) st.ha = al.horizontal;
      if (al.vertical === "top") st.va = "top"; else if (al.vertical === "middle" || al.vertical === "center") st.va = "middle";
      if (al.wrapText) st.wr = true;
      const bd = cell.border || {};
      for (const [k, side] of [["bT", "top"], ["bB", "bottom"], ["bL", "left"], ["bR", "right"]]) if (bd[side] && bd[side].style) st[k] = colorOf(bd[side].color) || "#000000";
      if (cell.numFmt && cell.numFmt !== "General") st.nf = cell.numFmt;
      return book.intern(st);
    };
    ws.eachRow({ includeEmpty: true }, (row, rn) => {
      if (row.height) sh.rowH[rn - 1] = Math.round(row.height * 4 / 3);
      if (row.hidden) sh.mhidden.add(rn - 1);
      row.eachCell({ includeEmpty: false }, (cell, cn) => {
        const r = rn - 1, c = cn - 1;
        if (r >= 1048576 || c >= 16384) return;
        const s = styleOf(cell);
        const out = { s };
        if (cell.type === 6) {          // formula
          if (cell.formula) { out.f = String(cell.formula).replace(/^=/, ""); const rv = convertValue(cell.result); if (rv !== null) out.rv = rv; }
          else { const rv = convertValue(cell.result); if (rv !== null) out.v = rv; }
        } else if (cell.type === 1 || cell.type === 0) { /* merge slave / empty: style only */ }
        else {
          const v = convertValue(cell.value);
          if (v !== null) out.v = v;
          if (cell.type === 4 && !isDateFormat(cell.numFmt)) out.s = book.intern({ ...book.styles[s], nf: "yyyy-mm-dd" });
        }
        if (cell.type === 11 || (cell.hyperlink && cell.type !== 6)) { const h = cell.hyperlink || (cell.value && cell.value.hyperlink); if (h) out.h = String(h); }
        const note = cell.note;
        if (note) { const txt = typeof note === "string" ? note : (note.texts || []).map((x) => x.text).join(""); if (txt) out.n = txt; }
        if (out.v !== undefined || out.f !== undefined || out.s || out.h || out.n) sh.cells.set(key(r, c), out);
      });
    });
    const maxCol = Math.max(ws.columnCount || 0, (ws.columns || []).length);
    for (let i = 1; i <= maxCol; i++) {
      const col = ws.getColumn(i);
      if (col.width) sh.colW[i - 1] = w2px(col.width);
      if (col.hidden) sh.chidden.add(i - 1);
    }
    const merges = (ws.model && ws.model.merges) || [];
    for (const m of merges) {
      const [a, b] = m.split(":"), p1 = parseAddr(a), p2 = parseAddr(b || a);
      if (p1 && p2) sh.merges.push({ r1: p1.r, c1: p1.c, r2: p2.r, c2: p2.c });
    }
    const view = (ws.views || [])[0];
    if (view && view.state === "frozen") sh.freeze = { r: view.ySplit || 0, c: view.xSplit || 0 };
    const af = ws.autoFilter;
    if (af) {
      let p1, p2;
      if (typeof af === "string") { const [a, b] = af.split(":"); p1 = parseAddr(a); p2 = parseAddr(b || a); }
      else if (af.from && af.to) { p1 = { r: af.from.row - 1, c: af.from.column - 1 }; p2 = { r: af.to.row - 1, c: af.to.column - 1 }; }
      if (p1 && p2) {
        sh.filter = { r1: p1.r, c1: p1.c, r2: p2.r, c2: p2.c, excl: {} };
        for (const r of [...sh.mhidden]) if (r > p1.r && r <= p2.r) { sh.mhidden.delete(r); sh.hidden.add(r); }   // rows hidden by the filter
      }
    }
    sh._ws = ws;
    sh.touch();
    sheets.push(sh);
  });
  if (!sheets.length) sheets.push(new Sheet("Sheet1"));
  for (const sh of sheets) {
    const ws = sh._ws; delete sh._ws;
    const m = meta && meta.sheets && meta.sheets[sh.name];
    if (m && Array.isArray(m.cf)) sh.cf = m.cf; else cfIn(ws, sh);
    if (m && Array.isArray(m.charts)) sh.charts = m.charts;
    // data validation (stored per cell or per range by ExcelJS)
    const model = (ws.dataValidations && ws.dataValidations.model) || {};
    const seen = new Map();
    for (const [addrKey, x] of Object.entries(model)) {
      const d = dvIn(x); if (!d) continue;
      for (const ref of addrKey.split(/\s+/)) {
        const [a, b] = ref.split(":"), p1 = parseAddr(a), p2 = parseAddr(b || a); if (!p1 || !p2) continue;
        const sig = JSON.stringify(d);
        sh.dv.push({ ...d, id: "d" + Math.random().toString(36).slice(2, 8), rg: { r1: p1.r, c1: p1.c, r2: p2.r, c2: p2.c } }); seen.set(sig, true);
      }
    }
    sh.dv = mergeDV(sh.dv);
    sh.touch();
  }
  return { sheets, styles: book.styles };
}

// ───────────────────────── XLSX export ─────────────────────────
export async function exportXlsx(book) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Material Xlsx"; wb.created = new Date();
  for (const sh of book.sheets) {
    const ws = wb.addWorksheet(sh.name, {
      views: sh.freeze.r || sh.freeze.c ? [{ state: "frozen", xSplit: sh.freeze.c, ySplit: sh.freeze.r }] : [{}],
      properties: { defaultColWidth: px2w(sh.defW), defaultRowHeight: sh.defH * 0.75, ...(sh.tab ? { tabColor: argb(sh.tab) } : {}) },
    });
    for (const [c, w] of Object.entries(sh.colW)) ws.getColumn(+c + 1).width = px2w(w);
    for (const [r, h] of Object.entries(sh.rowH)) ws.getRow(+r + 1).height = h * 0.75;
    for (const r of sh.hidden) ws.getRow(r + 1).hidden = true;
    for (const r of sh.mhidden) ws.getRow(r + 1).hidden = true;
    for (const c of sh.chidden) { const col = ws.getColumn(c + 1); if (!col.width) col.width = px2w(sh.defW); col.hidden = true; }
    for (const [k, cell] of sh.cells) {
      const r = keyRow(k), c = keyCol(k), x = ws.getCell(r + 1, c + 1);
      if (cell.f !== undefined) {
        const v = book.value(sh, r, c);
        const result = v instanceof XErr ? { error: v.code === "#CIRC!" ? "#VALUE!" : v.code } : v;
        x.value = { formula: cell.f, ...(result !== null && result !== undefined ? { result } : {}) };
      } else if (cell.v !== undefined) x.value = cell.h && typeof cell.v === "string" ? { text: cell.v, hyperlink: cell.h } : cell.v;
      if (cell.n) x.note = cell.n;
      const st = book.styles[cell.s || 0];
      if (st.ff || st.fs || st.b || st.i || st.u || st.st || st.fc) {
        x.font = { name: st.ff || DEFAULT_FONT, size: st.fs || DEFAULT_SIZE, bold: !!st.b, italic: !!st.i, underline: !!st.u, strike: !!st.st, ...(st.fc ? { color: argb(st.fc) } : {}) };
      }
      if (st.bg) x.fill = { type: "pattern", pattern: "solid", fgColor: argb(st.bg) };
      if (st.ha || st.va || st.wr) x.alignment = { ...(st.ha ? { horizontal: st.ha } : {}), ...(st.va ? { vertical: st.va } : {}), ...(st.wr ? { wrapText: true } : {}) };
      const b = {};
      for (const [k, side] of [["bT", "top"], ["bB", "bottom"], ["bL", "left"], ["bR", "right"]]) if (st[k]) b[side] = { style: "thin", color: argb(st[k]) };
      if (Object.keys(b).length) x.border = b;
      if (st.nf) x.numFmt = st.nf;
    }
    for (const m of sh.merges) { try { ws.mergeCells(m.r1 + 1, m.c1 + 1, m.r2 + 1, m.c2 + 1); } catch { /* overlapping merge */ } }
    for (const g of cfOut(sh)) ws.addConditionalFormatting(g);
    for (const d of sh.dv) { try { ws.dataValidations.model[refOf(d.rg)] = dvOut(d); } catch { /* ignore */ } }
    if (sh.filter) ws.autoFilter = { from: { row: sh.filter.r1 + 1, column: sh.filter.c1 + 1 }, to: { row: sh.filter.r2 + 1, column: sh.filter.c2 + 1 } };
  }
  // things Excel cannot hold natively (charts, data bars) travel in a hidden sheet so Material Xlsx restores them
  const extra = {};
  for (const sh of book.sheets) { const o = {}; if (sh.charts.length) o.charts = sh.charts; if (sh.cf.length) o.cf = sh.cf; if (Object.keys(o).length) extra[sh.name] = o; }
  if (Object.keys(extra).length) {
    const ws = wb.addWorksheet(META_SHEET, { state: "veryHidden" }), json = JSON.stringify({ v: 1, sheets: extra });
    for (let i = 0, r = 1; i < json.length; i += 30000, r++) ws.getCell(r, 1).value = json.slice(i, i + 30000);
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
/** adjacent cells that carry the same rule are shown as one rule */
function mergeDV(list) {
  const out = [];
  for (const d of list) {
    const sig = JSON.stringify({ ...d, id: 0, rg: 0 }), prev = out.find((o) => JSON.stringify({ ...o, id: 0, rg: 0 }) === sig && ((o.rg.c1 === d.rg.c1 && o.rg.c2 === d.rg.c2 && o.rg.r2 + 1 === d.rg.r1) || (o.rg.r1 === d.rg.r1 && o.rg.r2 === d.rg.r2 && o.rg.c2 + 1 === d.rg.c1)));
    if (prev) { prev.rg.r2 = Math.max(prev.rg.r2, d.rg.r2); prev.rg.c2 = Math.max(prev.rg.c2, d.rg.c2); } else out.push(d);
  }
  return out;
}

// ───────────────────────── CSV / TSV ─────────────────────────
export function detectDelimiter(text) {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n");
  const score = (d) => (head.match(new RegExp(d === "\t" ? "\\t" : "\\" + d, "g")) || []).length;
  const best = [",", ";", "\t", "|"].map((d) => [d, score(d)]).sort((a, b) => b[1] - a[1])[0];
  return best[1] ? best[0] : ",";
}
export function parseDelimited(text, delim = ",") {
  text = text.replace(/^\uFEFF/, "");
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
    } else if (ch === '"' && cur === "") q = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
export function toCSV(book, sh, delim = ",") {
  const b = book.bounds(sh);
  const q = (t) => (new RegExp(`[${delim === "\t" ? "\\t" : delim}"\\n\\r]`).test(t) ? '"' + t.replace(/"/g, '""') + '"' : t);
  const lines = [];
  for (let r = 0; r <= b.maxR; r++) {
    const row = [];
    for (let c = 0; c <= b.maxC; c++) row.push(q(book.display(sh, r, c).text));
    lines.push(row.join(delim));
  }
  return "\uFEFF" + lines.join("\r\n");
}
export function importCSV(text, name, lang) {
  const book = new Book(); book.lang = lang;
  const grid = parseDelimited(text, detectDelimiter(text));
  const sh = book.sheets[0]; sh.name = name || "Sheet1";
  grid.forEach((row, r) => row.forEach((t, c) => { if (t !== "") book._setInput(sh, r, c, t); }));
  return { sheets: book.sheets, styles: book.styles };
}

// ───────────────────────── base64 ─────────────────────────
export function bytesToBase64(u8) {
  let s = ""; const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return btoa(s);
}
export function base64ToBytes(b64) {
  const s = atob(b64), u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}
