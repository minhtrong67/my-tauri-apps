// Global UI enhancers: custom tooltips, custom <select> dropdowns, scroll-to-top button.
import { icon } from './icons.js';
import { t } from './i18n.js';

function initTooltips() {
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  let cur: HTMLElement | null = null, timer = 0;
  const hide = () => { clearTimeout(timer); cur = null; tip.classList.remove('show'); };
  const show = (el: HTMLElement) => {
    const text = el.dataset.tip; if (!text) return;
    tip.textContent = text; tip.classList.add('show');
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    const below = r.top < h + 16;
    tip.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8) + 'px';
    tip.style.top = (below ? r.bottom + 8 : r.top - h - 8) + 'px';
    tip.dataset.pos = below ? 'b' : 't';
  };
  const target = (e: Event) => {
    const el = (e.target as HTMLElement).closest?.('[title],[data-tip]') as HTMLElement | null;
    if (el?.hasAttribute('title')) { el.dataset.tip = el.getAttribute('title')!; if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.dataset.tip); el.removeAttribute('title'); }
    return el;
  };
  const enter = (e: Event) => { const el = target(e); if (!el || el === cur) return; hide(); cur = el; timer = window.setTimeout(() => cur && show(cur), 350); };
  document.addEventListener('mouseover', enter, true);
  document.addEventListener('focusin', (e) => { if ((e.target as HTMLElement).matches?.(':focus-visible')) enter(e); });
  for (const ev of ['mouseout', 'focusout', 'pointerdown', 'scroll', 'keydown']) document.addEventListener(ev, hide, true);
}

function upgradeSelect(sel: HTMLSelectElement) {
  if (sel.dataset.dd) return; sel.dataset.dd = '1'; sel.classList.add('sr-only-select');
  const wrap = sel.closest('label') ?? sel.parentElement!;
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn'; btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-label', sel.getAttribute('aria-label') ?? '');
  const list = document.createElement('div'); list.className = 'dd-list'; list.setAttribute('role', 'listbox');
  wrap.append(btn, list);
  const label = () => { btn.innerHTML = `<span>${sel.selectedOptions[0]?.textContent ?? ''}</span>${icon('chevronDown')}`; };
  const close = () => { list.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  const build = () => {
    list.innerHTML = ''; 
    [...sel.options].forEach((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.role = 'option'; b.dataset.i = String(i); b.textContent = o.textContent; b.setAttribute('aria-selected', String(o.selected)); list.append(b); });
    label();
  };
  const move = (d: number) => { const n = Math.min(Math.max(sel.selectedIndex + d, 0), sel.options.length - 1); if (n !== sel.selectedIndex) { sel.selectedIndex = n; sel.dispatchEvent(new Event('change', { bubbles: true })); build(); list.querySelector<HTMLElement>('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' }); } };
  const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!;
  Object.defineProperty(sel, 'value', { get() { return desc.get!.call(sel); }, set(v) { desc.set!.call(sel, v); build(); } });
  new MutationObserver(build).observe(sel, { childList: true });
  btn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (list.classList.contains('open')) return close();
    build(); list.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    const r = btn.getBoundingClientRect(); list.classList.toggle('up', innerHeight - r.bottom < 280 && r.top > innerHeight - r.bottom);
    list.querySelector<HTMLElement>('[aria-selected=true]')?.scrollIntoView({ block: 'center' });
  });
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); } else if (e.key === 'Escape' && list.classList.contains('open')) { e.stopPropagation(); close(); } });
  list.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); const o = (e.target as HTMLElement).closest<HTMLElement>('[data-i]'); if (!o) return; sel.selectedIndex = +o.dataset.i!; sel.dispatchEvent(new Event('change', { bubbles: true })); build(); close(); btn.focus(); });
  document.addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target as Node)) close(); }, true);
  build();
}

function initScrollTop() {
  const fab = document.createElement('button');
  fab.className = 'fab-top'; fab.title = t('common.top'); fab.innerHTML = icon('arrowUp'); document.body.appendChild(fab);
  let sc: HTMLElement | null = null;
  document.addEventListener('scroll', (e) => {
    const el = e.target as HTMLElement; if (!(el instanceof HTMLElement) || !el.classList.contains('view')) return;
    sc = el; fab.classList.toggle('show', el.scrollTop > 240);
  }, true);
  fab.addEventListener('click', () => sc?.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
}

export function initEnhancers() {
  initTooltips(); initScrollTop();
  const scan = (root: ParentNode) => root.querySelectorAll<HTMLSelectElement>('select.select').forEach(upgradeSelect);
  new MutationObserver((m) => m.forEach((r) => r.addedNodes.forEach((n) => n instanceof HTMLElement && (n.matches('select.select') ? upgradeSelect(n as HTMLSelectElement) : scan(n))))).observe(document.body, { childList: true, subtree: true });
  scan(document);
}
