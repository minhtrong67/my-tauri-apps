import { $, $$, esc, icon, hydrateIcons, reduceMotion } from './util.js';
import { t } from './i18n.js';

/* ---------- ripple ---------- */
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.btn, .ibtn, .tab, .wbtn, .item, .s-btn, .seg button, .swatch, .toc-i, .chip');
  if (!el || el.disabled || reduceMotion()) return;
  const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
  const s = document.createElement('span');
  s.className = 'rp';
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.appendChild(s);
  s.addEventListener('animationend', () => s.remove());
}, true);

/* ---------- tooltips ---------- */
const tip = $('#tip');
let tipT, tipEl;
function showTip(el) {
  const txt = el.dataset.tip;
  if (!txt) return;
  tip.innerHTML = esc(txt) + (el.dataset.sc ? `<kbd>${esc(el.dataset.sc)}</kbd>` : '');
  tip.classList.add('on');
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
  if (y + h > innerHeight - 4) y = r.top - h - 8;
  tip.style.left = Math.max(6, Math.min(innerWidth - w - 6, x)) + 'px';
  tip.style.top = y + 'px';
}
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (el === tipEl) return;
  tipEl = el; clearTimeout(tipT); tip.classList.remove('on');
  if (el) tipT = setTimeout(() => showTip(el), 450);
});
document.addEventListener('pointerdown', () => { clearTimeout(tipT); tip.classList.remove('on'); }, true);
document.addEventListener('scroll', () => tip.classList.remove('on'), true);

/** Fills data-i / data-tk / data-pk attributes with translated text. */
export function translateDom(root = document) {
  $$('[data-i]', root).forEach((e) => { e.textContent = t(e.dataset.i); });
  $$('[data-tk]', root).forEach((e) => { e.dataset.tip = t(e.dataset.tk); e.setAttribute('aria-label', e.dataset.tip); });
  $$('[data-pk]', root).forEach((e) => { e.placeholder = t(e.dataset.pk); });
}

/* ---------- snackbar ---------- */
const snack = $('#snack'), snackText = $('#snackText'), snackAct = $('#snackAct');
let snackTimer, snackCb = null;
export function toast(msg, action, cb, ms = 3200) {
  snackText.textContent = msg;
  snackAct.textContent = action || '';
  snackCb = cb || null;
  snack.classList.add('on');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => snack.classList.remove('on'), action ? Math.max(ms, 6000) : ms);
}
snackAct.addEventListener('click', () => { snack.classList.remove('on'); const f = snackCb; snackCb = null; if (f) f(); });

/* ---------- menus ---------- */
let openMenuEl = null, menuCleanup = null;
export function closeMenu() {
  if (!openMenuEl) return;
  const m = openMenuEl; openMenuEl = null;
  if (menuCleanup) menuCleanup();
  if (reduceMotion()) m.remove();
  else { m.classList.add('out'); m.addEventListener('animationend', () => m.remove(), { once: true }); }
}
/**
 * items: [{ label, icon, shortcut, run, disabled, header, sep, sub }] — anchor: element or {x, y}
 */
export function openMenu(anchor, items, opts = {}) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu'; m.setAttribute('role', 'menu');
  m.innerHTML = items.map((it, i) => it.sep ? '<hr>' : it.header ? `<div class="mh">${esc(it.header)}</div>`
    : `<button class="item" role="menuitem" data-i="${i}"${it.disabled ? ' disabled' : ''}>${it.icon ? icon(it.icon) : '<span class="ic"></span>'}<span class="tx"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.shortcut ? `<span class="sc">${esc(it.shortcut)}</span>` : ''}</button>`).join('');
  $('#menus').appendChild(m);
  const a = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0, height: 0 };
  const w = m.offsetWidth, h = m.offsetHeight;
  let x = opts.alignRight ? a.right - w : a.left, y = a.bottom + 4;
  if (y + h > innerHeight - 8) y = Math.max(8, a.top - h - 4);
  x = Math.max(8, Math.min(innerWidth - w - 8, x));
  m.style.left = x + 'px'; m.style.top = y + 'px';
  m.style.setProperty('--ox', `${a.left - x + a.width / 2}px ${y > a.top ? 'top' : 'bottom'}`);
  m.addEventListener('click', (e) => {
    const b = e.target.closest('.item'); if (!b) return;
    const it = items[+b.dataset.i]; closeMenu(); if (it && it.run) setTimeout(it.run, 60);
  });
  const onDown = (e) => { if (!m.contains(e.target)) closeMenu(); };
  const onKey = (e) => {
    const bs = $$('.item:not([disabled])', m), i = bs.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length]?.focus(); }
  };
  setTimeout(() => document.addEventListener('pointerdown', onDown, true));
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('blur', closeMenu);
  menuCleanup = () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey, true); window.removeEventListener('blur', closeMenu); };
  openMenuEl = m;
  if (opts.focus !== false) setTimeout(() => $('.item:not([disabled])', m)?.focus(), 30);
  return m;
}

/* ---------- dialogs ---------- */
export function closeDialog(dlg, result) {
  if (!dlg.open) return;
  dlg._result = result;
  if (reduceMotion()) { dlg.close(); return; }
  dlg.classList.add('closing');
  dlg.addEventListener('animationend', () => { dlg.classList.remove('closing'); dlg.close(); }, { once: true });
}
function wireDialog(dlg) {
  if (dlg._wired) return; dlg._wired = true;
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dlg, 'cancel'); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg, 'cancel'); });
}
/** Shows the shared dialog and resolves with the id of the pressed button ('cancel' when dismissed). */
export function showDialog({ title, body, actions = [], cls = '', raw = false }) {
  const dlg = $('#dlg');
  wireDialog(dlg);
  dlg.className = 'dlg ' + cls;
  dlg.innerHTML = `<div class="dlg-in">${title ? `<h2>${esc(title)}</h2>` : ''}${raw ? body : `<p>${esc(body || '')}</p>`}<div class="dlg-act">${actions.map((a) => `<button class="btn ${a.kind || 'text'}" data-r="${a.id}">${esc(a.label)}</button>`).join('')}</div></div>`;
  hydrateIcons(dlg);
  return new Promise((res) => {
    dlg._result = 'cancel';
    dlg.onclose = () => res(dlg._result);
    dlg.onclick = (e) => { const b = e.target.closest('[data-r]'); if (b) closeDialog(dlg, b.dataset.r); else if (e.target === dlg) closeDialog(dlg, 'cancel'); };
    dlg.showModal();
    ($('[data-r]:last-child', dlg) || dlg).focus();
  });
}
export { wireDialog };

/** Positions the sliding thumb of a segmented control under its active button. */
export function thumb(seg) {
  const on = $('button.on', seg), th = $('.thumb', seg);
  if (!on || !th || !on.offsetWidth) return;
  if (!th._init) { th.style.transition = 'none'; requestAnimationFrame(() => requestAnimationFrame(() => { th.style.transition = ''; th._init = true; })); }
  th.style.width = on.offsetWidth + 'px';
  th.style.transform = `translateX(${on.offsetLeft}px)`;
}
