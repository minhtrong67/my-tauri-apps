/* Microsoft Fluent 2 colour system (Windows 11 flavour).
 *
 * Fluent separates two things:
 *   1. neutrals  - fixed greys for the Mica backdrop, content layers, cards, flyouts and strokes;
 *   2. an accent - one brand colour that drives primary buttons, selection, focus underlines and links.
 *
 * The user picks the accent (a seed colour). From it we derive the brand ramp and make sure it keeps
 * WCAG AA contrast against the surface it sits on. Everything is written to CSS variables (--fl-*)
 * that index.css maps to Tailwind colours. */

export interface Preset {
  hex: string;
  key: string;
}

export const DEFAULT_SEED = "#0078D4";

/** Accent colours in the spirit of the Windows 11 accent palette. */
export const PRESETS: Preset[] = [
  { hex: "#0078D4", key: "color.blue" },
  { hex: "#5B5FC7", key: "color.violet" },
  { hex: "#8764B8", key: "color.purple" },
  { hex: "#038387", key: "color.teal" },
  { hex: "#107C10", key: "color.green" },
  { hex: "#C19C00", key: "color.amber" },
  { hex: "#CA5010", key: "color.orange" },
  { hex: "#C50F1F", key: "color.red" },
  { hex: "#C239B3", key: "color.pink" },
  { hex: "#69797E", key: "color.slate" },
];

/** Accent colours used by earlier (Material 3) versions, mapped to their Fluent counterparts. */
export const LEGACY_SEEDS: Record<string, string> = {
  "#0061ff": "#0078D4",
  "#6b4eff": "#5B5FC7",
  "#6750a4": "#8764B8",
  "#00897b": "#038387",
  "#2e7d32": "#107C10",
  "#b58900": "#C19C00",
  "#c25e00": "#CA5010",
  "#d32f2f": "#C50F1F",
  "#d81b60": "#C239B3",
  "#546e7a": "#69797E",
};

export function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
}

/* ------------------------------------------------------------------ colour maths */
type RGB = [number, number, number];

const parse = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

function toHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

const luminance = ([r, g, b]: RGB) => {
  const ch = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};

export function contrast(a: RGB, b: RGB) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Moves a colour's lightness in one direction until it reaches the wanted contrast against `bg`. */
function reachContrast(base: RGB, bg: RGB, min: number, dir: "darker" | "lighter"): RGB {
  const [h, s, l0] = toHsl(base);
  let l = l0;
  let c = base;
  for (let i = 0; i < 100 && contrast(c, bg) < min; i++) {
    l = dir === "darker" ? l - 0.01 : l + 0.01;
    if (l < 0 || l > 1) break;
    c = fromHsl(h, s, l);
  }
  return c;
}

const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [255, 255, 255];

/* --------------------------------------------------------------------- neutrals */
const LIGHT = {
  app: "#f3f3f3", // Mica backdrop (window background)
  layer: "#ffffff", // content layer: the editor and the active tab
  card: "#ffffff", // setting cards
  dialog: "#f9f9f9",
  flyout: "rgba(252, 252, 252, 0.88)", // acrylic: menus and dropdowns
  field: "#ffffff",
  fieldHover: "#f9f9f9",
  ctl: "#ffffff", // standard button / dropdown fill
  ctlHover: "#f6f6f6",
  ctlPressed: "#f0f0f0",
  subHover: "rgba(0, 0, 0, 0.045)", // "subtle" fills: transparent controls on hover / press / selected
  subPress: "rgba(0, 0, 0, 0.03)",
  subSelect: "rgba(0, 0, 0, 0.065)",
  fg: "#1a1a1a",
  fg2: "#5d5d5d",
  fg3: "#767676",
  fgDisabled: "#a6a6a6",
  stroke: "#e5e5e5", // surface / card outline
  strokeCtl: "#d1d1d1", // control outline
  strokeCtlBottom: "#bdbdbd",
  fieldBottom: "#8a8a8a", // text-field bottom edge (turns into the accent line on focus)
  divider: "#e0e0e0",
  scroll: "rgba(0, 0, 0, 0.42)",
  scrim: "rgba(0, 0, 0, 0.30)",
  find: "rgba(255, 196, 0, 0.45)",
  ok: "#0f7b0f", okBg: "#dff6dd",
  warn: "#9d5d00", warnBg: "#fff4ce",
  err: "#c42b1c", errBg: "#fde7e9",
  info: "#005fb8", infoBg: "#f6f6f6",
  danger: "#c42b1c", dangerHover: "#b02518", dangerPressed: "#9a2115",
  success: "#0f7b0f", successHover: "#0c690c", successPressed: "#0a580a",
  shadow: [
    "0 0 2px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14)",
    "0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14)",
    "0 0 2px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.14)",
    "0 0 2px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.14)",
    "0 0 8px rgba(0,0,0,0.12), 0 14px 28px rgba(0,0,0,0.14)",
    "0 0 8px rgba(0,0,0,0.12), 0 32px 64px rgba(0,0,0,0.14)",
  ],
};

const DARK: typeof LIGHT = {
  app: "#202020",
  layer: "#272727",
  card: "#333333",
  dialog: "#2b2b2b",
  flyout: "rgba(44, 44, 44, 0.88)",
  field: "#1f1f1f",
  fieldHover: "#262626",
  ctl: "#373737",
  ctlHover: "#3d3d3d",
  ctlPressed: "#323232",
  subHover: "rgba(255, 255, 255, 0.065)",
  subPress: "rgba(255, 255, 255, 0.04)",
  subSelect: "rgba(255, 255, 255, 0.09)",
  fg: "#ffffff",
  fg2: "#cfcfcf",
  fg3: "#9e9e9e",
  fgDisabled: "#5c5c5c",
  stroke: "#3d3d3d",
  strokeCtl: "#4a4a4a",
  strokeCtlBottom: "#4a4a4a",
  fieldBottom: "#9a9a9a",
  divider: "#3a3a3a",
  scroll: "rgba(255, 255, 255, 0.42)",
  scrim: "rgba(0, 0, 0, 0.50)",
  find: "rgba(255, 196, 0, 0.35)",
  ok: "#6ccb5f", okBg: "#393d1b",
  warn: "#fce100", warnBg: "#433519",
  err: "#ff99a4", errBg: "#442726",
  info: "#60cdff", infoBg: "#2f2f2f",
  danger: "#c42b1c", dangerHover: "#d23a2b", dangerPressed: "#b02518",
  success: "#107c10", successHover: "#138a13", successPressed: "#0e6a0e",
  shadow: [
    "0 0 2px rgba(0,0,0,0.24), 0 1px 2px rgba(0,0,0,0.28)",
    "0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28)",
    "0 0 2px rgba(0,0,0,0.24), 0 4px 8px rgba(0,0,0,0.28)",
    "0 0 2px rgba(0,0,0,0.24), 0 8px 16px rgba(0,0,0,0.28)",
    "0 0 8px rgba(0,0,0,0.20), 0 14px 28px rgba(0,0,0,0.24)",
    "0 0 8px rgba(0,0,0,0.20), 0 32px 64px rgba(0,0,0,0.24)",
  ],
};

/** Builds every --fl-* variable for an accent colour and a mode. */
export function buildScheme(seed: string, dark: boolean): Record<string, string> {
  const n = dark ? DARK : LIGHT;
  const base = parse(isHex(seed) ? seed : DEFAULT_SEED);
  const surface = parse(dark ? "#2b2b2b" : "#ffffff");

  // Accent: dark enough to read on white in light mode, light enough to glow on grey in dark mode.
  let primary: RGB;
  if (dark) {
    const [h, s, l] = toHsl(base);
    primary = reachContrast(fromHsl(h, Math.min(1, s), Math.max(l, 0.66)), surface, 4.6, "lighter");
  } else {
    primary = reachContrast(base, WHITE, 4.6, "darker");
  }
  const onPrimary = contrast(primary, WHITE) >= contrast(primary, BLACK) ? WHITE : BLACK;
  const hover = mix(primary, BLACK, 0.1);
  const pressed = mix(primary, BLACK, 0.2);
  const tint = dark ? mix(primary, parse("#202020"), 0.8) : mix(primary, WHITE, 0.9);
  const onTint = dark ? primary : reachContrast(mix(primary, BLACK, 0.25), tint, 7, "darker");

  const out: Record<string, string> = {
    "--fl-primary": toHex(primary),
    "--fl-primary-hover": toHex(hover),
    "--fl-primary-pressed": toHex(pressed),
    "--fl-on-primary": toHex(onPrimary),
    "--fl-primary-tint": toHex(tint),
    "--fl-on-primary-tint": toHex(onTint),
  };
  const map: Record<string, string> = {
    recess: n.app, app: n.app, layer: n.layer, card: n.card, dialog: n.dialog, flyout: n.flyout, field: n.field, "field-hover": n.fieldHover,
    ctl: n.ctl, "ctl-hover": n.ctlHover, "ctl-pressed": n.ctlPressed,
    "sub-hover": n.subHover, "sub-press": n.subPress, "sub-select": n.subSelect,
    fg: n.fg, fg2: n.fg2, fg3: n.fg3, "fg-disabled": n.fgDisabled,
    stroke: n.stroke, "stroke-ctl": n.strokeCtl, "stroke-ctl-bottom": n.strokeCtlBottom, "field-bottom": n.fieldBottom,
    divider: n.divider, scroll: n.scroll, scrim: n.scrim, find: n.find,
    ok: n.ok, "ok-bg": n.okBg, warn: n.warn, "warn-bg": n.warnBg, err: n.err, "err-bg": n.errBg, info: n.info, "info-bg": n.infoBg,
    danger: n.danger, "danger-hover": n.dangerHover, "danger-pressed": n.dangerPressed,
    success: n.success, "success-hover": n.successHover, "success-pressed": n.successPressed,
  };
  for (const k of Object.keys(map)) out["--fl-" + k] = map[k];
  [2, 4, 8, 16, 28, 64].forEach((px, i) => (out["--fl-shadow-" + px] = n.shadow[i]));
  return out;
}

/** With the native Mica backdrop the window background is transparent and Windows paints the material behind the page. */
let mica = false;
let solidApp = LIGHT.app;
export function setMica(on: boolean) {
  mica = on;
  const root = document.documentElement;
  if (on) root.dataset.mica = "";
  else delete root.dataset.mica;
  root.style.setProperty("--fl-app", on ? "transparent" : solidApp);
  root.style.background = "";
}

export function applyScheme(seed: string, dark: boolean) {
  const root = document.documentElement;
  const vars = buildScheme(seed, dark);
  solidApp = vars["--fl-app"];
  if (mica) vars["--fl-app"] = "transparent";
  for (const k of Object.keys(vars)) root.style.setProperty(k, vars[k]);
  root.dataset.scheme = dark ? "dark" : "light";
  if (!mica) root.style.background = "";
}

export const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
export const resolveDark = (mode: "light" | "dark" | "system") => (mode === "system" ? prefersDark() : mode === "dark");
