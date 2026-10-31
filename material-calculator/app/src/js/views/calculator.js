// Standard + Scientific calculator view.
import { Calc } from '../calc.js';
import { evaluate, prepare, CalcError } from '../engine.js';
import { history, memory } from '../history.js';
import { settings } from '../store.js';
import { t, formatDisplay } from '../i18n.js';
import { icon } from '../icons.js';
import { h, $, $$, animate, copyText, fitText, toast, esc } from '../ui.js';

export const calc = new Calc();
calc.angle = settings.get('angle');
settings.on('angle', (a) => { calc.angle = a; });

const k = (key, label, cls = 'key-fn', extra = '') =>
  `<button class="key ${cls}" data-key="${key}" data-ripple ${extra}><span class="kl">${label}</span></button>`;

const NUMPAD = (withBackspace) => [
  withBackspace ? '' : [
    k('inv', '<span class="sup">1/</span>x', 'key-fn', 'aria-label="1/x"'), k('sq', 'x<sup>2</sup>', 'key-fn', 'aria-label="x squared"'),
    k('sqrt', '&radic;x', 'key-fn', 'aria-label="square root"'),
    k('bs', icon('backspace'), 'key-fn key-icon', `aria-label="${esc(t('calc.backspace'))}"`),
  ].join(''),
  k('ac', 'AC', 'key-clear', `aria-label="${esc(t('calc.clear'))}"`), k('paren', '( )', 'key-fn', 'aria-label="parentheses"'),
  k('pct', '%', 'key-fn'), k('/', '&divide;', 'key-op', 'aria-label="divide"'),
  ...['7', '8', '9'].map((d) => k(d, d, 'key-num')), k('*', '&times;', 'key-op', 'aria-label="multiply"'),
  ...['4', '5', '6'].map((d) => k(d, d, 'key-num')), k('-', '&minus;', 'key-op', 'aria-label="subtract"'),
  ...['1', '2', '3'].map((d) => k(d, d, 'key-num')), k('+', '+', 'key-op', 'aria-label="add"'),
  k('neg', '&plusmn;', 'key-num'), k('0', '0', 'key-num'), k('.', '.', 'key-num', 'aria-label="decimal point"'), k('=', '=', 'key-eq', 'aria-label="equals"'),
].join('');

function sciPad(second, hyp) {
  const tf = (base) => {
    const key = (second ? 'a' : '') + base + (hyp ? 'h' : '');
    const label = base + (hyp ? 'h' : '') + (second ? '<sup>\u22121</sup>' : '');
    return k(key, label, 'key-fn');
  };
  const ang = settings.get('angle');
  return [
    k('second', '2<sup>nd</sup>', 'key-toggle' + (second ? ' on' : ''), `aria-pressed="${second}" aria-label="${esc(t('sci.second'))}"`),
    k('angle', ang.toUpperCase(), 'key-toggle key-angle', `aria-label="${esc(t('sci.angle'))}"`),
    k('hyp', 'hyp', 'key-toggle' + (hyp ? ' on' : ''), `aria-pressed="${hyp}" aria-label="${esc(t('sci.hyp'))}"`),
    k('pi', '&pi;'), k('e', 'e'),
    tf('sin'), tf('cos'), tf('tan'), k('inv', '<span class="sup">1/</span>x'), k('abs', '|x|'),
    second ? k('cube', 'x<sup>3</sup>') : k('sq', 'x<sup>2</sup>'),
    second ? k('cbrt', '&#8731;x') : k('sqrt', '&radic;x'),
    k('^', 'x<sup>y</sup>'), k('fact', 'n!'), k('mod', 'mod'),
    second ? k('expe', 'e<sup>x</sup>') : k('exp10', '10<sup>x</sup>'),
    second ? k('log2', 'log<sub>2</sub>') : k('log', 'log'), k('ln', 'ln'), k('(', '('), k(')', ')'),
    k('rand', 'Rand'), k('ans', 'Ans'), second ? k('ceil', '&lceil;x&rceil;') : k('floor', '&lfloor;x&rfloor;'), k('exp', 'EXP'),
    k('bs', icon('backspace'), 'key-fn key-icon', `aria-label="${esc(t('calc.backspace'))}"`),
  ].join('');
}

const KEYMAP = {
  '+': '+', '-': '-', '*': '*', 'x': '*', 'X': '*', '/': '/', '^': '^', '(': '(', ')': ')', '%': 'pct', '!': 'fact',
  '.': '.', ',': '.', 'Enter': '=', '=': '=', 'Backspace': 'bs', 'Escape': 'ac', 'Delete': 'ac',
};

export function createCalculatorView(mode) {
  const sci = mode === 'scientific';
  let second = false, hyp = false;

  const el = h(`
    <section class="view view-calc ${sci ? 'is-sci' : 'is-std'}" aria-label="${esc(t('nav.' + mode))}">
      <div class="display" aria-live="polite">
        <div class="display-meta">
          <span class="badge badge-angle" ${sci ? '' : 'hidden'}></span>
          <span class="badge badge-mem" hidden>M</span>
        </div>
        <div class="expr" role="textbox" aria-readonly="true" aria-label="Expression"></div>
        <div class="result"></div>
      </div>
      <div class="mem-row" role="group" aria-label="${esc(t('panel.memory'))}">
        <button class="mem-btn" data-mem="mc" data-ripple title="${esc(t('mem.mc'))}">MC</button>
        <button class="mem-btn" data-mem="mr" data-ripple title="${esc(t('mem.mr'))}">MR</button>
        <button class="mem-btn" data-mem="mplus" data-ripple title="${esc(t('mem.mplus'))}">M+</button>
        <button class="mem-btn" data-mem="mminus" data-ripple title="${esc(t('mem.mminus'))}">M&minus;</button>
        <button class="mem-btn" data-mem="ms" data-ripple title="${esc(t('mem.ms'))}">MS</button>
      </div>
      <div class="pads">
        ${sci ? '<div class="pad pad-sci"></div>' : ''}
        <div class="pad pad-num ${sci ? '' : 'pad-std'}">${NUMPAD(sci)}</div>
      </div>
    </section>`);

  const exprEl = $('.expr', el), resultEl = $('.result', el), displayEl = $('.display', el);
  const angleBadge = $('.badge-angle', el), memBadge = $('.badge-mem', el);
  const sciEl = $('.pad-sci', el);
  let raf = 0;

  function renderSci() { if (sciEl) sciEl.innerHTML = sciPad(second, hyp); }
  function updateMem() {
    memBadge.hidden = !memory.has;
    $('[data-mem="mc"]', el).disabled = !memory.has;
    $('[data-mem="mr"]', el).disabled = !memory.has;
  }

  function render() {
    const g = settings.get('grouping');
    const final = calc.final;
    displayEl.classList.toggle('is-final', final);
    displayEl.classList.toggle('has-error', !!calc.error);
    if (final) {
      exprEl.textContent = formatDisplay(calc.expr, g) + ' =';
      resultEl.textContent = formatDisplay(calc.resultText, g);
    } else {
      exprEl.textContent = calc.expr ? formatDisplay(calc.expr, g) : t('calc.placeholder');
      exprEl.classList.toggle('is-placeholder', !calc.expr);
      const p = calc.preview();
      resultEl.textContent = calc.error ? t('err.' + calc.error) : p !== null ? '= ' + formatDisplay(p, g) : '';
    }
    if (final) exprEl.classList.remove('is-placeholder');
    if (sci) angleBadge.textContent = t('angle.' + calc.angle);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      fitText(exprEl, final ? 24 : 52, 22);
      fitText(resultEl, final ? 64 : 26, 18);
      exprEl.scrollLeft = exprEl.scrollWidth;
    });
  }

  function popResult() {
    animate(resultEl, [{ transform: 'translateY(10px) scale(.94)', opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 320 });
  }
  function shake() {
    animate(displayEl, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(7px)' },
      { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 320 });
  }

  function press(key) {
    if (key === '=') {
      const entry = calc.press('=');
      if (entry) { history.add({ mode, ...entry, angle: calc.angle }); popResult(); }
      else if (calc.error) shake();
    } else calc.press(key);
    render();
  }

  function memOp(op) {
    if (op === 'mc') { memory.clear(); toast(t('memory.cleared')); return; }
    if (op === 'mr') { if (memory.has) { calc.insertNumber(memory.recall()); render(); } return; }
    const v = calc.currentValue();
    if (v === null || v === undefined) return;
    if (op === 'ms') { memory.store(v); toast(t('memory.stored')); }
    else if (op === 'mplus') memory.add(v);
    else memory.sub(v);
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !el.contains(b)) return;
    if (b.dataset.mem) return memOp(b.dataset.mem);
    const key = b.dataset.key;
    if (!key) return;
    if (key === 'second') { second = !second; renderSci(); return; }
    if (key === 'hyp') { hyp = !hyp; renderSci(); return; }
    if (key === 'angle') {
      const order = ['deg', 'rad', 'grad'];
      settings.set('angle', order[(order.indexOf(calc.angle) + 1) % 3]);
      renderSci(); render(); return;
    }
    press(key);
  });

  const unsub = [memory.on('change', updateMem), settings.on('grouping', render)];

  return {
    el, mode,
    refresh() { renderSci(); updateMem(); render(); },
    onShow() { this.refresh(); },
    onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      let key = KEYMAP[e.key];
      if (/^\d$/.test(e.key)) key = e.key;
      else if (sci && e.key === 'p') key = 'pi';
      else if (sci && e.key === 'e') key = 'e';
      if (!key) return false;
      press(key);
      const btn = el.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (btn) { btn.classList.add('is-pressed'); setTimeout(() => btn.classList.remove('is-pressed'), 120); }
      return true;
    },
    onPaste(text) {
      const raw = text.trim();
      if (!raw) return;
      if (/^[\d.,'\s\u2212-]+$/.test(raw)) {
        let s = raw.replace(/[\s']/g, '').replace('\u2212', '-');
        const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
        if (lastDot >= 0 && lastComma >= 0) {
          const dec = lastDot > lastComma ? '.' : ',';
          s = s.split(dec === '.' ? ',' : '.').join('').replace(dec, '.');
        } else if (lastComma >= 0) {
          const parts = s.split(',');
          s = parts.length === 2 && parts[1].length !== 3 ? parts.join('.') : parts.join('');
        } else if (lastDot >= 0 && s.split('.').length > 2) s = s.split('.').join('');
        const n = parseFloat(s);
        if (Number.isFinite(n)) { calc.insertNumber(n); render(); }
        return;
      }
      const expr = raw.replace(/\s+/g, '').replace(/\*/g, '\u00D7').replace(/\//g, '\u00F7').replace(/-/g, '\u2212').replace(/,/g, '.');
      try { evaluate(prepare(expr), { angle: calc.angle }); calc.load(expr); render(); }
      catch (err) { toast(t('err.' + (err instanceof CalcError ? err.code : 'SYNTAX')), 'error'); }
    },
    copy() { return copyText(calc.final ? calc.resultText : calc.preview() ?? calc.expr); },
    loadHistory(item) { calc.load(item.expr); render(); },
    insertResult(item) { calc.insertNumber(item.result); render(); },
    insertNumber(n) { calc.insertNumber(n); render(); },
    destroy() { unsub.forEach((u) => u()); },
  };
}
