import { useEffect, useState } from 'react';
import { getCover, assetUrl, onlineImage } from './tauri';
import type { Track } from './types';

/** Ảnh bìa dự phòng cho bài cũ chưa có trường `cover` (khóa theo id bài hát, không theo thư mục/album) */
const legacy = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();
let active = 0;
const waiters: Array<() => void> = [];

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  while (active >= 4) await new Promise<void>((r) => waiters.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

/** string = có ảnh, null = chắc chắn không có, undefined = chưa biết (bài cũ) */
export function coverUrlOf(t: Track): string | null | undefined {
  if (t.source) return t.coverUrl ?? null; // online artwork is a plain web address
  if (t.cover) return assetUrl(t.cover);
  if (t.cover === '') return null;
  return undefined;
}

export function loadCover(t: Track): Promise<string | null> {
  if (t.source) return Promise.resolve(t.coverUrl ?? null);
  if (legacy.has(t.id)) return Promise.resolve(legacy.get(t.id)!);
  let p = pending.get(t.id);
  if (!p) {
    p = limited(() => getCover(t.path, false))
      .then((r) => {
        const u = r ? assetUrl(r.file) : null;
        legacy.set(t.id, u); // chỉ nhớ kết quả thật; lỗi tạm thời sẽ không bị nhớ
        return u;
      })
      .catch(() => null)
      .finally(() => pending.delete(t.id));
    pending.set(t.id, p);
  }
  return p;
}

/** Ghi lại tệp ảnh bìa nếu bộ nhớ đệm đã bị xóa */
/** Re-extract the cover into the current cache folder; resolves with the cached file path (or null) */
export const restoreCover = (t: Track) => t.source ? Promise.resolve(null) : getCover(t.path, false).then((r) => r?.file ?? null).catch(() => null);

export function useCover(t: Track | undefined, enabled = true): string | null {
  const direct = t ? coverUrlOf(t) : null;
  const [lazy, setLazy] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!t || !enabled || direct !== undefined) return;
    let alive = true;
    loadCover(t).then((u) => alive && setLazy({ id: t.id, url: u }));
    return () => {
      alive = false;
    };
     
  }, [t?.id, enabled, direct]);
  if (!t) return null;
  if (direct !== undefined) return direct;
  if (lazy && lazy.id === t.id) return lazy.url;
  return legacy.get(t.id) ?? null;
}

/**
 * Dominant accent colour of an image: pixels are grouped by hue and weighted by saturation, so a vivid colour wins over
 * large grey or near-black areas. Falls back to the average colour for monochrome artwork.
 */
export function dominantColor(img: CanvasImageSource & { width: number; height: number }): string {
  const S = 48;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, S, S);
  const px = ctx.getImageData(0, 0, S, S).data;
  const bins = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  let ar = 0, ag = 0, ab = 0, n = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 200) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    ar += r; ag += g; ab += b; n++;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 510;
    const d = max - min;
    if (d < 20 || l < 0.12 || l > 0.92) continue;
    const sat = d / (255 - Math.abs(max + min - 255));
    const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const bin = bins[Math.floor((h / 6) * 24) % 24];
    const w = sat * sat * (1 - Math.abs(l - 0.5));
    bin.w += w; bin.r += r * w; bin.g += g * w; bin.b += b * w;
  }
  const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
  const [r, g, b] = best.w > 0.5 ? [best.r / best.w, best.g / best.w, best.b / best.w] : n ? [ar / n, ag / n, ab / n] : [0, 120, 212];
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Lấy màu chủ đạo từ ảnh bìa (dùng cho màu nhấn động) */
const seedCache = new Map<string, string | null>();
export async function seedFromCover(t: Track): Promise<string | null> {
  if (seedCache.has(t.id)) return seedCache.get(t.id)!;
  let url: string | null = null;
  try {
    if (t.source) {
      // online artwork: the backend downloads it (the web view may not read pixels of a cross-origin image)
      if (!t.coverUrl) return null;
      const bytes = await onlineImage(t.coverUrl);
      url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    } else {
      const res = await getCover(t.path, true);
      if (!res?.dataUrl) {
        seedCache.set(t.id, null);
        return null;
      }
      url = res.dataUrl;
    }
    const img = new Image();
    img.src = url;
    await img.decode();
    const hex = dominantColor(img);
    seedCache.set(t.id, hex);
    return hex;
  } catch {
    return null; // lỗi tạm thời: không nhớ để lần sau thử lại
  } finally {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}
