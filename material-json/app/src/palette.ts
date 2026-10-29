/** Command palette (Ctrl+K): fuzzy-filter every action in the app. */
import { icon, type IconName } from './icons';
import { t } from './i18n';
import { esc, h } from './ui';

export interface Command { id: string; label: string; icon: IconName; hint?: string; group?: string; run: () => void }

let open = false;

const score = (q: string, s: string): number => {
  s = s.toLowerCase();
  if (!q) return 1;
  const i = s.indexOf(q);
  if (i >= 0) return 100 - i;
  let p = 0, hits = 0;
  for (const c of s) if (c === q[p]) { p++; hits++; if (p === q.length) break; }
  return p === q.length ? hits : 0;
};

export function openPalette(cmds: Command[]) {
  if (open) return;
  open = true;
  const prev = document.activeElement as HTMLElement | null;
  const root = h(`<div class="scrim palette-scrim" role="presentation"><div class="palette" role="dialog" aria-modal="true" aria-label="${esc(t('cmd.title'))}">
    <label class="palette-in">${icon('command')}<input type="text" spellcheck="false" autocomplete="off" placeholder="${esc(t('cmd.placeholder'))}"><kbd>Esc</kbd></label>
    <ul class="palette-list" role="listbox"></ul></div></div>`);
  const input = root.querySelector('input')!;
  const list = root.querySelector('.palette-list') as HTMLElement;
  let shown: Command[] = [];
  let sel = 0;
  const paint = () => {
    const q = input.value.trim().toLowerCase();
    shown = cmds.map((c) => ({ c, s: score(q, `${c.label} ${c.group ?? ''}`) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.c);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.innerHTML = shown.length
      ? shown.map((c, i) => `<li role="option" class="palette-item${i === sel ? ' sel' : ''}" data-i="${i}">${icon(c.icon)}<span class="pl">${esc(c.label)}</span>${c.group ? `<em>${esc(c.group)}</em>` : ''}${c.hint ? c.hint.split('+').map((k) => `<kbd>${esc(k.trim())}</kbd>`).join('') : ''}</li>`).join('')
      : `<li class="palette-none">${esc(t('cmd.none'))}</li>`;
    list.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  };
  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    root.classList.add('closing');
    setTimeout(() => { root.remove(); open = false; prev?.focus?.(); }, document.documentElement.dataset.motion === 'off' ? 0 : 160);
  };
  const run = (i: number) => { const c = shown[i]; if (!c) return; close(); setTimeout(c.run, 30); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); paint(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  };
  input.addEventListener('input', () => { sel = 0; paint(); });
  list.addEventListener('click', (e) => { const li = (e.target as HTMLElement).closest<HTMLElement>('[data-i]'); if (li) run(+li.dataset.i!); });
  list.addEventListener('pointermove', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (li && +li.dataset.i! !== sel) { sel = +li.dataset.i!; list.querySelector('.sel')?.classList.remove('sel'); li.classList.add('sel'); }
  });
  root.addEventListener('pointerdown', (e) => { if (e.target === root) close(); });
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(root);
  paint();
  input.focus();
}
