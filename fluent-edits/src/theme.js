// Fluent Design colour system.
// A neutral Windows 11 palette (Mica-style backgrounds, layered cards, control strokes) plus one accent colour.
// The accent is derived from a seed in CIE LCH(ab) space: a deeper shade for light mode, a lighter shade for dark mode.

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function hexToRgb(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

const toLinear = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const fromLinear = (c) => {
  c = clamp01(c);
  return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
};

const WHITE = [0.95047, 1.0, 1.08883];
const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const fInv = (t) => (t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787);

function rgbToLch(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / WHITE[0];
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / WHITE[2];
  const fx = fLab(x), fy = fLab(y), fz = fLab(z);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  const C = Math.hypot(a, bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

function lchToLinear(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const X = fInv(fx) * WHITE[0];
  const Y = L > 8 ? Math.pow(fy, 3) : L / 903.3;
  const Z = fInv(fz) * WHITE[2];
  return [
    3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
    -0.969266 * X + 1.8760108 * Y + 0.041556 * Z,
    0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z,
  ];
}

const inGamut = (v) => v.every((c) => c >= -0.0005 && c <= 1.0005);

/** Color at lightness `tone` (0-100) with the highest chroma ≤ `chroma` that fits sRGB. */
export function tone(hue, chroma, t) {
  if (t <= 0) return '#000000';
  if (t >= 100) return '#ffffff';
  let lo = 0, hi = chroma;
  let lin = lchToLinear(t, hi, hue);
  if (!inGamut(lin)) {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(lchToLinear(t, mid, hue))) lo = mid;
      else hi = mid;
    }
    lin = lchToLinear(t, lo, hue);
  }
  return rgbToHex(lin.map(fromLinear));
}

/** Windows 11 accent colours (the system palette) + a few extras. `vi` is the Vietnamese name. */
export const SWATCHES = [
  { name: 'Blue', vi: 'Xanh dương', hex: '#0078D4' },
  { name: 'Navy', vi: 'Xanh hải quân', hex: '#0063B1' },
  { name: 'Cool blue', vi: 'Xanh lạnh', hex: '#0099BC' },
  { name: 'Seafoam', vi: 'Xanh biển', hex: '#00B7C3' },
  { name: 'Teal', vi: 'Xanh mòng két', hex: '#038387' },
  { name: 'Mint', vi: 'Bạc hà', hex: '#00B294' },
  { name: 'Turf green', vi: 'Xanh cỏ', hex: '#00CC6A' },
  { name: 'Green', vi: 'Xanh lá', hex: '#107C10' },
  { name: 'Meadow', vi: 'Xanh đồng cỏ', hex: '#498205' },
  { name: 'Gold', vi: 'Vàng', hex: '#FFB900' },
  { name: 'Orange', vi: 'Cam', hex: '#F7630C' },
  { name: 'Rust', vi: 'Gỉ sét', hex: '#DA3B01' },
  { name: 'Brick red', vi: 'Đỏ gạch', hex: '#D13438' },
  { name: 'Red', vi: 'Đỏ', hex: '#E81123' },
  { name: 'Rose', vi: 'Hồng đậm', hex: '#EA005E' },
  { name: 'Plum', vi: 'Mận', hex: '#E3008C' },
  { name: 'Orchid', vi: 'Phong lan', hex: '#B146C2' },
  { name: 'Violet', vi: 'Tím', hex: '#744DA9' },
  { name: 'Iris', vi: 'Tím nhạt', hex: '#8764B8' },
  { name: 'Periwinkle', vi: 'Xanh tím', hex: '#6B69D6' },
  { name: 'Steel', vi: 'Xám thép', hex: '#68768A' },
  { name: 'Gray', vi: 'Xám', hex: '#7A7574' },
];

const SYS = '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
/** UI fonts. The first group is bundled with the app (src/fonts); the rest must be installed on the system and otherwise fall back. */
export const FONTS = [
  { id: 'system', name: 'Segoe UI Variable', vi: 'Mặc định Windows', stack: SYS },
  { id: 'googlesansflex', name: 'Google Sans Flex', stack: `"Google Sans Flex Variable", ${SYS}` },
  { id: 'robotoflex', name: 'Roboto Flex', stack: `"Roboto Flex Variable", ${SYS}` },
  { id: 'roboto', name: 'Roboto', stack: `"Roboto Variable", Roboto, ${SYS}` },
  { id: 'inter', name: 'Inter', stack: `"Inter Variable", ${SYS}` },
  { id: 'bevietnam', name: 'Be Vietnam Pro', stack: `"Be Vietnam Pro", ${SYS}` },
  { id: 'notosans', name: 'Noto Sans', stack: `"Noto Sans Variable", ${SYS}` },
  { id: 'opensans', name: 'Open Sans', stack: `"Open Sans Variable", ${SYS}` },
  { id: 'segoe', name: 'Segoe UI', stack: `"Segoe UI", ${SYS}` },
  { id: 'arial', name: 'Arial', stack: `Arial, ${SYS}` },
  { id: 'verdana', name: 'Verdana', stack: `Verdana, ${SYS}` },
  { id: 'tahoma', name: 'Tahoma', stack: `Tahoma, ${SYS}` },
];

/** Applies the chosen UI font (id from FONTS) to the whole app. */
export function applyFont(id) {
  const f = FONTS.find((x) => x.id === id) || FONTS[0];
  document.documentElement.style.setProperty('--font', f.stack);
}

const lum = (hex) => {
  const [r, g, b] = (hexToRgb(hex) || [0, 0, 0]).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Black or white, whichever reads better on `bg` (WCAG contrast). */
const onColor = (bg) => {
  const L = lum(bg);
  return (1.05) / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#000000';
};
const withAlpha = (hex, a) => { const c = hexToRgb(hex) || [0, 0, 0]; return `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`; };

/** Returns a { cssVar: value } map (without the leading `--`) for the given accent seed and scheme. */
export function buildScheme(seedHex, dark) {
  const rgb = hexToRgb(seedHex) || hexToRgb('#0078D4');
  const { L, C, h } = rgbToLch(rgb);
  const chroma = Math.max(C, 6);
  const shade = (t) => tone(h, chroma, t);
  // Light: a deeper accent so white text stays readable. Dark: a lighter, softer accent with dark text on it.
  const fill = dark ? shade(Math.max(L, 74)) : shade(Math.min(L, 46));
  const fillHover = dark ? shade(Math.max(L, 74) - 5) : shade(Math.min(L, 46) + 6);
  const fillActive = dark ? shade(Math.max(L, 74) - 11) : shade(Math.min(L, 46) + 12);
  const text = dark ? shade(Math.max(L, 80)) : shade(Math.min(L, 38));

  const accent = {
    accent: fill, 'accent-hover': fillHover, 'accent-active': fillActive, 'on-accent': onColor(fill),
    'accent-text': text, 'accent-subtle': withAlpha(fill, dark ? 0.2 : 0.12), 'accent-subtle-hover': withAlpha(fill, dark ? 0.3 : 0.2),
    'accent-bright': shade(dark ? Math.max(L, 74) : Math.min(Math.max(L, 52), 62)), // clips, playhead highlights
  };

  const neutral = dark
    ? {
        bg: '#202020', 'bg-2': '#1c1c1c', 'bg-3': '#282828',
        layer: 'rgb(255 255 255 / .051)', 'layer-2': 'rgb(255 255 255 / .033)', solid: '#2b2b2b', 'solid-2': '#323232', 'solid-3': '#3a3a3a',
        flyout: '#2c2c2c', 'ctl': 'rgb(255 255 255 / .061)', 'ctl-hover': 'rgb(255 255 255 / .084)', 'ctl-active': 'rgb(255 255 255 / .033)', 'ctl-input': 'rgb(30 30 30 / .7)', 'ctl-input-focus': '#1f1f1f',
        subtle: 'rgb(255 255 255 / .061)', 'subtle-2': 'rgb(255 255 255 / .042)',
        stroke: 'rgb(255 255 255 / .07)', 'stroke-card': 'rgb(0 0 0 / .1)', 'stroke-strong': 'rgb(255 255 255 / .544)', divider: 'rgb(255 255 255 / .082)', 'stroke-surface': 'rgb(0 0 0 / .4)',
        text: '#ffffff', 'text-2': 'rgb(255 255 255 / .786)', 'text-3': 'rgb(255 255 255 / .544)', 'text-dis': 'rgb(255 255 255 / .363)',
        danger: '#ff99a4', 'danger-fill': '#c42b1c', 'danger-bg': '#442726', ok: '#6ccb5f', 'ok-bg': '#393d1b', warn: '#fce100', 'warn-bg': '#433519',
        'shadow-card': '0 2px 4px rgb(0 0 0 / .26)', 'shadow-flyout': '0 8px 16px rgb(0 0 0 / .26), 0 0 1px rgb(0 0 0 / .5)', 'shadow-dialog': '0 32px 64px rgb(0 0 0 / .37), 0 0 8px rgb(0 0 0 / .37)',
        'clip-fg': '#ffffff', 'wave': 'rgb(0 0 0 / .45)',
      }
    : {
        bg: '#f3f3f3', 'bg-2': '#eeeeee', 'bg-3': '#f9f9f9',
        layer: 'rgb(255 255 255 / .7)', 'layer-2': 'rgb(246 246 246 / .5)', solid: '#fbfbfb', 'solid-2': '#f6f6f6', 'solid-3': '#ffffff',
        flyout: '#fcfcfc', 'ctl': 'rgb(255 255 255 / .7)', 'ctl-hover': 'rgb(249 249 249 / .5)', 'ctl-active': 'rgb(249 249 249 / .3)', 'ctl-input': 'rgb(255 255 255 / .7)', 'ctl-input-focus': '#ffffff',
        subtle: 'rgb(0 0 0 / .037)', 'subtle-2': 'rgb(0 0 0 / .024)',
        stroke: 'rgb(0 0 0 / .058)', 'stroke-card': 'rgb(0 0 0 / .058)', 'stroke-strong': 'rgb(0 0 0 / .446)', divider: 'rgb(0 0 0 / .08)', 'stroke-surface': 'rgb(117 117 117 / .4)',
        text: 'rgb(0 0 0 / .896)', 'text-2': 'rgb(0 0 0 / .606)', 'text-3': 'rgb(0 0 0 / .446)', 'text-dis': 'rgb(0 0 0 / .361)',
        danger: '#c42b1c', 'danger-fill': '#c42b1c', 'danger-bg': '#fde7e9', ok: '#0f7b0f', 'ok-bg': '#dff6dd', warn: '#9d5d00', 'warn-bg': '#fff4ce',
        'shadow-card': '0 2px 4px rgb(0 0 0 / .04)', 'shadow-flyout': '0 8px 16px rgb(0 0 0 / .14), 0 0 1px rgb(0 0 0 / .12)', 'shadow-dialog': '0 32px 64px rgb(0 0 0 / .2), 0 0 8px rgb(0 0 0 / .12)',
        'clip-fg': '#ffffff', 'wave': 'rgb(0 0 0 / .4)',
      };
  return { ...neutral, ...accent };
}

const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function resolveDark(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return !!(mq && mq.matches);
}

/** Applies mode ('light' | 'dark' | 'system') and accent seed to the document. */
export function applyTheme(mode, seed) {
  const dark = resolveDark(mode);
  const root = document.documentElement;
  const scheme = buildScheme(seed, dark);
  for (const [k, v] of Object.entries(scheme)) root.style.setProperty('--' + k, v);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = scheme.bg;
  return dark;
}

/** Re-applies the theme when the OS scheme changes (only matters in 'system' mode). */
export function watchSystemTheme(cb) {
  if (!mq) return;
  const h = () => cb();
  if (mq.addEventListener) mq.addEventListener('change', h);
  else if (mq.addListener) mq.addListener(h);
}
