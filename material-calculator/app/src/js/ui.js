import { settings } from './store.js';
import { t } from './i18n.js';
import { icon } from './icons.js';

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

const TOAST_ICON = { info: 'info', success: 'check', error: 'close', warning: 'alert' };
export function toast(message, variant = 'success') {
  let host = $('#toasts');
  if (!host) { host = h('<div id="toasts" class="toasts" role="region" aria-live="polite"></div>'); document.body.appendChild(host); }
  while (host.children.length >= 3) host.firstElementChild.remove();
  const el = h(`<div class="toast toast-${variant}" role="${variant === 'error' ? 'alert' : 'status'}"><span class="toast-ic">${icon(TOAST_ICON[variant] || 'info')}</span><span class="toast-msg">${esc(message)}</span><i class="toast-bar"></i></div>`);
  host.appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  const timer = setTimeout(kill, 2600);
  el.addEventListener('click', () => { clearTimeout(timer); kill(); });
}

/** Modal confirmation. Resolves true when confirmed. tone: 'danger' | 'primary'. */
export function confirmDialog({ title, message, confirmLabel, icon: ic = 'check', tone = 'primary' }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const el = h(`<div class="dlg-scrim" role="presentation"><div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t">
      <div class="dlg-ic tone-${tone}">${icon(ic)}</div><h2 id="dlg-t">${esc(title)}</h2><p>${esc(message)}</p>
      <div class="dlg-actions"><button class="btn btn-text" data-r="0" data-ripple>${icon('close')}<span>${esc(t('common.cancel'))}</span></button>
      <button class="btn btn-${tone}" data-r="1" data-ripple>${icon(ic)}<span>${esc(confirmLabel)}</span></button></div></div></div>`);
    const done = (v) => { document.removeEventListener('keydown', key, true); el.classList.add('out'); setTimeout(() => { el.remove(); prev?.focus?.(); }, 200); resolve(v); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } else if (e.key === 'Tab') { const b = $$('button', el); const i = b.indexOf(document.activeElement); e.preventDefault(); b[(i + (e.shiftKey ? -1 : 1) + b.length) % b.length].focus(); } };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); else if (e.target === el) done(false); });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(el);
    $('[data-r="0"]', el).focus();
  });
}

export async function copyText(text) {
  if (text === undefined || text === null || text === '') { toast(t('common.nothingToCopy'), 'warning'); return false; }
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
