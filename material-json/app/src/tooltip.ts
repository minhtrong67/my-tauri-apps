/** Custom tooltips for every element carrying a `title` or `data-tip` attribute (event delegation, no per-element wiring). */
import { esc } from './ui';

let tip: HTMLElement | null = null;
let timer = 0;
let current: HTMLElement | null = null;
let warm = 0; // timestamp until which tooltips show instantly (after one was just visible)

function ensure(): HTMLElement {
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
  }
  return tip;
}

/** Move native `title` into data-tip so the OS tooltip never appears; keep an accessible name. */
function adopt(el: HTMLElement): string {
  const title = el.getAttribute('title');
  if (title !== null) {
    el.removeAttribute('title');
    if (title) {
      el.dataset.tip = title;
      if (!el.hasAttribute('aria-label') && !el.textContent?.trim()) el.setAttribute('aria-label', title.replace(/\s*\([^()]*\+[^()]*\)\s*$/, ''));
    }
  }
  return el.dataset.tip ?? '';
}

function html(text: string): string {
  const m = /^(.*?)\s*\(([^()]*\+[^()]*|F\d{1,2})\)$/.exec(text);
  if (!m) return esc(text);
  return `<span>${esc(m[1])}</span>${m[2].split('+').map((k) => `<kbd>${esc(k.trim())}</kbd>`).join('')}`;
}

function show(el: HTMLElement) {
  const text = adopt(el);
  if (!text || !el.isConnected) return;
  const t = ensure();
  t.innerHTML = html(text);
  t.classList.remove('show');
  t.style.left = '0px'; t.style.top = '0px';
  const r = el.getBoundingClientRect();
  const w = t.offsetWidth, h = t.offsetHeight;
  let top = r.bottom + 8, origin = 'top';
  if (top + h > innerHeight - 6) { top = r.top - h - 8; origin = 'bottom'; }
  const left = Math.min(Math.max(6, r.left + r.width / 2 - w / 2), innerWidth - w - 6);
  t.style.left = `${Math.round(left)}px`;
  t.style.top = `${Math.round(Math.max(6, top))}px`;
  t.style.transformOrigin = `${Math.round(r.left + r.width / 2 - left)}px ${origin}`;
  void t.offsetWidth;
  t.classList.add('show');
  warm = Date.now() + 600;
}

function hide() {
  clearTimeout(timer);
  current = null;
  if (tip?.classList.contains('show')) { tip.classList.remove('show'); warm = Date.now() + 500; }
}

export function initTooltips() {
  const over = (e: Event) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>('[title],[data-tip]');
    if (!el || el === current) return;
    if (el.closest('.cm-editor') && !el.closest('.cm-panels,.cm-gutters')) return;
    hide();
    current = el;
    adopt(el);
    timer = window.setTimeout(() => show(el), Date.now() < warm ? 40 : 380);
  };
  document.addEventListener('pointerover', over, true);
  document.addEventListener('focusin', (e) => { if ((e.target as HTMLElement).matches?.(':focus-visible')) over(e); }, true);
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'scroll', 'blur', 'focusout', 'dragstart']) document.addEventListener(ev, hide, true);
  document.addEventListener('pointerout', (e) => {
    const rel = (e as PointerEvent).relatedTarget as Node | null;
    if (current && (!rel || !current.contains(rel))) hide();
  }, true);
}
