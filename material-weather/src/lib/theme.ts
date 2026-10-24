import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities';
import type { Kind } from './format';
import type { ThemeMode } from './types';

/** Material Design colour presets offered in Settings. */
export const PRESETS = ['#0B57D0', '#6750A4', '#00796B', '#2E7D32', '#E65100', '#C2185B', '#BA1A1A', '#546E7A'];

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const mq = window.matchMedia('(prefers-color-scheme: dark)');
let last = '';
let timer = 0;

export const isDark = (mode: ThemeMode) => mode === 'dark' || (mode === 'system' && mq.matches);

/** Generates a Material Design 3 scheme from the seed colour and writes it as CSS variables. */
export function applyTheme(mode: ThemeMode, seed: string, animate = false) {
  const dark = isDark(mode);
  const key = `${dark}|${seed}`;
  if (key === last) return;
  last = key;
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-anim');
    clearTimeout(timer);
    timer = window.setTimeout(() => root.classList.remove('theme-anim'), 450);
  }
  const theme = themeFromSourceColor(argbFromHex(seed));
  const scheme = (dark ? theme.schemes.dark : theme.schemes.light).toJSON() as unknown as Record<string, number>;
  for (const k in scheme) root.style.setProperty('--md-' + kebab(k), hexFromArgb(scheme[k]));
  const tones = dark ? [4, 10, 12, 17, 22] : [100, 96, 94, 92, 90];
  ['lowest', 'low', '', 'high', 'highest'].forEach((n, i) =>
    root.style.setProperty(`--md-surface-container${n ? '-' + n : ''}`, hexFromArgb(theme.palettes.neutral.tone(tones[i]))),
  );
  root.dataset.scheme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
}
export function onSystemThemeChange(cb: () => void) {
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** Seed colour used by the "adaptive colour" option. */
export function adaptiveSeed(kind: Kind, isDay: boolean): string {
  if (kind === 'clear' || kind === 'partly') return isDay ? '#E8A000' : '#3949AB';
  return { cloudy: '#546E7A', fog: '#607D8B', drizzle: '#1E88E5', rain: '#1565C0', snow: '#00ACC1', storm: '#6A1B9A' }[kind];
}
