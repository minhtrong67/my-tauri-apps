// Builds the single-file landing page (index.html in the project root) from landing.template.html.
// Fills in: Material 3 Expressive palettes (generated with material-color-utilities), lucide icons, the cookie shape and spring easings.
// Run: node tools/landing/build-landing.mjs
import fs from 'node:fs';
import path from 'node:path';
import { argbFromHex, hexFromArgb, Hct, SchemeVibrant, MaterialDynamicColors as M } from '@material/material-color-utilities';
import { icons } from 'lucide';

const root = path.resolve(import.meta.dirname, '../..');
let html = fs.readFileSync(path.join(import.meta.dirname, 'landing.template.html'), 'utf8');

const SEEDS = { red: '#F44336', pink: '#D81B60', purple: '#9C27B0', 'deep-purple': '#673AB7', indigo: '#3F51B5', blue: '#2196F3', 'light-blue': '#03A9F4', cyan: '#00BCD4', teal: '#009688', green: '#4CAF50', 'light-green': '#8BC34A', lime: '#CDDC39', yellow: '#FFEB3B', amber: '#FFC107', orange: '#FF9800', 'deep-orange': '#FF5722', brown: '#795548', 'blue-grey': '#607D8B' };
const ROLES = { primary: M.primary, onPrimary: M.onPrimary, primaryContainer: M.primaryContainer, onPrimaryContainer: M.onPrimaryContainer, secondary: M.secondary, onSecondary: M.onSecondary, secondaryContainer: M.secondaryContainer, onSecondaryContainer: M.onSecondaryContainer,
  tertiary: M.tertiary, onTertiary: M.onTertiary, tertiaryContainer: M.tertiaryContainer, onTertiaryContainer: M.onTertiaryContainer, surface: M.surface, onSurface: M.onSurface, onSurfaceVariant: M.onSurfaceVariant,
  scLow: M.surfaceContainerLow, sc: M.surfaceContainer, scHigh: M.surfaceContainerHigh, scHighest: M.surfaceContainerHighest, outline: M.outline, outlineVariant: M.outlineVariant, inverseSurface: M.inverseSurface, inverseOnSurface: M.inverseOnSurface };
const P = {};
for (const [id, hex] of Object.entries(SEEDS)) {
  P[id] = { seed: hex };
  for (const dark of [false, true]) {
    const s = new SchemeVibrant(Hct.fromInt(argbFromHex(hex)), dark, 0), o = {};
    for (const [k, r] of Object.entries(ROLES)) o[k] = hexFromArgb(r.getArgb(s));
    P[id][dark ? 'dark' : 'light'] = o;
  }
}
html = html.replace('/*PALETTES*/', 'var PALETTES=' + JSON.stringify(P) + ';');

const cookie = (R, lobes, amp, steps = 160) => { let d = ''; for (let i = 0; i <= steps; i++) { const a = (i / steps) * 2 * Math.PI, r = R + amp * Math.cos(lobes * a); d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1); } return d + 'Z'; };
html = html.replaceAll('{{COOKIE_PATH}}', cookie(45, 12, 3.6)).replaceAll('{{SOFT_PATH}}', cookie(45, 8, 5));
const poly = []; for (let i = 0; i < 120; i++) { const a = (i / 120) * 2 * Math.PI, r = 50 + 4.2 * Math.cos(12 * a); poly.push(`${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`); }
html = html.replace('{{COOKIE}}', `polygon(${poly.join(',')})`);

const css = fs.readFileSync(path.join(root, 'app/src/styles/app.css'), 'utf8');
const spring = ['sp-fast', 'sp', 'sp-slow'].map((n) => css.match(new RegExp(`--${n}:\\s*(linear\\([^)]*\\))`))[1].replace(/^/, `--${n}:`) + ';').join('\n  ');
html = html.replace('{{SPRINGS}}', spring);

const GITHUB = 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12';
const render = (name) => {
  // lucide dropped brand icons, so the GitHub mark is inlined
  if (name === 'Github') return `<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${GITHUB}"/></svg>`;
  const node = icons[name]; if (!node) throw new Error('missing icon ' + name);
  const inner = node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
};
html = html.replace(/\{\{icon:(\w+)\}\}/g, (_, n) => render(n));
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html written:', (html.length / 1024).toFixed(0), 'KB');
