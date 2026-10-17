import { ICONS } from './icons.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** Inline Material Symbols icon. */
export const icon = (name, cls = '') => `<span class="ic ${cls}"><svg viewBox="0 -960 960 960" aria-hidden="true"><path d="${ICONS[name] || ''}"/></svg></span>`;
export function hydrateIcons(root = document) {
  $$('.ic[data-icon]', root).forEach((el) => {
    const d = ICONS[el.dataset.icon];
    if (d) el.innerHTML = `<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="${d}"/></svg>`;
    el.removeAttribute('data-icon');
  });
}

/** localStorage with JSON values; never throws. */
export const store = {
  get(k, d) { try { const v = localStorage.getItem('mr.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mr.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem('mr.' + k); } catch { /* ignore */ } },
};

export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.cancel = () => clearTimeout(t);
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fmtBytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B');
export const baseName = (p) => String(p).split(/[\\/]/).pop();
export const dirName = (p) => String(p).replace(/[\\/][^\\/]*$/, '');
export const isMac = /Mac|iPhone|iPad/i.test(navigator.platform);
