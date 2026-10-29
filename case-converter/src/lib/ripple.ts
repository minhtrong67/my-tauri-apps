/** Material ripple: any element with class "rip" gets a ripple on press. */
export function installRipple() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>('.rip');
      if (!el || (el as HTMLButtonElement).disabled) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const size = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) * 2;
      const span = document.createElement('span');
      span.className = 'ripple';
      Object.assign(span.style, { width: `${size}px`, height: `${size}px`, left: `${x - size / 2}px`, top: `${y - size / 2}px` });
      el.append(span);
      span.addEventListener('animationend', () => span.remove());
    },
    { passive: true },
  );
}
