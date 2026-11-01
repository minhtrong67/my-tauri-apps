// Ribbon overflow: wheel scrolls sideways and edge buttons appear when groups are cut off.
import { $, el } from './util.js';
import { icon } from './icons.js';

export function initRibbonScroll() {
  const r = $('#ribbon');
  if (!r) return;
  const mk = (dir) => {
    const b = el('button', { class: 'rb-edge ' + dir, type: 'button', html: icon(dir === 'l' ? 'left' : 'right'), tabindex: '-1' });
    b.setAttribute('aria-hidden', 'true');
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => r.scrollBy({ left: (dir === 'l' ? -1 : 1) * Math.max(240, r.clientWidth * .6), behavior: 'smooth' }));
    document.body.append(b);
    return b;
  };
  const L = mk('l'), R = mk('r');
  const upd = () => {
    const box = r.getBoundingClientRect();
    const canL = r.scrollLeft > 4, canR = r.scrollLeft + r.clientWidth < r.scrollWidth - 4;
    const y = box.top + box.height / 2 - 16;
    L.style.cssText = `left:${box.left + 6}px;top:${y}px`;
    R.style.cssText = `left:${box.right - 38}px;top:${y}px`;
    L.classList.toggle('show', canL && box.height > 40);
    R.classList.toggle('show', canR && box.height > 40);
  };
  r.addEventListener('scroll', upd, { passive: true });
  r.addEventListener('wheel', (e) => {
    if (r.scrollWidth <= r.clientWidth || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    r.scrollLeft += e.deltaY;
    e.preventDefault();
  }, { passive: false });
  addEventListener('resize', upd);
  new ResizeObserver(upd).observe(r);
  new MutationObserver(upd).observe(r, { childList: true, subtree: true });
  upd();
}
