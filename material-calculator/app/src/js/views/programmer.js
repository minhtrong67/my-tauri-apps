// Programmer calculator view (HEX / DEC / OCT / BIN, bitwise operators, bit toggling).
import { Prog, group, RADIX } from '../programmer.js';
import { history } from '../history.js';
import { settings } from '../store.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { h, $, $$, animate, copyText, fitText, esc } from '../ui.js';

export const prog = new Prog();
prog.base = settings.get('progBase');
prog.size = settings.get('wordSize');

const k = (key, label, cls = 'key-fn', extra = '') =>
  `<button class="key ${cls}" data-key="${key}" data-ripple ${extra}><span class="kl">${label}</span></button>`;
const WORDS = [[64, 'QWORD', 'prog.qword'], [32, 'DWORD', 'prog.dword'], [16, 'WORD', 'prog.word16'], [8, 'BYTE', 'prog.byte']];

const KEYMAP = { '+': 'op:+', '-': 'op:-', '*': 'op:*', '/': 'op:/', '%': 'op:mod', '&': 'op:and', '|': 'op:or', '^': 'op:xor', '~': 'not',
  '(': '(', ')': ')', Enter: '=', '=': '=', Backspace: 'bs', Escape: 'ac', Delete: 'ac' };

export function createProgrammerView() {
  const el = h(`
    <section class="view view-prog" aria-label="${esc(t('nav.programmer'))}">
      <div class="display" aria-live="polite">
        <div class="display-meta">
          <div class="segmented segmented-sm" role="group" aria-label="${esc(t('prog.word'))}">
            ${WORDS.map(([n, label, key]) => `<button data-size="${n}" title="${esc(t(key))}" data-ripple>${label}</button>`).join('')}
          </div>
        </div>
        <div class="expr"></div>
        <div class="result"></div>
      </div>
      <div class="bases">
        ${['HEX', 'DEC', 'OCT', 'BIN'].map((b) => `<button class="base-row" data-base="${b}" data-ripple><span class="b-name">${b}</span><span class="b-val"></span></button>`).join('')}
      </div>
      <div class="bits-bar">
        <button class="text-btn" data-bits-toggle data-ripple>${icon('bits')}<span>${esc(t('prog.bits'))}</span><span class="chev">${icon('chevronDown')}</span></button>
      </div>
      <div class="bits" hidden></div>
      <div class="pads pads-prog">
        <div class="pad pad-bit">
          ${k('op:and', 'AND')}${k('op:or', 'OR')}${k('op:xor', 'XOR')}
          ${k('not', 'NOT')}${k('op:nand', 'NAND')}${k('op:nor', 'NOR')}
          ${k('op:shl', '&lt;&lt;')}${k('op:shr', '&gt;&gt;')}${k('op:mod', 'mod')}
          ${['A', 'B', 'C', 'D', 'E', 'F'].map((d) => k(d, d, 'key-hex')).join('')}
        </div>
        <div class="pad pad-num">
          ${k('ac', 'AC', 'key-clear')}${k('(', '(')}${k(')', ')')}${k('op:/', '&divide;', 'key-op')}
          ${['7', '8', '9'].map((d) => k(d, d, 'key-num')).join('')}${k('op:*', '&times;', 'key-op')}
          ${['4', '5', '6'].map((d) => k(d, d, 'key-num')).join('')}${k('op:-', '&minus;', 'key-op')}
          ${['1', '2', '3'].map((d) => k(d, d, 'key-num')).join('')}${k('op:+', '+', 'key-op')}
          ${k('neg', '&plusmn;', 'key-num')}${k('0', '0', 'key-num')}${k('bs', icon('backspace'), 'key-fn key-icon')}${k('=', '=', 'key-eq')}
        </div>
      </div>
    </section>`);

  const displayEl = $('.display', el), exprEl = $('.expr', el), resultEl = $('.result', el);
  const bitsEl = $('.bits', el), bitsBtn = $('[data-bits-toggle]', el);
  let bitCells = [], builtSize = 0, raf = 0;

  function buildBits() {
    builtSize = prog.size;
    const parts = [];
    for (let i = prog.size - 1; i >= 0; i--) {
      if (i % 4 === 3) parts.push(`<div class="nibble"><span class="nib-idx">${i}</span>`);
      parts.push(`<button class="bit" data-bit="${i}" aria-label="bit ${i}">0</button>`);
      if (i % 4 === 0) parts.push('</div>');
    }
    bitsEl.innerHTML = parts.join('');
    bitCells = $$('.bit', bitsEl);
  }

  function render() {
    const g = settings.get('grouping');
    const val = prog.cur();
    const fmt = (s, b) => (g ? group(s, b) : s);
    displayEl.classList.toggle('is-final', prog.final);
    displayEl.classList.toggle('has-error', !!prog.error);

    let top, bottom = '';
    if (prog.final) { top = prog.lastExpr + ' ='; bottom = fmt(prog.str(prog.result), prog.base); }
    else {
      const txt = prog.text(prog.tokens, false);
      const entry = prog.entry !== '' ? fmt(prog.entry, prog.base).replace('-', '\u2212') : '';
      top = [txt, entry].filter(Boolean).join(' ').replace(/\( /g, '(') || '0';
      const p = prog.preview();
      bottom = prog.error ? t('err.' + prog.error) : p !== null ? '= ' + fmt(prog.str(p), prog.base) : '';
    }
    exprEl.textContent = top;
    exprEl.classList.toggle('is-placeholder', top === '0');
    resultEl.textContent = bottom;

    $$('.base-row', el).forEach((row) => {
      const b = row.dataset.base;
      row.classList.toggle('active', b === prog.base);
      row.setAttribute('aria-pressed', b === prog.base);
      $('.b-val', row).textContent = fmt(prog.str(val, b), b);
    });
    $$('[data-size]', el).forEach((b) => b.classList.toggle('active', +b.dataset.size === prog.size));
    $$('.key-num, .key-hex', el).forEach((b) => {
      const key = b.dataset.key;
      if (/^[0-9A-F]$/.test(key)) b.disabled = parseInt(key, 16) >= RADIX[prog.base];
    });

    const open = settings.get('bitsOpen');
    bitsEl.hidden = !open;
    bitsBtn.classList.toggle('open', open);
    if (open) {
      if (builtSize !== prog.size) buildBits();
      const bits = prog.bits();
      for (let i = 0; i < bits.length; i++) {
        const c = bitCells[i], on = bits[i] === 1;
        if (c.textContent !== (on ? '1' : '0')) { c.textContent = on ? '1' : '0'; c.classList.toggle('on', on); }
      }
    }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      fitText(exprEl, prog.final ? 22 : 44, 18);
      fitText(resultEl, prog.final ? 52 : 24, 16);
      exprEl.scrollLeft = exprEl.scrollWidth;
    });
  }

  function press(key) {
    if (key === '=') {
      const entry = prog.press('=');
      if (entry) {
        history.add({ mode: 'programmer', expr: entry.expr, result: entry.result, base: entry.base, hex: entry.hex });
        animate(resultEl, [{ transform: 'translateY(10px) scale(.94)', opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 320 });
      } else if (prog.error) animate(displayEl, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }], { duration: 300 });
    } else prog.press(key);
    render();
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !el.contains(b)) return;
    if (b.dataset.key) return press(b.dataset.key);
    if (b.dataset.base) { prog.setBase(b.dataset.base); settings.set('progBase', prog.base); return render(); }
    if (b.dataset.size) { prog.setSize(+b.dataset.size); settings.set('wordSize', prog.size); return render(); }
    if (b.dataset.bit !== undefined) { prog.toggleBit(+b.dataset.bit); return render(); }
    if (b.hasAttribute('data-bits-toggle')) { settings.set('bitsOpen', !settings.get('bitsOpen')); render(); }
  });

  const unsub = settings.on('grouping', render);

  return {
    el, mode: 'programmer',
    refresh() { builtSize = 0; render(); },
    onShow() { this.refresh(); },
    onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      let key = KEYMAP[e.key];
      if (/^[0-9]$/.test(e.key)) key = e.key;
      else if (/^[a-fA-F]$/.test(e.key) && prog.base === 'HEX') key = e.key.toUpperCase();
      if (!key) return false;
      press(key);
      return true;
    },
    onPaste(text) {
      const s = text.trim().replace(/[\s,_]/g, '');
      const v = prog.base === 'HEX' ? s.replace(/^0x/i, '') : s;
      if (!v || [...v.replace(/^-/, '')].some((c) => parseInt(c, 16) >= RADIX[prog.base] || Number.isNaN(parseInt(c, 16)))) return;
      if (prog.fits(v.toUpperCase())) { prog.loadValue(prog.parse(v.toUpperCase())); render(); }
    },
    copy() { return copyText(prog.str(prog.cur())); },
    loadHistory(item) { prog.loadValue(BigInt(item.result)); render(); },
    insertNumber(n) { prog.loadValue(BigInt(Math.trunc(n))); render(); },
    insertResult(item) { prog.loadValue(BigInt(item.result)); render(); },
    destroy() { unsub(); },
  };
}
