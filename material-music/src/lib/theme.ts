import {
  Hct,
  TonalPalette,
  argbFromHex,
  blueFromArgb,
  greenFromArgb,
  redFromArgb,
} from '@material/material-color-utilities';
import type { ThemeMode } from './types';

/** Default theme: the Material Theme Builder export shipped with the project (material-theme-blue.json, seed #2196F3) */
export const DEFAULT_SEED = '#2196F3';

/** The Material Design 2014 colour palette (500 swatches) used as theme colours */
export const MATERIAL_COLORS: { hex: string; en: string; vi: string }[] = [
  { hex: '#F44336', en: 'Red', vi: 'Đỏ' },
  { hex: '#E91E63', en: 'Pink', vi: 'Hồng' },
  { hex: '#9C27B0', en: 'Purple', vi: 'Tím' },
  { hex: '#673AB7', en: 'Deep purple', vi: 'Tím đậm' },
  { hex: '#3F51B5', en: 'Indigo', vi: 'Chàm' },
  { hex: '#2196F3', en: 'Blue', vi: 'Xanh dương' },
  { hex: '#03A9F4', en: 'Light blue', vi: 'Xanh da trời' },
  { hex: '#00BCD4', en: 'Cyan', vi: 'Xanh lơ' },
  { hex: '#009688', en: 'Teal', vi: 'Xanh ngọc' },
  { hex: '#4CAF50', en: 'Green', vi: 'Xanh lá' },
  { hex: '#8BC34A', en: 'Light green', vi: 'Xanh lá nhạt' },
  { hex: '#CDDC39', en: 'Lime', vi: 'Xanh chanh' },
  { hex: '#FFEB3B', en: 'Yellow', vi: 'Vàng' },
  { hex: '#FFC107', en: 'Amber', vi: 'Hổ phách' },
  { hex: '#FF9800', en: 'Orange', vi: 'Cam' },
  { hex: '#FF5722', en: 'Deep orange', vi: 'Cam đậm' },
  { hex: '#795548', en: 'Brown', vi: 'Nâu' },
  { hex: '#607D8B', en: 'Blue grey', vi: 'Xám xanh' },
];

export interface FontOption {
  id: string;
  /** shown in the picker (not translated: font names) */
  label: string;
  stack: string;
}

const FALLBACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** "system" is the default. Roboto / Inter / Open Sans are bundled; the rest are used when installed on the device. */
export const FONT_OPTIONS: FontOption[] = [
  { id: 'system', label: '', stack: FALLBACK },
  { id: 'roboto', label: 'Roboto', stack: `'Roboto Variable', Roboto, ${FALLBACK}` },
  { id: 'inter', label: 'Inter', stack: `'Inter Variable', Inter, ${FALLBACK}` },
  { id: 'open-sans', label: 'Open Sans', stack: `'Open Sans Variable', 'Open Sans', ${FALLBACK}` },
  { id: 'segoe', label: 'Segoe UI', stack: `'Segoe UI', ${FALLBACK}` },
  { id: 'arial', label: 'Arial', stack: `Arial, Helvetica, ${FALLBACK}` },
  { id: 'verdana', label: 'Verdana', stack: `Verdana, Geneva, ${FALLBACK}` },
  { id: 'tahoma', label: 'Tahoma', stack: `Tahoma, ${FALLBACK}` },
  { id: 'trebuchet', label: 'Trebuchet MS', stack: `'Trebuchet MS', ${FALLBACK}` },
  { id: 'calibri', label: 'Calibri', stack: `Calibri, Candara, ${FALLBACK}` },
  { id: 'georgia', label: 'Georgia', stack: `Georgia, 'Times New Roman', serif` },
  { id: 'times', label: 'Times New Roman', stack: `'Times New Roman', Times, serif` },
  { id: 'consolas', label: 'Consolas', stack: `Consolas, 'Courier New', monospace` },
];

export const fontStack = (id: string) => (FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0]).stack;

const rgb = (argb: number) => `${redFromArgb(argb)} ${greenFromArgb(argb)} ${blueFromArgb(argb)}`;

/**
 * Material 3 colour tokens for a seed colour (tonal-spot scheme, same tone mapping as Material Theme Builder).
 * With the default seed #2196F3 this reproduces material-theme-blue.json exactly.
 */
export function buildTokens(seedHex: string, dark: boolean): Record<string, string> {
  const hue = Hct.fromInt(argbFromHex(seedHex)).hue;
  const pal = (h: number, c: number) => TonalPalette.fromHueAndChroma(h, c);
  const a1 = pal(hue, 36);
  const a2 = pal(hue, 16);
  const a3 = pal((hue + 60) % 360, 24);
  const n1 = pal(hue, 6);
  const n2 = pal(hue, 8);
  const e = pal(25, 84);
  const t = (p: TonalPalette, light: number, dk: number) => rgb(p.tone(dark ? dk : light));
  return {
    primary: t(a1, 40, 80),
    'on-primary': t(a1, 100, 20),
    'primary-container': t(a1, 90, 30),
    'on-primary-container': t(a1, 30, 90),
    secondary: t(a2, 40, 80),
    'on-secondary': t(a2, 100, 20),
    'secondary-container': t(a2, 90, 30),
    'on-secondary-container': t(a2, 30, 90),
    tertiary: t(a3, 40, 80),
    'on-tertiary': t(a3, 100, 20),
    'tertiary-container': t(a3, 90, 30),
    'on-tertiary-container': t(a3, 30, 90),
    error: t(e, 40, 80),
    'on-error': t(e, 100, 20),
    'error-container': t(e, 90, 30),
    'on-error-container': t(e, 30, 90),
    surface: t(n1, 98, 6),
    'surface-dim': t(n1, 87, 6),
    'surface-bright': t(n1, 98, 24),
    'surface-variant': t(n2, 90, 30),
    'surface-container-lowest': t(n1, 100, 4),
    'surface-container-low': t(n1, 96, 10),
    'surface-container': t(n1, 94, 12),
    'surface-container-high': t(n1, 92, 17),
    'surface-container-highest': t(n1, 90, 22),
    'on-surface': t(n1, 10, 90),
    'on-surface-variant': t(n2, 30, 80),
    outline: t(n2, 50, 60),
    'outline-variant': t(n2, 80, 30),
    'inverse-surface': t(n1, 20, 90),
    'inverse-on-surface': t(n1, 95, 20),
    'inverse-primary': t(a1, 80, 40),
  };
}

export function isDarkMode(mode: ThemeMode) {
  return mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function applyTheme(seedHex: string, mode: ThemeMode) {
  const dark = isDarkMode(mode);
  const tokens = buildTokens(seedHex, dark);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--md-${k}`, v);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

export function applyFont(id: string) {
  document.documentElement.style.setProperty('--app-font', fontStack(id));
}
