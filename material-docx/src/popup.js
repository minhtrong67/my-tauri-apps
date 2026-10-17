// Menus, popovers, tooltips, toasts and confirm dialogs (Material 3 look).
import { $, $$, esc, el } from './util.js';
import { icon } from './icons.js';
import { t } from './i18n.js';

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export { reduceMotion };

/* ------------------------------ popups ------------------------------ */
let current = null; // { node, anchor, onClose }
const layer = () => $('#popup-layer');

export function closePopup() {
  if (!current) return;
  const c = current;
  current = null;
  c.node.classList.add('closing');
  c.anchor && c.anchor.classList && c.anchor.classList.remove('open');
  setTimeout(() => c.node.remove(), reduceMotion ? 0 : 110);
  if (c.onClose) c.onClose();
}
export const popupOpen = () => !!current;

function place(node, anchor, { align = 'start', gap = 4, at = null } = {}) {
  const vw = innerWidth, vh = innerHeight;
  node.style.left = '0px';
  node.style.top = '0px';
  const cap = parseFloat(getComputedStyle(node).maxHeight);
  node.style.maxHeight = Math.min(Number.isFinite(cap) ? cap : Infinity, vh - 16) + 'px';
  const r = node.getBoundingClientRect();
  let x, y;
  if (at) { x = at.x; y = at.y; } else {
    const a = anchor.getBoundingClientRect();
    x = align === 'end' ? a.right - r.width : a.left;
    y = a.bottom + gap;
    if (y + r.height > vh - 8 && a.top - gap - r.height > 8) y = a.top - gap - r.height;
  }
  if (x + r.width > vw - 8) x = vw - 8 - r.width;
  if (y + r.height > vh - 8) y = Math.max(8, vh - 8 - r.height);
  node.style.left = Math.max(8, x) + 'px';
  node.style.top = Math.max(8, y) + 'px';
}

/** Opens an arbitrary popover next to `anchor` (or at point `at`). */
export function openPopover(anchor, content, opts = {}) {
  closePopup();
  const node = el('div', { class: 'popup ' + (opts.cls || ''), role: opts.role || 'dialog' });
  node.append(content);
  layer().append(node);
  place(node, anchor, opts);
  if (anchor && anchor.classList) anchor.classList.add('open');
  current = { node, anchor, onClose: opts.onClose };
  requestAnimationFrame(() => node.classList.add('show'));
  return node;
}

/**
 * items: [{label, icon?, kbd?, run?, checked?, disabled?, sub?: items, sep?: true, html?: string|Node, danger?: true}]
 */
export function buildMenu(items, { onPick } = {}) {
  const root = el('div', { class: 'menu-list', role: 'menu' });
  for (const it of items) {
    if (it.sep) { root.append(el('div', { class: 'menu-sep' })); continue; }
    if (it.heading) { root.append(el('div', { class: 'menu-heading', text: it.heading })); continue; }
    if (it.node) { root.append(it.node); continue; }
    const row = el('button', { class: 'menu-item' + (it.danger ? ' danger' : '') + (it.checked ? ' checked' : ''), role: it.checked != null ? 'menuitemcheckbox' : 'menuitem', type: 'button' });
    if (it.disabled) row.disabled = true;
    row.innerHTML =
      `<span class="mi-ic">${it.checked ? icon('check') : it.icon ? icon(it.icon) : ''}</span>` +
      `<span class="mi-l">${it.html != null ? it.html : esc(it.label || '')}</span>` +
      (it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : '') + (it.sub ? icon('right', 'mi-arrow') : '');
    if (it.sub) {
      let subNode = null;
      const open = () => {
        closeSub();
        subNode = el('div', { class: 'popup sub show' });
        subNode.append(buildMenu(it.sub, { onPick }));
        layer().append(subNode);
        const a = row.getBoundingClientRect();
        place(subNode, row, { at: { x: a.right - 4, y: a.top - 8 } });
        row._sub = subNode;
        subs.push(subNode);
      };
      row.addEventListener('mouseenter', open);
      row.addEventListener('click', open);
    } else {
      row.addEventListener('mouseenter', closeSub);
      row.addEventListener('click', () => {
        closePopup();
        if (onPick) onPick(it);
        if (it.run) it.run();
      });
    }
    root.append(row);
  }
  return root;
}
let subs = [];
function closeSub() { for (const s of subs) s.remove(); subs = []; }

export function openMenu(anchor, items, opts = {}) {
  const node = openPopover(anchor, buildMenu(items), { ...opts, cls: 'menu ' + (opts.cls || ''), role: 'menu' });
  node.addEventListener('mouseleave', () => { /* keep submenus until click-away */ });
  return node;
}

/** Context menu at a screen point. */
export function openContextMenu(x, y, items) {
  return openPopover(null, buildMenu(items), { at: { x, y }, cls: 'menu', role: 'menu' });
}

document.addEventListener('pointerdown', (e) => {
  if (!current) return;
  if (current.node.contains(e.target) || subs.some((s) => s.contains(e.target))) return;
  if (current.anchor && current.anchor.contains && current.anchor.contains(e.target)) {
    // let the anchor's own click handler toggle it
    current.__toggle = true;
    return;
  }
  closePopup();
  closeSub();
}, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) { closePopup(); closeSub(); e.stopPropagation(); } }, true);
window.addEventListener('blur', () => { closePopup(); closeSub(); });
window.addEventListener('resize', () => { closePopup(); closeSub(); });

/** True when a click on `anchor` should just close its own open popup (toggle behaviour). */
export function toggledOff(anchor) {
  if (current && current.anchor === anchor) { closePopup(); closeSub(); return true; }
  return false;
}

/* ------------------------------ tooltips ------------------------------ */
let tipTimer, tipNode;
export function initTooltips() {
  tipNode = el('div', { class: 'tooltip', role: 'tooltip' });
  document.body.append(tipNode);
  const hide = () => { clearTimeout(tipTimer); tipNode.classList.remove('show'); };
  document.addEventListener('pointerover', (e) => {
    const h = e.target.closest && e.target.closest('[data-tip]');
    hide();
    if (!h || (h.disabled && !h.classList.contains('dim'))) return;
    tipTimer = setTimeout(() => {
      tipNode.innerHTML = h.dataset.tip.split('\n').map((l, i) => (i ? `<span class="tt-s">${esc(l)}</span>` : `<b>${esc(l)}</b>`)).join('');
      const r = h.getBoundingClientRect();
      tipNode.style.left = '0px';
      tipNode.style.top = '0px';
      const tr = tipNode.getBoundingClientRect();
      let x = r.left + r.width / 2 - tr.width / 2;
      let y = r.bottom + 8;
      if (y + tr.height > innerHeight - 4) y = r.top - tr.height - 8;
      tipNode.style.left = Math.min(innerWidth - tr.width - 6, Math.max(6, x)) + 'px';
      tipNode.style.top = y + 'px';
      tipNode.classList.add('show');
    }, 520);
  });
  document.addEventListener('pointerdown', hide, true);
  document.addEventListener('keydown', hide, true);
  document.addEventListener('pointerleave', hide, true);
}
export const tip = (node, text, kbd) => { node.dataset.tip = kbd ? `${text}\n${kbd}` : text; node.removeAttribute('title'); node.setAttribute('aria-label', text); };

/* ------------------------------ toast ------------------------------ */
let toastTimer;
export function toast(msg, ms = 3200, action) {
  const s = $('#snackbar');
  s.innerHTML = `<span>${esc(msg)}</span>`;
  if (action) {
    const b = el('button', { class: 'btn text', text: action.label, onclick: () => { s.classList.remove('show'); action.run(); } });
    s.append(b);
  }
  s.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => s.classList.remove('show'), ms);
}

/* ------------------------------ dialogs ------------------------------ */
const nativeClose = HTMLDialogElement.prototype.close;
HTMLDialogElement.prototype.close = function (rv) {
  if (!this.open || reduceMotion) return nativeClose.call(this, rv);
  if (this.classList.contains('closing')) return undefined;
  this.classList.add('closing');
  setTimeout(() => {
    this.classList.remove('closing');
    if (this.open) nativeClose.call(this, rv);
  }, 170);
  return undefined;
};
export const closeDialog = (d) => d.close();

export function askConfirm({ title, msg, yes, no, cancel = true }) {
  return new Promise((resolve) => {
    const dlg = $('#dlg-confirm');
    $('#cf-title').textContent = title;
    $('#cf-msg').textContent = msg;
    const bYes = $('#cf-yes'), bNo = $('#cf-no'), bCancel = $('#cf-cancel');
    bYes.textContent = yes;
    bNo.textContent = no || '';
    bNo.hidden = !no;
    bCancel.hidden = !cancel;
    bCancel.textContent = t('btn.cancel');
    const done = (v) => {
      bYes.onclick = bNo.onclick = bCancel.onclick = dlg.oncancel = null;
      if (dlg.open) dlg.close();
      resolve(v);
    };
    bYes.onclick = () => done('yes');
    bNo.onclick = () => done('no');
    bCancel.onclick = () => done('cancel');
    dlg.oncancel = (e) => { e.preventDefault(); done('cancel'); };
    dlg.showModal();
    bYes.focus();
  });
}

export const wireDialogs = () => {
  $$('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog.dialog').forEach((d) => d.addEventListener('mousedown', (e) => {
    if (e.target !== d || d.id === 'dlg-confirm') return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  }));
};

/** Generic form dialog. fields: [{id, type:'text'|'number'|'select'|'check'|'color'|'textarea'|'seg', label, value, options, min, max, step, unit, hint, wide}] */
export function formDialog({ title, fields, ok, cancel, onOk, width, extra }) {
  return new Promise((resolve) => {
    const dlg = el('dialog', { class: 'dialog form', style: width ? { width: width + 'px' } : {} });
    const body = el('div', { class: 'dlg-body' });
    const inputs = {};
    const grid = el('div', { class: 'form-grid' });
    for (const f of fields) {
      if (f.type === 'heading') { grid.append(el('h3', { class: 'form-h', text: f.label })); continue; }
      if (f.type === 'html') { grid.append(el('div', { class: 'form-wide', html: f.html })); continue; }
      const wrap = el('label', { class: 'lbl' + (f.wide ? ' wide' : '') + (f.type === 'check' ? ' check-row' : '') });
      let input;
      if (f.type === 'select') {
        input = el('select', { class: 'select block' });
        for (const [v, l] of f.options) input.append(el('option', { value: v, text: l }));
        input.value = f.value;
      } else if (f.type === 'check') {
        input = el('input', { type: 'checkbox' });
        input.checked = !!f.value;
        wrap.append(input, el('span', { text: f.label }));
        grid.append(wrap);
        inputs[f.id] = input;
        continue;
      } else if (f.type === 'textarea') {
        input = el('textarea', { class: 'field', rows: f.rows || 3 });
        input.value = f.value ?? '';
      } else {
        input = el('input', { class: 'field', type: f.type || 'text', value: f.value ?? '' });
        if (f.min != null) input.min = f.min;
        if (f.max != null) input.max = f.max;
        if (f.step != null) input.step = f.step;
        if (f.placeholder) input.placeholder = f.placeholder;
        if (f.type === 'number') input.value = f.value;
      }
      wrap.append(el('span', { text: f.label }));
      if (f.unit) {
        const row = el('div', { class: 'with-unit' }, input, el('i', { text: f.unit }));
        wrap.append(row);
      } else wrap.append(input);
      if (f.hint) wrap.append(el('small', { class: 'hint', text: f.hint }));
      grid.append(wrap);
      inputs[f.id] = input;
    }
    body.append(grid);
    if (extra) body.append(extra(inputs));
    const actions = el('div', { class: 'dlg-actions' });
    const bCancel = el('button', { class: 'btn text', type: 'button', text: cancel || t('btn.cancel') });
    const bOk = el('button', { class: 'btn filled', type: 'button', text: ok || t('btn.ok') });
    actions.append(el('span', { class: 'spacer' }), bCancel, bOk);
    dlg.append(el('h2', { text: title }), body, actions);
    document.body.append(dlg);
    const value = () => {
      const v = {};
      for (const f of fields) {
        const i = inputs[f.id];
        if (!i) continue;
        v[f.id] = f.type === 'check' ? i.checked : f.type === 'number' ? parseFloat(String(i.value).replace(',', '.')) : i.value;
      }
      return v;
    };
    const finish = (res) => {
      if (dlg.open) dlg.close();
      setTimeout(() => dlg.remove(), 220);
      resolve(res);
    };
    bCancel.onclick = () => finish(null);
    bOk.onclick = () => { const v = value(); if (onOk && onOk(v) === false) return; finish(v); };
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); });
    dlg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') { e.preventDefault(); bOk.click(); } });
    dlg.addEventListener('mousedown', (e) => {
      if (e.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) finish(null);
    });
    dlg.showModal();
    const first = Object.values(inputs)[0];
    if (first) { first.focus(); if (first.select) first.select(); }
  });
}
