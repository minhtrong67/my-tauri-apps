// Ribbon engine: builds tabs / groups / controls from a declarative definition and keeps their state in sync.
import { el, esc } from './util.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { openMenu, openPopover, closePopup, toggledOff, tip } from './popup.js';
import { settings, saveSettings } from './settings.js';

const controls = []; // { update(state) }
let tabsEl, ribbonEl;
let activeTab = 'home';
let defCache = null;
let getState = () => ({});
let onTab = () => {};

/* ---------------------------- colour palette ---------------------------- */
const hsl = (h, s, l) => {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
};
const mix = (hex, to, p) => {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * p).toString(16).padStart(2, '0')).join('');
};
const BASE = ['#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'];
export const STANDARD = ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'];
export const HL_COLORS = ['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#0000ff', '#ff0000', '#000080', '#008080', '#008000', '#800080', '#800000', '#808000', '#808080', '#c0c0c0', '#000000'];
void hsl;

function palette(onPick, { none, noneLabel, current, hl }) {
  const root = el('div', { class: 'palette' });
  if (none) {
    const b = el('button', { class: 'pal-none', type: 'button', html: `<span class="sw none"></span><span>${esc(noneLabel)}</span>` });
    b.onclick = () => { closePopup(); onPick(null); };
    root.append(b);
  }
  const grid = (colors, cls = '') => {
    const g = el('div', { class: 'pal-grid ' + cls });
    for (const c of colors) {
      const b = el('button', { class: 'sw' + (current && current.toLowerCase() === c ? ' on' : ''), type: 'button', style: { background: c }, title: c });
      b.onclick = () => { closePopup(); onPick(c); };
      g.append(b);
    }
    return g;
  };
  if (hl) {
    root.append(el('div', { class: 'pal-h', text: t('color.standard') }), grid(HL_COLORS, 'c5'));
  } else {
    root.append(el('div', { class: 'pal-h', text: t('color.theme') }), grid(BASE));
    const shades = [];
    for (const p of [0.8, 0.6, 0.4]) for (const c of BASE) shades.push(c === '#ffffff' ? mix('#ffffff', '#000000', p * 0.18) : c === '#000000' ? mix('#000000', '#ffffff', 0.5 + (0.8 - p) * 0.6) : mix(c, '#ffffff', p));
    for (const p of [0.25, 0.5]) for (const c of BASE) shades.push(mix(c === '#ffffff' ? '#e0e0e0' : c, '#000000', c === '#000000' ? 0 : p));
    const sg = grid(shades, 'shades');
    root.append(sg);
    root.append(el('div', { class: 'pal-h', text: t('color.standard') }), grid(STANDARD));
  }
  if (settings.recentColors && settings.recentColors.length && !hl) {
    root.append(el('div', { class: 'pal-h', text: t('color.recent') }), grid(settings.recentColors.slice(0, 10)));
  }
  const more = el('label', { class: 'pal-more' }, el('span', { html: icon('accent') }), el('span', { text: t('color.more') }));
  const inp = el('input', { type: 'color', value: current && /^#[0-9a-f]{6}$/i.test(current) ? current : '#2b579a' });
  inp.addEventListener('change', () => { closePopup(); onPick(inp.value); });
  more.append(inp);
  root.append(more);
  return root;
}
export const rememberColor = (c) => {
  if (!c) return;
  const l = (settings.recentColors || []).filter((x) => x !== c);
  l.unshift(c);
  settings.recentColors = l.slice(0, 10);
  saveSettings();
};

/* ---------------------------- control builders ---------------------------- */
const L = (it) => (it.l ? t(it.l) : it.label || '');
function tipOf(it) {
  const name = it.tip ? t(it.tip) : it.l ? t(it.l) : '';
  return { name, kbd: it.kbd };
}

function mkBtn(it, size) {
  const b = el('button', { class: `rb ${size}${it.cls ? ' ' + it.cls : ''}`, type: 'button', id: it.id ? 'rb-' + it.id : null });
  const lab = L(it);
  b.innerHTML = (it.ic ? icon(it.ic) : it.glyph || '') + (size === 'lg' || it.showLabel ? `<span class="rl">${esc(lab)}</span>` : '');
  const tp = tipOf(it);
  if (tp.name) tip(b, tp.name, tp.kbd);
  b.addEventListener('mousedown', (e) => e.preventDefault()); // keep the editor selection
  if (it.run) b.addEventListener('click', (e) => { e.preventDefault(); it.run(b); });
  controls.push({
    update(s) {
      if (it.active) b.classList.toggle('on', !!it.active(s));
      if (it.enabled) b.disabled = !it.enabled(s);
    },
  });
  return b;
}

function mkDrop(it, size) {
  // a button that opens a menu (or a popover) — no primary action
  const b = el('button', { class: `rb ${size} drop${it.cls ? ' ' + it.cls : ''}`, type: 'button', id: it.id ? 'rb-' + it.id : null });
  const lab = L(it);
  b.innerHTML = (it.ic ? icon(it.ic) : '') + (size === 'lg' || it.showLabel ? `<span class="rl">${esc(lab)}${icon('down', 'cv')}</span>` : icon('down', 'cv'));
  const tp = tipOf(it);
  if (tp.name) tip(b, tp.name, tp.kbd);
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', (e) => { e.preventDefault(); openFrom(b, it); });
  controls.push({ update(s) { if (it.active) b.classList.toggle('on', !!it.active(s)); if (it.enabled) b.disabled = !it.enabled(s); } });
  return b;
}

function openFrom(anchor, it) {
  if (toggledOff(anchor)) return;
  if (it.popover) openPopover(anchor, it.popover(), { cls: it.pcls || '' });
  else openMenu(anchor, it.menu());
}

function mkSplit(it, size) {
  const w = el('div', { class: `rb-split ${size}` });
  const main = mkBtn({ ...it, id: it.id }, size === 'lg' ? 'lg' : size);
  const arrow = el('button', { class: 'rb arrow', type: 'button', html: size === 'lg' ? `<span class="rl">${esc(L(it))}${icon('down', 'cv')}</span>` : icon('down', 'cv') });
  arrow.addEventListener('mousedown', (e) => e.preventDefault());
  arrow.addEventListener('click', (e) => { e.preventDefault(); openFrom(w, it); });
  tip(arrow, tipOf(it).name);
  if (size === 'lg') main.querySelector('.rl')?.remove();
  w.append(main, arrow);
  return w;
}

function mkColor(it, size) {
  const w = el('div', { class: `rb-split color ${size}` });
  const main = el('button', { class: 'rb sm main', type: 'button', html: `${icon(it.ic)}<i class="cbar"></i>` });
  const bar = main.querySelector('.cbar');
  const arrow = el('button', { class: 'rb arrow', type: 'button', html: icon('down', 'cv') });
  const tp = tipOf(it);
  tip(main, tp.name);
  tip(arrow, tp.name);
  let cur = it.initial || null;
  const setBar = (c) => { cur = c; bar.style.background = c || 'transparent'; bar.classList.toggle('none', !c); };
  setBar(cur);
  for (const b of [main, arrow]) b.addEventListener('mousedown', (e) => e.preventDefault());
  main.addEventListener('click', (e) => { e.preventDefault(); if (cur) it.run(cur); else openFrom(w, { popover: pop }); });
  arrow.addEventListener('click', (e) => { e.preventDefault(); openFrom(w, { popover: pop }); });
  const pop = () => palette((c) => { if (c) { setBar(c); rememberColor(c); } else if (it.keepBar === false) setBar(null); it.run(c); }, { none: true, noneLabel: t(it.noneLabel || 'color.auto'), current: cur, hl: it.hl });
  w.append(main, arrow);
  controls.push({ update(s) { if (it.get) { const c = it.get(s); if (c && c !== cur && it.follow) setBar(c); } } });
  return w;
}

/** Editable combo box (font family / size). */
function mkCombo(it) {
  const w = el('div', { class: 'combo ' + (it.cls || ''), style: { width: it.w + 'px' } });
  const inp = el('input', { type: 'text', class: 'combo-in', spellcheck: 'false', 'aria-label': t(it.tip), autocomplete: 'off' });
  const btn = el('button', { class: 'combo-btn', type: 'button', tabindex: '-1', html: icon('down', 'cv') });
  w.append(inp, btn);
  tip(w, t(it.tip), it.kbd);
  let list = null;
  const apply = (v) => { it.set(v); };
  const showList = () => {
    if (toggledOff(w)) return;
    list = el('div', { class: 'combo-list', role: 'listbox' });
    const cur = inp.value.toLowerCase();
    for (const o of it.options()) {
      const v = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o;
      const row = el('button', { class: 'combo-opt' + (String(v).toLowerCase() === cur ? ' on' : ''), type: 'button', role: 'option', text: lab });
      if (it.preview) row.style.fontFamily = it.preview(v);
      row.addEventListener('mousedown', (e) => e.preventDefault());
      row.addEventListener('click', () => { closePopup(); inp.value = v; apply(v); });
      list.append(row);
    }
    openPopover(w, list, { cls: 'combo-pop', role: 'listbox' });
    requestAnimationFrame(() => { const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'center' }); });
  };
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', showList);
  inp.addEventListener('focus', () => inp.select());
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); apply(inp.value.trim()); }
    else if (e.key === 'Escape') { e.preventDefault(); it.back && it.back(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); showList(); }
  });
  controls.push({
    update(s) {
      if (document.activeElement === inp) return;
      const v = it.get(s);
      inp.value = v == null ? '' : v;
    },
  });
  return w;
}

function mkGallery(it) {
  const w = el('div', { class: 'gallery' });
  const row = el('div', { class: 'g-row' });
  const items = it.items();
  const btns = [];
  for (const g of items) {
    const b = el('button', { class: 'g-item', type: 'button' });
    b.innerHTML = `<span class="g-prev g-${g.id}">${esc(g.sample || 'AaBbCc')}</span><span class="g-name">${esc(g.label)}</span>`;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => it.run(g.id));
    btns.push([g.id, b]);
    row.append(b);
  }
  const more = el('button', { class: 'rb arrow g-more', type: 'button', html: icon('down', 'cv') });
  more.addEventListener('mousedown', (e) => e.preventDefault());
  more.addEventListener('click', () => {
    if (toggledOff(more)) return;
    const box = el('div', { class: 'g-all' });
    for (const g of items) {
      const b = el('button', { class: 'g-item', type: 'button', html: `<span class="g-prev g-${g.id}">${esc(g.sample || 'AaBbCc')}</span><span class="g-name">${esc(g.label)}</span>` });
      b.addEventListener('click', () => { closePopup(); it.run(g.id); });
      box.append(b);
    }
    const clear = el('button', { class: 'menu-item', type: 'button', html: `<span class="mi-ic">${icon('clearfmt')}</span><span class="mi-l">${esc(t('style.clear'))}</span>` });
    clear.onclick = () => { closePopup(); it.clear && it.clear(); };
    const wrap = el('div', {}, box, el('div', { class: 'menu-sep' }), clear);
    openPopover(more, wrap, { cls: 'g-pop', align: 'end' });
  });
  w.append(row, more);
  tip(more, t('tip.styles'));
  controls.push({
    update(s) {
      const cur = it.get(s);
      for (const [id, b] of btns) b.classList.toggle('on', id === cur);
    },
  });
  return w;
}

function mkItem(it, size = 'lg') {
  switch (it.k) {
    case 'btn': return mkBtn(it, it.size || size);
    case 'drop': return mkDrop(it, it.size || size);
    case 'split': return mkSplit(it, it.size || size);
    case 'color': return mkColor(it, it.size || 'sm');
    case 'combo': return mkCombo(it);
    case 'gallery': return mkGallery(it);
    case 'sep': return el('i', { class: 'vsep' });
    case 'stack': {
      const s = el('div', { class: 'stack' });
      for (const r of it.rows) {
        const row = el('div', { class: 'srow' });
        for (const x of r) row.append(mkItem(x, 'sm'));
        s.append(row);
      }
      return s;
    }
    case 'node': return it.node();
    default: return el('span');
  }
}

/* ---------------------------- build ---------------------------- */
export function buildRibbon(def, tabsHost, ribbonHost, { stateFn, tabFn }) {
  tabsEl = tabsHost; ribbonEl = ribbonHost; defCache = def; getState = stateFn; onTab = tabFn || (() => {});
  controls.length = 0;
  tabsEl.innerHTML = '';
  ribbonEl.innerHTML = '';
  for (const tab of def) {
    const tb = el('button', { class: 'tab' + (tab.ctx ? ' ctx' : '') + (tab.file ? ' file' : ''), type: 'button', role: 'tab', dataset: { tab: tab.id }, text: t(tab.l) });
    if (tab.ctx) tb.hidden = true;
    tb.addEventListener('click', () => {
      if (tab.file) { tab.open(); return; }
      if (settings.ribbonCollapsed && activeTab === tab.id && ribbonEl.classList.contains('float')) { ribbonEl.classList.remove('float'); return; }
      showTab(tab.id);
      if (settings.ribbonCollapsed) ribbonEl.classList.add('float');
    });
    tb.addEventListener('dblclick', () => { if (!tab.file) setCollapsed(!settings.ribbonCollapsed); });
    tabsEl.append(tb);
    if (tab.file) continue;
    const panel = el('div', { class: 'panel', dataset: { panel: tab.id }, hidden: tab.id !== activeTab });
    for (const g of tab.groups) {
      const grp = el('div', { class: 'group' + (g.cls ? ' ' + g.cls : '') });
      const body = el('div', { class: 'g-body' });
      for (const it of g.items) body.append(mkItem(it));
      grp.append(body, el('div', { class: 'g-label', text: t(g.l) }));
      if (g.launcher) {
        const lb = el('button', { class: 'launcher', type: 'button', html: icon('right') });
        tip(lb, t(g.launcherTip || g.l));
        lb.addEventListener('click', g.launcher);
        grp.append(lb);
      }
      panel.append(grp);
    }
    ribbonEl.append(panel);
  }
  const col = el('button', { class: 'tab-collapse icon-btn sm', type: 'button', html: icon('up') });
  col.addEventListener('click', () => setCollapsed(!settings.ribbonCollapsed));
  tip(col, t('tip.collapseRibbon'), 'Ctrl+F1');
  tabsEl.append(el('span', { class: 'spacer' }), col);
  applyCollapsed();
  showTab(activeTab, true);
  refreshRibbon();
}

export function showTab(id, quiet) {
  const tb = tabsEl.querySelector(`.tab[data-tab="${id}"]`);
  if (!tb || tb.hidden) id = 'home';
  activeTab = id;
  tabsEl.querySelectorAll('.tab').forEach((x) => { const on = x.dataset.tab === id; x.classList.toggle('active', on); x.setAttribute('aria-selected', on); });
  ribbonEl.querySelectorAll('.panel').forEach((p) => { p.hidden = p.dataset.panel !== id; });
  if (!quiet) onTab(id);
}
export const currentTab = () => activeTab;

export function setContextTab(id, on, { focus } = {}) {
  const tb = tabsEl && tabsEl.querySelector(`.tab[data-tab="${id}"]`);
  if (!tb) return;
  const was = !tb.hidden;
  tb.hidden = !on;
  if (on && !was && focus) showTab(id);
  if (!on && activeTab === id) showTab('home');
}

function applyCollapsed() {
  document.body.classList.toggle('rib-collapsed', !!settings.ribbonCollapsed);
  ribbonEl.classList.remove('float');
  const c = tabsEl.querySelector('.tab-collapse');
  if (c) c.classList.toggle('flip', !!settings.ribbonCollapsed);
}
export function setCollapsed(v) {
  settings.ribbonCollapsed = !!v;
  saveSettings();
  applyCollapsed();
}
document.addEventListener('pointerdown', (e) => {
  if (ribbonEl && ribbonEl.classList.contains('float') && !ribbonEl.contains(e.target) && !e.target.closest('#tabs') && !e.target.closest('.popup')) ribbonEl.classList.remove('float');
}, true);

let raf = 0;
export function refreshRibbon() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const s = getState();
    for (const c of controls) { try { c.update(s); } catch (e) { console.error(e); } }
  });
}
export const rebuildRibbon = () => { if (defCache) buildRibbon(defCache, tabsEl, ribbonEl, { stateFn: getState, tabFn: onTab }); };
