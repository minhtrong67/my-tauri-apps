import {
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  argbFromHex,
  blueFromArgb,
  greenFromArgb,
  redFromArgb,
} from '@material/material-color-utilities';
import type { ThemeMode } from './types';

/** Default theme = the Material Theme Builder export shipped with the project (material-theme-blue.json, seed #2196F3) */
export const DEFAULT_SEED = '#2196F3';

/** The Material Design color palette (500 shades) - every swatch is a seed for a full Material 3 scheme */
export const SEED_PRESETS: { hex: string; name: string }[] = [
  { hex: '#F44336', name: 'Red' },
  { hex: '#E91E63', name: 'Pink' },
  { hex: '#9C27B0', name: 'Purple' },
  { hex: '#673AB7', name: 'Deep Purple' },
  { hex: '#3F51B5', name: 'Indigo' },
  { hex: '#2196F3', name: 'Blue' },
  { hex: '#03A9F4', name: 'Light Blue' },
  { hex: '#00BCD4', name: 'Cyan' },
  { hex: '#009688', name: 'Teal' },
  { hex: '#4CAF50', name: 'Green' },
  { hex: '#8BC34A', name: 'Light Green' },
  { hex: '#CDDC39', name: 'Lime' },
  { hex: '#FFEB3B', name: 'Yellow' },
  { hex: '#FFC107', name: 'Amber' },
  { hex: '#FF9800', name: 'Orange' },
  { hex: '#FF5722', name: 'Deep Orange' },
  { hex: '#795548', name: 'Brown' },
  { hex: '#607D8B', name: 'Blue Grey' },
];

const rgb = (argb: number) => `${redFromArgb(argb)} ${greenFromArgb(argb)} ${blueFromArgb(argb)}`;
const D = MaterialDynamicColors;

/** Material 3 "tonal spot" scheme (the same one Material Theme Builder exports) as CSS-variable tokens */
export function buildTokens(seedHex: string, dark: boolean): Record<string, string> {
  let argb: number;
  try {
    argb = argbFromHex(seedHex);
  } catch {
    argb = argbFromHex(DEFAULT_SEED);
  }
  const s = new SchemeTonalSpot(Hct.fromInt(argb), dark, 0);
  const c = (x: { getArgb: (s: SchemeTonalSpot) => number }) => rgb(x.getArgb(s));
  return {
    primary: c(D.primary),
    'on-primary': c(D.onPrimary),
    'primary-container': c(D.primaryContainer),
    'on-primary-container': c(D.onPrimaryContainer),
    secondary: c(D.secondary),
    'on-secondary': c(D.onSecondary),
    'secondary-container': c(D.secondaryContainer),
    'on-secondary-container': c(D.onSecondaryContainer),
    tertiary: c(D.tertiary),
    'on-tertiary': c(D.onTertiary),
    'tertiary-container': c(D.tertiaryContainer),
    'on-tertiary-container': c(D.onTertiaryContainer),
    error: c(D.error),
    'on-error': c(D.onError),
    'error-container': c(D.errorContainer),
    'on-error-container': c(D.onErrorContainer),
    surface: c(D.surface),
    'surface-dim': c(D.surfaceDim),
    'surface-bright': c(D.surfaceBright),
    'surface-variant': c(D.surfaceVariant),
    'surface-container-lowest': c(D.surfaceContainerLowest),
    'surface-container-low': c(D.surfaceContainerLow),
    'surface-container': c(D.surfaceContainer),
    'surface-container-high': c(D.surfaceContainerHigh),
    'surface-container-highest': c(D.surfaceContainerHighest),
    'on-surface': c(D.onSurface),
    'on-surface-variant': c(D.onSurfaceVariant),
    outline: c(D.outline),
    'outline-variant': c(D.outlineVariant),
    'inverse-surface': c(D.inverseSurface),
    'inverse-on-surface': c(D.inverseOnSurface),
    'inverse-primary': c(D.inversePrimary),
  };
}

export function isDarkMode(mode: ThemeMode) {
  return mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/** Fonts offered in Settings: a system stack (default), fonts bundled with the app and common Windows fonts */
export interface FontOption {
  id: string;
  label: string;
  stack: string;
  group: 'system' | 'bundled' | 'windows';
}
const FALLBACK = "system-ui, -apple-system, 'Segoe UI', sans-serif";
export const FONT_OPTIONS: FontOption[] = [
  { id: 'system', label: 'System UI', stack: FALLBACK, group: 'system' },
  { id: 'roboto', label: 'Roboto', stack: `'Roboto', ${FALLBACK}`, group: 'bundled' },
  { id: 'inter', label: 'Inter', stack: `'Inter Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'open-sans', label: 'Open Sans', stack: `'Open Sans Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'noto-sans', label: 'Noto Sans', stack: `'Noto Sans Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'nunito', label: 'Nunito', stack: `'Nunito Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'montserrat', label: 'Montserrat', stack: `'Montserrat Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'source-sans', label: 'Source Sans 3', stack: `'Source Sans 3 Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'be-vietnam', label: 'Be Vietnam Pro', stack: `'Be Vietnam Pro', ${FALLBACK}`, group: 'bundled' },
  { id: 'segoe', label: 'Segoe UI', stack: `'Segoe UI', ${FALLBACK}`, group: 'windows' },
  { id: 'arial', label: 'Arial', stack: `Arial, Helvetica, sans-serif`, group: 'windows' },
  { id: 'tahoma', label: 'Tahoma', stack: `Tahoma, Verdana, sans-serif`, group: 'windows' },
  { id: 'verdana', label: 'Verdana', stack: `Verdana, Geneva, sans-serif`, group: 'windows' },
  { id: 'georgia', label: 'Georgia', stack: `Georgia, 'Times New Roman', serif`, group: 'windows' },
  { id: 'consolas', label: 'Consolas', stack: `Consolas, 'Courier New', monospace`, group: 'windows' },
];
export const fontById = (id: string) => FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];

export function applyFont(id: string) {
  document.documentElement.style.setProperty('--app-font', fontById(id).stack);
}

export function applyTheme(seedHex: string, mode: ThemeMode) {
  const dark = isDarkMode(mode);
  const tokens = buildTokens(seedHex, dark);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--md-${k}`, v);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

/** Re-applies the theme with a short cross-fade of the colors (only used when the user changes it, never on startup) */
export function applyThemeAnimated(seedHex: string, mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.add('theme-anim');
  applyTheme(seedHex, mode);
  window.setTimeout(() => root.classList.remove('theme-anim'), 450);
}
