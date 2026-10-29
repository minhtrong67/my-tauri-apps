import { ROLES, buildScheme, type Scheme } from './theme-core';
import { DEFAULT_SCHEMES, DEFAULT_SEED } from './theme-default';

export { DEFAULT_SEED };

/** Material color presets (the 500 tone of each Material hue) + the default theme exported from Theme Builder. */
export const PRESETS = [
  { id: 'default', seed: DEFAULT_SEED },
  { id: 'red', seed: '#F44336' },
  { id: 'pink', seed: '#E91E63' },
  { id: 'purple', seed: '#9C27B0' },
  { id: 'deepPurple', seed: '#673AB7' },
  { id: 'indigo', seed: '#3F51B5' },
  { id: 'blue', seed: '#2196F3' },
  { id: 'lightBlue', seed: '#03A9F4' },
  { id: 'cyan', seed: '#00BCD4' },
  { id: 'teal', seed: '#009688' },
  { id: 'green', seed: '#4CAF50' },
  { id: 'lightGreen', seed: '#8BC34A' },
  { id: 'lime', seed: '#CDDC39' },
  { id: 'yellow', seed: '#FFEB3B' },
  { id: 'amber', seed: '#FFC107' },
  { id: 'orange', seed: '#FF9800' },
  { id: 'deepOrange', seed: '#FF5722' },
  { id: 'brown', seed: '#795548' },
  { id: 'blueGrey', seed: '#607D8B' },
] as const;

const cache = new Map<string, Scheme>();

export function schemeFor(seed: string, dark: boolean): Scheme {
  const s = seed.toUpperCase();
  if (s === DEFAULT_SEED.toUpperCase()) return dark ? DEFAULT_SCHEMES.dark : DEFAULT_SCHEMES.light;
  const key = `${s}|${dark ? 'd' : 'l'}`;
  let v = cache.get(key);
  if (!v) {
    v = buildScheme(s, dark);
    cache.set(key, v);
  }
  return v;
}

const kebab = (r: string) => r.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

/** Writes the scheme to CSS variables on <html>; Tailwind colors read these variables. */
export function applyScheme(seed: string, dark: boolean) {
  const scheme = schemeFor(seed, dark);
  const root = document.documentElement;
  for (const r of ROLES) root.style.setProperty(`--md-${kebab(r)}`, scheme[r]);
  root.dataset.mode = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', scheme.surface);
}
