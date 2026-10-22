import { icon, type IconName } from './icons';
import { t } from './i18n';

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function h(html: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as HTMLElement;
}

/* ───────────── ripple (M3 state layer) ───────────── */
const RIPPLE = '.btn,.icon-btn,.nav-item,.tab,.menu-item,.seg button,.chip,.list-item,.fab';
export function initRipple() {
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(RIPPLE);
    if (!el || el.hasAttribute('disabled') || document.documentElement.dataset.motion === 'off') return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.appendChild(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
  }, { passive: true });
}

/* ───────────── snackbar ───────────── */
let toastTimer = 0;
export function toast(msg: string, kind: 'info' | 'error' | 'success' = 'info') {
  let host = document.getElementById('snackbar');
  if (!host) { host = document.createElement('div'); host.id = 'snackbar'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
  const ic: IconName = kind === 'error' ? 'error' : kind === 'success' ? 'ok' : 'info';
  host.className = `snackbar ${kind}`;
  host.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
  host.classList.remove('show'); void host.offsetWidth; host.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => host!.classList.remove('show'), kind === 'error' ? 4200 : 2400);
}

/* ───────────── dialog ───────────── */
export interface DialogAction { id: string; label: string; primary?: boolean; danger?: boolean }
export function dialog(opts: { title: string; body?: string; content?: HTMLElement; icon?: IconName; actions?: DialogAction[]; wide?: boolean }): Promise<string> {
  return new Promise((resolve) => {
    const prev = document.activeElement as HTMLElement | null;
    const actions = opts.actions ?? [{ id: 'ok', label: t('act.ok'), primary: true }];
    const root = h(`
      <div class="scrim" role="presentation">
        <div class="dialog${opts.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}">
          ${opts.icon ? `<div class="dialog-ic">${icon(opts.icon)}</div>` : ''}
          <h2>${esc(opts.title)}</h2>
          <div class="dialog-body">${opts.body ? `<p>${esc(opts.body)}</p>` : ''}</div>
          <div class="dialog-actions">${actions.map((a) => `<button class="btn ${a.primary ? 'filled' : 'text'}${a.danger ? ' danger' : ''}" data-id="${a.id}">${esc(a.label)}</button>`).join('')}</div>
        </div>
      </div>`);
    if (opts.content) root.querySelector('.dialog-body')!.appendChild(opts.content);
    const close = (id: string) => {
      root.classList.add('closing');
      document.removeEventListener('keydown', onKey, true);
      setTimeout(() => { root.remove(); prev?.focus?.(); }, document.documentElement.dataset.motion === 'off' ? 0 : 160);
      resolve(id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close('cancel'); }
      else if (e.key === 'Tab') {
        const f = Array.from(root.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex]')).filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        const i = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    root.addEventListener('pointerdown', (e) => { if (e.target === root) close('cancel'); });
    root.querySelectorAll<HTMLButtonElement>('.dialog-actions .btn').forEach((b) => b.addEventListener('click', () => close(b.dataset.id!)));
    document.body.appendChild(root);
    (root.querySelector('.btn.filled') as HTMLElement | null ?? root.querySelector('.btn') as HTMLElement | null)?.focus();
  });
}

/* ───────────── menu ───────────── */
export interface MenuItem { label?: string; icon?: IconName; onClick?: () => void; divider?: boolean; disabled?: boolean; hint?: string; checked?: boolean; header?: boolean }
let closeMenu: (() => void) | null = null;
export function menu(anchor: HTMLElement, items: MenuItem[], align: 'start' | 'end' = 'start') {
  closeMenu?.();
  const el = h(`<div class="menu" role="menu">${items.map((it, i) =>
    it.divider ? '<div class="menu-div"></div>'
      : it.header ? `<div class="menu-head">${esc(it.label ?? '')}</div>`
      : `<button class="menu-item" role="menuitem" data-i="${i}" ${it.disabled ? 'disabled' : ''}>${it.icon ? icon(it.icon) : '<span class="ic"></span>'}<span class="menu-label">${esc(it.label ?? '')}</span>${it.checked ? icon('check', 'menu-check') : it.hint ? `<kbd>${esc(it.hint)}</kbd>` : ''}</button>`).join('')}</div>`);
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const mw = el.offsetWidth, mh = el.offsetHeight;
  let left = align === 'end' ? r.right - mw : r.left;
  let top = r.bottom + 4;
  if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 4);
  left = Math.min(Math.max(8, left), innerWidth - mw - 8);
  el.style.left = left + 'px'; el.style.top = top + 'px';
  el.style.transformOrigin = `${align === 'end' ? 'right' : 'left'} ${top > r.top ? 'top' : 'bottom'}`;
  requestAnimationFrame(() => el.classList.add('open'));
  const close = () => {
    el.classList.remove('open');
    setTimeout(() => el.remove(), 140);
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('keydown', onKey, true);
    closeMenu = null;
  };
  const onDown = (e: Event) => { if (!el.contains(e.target as Node)) close(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); anchor.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const f = Array.from(el.querySelectorAll<HTMLElement>('.menu-item:not([disabled])'));
      const i = f.indexOf(document.activeElement as HTMLElement);
      f[(i + (e.key === 'ArrowDown' ? 1 : -1) + f.length) % f.length]?.focus();
    }
  };
  el.querySelectorAll<HTMLElement>('.menu-item').forEach((b) => b.addEventListener('click', () => { close(); items[+b.dataset.i!].onClick?.(); }));
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey, true);
  closeMenu = close;
  el.querySelector<HTMLElement>('.menu-item:not([disabled])')?.focus({ preventScroll: true });
}

export function copyText(s: string): Promise<boolean> {
  return navigator.clipboard?.writeText(s).then(() => true, () => fallbackCopy(s)) ?? Promise.resolve(fallbackCopy(s));
}
function fallbackCopy(s: string) {
  const ta = document.createElement('textarea');
  ta.value = s; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignore */ }
  ta.remove(); return ok;
}

export function basename(p: string) { return p.replace(/^.*[\\/]/, ''); }
