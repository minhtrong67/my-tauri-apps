// Small shared helpers.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
export const baseName = (p) => String(p).split(/[\\/]/).pop();
export const dirName = (p) => String(p).replace(/[\\/][^\\/]*$/, '');
export const stripExt = (n) => n.replace(/\.[^.]+$/, '');
export const extOf = (p) => (String(p).includes('.') ? String(p).split('.').pop().toLowerCase() : '');
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  d.cancel = () => clearTimeout(t);
  return d;
}

// Unit conversion. Document metrics are stored in CSS px (96 dpi); the UI shows cm or inch.
export const PX_PER_IN = 96;
export const pxToCm = (px) => (px / PX_PER_IN) * 2.54;
export const cmToPx = (cm) => (cm / 2.54) * PX_PER_IN;
export const ptToPx = (pt) => (pt * 96) / 72;
export const pxToPt = (px) => (px * 72) / 96;
export const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
