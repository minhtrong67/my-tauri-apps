// Material 3 Expressive theming: colour schemes from a seed colour (2025 spec), light / dark / system,
// contrast levels, palette styles, font + text size, and window helpers.
import {
  argbFromHex, hexFromArgb, Hct, MaterialDynamicColors, SchemeTonalSpot, SchemeNeutral, SchemeVibrant, SchemeExpressive, TonalPalette,
  type DynamicScheme,
} from '@material/material-color-utilities';
import { app, type FontId, type SizeId } from './store';
import { win, inTauri, defaultSize } from './tauri';

export const SEEDS: [string, string][] = [
  ['#769CDF', 'Cornflower'], ['#2196F3', 'Blue'], ['#3F51B5', 'Indigo'], ['#6750A4', 'Purple'], ['#00BCD4', 'Cyan'], ['#009688', 'Teal'], ['#4CAF50', 'Green'],
  ['#8BC34A', 'Lime'], ['#FBC02D', 'Yellow'], ['#FF9800', 'Orange'], ['#F44336', 'Red'], ['#E91E63', 'Pink'], ['#795548', 'Brown'], ['#607D8B', 'Blue grey'],
];
export const CONTRAST = { standard: 0, medium: 0.5, high: 1 } as const;

export const FONTS: Record<FontId, { stack: string; label: string }> = {
  system: { label: 'font.system', stack: 'system-ui, -apple-system, "Segoe UI Variable", "Segoe UI", "Helvetica Neue", Arial, sans-serif' },
  googlesans: { label: 'font.googlesans', stack: '"Google Sans Flex Variable", system-ui, "Segoe UI", sans-serif' },
  robotoflex: { label: 'font.robotoflex', stack: '"Roboto Flex Variable", system-ui, "Segoe UI", sans-serif' },
  roboto: { label: 'font.roboto', stack: '"Roboto", system-ui, "Segoe UI", sans-serif' },
  arial: { label: 'font.arial', stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  inter: { label: 'font.inter', stack: '"Inter", system-ui, "Segoe UI", sans-serif' },
  bevietnam: { label: 'font.bevietnam', stack: '"Be Vietnam Pro", system-ui, "Segoe UI", sans-serif' },
};
export const SIZES: Record<SizeId, number> = { small: 14, medium: 16, large: 18 };
export const sizeScale = () => SIZES[app.settings.fontSize] / 16;

const ROLES: [string, string][] = [
  ['primary', 'primary'], ['on-primary', 'onPrimary'], ['primary-container', 'primaryContainer'], ['on-primary-container', 'onPrimaryContainer'],
  ['secondary', 'secondary'], ['on-secondary', 'onSecondary'], ['secondary-container', 'secondaryContainer'], ['on-secondary-container', 'onSecondaryContainer'],
  ['tertiary', 'tertiary'], ['on-tertiary', 'onTertiary'], ['tertiary-container', 'tertiaryContainer'], ['on-tertiary-container', 'onTertiaryContainer'],
  ['error', 'error'], ['on-error', 'onError'], ['error-container', 'errorContainer'], ['on-error-container', 'onErrorContainer'],
  ['background', 'background'], ['on-background', 'onBackground'], ['surface', 'surface'], ['on-surface', 'onSurface'],
  ['surface-variant', 'surfaceVariant'], ['on-surface-variant', 'onSurfaceVariant'], ['outline', 'outline'], ['outline-variant', 'outlineVariant'],
  ['inverse-surface', 'inverseSurface'], ['inverse-on-surface', 'inverseOnSurface'], ['inverse-primary', 'inversePrimary'],
  ['surface-dim', 'surfaceDim'], ['surface-bright', 'surfaceBright'],
  ['sc-lowest', 'surfaceContainerLowest'], ['sc-low', 'surfaceContainerLow'], ['sc', 'surfaceContainer'], ['sc-high', 'surfaceContainerHigh'], ['sc-highest', 'surfaceContainerHighest'],
];

const mq = window.matchMedia('(prefers-color-scheme: dark)');
export const isDark = () => app.settings.theme === 'dark' || (app.settings.theme === 'system' && mq.matches);

function makeScheme(hex: string, dark: boolean, contrast: number, variant: string): DynamicScheme {
  const hct = Hct.fromInt(argbFromHex(hex));
  const Cls = variant === 'tonal' ? SchemeTonalSpot : variant === 'expressive' ? SchemeExpressive : SchemeVibrant;
  return new Cls(hct, dark, contrast, '2025');
}

export function buildRoles(hex: string, dark: boolean, contrast: number, variant: string): Record<string, string> {
  let sch: DynamicScheme;
  try { sch = makeScheme(hex, dark, contrast, variant); } catch { sch = makeScheme('#769CDF', dark, 0, 'vibrant'); }
  const mdc = new MaterialDynamicColors();
  const out: Record<string, string> = {};
  // Surfaces, text and outlines come from a low-chroma neutral scheme so large areas stay calm; accents keep the seed colour.
  let neu: DynamicScheme = sch;
  try { neu = new SchemeNeutral(Hct.fromInt(argbFromHex(hex)), dark, contrast, '2025'); } catch { /* keep sch */ }
  const NEUTRAL = /^(background|on-background|surface|on-surface|surface-variant|on-surface-variant|outline|outline-variant|inverse-surface|inverse-on-surface|surface-dim|surface-bright|sc.*)$/;
  for (const [css, fn] of ROLES) out[css] = hexFromArgb((mdc as unknown as Record<string, () => { getArgb(s: DynamicScheme): number }>)[fn]().getArgb(NEUTRAL.test(css) ? neu : sch));
  // semantic extras (not part of the dynamic scheme): success and warning
  const tone = (hue: number, chroma: number, tn: number) => hexFromArgb(TonalPalette.fromHueAndChroma(hue, chroma).tone(tn));
  const L = !dark;
  out['success'] = tone(145, 36, L ? 40 : 80); out['on-success'] = tone(145, 36, L ? 100 : 20);
  out['success-container'] = tone(145, 36, L ? 90 : 30); out['on-success-container'] = tone(145, 36, L ? 10 : 90);
  out['warning'] = tone(75, 40, L ? 40 : 80); out['on-warning'] = tone(75, 40, L ? 100 : 20);
  out['warning-container'] = tone(75, 40, L ? 90 : 30); out['on-warning-container'] = tone(75, 40, L ? 10 : 90);
  return out;
}

/** Primary colour of a seed for swatch previews. */
export const previewColors = (hex: string) => { const r = buildRoles(hex, isDark(), 0, app.settings.variant); return { p: r['primary'], c: r['primary-container'], t: r['tertiary'] }; };

export function applyScheme() {
  const s = app.settings;
  const r = buildRoles(s.accent, isDark(), CONTRAST[s.contrast] ?? 0, s.variant);
  const st = document.documentElement.style;
  for (const k in r) st.setProperty('--m-' + k, r[k]);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', isDark() ? 'dark' : 'light');
}

export function applyTheme(animate = false) {
  const root = document.documentElement, th = app.settings.theme;
  const set = () => {
    root.dataset.theme = isDark() ? 'dark' : 'light';
    applyScheme();
  };
  set();
  try { win?.setTheme(th === 'system' ? null : th); } catch { /* ignore */ }
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
