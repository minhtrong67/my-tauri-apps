/** Material ripple for every element with the `.ripple` class. */
export function initRipple() {
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('.ripple');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const r = el.getBoundingClientRect();
    const size = Math.hypot(Math.max(e.clientX - r.left, r.right - e.clientX), Math.max(e.clientY - r.top, r.bottom - e.clientY)) * 2;
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    Object.assign(wave.style, { width: size + 'px', height: size + 'px', left: e.clientX - r.left - size / 2 + 'px', top: e.clientY - r.top - size / 2 + 'px' });
    el.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove());
  });
}
