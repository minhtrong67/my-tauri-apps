// Command palette (Ctrl+Shift+P / F1): search every action and run it with the keyboard.
import { t } from './i18n.js';
import { keyChips } from './shortcuts.js';

const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

let dlg, input, list, cmds = [], shown = [], idx = 0;

function build() {
  dlg = document.createElement('dialog');
  dlg.id = 'dlg-palette';
  dlg.className = 'dialog palette';
  dlg.innerHTML = `
    <div class="pal-search"><svg class="i"><use href="#i-search"/></svg><input type="text" spellcheck="false" autocomplete="off" aria-label="Command" /><kbd class="k">Esc</kbd></div>
    <div class="pal-list" role="listbox"></div>
    <div class="pal-foot"><span><kbd class="k">↑</kbd><kbd class="k">↓</kbd> <b data-k="navigate"></b></span><span><kbd class="k">Enter</kbd> <b data-k="run"></b></span></div>`;
  document.body.append(dlg);
  input = dlg.querySelector('input');
  list = dlg.querySelector('.pal-list');
  input.addEventListener('input', () => render(input.value));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!shown.length) return;
      idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
      mark(true);
    } else if (e.key === 'Enter') { e.preventDefault(); run(idx); }
  });
  dlg.addEventListener('mousedown', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
}

function close() { if (dlg.open) dlg.close(); }

function mark(scroll) {
  [...list.children].forEach((r, i) => { r.classList.toggle('on', i === idx); r.setAttribute('aria-selected', i === idx); if (scroll && i === idx) r.scrollIntoView({ block: 'nearest' }); });
}

function run(i) {
  const c = shown[i];
  if (!c) return;
  dlg.close();
  setTimeout(() => { try { c.run(); } catch (err) { console.error(err); } }, 140);
}

function render(q = '') {
  const n = norm(q.trim());
  const words = n.split(/\s+/).filter(Boolean);
  shown = cmds.filter((c) => c.enabled?.() !== false).map((c) => ({ c, hay: norm(t(c.label)) + ' ' + norm(c.id) })).filter(({ hay }) => words.every((w) => hay.includes(w))).map(({ c }) => c);
  idx = 0;
  list.replaceChildren();
  if (!shown.length) {
    const e = document.createElement('div'); e.className = 'pal-empty'; e.textContent = t('palette.none'); list.append(e); return;
  }
  shown.forEach((c, i) => {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'pal-row'; row.setAttribute('role', 'option');
    row.innerHTML = `<span class="pal-ico"><svg class="i"><use href="#i-${c.icon}"/></svg></span><span class="pal-t"></span>`;
    row.querySelector('.pal-t').textContent = t(c.label);
    if (c.keys) row.append(keyChips(c.keys));
    row.addEventListener('click', () => run(i));
    row.addEventListener('pointermove', () => { if (idx !== i) { idx = i; mark(false); } });
    list.append(row);
  });
  mark(false);
}

/** `commands`: [{ id, label (i18n key), icon (sprite id), keys?: 'Ctrl+S', run(), enabled?() }] */
export function initPalette(commands) {
  cmds = commands;
  build();
}

export function openPalette() {
  if (!dlg) return;
  dlg.querySelector('[data-k=navigate]').textContent = t('palette.navigate');
  dlg.querySelector('[data-k=run]').textContent = t('palette.run');
  input.placeholder = t('palette.placeholder');
  input.value = '';
  render('');
  if (!dlg.open) dlg.showModal();
  input.focus();
}
