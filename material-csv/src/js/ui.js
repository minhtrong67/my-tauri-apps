// Reusable UI pieces: toast, flyout menu, dialogs (confirm / prompt), helpers.
import { app } from './state.js';
import { icon } from './icons.js';
import { t } from './i18n.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const debounce = (fn, ms) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };
export const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
export const fmtNum = n => Number(n).toLocaleString(app.lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 4 });

/* -------------------------------- toast -------------------------------- */

export function toast(msg, kind = 'info', ms = 2600) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = icon(kind === 'ok' ? 'check' : kind === 'err' ? 'warn' : 'info') + `<span>${esc(msg)}</span>`;
  host.append(el);
  while (host.children.length > 4) host.firstChild.remove();
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 220); }, ms);
}

/* ---------------------------- flyout menu ---------------------------- */

let openMenu = null;

export function closeMenu() {
  if (!openMenu) return;
  const m = openMenu; openMenu = null;
  m.el.classList.remove('show');
  setTimeout(() => m.el.remove(), 120);
  document.removeEventListener('mousedown', m.out, true);
  document.removeEventListener('keydown', m.key, true);
  window.removeEventListener('blur', m.blur);
  m.anchor?.classList?.remove('open');
  m.onClose?.();
}

/**
 * items: {label, icon, kbd, run, disabled, checked, danger, sep, header, html}
 * target: element (anchored below) or {x, y} point.
 */
export function showMenu(target, items, { align = 'left', onClose, minWidth } = {}) {
  const same = openMenu && openMenu.anchor === target;
  closeMenu();
  if (same) return;
  const el = document.createElement('div');
  el.className = 'menu';
  el.setAttribute('role', 'menu');
  if (minWidth) el.style.minWidth = minWidth + 'px';
  const hasIcons = items.some(i => i.icon);
  el.innerHTML = items.map((it, i) => {
    if (it.sep) return '<div class="msep"></div>';
    if (it.header) return `<div class="mhead">${esc(it.header)}</div>`;
    return `<button class="mi${it.danger ? ' danger' : ''}" data-i="${i}" role="menuitem"${it.disabled ? ' disabled' : ''}>` +
      `<span class="mic">${it.checked ? icon('check') : it.icon ? icon(it.icon) : ''}</span>` +
      `<span class="ml">${it.html ?? esc(it.label)}</span>${it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ''}</button>`;
  }).join('');
  if (!hasIcons && !items.some(i => i.checked)) el.classList.add('noic');
  document.body.append(el);
  const place = () => {
    let x, y;
    if (target instanceof Element) {
      const r = target.getBoundingClientRect();
      y = r.bottom + 4;
      x = align === 'right' ? r.right - el.offsetWidth : r.left;
    } else { x = target.x; y = target.y; }
    x = clamp(x, 6, innerWidth - el.offsetWidth - 6);
    if (y + el.offsetHeight > innerHeight - 6) y = target instanceof Element ? target.getBoundingClientRect().top - el.offsetHeight - 4 : innerHeight - el.offsetHeight - 6;
    el.style.left = x + 'px';
    el.style.top = Math.max(6, y) + 'px';
  };
  place();
  const run = i => { const it = items[i]; if (!it || it.disabled || !it.run) return; closeMenu(); it.run(); };
  el.addEventListener('click', e => { const b = e.target.closest('.mi'); if (b) run(+b.dataset.i); });
  const focusables = () => $$('.mi:not([disabled])', el);
  const key = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); return; }
    const f = focusables();
    const i = f.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); f[(i + 1) % f.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); f[(i - 1 + f.length) % f.length]?.focus(); }
    else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); e.stopPropagation(); f[i].click(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  };
  const out = e => { if (!el.contains(e.target) && !(target instanceof Element && target.contains(e.target))) closeMenu(); };
  const blur = () => closeMenu();
  document.addEventListener('mousedown', out, true);
  document.addEventListener('keydown', key, true);
  window.addEventListener('blur', blur);
  if (target instanceof Element) target.classList.add('open');
  openMenu = { el, anchor: target, out, key, blur, onClose };
  requestAnimationFrame(() => el.classList.add('show'));
}

export const menuOpen = () => !!openMenu;

/* ------------------------------- dialogs ------------------------------- */

export function openDialog(dlg) {
  if (!dlg.open) dlg.showModal();
  dlg.classList.remove('closing');
}

export function closeDialog(dlg, result) {
  if (!dlg.open) return;
  if (result !== undefined) dlg.returnValue = result;
  if (!app.settings.anim) { dlg.close(); return; }
  dlg.classList.add('closing');
  setTimeout(() => { dlg.classList.remove('closing'); dlg.close(); }, 130);
}

function makeDialog(html, cls = '') {
  const dlg = document.createElement('dialog');
  dlg.className = 'dlg ' + cls;
  dlg.innerHTML = html;
  document.body.append(dlg);
  dlg.addEventListener('close', () => setTimeout(() => dlg.remove(), 50));
  dlg.addEventListener('cancel', e => { e.preventDefault(); closeDialog(dlg, 'cancel'); });
  dlg.addEventListener('mousedown', e => { if (e.target === dlg) closeDialog(dlg, 'cancel'); });
  return dlg;
}

/** buttons: [{id, label, primary, danger}] -> resolves with the clicked id ('cancel' on dismiss). */
export function confirmDialog({ title, body, buttons }) {
  return new Promise(res => {
    const dlg = makeDialog(`<h2>${esc(title)}</h2><p class="dbody">${esc(body)}</p><div class="dfoot">` +
      buttons.map(b => `<button class="btn${b.primary ? ' pri' : ''}${b.danger ? ' dng' : ''}" data-id="${b.id}">${esc(b.label)}</button>`).join('') + '</div>', 'small');
    dlg.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) closeDialog(dlg, b.dataset.id); });
    dlg.addEventListener('close', () => res(dlg.returnValue || 'cancel'));
    openDialog(dlg);
    (dlg.querySelector('.pri') || dlg.querySelector('.btn'))?.focus();
  });
}

export function promptDialog({ title, label, value = '', type = 'text', okLabel, min, max }) {
  return new Promise(res => {
    const dlg = makeDialog(`<h2>${esc(title)}</h2><label class="dlabel">${esc(label || '')}<input class="in" type="${type}" value="${esc(value)}"${min != null ? ` min="${min}"` : ''}${max != null ? ` max="${max}"` : ''}></label>` +
      `<div class="dfoot"><button class="btn pri" data-id="ok">${esc(okLabel || t('ok'))}</button><button class="btn" data-id="cancel">${esc(t('cancel'))}</button></div>`, 'small');
    const input = dlg.querySelector('input');
    const done = ok => { closeDialog(dlg, ok ? 'ok' : 'cancel'); };
    dlg.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) done(b.dataset.id === 'ok'); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); done(true); } });
    dlg.addEventListener('close', () => res(dlg.returnValue === 'ok' ? input.value : null));
    openDialog(dlg);
    input.focus(); input.select();
  });
}

export { makeDialog };

/* ------------------------------ Material ripple ------------------------------ */

const RIPPLE = '.btn, .tab, .mi, .li, .pi, .rec, .sbtn, .tabnew, .wc button, .tclose, .hb, .seg button, .sx nav button, .swatch, .person';

/** Material "ink" ripple that expands from the pointer position. */
export function initRipple() {
  document.addEventListener('pointerdown', e => {
    if (!app.settings.anim || e.button !== 0) return;
    const el = e.target.closest?.(RIPPLE);
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect();
    const d = Math.hypot(Math.max(e.clientX - r.left, r.right - e.clientX), Math.max(e.clientY - r.top, r.bottom - e.clientY)) * 2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    el.append(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
  }, { passive: true });
}
