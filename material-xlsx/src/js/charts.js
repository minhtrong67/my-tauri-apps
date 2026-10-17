// Charts: reads a cell range into series and renders it as an SVG string (column, bar, line, area, pie, doughnut, scatter).
export const CHART_TYPES = ["column", "bar", "line", "area", "pie", "doughnut", "scatter"];
export const PALETTES = {
  colorful: ["var(--md-primary)", "#e8710a", "#1a73e8", "#d93025", "#9334e6", "#12a4af", "#f9ab00", "#c2185b", "#5f6368"],
  mono: ["var(--md-primary)", "color-mix(in srgb, var(--md-primary) 75%, white)", "color-mix(in srgb, var(--md-primary) 55%, white)", "color-mix(in srgb, var(--md-primary) 80%, black)", "color-mix(in srgb, var(--md-primary) 38%, white)", "color-mix(in srgb, var(--md-primary) 60%, black)"],
  warm: ["#d93025", "#e8710a", "#f9ab00", "#c2185b", "#9334e6", "#b06000", "#7b1fa2"],
  cool: ["#1a73e8", "#12a4af", "#188038", "#9334e6", "#3367d6", "#00897b", "#5f6368"],
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);

/** Guess whether the first row / column of a range are headers. */
export function guessHeaders(book, sh, rg) {
  const m = readMatrix(book, sh, rg);
  const isText = (v) => typeof v === "string" && v !== "";
  const firstRowText = m[0] && m[0].slice(1).some(isText) || (m[0] && m[0].length === 1 && isText(m[0][0]) && m.length > 1);
  const hdrRow = !!(m.length > 1 && firstRowText && m[1].some((v) => typeof v === "number"));
  const body = m.slice(hdrRow ? 1 : 0), hdrCol = body.length > 0 && m[0].length > 1 && body.every((r) => isText(r[0]));
  return { hdrRow, hdrCol };
}
export function readMatrix(book, sh, rg) {
  const out = [];
  for (let r = rg.r1; r <= rg.r2; r++) { const row = []; for (let c = rg.c1; c <= rg.c2; c++) row.push(book.value(sh, r, c)); out.push(row); }
  return out;
}
/** -> { cats: string[], series: [{name, values:(number|null)[]}], xs?: number[] } */
export function chartData(book, ch) {
  const sh = book.sheetByName(ch.src.sheet);
  if (!sh) return { cats: [], series: [] };
  const rg = { r1: Math.min(ch.src.r1, ch.src.r2), r2: Math.max(ch.src.r1, ch.src.r2), c1: Math.min(ch.src.c1, ch.src.c2), c2: Math.max(ch.src.c1, ch.src.c2) };
  const text = (r, c) => book.display(sh, r, c).text;
  let m = readMatrix(book, sh, rg), hdrRow = !!ch.hdrRow, hdrCol = !!ch.hdrCol;
  const labels = []; for (let r = rg.r1; r <= rg.r2; r++) { const row = []; for (let c = rg.c1; c <= rg.c2; c++) row.push(text(r, c)); labels.push(row); }
  let L = labels;
  if (ch.byRows) { m = m[0].map((_, j) => m.map((row) => row[j])); L = L[0].map((_, j) => L.map((row) => row[j])); [hdrRow, hdrCol] = [hdrCol, hdrRow]; }
  const r0 = hdrRow ? 1 : 0, c0 = hdrCol ? 1 : 0;
  const cats = []; for (let r = r0; r < m.length; r++) cats.push(hdrCol ? L[r][0] : String(r - r0 + 1));
  const series = [];
  for (let c = c0; c < (m[0] || []).length; c++) {
    const values = []; for (let r = r0; r < m.length; r++) values.push(num(m[r][c]));
    series.push({ name: hdrRow ? L[0][c] || `Series${series.length + 1}` : `Series${series.length + 1}`, values });
  }
  const out = { cats, series };
  if (ch.type === "scatter" && hdrCol) { out.xs = []; for (let r = r0; r < m.length; r++) out.xs.push(num(m[r][0]) ?? r - r0 + 1); }
  return out;
}

function niceScale(min, max, count = 5) {
  if (min === max) { max = min + 1; if (min === 0) min = 0; }
  const range = max - min, rough = range / count, mag = 10 ** Math.floor(Math.log10(rough)), f = rough / mag;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (let v = lo; v <= hi + step * 1e-9; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  return { lo, hi, ticks, step };
}
export const fmtAxis = (v) => { const a = Math.abs(v); if (a >= 1e9) return +(v / 1e9).toFixed(2) + "B"; if (a >= 1e6) return +(v / 1e6).toFixed(2) + "M"; if (a >= 1e4) return +(v / 1e3).toFixed(1) + "K"; return String(+v.toFixed(2)); };
const trunc = (s, n) => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s);
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || "middle"}" font-size="${o.size || 11}" ${o.w ? `font-weight="${o.w}"` : ""} fill="${o.fill || "var(--md-on-surface-variant)"}" ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ""}>${esc(s)}</text>`;

export function renderChart(ch, data, W, H) {
  const pal = PALETTES[ch.palette] || PALETTES.colorful, col = (i) => pal[i % pal.length];
  const { cats, series } = data;
  const parts = [];
  const title = ch.title ? ch.title : "";
  const pie = ch.type === "pie" || ch.type === "doughnut";
  const showLegend = ch.legend !== "none" && (pie ? cats.length > 0 : series.length > 1);
  const legendRight = ch.legend === "right";
  const legendItems = pie ? cats.map((c, i) => ({ name: c, color: col(i) })) : series.map((s, i) => ({ name: s.name, color: col(i) }));
  const pad = { l: 12, r: 14, t: title ? 42 : 16, b: 14 };
  if (showLegend) { if (legendRight) pad.r += Math.min(130, 28 + Math.max(...legendItems.map((l) => l.name.length)) * 6.5); else pad.b += 24; }
  if (!series.length || !cats.length) return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${T(W / 2, H / 2, ch.empty || "—", { size: 13 })}</svg>`;
  if (title) parts.push(T(W / 2, 26, trunc(title, Math.floor(W / 8)), { size: 15, w: 600, fill: "var(--md-on-surface)" }));
  let anim = 0;
  const tip = (s) => `<title>${esc(s)}</title>`;

  if (pie) {
    const vals = (series[0].values || []).map((v) => Math.max(0, v || 0)), total = vals.reduce((a, b) => a + b, 0);
    const cx = pad.l + (W - pad.l - pad.r) / 2, cy = pad.t + (H - pad.t - pad.b) / 2, R = Math.max(10, Math.min(W - pad.l - pad.r, H - pad.t - pad.b) / 2 - 4), r0 = ch.type === "doughnut" ? R * 0.55 : 0;
    if (total <= 0) return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${T(W / 2, H / 2, "0", { size: 13 })}</svg>`;
    let a0 = -Math.PI / 2;
    vals.forEach((v, i) => {
      if (v <= 0) return;
      const a1 = a0 + (v / total) * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0, full = v === total;
      const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      let d;
      if (full) d = `M${cx - R} ${cy}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0` + (r0 ? `M${cx - r0} ${cy}a${r0} ${r0} 0 1 1 ${2 * r0} 0a${r0} ${r0} 0 1 1 ${-2 * r0} 0` : "");
      else { const [x0, y0] = P(R, a0), [x1, y1] = P(R, a1); if (r0) { const [x2, y2] = P(r0, a1), [x3, y3] = P(r0, a0); d = `M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${big} 0 ${x3} ${y3}Z`; } else d = `M${cx} ${cy}L${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}Z`; }
      parts.push(`<path class="ch-slice" style="--i:${anim++}" fill-rule="evenodd" d="${d}" fill="${col(i)}" stroke="var(--md-surface-container-low)" stroke-width="1.5">${tip(`${cats[i]}: ${v} (${((v / total) * 100).toFixed(1)}%)`)}</path>`);
      if (ch.labels !== false && v / total > 0.05) { const am = (a0 + a1) / 2, rr = r0 ? (R + r0) / 2 : R * 0.62; parts.push(T(cx + rr * Math.cos(am), cy + rr * Math.sin(am) + 4, ((v / total) * 100).toFixed(0) + "%", { size: 11, w: 600, fill: "#fff" })); }
      a0 = a1;
    });
  } else {
    const horiz = ch.type === "bar", stacked = !!ch.stacked && (ch.type === "column" || ch.type === "bar" || ch.type === "area");
    const scatter = ch.type === "scatter", n = cats.length;
    let vmin = 0, vmax = 0, xmin = 0, xmax = 1;
    if (stacked) { for (let i = 0; i < n; i++) { let pos = 0, neg = 0; for (const s of series) { const v = s.values[i] || 0; if (v >= 0) pos += v; else neg += v; } vmax = Math.max(vmax, pos); vmin = Math.min(vmin, neg); } }
    else for (const s of series) for (const v of s.values) if (v !== null) { vmax = Math.max(vmax, v); vmin = Math.min(vmin, v); }
    if (scatter) { vmin = Infinity; vmax = -Infinity; for (const s of series) for (const v of s.values) if (v !== null) { vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); } if (!isFinite(vmin)) { vmin = 0; vmax = 1; } const xs = data.xs || cats.map((_, i) => i + 1); xmin = Math.min(...xs); xmax = Math.max(...xs); }
    const sc = niceScale(vmin, vmax), xs = scatter ? niceScale(xmin, xmax) : null;
    const labelW = Math.max(...sc.ticks.map((t) => fmtAxis(t).length)) * 6.6 + 10;
    const catLabelSpace = horiz ? Math.min(110, Math.max(...cats.map((c) => c.length)) * 6.4 + 12) : 0;
    const x0 = pad.l + (horiz ? catLabelSpace : labelW), x1 = W - pad.r, y0 = pad.t, y1 = H - pad.b - (horiz ? 18 : 22);
    const pw = Math.max(10, x1 - x0), ph = Math.max(10, y1 - y0);
    const vy = (v) => y1 - ((v - sc.lo) / (sc.hi - sc.lo)) * ph, vx = (v) => x0 + ((v - sc.lo) / (sc.hi - sc.lo)) * pw;
    // grid + value axis
    for (const t of sc.ticks) {
      if (horiz) { const x = vx(t); parts.push(`<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="var(--md-outline-variant)" stroke-width="1" opacity="${ch.grid === false ? 0 : 0.7}"/>`, T(x, y1 + 15, fmtAxis(t))); }
      else if (!scatter || true) { const y = vy(t); parts.push(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="var(--md-outline-variant)" stroke-width="1" opacity="${ch.grid === false ? 0 : 0.7}"/>`, T(x0 - 6, y + 4, fmtAxis(t), { a: "end" })); }
    }
    const zeroPos = horiz ? vx(0) : vy(0);
    if (scatter) {
      const sx = (v) => x0 + ((v - xs.lo) / (xs.hi - xs.lo)) * pw;
      for (const t of xs.ticks) parts.push(`<line x1="${sx(t)}" y1="${y0}" x2="${sx(t)}" y2="${y1}" stroke="var(--md-outline-variant)" opacity="${ch.grid === false ? 0 : 0.35}"/>`, T(sx(t), y1 + 15, fmtAxis(t)));
      const X = data.xs || cats.map((_, i) => i + 1);
      series.forEach((s, si) => s.values.forEach((v, i) => { if (v !== null) parts.push(`<circle class="ch-dot" style="--i:${anim++}" cx="${sx(X[i])}" cy="${vy(v)}" r="5" fill="${col(si)}" fill-opacity=".85" stroke="var(--md-surface-container-low)" stroke-width="1">${tip(`${s.name}: (${X[i]}, ${v})`)}</circle>`); }));
    } else {
      const band = (horiz ? ph : pw) / n, cs = (i) => (horiz ? y0 : x0) + band * (i + 0.5);
      parts.push(horiz ? `<line x1="${zeroPos}" y1="${y0}" x2="${zeroPos}" y2="${y1}" stroke="var(--md-outline)" stroke-width="1.2"/>` : `<line x1="${x0}" y1="${zeroPos}" x2="${x1}" y2="${zeroPos}" stroke="var(--md-outline)" stroke-width="1.2"/>`);
      // category labels
      const maxChars = Math.max(2, Math.floor(band / 6.2)), rot = !horiz && cats.some((c) => c.length > maxChars) && band < 70;
      const every = Math.max(1, Math.ceil((rot ? 14 : 40) / Math.max(1, band)));
      cats.forEach((c, i) => { if (i % every) return; if (horiz) parts.push(T(x0 - 8, cs(i) + 4, trunc(c, 16), { a: "end" })); else parts.push(rot ? T(cs(i), y1 + 14, trunc(c, 12), { a: "end", rot: -35 }) : T(cs(i), y1 + 15, trunc(c, maxChars))); });
      if (ch.type === "column" || ch.type === "bar") {
        const ns = stacked ? 1 : series.length, bw = Math.max(2, (band * 0.72) / ns), off = (band - bw * ns) / 2;
        for (let i = 0; i < n; i++) {
          let pos = 0, neg = 0;
          series.forEach((s, si) => {
            const v = s.values[i]; if (v === null || v === undefined) return;
            let a, b;
            if (stacked) { if (v >= 0) { a = pos; pos += v; b = pos; } else { a = neg; neg += v; b = neg; } } else { a = 0; b = v; }
            const lo = Math.min(a, b), hi = Math.max(a, b), base = (horiz ? y0 : x0) + band * i + off + (stacked ? 0 : bw * si);
            const rect = horiz ? `x="${vx(lo)}" y="${base}" width="${Math.max(0.5, vx(hi) - vx(lo))}" height="${bw}"` : `x="${base}" y="${vy(hi)}" width="${bw}" height="${Math.max(0.5, vy(lo) - vy(hi))}"`;
            parts.push(`<rect class="${horiz ? "ch-barh" : "ch-bar"}" style="--i:${anim++}" ${rect} rx="${Math.min(4, bw / 3)}" fill="${col(si)}">${tip(`${s.name} — ${cats[i]}: ${v}`)}</rect>`);
            if (ch.labels && !stacked && bw > 14) parts.push(horiz ? T(vx(Math.max(0, v)) + 4, base + bw / 2 + 4, fmtAxis(v), { a: "start", size: 10 }) : T(base + bw / 2, vy(Math.max(0, v)) - 4, fmtAxis(v), { size: 10 }));
          });
        }
      } else { // line / area
        const acc = new Array(n).fill(0);
        series.forEach((s, si) => {
          const pts = [];
          for (let i = 0; i < n; i++) { const v = s.values[i]; if (v === null || v === undefined) { pts.push(null); continue; } if (stacked) acc[i] += v; pts.push([cs(i), vy(stacked ? acc[i] : v), v]); }
          let d = "", pen = false;
          for (const p of pts) { if (!p) { pen = false; continue; } d += `${pen ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`; pen = true; }
          if (ch.type === "area") { const live = pts.filter(Boolean); if (live.length) parts.push(`<path class="ch-area" d="M${live[0][0]} ${vy(0)}L${live.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}L${live[live.length - 1][0]} ${vy(0)}Z" fill="${col(si)}" fill-opacity="${stacked ? 0.75 : 0.28}"/>`); }
          parts.push(`<path class="ch-line" pathLength="1" d="${d}" fill="none" stroke="${col(si)}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
          pts.forEach((p, i) => { if (p) parts.push(`<circle class="ch-dot" style="--i:${anim++}" cx="${p[0]}" cy="${p[1]}" r="${n > 40 ? 0 : 3.6}" fill="${col(si)}" stroke="var(--md-surface-container-low)" stroke-width="1.5">${tip(`${s.name} — ${cats[i]}: ${p[2]}`)}</circle>`); if (p && ch.labels && n <= 20) parts.push(T(p[0], p[1] - 8, fmtAxis(p[2]), { size: 10 })); });
        });
      }
    }
  }
  if (showLegend) {
    if (legendRight) { let y = pad.t + 4; legendItems.slice(0, 14).forEach((l) => { parts.push(`<rect x="${W - pad.r + 8}" y="${y - 9}" width="11" height="11" rx="3" fill="${l.color}"/>`, T(W - pad.r + 24, y, trunc(l.name, 16), { a: "start" })); y += 20; }); }
    else { const items = legendItems.slice(0, 12), widths = items.map((l) => 22 + Math.min(l.name.length, 16) * 6.4), total = widths.reduce((a, b) => a + b, 0); let x = Math.max(8, (W - total) / 2); items.forEach((l, i) => { parts.push(`<rect x="${x}" y="${H - 22}" width="11" height="11" rx="3" fill="${l.color}"/>`, T(x + 16, H - 12.5, trunc(l.name, 16), { a: "start" })); x += widths[i]; }); }
  }
  return `<svg class="ch-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title || ch.type)}">${parts.join("")}</svg>`;
}
