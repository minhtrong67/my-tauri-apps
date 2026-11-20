import { Effect, getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "./tauri";
import type { FontSize, Material, ThemeMode } from "./types";

/** Windows accent colours (the same palette Windows 11 offers). The first one is the default. */
export const ACCENTS: { id: string; hex: string; vi: string; en: string }[] = [
  { id: "blue", hex: "#0078D4", vi: "Xanh dương", en: "Blue" },
  { id: "cobalt", hex: "#0063B1", vi: "Xanh cô-ban", en: "Cobalt" },
  { id: "sky", hex: "#0099BC", vi: "Xanh da trời", en: "Sky" },
  { id: "cyan", hex: "#00B7C3", vi: "Lục lam", en: "Cyan" },
  { id: "teal", hex: "#038387", vi: "Xanh mòng két", en: "Teal" },
  { id: "green", hex: "#10893E", vi: "Xanh lá", en: "Green" },
  { id: "iris", hex: "#6B69D6", vi: "Tím xanh", en: "Iris" },
  { id: "violet", hex: "#8764B8", vi: "Tím", en: "Violet" },
  { id: "orchid", hex: "#B146C2", vi: "Phong lan", en: "Orchid" },
  { id: "rose", hex: "#E3008C", vi: "Hồng", en: "Rose" },
  { id: "red", hex: "#D13438", vi: "Đỏ", en: "Red" },
  { id: "rust", hex: "#DA3B01", vi: "Đỏ gạch", en: "Rust" },
  { id: "orange", hex: "#F7630C", vi: "Cam", en: "Orange" },
  { id: "gold", hex: "#FF8C00", vi: "Vàng đậm", en: "Gold" },
  { id: "steel", hex: "#68768A", vi: "Xám thép", en: "Steel" },
];

export const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
export const isDarkMode = (m: ThemeMode) => (m === "system" ? prefersDark() : m === "dark");

/* ---------- colour maths (HSL) ---------- */
function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function hsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const x = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${x(f(0))}${x(f(8))}${x(f(4))}`;
}
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/** Text colour that stays readable on top of an accent fill. */
const onAccent = (fill: string) => (1.05 / (lum(fill) + 0.05) >= 4.4 ? "#ffffff" : "#000000");

/** Fluent derives its accent shades from the base colour: darker fills in light mode, lighter fills in dark mode. */
export function accentShades(hex: string, dark: boolean) {
  const [h, s, l] = hexToHsl(hex);
  const base = dark ? Math.min(Math.max(l, 0.38), 0.44) : Math.min(l, 0.4);
  const step = dark ? [0.045, -0.04] : [-0.05, 0.06];
  const fill = hsl(h, s, base);
  const hover = hsl(h, s, Math.min(0.92, Math.max(0.1, base + step[0])));
  const press = hsl(h, s, Math.min(0.92, Math.max(0.1, base + step[0] * 2 + (dark ? -0.02 : 0))));
  const text = hsl(h, s, dark ? Math.max(l, 0.72) : Math.min(l, 0.3));
  return { fill, hover, press, text, on: onAccent(fill) };
}

/* ---------- window material (Mica / Acrylic) ---------- */
let materialRun = 0;
let markReady: () => void = () => {};
/** Resolves once the first window material is in place, so the window is not shown before its backdrop exists. */
export const themeReady = new Promise<void>((res) => { markReady = res; });
/**
 * Applies the window backdrop. Returns false when this Windows version cannot draw it (Mica needs Windows 11),
 * in which case the interface falls back to solid colours.
 */
export async function applyMaterial(mode: ThemeMode, material: Material, dark: boolean): Promise<boolean> {
  const root = document.documentElement;
  const run = ++materialRun;
  const finish = (effective: Material, ok: boolean) => { if (run === materialRun) root.dataset.material = effective; markReady(); return ok; };
  if (!isTauri || material === "none") {
    if (isTauri) { try { await getCurrentWindow().clearEffects(); } catch { /* ignore */ } }
    return finish("none", true);
  }
  const win = getCurrentWindow();
  try {
    // Mica / Mica Alt follow the window theme, so keep the window theme equal to the app theme.
    await win.setTheme(mode === "system" ? null : dark ? "dark" : "light");
    const tint: [number, number, number, number] = dark ? [32, 32, 32, 70] : [243, 243, 243, 70];
    if (material === "mica") await win.setEffects({ effects: [Effect.Mica] });
    else if (material === "mica-alt") await win.setEffects({ effects: [dark ? Effect.TabbedDark : Effect.TabbedLight] });
    else await win.setEffects({ effects: [Effect.Acrylic], color: tint }); // acrylic, acrylic-alt, frosted and liquid all sit on the system Acrylic
    return finish(material, true);
  } catch {
    try { await win.clearEffects(); } catch { /* ignore */ }
    return finish("none", false);
  }
}

export function applyTheme(mode: ThemeMode, accent: string, fontSize: FontSize, fontStack: string) {
  const dark = isDarkMode(mode);
  const root = document.documentElement;
  const a = accentShades(accent, dark);
  root.style.setProperty("--c-accent", a.fill);
  root.style.setProperty("--c-accent-hover", a.hover);
  root.style.setProperty("--c-accent-press", a.press);
  root.style.setProperty("--c-accent-text", a.text);
  root.style.setProperty("--c-on-accent", a.on);
  root.style.colorScheme = dark ? "dark" : "light";
  root.classList.toggle("dark", dark);
  root.style.fontSize = { sm: "14px", md: "16px", lg: "18px" }[fontSize];
  root.style.setProperty("--app-font", fontStack);
  return dark;
}

/** The first entry is the default and follows the operating system's own UI font. */
export const FONTS: { id: string; label: string; stack: string }[] = [
  { id: "system", label: "System UI", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: "segoe", label: "Segoe UI Variable", stack: '"Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif' },
  { id: "roboto", label: "Roboto", stack: 'Roboto, system-ui, "Segoe UI", sans-serif' },
  { id: "inter", label: "Inter", stack: 'Inter, system-ui, "Segoe UI", sans-serif' },
  { id: "open-sans", label: "Open Sans", stack: '"Open Sans", system-ui, "Segoe UI", sans-serif' },
  { id: "nunito", label: "Nunito", stack: 'Nunito, system-ui, "Segoe UI", sans-serif' },
  { id: "noto-sans", label: "Noto Sans", stack: '"Noto Sans", system-ui, "Segoe UI", sans-serif' },
  { id: "be-vietnam", label: "Be Vietnam Pro", stack: '"Be Vietnam Pro", system-ui, "Segoe UI", sans-serif' },
];
