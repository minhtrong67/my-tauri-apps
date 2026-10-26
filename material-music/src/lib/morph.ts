/**
 * "Container transform" between the player bar and the full-screen Now Playing view (Material motion):
 * the bar grows into the screen while the small cover flies to its big place, and everything runs backwards on close.
 */

export const EMPHASIZED = 'cubic-bezier(0.2, 0, 0, 1)';
export const OPEN_MS = 560;
export const CLOSE_MS = 400;

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** clip-path that exactly covers `r` (the player bar) inside a full-window element */
export function clipFor(r: DOMRect | null, radius = 32): string {
  if (!r) return `inset(46% 30% 46% 30% round ${radius}px)`; // no bar on screen (mini mode...): grow from the middle
  const w = window.innerWidth, h = window.innerHeight;
  const top = Math.max(0, r.top), left = Math.max(0, r.left);
  return `inset(${top}px ${Math.max(0, w - r.right)}px ${Math.max(0, h - r.bottom)}px ${left}px round ${radius}px)`;
}

export const FULL_CLIP = 'inset(0px 0px 0px 0px round 0px)';

/** transform that makes `to` look like `from` (First-Last-Invert-Play) */
export function flipTransform(from: DOMRect, to: DOMRect): string {
  const sx = from.width / Math.max(1, to.width);
  const sy = from.height / Math.max(1, to.height);
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`;
}

export interface MorphTargets {
  root: HTMLElement;
  /** the big cover (its wrapper) */
  cover: HTMLElement | null;
  /** items that fade / slide in one after the other */
  items: HTMLElement[];
}

const bar = () => document.querySelector<HTMLElement>('[data-player-bar]');
const thumb = () => document.querySelector<HTMLElement>('[data-np-thumb]');

/** Runs the opening animation; resolves when it is finished (or was cancelled) */
export function playOpen({ root, cover, items }: MorphTargets): { cancel: () => void; done: Promise<void> } {
  const anims: Animation[] = [];
  const th = thumb();
  const barRect = bar()?.getBoundingClientRect() ?? null;
  const coverTo = cover?.getBoundingClientRect() ?? null;
  const thumbFrom = th?.getBoundingClientRect() ?? null;

  anims.push(root.animate({ clipPath: [clipFor(barRect), FULL_CLIP] }, { duration: OPEN_MS, easing: EMPHASIZED, fill: 'backwards' }));
  anims.push(root.animate({ opacity: [0.4, 1] }, { duration: 160, easing: 'linear', fill: 'backwards' }));

  if (cover && coverTo && thumbFrom) {
    cover.style.transformOrigin = '0 0';
    anims.push(cover.animate({ transform: [flipTransform(thumbFrom, coverTo), 'none'] }, { duration: OPEN_MS, easing: EMPHASIZED, fill: 'backwards' }));
    if (th) th.style.visibility = 'hidden'; // the small cover "lifts off" the bar
  }
  items.forEach((el, i) => {
    anims.push(el.animate(
      { opacity: [0, 1], transform: ['translateY(28px)', 'none'] },
      { duration: 460, delay: 170 + i * 70, easing: EMPHASIZED, fill: 'backwards' },
    ));
  });

  const restore = () => { if (th) th.style.visibility = ''; };
  const done = Promise.allSettled(anims.map((a) => a.finished)).then(restore);
  return { cancel: () => { anims.forEach((a) => a.cancel()); restore(); }, done };
}

/** Runs the closing animation (the exact reverse); the caller unmounts afterwards */
export function playClose({ root, cover, items }: MorphTargets): Promise<void> {
  const anims: Animation[] = [];
  const th = thumb();
  const barRect = bar()?.getBoundingClientRect() ?? null;
  const coverFrom = cover?.getBoundingClientRect() ?? null;
  const thumbTo = th?.getBoundingClientRect() ?? null;

  items.forEach((el, i) => {
    anims.push(el.animate({ opacity: [1, 0], transform: ['none', 'translateY(18px)'] }, { duration: 200, delay: i * 18, easing: 'ease-in', fill: 'forwards' }));
  });
  if (cover && coverFrom && thumbTo) {
    cover.style.transformOrigin = '0 0';
    anims.push(cover.animate({ transform: ['none', flipTransform(thumbTo, coverFrom)] }, { duration: CLOSE_MS, easing: EMPHASIZED, fill: 'forwards' }));
  }
  anims.push(root.animate({ clipPath: [FULL_CLIP, clipFor(barRect)] }, { duration: CLOSE_MS, easing: EMPHASIZED, fill: 'forwards' }));
  anims.push(root.animate({ opacity: [1, 0.2] }, { duration: 140, delay: CLOSE_MS - 140, easing: 'linear', fill: 'forwards' }));
  return Promise.allSettled(anims.map((a) => a.finished)).then(() => undefined);
}
