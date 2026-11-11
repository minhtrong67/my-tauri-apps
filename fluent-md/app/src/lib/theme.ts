/** Windows 11 accent colour and the Fluent accent tokens derived from it. Neutral colours live in styles/app.css. */
export const DEFAULT_ACCENT = '#0078D4';

/** The Windows 11 accent palette, in the order of the Settings app. */
export const PALETTE: { id: string; hex: string }[] = [
  ['blue', '#0078D4'], ['navy', '#0063B1'], ['cool-blue', '#0099BC'], ['seafoam', '#038387'], ['mint', '#00B294'], ['green', '#107C10'],
  ['meadow', '#498205'], ['gold', '#FF8C00'], ['orange', '#F7630C'], ['rust', '#DA3B01'], ['brick', '#D13438'], ['red', '#E81123'],
  ['rose', '#EA005E'], ['plum', '#BF0077'], ['orchid', '#9A0089'], ['iris', '#8764B8'], ['purple', '#6B69D6'], ['steel', '#68768A'],
].map(([id, hex]) => ({ id, hex }));

type RGB = [number, number, number];
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const hexToRgb = (hex: string): RGB => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb([h, s, l]: [number, number, number]): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const lum = ([r, g, b]: RGB) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const contrast = (a: RGB, b: RGB) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = ([r, g, b]: RGB, a: number) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${a})`;

/** Moves the lightness of a colour until it reads well against a background. */
function readable(rgb: RGB, bg: RGB, min = 4.5): RGB {
  const [h, s, l] = rgbToHsl(rgb), dir = lum(bg) > 0.5 ? -1 : 1;
  let L = l, out = rgb;
  for (let i = 0; i < 40 && contrast(out, bg) < min; i++) { L = clamp01(L + dir * 0.02); out = hslToRgb([h, s, L]); }
  return out;
}

/** Accent roles for one theme. */
export function accentTokens(seed: string, dark: boolean): Record<string, string> {
  const base = hexToRgb(seed), [h, s, l] = rgbToHsl(base);
  const fill = dark ? hslToRgb([h, s, Math.max(l, 0.64)]) : base;
  const hover = dark ? mix(fill, [255, 255, 255], 0.1) : mix(fill, [0, 0, 0], 0.1);
  const press = dark ? mix(fill, [0, 0, 0], 0.12) : mix(fill, [0, 0, 0], 0.22);
  const on = contrast([255, 255, 255], fill) >= 4.5 ? '#ffffff' : '#000000';
  const text = readable(dark ? hslToRgb([h, s, Math.max(l, 0.7)]) : base, dark ? [32, 32, 32] : [255, 255, 255]);
  return {
    accent: toHex(fill), 'accent-hover': toHex(hover), 'accent-press': toHex(press), 'on-accent': on, 'accent-text': toHex(text),
    'accent-subtle': rgba(fill, dark ? 0.2 : 0.12), 'accent-select': rgba(fill, dark ? 0.38 : 0.28),
  };
}

/** Writes the accent roles and the theme flag on the root element. */
export function paintTheme(seed: string, dark: boolean) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(accentTokens(seed, dark))) root.style.setProperty('--' + k, v);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.theme = dark ? 'dark' : 'light';
}

/** Variables for the exported HTML (always the light theme, so it prints well). */
export function exportVars(seed: string): string {
  const v = {
    ...accentTokens(seed, false),
    fg: '#1a1a1a', 'fg-2': '#5d5d5d', 'fg-3': '#707070', bg: '#ffffff', card: '#f6f6f6', 'card-2': '#efefef', stroke: '#e0e0e0', divider: '#e5e5e5', code: '#f3f3f3', 'strong-stroke': '#8a8a8a',
    ok: '#0f7b0f', 'ok-bg': '#dff6dd', warn: '#9d5d00', 'warn-bg': '#fff4ce', err: '#c42b1c', 'err-bg': '#fde7e9', info: accentTokens(seed, false)['accent-text'], 'info-bg': '#eef4fb',
    'syn-keyword': '#af00db', 'syn-string': '#a31515', 'syn-number': '#098658', 'syn-comment': '#6a737d', 'syn-func': '#795e26', 'syn-type': '#267f99', 'syn-var': '#0070c1', 'syn-tag': '#800000',
  };
  return Object.entries(v).map(([k, x]) => `--${k}:${x}`).join(';');
}
