import { Hct, MaterialDynamicColors, SchemeExpressive, SchemeTonalSpot, SchemeVibrant, argbFromHex, hexFromArgb, type DynamicScheme } from '@material/material-color-utilities';
import type { Kind } from './format';
import type { PaletteStyle, ThemeMode } from './types';

/** Material Design colour presets offered in Settings (name = i18n key suffix). */
export const PRESETS = ['#0B57D0', '#6750A4', '#7B1FA2', '#C2185B', '#BA1A1A', '#E65100', '#F9A825', '#2E7D32', '#00796B', '#00838F', '#3949AB', '#546E7A'];

/** Palette styles of Material 3 Expressive: calm (tonal spot), lively (vibrant) and playful (expressive). */
export const PALETTES: PaletteStyle[] = ['tonal', 'vibrant', 'expressive'];
const SCHEMES = { tonal: SchemeTonalSpot, vibrant: SchemeVibrant, expressive: SchemeExpressive } as const;

const ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer', 'error', 'onError', 'errorContainer', 'onErrorContainer',
  'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant', 'outline', 'outlineVariant', 'scrim', 'inverseSurface', 'inverseOnSurface', 'inversePrimary',
  'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'surfaceDim', 'surfaceBright',
] as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const mq = window.matchMedia('(prefers-color-scheme: dark)');
let last = '';

export const isDark = (mode: ThemeMode) => mode === 'dark' || (mode === 'system' && mq.matches);

/** Generates a Material 3 dynamic scheme from the seed colour and writes it as CSS variables (--md-*). */
export function applyTheme(mode: ThemeMode, seed: string, palette: PaletteStyle = 'tonal', animate = false) {
  const dark = isDark(mode);
  const key = `${dark}|${seed}|${palette}`;
  if (key === last) return;
  last = key;
  const root = document.documentElement;
  const write = () => paint(root, dark, seed, palette);
  // A GPU cross-fade of the whole window is far cheaper than transitioning every element's colours.
  const vt = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
  if (animate && vt && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) vt.call(document, write);
  else write();
}

function paint(root: HTMLElement, dark: boolean, seed: string, palette: PaletteStyle) {
  const Scheme = SCHEMES[palette] ?? SchemeTonalSpot;
  const scheme: DynamicScheme = new Scheme(Hct.fromInt(argbFromHex(seed)), dark, 0);
  for (const r of ROLES) root.style.setProperty('--md-' + kebab(r), hexFromArgb(MaterialDynamicColors[r].getArgb(scheme)));
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
