import type { Design, IconLayer, PatternId } from "./types";
import { getVector } from "./iconsets";

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------------ colors
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** amt in -1..1: negative mixes with black, positive with white. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const f = (c: number) => Math.round(c + (t - c) * p);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ------------------------------------------------------------------ geometry
type Box = { x: number; y: number; w: number; h: number; r: number };
const BACK: Box = { x: 14, y: 38, w: 228, h: 184, r: 16 };
const TAB: Box = { x: 14, y: 30, w: 100, h: 34, r: 10 };
const FRONT: Box = { x: 14, y: 70, w: 228, h: 152, r: 16 };

function rr(ctx: Ctx, b: Box) {
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, b.r);
}

function fillFor(ctx: Ctx, d: Design, b: { x: number; y: number; w: number; h: number }, amt: number) {
  const c1 = shade(d.color, amt);
  const c2 = shade(d.color2, amt);
  if (d.fill === "solid") return c1;
  if (d.fill === "radial") {
    const g = ctx.createRadialGradient(b.x + b.w / 2, b.y + b.h * 0.4, 4, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) * 0.65);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
  }
  const a = (d.angle * Math.PI) / 180;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = (Math.cos(a) * b.w) / 2;
  const dy = (Math.sin(a) * b.h) / 2;
  const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

// ------------------------------------------------------------------ patterns
function drawPattern(ctx: Ctx, id: PatternId, d: Design, box: Box = FRONT) {
  if (id === "none") return;
  const { x, y, w, h } = box;
  const s = Math.max(6, d.patternSize);
  ctx.save();
  rr(ctx, box);
  ctx.clip();
  ctx.globalAlpha = d.patternIntensity;
  ctx.fillStyle = d.patternColor;
  ctx.strokeStyle = d.patternColor;
  ctx.lineWidth = Math.max(2, s * 0.25);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (id) {
    case "stripes":
      for (let i = -h; i < w + h; i += s * 1.6) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + h);
        ctx.lineTo(x + i + h, y);
        ctx.stroke();
      }
      break;
    case "dots":
      for (let j = 0; j * s < h + s; j++)
        for (let i = 0; i * s < w + s; i++) {
          ctx.beginPath();
          ctx.arc(x + i * s + (j % 2 ? s / 2 : 0), y + j * s, s * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    case "checker":
      for (let j = 0; j * s < h; j++)
        for (let i = 0; i * s < w; i++) if ((i + j) % 2 === 0) ctx.fillRect(x + i * s, y + j * s, s, s);
      break;
    case "zigzag":
      for (let j = 0; y + j * s * 1.6 < y + h + s; j++) {
        ctx.beginPath();
        for (let i = 0; i * s < w + s; i++) {
          const px = x + i * s;
          const py = y + j * s * 1.6 + (i % 2 ? s * 0.5 : 0);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      break;
    case "waves":
      for (let j = 0; y + j * s * 1.4 < y + h + s; j++) {
        ctx.beginPath();
        const py = y + j * s * 1.4;
        ctx.moveTo(x, py);
        for (let i = 0; i * s * 2 < w + s * 2; i++) {
          ctx.quadraticCurveTo(x + i * s * 2 + s / 2, py - s * 0.6, x + i * s * 2 + s, py);
          ctx.quadraticCurveTo(x + i * s * 2 + s * 1.5, py + s * 0.6, x + i * s * 2 + s * 2, py);
        }
        ctx.stroke();
      }
      break;
    case "crosses":
      ctx.lineWidth = Math.max(2, s * 0.18);
      for (let j = 0; j * s < h + s; j++)
        for (let i = 0; i * s < w + s; i++) {
          const cx = x + i * s + s / 2;
          const cy = y + j * s + s / 2;
          const k = s * 0.22;
          ctx.beginPath();
          ctx.moveTo(cx - k, cy);
          ctx.lineTo(cx + k, cy);
          ctx.moveTo(cx, cy - k);
          ctx.lineTo(cx, cy + k);
          ctx.stroke();
        }
      break;
    case "diamonds":
      for (let j = 0; j * s < h + s; j++)
        for (let i = 0; i * s < w + s; i++) {
          const cx = x + i * s + (j % 2 ? s / 2 : 0);
          const cy = y + j * s * 0.5;
          const k = s * 0.3;
          ctx.beginPath();
          ctx.moveTo(cx, cy - k);
          ctx.lineTo(cx + k, cy);
          ctx.lineTo(cx, cy + k);
          ctx.lineTo(cx - k, cy);
          ctx.closePath();
          ctx.fill();
        }
      break;
  }
  ctx.restore();
}

// ------------------------------------------------------------------ folder
function shadowOn(ctx: Ctx) {
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
}
function shadowOff(ctx: Ctx) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function drawFolder(ctx: Ctx, d: Design) {
  const st = d.style;
  ctx.save();

  if (st === "outline") {
    ctx.lineWidth = 11;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = fillFor(ctx, d, BACK, 0);
    ctx.beginPath();
    ctx.roundRect(20, 44, 216, 172, 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(20, 36, 100, 30, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(22, 80);
    ctx.lineTo(234, 80);
    ctx.stroke();
    ctx.restore();
    drawPattern(ctx, d.pattern, d);
    return;
  }

  if (st === "neon") {
    ctx.shadowColor = d.color;
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#14142a";
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 6;
    rr(ctx, BACK);
    ctx.fill();
    ctx.stroke();
    rr(ctx, TAB);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1b1b38";
    rr(ctx, FRONT);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawPattern(ctx, d.pattern, d);
    return;
  }

  if (st === "win11") {
    shadowOn(ctx);
    ctx.fillStyle = d.fill === "solid" ? shade(d.color, -0.16) : shade(d.color2, -0.08);
    rr(ctx, BACK);
    ctx.fill();
    rr(ctx, TAB);
    ctx.fill();
    shadowOff(ctx);
    ctx.fillStyle = fillFor(ctx, d, FRONT, 0);
    rr(ctx, FRONT);
    ctx.fill();
    drawPattern(ctx, d.pattern, d);
    // soft top highlight like the Windows 11 folder
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, FRONT.y, 256, 24);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(FRONT.x + 1.5, FRONT.y + 1.5, FRONT.w - 3, FRONT.h - 3, FRONT.r - 1);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    return;
  }

  if (st === "win10") {
    const b: Box = { x: 14, y: 44, w: 228, h: 176, r: 6 };
    const t: Box = { x: 14, y: 30, w: 92, h: 30, r: 6 };
    const f: Box = { x: 14, y: 82, w: 228, h: 138, r: 6 };
    shadowOn(ctx);
    ctx.fillStyle = shade(d.color, -0.18);
    rr(ctx, b);
    ctx.fill();
    rr(ctx, t);
    ctx.fill();
    shadowOff(ctx);
    ctx.fillStyle = fillFor(ctx, d, f, 0);
    rr(ctx, f);
    ctx.fill();
    drawPattern(ctx, d.pattern, d, f);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(f.x, f.y, f.w, 3);
    ctx.restore();
    return;
  }

  if (st === "minimal") {
    const body: Box = { x: 14, y: 52, w: 228, h: 170, r: 22 };
    const tab: Box = { x: 14, y: 32, w: 100, h: 38, r: 12 };
    shadowOn(ctx);
    ctx.fillStyle = fillFor(ctx, d, body, 0);
    rr(ctx, body);
    ctx.fill();
    rr(ctx, tab);
    ctx.fill();
    shadowOff(ctx);
    drawPattern(ctx, d.pattern, d, body);
    const g = ctx.createLinearGradient(0, body.y, 0, body.y + body.h);
    g.addColorStop(0, "rgba(255,255,255,0.28)");
    g.addColorStop(0.55, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    rr(ctx, body);
    ctx.fill();
    ctx.restore();
    return;
  }

  // classic / flat / glass
  const glass = st === "glass";
  shadowOn(ctx);
  ctx.globalAlpha = glass ? 0.65 : 1;
  ctx.fillStyle = fillFor(ctx, d, BACK, -0.22);
  rr(ctx, BACK);
  ctx.fill();
  rr(ctx, TAB);
  ctx.fill();
  shadowOff(ctx);
  ctx.globalAlpha = 1;

  if (st === "classic") {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#fdfdfd";
    ctx.beginPath();
    ctx.roundRect(32, 52, 192, 64, 6);
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = glass ? 0.6 : 1;
  ctx.fillStyle = fillFor(ctx, d, FRONT, 0);
  rr(ctx, FRONT);
  ctx.fill();
  ctx.globalAlpha = 1;

  drawPattern(ctx, d.pattern, d);

  if (st === "classic" || glass) {
    const g = ctx.createLinearGradient(0, FRONT.y, 0, FRONT.y + FRONT.h);
    g.addColorStop(0, `rgba(255,255,255,${glass ? 0.45 : 0.28})`);
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    rr(ctx, FRONT);
    ctx.fill();
  }
  if (glass) {
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 3;
    rr(ctx, FRONT);
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ icon layer
const imgCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imgCache.set(src, p);
    if (imgCache.size > 80) imgCache.delete(imgCache.keys().next().value as string);
  }
  return p;
}

/** Vertical center of the visible folder face, per style, so content always sits in the middle. */
function centerY(d: Design): number {
  switch (d.style) {
    case "win10": return 151;
    case "minimal": return 142;
    case "outline": return 148;
    default: return 146;
  }
}

const glyphCache = new Map<string, Promise<HTMLCanvasElement | null>>();

/** Crop a canvas to its visible pixels so centering uses real bounds, not the icon's padded box. */
function trim(c: HTMLCanvasElement): HTMLCanvasElement | null {
  const g = c.getContext("2d")!;
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 6) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d")!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

async function rawGlyph(ic: IconLayer, px: number): Promise<HTMLCanvasElement | null> {
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const g = c.getContext("2d")!;
  const box = px * 0.9;
  const mid = px / 2;
  if (ic.kind === "emoji") {
    g.font = `${box * 0.85}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(ic.name, mid, mid);
  } else if (ic.kind === "mdi" || ic.kind === "fa" || ic.kind === "brand") {
    const v = await getVector(ic.kind, ic.name);
    if (!v) return null;
    const k = box / Math.max(v.w, v.h);
    g.translate(mid - (v.w * k) / 2, mid - (v.h * k) / 2);
    g.scale(k, k);
    g.fillStyle = ic.kind === "brand" && ic.useBrand && v.hex ? v.hex : ic.color;
    g.fill(new Path2D(v.path));
  } else {
    const src = ic.kind === "image" ? ic.image : (await import("./lucideAll")).lucideSvgSrc(ic.name, ic.color, ic.stroke);
    const img = src ? await loadImage(src) : null;
    if (!img) return null;
    const k = Math.min(box / img.width, box / img.height);
    g.imageSmoothingQuality = "high";
    g.drawImage(img, mid - (img.width * k) / 2, mid - (img.height * k) / 2, img.width * k, img.height * k);
  }
  return trim(c);
}

function glyphFor(ic: IconLayer): Promise<HTMLCanvasElement | null> {
  const key = [ic.kind, ic.name, ic.color, ic.useBrand, ic.stroke, ic.kind === "image" ? ic.image.length + ic.image.slice(-48) : ""].join("|");
  let p = glyphCache.get(key);
  if (!p) {
    p = rawGlyph(ic, 384);
    glyphCache.set(key, p);
    if (glyphCache.size > 16) glyphCache.delete(glyphCache.keys().next().value as string);
  }
  return p;
}

async function drawIcon(ctx: Ctx, d: Design) {
  const ic = d.icon;
  if (!ic.enabled) return;
  const both = d.text.enabled && d.text.value.trim().length > 0;
  const sz = ic.size * (both ? 0.72 : 1);
  const cx = 128 + ic.x;
  const cy = (both ? centerY(d) - 28 : centerY(d)) + ic.y;

  const glyphCanvas = await glyphFor(ic);

  ctx.save();
  ctx.globalAlpha = ic.opacity;
  ctx.globalCompositeOperation = ic.blend;
  if (ic.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
  }

  let glyph = sz;
  if (ic.badge !== "none") {
    ctx.fillStyle = ic.badgeColor;
    ctx.beginPath();
    if (ic.badge === "circle") ctx.arc(cx, cy, sz / 2, 0, Math.PI * 2);
    else ctx.roundRect(cx - sz / 2, cy - sz / 2, sz, sz, sz * 0.24);
    ctx.fill();
    glyph = sz * 0.58;
    shadowOff(ctx);
  }

  if (glyphCanvas) {
    // longest side = glyph size, centered on the visible pixels
    const k = glyph / Math.max(glyphCanvas.width, glyphCanvas.height);
    const w = glyphCanvas.width * k;
    const h = glyphCanvas.height * k;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(glyphCanvas, cx - w / 2, cy - h / 2, w, h);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ text layer
function drawText(ctx: Ctx, d: Design) {
  const t = d.text;
  if (!t.enabled || !t.value.trim()) return;
  const lines = t.value.split("\n").slice(0, 4);
  const cy = (d.icon.enabled ? centerY(d) + 40 : centerY(d)) + t.y;

  ctx.save();
  const font = (px: number) => `${t.bold ? 700 : 500} ${px}px ${t.font}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${t.spacing}px`;
  ctx.font = font(t.size);
  // shrink so the widest line always fits inside the folder
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
  const k = Math.min(1, 208 / widest);
  const size = t.size * k;
  ctx.font = font(size);
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${t.spacing * k}px`;
  const lh = size * t.lineHeight;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.globalAlpha = t.opacity;
  lines.forEach((line, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * lh;
    if (t.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
    }
    if (t.outline) {
      ctx.strokeStyle = t.outlineColor;
      ctx.lineWidth = t.outlineWidth * 2;
      ctx.strokeText(line, 128, y);
      ctx.shadowColor = "transparent";
    }
    ctx.fillStyle = t.color;
    ctx.fillText(line, 128, y);
  });
  ctx.restore();
}

// ------------------------------------------------------------------ public
export async function renderDesign(d: Design, px = 256): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const ctx = c.getContext("2d")!;
  ctx.scale(px / 256, px / 256);
  drawFolder(ctx, d);
  await drawIcon(ctx, d);
  drawText(ctx, d);
  return c;
}


/** Lighten/darken a hex color and return hex (amt -1..1). */
export function shadeHex(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const f = (c: number) => Math.round(c + (t - c) * p).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}
