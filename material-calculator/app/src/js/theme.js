// Material Design 3 dynamic colour: builds a full colour scheme from a seed colour.
import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities';
import { settings } from './store.js';

// [role, palette, lightTone, darkTone]
const ROLES = [
  ['primary', 'primary', 40, 80], ['on-primary', 'primary', 100, 20],
  ['primary-container', 'primary', 90, 30], ['on-primary-container', 'primary', 10, 90],
  ['secondary', 'secondary', 40, 80], ['on-secondary', 'secondary', 100, 20],
  ['secondary-container', 'secondary', 90, 30], ['on-secondary-container', 'secondary', 10, 90],
  ['tertiary', 'tertiary', 40, 80], ['on-tertiary', 'tertiary', 100, 20],
  ['tertiary-container', 'tertiary', 90, 30], ['on-tertiary-container', 'tertiary', 10, 90],
  ['error', 'error', 40, 80], ['on-error', 'error', 100, 20],
  ['error-container', 'error', 90, 30], ['on-error-container', 'error', 10, 90],
  ['surface', 'neutral', 98, 6], ['on-surface', 'neutral', 10, 90],
  ['surface-dim', 'neutral', 87, 6], ['surface-bright', 'neutral', 98, 24],
  ['surface-container-lowest', 'neutral', 100, 4], ['surface-container-low', 'neutral', 96, 10],
  ['surface-container', 'neutral', 94, 12], ['surface-container-high', 'neutral', 92, 17],
  ['surface-container-highest', 'neutral', 90, 22],
  ['surface-variant', 'neutralVariant', 90, 30], ['on-surface-variant', 'neutralVariant', 30, 80],
  ['outline', 'neutralVariant', 50, 60], ['outline-variant', 'neutralVariant', 80, 30],
  ['inverse-surface', 'neutral', 20, 90], ['inverse-on-surface', 'neutral', 95, 20],
  ['inverse-primary', 'primary', 80, 40],
];

const cache = new Map();
function buildTheme(seed) {
  if (cache.has(seed)) return cache.get(seed);
  const th = themeFromSourceColor(argbFromHex(seed));
  const out = { light: {}, dark: {} };
  for (const [role, pal, l, d] of ROLES) {
    out.light[role] = hexFromArgb(th.palettes[pal].tone(l));
    out.dark[role] = hexFromArgb(th.palettes[pal].tone(d));
  }
  cache.set(seed, out);
  return out;
}

const mq = window.matchMedia('(prefers-color-scheme: dark)');
export const resolvedScheme = () => {
  const m = settings.get('theme');
  return m === 'system' ? (mq.matches ? 'dark' : 'light') : m;
};

let switching;
export function applyTheme({ animate = true } = {}) {
  const root = document.documentElement;
  const scheme = resolvedScheme();
  if (animate && !root.classList.contains('no-motion')) {
    root.classList.add('theme-switching');
    clearTimeout(switching);
    switching = setTimeout(() => root.classList.remove('theme-switching'), 400);
  }
  const colors = buildTheme(settings.get('seed'))[scheme];
  const style = root.style;
  for (const k in colors) style.setProperty('--' + k, colors[k]);
  root.dataset.scheme = scheme;
  root.style.colorScheme = scheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.surface);
}

export function initTheme() {
  applyTheme({ animate: false });
  settings.on('theme', () => applyTheme());
  settings.on('seed', () => applyTheme());
  mq.addEventListener('change', () => { if (settings.get('theme') === 'system') applyTheme(); });
}

export const SEEDS = [
  ['purple', '#6750A4'], ['indigo', '#4355B9'], ['blue', '#0B57D0'], ['teal', '#00796B'],
  ['green', '#3B7D2A'], ['amber', '#B36B00'], ['rose', '#B5246B'], ['red', '#BA1A1A'],
];
