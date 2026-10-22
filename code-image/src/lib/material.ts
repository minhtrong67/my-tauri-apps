import { argbFromHex, themeFromSourceColor } from "@material/material-color-utilities";

const rgb = (argb: number) => `${(argb >> 16) & 255} ${(argb >> 8) & 255} ${argb & 255}`;

/** Generate a Material 3 colour scheme from a seed and expose it as CSS variables. */
export function applyMaterial(seed: string, dark: boolean) {
  const theme = themeFromSourceColor(argbFromHex(seed));
  const s = dark ? theme.schemes.dark : theme.schemes.light;
  const n = theme.palettes.neutral;
  const tones = dark
    ? { dim: 6, low: 10, container: 12, high: 17, highest: 22 }
    : { dim: 87, low: 96, container: 94, high: 92, highest: 90 };
  const vars: Record<string, number> = {
    primary: s.primary, "on-primary": s.onPrimary,
    "primary-container": s.primaryContainer, "on-primary-container": s.onPrimaryContainer,
    secondary: s.secondary, "on-secondary": s.onSecondary,
    "secondary-container": s.secondaryContainer, "on-secondary-container": s.onSecondaryContainer,
    tertiary: s.tertiary, "tertiary-container": s.tertiaryContainer, "on-tertiary-container": s.onTertiaryContainer,
    error: s.error, "error-container": s.errorContainer, "on-error-container": s.onErrorContainer,
    surface: s.surface, "on-surface": s.onSurface, "on-surface-variant": s.onSurfaceVariant,
    outline: s.outline, "outline-variant": s.outlineVariant,
    "inverse-surface": s.inverseSurface, "inverse-on-surface": s.inverseOnSurface,
    "surface-dim": n.tone(tones.dim), "surface-low": n.tone(tones.low), "surface-container": n.tone(tones.container),
    "surface-high": n.tone(tones.high), "surface-highest": n.tone(tones.highest),
  };
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(`--md-${k}`, rgb(v));
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
