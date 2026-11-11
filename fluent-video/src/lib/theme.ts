import type { Backdrop, ThemeMode } from './types';

/** Windows 11 default accent ("Default blue") */
export const DEFAULT_ACCENT = '#0078D4';

/** Accent colors offered in Settings - taken from the Windows 11 accent palette */
export const ACCENT_PRESETS: { hex: string; name: string }[] = [
  { hex: '#0078D4', name: 'Default blue' },
  { hex: '#0063B1', name: 'Navy blue' },
  { hex: '#8E8CD8', name: 'Purple shadow' },
  { hex: '#8764B8', name: 'Iris pastel' },
  { hex: '#B146C2', name: 'Violet red' },
  { hex: '#BF0077', name: 'Plum' },
  { hex: '#EA005E', name: 'Rose' },
  { hex: '#E81123', name: 'Red' },
  { hex: '#DA3B01', name: 'Rust' },
  { hex: '#F7630C', name: 'Orange' },
  { hex: '#FFB900', name: 'Gold' },
  { hex: '#498205', name: 'Meadow green' },
  { hex: '#107C10', name: 'Green' },
  { hex: '#00B294', name: 'Mint' },
  { hex: '#038387', name: 'Seafoam' },
  { hex: '#0099BC', name: 'Cool blue' },
  { hex: '#68768A', name: 'Steel blue' },
  { hex: '#767676', name: 'Overcast' },
];

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = parseInt((m ? m[1] : DEFAULT_ACCENT.slice(1)), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function luminance([r, g, b]: RGB) {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a: RGB, b: RGB) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const triplet = (c: RGB) => `${c[0]} ${c[1]} ${c[2]}`;

/** Darken until the color reads on a light surface (min contrast against white) */
function darkenFor(hsl: [number, number, number], min: number): RGB {
  let [h, s, l] = hsl;
  let c = hslToRgb(h, s, l);
  while (contrast(c, WHITE) < min && l > 0.12) { l -= 0.01; c = hslToRgb(h, s, l); }
  return c;
}

/** Fluent accent tokens: fill color, text on the fill, accent text on the layer, accent text on dark video overlays */
export function buildAccent(hex: string, dark: boolean): Record<string, string> {
  const base = rgbToHsl(hexToRgb(hex));
  const [h, s0, l0] = base;
  const s = Math.max(0.35, s0);
  // used on dark surfaces (video controls): the lighter "dark theme" accent
  const onDark = hslToRgb(h, Math.min(1, s), Math.max(0.7, l0 + 0.18));
  let fill: RGB, text: RGB, onFill: RGB;
  if (dark) {
    fill = hslToRgb(h, Math.min(1, s), Math.max(0.64, Math.min(0.74, l0 + 0.2)));
    text = hslToRgb(h, Math.min(1, s), Math.max(0.72, Math.min(0.8, l0 + 0.28)));
    onFill = BLACK;
  } else {
    fill = darkenFor([h, s0, Math.max(0.12, l0 - 0.06)], 4.6);
    text = darkenFor([h, s0, Math.max(0.12, l0 - 0.12)], 6);
    onFill = WHITE;
  }
  return { accent: triplet(fill), 'on-accent': triplet(onFill), 'accent-text': triplet(text), 'accent-ondark': triplet(onDark) };
}

export function isDarkMode(mode: ThemeMode) {
  return mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/** Fonts offered in Settings: Segoe UI Variable (default), fonts bundled with the app and common Windows fonts */
export interface FontOption {
  id: string;
  label: string;
  stack: string;
  group: 'system' | 'bundled' | 'windows';
}
const FALLBACK = "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif";
export const FONT_OPTIONS: FontOption[] = [
  { id: 'system', label: 'Segoe UI Variable', stack: "'Segoe UI Variable Text', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif", group: 'system' },
  { id: 'inter', label: 'Inter', stack: `'Inter Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'roboto', label: 'Roboto', stack: `'Roboto', ${FALLBACK}`, group: 'bundled' },
  { id: 'open-sans', label: 'Open Sans', stack: `'Open Sans Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'noto-sans', label: 'Noto Sans', stack: `'Noto Sans Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'nunito', label: 'Nunito', stack: `'Nunito Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'montserrat', label: 'Montserrat', stack: `'Montserrat Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'source-sans', label: 'Source Sans 3', stack: `'Source Sans 3 Variable', ${FALLBACK}`, group: 'bundled' },
  { id: 'be-vietnam', label: 'Be Vietnam Pro', stack: `'Be Vietnam Pro', ${FALLBACK}`, group: 'bundled' },
  { id: 'segoe', label: 'Segoe UI', stack: `'Segoe UI', system-ui, sans-serif`, group: 'windows' },
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

export function applyTheme(accentHex: string, mode: ThemeMode) {
  const dark = isDarkMode(mode);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(buildAccent(accentHex, dark))) root.style.setProperty(`--${k}`, v);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

/** Re-applies the theme with a short cross-fade of the colors (only used when the user changes it, never on startup) */
export function applyThemeAnimated(accentHex: string, mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.add('theme-anim');
  applyTheme(accentHex, mode);
  window.setTimeout(() => root.classList.remove('theme-anim'), 300);
}

/** The three window materials offered in Settings (Mica is the default) */
export const BACKDROPS: Backdrop[] = ['mica', 'acrylic', 'mica-alt'];
export const DEFAULT_BACKDROP: Backdrop = 'mica';
