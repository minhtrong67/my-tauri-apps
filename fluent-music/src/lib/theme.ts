import type { BackdropKind, ThemeMode } from './types';

/**
 * Fluent 2 / Windows 11 theming.
 *
 * Neutral colours come from the WinUI 3 palette (light + dark). The accent is either the Windows system accent
 * colour (default, read from the CSS `AccentColor` keyword) or a colour picked in Settings; its shades are derived
 * the way Windows does it (darker fill in light mode, lighter fill in dark mode).
 */

/** "system" follows the Windows accent colour */
export const SYSTEM_ACCENT = 'system';
/** Fluent / Windows blue - used when the system accent cannot be read */
export const FALLBACK_ACCENT = '#0078D4';
export const DEFAULT_SEED = SYSTEM_ACCENT;

/** Accent colours offered in Settings (the Windows 11 accent palette, trimmed) */
export const ACCENT_COLORS: { hex: string; en: string; vi: string }[] = [
  { hex: '#FFB900', en: 'Yellow gold', vi: 'Vàng kim' },
  { hex: '#F7630C', en: 'Orange', vi: 'Cam' },
  { hex: '#CA5010', en: 'Burnt orange', vi: 'Cam cháy' },
  { hex: '#DA3B01', en: 'Rust', vi: 'Gỉ sắt' },
  { hex: '#E74856', en: 'Pale red', vi: 'Đỏ nhạt' },
  { hex: '#E81123', en: 'Red', vi: 'Đỏ' },
  { hex: '#EA005E', en: 'Rose', vi: 'Hồng đào' },
  { hex: '#C239B3', en: 'Orchid', vi: 'Phong lan' },
  { hex: '#881798', en: 'Purple', vi: 'Tím' },
  { hex: '#8764B8', en: 'Lavender', vi: 'Oải hương' },
  { hex: '#744DA9', en: 'Violet', vi: 'Tím violet' },
  { hex: '#0078D4', en: 'Blue', vi: 'Xanh dương' },
  { hex: '#0063B1', en: 'Deep blue', vi: 'Xanh đậm' },
  { hex: '#00B7C3', en: 'Cyan', vi: 'Xanh lơ' },
  { hex: '#038387', en: 'Teal', vi: 'Xanh ngọc' },
  { hex: '#00B294', en: 'Mint', vi: 'Bạc hà' },
  { hex: '#10893E', en: 'Green', vi: 'Xanh lá' },
  { hex: '#498205', en: 'Olive', vi: 'Ô liu' },
  { hex: '#7A7574', en: 'Stone', vi: 'Xám đá' },
  { hex: '#5D5A58', en: 'Graphite', vi: 'Than chì' },
];

export interface FontOption {
  id: string;
  /** shown in the picker (not translated: font names) */
  label: string;
  stack: string;
}

const FALLBACK = "'Segoe UI Variable Text', 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, 'Inter Variable', sans-serif";

/** "system" is the default (Segoe UI Variable on Windows 11). Roboto / Inter / Open Sans are bundled; the rest are used when installed. */
export const FONT_OPTIONS: FontOption[] = [
  { id: 'system', label: '', stack: FALLBACK },
  { id: 'segoe', label: 'Segoe UI', stack: `'Segoe UI', ${FALLBACK}` },
  { id: 'inter', label: 'Inter', stack: `'Inter Variable', Inter, ${FALLBACK}` },
  { id: 'roboto', label: 'Roboto', stack: `'Roboto Variable', Roboto, ${FALLBACK}` },
  { id: 'open-sans', label: 'Open Sans', stack: `'Open Sans Variable', 'Open Sans', ${FALLBACK}` },
  { id: 'arial', label: 'Arial', stack: `Arial, Helvetica, ${FALLBACK}` },
  { id: 'verdana', label: 'Verdana', stack: `Verdana, Geneva, ${FALLBACK}` },
  { id: 'tahoma', label: 'Tahoma', stack: `Tahoma, ${FALLBACK}` },
  { id: 'trebuchet', label: 'Trebuchet MS', stack: `'Trebuchet MS', ${FALLBACK}` },
  { id: 'calibri', label: 'Calibri', stack: `Calibri, Candara, ${FALLBACK}` },
  { id: 'georgia', label: 'Georgia', stack: `Georgia, 'Times New Roman', serif` },
  { id: 'consolas', label: 'Consolas', stack: `Consolas, 'Courier New', monospace` },
];

export const fontStack = (id: string) => (FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0]).stack;

/* ───────────── colour helpers ───────────── */

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 120, 212];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgbToHex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

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

function hslToRgb([h, s, l]: [number, number, number]): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const luminance = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrast = (a: RGB, b: RGB) => { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

/** Move lightness (HSL) until `test` passes; returns the first passing colour (or the last tried) */
function shade(base: RGB, dir: 1 | -1, test: (c: RGB) => boolean): RGB {
  const [h, s, l] = rgbToHsl(base);
  let cur = base;
  for (let i = 0; i <= 40; i++) {
    cur = hslToRgb([h, s, Math.max(0.04, Math.min(0.96, l + dir * i * 0.015))]);
    if (test(cur)) return cur;
  }
  return cur;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const trip = (c: RGB) => c.map((v) => Math.round(v)).join(' ');

/** The Windows accent colour via the CSS `AccentColor` system colour (WebView2 / Chromium 110+) */
export function systemAccentHex(): string {
  try {
    const probe = document.createElement('span');
    probe.style.cssText = 'color:AccentColor;position:absolute;visibility:hidden';
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    const m = c.match(/\d+(\.\d+)?/g);
    if (m && m.length >= 3) {
      const rgb: RGB = [Number(m[0]), Number(m[1]), Number(m[2])];
      // some engines resolve the keyword to a flat grey / black when it is unsupported
      if (!(rgb[0] === rgb[1] && rgb[1] === rgb[2])) return rgbToHex(rgb);
    }
  } catch { /* ignore */ }
  return FALLBACK_ACCENT;
}

export const resolveAccent = (seed: string) => (seed === SYSTEM_ACCENT ? systemAccentHex() : /^#[0-9a-f]{3,8}$/i.test(seed) ? seed : FALLBACK_ACCENT);

/* ───────────── tokens ───────────── */

/**
 * Colour tokens as "r g b" triplets (so Tailwind can add an alpha channel). Names keep the semantic roles the
 * components use: primary = accent fill, secondary-container = selected / subtle fill, surface-container-* = card and control fills.
 */
export function buildTokens(seedHex: string, dark: boolean): Record<string, string> {
  const seed = hexToRgb(resolveAccent(seedHex));
  const white: RGB = [255, 255, 255];
  const black: RGB = [0, 0, 0];

  // accent fill: dark enough for white text in light mode, light enough for dark text in dark mode
  const accent = dark
    ? shade(seed, 1, (c) => contrast(c, [20, 20, 20]) >= 7 && rgbToHsl(c)[2] >= 0.6)
    : shade(seed, -1, (c) => contrast(c, white) >= 4.6);
  const onAccent: RGB = dark ? [0, 0, 0] : [255, 255, 255];
  // accent used for text / icons on a neutral surface (needs 4.5:1)
  const accentText = dark
    ? shade(seed, 1, (c) => contrast(c, [43, 43, 43]) >= 6.5)
    : shade(seed, -1, (c) => contrast(c, [251, 251, 251]) >= 5.5);

  const base: RGB = dark ? [32, 32, 32] : [243, 243, 243];
  const tint = (t: number) => mix(base, accent, t);

  const neutral = dark
    ? {
        surface: [32, 32, 32], dim: [24, 24, 24], bright: [44, 44, 44], variant: [50, 50, 50],
        lowest: [28, 28, 28], low: [39, 39, 39], c: [45, 45, 45], high: [52, 52, 52], highest: [60, 60, 60],
        onSurface: [255, 255, 255], onVariant: [206, 206, 206], outline: [153, 153, 153], outlineVariant: [70, 70, 70],
        inverse: [243, 243, 243], onInverse: [26, 26, 26],
      }
    : {
        surface: [243, 243, 243], dim: [232, 232, 232], bright: [251, 251, 251], variant: [238, 238, 238],
        lowest: [255, 255, 255], low: [249, 249, 249], c: [252, 252, 252], high: [246, 246, 246], highest: [235, 235, 235],
        onSurface: [26, 26, 26], onVariant: [96, 96, 96], outline: [122, 122, 122], outlineVariant: [214, 214, 214],
        inverse: [44, 44, 44], onInverse: [255, 255, 255],
      };

  const err: RGB = dark ? [255, 153, 164] : [196, 43, 28];
  const errC: RGB = dark ? [68, 39, 38] : [253, 231, 233];
  const ok: RGB = dark ? [108, 203, 95] : [15, 123, 15];
  const okC: RGB = dark ? [57, 61, 27] : [223, 246, 221];
  const warn: RGB = dark ? [252, 225, 0] : [157, 93, 0];
  const warnC: RGB = dark ? [67, 53, 25] : [255, 244, 206];

  const n = neutral as unknown as Record<string, RGB>;
  return {
    primary: trip(accent),
    'on-primary': trip(onAccent),
    'primary-container': trip(tint(dark ? 0.28 : 0.12)),
    'on-primary-container': trip(accentText),
    secondary: trip(n.onVariant),
    'on-secondary': trip(n.surface),
    'secondary-container': trip(dark ? mix(base, white, 0.09) : mix(base, black, 0.055)),
    'on-secondary-container': trip(n.onSurface),
    tertiary: trip(accentText),
    'on-tertiary': trip(onAccent),
    'tertiary-container': trip(tint(dark ? 0.2 : 0.08)),
    'on-tertiary-container': trip(accentText),
    error: trip(err),
    'on-error': trip(dark ? black : white),
    'error-container': trip(errC),
    'on-error-container': trip(err),
    success: trip(ok),
    'success-container': trip(okC),
    warning: trip(warn),
    'warning-container': trip(warnC),
    surface: trip(n.surface),
    'surface-dim': trip(n.dim),
    'surface-bright': trip(n.bright),
    'surface-variant': trip(n.variant),
    'surface-container-lowest': trip(n.lowest),
    'surface-container-low': trip(n.low),
    'surface-container': trip(n.c),
    'surface-container-high': trip(n.high),
    'surface-container-highest': trip(n.highest),
    'on-surface': trip(n.onSurface),
    'on-surface-variant': trip(n.onVariant),
    outline: trip(n.outline),
    'outline-variant': trip(n.outlineVariant),
    'inverse-surface': trip(n.inverse),
    'inverse-on-surface': trip(n.onInverse),
    'inverse-primary': trip(dark ? shade(seed, -1, (c) => contrast(c, white) >= 4.6) : shade(seed, 1, (c) => rgbToHsl(c)[2] >= 0.65)),
  };
}

export function isDarkMode(mode: ThemeMode) {
  return mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function applyTheme(seedHex: string, mode: ThemeMode) {
  const dark = isDarkMode(mode);
  const tokens = buildTokens(seedHex, dark);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--fl-${k}`, v);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  return dark;
}

export function applyFont(id: string) {
  document.documentElement.style.setProperty('--app-font', fontStack(id));
}

/** Tells the CSS which Windows material is behind the window ("none" = solid colours) */
export function applyBackdropAttr(kind: BackdropKind | 'none') {
  document.documentElement.dataset.backdrop = kind;
}
