// Additional spreadsheet functions: financial, statistics, date/time, lookup, text, maths and engineering.
// The helpers of the formula engine are injected so this file stays independent of its internals.
import { serialToParts, dateToSerial, formatValue } from "./numfmt.js";
import { colName } from "./refs.js";

const erf = (x) => {
  const ax = Math.abs(x);
  if (ax < 3) {
    let sum = 0, term = ax;
    for (let n = 0; n < 80; n++) { sum += term / (2 * n + 1); term = (-term * ax * ax) / (n + 1); if (Math.abs(term) < 1e-17) break; }
    return Math.sign(x) * (2 / Math.sqrt(Math.PI)) * sum;
  }
  // asymptotic expansion of erfc for large |x|
  let s = 1, t = 1;
  for (let n = 1; n < 12; n++) { t *= -(2 * n - 1) / (2 * ax * ax); s += t; }
  return Math.sign(x) * (1 - (Math.exp(-ax * ax) / (ax * Math.sqrt(Math.PI))) * s);
};
const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
function normInv(p) { // Acklam's algorithm with one Halley refinement
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239],
    b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1],
    c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
    d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  let x;
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p > 1 - 0.02425) { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else { const q = p - 0.5, r = q * q; x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  const e = normCdf(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}
const gcd2 = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function extFunctions(H) {
  const { E, XErr, toNum, toStr, toBool, chk, num, str, val, optNum, matrix, numbers, dateArg, matchIn, cmp } = H;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const bad = (cond) => { if (cond) throw E.NUM; };
  const pairs = (a, cx) => { // numeric (x,y) pairs from two equally sized ranges
    const A = a[0] && a[0].rng ? matrix(a[0], cx).flat() : [chk(a[0])], B = a[1] && a[1].rng ? matrix(a[1], cx).flat() : [chk(a[1])];
    if (A.length !== B.length) throw E.NA;
    const xs = [], ys = [];
    A.forEach((x, i) => { const y = B[i]; if (x instanceof XErr) throw x; if (y instanceof XErr) throw y; if (typeof x === "number" && typeof y === "number") { xs.push(x); ys.push(y); } });
    if (xs.length < 2) throw E.DIV0;
    return [xs, ys];
  };
  const mean = (a) => sum(a) / a.length;
  const reg = (xs, ys) => {
    const mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
    if (sxx === 0) throw E.DIV0;
    return { mx, my, sxy, sxx, syy, slope: sxy / sxx };
  };
  const percentile = (arr, k) => {
    const n = arr.slice().sort((x, y) => x - y);
    if (!n.length || k < 0 || k > 1) throw E.NUM;
    const pos = k * (n.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
    return n[lo] + (n[hi] - n[lo]) * (pos - lo);
  };
  const holidays = (a, cx) => { const s = new Set(); if (a !== undefined) (a.rng ? matrix(a, cx).flat() : [a]).forEach((v) => { if (typeof v === "number") s.add(Math.trunc(v)); }); return s; };
  const isWork = (d, hol) => { const w = serialToParts(d).dow; return w !== 0 && w !== 6 && !hol.has(d); };
  const pmtCalc = (r, n, pv, fv, t) => (r === 0 ? -(pv + fv) / n : -(r * (pv * (1 + r) ** n + fv)) / ((1 + r * t) * ((1 + r) ** n - 1)));
  const fvCalc = (r, n, pmt, pv, t) => (r === 0 ? -(pv + pmt * n) : -(pv * (1 + r) ** n + (pmt * (1 + r * t) * ((1 + r) ** n - 1)) / r));
  const sumif = (rng, cx, fn, hidden) => {
    const out = [];
    for (const a of rng) {
      if (a && a.rng) {
        cx.env.eachInRange(a.sheet, a.r1, a.c1, a.r2, a.c2, (v, r, c) => {
          if (cx.env.rowHidden && cx.env.rowHidden(a.sheet, r, hidden)) return;
          if (cx.env.isSubtotal && cx.env.isSubtotal(a.sheet, r, c)) return;
          out.push(v);
        });
      } else out.push(chk(a));
    }
    return fn(out);
  };
  const nums = (arr) => { const o = []; for (const v of arr) { if (v instanceof XErr) throw v; if (typeof v === "number") o.push(v); } return o; };
  const variance = (n, p) => { if (n.length < (p ? 1 : 2)) throw E.DIV0; const m = mean(n); return sum(n.map((y) => (y - m) ** 2)) / (n.length - (p ? 0 : 1)); };
  const SUBTOTALS = {
    1: (v) => { const n = nums(v); if (!n.length) throw E.DIV0; return mean(n); }, 2: (v) => nums(v).length, 3: (v) => v.filter((x) => x !== null && x !== "").length,
    4: (v) => { const n = nums(v); return n.length ? Math.max(...n) : 0; }, 5: (v) => { const n = nums(v); return n.length ? Math.min(...n) : 0; },
    6: (v) => nums(v).reduce((x, y) => x * y, nums(v).length ? 1 : 0), 7: (v) => Math.sqrt(variance(nums(v), false)), 8: (v) => Math.sqrt(variance(nums(v), true)),
    9: (v) => sum(nums(v)), 10: (v) => variance(nums(v), false), 11: (v) => variance(nums(v), true),
  };

  const F = {
    // ── maths ──
    ASIN: (a, cx) => { const x = num(a[0], cx); bad(x < -1 || x > 1); return Math.asin(x); },
    ACOS: (a, cx) => { const x = num(a[0], cx); bad(x < -1 || x > 1); return Math.acos(x); },
    ATAN2: (a, cx) => Math.atan2(num(a[1], cx), num(a[0], cx)),
    SINH: (a, cx) => Math.sinh(num(a[0], cx)), COSH: (a, cx) => Math.cosh(num(a[0], cx)), TANH: (a, cx) => Math.tanh(num(a[0], cx)),
    GCD: (a, cx) => numbers(a, cx).map(Math.trunc).reduce((x, y) => gcd2(x, y), 0),
    LCM: (a, cx) => numbers(a, cx).map(Math.trunc).reduce((x, y) => (x === 0 || y === 0 ? 0 : Math.abs(x * y) / gcd2(x, y)), 1),
    COMBIN: (a, cx) => { const n = Math.trunc(num(a[0], cx)), k = Math.trunc(num(a[1], cx)); bad(n < 0 || k < 0 || k > n); let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); },
    PERMUT: (a, cx) => { const n = Math.trunc(num(a[0], cx)), k = Math.trunc(num(a[1], cx)); bad(n < 0 || k < 0 || k > n); let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; },
    MROUND: (a, cx) => { const x = num(a[0], cx), m = num(a[1], cx); if (m === 0) return 0; bad(x * m < 0); return Math.round(x / m) * m; },
    QUOTIENT: (a, cx) => { const d = num(a[1], cx); if (d === 0) throw E.DIV0; return Math.trunc(num(a[0], cx) / d); },
    EVEN: (a, cx) => { const x = num(a[0], cx), s = Math.sign(x) || 1, c = Math.ceil(Math.abs(x)); return s * (c % 2 === 0 ? c : c + 1); },
    ODD: (a, cx) => { const x = num(a[0], cx), s = Math.sign(x) || 1, c = Math.ceil(Math.abs(x)); return s * (c % 2 === 1 ? c : c + 1); },
    SUBTOTAL: (a, cx) => {
      const fn = Math.trunc(num(a[0], cx)), manual = fn > 100, f = SUBTOTALS[manual ? fn - 100 : fn];
      if (!f) throw E.VALUE;
      return sumif(a.slice(1), cx, f, manual);
    },
    // ── statistics ──
    "PERCENTILE.INC": (a, cx) => percentile(numbers([a[0]], cx), num(a[1], cx)),
    "QUARTILE.INC": (a, cx) => { const q = Math.trunc(num(a[1], cx)); bad(q < 0 || q > 4); return percentile(numbers([a[0]], cx), q / 4); },
    CORREL: (a, cx) => { const [x, y] = pairs(a, cx), r = reg(x, y); if (r.syy === 0) throw E.DIV0; return r.sxy / Math.sqrt(r.sxx * r.syy); },
    RSQ: (a, cx) => { const [y, x] = pairs(a, cx), r = reg(x, y); if (r.syy === 0) throw E.DIV0; return (r.sxy * r.sxy) / (r.sxx * r.syy); },
    SLOPE: (a, cx) => { const [y, x] = pairs(a, cx); return reg(x, y).slope; },
    INTERCEPT: (a, cx) => { const [y, x] = pairs(a, cx), r = reg(x, y); return r.my - r.slope * r.mx; },
    "FORECAST.LINEAR": (a, cx) => { const x0 = num(a[0], cx), [y, x] = pairs([a[1], a[2]], cx), r = reg(x, y); return r.my + r.slope * (x0 - r.mx); },
    "COVARIANCE.P": (a, cx) => { const [x, y] = pairs(a, cx), r = reg(x, y); return r.sxy / x.length; },
    "COVARIANCE.S": (a, cx) => { const [x, y] = pairs(a, cx), r = reg(x, y); return r.sxy / (x.length - 1); },
    GEOMEAN: (a, cx) => { const n = numbers(a, cx); bad(!n.length || n.some((x) => x <= 0)); return Math.exp(mean(n.map(Math.log))); },
    HARMEAN: (a, cx) => { const n = numbers(a, cx); bad(!n.length || n.some((x) => x <= 0)); return n.length / sum(n.map((x) => 1 / x)); },
    DEVSQ: (a, cx) => { const n = numbers(a, cx); if (!n.length) throw E.NUM; const m = mean(n); return sum(n.map((x) => (x - m) ** 2)); },
    AVEDEV: (a, cx) => { const n = numbers(a, cx); if (!n.length) throw E.NUM; const m = mean(n); return mean(n.map((x) => Math.abs(x - m))); },
    "NORM.S.DIST": (a, cx) => { const z = num(a[0], cx); return a[1] === undefined || toBool(val(a[1], cx)) ? normCdf(z) : Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI); },
    "NORM.DIST": (a, cx) => { const x = num(a[0], cx), m = num(a[1], cx), s = num(a[2], cx); bad(s <= 0); const z = (x - m) / s; return toBool(val(a[3], cx)) ? normCdf(z) : Math.exp((-z * z) / 2) / (s * Math.sqrt(2 * Math.PI)); },
    "NORM.S.INV": (a, cx) => { const p = num(a[0], cx); bad(p <= 0 || p >= 1); return normInv(p); },
    "NORM.INV": (a, cx) => { const p = num(a[0], cx), m = num(a[1], cx), s = num(a[2], cx); bad(p <= 0 || p >= 1 || s <= 0); return m + s * normInv(p); },
    STANDARDIZE: (a, cx) => { const s = num(a[2], cx); bad(s <= 0); return (num(a[0], cx) - num(a[1], cx)) / s; },
    // ── financial ──
    PMT: (a, cx) => pmtCalc(num(a[0], cx), num(a[1], cx), num(a[2], cx), optNum(a[3], cx, 0), optNum(a[4], cx, 0) ? 1 : 0),
    FV: (a, cx) => fvCalc(num(a[0], cx), num(a[1], cx), num(a[2], cx), optNum(a[3], cx, 0), optNum(a[4], cx, 0) ? 1 : 0),
    PV: (a, cx) => {
      const r = num(a[0], cx), n = num(a[1], cx), p = num(a[2], cx), fv = optNum(a[3], cx, 0), t = optNum(a[4], cx, 0) ? 1 : 0;
      return r === 0 ? -(fv + p * n) : -(fv + (p * (1 + r * t) * ((1 + r) ** n - 1)) / r) / (1 + r) ** n;
    },
    NPER: (a, cx) => {
      const r = num(a[0], cx), p = num(a[1], cx), pv = num(a[2], cx), fv = optNum(a[3], cx, 0), t = optNum(a[4], cx, 0) ? 1 : 0;
      if (r === 0) { if (p === 0) throw E.NUM; return -(pv + fv) / p; }
      const z = (p * (1 + r * t)) / r, q = (-fv + z) / (pv + z); bad(!(q > 0));
      return Math.log(q) / Math.log(1 + r);
    },
    IPMT: (a, cx) => {
      const r = num(a[0], cx), per = num(a[1], cx), n = num(a[2], cx), pv = num(a[3], cx), fv = optNum(a[4], cx, 0), t = optNum(a[5], cx, 0) ? 1 : 0;
      bad(per < 1 || per > n);
      const pmt = pmtCalc(r, n, pv, fv, t);
      if (t) return per === 1 ? 0 : (fvCalc(r, per - 2, pmt, pv, 1) - pmt) * r;
      return fvCalc(r, per - 1, pmt, pv, 0) * r;
    },
    PPMT: (a, cx) => { const r = num(a[0], cx), n = num(a[2], cx), pv = num(a[3], cx), fv = optNum(a[4], cx, 0), t = optNum(a[5], cx, 0) ? 1 : 0; return pmtCalc(r, n, pv, fv, t) - F.IPMT(a, cx); },
    NPV: (a, cx) => { const r = num(a[0], cx), v = numbers(a.slice(1), cx); bad(r === -1); return sum(v.map((x, i) => x / (1 + r) ** (i + 1))); },
    IRR: (a, cx) => {
      const v = numbers([a[0]], cx); if (!v.some((x) => x > 0) || !v.some((x) => x < 0)) throw E.NUM;
      const f = (r) => sum(v.map((x, i) => x / (1 + r) ** i)), df = (r) => sum(v.map((x, i) => (-i * x) / (1 + r) ** (i + 1)));
      let r = optNum(a[1], cx, 0.1);
      for (let i = 0; i < 100; i++) { const y = f(r), d = df(r); if (!d) break; const nr = r - y / d; if (!isFinite(nr) || nr <= -1) break; if (Math.abs(nr - r) < 1e-12) return nr; r = nr; }
      let lo = -0.9999, hi = 10; // bisection fallback
      if (f(lo) * f(hi) > 0) throw E.NUM;
      for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
      return (lo + hi) / 2;
    },
    RATE: (a, cx) => {
      const n = num(a[0], cx), p = num(a[1], cx), pv = num(a[2], cx), fv = optNum(a[3], cx, 0), t = optNum(a[4], cx, 0) ? 1 : 0;
      const f = (r) => (r === 0 ? pv + p * n + fv : pv * (1 + r) ** n + (p * (1 + r * t) * ((1 + r) ** n - 1)) / r + fv);
      let r = optNum(a[5], cx, 0.1);
      for (let i = 0; i < 100; i++) { const h = 1e-7, d = (f(r + h) - f(r - h)) / (2 * h); if (!d) break; const nr = r - f(r) / d; if (!isFinite(nr)) break; if (Math.abs(nr - r) < 1e-12) return nr; r = nr; }
      throw E.NUM;
    },
    SLN: (a, cx) => { const l = num(a[2], cx); if (l === 0) throw E.DIV0; return (num(a[0], cx) - num(a[1], cx)) / l; },
    EFFECT: (a, cx) => { const n = Math.trunc(num(a[1], cx)); bad(n < 1); return (1 + num(a[0], cx) / n) ** n - 1; },
    NOMINAL: (a, cx) => { const n = Math.trunc(num(a[1], cx)); bad(n < 1); return n * ((1 + num(a[0], cx)) ** (1 / n) - 1); },
    // ── date & time ──
    WEEKNUM: (a, cx) => {
      const s = Math.trunc(dateArg(a[0], cx)), type = optNum(a[1], cx, 1), p = serialToParts(s);
      if (type === 21) return F.ISOWEEKNUM(a, cx);
      const jan1 = dateToSerial(p.y, 1, 1), dj = serialToParts(jan1).dow, off = type === 2 || type === 11 ? (dj + 6) % 7 : dj;
      return Math.floor((s - jan1 + off) / 7) + 1;
    },
    ISOWEEKNUM: (a, cx) => {
      const p = serialToParts(Math.trunc(dateArg(a[0], cx))), d = new Date(Date.UTC(p.y, p.m - 1, p.d)), day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - day);
      return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
    },
    NETWORKDAYS: (a, cx) => {
      let s = Math.trunc(dateArg(a[0], cx)), e = Math.trunc(dateArg(a[1], cx)); const hol = holidays(a[2], cx), sign = e < s ? -1 : 1; if (e < s) [s, e] = [e, s];
      let n = 0; for (let d = s; d <= e; d++) if (isWork(d, hol)) n++; return n * sign;
    },
    WORKDAY: (a, cx) => {
      let d = Math.trunc(dateArg(a[0], cx)), n = Math.trunc(num(a[1], cx)); const hol = holidays(a[2], cx), step = n < 0 ? -1 : 1;
      while (n !== 0) { d += step; if (isWork(d, hol)) n -= step; }
      return d;
    },
    DAYS360: (a, cx) => {
      const s = serialToParts(dateArg(a[0], cx)), e = serialToParts(dateArg(a[1], cx)), eu = a[2] !== undefined && toBool(val(a[2], cx));
      let d1 = s.d, d2 = e.d;
      if (eu) { if (d1 === 31) d1 = 30; if (d2 === 31) d2 = 30; } else { if (d1 === 31) d1 = 30; if (d2 === 31 && d1 >= 30) d2 = 30; }
      return (e.y - s.y) * 360 + (e.m - s.m) * 30 + (d2 - d1);
    },
    YEARFRAC: (a, cx) => {
      let s = dateArg(a[0], cx), e = dateArg(a[1], cx); const b = optNum(a[2], cx, 0); if (s > e) [s, e] = [e, s];
      const days = Math.trunc(e) - Math.trunc(s);
      if (b === 0) return F.DAYS360([s, e, false], cx) / 360;
      if (b === 4) return F.DAYS360([s, e, true], cx) / 360;
      if (b === 2) return days / 360; if (b === 3) return days / 365;
      if (b !== 1) throw E.NUM;
      const y1 = serialToParts(s).y, y2 = serialToParts(e).y; let tot = 0;
      for (let y = y1; y <= y2; y++) tot += isLeap(y) ? 366 : 365;
      return days / (tot / (y2 - y1 + 1));
    },
    DATEVALUE: (a, cx) => Math.trunc(dateArg(a[0], cx)),
    // ── lookup & reference ──
    LOOKUP: (a, cx) => {
      const t = val(a[0], cx), look = a[1], res = a[2] || look; if (!look || !look.rng) throw E.NA;
      const list = matrix(look, cx).flat(), i = matchIn(list, t, 1); if (i < 0) throw E.NA;
      return chk(matrix(res, cx).flat()[i] ?? null);
    },
    XMATCH: (a, cx) => {
      const t = val(a[0], cx), rg = a[1], mode = optNum(a[2], cx, 0); if (!rg || !rg.rng) throw E.NA;
      const list = matrix(rg, cx).flat();
      if (mode === 0 || mode === 2) { const i = matchIn(list, t, 0); if (i < 0) throw E.NA; return i + 1; }
      let best = -1;
      list.forEach((v, i) => { if (v === null || typeof v !== typeof t) return; const c = cmp(v, t); if (c === 0) { if (best < 0 || cmp(list[best], t) !== 0) best = i; } else if (best < 0 || cmp(list[best], t) !== 0) { if (mode === 1 ? c > 0 : c < 0) if (best < 0 || (mode === 1 ? cmp(v, list[best]) < 0 : cmp(v, list[best]) > 0)) best = i; } });
      if (best < 0) throw E.NA; return best + 1;
    },
    OFFSET: (a, cx) => {
      const rg = a[0]; if (!rg || !rg.rng) throw E.VALUE;
      const dr = Math.trunc(num(a[1], cx)), dc = Math.trunc(num(a[2], cx)), h = a[3] === undefined || a[3] === null ? rg.r2 - rg.r1 + 1 : Math.trunc(num(a[3], cx)), w = a[4] === undefined || a[4] === null ? rg.c2 - rg.c1 + 1 : Math.trunc(num(a[4], cx));
      if (h < 1 || w < 1 || rg.r1 + dr < 0 || rg.c1 + dc < 0) throw E.REF;
      return { rng: true, sheet: rg.sheet, r1: rg.r1 + dr, c1: rg.c1 + dc, r2: rg.r1 + dr + h - 1, c2: rg.c1 + dc + w - 1 };
    },
    ADDRESS: (a, cx) => {
      const r = Math.trunc(num(a[0], cx)), c = Math.trunc(num(a[1], cx)), abs = optNum(a[2], cx, 1), a1 = a[3] === undefined || toBool(val(a[3], cx));
      if (r < 1 || c < 1) throw E.VALUE;
      let s;
      if (a1) s = (abs === 1 || abs === 3 ? "$" : "") + colName(c - 1) + (abs === 1 || abs === 2 ? "$" : "") + r;
      else s = "R" + (abs === 1 || abs === 2 ? r : `[${r}]`) + "C" + (abs === 1 || abs === 3 ? c : `[${c}]`);
      if (a[4] !== undefined) { const sh = str(a[4], cx); s = (/^[A-Za-z_][\w.]*$/.test(sh) ? sh : `'${sh.replace(/'/g, "''")}'`) + "!" + s; }
      return s;
    },
    HYPERLINK: (a, cx) => (a[1] !== undefined ? val(a[1], cx) ?? "" : str(a[0], cx)),
    TYPE: (a, cx) => { const v = a[0] && a[0].rng && (a[0].r1 !== a[0].r2 || a[0].c1 !== a[0].c2) ? "array" : scalar0(a[0], cx); return v === "array" ? 64 : v instanceof XErr ? 16 : typeof v === "number" || v === null ? 1 : typeof v === "string" ? 2 : 4; },
    ISREF: (a) => !!(a[0] && a[0].rng),
    ISFORMULA: (a, cx) => { const r = a[0]; if (!r || !r.rng) throw E.VALUE; return cx.env.isFormula ? cx.env.isFormula(r.sheet, r.r1, r.c1) : false; },
    // ── text ──
    T: (a, cx) => { const v = scalar0(a[0], cx); return typeof v === "string" ? v : ""; },
    NUMBERVALUE: (a, cx) => {
      const dec = a[1] !== undefined ? str(a[1], cx) : ".", grp = a[2] !== undefined ? str(a[2], cx) : ",";
      let s = str(a[0], cx).replace(/\s/g, ""); if (s === "") return 0;
      s = s.split(grp).join("").replace(dec, ".");
      let pct = 0; while (s.endsWith("%")) { s = s.slice(0, -1); pct++; }
      if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) throw E.VALUE;
      return parseFloat(s) / 100 ** pct;
    },
    DOLLAR: (a, cx) => { const d = Math.trunc(optNum(a[1], cx, 2)); return formatValue(num(a[0], cx), `"$"#,##0${d > 0 ? "." + "0".repeat(d) : ""}`); },
    FIXED: (a, cx) => { const d = Math.trunc(optNum(a[1], cx, 2)), nc = a[2] !== undefined && toBool(val(a[2], cx)); return formatValue(num(a[0], cx), `${nc ? "0" : "#,##0"}${d > 0 ? "." + "0".repeat(d) : ""}`); },
    UNICODE: (a, cx) => { const s = str(a[0], cx); if (!s) throw E.VALUE; return s.codePointAt(0); },
    UNICHAR: (a, cx) => { const n = Math.trunc(num(a[0], cx)); bad(n < 1 || n > 0x10ffff); return String.fromCodePoint(n); },
    TEXTBEFORE: (a, cx) => textSplit(a, cx, true), TEXTAFTER: (a, cx) => textSplit(a, cx, false),
    // ── engineering ──
    DEC2BIN: (a, cx) => radix(num(a[0], cx), 2, a[1] && num(a[1], cx)), DEC2HEX: (a, cx) => radix(num(a[0], cx), 16, a[1] && num(a[1], cx)), DEC2OCT: (a, cx) => radix(num(a[0], cx), 8, a[1] && num(a[1], cx)),
    BIN2DEC: (a, cx) => fromRadix(str(a[0], cx), 2), HEX2DEC: (a, cx) => fromRadix(str(a[0], cx), 16), OCT2DEC: (a, cx) => fromRadix(str(a[0], cx), 8),
  };
  function scalar0(v, cx) { return v && v.rng ? cx.env.cellValue(v.sheet, v.r1, v.c1) : v; }
  function radix(n, base, places) { n = Math.trunc(n); bad(n < -(2 ** 31) || n > 2 ** 31 - 1); let s = (n < 0 ? n + 2 ** 40 : n).toString(base).toUpperCase(); if (n < 0) s = s.slice(-10); if (places) { bad(s.length > places); s = s.padStart(places, "0"); } return s; }
  function fromRadix(s, base) { s = s.trim(); const digits = "0123456789ABCDEF".slice(0, base); if (!s || [...s.toUpperCase()].some((ch) => !digits.includes(ch))) throw E.NUM; const v = parseInt(s, base); return v >= base ** 10 / 2 && s.length === 10 ? v - base ** 10 : v; }
  function textSplit(a, cx, before) {
    const text = str(a[0], cx), delim = str(a[1], cx); let inst = Math.trunc(optNum(a[2], cx, 1));
    const ci = optNum(a[3], cx, 0) === 1; if (!delim || inst === 0) throw E.VALUE;
    const hay = ci ? text.toLowerCase() : text, nd = ci ? delim.toLowerCase() : delim, pos = [];
    for (let i = hay.indexOf(nd); i >= 0; i = hay.indexOf(nd, i + nd.length)) pos.push(i);
    const idx = inst > 0 ? pos[inst - 1] : pos[pos.length + inst];
    if (idx === undefined) { if (a[5] !== undefined) return val(a[5], cx); throw E.NA; }
    return before ? text.slice(0, idx) : text.slice(idx + nd.length);
  }
  const ALIAS = { PERCENTILE: "PERCENTILE.INC", QUARTILE: "QUARTILE.INC", FORECAST: "FORECAST.LINEAR", COVAR: "COVARIANCE.P", NORMDIST: "NORM.DIST", NORMSDIST: "NORM.S.DIST", NORMINV: "NORM.INV", NORMSINV: "NORM.S.INV" };
  for (const [k, v] of Object.entries(ALIAS)) F[k] = F[v];
  return F;
}
