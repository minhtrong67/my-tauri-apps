/** Theme switch animation: the new theme expands as a circle from where the user clicked (View Transitions API). */
let origin = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
window.addEventListener('pointerdown', (e) => { origin = { x: e.clientX, y: e.clientY }; }, true);

type VT = { ready: Promise<void>; finished: Promise<void> };

export function runThemeTransition(apply: () => void, enabled: boolean) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => VT };
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  if (!enabled || calm) return apply();
  if (!doc.startViewTransition) {
    // fallback: fade colours for a moment
    root.classList.add('theme-anim');
    apply();
    window.setTimeout(() => root.classList.remove('theme-anim'), 600);
    return;
  }
  const { x, y } = origin;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  root.classList.add('theme-vt');
  const t = doc.startViewTransition(apply);
  t.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(0.2, 0, 0, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => undefined);
  t.finished.finally(() => root.classList.remove('theme-vt')).catch(() => undefined);
}
