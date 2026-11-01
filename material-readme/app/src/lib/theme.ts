import {
  argbFromHex, hexFromArgb, Hct, SchemeVibrant, MaterialDynamicColors as M, Blend, TonalPalette,
  type DynamicColor, type DynamicScheme,
} from '@material/material-color-utilities';

/** Default seed: Material blue, the colour family of the app icon. */
export const DEFAULT_SEED = '#2196F3';

/** The Material Design palette (500 tones, plus the pink of the icon) offered as theme colours. */
export const PALETTE: { id: string; hex: string }[] = [
  ['red', '#F44336'], ['pink', '#D81B60'], ['purple', '#9C27B0'], ['deep-purple', '#673AB7'], ['indigo', '#3F51B5'],
  ['blue', '#2196F3'], ['light-blue', '#03A9F4'], ['cyan', '#00BCD4'], ['teal', '#009688'], ['green', '#4CAF50'],
  ['light-green', '#8BC34A'], ['lime', '#CDDC39'], ['yellow', '#FFEB3B'], ['amber', '#FFC107'], ['orange', '#FF9800'],
  ['deep-orange', '#FF5722'], ['brown', '#795548'], ['blue-grey', '#607D8B'],
].map(([id, hex]) => ({ id, hex }));

const ROLES: Record<string, DynamicColor> = {
  primary: M.primary, onPrimary: M.onPrimary, primaryContainer: M.primaryContainer, onPrimaryContainer: M.onPrimaryContainer,
  secondary: M.secondary, onSecondary: M.onSecondary, secondaryContainer: M.secondaryContainer, onSecondaryContainer: M.onSecondaryContainer,
  tertiary: M.tertiary, onTertiary: M.onTertiary, tertiaryContainer: M.tertiaryContainer, onTertiaryContainer: M.onTertiaryContainer,
  error: M.error, onError: M.onError, errorContainer: M.errorContainer, onErrorContainer: M.onErrorContainer,
  background: M.background, onBackground: M.onBackground,
  surface: M.surface, surfaceDim: M.surfaceDim, surfaceBright: M.surfaceBright,
  surfaceContainerLowest: M.surfaceContainerLowest, surfaceContainerLow: M.surfaceContainerLow, surfaceContainer: M.surfaceContainer,
  surfaceContainerHigh: M.surfaceContainerHigh, surfaceContainerHighest: M.surfaceContainerHighest,
  onSurface: M.onSurface, surfaceVariant: M.surfaceVariant, onSurfaceVariant: M.onSurfaceVariant,
  outline: M.outline, outlineVariant: M.outlineVariant,
  inverseSurface: M.inverseSurface, inverseOnSurface: M.inverseOnSurface, inversePrimary: M.inversePrimary,
  shadow: M.shadow, scrim: M.scrim, surfaceTint: M.surfaceTint,
};

/** Semantic colours for toasts, harmonised with the seed so they sit well in every palette. */
const SEMANTIC: Record<string, string> = { success: '#2E9E5B', warning: '#E0A100', info: '#2F7CF6' };

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

/** Returns every colour role as a hex string for the seed. */
export function buildScheme(seed: string, dark: boolean, contrast: number): Record<string, string> {
  const src = argbFromHex(seed);
  const scheme: DynamicScheme = new SchemeVibrant(Hct.fromInt(src), dark, contrast);
  const out: Record<string, string> = {};
  for (const [k, role] of Object.entries(ROLES)) out[kebab(k)] = hexFromArgb(role.getArgb(scheme));
  for (const [k, hex] of Object.entries(SEMANTIC)) {
    const pal = TonalPalette.fromInt(Blend.harmonize(argbFromHex(hex), src));
    const t = (n: number) => hexFromArgb(pal.tone(n));
    out[k] = dark ? t(80) : t(40);
    out['on-' + k] = dark ? t(20) : t(100);
    out[k + '-container'] = dark ? t(30) : t(90);
    out['on-' + k + '-container'] = dark ? t(90) : t(10);
  }
  return out;
}

/** Writes the scheme as CSS variables (--md-<role>) on the root element. */
export function paintScheme(seed: string, dark: boolean, contrast: number) {
  const root = document.documentElement, s = buildScheme(seed, dark, contrast);
  for (const [k, v] of Object.entries(s)) root.style.setProperty('--md-' + k, v);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.theme = dark ? 'dark' : 'light';
  return s;
}
