import {
  Blend,
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
  TonalPalette,
  type DynamicColor,
} from "@material/material-color-utilities";
import { toArgb, toHex } from "./color";
import { kebab } from "./utils";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export type VariantId =
  | "tonalSpot"
  | "vibrant"
  | "expressive"
  | "neutral"
  | "monochrome"
  | "fidelity"
  | "content"
  | "rainbow"
  | "fruitSalad";

type SchemeCtor = new (source: Hct, isDark: boolean, contrastLevel: number) => DynamicScheme;

const VARIANT_CTORS: Record<VariantId, SchemeCtor> = {
  tonalSpot: SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  rainbow: SchemeRainbow,
  fruitSalad: SchemeFruitSalad,
};

export const VARIANT_IDS = Object.keys(VARIANT_CTORS) as VariantId[];

export type CoreKey = "primary" | "secondary" | "tertiary" | "neutral" | "neutralVariant" | "error";
export const CORE_KEYS: CoreKey[] = ["primary", "secondary", "tertiary", "neutral", "neutralVariant", "error"];

export interface CustomColorDef {
  id: string;
  name: string;
  hex: string;
  /** Harmonize the color with the source color (like Material's "blend"). */
  blend: boolean;
}

export interface ThemeConfig {
  source: string;
  variant: VariantId;
  /** -1 (reduced) .. 0 (standard) .. 1 (high) */
  contrast: number;
  core: Partial<Record<CoreKey, string>>;
  custom: CustomColorDef[];
}

export const DEFAULT_CONFIG: ThemeConfig = {
  source: "#6750A4",
  variant: "tonalSpot",
  contrast: 0,
  core: {},
  custom: [],
};

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export const ROLE_KEYS = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "background",
  "onBackground",
  "surface",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "outline",
  "outlineVariant",
  "shadow",
  "scrim",
  "inverseSurface",
  "inverseOnSurface",
  "inversePrimary",
  "surfaceTint",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "primaryFixed",
  "primaryFixedDim",
  "onPrimaryFixed",
  "onPrimaryFixedVariant",
  "secondaryFixed",
  "secondaryFixedDim",
  "onSecondaryFixed",
  "onSecondaryFixedVariant",
  "tertiaryFixed",
  "tertiaryFixedDim",
  "onTertiaryFixed",
  "onTertiaryFixedVariant",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];
export type Roles = Record<RoleKey, string>;

export const ROLE_GROUPS: { id: string; roles: RoleKey[] }[] = [
  { id: "primary", roles: ["primary", "onPrimary", "primaryContainer", "onPrimaryContainer"] },
  { id: "secondary", roles: ["secondary", "onSecondary", "secondaryContainer", "onSecondaryContainer"] },
  { id: "tertiary", roles: ["tertiary", "onTertiary", "tertiaryContainer", "onTertiaryContainer"] },
  { id: "error", roles: ["error", "onError", "errorContainer", "onErrorContainer"] },
  {
    id: "surface",
    roles: [
      "surface",
      "surfaceDim",
      "surfaceBright",
      "surfaceContainerLowest",
      "surfaceContainerLow",
      "surfaceContainer",
      "surfaceContainerHigh",
      "surfaceContainerHighest",
      "onSurface",
      "onSurfaceVariant",
      "outline",
      "outlineVariant",
    ],
  },
  { id: "inverse", roles: ["inverseSurface", "inverseOnSurface", "inversePrimary"] },
  { id: "other", roles: ["background", "onBackground", "surfaceVariant", "surfaceTint", "shadow", "scrim"] },
  {
    id: "fixed",
    roles: [
      "primaryFixed",
      "primaryFixedDim",
      "onPrimaryFixed",
      "onPrimaryFixedVariant",
      "secondaryFixed",
      "secondaryFixedDim",
      "onSecondaryFixed",
      "onSecondaryFixedVariant",
      "tertiaryFixed",
      "tertiaryFixedDim",
      "onTertiaryFixed",
      "onTertiaryFixedVariant",
    ],
  },
];

/** Which role is drawn on top of which (used for tile labels). */
export const ON_ROLE: Partial<Record<RoleKey, RoleKey>> = {
  primary: "onPrimary",
  onPrimary: "primary",
  primaryContainer: "onPrimaryContainer",
  onPrimaryContainer: "primaryContainer",
  secondary: "onSecondary",
  onSecondary: "secondary",
  secondaryContainer: "onSecondaryContainer",
  onSecondaryContainer: "secondaryContainer",
  tertiary: "onTertiary",
  onTertiary: "tertiary",
  tertiaryContainer: "onTertiaryContainer",
  onTertiaryContainer: "tertiaryContainer",
  error: "onError",
  onError: "error",
  errorContainer: "onErrorContainer",
  onErrorContainer: "errorContainer",
  background: "onBackground",
  onBackground: "background",
  surface: "onSurface",
  surfaceDim: "onSurface",
  surfaceBright: "onSurface",
  surfaceContainerLowest: "onSurface",
  surfaceContainerLow: "onSurface",
  surfaceContainer: "onSurface",
  surfaceContainerHigh: "onSurface",
  surfaceContainerHighest: "onSurface",
  surfaceVariant: "onSurfaceVariant",
  onSurface: "surface",
  onSurfaceVariant: "surfaceVariant",
  inverseSurface: "inverseOnSurface",
  inverseOnSurface: "inverseSurface",
  inversePrimary: "inverseSurface",
  primaryFixed: "onPrimaryFixed",
  primaryFixedDim: "onPrimaryFixed",
  onPrimaryFixed: "primaryFixed",
  onPrimaryFixedVariant: "primaryFixed",
  secondaryFixed: "onSecondaryFixed",
  secondaryFixedDim: "onSecondaryFixed",
  onSecondaryFixed: "secondaryFixed",
  onSecondaryFixedVariant: "secondaryFixed",
  tertiaryFixed: "onTertiaryFixed",
  tertiaryFixedDim: "onTertiaryFixed",
  onTertiaryFixed: "tertiaryFixed",
  onTertiaryFixedVariant: "tertiaryFixed",
};

/** [foreground, background, minimum ratio] pairs for the accessibility checker. */
export const CONTRAST_PAIRS: [RoleKey, RoleKey, number][] = [
  ["onPrimary", "primary", 4.5],
  ["onPrimaryContainer", "primaryContainer", 4.5],
  ["onSecondary", "secondary", 4.5],
  ["onSecondaryContainer", "secondaryContainer", 4.5],
  ["onTertiary", "tertiary", 4.5],
  ["onTertiaryContainer", "tertiaryContainer", 4.5],
  ["onError", "error", 4.5],
  ["onErrorContainer", "errorContainer", 4.5],
  ["onSurface", "surface", 4.5],
  ["onSurfaceVariant", "surfaceVariant", 4.5],
  ["onSurface", "surfaceContainerHigh", 4.5],
  ["onBackground", "background", 4.5],
  ["inverseOnSurface", "inverseSurface", 4.5],
  ["inversePrimary", "inverseSurface", 3],
  ["primary", "surface", 3],
  ["outline", "surface", 3],
];

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

export type SchemeId =
  | "light"
  | "light-medium-contrast"
  | "light-high-contrast"
  | "dark"
  | "dark-medium-contrast"
  | "dark-high-contrast";

export const SCHEME_IDS: SchemeId[] = [
  "light",
  "light-medium-contrast",
  "light-high-contrast",
  "dark",
  "dark-medium-contrast",
  "dark-high-contrast",
];

const SCHEME_SPEC: Record<SchemeId, { dark: boolean; contrast: number }> = {
  light: { dark: false, contrast: 0 },
  "light-medium-contrast": { dark: false, contrast: 0.5 },
  "light-high-contrast": { dark: false, contrast: 1 },
  dark: { dark: true, contrast: 0 },
  "dark-medium-contrast": { dark: true, contrast: 0.5 },
  "dark-high-contrast": { dark: true, contrast: 1 },
};

export function buildScheme(cfg: ThemeConfig, isDark: boolean, contrast: number = cfg.contrast): DynamicScheme {
  const sourceArgb = toArgb(cfg.source);
  const Ctor = VARIANT_CTORS[cfg.variant];
  const base = new Ctor(Hct.fromInt(sourceArgb), isDark, contrast);
  const pick = (key: CoreKey, fallback: TonalPalette): TonalPalette => {
    const v = cfg.core[key];
    return v ? TonalPalette.fromInt(toArgb(v)) : fallback;
  };
  const scheme = new DynamicScheme({
    sourceColorArgb: sourceArgb,
    variant: base.variant,
    contrastLevel: contrast,
    isDark,
    primaryPalette: pick("primary", base.primaryPalette),
    secondaryPalette: pick("secondary", base.secondaryPalette),
    tertiaryPalette: pick("tertiary", base.tertiaryPalette),
    neutralPalette: pick("neutral", base.neutralPalette),
    neutralVariantPalette: pick("neutralVariant", base.neutralVariantPalette),
  });
  if (cfg.core.error) scheme.errorPalette = TonalPalette.fromInt(toArgb(cfg.core.error));
  return scheme;
}

const DYNAMIC = MaterialDynamicColors as unknown as Record<string, DynamicColor>;

export function rolesOf(scheme: DynamicScheme): Roles {
  const out = {} as Roles;
  for (const key of ROLE_KEYS) out[key] = toHex(DYNAMIC[key].getArgb(scheme));
  return out;
}

export interface CustomRoleSet {
  color: string;
  onColor: string;
  colorContainer: string;
  onColorContainer: string;
}

export interface CustomRoles {
  id: string;
  name: string;
  value: string;
  light: CustomRoleSet;
  dark: CustomRoleSet;
}

export const TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];

export interface PaletteInfo {
  id: string;
  name?: string;
  hue: number;
  chroma: number;
  tones: Record<number, string>;
}

export interface GeneratedTheme {
  light: Roles;
  dark: Roles;
  palettes: PaletteInfo[];
  custom: CustomRoles[];
}

function paletteInfo(id: string, p: TonalPalette, name?: string): PaletteInfo {
  const tones: Record<number, string> = {};
  for (const t of TONES) tones[t] = toHex(p.tone(t));
  return { id, name, hue: p.hue, chroma: p.chroma, tones };
}

function customRoles(def: CustomColorDef, source: string): CustomRoles {
  const base = toArgb(def.hex);
  const value = def.blend ? Blend.harmonize(base, toArgb(source)) : base;
  const p = TonalPalette.fromInt(value);
  const set = (c: number, on: number, cc: number, onc: number): CustomRoleSet => ({
    color: toHex(p.tone(c)),
    onColor: toHex(p.tone(on)),
    colorContainer: toHex(p.tone(cc)),
    onColorContainer: toHex(p.tone(onc)),
  });
  return {
    id: def.id,
    name: def.name,
    value: toHex(value),
    light: set(40, 100, 90, 10),
    dark: set(80, 20, 30, 90),
  };
}

export function generate(cfg: ThemeConfig): GeneratedTheme {
  const lightScheme = buildScheme(cfg, false);
  const darkScheme = buildScheme(cfg, true);
  const palettes: PaletteInfo[] = [
    paletteInfo("primary", lightScheme.primaryPalette),
    paletteInfo("secondary", lightScheme.secondaryPalette),
    paletteInfo("tertiary", lightScheme.tertiaryPalette),
    paletteInfo("neutral", lightScheme.neutralPalette),
    paletteInfo("neutralVariant", lightScheme.neutralVariantPalette),
    paletteInfo("error", lightScheme.errorPalette),
  ];
  const custom = cfg.custom.map((c) => customRoles(c, cfg.source));
  for (const c of cfg.custom) {
    const value = c.blend ? Blend.harmonize(toArgb(c.hex), toArgb(cfg.source)) : toArgb(c.hex);
    palettes.push(paletteInfo("custom:" + c.id, TonalPalette.fromInt(value), c.name));
  }
  return { light: rolesOf(lightScheme), dark: rolesOf(darkScheme), palettes, custom };
}

/** All six schemes (light/dark x standard/medium/high) used by exporters. */
export function generateAll(cfg: ThemeConfig): Record<SchemeId, Roles> {
  const out = {} as Record<SchemeId, Roles>;
  for (const id of SCHEME_IDS) {
    const spec = SCHEME_SPEC[id];
    out[id] = rolesOf(buildScheme(cfg, spec.dark, spec.contrast));
  }
  return out;
}

/** The three key colors (primary/secondary/tertiary) of every variant, for the style picker. */
export function variantPreview(source: string, variant: VariantId): [string, string, string] {
  const Ctor = VARIANT_CTORS[variant];
  const s = new Ctor(Hct.fromInt(toArgb(source)), false, 0);
  return [toHex(s.primaryPalette.tone(40)), toHex(s.secondaryPalette.tone(60)), toHex(s.tertiaryPalette.tone(60))];
}

/* ------------------------------------------------------------------ */
/* CSS helpers                                                         */
/* ------------------------------------------------------------------ */

export const cssVarName = (key: RoleKey): string => "--md-" + kebab(key);

export function themeVars(roles: Roles): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ROLE_KEYS) out[cssVarName(key)] = roles[key];
  return out;
}

export const THEME_TRANSITION = ROLE_KEYS.map((k) => `${cssVarName(k)} 320ms cubic-bezier(0.2, 0, 0, 1)`).join(", ");

/** Registers every role as a typed <color> property so theme changes can animate. */
export function registerThemeProps(): void {
  if (typeof CSS === "undefined" || !("registerProperty" in CSS)) return;
  for (const key of ROLE_KEYS) {
    try {
      CSS.registerProperty({ name: cssVarName(key), syntax: "<color>", inherits: true, initialValue: "#000000" });
    } catch {
      /* already registered */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Starter themes                                                      */
/* ------------------------------------------------------------------ */

export interface Starter {
  id: string;
  en: string;
  vi: string;
  seed: string;
  variant: VariantId;
}

export const STARTERS: Starter[] = [
  { id: "ocean", en: "Ocean", vi: "Đại dương", seed: "#0B6E99", variant: "tonalSpot" },
  { id: "forest", en: "Forest", vi: "Rừng xanh", seed: "#2E7D32", variant: "tonalSpot" },
  { id: "sunset", en: "Sunset", vi: "Hoàng hôn", seed: "#E4572E", variant: "vibrant" },
  { id: "lavender", en: "Lavender", vi: "Oải hương", seed: "#7E57C2", variant: "expressive" },
  { id: "sakura", en: "Sakura", vi: "Hoa anh đào", seed: "#D81B60", variant: "tonalSpot" },
  { id: "desert", en: "Desert", vi: "Sa mạc", seed: "#B26A00", variant: "fidelity" },
  { id: "midnight", en: "Midnight", vi: "Nửa đêm", seed: "#283593", variant: "neutral" },
  { id: "mono", en: "Graphite", vi: "Than chì", seed: "#607D8B", variant: "monochrome" },
  { id: "mint", en: "Mint", vi: "Bạc hà", seed: "#00A884", variant: "vibrant" },
  { id: "coffee", en: "Coffee", vi: "Cà phê", seed: "#6D4C41", variant: "content" },
];

export const QUICK_PICKS = [
  "#6750A4",
  "#0B57D0",
  "#006A6A",
  "#2E7D32",
  "#7C9A00",
  "#B26A00",
  "#C2410C",
  "#BA1A1A",
  "#D81B60",
  "#8E24AA",
  "#4E5B92",
  "#5F6368",
];
