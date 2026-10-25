import { Hct, SchemeExpressive, MaterialDynamicColors as M, argbFromHex, redFromArgb, greenFromArgb, blueFromArgb, type DynamicColor } from "@material/material-color-utilities";

export type Mode = "auto" | "light" | "dark";

/** Bảng màu 500 của Material Design (màu chủ đề). */
export const PRESETS: [hex: string, key: string][] = [
  ["#F44336", "red"], ["#E91E63", "pink"], ["#9C27B0", "purple"], ["#673AB7", "deepPurple"],
  ["#3F51B5", "indigo"], ["#2196F3", "blue"], ["#00BCD4", "cyan"], ["#009688", "teal"],
  ["#4CAF50", "green"], ["#8BC34A", "lightGreen"], ["#CDDC39", "lime"], ["#FFC107", "amber"],
  ["#FF9800", "orange"], ["#FF5722", "deepOrange"], ["#795548", "brown"], ["#607D8B", "blueGrey"],
];
export const DEFAULT_SEED = "#4CAF50";

const TOKENS: [string, DynamicColor][] = [
  ["primary", M.primary], ["on-primary", M.onPrimary], ["primary-container", M.primaryContainer], ["on-primary-container", M.onPrimaryContainer],
  ["secondary", M.secondary], ["on-secondary", M.onSecondary], ["secondary-container", M.secondaryContainer], ["on-secondary-container", M.onSecondaryContainer],
  ["tertiary", M.tertiary], ["on-tertiary", M.onTertiary], ["tertiary-container", M.tertiaryContainer], ["on-tertiary-container", M.onTertiaryContainer],
  ["error", M.error], ["on-error", M.onError], ["error-container", M.errorContainer], ["on-error-container", M.onErrorContainer],
  ["surface", M.surface], ["on-surface", M.onSurface], ["on-surface-variant", M.onSurfaceVariant], ["outline", M.outline], ["outline-variant", M.outlineVariant],
  ["inverse-surface", M.inverseSurface], ["inverse-on-surface", M.inverseOnSurface], ["inverse-primary", M.inversePrimary],
  ["surface-dim", M.surfaceDim], ["surface-bright", M.surfaceBright],
  ["surface-lowest", M.surfaceContainerLowest], ["surface-low", M.surfaceContainerLow], ["surface-container", M.surfaceContainer],
  ["surface-high", M.surfaceContainerHigh], ["surface-highest", M.surfaceContainerHighest],
];

/** Màu ngữ nghĩa cho toast (không có trong bộ màu M3 nên khai báo riêng, có bản sáng/tối). */
const SEMANTIC = {
  light: { success: ["#1B6C2E", "#FFFFFF", "#B6F2BE", "#00210A"], warning: ["#8A5100", "#FFFFFF", "#FFDCBC", "#2C1600"], info: ["#00639B", "#FFFFFF", "#CBE6FF", "#001E31"] },
  dark: { success: ["#9BD5A3", "#003913", "#00531F", "#B6F2BE"], warning: ["#FFB870", "#4A2800", "#693C00", "#FFDCBC"], info: ["#95CCFF", "#003352", "#004A75", "#CBE6FF"] },
} as const;

const rgb = (argb: number) => `${redFromArgb(argb)} ${greenFromArgb(argb)} ${blueFromArgb(argb)}`;
const hexRgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`; };

export const prefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
export const isDark = (mode: Mode) => mode === "dark" || (mode === "auto" && prefersDark());

/** Gán toàn bộ biến màu Material 3 Expressive lên <html>. */
export function applyTheme(seed: string, mode: Mode) {
  const dark = isDark(mode);
  const scheme = new SchemeExpressive(Hct.fromInt(argbFromHex(seed)), dark, 0);
  const root = document.documentElement;
  for (const [name, color] of TOKENS) root.style.setProperty(`--c-${name}`, rgb(color.getArgb(scheme)));
  const sem = SEMANTIC[dark ? "dark" : "light"];
  for (const [k, v] of Object.entries(sem)) {
    root.style.setProperty(`--c-${k}`, hexRgb(v[0]));
    root.style.setProperty(`--c-on-${k}`, hexRgb(v[1]));
    root.style.setProperty(`--c-${k}-container`, hexRgb(v[2]));
    root.style.setProperty(`--c-on-${k}-container`, hexRgb(v[3]));
  }
  root.dataset.scheme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
}

/** Màu chữ/icon dễ đọc trên nền hex. */
export function onColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.179 ? "#1b1b1f" : "#ffffff";
}

export const FONTS = [
  { id: "system", name: "", stack: 'system-ui, -apple-system, "Segoe UI Variable Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif' },
  { id: "roboto", name: "Roboto", stack: '"Roboto", system-ui, "Segoe UI", Arial, sans-serif' },
  { id: "inter", name: "Inter", stack: '"Inter", system-ui, "Segoe UI", Arial, sans-serif' },
  { id: "bevietnam", name: "Be Vietnam Pro", stack: '"Be Vietnam Pro", system-ui, "Segoe UI", Arial, sans-serif' },
  { id: "nunito", name: "Nunito", stack: '"Nunito", system-ui, "Segoe UI", Arial, sans-serif' },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

export type FontSize = "small" | "medium" | "large";
export const FONT_SCALE: Record<FontSize, string> = { small: "87.5%", medium: "100%", large: "112.5%" };

export function applyTypography(font: FontId, size: FontSize) {
  const f = FONTS.find((x) => x.id === font) ?? FONTS[0];
  document.documentElement.style.setProperty("--font", f.stack);
  document.documentElement.style.fontSize = FONT_SCALE[size];
}

/** Đường viền "cookie" (scalloped) kiểu Expressive: r(θ) = R(1 + a·cos(nθ)). */
export function cookiePath(size = 100, lobes = 10, amp = 0.045, steps = 160) {
  const c = size / 2, R = size * 0.46 / (1 + amp);
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = R * (1 + amp * Math.cos(lobes * a));
    pts.push(`${i ? "L" : "M"}${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join("") + "Z";
}
