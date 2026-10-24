import { Hct, SchemeTonalSpot, argbFromHex, hexFromArgb } from "@material/material-color-utilities";

export type ThemeMode = "system" | "light" | "dark";
export type FontSize = "sm" | "md" | "lg";

/** Default seed taken from the project's Material Theme Builder export. */
export const DEFAULT_SEED = "#769CDF";

export interface ThemeSwatch {
  id: string;
  name: { en: string; vi: string };
  hex: string;
}

/** Material Design color palette (500 tones) + the project's own blue. */
export const SWATCHES: ThemeSwatch[] = [
  { id: "blue", name: { en: "Cornflower", vi: "Xanh lam nhạt" }, hex: DEFAULT_SEED },
  { id: "red", name: { en: "Red", vi: "Đỏ" }, hex: "#F44336" },
  { id: "pink", name: { en: "Pink", vi: "Hồng" }, hex: "#E91E63" },
  { id: "purple", name: { en: "Purple", vi: "Tím" }, hex: "#9C27B0" },
  { id: "deep-purple", name: { en: "Deep purple", vi: "Tím đậm" }, hex: "#673AB7" },
  { id: "indigo", name: { en: "Indigo", vi: "Chàm" }, hex: "#3F51B5" },
  { id: "light-blue", name: { en: "Light blue", vi: "Xanh da trời" }, hex: "#03A9F4" },
  { id: "cyan", name: { en: "Cyan", vi: "Lơ" }, hex: "#00BCD4" },
  { id: "teal", name: { en: "Teal", vi: "Xanh mòng két" }, hex: "#009688" },
  { id: "green", name: { en: "Green", vi: "Xanh lá" }, hex: "#4CAF50" },
  { id: "light-green", name: { en: "Light green", vi: "Xanh lá nhạt" }, hex: "#8BC34A" },
  { id: "lime", name: { en: "Lime", vi: "Xanh chanh" }, hex: "#CDDC39" },
  { id: "amber", name: { en: "Amber", vi: "Hổ phách" }, hex: "#FFC107" },
  { id: "orange", name: { en: "Orange", vi: "Cam" }, hex: "#FF9800" },
  { id: "deep-orange", name: { en: "Deep orange", vi: "Cam đậm" }, hex: "#FF5722" },
  { id: "brown", name: { en: "Brown", vi: "Nâu" }, hex: "#795548" },
  { id: "blue-grey", name: { en: "Blue grey", vi: "Xám xanh" }, hex: "#607D8B" },
];

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

export type ThemeVars = Record<string, string>;

/** Build every `--md-*` CSS variable for a seed color (tonal spot scheme, like Material Theme Builder). */
export function buildVars(seed: string, dark: boolean): ThemeVars {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), dark, 0);
  const p = scheme.primaryPalette;
  const s = scheme.secondaryPalette;
  const t = scheme.tertiaryPalette;
  const e = scheme.errorPalette;
  const n = scheme.neutralPalette;
  const nv = scheme.neutralVariantPalette;
  const hex = (palette: { tone(t: number): number }, tone: number) => hexFromArgb(palette.tone(tone));

  const L = !dark;
  const map: Record<string, string> = {
    primary: hex(p, L ? 40 : 80),
    onPrimary: hex(p, L ? 100 : 20),
    primaryContainer: hex(p, L ? 90 : 30),
    onPrimaryContainer: hex(p, L ? 10 : 90),
    secondary: hex(s, L ? 40 : 80),
    onSecondary: hex(s, L ? 100 : 20),
    secondaryContainer: hex(s, L ? 90 : 30),
    onSecondaryContainer: hex(s, L ? 10 : 90),
    tertiary: hex(t, L ? 40 : 80),
    onTertiary: hex(t, L ? 100 : 20),
    tertiaryContainer: hex(t, L ? 90 : 30),
    onTertiaryContainer: hex(t, L ? 10 : 90),
    error: hex(e, L ? 40 : 80),
    onError: hex(e, L ? 100 : 20),
    errorContainer: hex(e, L ? 90 : 30),
    onErrorContainer: hex(e, L ? 10 : 90),
    background: hex(n, L ? 98 : 6),
    onBackground: hex(n, L ? 10 : 90),
    surface: hex(n, L ? 98 : 6),
    onSurface: hex(n, L ? 10 : 90),
    surfaceVariant: hex(nv, L ? 90 : 30),
    onSurfaceVariant: hex(nv, L ? 30 : 80),
    outline: hex(nv, L ? 50 : 60),
    outlineVariant: hex(nv, L ? 80 : 30),
    inverseSurface: hex(n, L ? 20 : 90),
    inverseOnSurface: hex(n, L ? 95 : 20),
    inversePrimary: hex(p, L ? 80 : 40),
    surfaceDim: hex(n, L ? 87 : 6),
    surfaceBright: hex(n, L ? 98 : 24),
    surfaceContainerLowest: hex(n, L ? 100 : 4),
    surfaceContainerLow: hex(n, L ? 96 : 10),
    surfaceContainer: hex(n, L ? 94 : 12),
    surfaceContainerHigh: hex(n, L ? 92 : 17),
    surfaceContainerHighest: hex(n, L ? 90 : 22),
  };
  const vars: ThemeVars = {};
  for (const [k, v] of Object.entries(map)) vars[`--md-${kebab(k)}`] = v;
  return vars;
}

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const FONT_PX: Record<FontSize, number> = { sm: 14, md: 16, lg: 18 };

export function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = `${FONT_PX[size]}px`;
}

export function applyTheme(mode: ThemeMode, seed: string) {
  const dark = resolveDark(mode);
  const vars = buildVars(seed, dark);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", vars["--md-surface"]);
  try {
    localStorage.setItem("mvd.vars", JSON.stringify({ dark, vars }));
  } catch {
    /* storage may be unavailable */
  }
}

/**
 * Apply a theme change with a circular reveal when the browser supports
 * View Transitions (and the user has not asked for reduced motion).
 */
export function applyThemeAnimated(mode: ThemeMode, seed: string, origin?: { x: number; y: number }) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (reduce || !doc.startViewTransition || !origin) {
    applyTheme(mode, seed);
    return;
  }
  const x = origin.x;
  const y = origin.y;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = doc.startViewTransition(() => applyTheme(mode, seed));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(.2,0,0,1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => undefined);
}

export function hueOf(seed: string): number {
  return Hct.fromInt(argbFromHex(seed)).hue;
}
