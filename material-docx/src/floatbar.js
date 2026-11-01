// Floating format toolbar that appears above a text selection (M3 Expressive "floating toolbar").
import { el } from './util.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { bus } from './state.js';
import { editor, workspace } from './editor.js';
import { tip } from './popup.js';
import * as C from './cmds.js';

const BTNS = [
  ['bold', '<b>B</b>', 'tip.bold', 'Ctrl+B', () => C.toggle('bold')],
  ['italic', '<i>I</i>', 'tip.italic', 'Ctrl+I', () => C.toggle('italic')],
  ['underline', '<u>U</u>', 'tip.underline', 'Ctrl+U', () => C.toggle('underline')],
  ['strike', '<s>S</s>', 'tip.strike', '', () => C.toggle('strikeThrough')],
  ['hl', icon('highlight'), 'tip.highlight', '', () => C.setHighlight('#ffff00')],
];
let bar, timer, shown = false;
const buttons = {};

function build() {
  bar = el('div', { id: 'floatbar', role: 'toolbar' });
  for (const [k, ic, tk, kbd, fn] of BTNS) {
    const b = el('button', { class: 'fb-btn', type: 'button', html: ic });
    tip(b, t(tk), kbd);
    b.addEventListener('mousedown', (e) => e.preventDefault()); // keep the selection
    b.addEventListener('click', () => { fn(); schedule(60); });
    buttons[k] = b;
    bar.append(b);
  }
  document.body.append(bar);
}

function hide() { if (shown) { shown = false; bar.classList.remove('show'); } }

function update() {
  const s = getSelection();
  if (!s.rangeCount || s.isCollapsed || !editor.contains(s.anchorNode) || document.querySelector('dialog[open]') || document.querySelector('.popup')) return hide();
  const r = s.getRangeAt(0).getBoundingClientRect();
  if (!r.width && !r.height) return hide();
  const wr = workspace.getBoundingClientRect();
  if (r.bottom < wr.top || r.top > wr.bottom) return hide();
  const st = C.queryState();
  for (const [k] of BTNS) buttons[k].classList.toggle('on', k === 'hl' ? !!st.hl : !!st[k]);
  const bw = bar.offsetWidth || 220, bh = 44;
  let x = r.left + r.width / 2 - bw / 2;
  let y = r.top - bh - 10;
  const below = y < wr.top + 6;
  if (below) y = r.bottom + 10;
  x = Math.max(8, Math.min(innerWidth - bw - 8, x));
  bar.style.left = x + 'px';
  bar.style.top = y + 'px';
  bar.classList.toggle('below', below);
  shown = true;
  bar.classList.add('show');
}

function schedule(ms = 220) { clearTimeout(timer); timer = setTimeout(update, ms); }

export function initFloatBar() {
  build();
  bus.on('selection', () => { hide(); schedule(); });
  bus.on('typing', hide);
  workspace.addEventListener('scroll', () => hide(), { passive: true });
  document.addEventListener('pointerdown', (e) => { if (!bar.contains(e.target)) hide(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}
