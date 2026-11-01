import { useSettings, getSettings, type Settings, type ThemeMode } from './settings';
import { paintScheme, buildScheme } from './theme';
import { fontStack, SIZES } from './fonts';
import { resolveLang } from './i18n';
import { api } from './tauri';
import { reduceMotion } from './utils';

const mq = matchMedia('(prefers-color-scheme: dark)');
export const isDark = (s: Settings = getSettings()) => (s.mode === 'system' ? mq.matches : s.mode === 'dark');

/** Pushes every appearance setting (colours, font, size, language) into the DOM. */
export function applyAppearance() {
  const s = getSettings(), root = document.documentElement;
  paintScheme(s.seed, isDark(s), s.contrast);
  root.style.setProperty('--font-ui', fontStack(s.font));
  root.style.fontSize = SIZES[s.size] + 'px';
  root.style.setProperty('--z', String(s.zoom / 100));
  root.lang = resolveLang(s.lang);
  window.dispatchEvent(new CustomEvent('themechange'));
}

/** Colour scheme of the current settings, for exporting HTML. */
export const currentScheme = (dark = isDark()) => { const s = getSettings(); return buildScheme(s.seed, dark, s.contrast); };

type Origin = { x: number; y: number } | null;
/** Applies a settings change; a circular reveal (View Transition) starts at the origin when one is given. */
export function changeSettings(patch: Partial<Settings>, origin: Origin = null) {
  const run = () => { useSettings.getState().set(patch); applyAppearance(); };
  const vt = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }).startViewTransition;
  if (!origin || !vt || reduceMotion()) { run(); return; }
  const { x, y } = origin, end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const tr = vt.call(document, run);
  tr.ready.then(() => document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
    { duration: 560, easing: 'cubic-bezier(.2,0,0,1)', pseudoElement: '::view-transition-new(root)' },
  )).catch(() => {});
}

export function initAppearance() {
  applyAppearance();
  mq.addEventListener('change', () => { if (getSettings().mode === 'system') { applyAppearance(); api.setTheme('system'); } });
  let prev = getSettings();
  useSettings.subscribe((s) => {
    const cheap = s.zoom !== prev.zoom || s.size !== prev.size || s.font !== prev.font || s.lang !== prev.lang;
    const colours = s.mode !== prev.mode || s.seed !== prev.seed || s.contrast !== prev.contrast;
    if (cheap || colours) applyAppearance();
    if (s.mode !== prev.mode) api.setTheme(s.mode);
    prev = s;
  });
  api.setTheme(getSettings().mode);
}
export const cycleMode = (m: ThemeMode): ThemeMode => (m === 'system' ? 'light' : m === 'light' ? 'dark' : 'system');
