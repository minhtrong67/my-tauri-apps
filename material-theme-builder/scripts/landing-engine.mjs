// Entry point bundled (esbuild, IIFE) and inlined into index.html by scripts/gen-landing-assets.mjs.
// It gives the single-file landing page the same color science as the app, so visitors can
// pick any color and any dynamic-color variant at runtime.
import {
  Hct, MaterialDynamicColors, SchemeContent, SchemeExpressive, SchemeFidelity, SchemeFruitSalad, SchemeMonochrome,
  SchemeNeutral, SchemeRainbow, SchemeTonalSpot, SchemeVibrant, argbFromHex, hexFromArgb,
} from "@material/material-color-utilities";

export const ROLES = ["primary","onPrimary","primaryContainer","onPrimaryContainer","secondary","onSecondary","secondaryContainer","onSecondaryContainer","tertiary","onTertiary","tertiaryContainer","onTertiaryContainer","error","onError","errorContainer","onErrorContainer","surface","onSurface","surfaceVariant","onSurfaceVariant","outline","outlineVariant","inverseSurface","inverseOnSurface","inversePrimary","surfaceDim","surfaceBright","surfaceContainerLowest","surfaceContainerLow","surfaceContainer","surfaceContainerHigh","surfaceContainerHighest","scrim","shadow"];
const VARIANTS = { tonalSpot: SchemeTonalSpot, vibrant: SchemeVibrant, expressive: SchemeExpressive, neutral: SchemeNeutral, monochrome: SchemeMonochrome, fidelity: SchemeFidelity, content: SchemeContent, rainbow: SchemeRainbow, fruitSalad: SchemeFruitSalad };

const cache = new Map();
/** Hex values (uppercase) of every role in ROLES order. */
export function roles(seed, dark, variant = "vibrant") {
  const key = `${seed}|${dark ? 1 : 0}|${variant}`;
  let out = cache.get(key);
  if (!out) {
    const Scheme = VARIANTS[variant] || SchemeVibrant;
    const scheme = new Scheme(Hct.fromInt(argbFromHex(seed)), dark, 0);
    out = ROLES.map((r) => hexFromArgb(MaterialDynamicColors[r].getArgb(scheme)).toUpperCase());
    cache.set(key, out);
  }
  return out;
}
globalThis.MTB_ENGINE = { roles, ROLES };
