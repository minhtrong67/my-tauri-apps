import { extOf } from './tauri';

export type Shape = 'square' | 'rounded' | 'squircle' | 'circle';
export type Fit = 'contain' | 'cover';

export interface IconOpts {
  shape: Shape;
  radius: number; // % of the icon size, used by "rounded"
  padding: number; // %
  zoom: number; // %
  offsetX: number; // %
  offsetY: number; // %
  fit: Fit;
  bg: string | null; // hex or null (transparent)
}

export const DEFAULT_OPTS: IconOpts = { shape: 'rounded', radius: 20, padding: 8, zoom: 100, offsetX: 0, offsetY: 0, fit: 'contain', bg: null };
export const ALL_SIZES = [16, 24, 32, 48, 64, 128, 256];
export const RECOMMENDED_SIZES = [16, 32, 48, 256];

export interface Source { img: HTMLImageElement; w: number; h: number; name: string; url: string; kind: string }

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif' };

/** SVGs without explicit width/height decode at 150px; give them a large intrinsic size so they stay crisp. */
function prepareSvg(text: string) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('Invalid SVG');
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const num = (v: string | null) => (v && /^[\d.]+(px)?$/.test(v.trim()) ? parseFloat(v) : NaN);
  let w = num(svg.getAttribute('width')), h = num(svg.getAttribute('height'));
  const vb = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  if ((!w || !h) && vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) { w = vb[2]; h = vb[3]; }
  if (!w || !h) { w = 512; h = 512; }
  const k = 1024 / Math.max(w, h);
  svg.setAttribute('width', String(Math.round(w * k)));
  svg.setAttribute('height', String(Math.round(h * k)));
  if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  return new XMLSerializer().serializeToString(svg);
}

export async function loadSource(name: string, bytes: Uint8Array): Promise<Source> {
  const ext = extOf(name);
  const blob = ext === 'svg'
    ? new Blob([prepareSvg(new TextDecoder().decode(bytes))], { type: 'image/svg+xml' })
    : new Blob([bytes as BlobPart], { type: MIME[ext] || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try { await img.decode(); } catch { URL.revokeObjectURL(url); throw new Error('decode'); }
  return { img, w: img.naturalWidth, h: img.naturalHeight, name, url, kind: ext.toUpperCase() };
}

function clipShape(ctx: CanvasRenderingContext2D, s: number, shape: Shape, radiusPct: number) {
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  else if (shape === 'squircle') {
    const n = 5, r = s / 2;
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2, c = Math.cos(t), si = Math.sin(t);
      const x = r + r * Math.sign(c) * Math.abs(c) ** (2 / n), y = r + r * Math.sign(si) * Math.abs(si) ** (2 / n);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  } else if (shape === 'rounded') {
    const r = Math.min(s / 2, (radiusPct / 100) * s);
    ctx.moveTo(r, 0); ctx.arcTo(s, 0, s, s, r); ctx.arcTo(s, s, 0, s, r); ctx.arcTo(0, s, 0, 0, r); ctx.arcTo(0, 0, s, 0, r); ctx.closePath();
  } else ctx.rect(0, 0, s, s);
}

const canvas = (s: number) => { const c = document.createElement('canvas'); c.width = c.height = s; return c; };

export function renderMaster(src: Source, o: IconOpts, size = 1024): HTMLCanvasElement {
  const c = canvas(size), ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.save();
  clipShape(ctx, size, o.shape, o.radius);
  ctx.clip();
  if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, size, size); }
  const pad = (o.padding / 100) * size, box = size - pad * 2;
  if (o.fit === 'cover') { ctx.beginPath(); ctx.rect(pad, pad, box, box); ctx.clip(); }
  const base = o.fit === 'cover' ? Math.max(box / src.w, box / src.h) : Math.min(box / src.w, box / src.h);
  const k = base * (o.zoom / 100), dw = src.w * k, dh = src.h * k;
  ctx.drawImage(src.img, size / 2 - dw / 2 + (o.offsetX / 100) * size, size / 2 - dh / 2 + (o.offsetY / 100) * size, dw, dh);
  ctx.restore();
  return c;
}

/** High quality downscale by repeated halving. */
export function downscale(master: HTMLCanvasElement, size: number): HTMLCanvasElement {
  let cur = master;
  while (cur.width / 2 >= size) {
    const next = canvas(Math.round(cur.width / 2)), x = next.getContext('2d')!;
    x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, next.width, next.height); cur = next;
  }
  if (cur.width === size) return cur;
  const out = canvas(size), x = out.getContext('2d')!;
  x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, size, size);
  return out;
}

export const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8A65"/><stop offset="1" stop-color="#E91E63"/></linearGradient><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE082"/><stop offset="1" stop-color="#FFB300"/></linearGradient></defs><path d="M128 14c20 0 31 18 49 24 20 6 42-1 54 16 11 17 0 36 2 56 2 22 20 36 14 57-6 20-30 22-47 32-17 11-26 34-47 36-20 2-33-15-50-24-19-10-44-9-53-29-9-20 8-39 8-59 0-20-17-38-8-57 10-19 33-17 50-27 14-8 12-25 28-25z" fill="url(#g)"/><path d="M128 66l17 36 39 5-29 27 8 39-35-20-35 20 8-39-29-27 39-5z" fill="url(#h)"/></svg>`;
