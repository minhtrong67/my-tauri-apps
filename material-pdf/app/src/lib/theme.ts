import { argbFromHex, hexFromArgb, themeFromSourceColor } from "@material/material-color-utilities";

export type ThemeMode = "light" | "dark" | "system";

/** The Material Design color palette (500 swatches) offered as theme colors. */
export const PALETTE: { id: string; hex: string }[] = [
  { id: "red", hex: "#F44336" }, { id: "pink", hex: "#E91E63" }, { id: "purple", hex: "#9C27B0" },
  { id: "deepPurple", hex: "#673AB7" }, { id: "indigo", hex: "#3F51B5" }, { id: "blue", hex: "#2196F3" },
  { id: "lightBlue", hex: "#03A9F4" }, { id: "cyan", hex: "#00BCD4" }, { id: "teal", hex: "#009688" },
  { id: "green", hex: "#4CAF50" }, { id: "lightGreen", hex: "#8BC34A" }, { id: "lime", hex: "#CDDC39" },
  { id: "yellow", hex: "#FFEB3B" }, { id: "amber", hex: "#FFC107" }, { id: "orange", hex: "#FF9800" },
  { id: "deepOrange", hex: "#FF5722" }, { id: "brown", hex: "#795548" }, { id: "blueGrey", hex: "#607D8B" },
];
export const DEFAULT_SEED = "#F44336";

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
const mq = () => window.matchMedia("(prefers-color-scheme: dark)");

export const resolveDark = (mode: ThemeMode) => (mode === "system" ? mq().matches : mode === "dark");

export function applyScheme(seed: string, dark: boolean) {
  const theme = themeFromSourceColor(argbFromHex(seed));
  const scheme = (dark ? theme.schemes.dark : theme.schemes.light).toJSON() as Record<string, number>;
  const el = document.documentElement;
  for (const [k, v] of Object.entries(scheme)) el.style.setProperty("--md-" + kebab(k), hexFromArgb(v));
  const n = theme.palettes.neutral;
  const tones = dark ? [4, 10, 12, 17, 22] : [100, 96, 94, 92, 90];
  ["lowest", "low", "", "high", "highest"].forEach((name, i) =>
    el.style.setProperty(`--md-surface-container${name ? "-" + name : ""}`, hexFromArgb(n.tone(tones[i]))),
  );
  el.dataset.theme = dark ? "dark" : "light";
  el.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", hexFromArgb(scheme.surface));
}

export function watchSystemTheme(cb: () => void) {
  const m = mq();
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** Runs `change` inside a circular-reveal View Transition when supported. */
export function withThemeTransition(change: () => void, origin?: { x: number; y: number }, enabled = true) {
  const d = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!enabled || !d.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return change();
  const x = origin?.x ?? innerWidth - 40, y = origin?.y ?? 40;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const t = d.startViewTransition(change);
  t.ready.then(() =>
    document.documentElement.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 520, easing: "cubic-bezier(.2,0,0,1)", pseudoElement: "::view-transition-new(root)" },
    ),
  ).catch(() => {});
}
