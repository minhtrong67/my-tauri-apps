// Material 3 colour generation. Same algorithm as Material Theme Builder, so the
// default seed #769CDF reproduces src/theme/material-theme.json exactly.
import {
  Hct, SchemeTonalSpot, MaterialDynamicColors, argbFromHex, hexFromArgb,
} from '@material/material-color-utilities';

const mdc = new MaterialDynamicColors();
export const ROLES = [
  'primary','surfaceTint','onPrimary','primaryContainer','onPrimaryContainer','secondary','onSecondary',
  'secondaryContainer','onSecondaryContainer','tertiary','onTertiary','tertiaryContainer','onTertiaryContainer',
  'error','onError','errorContainer','onErrorContainer','background','onBackground','surface','onSurface',
  'surfaceVariant','onSurfaceVariant','outline','outlineVariant','shadow','scrim','inverseSurface',
  'inverseOnSurface','inversePrimary','primaryFixed','onPrimaryFixed','primaryFixedDim','onPrimaryFixedVariant',
  'secondaryFixed','onSecondaryFixed','secondaryFixedDim','onSecondaryFixedVariant','tertiaryFixed',
  'onTertiaryFixed','tertiaryFixedDim','onTertiaryFixedVariant','surfaceDim','surfaceBright',
  'surfaceContainerLowest','surfaceContainerLow','surfaceContainer','surfaceContainerHigh','surfaceContainerHighest',
];

export function scheme(seedHex, dark, contrast = 0) {
  const s = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seedHex)), !!dark, contrast);
  const o = {};
  for (const r of ROLES) o[r] = hexFromArgb(mdc[r]().getArgb(s));
  return o;
}
export { hexFromArgb, argbFromHex };
