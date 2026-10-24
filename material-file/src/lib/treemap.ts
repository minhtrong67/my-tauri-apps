export interface TmItem<T> { value: number; data: T }
export interface TmRect<T> { x: number; y: number; w: number; h: number; item: TmItem<T> }

/** Squarified treemap layout (Bruls, Huizing, van Wijk). Items must be sorted by value, descending. */
export function squarify<T>(items: TmItem<T>[], X: number, Y: number, W: number, H: number): TmRect<T>[] {
  const out: TmRect<T>[] = [];
  const total = items.reduce((n, i) => n + i.value, 0);
  if (!total || W <= 0 || H <= 0) return out;
  const scale = (W * H) / total;
  let x = X, y = Y, w = W, h = H;
  let row: TmItem<T>[] = [];
  const worst = (r: TmItem<T>[], side: number) => {
    const s = r.reduce((n, i) => n + i.value * scale, 0);
    const mx = Math.max(...r.map((i) => i.value * scale)), mn = Math.min(...r.map((i) => i.value * scale));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const flush = () => {
    if (!row.length) return;
    const s = row.reduce((n, i) => n + i.value * scale, 0);
    if (w >= h) { const rw = s / h; let cy = y; row.forEach((i) => { const rh = (i.value * scale) / rw; out.push({ x, y: cy, w: rw, h: rh, item: i }); cy += rh; }); x += rw; w -= rw; }
    else { const rh = s / w; let cx = x; row.forEach((i) => { const rw = (i.value * scale) / rh; out.push({ x: cx, y, w: rw, h: rh, item: i }); cx += rw; }); y += rh; h -= rh; }
    row = [];
  };
  for (const it of items) {
    if (it.value <= 0) continue;
    const side = Math.min(w, h);
    if (!row.length || worst([...row, it], side) <= worst(row, side)) row.push(it); else { flush(); row.push(it); }
  }
  flush();
  return out;
}
