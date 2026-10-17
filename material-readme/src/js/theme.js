import { store, reduceMotion } from './util.js';

/** Material Design colour palette (500 tones) offered as theme colours. First entry is the default seed from the theme file. */
export const DEFAULT_SEED = '#03A9F4';
/** Ready made themes exported from Material Theme Builder; their schemes are used verbatim. */
export const PRESETS = [
  { id: 'sky', name: 'Sky blue', seed: '#03A9F4', file: 'theme/material-theme-sky.json' },
  { id: 'blue', name: 'Blue', seed: '#769CDF', file: 'theme/material-theme-blue.json' },
  { id: 'purple', name: 'Purple', seed: '#6750A4', file: 'theme/material-theme-purple.json' },
];
export const PALETTE = [
  ['Red', '#F44336'], ['Pink', '#E91E63'], ['Purple', '#9C27B0'], ['Deep Purple', '#673AB7'],
  ['Indigo', '#3F51B5'], ['Blue', '#2196F3'], ['Cyan', '#00BCD4'], ['Teal', '#009688'],
  ['Green', '#4CAF50'], ['Light Green', '#8BC34A'], ['Lime', '#CDDC39'], ['Yellow', '#FFEB3B'], ['Amber', '#FFC107'],
  ['Orange', '#FF9800'], ['Deep Orange', '#FF5722'], ['Brown', '#795548'], ['Blue Grey', '#607D8B'],
].map(([name, hex]) => ({ name, hex }));

const SCHEME_KEYS = { '0': '', '0.5': '-medium-contrast', '1': '-high-contrast' };
const files = {};
await Promise.all(PRESETS.map(async (p) => { try { files[p.id] = await (await fetch(p.file)).json(); } catch { /* fall back to the generator */ } }));

// Version 2: the default theme became "sky" (material-theme-sky.json). Older installs are moved to it once.
if (store.get('themeV', 1) < 2) { store.set('preset', 'sky'); store.set('themeV', 2); }
export const state = {
  mode: store.get('theme', 'system'),          // system | light | dark
  preset: store.get('preset', 'sky'),         // a PRESETS id, or null when a custom seed is used
  seed: store.get('seed', DEFAULT_SEED),
  contrast: store.get('contrast', 0),         // 0 | 0.5 | 1
};
const mq = matchMedia('(prefers-color-scheme: dark)');
export const isDark = () => (state.mode === 'system' ? mq.matches : state.mode === 'dark');

const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

/** Returns the colour roles for the current settings. The default seed uses the exported theme file verbatim. */
export function currentScheme(seed = state.seed, dark = isDark(), contrast = state.contrast) {
  const f = state.preset && files[state.preset];
  if (f) {
    const s = f.schemes[(dark ? 'dark' : 'light') + SCHEME_KEYS[String(contrast)]];
    if (s) return s;
  }
  return window.MCU.scheme(seed, dark, contrast);
}

function paint() {
  const dark = isDark(), s = currentScheme(), r = document.documentElement;
  for (const [k, v] of Object.entries(s)) r.style.setProperty('--md-sys-color-' + kebab(k), v);
  r.style.colorScheme = dark ? 'dark' : 'light';
  r.dataset.theme = dark ? 'dark' : 'light';
  window.dispatchEvent(new CustomEvent('themechange', { detail: { dark } }));
}

/** Applies the theme. When an origin point is given, the change is revealed with a circular View Transition. */
export function applyTheme(origin) {
  store.set('theme', state.mode); store.set('seed', state.seed); store.set('preset', state.preset); store.set('contrast', state.contrast);
  const vt = document.startViewTransition && !reduceMotion() && origin;
  if (!vt) { paint(); return; }
  const { x, y } = origin;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const t = document.startViewTransition(paint);
  t.ready.then(() => document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
    { duration: 520, easing: 'cubic-bezier(.2,0,0,1)', pseudoElement: '::view-transition-new(root)' },
  )).catch(() => {});
}
mq.addEventListener('change', () => { if (state.mode === 'system') paint(); });

export function set(patch, origin) { Object.assign(state, patch); applyTheme(origin); }
export const isHex = (s) => /^#[0-9a-f]{6}$/i.test(s);
paint();
