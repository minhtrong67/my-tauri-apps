import { useEffect, useState } from "react";

export type Mode = "auto" | "light" | "dark";

/** Bảng màu nhấn (accent) của Windows 11. Mặc định: Windows blue. */
export const PRESETS: [hex: string, key: string][] = [
  ["#0078D4", "blue"], ["#0063B1", "navy"], ["#0099BC", "cyan"], ["#038387", "teal"],
  ["#00B294", "mint"], ["#107C10", "green"], ["#FFB900", "gold"], ["#F7630C", "orange"],
  ["#DA3B01", "rust"], ["#E81123", "red"], ["#EA005E", "rose"], ["#B146C2", "orchid"],
  ["#744DA9", "iris"], ["#8E8CD8", "lavender"], ["#68768A", "steel"], ["#7A7574", "stone"],
];
export const DEFAULT_SEED = "#0078D4";

type RGB = [number, number, number];
const hexToRgb = (hex: string): RGB => { const n = parseInt(hex.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
const lum = ([r, g, b]: RGB) => { const c = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b); };
/** Chữ trắng nếu đủ tương phản (≥ 4:1), ngược lại chữ đen. */
const onRgb = (fill: RGB): RGB => (1.05 / (lum(fill) + 0.05) >= 4 ? [255, 255, 255] : [0, 0, 0]);

/** Màu nhấn theo quy tắc của Windows: sáng dùng "Dark 1", tối dùng "Light 2"; chữ nhấn dùng Dark 2 / Light 3. */
export function accentFor(seed: string, dark: boolean) {
  const [h, s, l] = rgbToHsl(hexToRgb(seed));
  const fill = hslToRgb(h, s, dark ? l + (1 - l) * 0.4 : l * 0.9);
  const text = hslToRgb(h, s, dark ? l + (1 - l) * 0.7 : l * 0.78);
  return { fill, text, on: onRgb(fill) };
}
export const onColor = (hex: string) => { const c = onRgb(hexToRgb(hex)); return c[0] === 255 ? "#ffffff" : "#000000"; };

export const prefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
export const isDark = (mode: Mode) => mode === "dark" || (mode === "auto" && prefersDark());

/** Theo dõi chủ đề hệ thống để chế độ "Hệ thống" tự đổi sáng/tối. */
export function useDark(mode: Mode) {
  const [sys, setSys] = useState(prefersDark);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const fn = () => setSys(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return mode === "dark" || (mode === "auto" && sys);
}

/** Gán màu nhấn + chủ đề sáng/tối lên <html>; phần màu trung tính nằm trong index.css. */
export function applyTheme(seed: string, dark: boolean) {
  const a = accentFor(seed, dark);
  const root = document.documentElement;
  root.style.setProperty("--acc", a.fill.join(" "));
  root.style.setProperty("--acc-text", a.text.join(" "));
  root.style.setProperty("--on-acc", a.on.join(" "));
  root.dataset.scheme = dark ? "dark" : "light";
}

/** Màn hình hẹp → thanh điều hướng tự thu gọn (giống NavigationView của WinUI). */
export function useNarrow(px: number) {
  const [n, setN] = useState(() => matchMedia(`(max-width: ${px}px)`).matches);
  useEffect(() => {
    const mq = matchMedia(`(max-width: ${px}px)`);
    const fn = () => setN(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [px]);
  return n;
}

export const FONTS = [
  { id: "system", name: "Segoe UI Variable", stack: '"Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif' },
  { id: "inter", name: "Inter", stack: '"Inter", "Segoe UI", system-ui, Arial, sans-serif' },
  { id: "bevietnam", name: "Be Vietnam Pro", stack: '"Be Vietnam Pro", "Segoe UI", system-ui, Arial, sans-serif' },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

export type FontSize = "small" | "medium" | "large";
export const FONT_SCALE: Record<FontSize, string> = { small: "87.5%", medium: "100%", large: "112.5%" };

export function applyTypography(font: FontId, size: FontSize) {
  const f = FONTS.find((x) => x.id === font) ?? FONTS[0];
  document.documentElement.style.setProperty("--font", f.stack);
  document.documentElement.style.fontSize = FONT_SCALE[size];
}
