/* Material 3 Expressive colour system.
 * A seed colour is turned into the official M3 vibrant dynamic scheme (hue stays true to the chosen colour)
 * (@material/material-color-utilities) and written to CSS variables (--md-*). */
import {
  Hct,
  MaterialDynamicColors,
  SchemeVibrant,
  argbFromHex,
  hexFromArgb,
  type DynamicColor,
} from "@material/material-color-utilities";

export interface Preset {
  hex: string;
  key: string;
}

export const DEFAULT_SEED = "#0061FF";

export const PRESETS: Preset[] = [
  { hex: "#0061FF", key: "color.blue" },
  { hex: "#6B4EFF", key: "color.violet" },
  { hex: "#6750A4", key: "color.purple" },
  { hex: "#00897B", key: "color.teal" },
  { hex: "#2E7D32", key: "color.green" },
  { hex: "#B58900", key: "color.amber" },
  { hex: "#C25E00", key: "color.orange" },
  { hex: "#D32F2F", key: "color.red" },
  { hex: "#D81B60", key: "color.pink" },
  { hex: "#546E7A", key: "color.slate" },
];

const ROLES = [
  "primary", "onPrimary", "primaryContainer", "onPrimaryContainer",
  "secondary", "onSecondary", "secondaryContainer", "onSecondaryContainer",
  "tertiary", "onTertiary", "tertiaryContainer", "onTertiaryContainer",
  "error", "onError", "errorContainer", "onErrorContainer",
  "background", "onBackground", "surface", "onSurface", "surfaceVariant", "onSurfaceVariant",
  "surfaceDim", "surfaceBright", "surfaceContainerLowest", "surfaceContainerLow",
  "surfaceContainer", "surfaceContainerHigh", "surfaceContainerHighest",
  "outline", "outlineVariant", "inverseSurface", "inverseOnSurface", "inversePrimary",
  "scrim", "shadow", "surfaceTint",
] as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

export function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
}

export function buildScheme(seed: string, dark: boolean): Record<string, string> {
  const scheme = new SchemeVibrant(Hct.fromInt(argbFromHex(isHex(seed) ? seed : DEFAULT_SEED)), dark, 0);
  const out: Record<string, string> = {};
  for (const role of ROLES) {
    const dc = (MaterialDynamicColors as unknown as Record<string, DynamicColor>)[role];
    out["--md-" + kebab(role)] = hexFromArgb(dc.getArgb(scheme));
  }
  return out;
}

export function applyScheme(seed: string, dark: boolean) {
  const root = document.documentElement;
  const vars = buildScheme(seed, dark);
  for (const k of Object.keys(vars)) root.style.setProperty(k, vars[k]);
  root.dataset.scheme = dark ? "dark" : "light";
  root.style.background = "";
}

export const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
export const resolveDark = (mode: "light" | "dark" | "system") => (mode === "system" ? prefersDark() : mode === "dark");
