import { Hct, MaterialDynamicColors, SchemeTonalSpot, argbFromHex, hexFromArgb } from '@material/material-color-utilities';

/** Every Material 3 color role the app uses. */
export const ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground', 'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'outline', 'outlineVariant', 'inverseSurface', 'inverseOnSurface', 'inversePrimary',
  'surfaceDim', 'surfaceBright', 'surfaceContainerLowest', 'surfaceContainerLow',
  'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest',
  'surfaceTint', 'scrim', 'shadow',
] as const;

export type Role = (typeof ROLES)[number];
export type Scheme = Record<Role, string>;

const mdc = new MaterialDynamicColors();

/** Builds a full tonal-spot scheme (the Material Theme Builder default) from one seed color. */
export function buildScheme(seed: string, dark: boolean): Scheme {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), dark, 0);
  const out = {} as Scheme;
  for (const role of ROLES) {
    const make = (mdc as unknown as Record<Role, () => { getArgb: (s: SchemeTonalSpot) => number }>)[role];
    out[role] = hexFromArgb(make.call(mdc).getArgb(scheme)).toUpperCase();
  }
  return out;
}

export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
