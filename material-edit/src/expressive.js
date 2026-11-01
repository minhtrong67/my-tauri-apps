// Material 3 Expressive behaviours that plain CSS cannot do:
// custom tooltips, themed dropdowns, toast variants, scroll-to-top buttons, filled range tracks, morphing shapes.
import { shapeSvg } from './shapes.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const ico = (id) => `<svg class="i" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Top-layer element (popover) so tooltips, menus and toasts also show above open dialogs. */
function topLayer(node) {
  node.setAttribute('popover', 'manual');
  document.body.append(node);
  return {
    show() { try { if (node.matches(':popover-open')) node.hidePopover(); node.showPopover(); } catch { /* not supported */ } },
    hide() { try { if (node.matches(':popover-open')) node.hidePopover(); } catch { /* ignore */ } },
  };
}

/* ------------------------------------------------------------------ */
/*  Toasts (info / success / warning / error)                         */
/* ------------------------------------------------------------------ */
const VARIANT_ICON = { info: 'info', success: 'cloud-check', warning: 'alert', error: 'error' };
let toastEl, toastTop, toastTimer, toastHide;
let toastClose = 'Close';
export const setToastLabels = (close) => { toastClose = close; };

/** Shows one toast at a time. variant: info | success | warning | error. */
export function toast(msg, ms = 3400, variant = 'info') {
  if (!toastEl) {
    toastEl = $('#snackbar');
    toastEl.className = 'toast';
    toastEl.setAttribute('aria-live', 'polite');
    toastTop = topLayer(toastEl);
  }
  if (!VARIANT_ICON[variant]) variant = 'info';
  clearTimeout(toastTimer); clearTimeout(toastHide);
  toastEl.dataset.variant = variant;
  toastEl.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  toastEl.style.setProperty('--toast-ms', ms + 'ms');
  toastEl.innerHTML = `<span class="toast-ico">${ico(VARIANT_ICON[variant])}</span><span class="toast-msg"></span>`
    + `<button class="toast-x" type="button" aria-label="${toastClose}">${ico('close')}</button><i class="toast-bar"></i>`;
  $('.toast-msg', toastEl).textContent = msg;
  $('.toast-x', toastEl).onclick = () => hideToast();
  toastEl.classList.remove('show'); void toastEl.offsetWidth; // restart the entrance + timer bar
  toastTop.show();
  toastEl.classList.add('show');
  toastTimer = setTimeout(hideToast, ms);
}
export function hideToast() {
  if (!toastEl) return;
  toastEl.classList.remove('show');
  clearTimeout(toastHide);
  toastHide = setTimeout(() => toastTop.hide(), 260);
}

/* ------------------------------------------------------------------ */
/*  Tooltips                                                          */
/* ------------------------------------------------------------------ */
function initTooltips() {
  const tip = el('div', 'tip'); tip.setAttribute('role', 'tooltip');
  const tl = topLayer(tip);
  let timer, current = null;
  const hide = () => { clearTimeout(timer); tip.classList.remove('on'); current = null; setTimeout(() => { if (!current) tl.hide(); }, 140); };
  const place = (target) => {
    const r = target.getBoundingClientRect();
    tip.style.left = '0px'; tip.style.top = '0px';
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    let y = r.bottom + 10;
    let below = true;
    if (y + h > innerHeight - 8) { y = r.top - h - 10; below = false; }
    x = Math.max(8, Math.min(innerWidth - w - 8, x));
    tip.style.left = x + 'px'; tip.style.top = Math.max(8, y) + 'px';
    tip.dataset.side = below ? 'bottom' : 'top';
    tip.style.transformOrigin = `${r.left + r.width / 2 - x}px ${below ? '0' : '100%'}`;
  };
  const show = (target, text) => {
    current = target;
    const m = /^(.*?)\s*\(([^()]{1,24})\)\s*$/.exec(text);
    tip.replaceChildren();
    const label = el('span', 'tip-t'); label.textContent = m ? m[1] : text; tip.append(label);
    if (m) { const k = el('kbd', 'tip-k'); k.textContent = m[2]; tip.append(k); }
    tl.show(); place(target);
    requestAnimationFrame(() => tip.classList.add('on'));
  };
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest('[title], [data-tip]');
    if (!t || t === current) return;
    if (t.hasAttribute('title')) { // take over the native tooltip
      const v = t.getAttribute('title');
      if (v) t.dataset.tip = v;
      t.removeAttribute('title');
    }
    const text = t.dataset.tip;
    if (!text) return;
    clearTimeout(timer);
    timer = setTimeout(() => { if (t.isConnected && t.matches(':hover')) show(t, text); }, current ? 60 : 380);
  }, true);
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t && !t.contains(e.relatedTarget)) hide();
  }, true);
  ['pointerdown', 'keydown', 'wheel', 'blur'].forEach((ev) => window.addEventListener(ev, hide, true));
  document.addEventListener('focusin', (e) => { const t = e.target; if (t.matches && t.matches('[data-tip]:focus-visible')) show(t, t.dataset.tip); });
  document.addEventListener('focusout', hide);
}

/* ------------------------------------------------------------------ */
/*  Custom dropdown (replaces every <select class="select">)          */
/* ------------------------------------------------------------------ */
let openSel = null;
function closeSel() {
  if (!openSel) return;
  const { pop, btn, cleanup } = openSel;
  btn.setAttribute('aria-expanded', 'false');
  pop.classList.remove('on');
  cleanup();
  const p = pop; setTimeout(() => { try { p.hidePopover(); } catch { /* ignore */ } p.remove(); }, 160);
  openSel = null;
}

function enhanceSelect(sel) {
  if (sel.dataset.enhanced) return;
  sel.dataset.enhanced = '1';
  const wrap = el('span', 'sel-wrap');
  const btn = el('button', sel.className.replace(/\bselect\b/, '').trim() + ' select sel-btn');
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
  const label = el('span', 'sel-label');
  btn.append(label); btn.insertAdjacentHTML('beforeend', `<span class="sel-chev">${ico('chev')}</span>`);
  sel.before(wrap); wrap.append(btn, sel);
  sel.classList.add('sel-native'); sel.tabIndex = -1;

  const refresh = () => {
    const o = sel.options[sel.selectedIndex];
    label.textContent = o ? o.textContent : '';
    btn.disabled = sel.disabled;
  };
  // programmatic `.value = x` must update the label too
  const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(sel, 'value', { get() { return d.get.call(this); }, set(v) { d.set.call(this, v); refresh(); }, configurable: true });
  new MutationObserver(refresh).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'], characterData: true });
  refresh();

  const choose = (i) => {
    if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    refresh(); closeSel(); btn.focus();
  };

  const open = () => {
    if (openSel && openSel.btn === btn) { closeSel(); return; }
    closeSel();
    const pop = el('div', 'sel-pop'); pop.setAttribute('role', 'listbox'); pop.setAttribute('popover', 'manual');
    const items = [...sel.options].map((o, i) => {
      const b = el('button', 'sel-opt' + (i === sel.selectedIndex ? ' on' : ''));
      b.type = 'button'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', i === sel.selectedIndex);
      b.innerHTML = `<span class="sel-opt-t"></span><span class="sel-opt-c">${ico('check')}</span>`;
      $('.sel-opt-t', b).textContent = o.textContent;
      b.disabled = o.disabled;
      b.onclick = () => choose(i);
      pop.append(b); return b;
    });
    document.body.append(pop);
    try { pop.showPopover(); } catch { /* ignore */ }
    const r = btn.getBoundingClientRect();
    pop.style.minWidth = Math.max(r.width, 160) + 'px';
    const h = Math.min(pop.scrollHeight, 264);
    const spaceBelow = innerHeight - r.bottom - 12, up = spaceBelow < h && r.top > spaceBelow;
    pop.style.maxHeight = Math.min(264, up ? r.top - 12 : spaceBelow) + 'px';
    pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.left)) + 'px';
    pop.style.top = up ? Math.max(8, r.top - Math.min(h, r.top - 12) - 6) + 'px' : r.bottom + 6 + 'px';
    pop.style.transformOrigin = up ? 'bottom' : 'top';
    requestAnimationFrame(() => { pop.classList.add('on'); const cur = $('.sel-opt.on', pop); if (cur) cur.scrollIntoView({ block: 'nearest' }); });
    btn.setAttribute('aria-expanded', 'true');
    const onDown = (e) => { if (!pop.contains(e.target) && !btn.contains(e.target)) closeSel(); };
    const onKey = (e) => {
      const idx = items.findIndex((b) => b === document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSel(); btn.focus(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = items.length, step = e.key === 'ArrowDown' ? 1 : -1;
        let j = idx < 0 ? sel.selectedIndex : idx;
        for (let k = 0; k < n; k++) { j = (j + step + n) % n; if (!items[j].disabled) break; }
        items[j].focus();
      } else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); items[e.key === 'Home' ? 0 : items.length - 1].focus(); }
    };
    const onScroll = (e) => { if (!pop.contains(e.target)) closeSel(); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', closeSel);
    document.addEventListener('scroll', onScroll, true);
    openSel = { pop, btn, cleanup() { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', closeSel); document.removeEventListener('scroll', onScroll, true); } };
    (items[sel.selectedIndex] || items[0]).focus({ preventScroll: true });
  };
  btn.addEventListener('click', open);
  btn.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); } });
}

/* ------------------------------------------------------------------ */
/*  Range sliders: filled track (--p)                                 */
/* ------------------------------------------------------------------ */
function fillRange(r) {
  const min = +r.min || 0, max = r.max === '' ? 100 : +r.max;
  const p = max > min ? ((+r.value - min) / (max - min)) * 100 : 0;
  r.style.setProperty('--p', Math.max(0, Math.min(100, p)).toFixed(2) + '%');
}
function initRanges() {
  const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(HTMLInputElement.prototype, 'value', { get() { return d.get.call(this); }, set(v) { d.set.call(this, v); if (this.type === 'range') fillRange(this); }, configurable: true });
  document.addEventListener('input', (e) => { if (e.target.type === 'range') fillRange(e.target); }, true);
  $$('input[type=range]').forEach(fillRange);
}

/* ------------------------------------------------------------------ */
/*  Scroll-to-top buttons                                             */
/* ------------------------------------------------------------------ */
export function attachScrollTop(scroller, { label = 'Back to top', host = scroller.parentElement, sticky = false } = {}) {
  if (!scroller || scroller.dataset.stt) return;
  scroller.dataset.stt = '1';
  const b = el('button', 'fab-top', ico('up')); b.type = 'button'; b.dataset.tip = label; b.setAttribute('aria-label', label);
  if (sticky) { // the scroller itself keeps the button: a zero-height sticky row pinned to its bottom edge
    const row = el('div', 'fab-sticky'); row.append(b); scroller.append(row);
  } else {
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.append(b);
  }
  const upd = () => b.classList.toggle('on', scroller.scrollTop > 360);
  scroller.addEventListener('scroll', upd, { passive: true });
  b.addEventListener('click', () => scroller.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }));
  upd();
  return b;
}

/* ------------------------------------------------------------------ */
/*  Morphing shape decorations / loaders                              */
/* ------------------------------------------------------------------ */
function initShapes() {
  const hero = $('.home-hero');
  if (hero && !hero.querySelector('.hero-shapes')) {
    const box = el('div', 'hero-shapes'); box.setAttribute('aria-hidden', 'true');
    const a = shapeSvg(['cookie9', 'sunny', 'cookie6', 'clover', 'squircle'], { hold: 2200, morph: 1100, spin: 6 });
    a.svg.classList.add('hs-a');
    const b = shapeSvg(['flower', 'cookie4', 'circle', 'burst'], { hold: 2600, morph: 1200, spin: -9 });
    b.svg.classList.add('hs-b');
    const c = shapeSvg(['circle', 'cookie6', 'squircle'], { hold: 1800, morph: 900 });
    c.svg.classList.add('hs-c');
    box.append(a.svg, b.svg, c.svg);
    hero.prepend(box);
  }
}

/** M3E loading indicator: a morphing shape. Use instead of a spinner. */
export function loadingIndicator() {
  const s = el('span', 'm3-loader'); s.setAttribute('role', 'progressbar'); s.setAttribute('aria-label', 'Loading');
  const { svg } = shapeSvg(['sunny', 'cookie9', 'cookie6', 'circle', 'cookie4'], { hold: 120, morph: 520, spin: 120 });
  s.append(svg); return s;
}

/* ------------------------------------------------------------------ */
export function initExpressive({ scrollLabel } = {}) {
  initTooltips();
  initRanges();
  $$('select.select').forEach(enhanceSelect);
  new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches && n.matches('select.select')) enhanceSelect(n);
      n.querySelectorAll && n.querySelectorAll('select.select').forEach(enhanceSelect);
      if (n.matches && n.matches('input[type=range]')) fillRange(n);
      n.querySelectorAll && n.querySelectorAll('input[type=range]').forEach(fillRange);
      if (n.matches && n.matches('.spinner')) n.replaceWith(loadingIndicator());
      n.querySelectorAll && n.querySelectorAll('.spinner').forEach((s) => s.replaceWith(loadingIndicator()));
    }
  }).observe(document.body, { childList: true, subtree: true });
  initShapes();
  const lab = scrollLabel || 'Back to top';
  attachScrollTop($('#home-body'), { label: lab, host: $('#home') });
  attachScrollTop($('#left-body'), { label: lab, host: $('#left') });
  attachScrollTop($('#right'), { label: lab, sticky: true });
  attachScrollTop($('.set-pages'), { label: lab, host: $('.set-pages').parentElement });
}
