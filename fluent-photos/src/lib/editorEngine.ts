/* Canvas based photo editing engine. All geometry is normalised (0..1) so the live preview and the full resolution export render identically. */
import { uid } from "./utils";

export interface Adj { brightness: number; contrast: number; saturation: number; warmth: number; tint: number; highlights: number; shadows: number; sharpness: number; vignette: number; hue: number; blur: number }
export const ZERO_ADJ: Adj = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, tint: 0, highlights: 0, shadows: 0, sharpness: 0, vignette: 0, hue: 0, blur: 0 };
export const ADJ_KEYS = Object.keys(ZERO_ADJ) as (keyof Adj)[];

export type Pt = [number, number];
export interface StrokeItem { id: string; type: "stroke"; pts: Pt[]; color: string; width: number; highlighter: boolean }
export interface ShapeItem { id: string; type: "shape"; shape: "line" | "arrow" | "rect" | "oval"; a: Pt; b: Pt; color: string; width: number; fill: boolean }
export interface TextItem { id: string; type: "text"; text: string; x: number; y: number; size: number; rot: number; color: string; bold: boolean; italic: boolean; bg: boolean }
export interface EmojiItem { id: string; type: "emoji"; char: string; x: number; y: number; size: number; rot: number }
export interface BlurItem { id: string; type: "blur"; x: number; y: number; w: number; h: number; mode: "pixelate" | "blur" }
export type Item = StrokeItem | ShapeItem | TextItem | EmojiItem | BlurItem;
export type Movable = TextItem | EmojiItem | BlurItem;
export const isMovable = (i: Item): i is Movable => i.type === "text" || i.type === "emoji" || i.type === "blur";

export interface Crop { x: number; y: number; w: number; h: number }
export interface EditState { rot: number; flipH: boolean; flipV: boolean; angle: number; crop: Crop; adj: Adj; filter: string; filterAmt: number; items: Item[] }
export const initialState = (): EditState => ({ rot: 0, flipH: false, flipV: false, angle: 0, crop: { x: 0, y: 0, w: 1, h: 1 }, adj: { ...ZERO_ADJ }, filter: "none", filterAmt: 100, items: [] });

export const FILTERS: { id: string; css: string }[] = [
  { id: "none", css: "" },
  { id: "vivid", css: "saturate(1.45) contrast(1.1) brightness(1.03)" },
  { id: "warm", css: "sepia(.25) saturate(1.25) hue-rotate(-8deg) brightness(1.05)" },
  { id: "cool", css: "hue-rotate(14deg) saturate(1.1) brightness(1.03) contrast(1.04)" },
  { id: "mono", css: "grayscale(1) contrast(1.05)" },
  { id: "noir", css: "grayscale(1) contrast(1.45) brightness(.88)" },
  { id: "sepia", css: "sepia(.9) contrast(1.05)" },
  { id: "fade", css: "contrast(.84) brightness(1.12) saturate(.78)" },
  { id: "dramatic", css: "contrast(1.38) saturate(1.18) brightness(.92)" },
  { id: "sunset", css: "sepia(.32) saturate(1.6) hue-rotate(-16deg) contrast(1.05)" },
  { id: "dream", css: "brightness(1.1) saturate(1.2) contrast(.92) blur(.6px)" },
  { id: "film", css: "sepia(.18) contrast(1.12) saturate(.92) brightness(1.03)" },
];

export const FONT_FAMILY = 'system-ui, "Segoe UI", Roboto, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
type Canvas = HTMLCanvasElement;
const mk = (w: number, h: number): Canvas => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const measureCtx = mk(4, 4).getContext("2d")!;

export function itemBox(it: Movable, W: number, H: number) {
  if (it.type === "blur") return { cx: (it.x + it.w / 2) * W, cy: (it.y + it.h / 2) * H, w: it.w * W, h: it.h * H, rot: 0 };
  const px = it.size * W;
  if (it.type === "emoji") return { cx: it.x * W, cy: it.y * H, w: px * 1.25, h: px * 1.25, rot: it.rot };
  measureCtx.font = `${it.italic ? "italic " : ""}${it.bold ? 700 : 500} ${px}px ${FONT_FAMILY}`;
  const lines = it.text.split("\n");
  const w = Math.max(...lines.map((l) => measureCtx.measureText(l || " ").width)) + px * 0.5;
  return { cx: it.x * W, cy: it.y * H, w, h: lines.length * px * 1.22 + px * 0.3, rot: it.rot };
}

function pixelOps(c: Canvas, a: Adj) {
  const need = a.warmth || a.tint || a.highlights || a.shadows || a.sharpness || a.vignette;
  if (!need) return;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = c;
  const img = g.getImageData(0, 0, w, h), d = img.data;
  if (a.sharpness > 0) {
    const copy = new Uint8ClampedArray(d), k = (a.sharpness / 100) * 1.6;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const blur = (copy[i + ch - 4] + copy[i + ch + 4] + copy[i + ch - w * 4] + copy[i + ch + w * 4] + copy[i + ch] * 4) / 8;
        d[i + ch] = copy[i + ch] + k * (copy[i + ch] - blur);
      }
    }
  }
  const wm = a.warmth * 0.45, tn = a.tint * 0.4, sh = a.shadows / 100, hl = a.highlights / 100, vg = a.vignette / 100;
  const cx = w / 2, cy = h / 2, maxD = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let r = d[i], gg = d[i + 1], b = d[i + 2];
    if (wm) { r += wm; b -= wm; }
    if (tn) { gg -= tn; r += tn * 0.35; b += tn * 0.35; }
    if (sh || hl) {
      const l = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
      const add = sh * 70 * (1 - l) * (1 - l) + hl * 70 * l * l;
      r += add; gg += add; b += add;
    }
    if (vg) {
      const dn = Math.hypot(x - cx, y - cy) / maxD;
      const s = Math.min(1, Math.max(0, (dn - 0.35) / 0.75)), e = s * s;
      if (vg > 0) { const m = 1 - vg * e * 0.95; r *= m; gg *= m; b *= m; }
      else { const m = -vg * e * 0.9; r += (255 - r) * m; gg += (255 - gg) * m; b += (255 - b) * m; }
    }
    d[i] = r; d[i + 1] = gg; d[i + 2] = b;
  }
  g.putImageData(img, 0, 0);
}

function cssFilter(a: Adj, scale: number, extra = "") {
  const f: string[] = [];
  if (a.brightness) f.push(`brightness(${(1 + a.brightness / 100).toFixed(3)})`);
  if (a.contrast) f.push(`contrast(${(1 + a.contrast / 100).toFixed(3)})`);
  if (a.saturation) f.push(`saturate(${Math.max(0, 1 + a.saturation / 100).toFixed(3)})`);
  if (a.hue) f.push(`hue-rotate(${a.hue}deg)`);
  if (a.blur > 0) f.push(`blur(${((a.blur / 100) * 14 * scale).toFixed(2)}px)`);
  if (extra) f.push(extra);
  return f.join(" ") || "none";
}

export function createEngine(srcImg: ImageBitmap | HTMLImageElement) {
  const sw = srcImg.width, sh = srcImg.height;
  const geo = new Map<string, Canvas>();
  let adjKey = "", adjCanvas: Canvas | null = null;

  function geometry(st: EditState, maxDim: number): Canvas {
    const key = `${st.rot}|${st.flipH}|${st.flipV}|${st.angle}|${maxDim}`;
    const hit = geo.get(key);
    if (hit) return hit;
    if (geo.size > 5) geo.delete(geo.keys().next().value as string);
    const swap = st.rot % 2 === 1;
    const bw = swap ? sh : sw, bh = swap ? sw : sh;
    const k = Math.min(1, maxDim / Math.max(bw, bh));
    const c = mk(bw * k, bh * k), g = c.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    const th = (st.angle * Math.PI) / 180;
    const cover = st.angle ? Math.cos(Math.abs(th)) + Math.sin(Math.abs(th)) * Math.max(c.width / c.height, c.height / c.width) : 1;
    g.translate(c.width / 2, c.height / 2);
    g.rotate(th);
    g.scale(cover * (st.flipH ? -1 : 1), cover * (st.flipV ? -1 : 1));
    g.rotate((st.rot * Math.PI) / 2);
    g.drawImage(srcImg, (-sw * k) / 2, (-sh * k) / 2, sw * k, sh * k);
    geo.set(key, c);
    return c;
  }

  /** Geometry + crop + colour adjustments + preset filter (no drawings). Cached while only the drawings change. */
  function adjusted(st: EditState, maxDim: number, useCrop: boolean): Canvas {
    const key = JSON.stringify([st.rot, st.flipH, st.flipV, st.angle, maxDim, useCrop ? st.crop : 0, st.adj, st.filter, st.filterAmt]);
    if (key === adjKey && adjCanvas) return adjCanvas;
    const base = geometry(st, maxDim);
    const r = useCrop ? st.crop : { x: 0, y: 0, w: 1, h: 1 };
    const out = mk(base.width * r.w, base.height * r.h), g = out.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    const scale = out.width / 1000;
    const draw = (filter: string) => { g.filter = filter; g.drawImage(base, r.x * base.width, r.y * base.height, r.w * base.width, r.h * base.height, 0, 0, out.width, out.height); g.filter = "none"; };
    draw(cssFilter(st.adj, scale));
    const preset = FILTERS.find((f) => f.id === st.filter)?.css;
    if (preset) {
      if (st.filterAmt >= 100) { g.clearRect(0, 0, out.width, out.height); draw(cssFilter(st.adj, scale, preset)); }
      else { const top = mk(out.width, out.height), tg = top.getContext("2d")!; tg.filter = cssFilter(st.adj, scale, preset); tg.drawImage(out, 0, 0); g.globalAlpha = st.filterAmt / 100; g.drawImage(top, 0, 0); g.globalAlpha = 1; }
    }
    pixelOps(out, st.adj);
    adjKey = key; adjCanvas = out;
    return out;
  }

  function drawItems(c: Canvas, items: Item[], skipId?: string) {
    const g = c.getContext("2d")!, W = c.width, H = c.height, k = W / 1000;
    g.lineCap = "round"; g.lineJoin = "round";
    for (const it of items) {
      if (it.id === skipId) continue;
      if (it.type === "stroke") {
        if (it.pts.length < 1) continue;
        g.save(); g.strokeStyle = it.color; g.lineWidth = it.width * k * (it.highlighter ? 3 : 1); g.globalAlpha = it.highlighter ? 0.38 : 1;
        if (it.highlighter) g.lineCap = "butt";
        g.beginPath(); g.moveTo(it.pts[0][0] * W, it.pts[0][1] * H);
        if (it.pts.length === 1) g.lineTo(it.pts[0][0] * W + 0.01, it.pts[0][1] * H);
        for (let i = 1; i < it.pts.length - 1; i++) { const mx = ((it.pts[i][0] + it.pts[i + 1][0]) / 2) * W, my = ((it.pts[i][1] + it.pts[i + 1][1]) / 2) * H; g.quadraticCurveTo(it.pts[i][0] * W, it.pts[i][1] * H, mx, my); }
        if (it.pts.length > 1) g.lineTo(it.pts[it.pts.length - 1][0] * W, it.pts[it.pts.length - 1][1] * H);
        g.stroke(); g.restore();
      } else if (it.type === "shape") {
        const [ax, ay, bx, by] = [it.a[0] * W, it.a[1] * H, it.b[0] * W, it.b[1] * H];
        g.save(); g.strokeStyle = it.color; g.fillStyle = it.color; g.lineWidth = it.width * k;
        if (it.shape === "rect") { if (it.fill) g.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)); else g.strokeRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)); }
        else if (it.shape === "oval") { g.beginPath(); g.ellipse((ax + bx) / 2, (ay + by) / 2, Math.abs(bx - ax) / 2, Math.abs(by - ay) / 2, 0, 0, Math.PI * 2); it.fill ? g.fill() : g.stroke(); }
        else {
          g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
          if (it.shape === "arrow") {
            const ang = Math.atan2(by - ay, bx - ax), hl = Math.max(14 * k, it.width * k * 4);
            g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - hl * Math.cos(ang - 0.45), by - hl * Math.sin(ang - 0.45)); g.lineTo(bx - hl * Math.cos(ang + 0.45), by - hl * Math.sin(ang + 0.45)); g.closePath(); g.fill();
          }
        }
        g.restore();
      } else if (it.type === "text") {
        const b = itemBox(it, W, H), px = it.size * W;
        g.save(); g.translate(b.cx, b.cy); g.rotate(it.rot);
        g.font = `${it.italic ? "italic " : ""}${it.bold ? 700 : 500} ${px}px ${FONT_FAMILY}`; g.textAlign = "center"; g.textBaseline = "middle";
        if (it.bg) { g.fillStyle = "rgba(0,0,0,.55)"; const r = px * 0.35; g.beginPath(); g.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, r); g.fill(); }
        else { g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = px * 0.12; g.shadowOffsetY = px * 0.04; }
        g.fillStyle = it.color;
        const lines = it.text.split("\n"), lh = px * 1.22;
        lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * lh));
        g.restore();
      } else if (it.type === "emoji") {
        g.save(); g.translate(it.x * W, it.y * H); g.rotate(it.rot); g.font = `${it.size * W}px ${FONT_FAMILY}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(it.char, 0, it.size * W * 0.05); g.restore();
      } else if (it.type === "blur") {
        const x = Math.max(0, Math.round(it.x * W)), y = Math.max(0, Math.round(it.y * H));
        const w = Math.min(W - x, Math.round(it.w * W)), h = Math.min(H - y, Math.round(it.h * H));
        if (w < 2 || h < 2) continue;
        const tmp = mk(w, h); tmp.getContext("2d")!.drawImage(c, x, y, w, h, 0, 0, w, h);
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        if (it.mode === "pixelate") {
          const step = Math.max(6 * k, Math.min(w, h) / 12), sm = mk(Math.max(1, w / step), Math.max(1, h / step));
          sm.getContext("2d")!.drawImage(tmp, 0, 0, sm.width, sm.height);
          g.imageSmoothingEnabled = false; g.drawImage(sm, x, y, w, h); g.imageSmoothingEnabled = true;
        } else { g.filter = `blur(${Math.max(4, 14 * k)}px)`; g.drawImage(tmp, x - 0, y - 0, w, h); g.filter = "none"; }
        g.restore();
      }
    }
  }

  /** Renders the picture for the screen. `full` shows the uncropped result (used by the crop tool). */
  function preview(st: EditState, maxDim: number, opts: { full?: boolean; draft?: Item | null; hideId?: string; plain?: boolean }): Canvas {
    if (opts.plain) { const c = mk(sw * Math.min(1, maxDim / Math.max(sw, sh)), sh * Math.min(1, maxDim / Math.max(sw, sh))); c.getContext("2d")!.drawImage(srcImg, 0, 0, c.width, c.height); return c; }
    const a = adjusted(st, maxDim, !opts.full);
    const out = mk(a.width, a.height);
    out.getContext("2d")!.drawImage(a, 0, 0);
    drawItems(out, opts.draft ? [...st.items, opts.draft] : st.items, opts.hideId);
    return out;
  }

  async function exportBlob(st: EditState, o: { format: "png" | "jpeg" | "webp"; quality: number; width?: number; height?: number }): Promise<Blob> {
    const a = adjusted(st, Number.MAX_SAFE_INTEGER, true);
    const full = mk(a.width, a.height); full.getContext("2d")!.drawImage(a, 0, 0);
    drawItems(full, st.items);
    let out = full;
    if (o.width && o.height && (o.width !== full.width || o.height !== full.height)) {
      out = mk(o.width, o.height); const g = out.getContext("2d")!; g.imageSmoothingQuality = "high"; g.drawImage(full, 0, 0, out.width, out.height);
    }
    if (o.format === "jpeg") { const g = mk(out.width, out.height), gc = g.getContext("2d")!; gc.fillStyle = "#fff"; gc.fillRect(0, 0, g.width, g.height); gc.drawImage(out, 0, 0); out = g; }
    return new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), `image/${o.format}`, o.quality / 100));
  }

  function cropSize(st: EditState) { const swp = st.rot % 2 === 1; return { w: Math.round((swp ? sh : sw) * st.crop.w), h: Math.round((swp ? sw : sh) * st.crop.h) }; }

  function autoEnhance(st: EditState): Partial<Adj> {
    const c = geometry({ ...st, angle: 0 }, 256), g = c.getContext("2d", { willReadFrequently: true })!;
    const d = g.getImageData(0, 0, c.width, c.height).data, hist = new Uint32Array(256);
    let n = 0, sat = 0;
    for (let i = 0; i < d.length; i += 4) { const l = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]); hist[l]++; n++; sat += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); }
    let acc = 0, p1 = 0, p99 = 255;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.01) { p1 = i; break; } }
    acc = 0; for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * 0.01) { p99 = i; break; } }
    const range = Math.max(30, p99 - p1), mid = (p1 + p99) / 2;
    const clampv = (v: number, m: number) => Math.round(Math.max(-m, Math.min(m, v)));
    return { contrast: clampv((255 / range - 1) * 70, 40), brightness: clampv((128 - mid) / 2.55 * 0.5, 25), saturation: sat / n < 40 ? 18 : 8, shadows: 12, highlights: -8 };
  }

  function previewDataUrl(filterId: string): string {
    const base = geometry(initialState(), 160);
    const c = mk(base.width, base.height), g = c.getContext("2d")!;
    g.filter = FILTERS.find((f) => f.id === filterId)?.css || "none"; g.drawImage(base, 0, 0);
    return c.toDataURL("image/jpeg", 0.7);
  }

  return { sw, sh, previewDataUrl, preview, exportBlob, cropSize, autoEnhance, itemBox, newId: uid };
}
export type Engine = ReturnType<typeof createEngine>;

export async function loadSource(url: string): Promise<ImageBitmap | HTMLImageElement> {
  const blob = await (await fetch(url)).blob();
  try { return await createImageBitmap(blob); } catch {
    return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob); });
  }
}
