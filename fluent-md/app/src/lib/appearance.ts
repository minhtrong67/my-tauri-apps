import { useSettings, getSettings, type Settings, type ThemeMode } from './settings';
import { paintTheme } from './theme';
import { fontStack, SIZES } from './fonts';
import { resolveLang } from './i18n';
import { api } from './tauri';
import { applyMaterial } from './material';

const mq = matchMedia('(prefers-color-scheme: dark)');
export const isDark = (s: Settings = getSettings()) => (s.mode === 'system' ? mq.matches : s.mode === 'dark');

/** Pushes every appearance setting (accent, theme, font, size, language, material) into the DOM and the window. */
export function applyAppearance() {
  const s = getSettings(), root = document.documentElement, dark = isDark(s);
  paintTheme(s.accent, dark);
  root.style.setProperty('--font-ui', fontStack(s.font));
  root.style.fontSize = SIZES[s.size] + 'px';
  root.style.setProperty('--z', String(s.zoom / 100));
  root.style.setProperty('--split', String(s.split));
  root.lang = resolveLang(s.lang);
  window.dispatchEvent(new CustomEvent('themechange'));
}

export const changeSettings = (patch: Partial<Settings>) => { useSettings.getState().set(patch); };
export const cycleMode = (m: ThemeMode): ThemeMode => (m === 'system' ? 'light' : m === 'light' ? 'dark' : 'system');

/** Resolves once the window material is in place, so the window is never shown half painted. */
export let materialReady: Promise<unknown> = Promise.resolve();

export function initAppearance() {
  document.documentElement.dataset.fx = 'off';
  applyAppearance();
  const pushWindow = () => { const s = getSettings(); api.setTheme(s.mode); return applyMaterial(isDark(s)); };
  materialReady = pushWindow();
  mq.addEventListener('change', () => { if (getSettings().mode === 'system') { applyAppearance(); pushWindow(); } });
  let prev = getSettings();
  useSettings.subscribe((s) => {
    const theme = s.mode !== prev.mode || s.accent !== prev.accent;
    const cheap = s.zoom !== prev.zoom || s.size !== prev.size || s.font !== prev.font || s.lang !== prev.lang || s.split !== prev.split;
    if (theme || cheap) applyAppearance();
    if (s.mode !== prev.mode || s.material !== prev.material) pushWindow();
    prev = s;
  });
}
