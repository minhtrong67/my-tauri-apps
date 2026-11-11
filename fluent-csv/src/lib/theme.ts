// Fluent Design theming: accent colour roles, light / dark / system, the Windows 11 window material
// (Mica, Acrylic, Mica Alt), font + text size and window helpers.
import { Effect } from '@tauri-apps/api/window';
import { app, emit, type FontId, type SizeId, type MaterialId } from './store';
import { win, inTauri, defaultSize } from './tauri';

/** Windows 11 accent colours. */
export const SEEDS: [string, string][] = [
  ['#0078D4', 'Blue'], ['#0063B1', 'Navy'], ['#8764B8', 'Iris'], ['#881798', 'Violet'], ['#E3008C', 'Plum'], ['#D13438', 'Brick red'],
  ['#F7630C', 'Orange'], ['#FFB900', 'Gold'], ['#107C10', 'Green'], ['#00B294', 'Mint'], ['#038387', 'Teal'], ['#68768A', 'Steel'],
];
export const DEFAULT_ACCENT = '#0078D4';

export const MATERIALS: MaterialId[] = ['mica', 'acrylic', 'mica-alt'];

export const FONTS: Record<FontId, { stack: string; label: string }> = {
  system: { label: 'font.system', stack: '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif' },
  segoe: { label: 'font.segoe', stack: '"Segoe UI", system-ui, Arial, sans-serif' },
  inter: { label: 'font.inter', stack: '"Inter", "Segoe UI Variable Text", "Segoe UI", sans-serif' },
  bevietnam: { label: 'font.bevietnam', stack: '"Be Vietnam Pro", "Segoe UI Variable Text", "Segoe UI", sans-serif' },
  arial: { label: 'font.arial', stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
};
export const SIZES: Record<SizeId, number> = { small: 14, medium: 16, large: 18 };
export const sizeScale = () => SIZES[app.settings.fontSize] / 16;

/* ---------------------------------- colour helpers ---------------------------------- */

type RGB = [number, number, number];
const hexRgb = (h: string): RGB => { const m = /^#?([0-9a-f]{6})$/i.exec(h.trim()); const n = parseInt(m ? m[1] : '0078D4', 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbHex = (c: RGB) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export const luminance = (c: RGB) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
/** Black or white text for a given fill. */
export const onColor = (hex: string) => (luminance(hexRgb(hex)) > 0.34 ? '#000000' : '#FFFFFF');

const WHITE: RGB = [255, 255, 255], BLACK: RGB = [0, 0, 0];

/** Accent roles like Windows 11: a darker fill on light, a lighter fill on dark. */
export function accentRoles(hex: string, dark: boolean) {
  const base = hexRgb(hex);
  const fill = dark ? mix(base, WHITE, 0.42) : mix(base, BLACK, 0.12);
  const hover = dark ? mix(fill, BLACK, 0.1) : mix(fill, WHITE, 0.1);
  const press = dark ? mix(fill, BLACK, 0.2) : mix(fill, WHITE, 0.2);
  const text = dark ? mix(base, WHITE, 0.6) : mix(base, BLACK, 0.34);
  const fillHex = rgbHex(fill);
  return { accent: fillHex, hover: rgbHex(hover), press: rgbHex(press), text: rgbHex(text), on: onColor(fillHex), sub: `rgba(${fill.map(Math.round).join(',')},${dark ? 0.28 : 0.14})` };
}

const mq = window.matchMedia('(prefers-color-scheme: dark)');
export const isDark = () => app.settings.theme === 'dark' || (app.settings.theme === 'system' && mq.matches);

export function applyAccent() {
  const r = accentRoles(app.settings.accent, isDark()), st = document.documentElement.style;
  st.setProperty('--f-accent', r.accent); st.setProperty('--f-accent-hover', r.hover); st.setProperty('--f-accent-press', r.press);
  st.setProperty('--f-accent-text', r.text); st.setProperty('--f-on-accent', r.on); st.setProperty('--f-accent-sub', r.sub);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', isDark() ? 'dark' : 'light');
}

/** Colour swatch preview for a seed, in the current theme. */
export const swatchColor = (hex: string) => accentRoles(hex, isDark()).accent;

/* ---------------------------------- window material ---------------------------------- */

/** ok: the system accepted the backdrop. False on Windows 10 (no Mica) or when the call fails; the UI then stays solid. */
export const matState = { ok: true, native: inTauri };
let matSeq = 0;

export async function applyMaterial() {
  const root = document.documentElement, m = app.settings.material, seq = ++matSeq;
  root.dataset.host = inTauri ? 'app' : 'web';
  if (!win) { matState.ok = true; root.dataset.material = m; return; }
  try {
    const effect = m === 'acrylic' ? Effect.Acrylic : m === 'mica-alt' ? Effect.Tabbed : Effect.Mica;
    // The colour tints Acrylic on Windows 10; Windows 11 uses its own system acrylic.
    await win.setEffects({ effects: [effect], color: isDark() ? [32, 32, 32, 150] : [243, 243, 243, 150] });
    if (seq !== matSeq) return;
    matState.ok = true; root.dataset.material = m;
  } catch {
    if (seq !== matSeq) return;
    try { await win.clearEffects(); } catch { /* ignore */ }
    matState.ok = false; root.dataset.material = 'none';
  }
  emit();
}

export function applyTheme() {
  const root = document.documentElement;
  root.dataset.theme = isDark() ? 'dark' : 'light';
  applyAccent();
  // Mica and Tabbed follow the window theme, so it always mirrors the resolved app theme.
  const done = (async () => { try { await win?.setTheme(isDark() ? 'dark' : 'light'); } catch { /* ignore */ } })();
  done.then(() => applyMaterial());
}
mq.addEventListener('change', () => { if (app.settings.theme === 'system') applyTheme(); });

export function applyTypography() {
  const s = app.settings, st = document.documentElement.style;
  st.setProperty('--app-font', (FONTS[s.font] || FONTS.system).stack);
  st.fontSize = SIZES[s.fontSize] + 'px';
}

export function applyAppearance() {
  const s = app.settings, root = document.documentElement;
  root.dataset.zebra = s.zebra ? '1' : '0';
  root.dataset.lines = s.gridLines ? '1' : '0';
  root.classList.toggle('noanim', !s.anim);
  applyTypography();
  applyTheme();
}

/* ---------------------------------- window ---------------------------------- */

export async function setFullscreen(on: boolean) {
  if (win) { try { await win.setFullscreen(on); } catch { /* ignore */ } }
  else if (on) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.();
}
export async function toggleFullscreen() {
  const f = win ? await win.isFullscreen().catch(() => false) : !!document.fullscreenElement;
  await setFullscreen(!f);
}
/** "Always open maximized" mode. */
export async function applyWindowMode() {
  if (!win || app.settings.windowMode !== 'maximized') return;
  try { await win.maximize(); } catch { /* ignore */ }
}
export async function resetWindowSize() {
  if (!win || !inTauri) return;
  try { await win.setFullscreen(false); await win.unmaximize(); await win.setSize(defaultSize()); await win.center(); } catch { /* ignore */ }
}
