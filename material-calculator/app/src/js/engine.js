// Safe expression engine (no eval): tokenizer -> recursive-descent parser -> evaluator.
export class CalcError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const FN_NAMES = ['asinh', 'acosh', 'atanh', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'sin', 'cos', 'tan',
  'log2', 'log', 'ln', 'sqrt', 'cbrt', 'abs', 'exp', 'floor', 'ceil', 'round'];
const NUM_RE = /(?:\d+\.?\d*|\.\d+)(?:e[+\-\u2212]?\d+)?/y;
const INV_RE = /(sinh|cosh|tanh|sin|cos|tan)\u207B\u00B9/y;
const ID_RE = new RegExp('(?:' + [...FN_NAMES, 'mod', 'Ans', 'pi'].join('|') + ')', 'y');

export function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') { i++; continue; }
    NUM_RE.lastIndex = i;
    let m = NUM_RE.exec(src);
    if (m) { out.push({ t: 'num', v: parseFloat(m[0].replace('\u2212', '-')) }); i += m[0].length; continue; }
    INV_RE.lastIndex = i;
    if ((m = INV_RE.exec(src))) { out.push({ t: 'fn', v: 'a' + m[1] }); i += m[0].length; continue; }
    if (src.startsWith('log\u2082', i)) { out.push({ t: 'fn', v: 'log2' }); i += 4; continue; }
    ID_RE.lastIndex = i;
    if ((m = ID_RE.exec(src))) {
      const w = m[0];
      if (w === 'mod') out.push({ t: 'op', v: 'mod' });
      else if (w === 'Ans') out.push({ t: 'const', v: 'ans' });
      else if (w === 'pi') out.push({ t: 'const', v: 'pi' });
      else out.push({ t: 'fn', v: w });
      i += w.length; continue;
    }
    switch (c) {
      case '+': out.push({ t: 'op', v: '+' }); break;
      case '-': case '\u2212': out.push({ t: 'op', v: '-' }); break;
      case '*': case '\u00D7': out.push({ t: 'op', v: '*' }); break;
      case '/': case '\u00F7': out.push({ t: 'op', v: '/' }); break;
      case '^': out.push({ t: 'op', v: '^' }); break;
      case '(': out.push({ t: 'lp' }); break;
      case ')': out.push({ t: 'rp' }); break;
      case '!': case '%': out.push({ t: 'post', v: c }); break;
      case '\u03C0': out.push({ t: 'const', v: 'pi' }); break;
      case 'e': out.push({ t: 'const', v: 'e' }); break;
      case '\u221A': out.push({ t: 'fn', v: 'sqrt' }); break;
      case '\u221B': out.push({ t: 'fn', v: 'cbrt' }); break;
      default: throw new CalcError('SYNTAX');
    }
    i++;
  }
  return out;
}

const startsOperand = (t) => t.t === 'num' || t.t === 'const' || t.t === 'lp' || t.t === 'fn';

function parse(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  const next = () => tokens[p++];
  const isOp = (t, ...v) => t && t.t === 'op' && v.includes(t.v);

  function expr() {
    let left = term();
    while (isOp(peek(), '+', '-')) {
      const op = next().v; const right = term();
      left = { k: 'add', op, left, right };
    }
    return left;
  }
  function term() {
    let left = unary();
    for (;;) {
      const tk = peek();
      if (!tk) break;
      if (isOp(tk, '*', '/', 'mod')) { next(); left = { k: 'mul', op: tk.v, left, right: unary() }; }
      else if (startsOperand(tk)) left = { k: 'mul', op: '*', left, right: unary() };
      else break;
    }
    return left;
  }
  function unary() {
    const tk = peek();
    if (isOp(tk, '-', '+')) { next(); const a = unary(); return tk.v === '-' ? { k: 'neg', a } : a; }
    return power();
  }
  function power() {
    const base = postfix();
    if (isOp(peek(), '^')) { next(); return { k: 'pow', base, exp: unary() }; }
    return base;
  }
  function postfix() {
    let n = primary();
    while (peek() && peek().t === 'post') n = next().v === '!' ? { k: 'fact', a: n } : { k: 'pct', a: n };
    return n;
  }
  function primary() {
    const tk = next();
    if (!tk) throw new CalcError('SYNTAX');
    if (tk.t === 'num') return { k: 'num', v: tk.v };
    if (tk.t === 'const') return { k: 'const', v: tk.v };
    if (tk.t === 'lp') { const e = expr(); if (peek() && peek().t === 'rp') next(); return e; }
    if (tk.t === 'fn') {
      if (peek() && peek().t === 'lp') { next(); const e = expr(); if (peek() && peek().t === 'rp') next(); return { k: 'fn', f: tk.v, a: e }; }
      return { k: 'fn', f: tk.v, a: unary() };
    }
    throw new CalcError('SYNTAX');
  }
  const tree = expr();
  if (p < tokens.length) throw new CalcError('SYNTAX');
  return tree;
}

// Lanczos approximation for non-integer factorials
const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function gamma(z) {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  let x = LG[0];
  for (let i = 1; i < 9; i++) x += LG[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
export function factorial(x) {
  if (x < 0 && Number.isInteger(x)) throw new CalcError('DOMAIN');
  if (x > 170.5) throw new CalcError('OVERFLOW');
  if (Number.isInteger(x)) { let r = 1; for (let i = 2; i <= x; i++) r *= i; return r; }
  return gamma(x + 1);
}

const TURN = { deg: 360, rad: 2 * Math.PI, grad: 400 };
function trig(kind, x, angle) {
  const turn = TURN[angle], half = turn / 2, quarter = turn / 4;
  const toRad = (v) => (v / turn) * 2 * Math.PI;
  const mult = (v, step) => Math.abs(v / step - Math.round(v / step)) < 1e-12;
  if (angle !== 'rad') {
    if (kind === 'sin') return mult(x, half) ? 0 : Math.sin(toRad(x));
    if (kind === 'cos') return mult(x - quarter, half) ? 0 : Math.cos(toRad(x));
    if (mult(x - quarter, half)) throw new CalcError('DOMAIN');
    return mult(x, half) ? 0 : Math.tan(toRad(x));
  }
  const r = Math[kind](x);
  return Math.abs(r) < 1e-15 ? 0 : r;
}
const fromRad = (r, angle) => (r * TURN[angle]) / (2 * Math.PI);

function applyFn(f, x, angle) {
  const dom = (ok) => { if (!ok) throw new CalcError('DOMAIN'); };
  switch (f) {
    case 'sin': case 'cos': case 'tan': return trig(f, x, angle);
    case 'asin': dom(Math.abs(x) <= 1); return fromRad(Math.asin(x), angle);
    case 'acos': dom(Math.abs(x) <= 1); return fromRad(Math.acos(x), angle);
    case 'atan': return fromRad(Math.atan(x), angle);
    case 'sinh': return Math.sinh(x);
    case 'cosh': return Math.cosh(x);
    case 'tanh': return Math.tanh(x);
    case 'asinh': return Math.asinh(x);
    case 'acosh': dom(x >= 1); return Math.acosh(x);
    case 'atanh': dom(Math.abs(x) < 1); return Math.atanh(x);
    case 'ln': dom(x > 0); return Math.log(x);
    case 'log': dom(x > 0); return Math.log10(x);
    case 'log2': dom(x > 0); return Math.log2(x);
    case 'sqrt': dom(x >= 0); return Math.sqrt(x);
    case 'cbrt': return Math.cbrt(x);
    case 'abs': return Math.abs(x);
    case 'exp': return Math.exp(x);
    case 'floor': return Math.floor(x);
    case 'ceil': return Math.ceil(x);
    case 'round': return Math.round(x);
    default: throw new CalcError('SYNTAX');
  }
}

function ev(n, ctx) {
  switch (n.k) {
    case 'num': return n.v;
    case 'const': return n.v === 'pi' ? Math.PI : n.v === 'e' ? Math.E : ctx.ans;
    case 'neg': return -ev(n.a, ctx);
    case 'pct': return ev(n.a, ctx) / 100;
    case 'fact': return factorial(ev(n.a, ctx));
    case 'pow': {
      const b = ev(n.base, ctx), e = ev(n.exp, ctx);
      if (b === 0 && e < 0) throw new CalcError('DIV0');
      if (b < 0 && !Number.isInteger(e)) throw new CalcError('DOMAIN');
      return Math.pow(b, e);
    }
    case 'mul': {
      const l = ev(n.left, ctx), r = ev(n.right, ctx);
      if (n.op === '*') return l * r;
      if (r === 0) throw new CalcError('DIV0');
      return n.op === '/' ? l / r : l % r;
    }
    case 'add': {
      const l = ev(n.left, ctx);
      // "100 + 10%" means 100 + 10% of 100
      const r = n.right.k === 'pct' ? (l * ev(n.right.a, ctx)) / 100 : ev(n.right, ctx);
      return n.op === '+' ? l + r : l - r;
    }
    case 'fn': return applyFn(n.f, ev(n.a, ctx), ctx.angle);
    default: throw new CalcError('SYNTAX');
  }
}

export function evaluate(src, { angle = 'deg', ans = 0 } = {}) {
  const toks = tokenize(src);
  if (!toks.length) throw new CalcError('SYNTAX');
  const v = ev(parse(toks), { angle, ans });
  if (Number.isNaN(v)) throw new CalcError('DOMAIN');
  if (!Number.isFinite(v)) throw new CalcError('OVERFLOW');
  return v;
}

const TRAIL = /(?:[+\u2212\-\u00D7\u00F7*/^(]| mod )$/;
/** Strips dangling operators and closes open parentheses so the expression can be evaluated. */
export function prepare(src) {
  let s = src.trimEnd();
  while (TRAIL.test(s)) s = s.replace(TRAIL, '').trimEnd();
  // drop a dangling function name left behind by a removed "("
  s = s.replace(/(?:sinh|cosh|tanh|sin|cos|tan|asin|acos|atan|asinh|acosh|atanh|sin\u207B\u00B9|cos\u207B\u00B9|tan\u207B\u00B9|log\u2082|log2|log|ln|abs|exp|floor|ceil|\u221A|\u221B)$/, '');
  let open = 0;
  for (const c of s) { if (c === '(') open++; else if (c === ')') open = Math.max(0, open - 1); }
  return s + ')'.repeat(open);
}

/** True when the expression is just a (possibly negative) number: no live preview needed. */
export function isTrivial(src) {
  const t = tokenize(src);
  if (t.length === 1 && t[0].t === 'num') return true;
  return t.length === 2 && t[0].t === 'op' && t[0].v === '-' && t[1].t === 'num';
}

export function formatNumber(n) {
  if (Object.is(n, -0) || n === 0) return '0';
  if (!Number.isFinite(n)) return String(n);
  const a = Math.abs(n);
  if (a >= 1e21 || a < 1e-9) {
    const [m, e] = n.toExponential(12).split('e');
    return parseFloat(m).toString() + 'e' + (e[0] === '-' ? '-' : '+') + e.replace(/^[+-]/, '');
  }
  return String(parseFloat(n.toPrecision(15)));
}
