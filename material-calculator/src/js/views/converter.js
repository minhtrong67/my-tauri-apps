// Unit converter view.
import { CATEGORIES, convert } from '../units.js';
import { formatNumber } from '../engine.js';
import { settings, Emitter } from '../store.js';
import { t, formatDisplay, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import { h, $, $$, animate, copyText, fitText, esc } from '../ui.js';

export const convEvents = new Emitter();
const DEFAULTS = { length: ['m', 'ft'], mass: ['kg', 'lb'], temperature: ['C', 'F'], area: ['m2', 'ft2'], volume: ['l', 'gal'],
  speed: ['kmh', 'mph'], time: ['h', 'min'], data: ['MB', 'GB'], energy: ['kcal', 'kJ'], power: ['kW', 'hp'], pressure: ['bar', 'psi'], angle: ['deg', 'rad'] };

export const conv = {
  text: '1',
  units: Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, { from: v[0], to: v[1] }])),
  get cat() { return CATEGORIES.find((c) => c.id === settings.get('convCat')) || CATEGORIES[0]; },
  get pair() { return this.units[this.cat.id]; },
  get value() { const n = parseFloat(this.text); return Number.isFinite(n) ? n : 0; },
  result() { return convert(this.cat, this.value, this.pair.from, this.pair.to); },
};
const unitName = (u) => u[getLang()] || u.en;

export function createConverterView() {
  const el = h(`
    <section class="view view-conv" aria-label="${esc(t('nav.converter'))}">
      <div class="chips" role="tablist">
        ${CATEGORIES.map((c) => `<button class="chip-filter" role="tab" data-cat="${c.id}" data-ripple>${esc(t('cat.' + c.id))}</button>`).join('')}
      </div>
      <div class="conv-cards">
        <div class="conv-card" data-side="from">
          <span class="conv-label">${esc(t('conv.from'))}</span>
          <div class="conv-value" aria-live="polite"></div>
          <label class="select-wrap"><select class="select" aria-label="${esc(t('conv.from') + ' ' + t('conv.unit'))}"></select>${icon('chevronDown')}</label>
        </div>
        <button class="swap-btn" data-swap data-ripple aria-label="${esc(t('conv.swap'))}" title="${esc(t('conv.swap'))}">${icon('swap')}</button>
        <div class="conv-card conv-card-to" data-side="to">
          <span class="conv-label">${esc(t('conv.to'))}</span>
          <div class="conv-value" aria-live="polite"></div>
          <label class="select-wrap"><select class="select" aria-label="${esc(t('conv.to') + ' ' + t('conv.unit'))}"></select>${icon('chevronDown')}</label>
        </div>
      </div>
      <div class="pad pad-conv">
        ${['7', '8', '9'].map((d) => `<button class="key key-num" data-key="${d}" data-ripple>${d}</button>`).join('')}
        <button class="key key-fn key-icon" data-key="bs" data-ripple aria-label="${esc(t('calc.backspace'))}">${icon('backspace')}</button>
        ${['4', '5', '6'].map((d) => `<button class="key key-num" data-key="${d}" data-ripple>${d}</button>`).join('')}
        <button class="key key-clear" data-key="ac" data-ripple>AC</button>
        ${['1', '2', '3'].map((d) => `<button class="key key-num" data-key="${d}" data-ripple>${d}</button>`).join('')}
        <button class="key key-fn" data-key="neg" data-ripple>&plusmn;</button>
        <button class="key key-num key-wide" data-key="0" data-ripple>0</button>
        <button class="key key-num" data-key="." data-ripple>.</button>
        <button class="key key-eq key-icon" data-key="swap" data-ripple aria-label="${esc(t('conv.swap'))}">${icon('converter')}</button>
      </div>
    </section>`);

  const fromVal = $('[data-side="from"] .conv-value', el), toVal = $('[data-side="to"] .conv-value', el);
  const fromSel = $('[data-side="from"] select', el), toSel = $('[data-side="to"] select', el);
  let builtCat = '', raf = 0;

  function buildSelects() {
    const cat = conv.cat;
    builtCat = cat.id;
    const opts = cat.units.map((u) => `<option value="${u.id}">${esc(unitName(u))} (${esc(u.sym)})</option>`).join('');
    fromSel.innerHTML = opts; toSel.innerHTML = opts;
  }
  function render() {
    const cat = conv.cat;
    if (builtCat !== cat.id || fromSel.options.length !== cat.units.length) buildSelects();
    const p = conv.pair;
    fromSel.value = p.from; toSel.value = p.to;
    $$('.chip-filter', el).forEach((c) => { const on = c.dataset.cat === cat.id; c.classList.toggle('active', on); c.setAttribute('aria-selected', on); });
    const g = settings.get('grouping');
    const sym = (id) => cat.units.find((u) => u.id === id).sym;
    fromVal.innerHTML = `<span class="num">${esc(formatDisplay(conv.text || '0', g))}</span><span class="sym">${esc(sym(p.from))}</span>`;
    toVal.innerHTML = `<span class="num">${esc(formatDisplay(formatNumber(conv.result()), g))}</span><span class="sym">${esc(sym(p.to))}</span>`;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { fitText($('.num', fromVal), 48, 20); fitText($('.num', toVal), 48, 20); });
    convEvents.emit('change');
  }

  function press(key) {
    let s = conv.text;
    if (/^\d$/.test(key)) { s = s === '0' ? key : s === '-0' ? '-' + key : s + key; if (s.replace('-', '').replace('.', '').length > 15) return; }
    else if (key === '.') { if (!s.includes('.')) s = (s === '' || s === '-' ? s + '0' : s) + '.'; }
    else if (key === 'bs') { s = s.slice(0, -1); if (s === '-') s = ''; }
    else if (key === 'ac') s = '';
    else if (key === 'neg') s = s.startsWith('-') ? s.slice(1) : s === '' ? '-' : '-' + s;
    else if (key === 'swap') return swap();
    conv.text = s;
    render();
  }
  function swap() {
    const p = conv.pair;
    const res = conv.result();
    [p.from, p.to] = [p.to, p.from];
    conv.text = formatNumber(res).includes('e') ? conv.text : formatNumber(res);
    animate($('.swap-btn', el), [{ transform: 'rotate(0)' }, { transform: 'rotate(180deg)' }], { duration: 320 });
    render();
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.cat) { settings.set('convCat', b.dataset.cat); render(); animate($('.conv-cards', el), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260 }); return; }
    if (b.hasAttribute('data-swap')) return swap();
    if (b.dataset.key) press(b.dataset.key);
  });
  fromSel.addEventListener('change', () => { conv.pair.from = fromSel.value; render(); });
  toSel.addEventListener('change', () => { conv.pair.to = toSel.value; render(); });
  const unsubs = [settings.on('grouping', render), convEvents.on('pick', render)];

  return {
    el, mode: 'converter',
    refresh() { builtCat = ''; render(); },
    onShow() { this.refresh(); $('.chip-filter.active', el)?.scrollIntoView({ inline: 'center', block: 'nearest' }); },
    onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('select')) return false;
      let key = null;
      if (/^\d$/.test(e.key)) key = e.key;
      else if (e.key === '.' || e.key === ',') key = '.';
      else if (e.key === 'Backspace') key = 'bs';
      else if (e.key === 'Escape' || e.key === 'Delete') key = 'ac';
      else if (e.key === '-') key = 'neg';
      if (!key) return false;
      press(key); return true;
    },
    onPaste(text) {
      const n = parseFloat(text.trim().replace(/\s/g, '').replace(',', '.'));
      if (Number.isFinite(n)) { conv.text = formatNumber(n); render(); }
    },
    copy() { return copyText(formatNumber(conv.result())); },
    destroy() { unsubs.forEach((u) => u()); },
  };
}

/** Right-hand panel content: the value converted to every unit of the category. */
export function renderAllConversions(container) {
  const cat = conv.cat;
  const g = settings.get('grouping');
  container.innerHTML = cat.units.map((u) => {
    const val = formatNumber(convert(cat, conv.value, conv.pair.from, u.id));
    return `<button class="list-item conv-row ${u.id === conv.pair.to ? 'active' : ''}" data-unit="${u.id}" data-ripple>
      <span class="li-main"><span class="li-title">${esc(formatDisplay(val, g))}</span><span class="li-sub">${esc(unitName(u))}</span></span>
      <span class="li-end">${esc(u.sym)}</span></button>`;
  }).join('');
}
export function pickTargetUnit(id) { conv.pair.to = id; convEvents.emit('pick'); }
