export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const baseName = (p: string) => String(p).split(/[\\/]/).pop() || '';
export const dirName = (p: string) => String(p).replace(/[\\/][^\\/]*$/, '');
export const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMac = /Mac|iPhone|iPad/i.test(navigator.platform);

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const d = (...a: A) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.cancel = () => clearTimeout(t);
  return d;
}
export const samePath = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Hex colour helpers */
export const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s);
export const isLightColor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
};

export function resolvePath(base: string, rel: string) {
  const sep = base.includes('\\') ? '\\' : '/', p = base.split(/[\\/]/); p.pop();
  for (const s of decodeURIComponent(rel).split('/')) { if (s === '..') p.pop(); else if (s && s !== '.') p.push(s); }
  return p.join(sep);
}
