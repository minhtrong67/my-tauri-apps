import { Hct, SchemeVibrant, MaterialDynamicColors, argbFromHex, hexFromArgb, DynamicColor } from "@material/material-color-utilities";
import type { FontSize, ThemeMode } from "./types";

/** Seed colours of the Material palette (the first one, indigo, is the default and the app icon colour). */
export const SEEDS: { id: string; hex: string; vi: string; en: string }[] = [
  { id: "indigo", hex: "#3F51B5", vi: "Chàm", en: "Indigo" },
  { id: "red", hex: "#F44336", vi: "Đỏ", en: "Red" },
  { id: "pink", hex: "#E91E63", vi: "Hồng", en: "Pink" },
  { id: "purple", hex: "#9C27B0", vi: "Tím", en: "Purple" },
  { id: "deep-purple", hex: "#673AB7", vi: "Tím đậm", en: "Deep purple" },
  { id: "blue", hex: "#2196F3", vi: "Xanh dương", en: "Blue" },
  { id: "light-blue", hex: "#03A9F4", vi: "Xanh da trời", en: "Light blue" },
  { id: "cyan", hex: "#00BCD4", vi: "Lục lam", en: "Cyan" },
  { id: "teal", hex: "#009688", vi: "Xanh mòng két", en: "Teal" },
  { id: "green", hex: "#4CAF50", vi: "Xanh lá", en: "Green" },
  { id: "lime", hex: "#CDDC39", vi: "Xanh chanh", en: "Lime" },
  { id: "amber", hex: "#FFC107", vi: "Hổ phách", en: "Amber" },
  { id: "orange", hex: "#FF9800", vi: "Cam", en: "Orange" },
  { id: "deep-orange", hex: "#FF5722", vi: "Cam đậm", en: "Deep orange" },
  { id: "brown", hex: "#795548", vi: "Nâu", en: "Brown" },
  { id: "blue-grey", hex: "#607D8B", vi: "Xám xanh", en: "Blue grey" },
];

const ROLES: [string, DynamicColor][] = [
  ["primary", MaterialDynamicColors.primary], ["on-primary", MaterialDynamicColors.onPrimary],
  ["primary-container", MaterialDynamicColors.primaryContainer], ["on-primary-container", MaterialDynamicColors.onPrimaryContainer],
  ["secondary", MaterialDynamicColors.secondary], ["on-secondary", MaterialDynamicColors.onSecondary],
  ["secondary-container", MaterialDynamicColors.secondaryContainer], ["on-secondary-container", MaterialDynamicColors.onSecondaryContainer],
  ["tertiary", MaterialDynamicColors.tertiary], ["on-tertiary", MaterialDynamicColors.onTertiary],
  ["tertiary-container", MaterialDynamicColors.tertiaryContainer], ["on-tertiary-container", MaterialDynamicColors.onTertiaryContainer],
  ["error", MaterialDynamicColors.error], ["on-error", MaterialDynamicColors.onError],
  ["error-container", MaterialDynamicColors.errorContainer], ["on-error-container", MaterialDynamicColors.onErrorContainer],
  ["surface", MaterialDynamicColors.surface], ["surface-dim", MaterialDynamicColors.surfaceDim], ["surface-bright", MaterialDynamicColors.surfaceBright],
  ["surface-lowest", MaterialDynamicColors.surfaceContainerLowest], ["surface-low", MaterialDynamicColors.surfaceContainerLow],
  ["surface-container", MaterialDynamicColors.surfaceContainer], ["surface-high", MaterialDynamicColors.surfaceContainerHigh],
  ["surface-highest", MaterialDynamicColors.surfaceContainerHighest],
  ["on-surface", MaterialDynamicColors.onSurface], ["on-surface-variant", MaterialDynamicColors.onSurfaceVariant],
  ["surface-variant", MaterialDynamicColors.surfaceVariant],
  ["outline", MaterialDynamicColors.outline], ["outline-variant", MaterialDynamicColors.outlineVariant],
  ["inverse-surface", MaterialDynamicColors.inverseSurface], ["inverse-on-surface", MaterialDynamicColors.inverseOnSurface],
  ["inverse-primary", MaterialDynamicColors.inversePrimary], ["scrim", MaterialDynamicColors.scrim], ["shadow", MaterialDynamicColors.shadow],
];

/** Fixed toast colours so info / success / warning / error stay recognisable on every theme colour. */
const SEMANTIC = {
  light: { info: ["#D6E3FF", "#001B3E"], success: ["#C6F1C9", "#00210B"], warning: ["#FFDEA6", "#2A1800"], error: ["#FFDAD6", "#410002"] },
  dark: { info: ["#1E3A6B", "#D6E3FF"], success: ["#1B4D2B", "#C6F1C9"], warning: ["#5A4000", "#FFDEA6"], error: ["#7A1B1B", "#FFDAD6"] },
};

export const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
export const isDarkMode = (m: ThemeMode) => (m === "system" ? prefersDark() : m === "dark");

export function applyTheme(mode: ThemeMode, seed: string, fontSize: FontSize, fontStack: string) {
  const dark = isDarkMode(mode);
  const scheme = new SchemeVibrant(Hct.fromInt(argbFromHex(seed)), dark, 0);
  const root = document.documentElement;
  for (const [name, role] of ROLES) root.style.setProperty(`--md-${name}`, hexFromArgb(role.getArgb(scheme)));
  const sem = SEMANTIC[dark ? "dark" : "light"];
  for (const [k, [bg, fg]] of Object.entries(sem)) {
    root.style.setProperty(`--md-${k}-bg`, bg);
    root.style.setProperty(`--md-${k}-fg`, fg);
  }
  root.style.colorScheme = dark ? "dark" : "light";
  root.classList.toggle("dark", dark);
  root.style.fontSize = { sm: "14px", md: "16px", lg: "18px" }[fontSize];
  root.style.setProperty("--app-font", fontStack);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", hexFromArgb(MaterialDynamicColors.surface.getArgb(scheme)));
}

export const FONTS: { id: string; label: string; stack: string }[] = [
  { id: "system", label: "System UI", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: "roboto", label: "Roboto", stack: 'Roboto, system-ui, "Segoe UI", sans-serif' },
  { id: "inter", label: "Inter", stack: 'Inter, system-ui, "Segoe UI", sans-serif' },
  { id: "open-sans", label: "Open Sans", stack: '"Open Sans", system-ui, "Segoe UI", sans-serif' },
  { id: "nunito", label: "Nunito", stack: 'Nunito, system-ui, "Segoe UI", sans-serif' },
  { id: "noto-sans", label: "Noto Sans", stack: '"Noto Sans", system-ui, "Segoe UI", sans-serif' },
  { id: "be-vietnam", label: "Be Vietnam Pro", stack: '"Be Vietnam Pro", system-ui, "Segoe UI", sans-serif' },
];
