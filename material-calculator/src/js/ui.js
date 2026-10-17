import { settings } from './store.js';
import { t } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function h(html) { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content.firstElementChild; }
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
export function motionOn() {
  const m = settings.get('motion');
  return m === 'on' ? true : m === 'off' ? false : !reduceMq.matches;
}
export function applyMotion() { document.documentElement.classList.toggle('no-motion', !motionOn()); }
reduceMq.addEventListener('change', applyMotion);
settings.on('motion', applyMotion);

/** Animate with the Web Animations API, honouring the motion setting. */
export function animate(el, keyframes, options) {
  if (!el || !motionOn() || !el.animate) return null;
  return el.animate(keyframes, { easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'none', ...options });
}

/** Material ripple on pointer down for any element with [data-ripple]. */
export function initRipple() {
  document.addEventListener('pointerdown', (e) => {
    if (!motionOn() || e.button !== 0) return;
    const host = e.target.closest?.('[data-ripple]');
    if (!host || host.disabled) return;
    const r = host.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    host.appendChild(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
  }, { passive: true });
}

let toastTimer;
export function toast(message) {
  let host = $('#snackbar');
  if (!host) { host = h('<div id="snackbar" class="snackbar" role="status" aria-live="polite"></div>'); document.body.appendChild(host); }
  host.textContent = message;
  host.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove('show'), 2200);
}

export async function copyText(text) {
  if (text === undefined || text === null || text === '') { toast(t('common.nothingToCopy')); return false; }
  try { await navigator.clipboard.writeText(String(text)); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
  }
  toast(t('common.copied'));
  return true;
}

/** Shrink text so it fits on one line inside its container. */
export function fitText(el, max, min = 18) {
  el.style.fontSize = max + 'px';
  const avail = el.clientWidth;
  if (!avail) return;
  const need = el.scrollWidth;
  if (need > avail) el.style.fontSize = Math.max(min, Math.floor((max * avail) / need) - 1) + 'px';
}
