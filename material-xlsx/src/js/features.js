// Conditional formatting and data validation engines (pure logic, no DOM).
import { parse, evaluate, XErr, toNum } from "./formula.js";
import { shiftFormula, parseRef, key } from "./refs.js";
import { parseTyped } from "./numfmt.js";

const hexToRgb = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const rgbToHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const lerpColor = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.map((v, i) => v + (y[i] - v) * t)); };
const inRange = (g, r, c) => r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2;
const percentile = (sorted, p) => { const pos = p * (sorted.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos); return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo); };

/** Operand text: "=A1" is a formula, otherwise a number or plain text. */
function operand(book, sh, txt, lang) {
  if (txt === undefined || txt === null || txt === "") return null;
  txt = String(txt);
  if (txt.startsWith("=") && txt.length > 1) {
    try { const v = evaluate(parse(txt.slice(1)), { env: book.env, sheet: sh, r: 0, c: 0 }); return v instanceof XErr ? null : v; } catch { return null; }
  }
  const p = parseTyped(txt, lang);
  return p ? p.v : txt;
}
const cmpOp = (op, v, a, b) => {
  switch (op) {
    case "gt": return v > a; case "lt": return v < a; case "ge": return v >= a; case "le": return v <= a;
    case "eq": return v === a; case "ne": return v !== a;
    case "between": return v >= Math.min(a, b) && v <= Math.max(a, b);
    case "nbetween": return v < Math.min(a, b) || v > Math.max(a, b);
    default: return false;
  }
};

// ───────────────────────── conditional formatting ─────────────────────────
function compile(book, sh) {
  const out = [];
  for (const rule of sh.cf) {
    const g = rule.rg, nums = [], texts = new Map();
    const needNums = ["top", "avg", "scale", "bar"].includes(rule.type), needDup = rule.type === "dup";
    if (needNums || needDup) {
      book.eachValue(sh, g, (v, r, c) => {
        if (needNums && typeof v === "number") nums.push(v);
        if (needDup) { const k = book.display(sh, r, c).text.toLowerCase(); texts.set(k, (texts.get(k) || 0) + 1); }
      });
    }
    const x = { rule, g };
    if (nums.length) {
      const sorted = nums.slice().sort((a, b) => a - b);
      x.min = sorted[0]; x.max = sorted[sorted.length - 1]; x.mid = percentile(sorted, 0.5); x.avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      if (rule.type === "top") {
        const cnt = Math.max(1, rule.percent ? Math.floor((rule.n / 100) * sorted.length) : Math.min(rule.n, sorted.length));
        x.thr = rule.bottom ? sorted[Math.min(cnt, sorted.length) - 1] : sorted[Math.max(0, sorted.length - cnt)];
      }
    }
    x.texts = texts;
    if (rule.type === "cell") { x.a = operand(book, sh, rule.v1, book.lang); x.b = operand(book, sh, rule.v2, book.lang); }
    out.push(x);
  }
  const paintsEmpty = out.some((x) => x.rule.type === "expr" || x.rule.type === "blank");
  return { out, paintsEmpty };
}
function state(book, sh) {
  const stamp = book.epoch * 1e6 + sh.ver;
  if (!sh._cf || sh._cf.stamp !== stamp) sh._cf = { stamp, ...compile(book, sh) };
  return sh._cf;
}
export const hasCF = (sh) => sh.cf.length > 0;
export const cfPaintsEmpty = (book, sh) => sh.cf.length > 0 && state(book, sh).paintsEmpty;

/** Merged style produced by all conditional formats for one cell, or null. */
export function cfStyle(book, sh, r, c) {
  if (!sh.cf.length) return null;
  const { out } = state(book, sh);
  let res = null;
  const set = (k, v) => { if (!res) res = {}; if (res[k] === undefined) res[k] = v; };
  const v = book.value(sh, r, c), isNum = typeof v === "number";
  for (const x of out) {
    const { rule, g } = x;
    if (!inRange(g, r, c)) continue;
    let hit = false, extra = null;
    switch (rule.type) {
      case "cell": {
        if (v === null || x.a === null) break;
        if (isNum && typeof x.a === "number") hit = cmpOp(rule.op, v, x.a, typeof x.b === "number" ? x.b : 0);
        else if (rule.op === "eq" || rule.op === "ne") hit = (String(v).toLowerCase() === String(x.a).toLowerCase()) === (rule.op === "eq");
        break;
      }
      case "text": {
        if (v === null) break;
        const t = book.display(sh, r, c).text.toLowerCase(), q = String(rule.text || "").toLowerCase();
        hit = rule.op === "contains" ? t.includes(q) : rule.op === "ncontains" ? !t.includes(q) : rule.op === "begins" ? t.startsWith(q) : t.endsWith(q);
        break;
      }
      case "dup": { if (v === null) break; const n = x.texts.get(book.display(sh, r, c).text.toLowerCase()) || 0; hit = rule.unique ? n === 1 : n > 1; break; }
      case "top": hit = isNum && x.thr !== undefined && (rule.bottom ? v <= x.thr : v >= x.thr); break;
      case "avg": hit = isNum && x.avg !== undefined && (rule.below ? v < x.avg : v > x.avg); break;
      case "blank": hit = (v === null || v === "") === !rule.not; break;
      case "expr": {
        try {
          const f = shiftFormula(String(rule.expr || "").replace(/^=/, ""), r - g.r1, c - g.c1);
          const res0 = evaluate(parse(f), { env: book.env, sheet: sh, r, c });
          hit = !(res0 instanceof XErr) && res0 !== null && res0 !== false && res0 !== 0 && res0 !== "";
        } catch { hit = false; }
        break;
      }
      case "scale": {
        if (!isNum || x.min === undefined) break;
        const cols = rule.colors, span = x.max - x.min, t = span === 0 ? 0.5 : (v - x.min) / span;
        if (cols.length === 3) { const t2 = span === 0 ? 0.5 : (v - x.min) / (x.mid - x.min || 1); extra = { bg: v <= x.mid ? lerpColor(cols[0], cols[1], Math.max(0, Math.min(1, t2))) : lerpColor(cols[1], cols[2], Math.max(0, Math.min(1, (v - x.mid) / (x.max - x.mid || 1)))) }; }
        else extra = { bg: lerpColor(cols[0], cols[1], Math.max(0, Math.min(1, t))) };
        hit = true; break;
      }
      case "bar": {
        if (!isNum || x.min === undefined) break;
        const lo = Math.min(0, x.min), span = x.max - lo || 1;
        extra = { bar: { pct: Math.max(0.04, (v - lo) / span), color: rule.color || "#4f8cff" } };
        hit = true; break;
      }
      default: break;
    }
    if (!hit) continue;
    if (extra) { for (const [k, val] of Object.entries(extra)) set(k, val); }
    else if (rule.style) for (const [k, val] of Object.entries(rule.style)) if (val) set(k, val);
  }
  return res;
}

// ───────────────────────── data validation ─────────────────────────
/** Options of a list rule as an array of strings. */
export function dvOptions(book, sh, rule) {
  const src = String(rule.list || "");
  if (src.startsWith("=")) {
    const ref = parseRef(src.slice(1).trim().replace(/^\(|\)$/g, ""));
    if (ref) {
      const target = ref.sheet ? book.sheetByName(ref.sheet) : sh;
      if (!target) return [];
      const out = [], r1 = Math.min(ref.r1, ref.r2), r2 = Math.max(ref.r1, ref.r2), c1 = Math.min(ref.c1, ref.c2), c2 = Math.max(ref.c1, ref.c2);
      const b = book.bounds(target);
      for (let r = r1; r <= Math.min(r2, b.maxR); r++) for (let c = c1; c <= Math.min(c2, b.maxC); c++) { const t = book.display(target, r, c).text; if (t !== "") out.push(t); }
      return out.slice(0, 500);
    }
    return [];
  }
  return src.split(/[,;]/).map((s) => s.trim()).filter((s) => s !== "");
}

/** Checks the text typed into a cell against its validation rule. Returns null when valid, otherwise the rule. */
export function dvViolation(book, sh, r, c, text) {
  const rule = book.dvAt(sh, r, c);
  if (!rule) return null;
  text = String(text);
  if (text.startsWith("=") && text.length > 1) return null;           // formulas are not validated
  const blank = text.trim() === "";
  if (blank) return rule.allowBlank === false ? rule : null;
  const typed = text.startsWith("'") ? { v: text.slice(1) } : parseTyped(text, book.lang);
  const val = typed ? typed.v : text;
  const a = operand(book, sh, rule.f1, book.lang), b = operand(book, sh, rule.f2, book.lang);
  let ok = true;
  switch (rule.type) {
    case "list": ok = dvOptions(book, sh, rule).some((o) => o.toLowerCase() === text.trim().toLowerCase()); break;
    case "whole": ok = typeof val === "number" && Number.isInteger(val) && (a === null || cmpOp(rule.op, val, toNum(a), b === null ? 0 : toNum(b))); break;
    case "decimal": ok = typeof val === "number" && (a === null || cmpOp(rule.op, val, toNum(a), b === null ? 0 : toNum(b))); break;
    case "date": ok = typeof val === "number" && (a === null || cmpOp(rule.op, val, toNum(a), b === null ? 0 : toNum(b))); break;
    case "length": ok = a === null || cmpOp(rule.op, text.trim().length, toNum(a), b === null ? 0 : toNum(b)); break;
    case "custom": {
      const k = key(r, c), old = sh.cells.get(k), s = old ? old.s || 0 : 0;
      sh.cells.set(k, { v: val, s }); book.invalidate();
      try { const res = evaluate(parse(String(rule.expr || "").replace(/^=/, "")), { env: book.env, sheet: sh, r, c }); ok = !(res instanceof XErr) && res !== false && res !== 0 && res !== null; } catch { ok = false; }
      if (old) sh.cells.set(k, old); else sh.cells.delete(k);
      book.invalidate();
      break;
    }
    default: break;
  }
  return ok ? null : rule;
}
