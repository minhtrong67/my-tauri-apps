// Material 3 theming: colour schemes generated from a seed colour, light / dark / system, contrast levels, window helpers.
import { app, saveSettings } from './state.js';
import { buildScheme, ROLES } from '../vendor/material-color.js';

const TA = window.__TAURI__;
export const win = TA ? TA.window.getCurrentWindow() : null;

/** Seed colours offered in Settings. The first one is the seed of the project's Material Theme Builder export. */
export const SEEDS = [
  ['#769CDF', 'Blue'], ['#6750A4', 'Purple'], ['#3F51B5', 'Indigo'], ['#00BCD4', 'Cyan'], ['#009688', 'Teal'], ['#4CAF50', 'Green'],
  ['#FBC02D', 'Yellow'], ['#FF9800', 'Orange'], ['#F44336', 'Red'], ['#E91E63', 'Pink'], ['#795548', 'Brown'], ['#607D8B', 'Blue grey'],
];
export const CONTRAST = { standard: 0, medium: 0.5, high: 1 };

const kebab = r => '--m-' + r.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const mq = window.matchMedia('(prefers-color-scheme: dark)');
export const isDark = () => app.settings.theme === 'dark' || (app.settings.theme === 'system' && mq.matches);

/** Primary colour of a seed for swatch previews. */
export const previewColor = hex => buildScheme(hex, isDark(), 0).primary;

/** Writes every Material colour role as a CSS variable on :root. */
export function applyScheme() {
  const s = app.settings, dark = isDark();
  let sch;
  try { sch = buildScheme(s.accent, dark, CONTRAST[s.contrast] ?? 0); } catch { sch = buildScheme('#769CDF', dark, 0); }
  const r = document.documentElement.style;
  for (const k of ROLES) r.setProperty(kebab(k), sch[k]);
  r.setProperty('--m-success', dark ? '#8DD98D' : '#2E7D32');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sch.surface);
}

export function applyTheme(animate = false) {
  const root = document.documentElement, th = app.settings.theme;
  const set = () => {
    if (th === 'system') root.removeAttribute('data-theme'); else root.dataset.theme = th;
    applyScheme();
  };
  if (animate && app.settings.anim && document.startViewTransition) document.startViewTransition(set);
  else set();
  try { win?.setTheme(th === 'system' ? null : th); } catch { /* ignore */ }
}

mq.addEventListener('change', () => { if (app.settings.theme === 'system') applyScheme(); });

export function applyMotion() { document.documentElement.classList.toggle('noanim', !app.settings.anim); }

export function applyAppearance() {
  const s = app.settings, root = document.documentElement;
  root.dataset.zebra = s.zebra ? '1' : '0';
  root.dataset.lines = s.gridLines ? '1' : '0';
  applyScheme(); applyMotion();
}

/* ---------------------------------- window ---------------------------------- */

export async function isFullscreen() { try { return await win.isFullscreen(); } catch { return !!document.fullscreenElement; } }

export async function setFullscreen(on) {
  if (win) { try { await win.setFullscreen(on); } catch { /* ignore */ } }
  else if (on) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.();
}
export async function toggleFullscreen() { await setFullscreen(!(await isFullscreen())); }

/** "Always open maximized" mode: maximise the window (also used when the option is switched on). */
export async function applyWindowMode() {
  if (!win || app.settings.windowMode !== 'maximized') return;
  try { await win.maximize(); } catch { /* ignore */ }
}

export async function resetWindowSize() {
  if (!win) return;
  try { await win.setFullscreen(false); await win.unmaximize(); await win.setSize(new TA.window.LogicalSize(1280, 800)); await win.center(); } catch { /* ignore */ }
}
