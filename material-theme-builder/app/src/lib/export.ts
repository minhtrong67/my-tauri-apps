import { CORE_KEYS, ROLE_KEYS, SCHEME_IDS, TONES, VARIANT_IDS, type GeneratedTheme, type RoleKey, type Roles, type SchemeId, type ThemeConfig } from "./theme";
import { kebab, slug } from "./utils";

export type ExportFormat = "css" | "scss" | "tailwind" | "json" | "compose" | "kmp" | "flutter" | "swiftui" | "android" | "figma" | "project";

export const EXPORT_FORMATS: { id: ExportFormat; label: string; file: string; ext: string }[] = [
  { id: "css", label: "CSS", file: "material-theme.css", ext: "css" },
  { id: "tailwind", label: "Tailwind", file: "material-theme.tailwind.css", ext: "css" },
  { id: "scss", label: "SCSS", file: "_material-theme.scss", ext: "scss" },
  { id: "json", label: "JSON", file: "material-theme.json", ext: "json" },
  { id: "compose", label: "Compose", file: "MaterialTheme.kt", ext: "kt" },
  { id: "kmp", label: "Compose Multiplatform", file: "AppTheme.kt", ext: "kt" },
  { id: "flutter", label: "Flutter", file: "material_theme.dart", ext: "dart" },
  { id: "swiftui", label: "SwiftUI", file: "MaterialTheme.swift", ext: "swift" },
  { id: "android", label: "Android XML", file: "colors.xml", ext: "xml" },
  { id: "figma", label: "Figma / Design Tokens", file: "material-theme.tokens.json", ext: "json" },
  { id: "project", label: "Project", file: "my-theme.mtb.json", ext: "json" },
];

export interface ExportInput {
  config: ThemeConfig;
  theme: GeneratedTheme;
  schemes: Record<SchemeId, Roles>;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const camelScheme = (id: SchemeId) =>
  id
    .split("-")
    .map((p, i) => (i === 0 ? p : cap(p)))
    .join("");
const pascalScheme = (id: SchemeId) =>
  id
    .split("-")
    .map(cap)
    .join("");

const header = (cfg: ThemeConfig) => `Material Theme Builder - seed ${cfg.source} - ${cfg.variant}`;

/* ---------------------------------- CSS ---------------------------------- */

function cssBlock(selector: string, roles: Roles, indent = ""): string {
  const lines = ROLE_KEYS.map((k) => `${indent}  --md-sys-color-${kebab(k)}: ${roles[k]};`);
  return `${indent}${selector} {\n${lines.join("\n")}\n${indent}}`;
}

function customCss(theme: GeneratedTheme, mode: "light" | "dark", selector: string, indent = ""): string {
  if (!theme.custom.length) return "";
  const lines: string[] = [];
  for (const c of theme.custom) {
    const n = slug(c.name);
    const s = c[mode];
    lines.push(`${indent}  --md-ext-color-${n}-color: ${s.color};`);
    lines.push(`${indent}  --md-ext-color-${n}-on-color: ${s.onColor};`);
    lines.push(`${indent}  --md-ext-color-${n}-color-container: ${s.colorContainer};`);
    lines.push(`${indent}  --md-ext-color-${n}-on-color-container: ${s.onColorContainer};`);
  }
  return `${indent}${selector} {\n${lines.join("\n")}\n${indent}}`;
}

function buildCss(i: ExportInput): string {
  const { schemes, theme } = i;
  const parts: string[] = [`/* ${header(i.config)} */`, ""];
  parts.push(cssBlock(":root", schemes.light));
  const extLight = customCss(theme, "light", ":root");
  if (extLight) parts.push("", extLight);
  parts.push("", "@media (prefers-color-scheme: dark) {", cssBlock(":root", schemes.dark, "  "));
  const extDark = customCss(theme, "dark", ":root", "  ");
  if (extDark) parts.push("", extDark);
  parts.push("}", "");
  for (const id of SCHEME_IDS) {
    parts.push(cssBlock(`.${id}`, schemes[id]), "");
  }
  return parts.join("\n").trimEnd() + "\n";
}

function buildTailwind(i: ExportInput): string {
  const roles = ROLE_KEYS.map((k) => `  --color-${kebab(k)}: var(--md-sys-color-${kebab(k)});`);
  const custom: string[] = [];
  for (const c of i.theme.custom) {
    const n = slug(c.name);
    custom.push(`  --color-${n}: var(--md-ext-color-${n}-color);`);
    custom.push(`  --color-on-${n}: var(--md-ext-color-${n}-on-color);`);
    custom.push(`  --color-${n}-container: var(--md-ext-color-${n}-color-container);`);
    custom.push(`  --color-on-${n}-container: var(--md-ext-color-${n}-on-color-container);`);
  }
  return [
    `/* ${header(i.config)} - Tailwind CSS v4 */`,
    `@import "tailwindcss";`,
    "",
    buildCss(i).replace(/^\/\*.*\*\/\n\n/, ""),
    "@theme inline {",
    ...roles,
    ...custom,
    "}",
    "",
    "/* Usage: <button class=\"bg-primary text-on-primary\"> */",
    "",
  ].join("\n");
}

/* ---------------------------------- SCSS --------------------------------- */

function buildScss(i: ExportInput): string {
  const lines: string[] = [`// ${header(i.config)}`, ""];
  for (const id of SCHEME_IDS) {
    for (const k of ROLE_KEYS) lines.push(`$md-${id}-${kebab(k)}: ${i.schemes[id][k]};`);
    lines.push("");
  }
  for (const mode of ["light", "dark"] as const) {
    lines.push(`$md-${mode}-scheme: (`);
    ROLE_KEYS.forEach((k, idx) => lines.push(`  "${kebab(k)}": $md-${mode}-${kebab(k)}${idx < ROLE_KEYS.length - 1 ? "," : ""}`));
    lines.push(");", "");
  }
  for (const c of i.theme.custom) {
    const n = slug(c.name);
    for (const mode of ["light", "dark"] as const) {
      lines.push(`$md-ext-${n}-${mode}-color: ${c[mode].color};`);
      lines.push(`$md-ext-${n}-${mode}-on-color: ${c[mode].onColor};`);
      lines.push(`$md-ext-${n}-${mode}-color-container: ${c[mode].colorContainer};`);
      lines.push(`$md-ext-${n}-${mode}-on-color-container: ${c[mode].onColorContainer};`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

/* ---------------------------------- JSON --------------------------------- */

function buildJson(i: ExportInput): string {
  const palettes: Record<string, Record<string, string>> = {};
  for (const p of i.theme.palettes) {
    const key = p.id.startsWith("custom:") ? slug(p.name ?? p.id) : p.id;
    const tones: Record<string, string> = {};
    for (const t of TONES) tones[String(t)] = p.tones[t];
    palettes[key] = tones;
  }
  const out = {
    description: header(i.config),
    seed: i.config.source,
    variant: i.config.variant,
    contrast: i.config.contrast,
    coreColors: { primary: i.config.source, ...i.config.core },
    extendedColors: i.theme.custom.map((c) => ({
      name: c.name,
      color: i.config.custom.find((x) => x.id === c.id)?.hex ?? c.value,
      harmonized: i.config.custom.find((x) => x.id === c.id)?.blend ?? false,
      value: c.value,
      light: c.light,
      dark: c.dark,
    })),
    schemes: i.schemes,
    palettes,
  };
  return JSON.stringify(out, null, 2) + "\n";
}

function buildProject(i: ExportInput): string {
  return (
    JSON.stringify(
      { app: "material-theme-builder", version: 1, variants: VARIANT_IDS.length, config: i.config },
      null,
      2,
    ) + "\n"
  );
}

/* --------------------------------- Compose ------------------------------- */

const COMPOSE_ROLES: RoleKey[] = [
  "primary", "onPrimary", "primaryContainer", "onPrimaryContainer", "secondary", "onSecondary",
  "secondaryContainer", "onSecondaryContainer", "tertiary", "onTertiary", "tertiaryContainer",
  "onTertiaryContainer", "error", "onError", "errorContainer", "onErrorContainer", "background",
  "onBackground", "surface", "onSurface", "surfaceVariant", "onSurfaceVariant", "outline",
  "outlineVariant", "scrim", "inverseSurface", "inverseOnSurface", "inversePrimary", "surfaceDim",
  "surfaceBright", "surfaceContainerLowest", "surfaceContainerLow", "surfaceContainer",
  "surfaceContainerHigh", "surfaceContainerHighest", "surfaceTint",
];

const composeHex = (hex: string) => "0xFF" + hex.slice(1).toUpperCase();

function buildCompose(i: ExportInput): string {
  const out: string[] = [
    `// ${header(i.config)}`,
    "package com.example.ui.theme",
    "",
    "import androidx.compose.material3.darkColorScheme",
    "import androidx.compose.material3.lightColorScheme",
    "import androidx.compose.ui.graphics.Color",
    "",
  ];
  for (const id of SCHEME_IDS) {
    const suffix = pascalScheme(id);
    for (const k of COMPOSE_ROLES) out.push(`val ${k}${suffix} = Color(${composeHex(i.schemes[id][k])})`);
    out.push("");
  }
  for (const id of SCHEME_IDS) {
    const suffix = pascalScheme(id);
    const fn = id.startsWith("dark") ? "darkColorScheme" : "lightColorScheme";
    out.push(`val ${camelScheme(id)}ColorScheme = ${fn}(`);
    COMPOSE_ROLES.forEach((k, idx) => out.push(`    ${k} = ${k}${suffix}${idx < COMPOSE_ROLES.length - 1 ? "," : ""}`));
    out.push(")", "");
  }
  return out.join("\n").trimEnd() + "\n";
}

/* --------------------------------- Flutter ------------------------------- */

const FLUTTER_ROLES: [string, RoleKey][] = [
  ["primary", "primary"], ["onPrimary", "onPrimary"], ["primaryContainer", "primaryContainer"],
  ["onPrimaryContainer", "onPrimaryContainer"], ["secondary", "secondary"], ["onSecondary", "onSecondary"],
  ["secondaryContainer", "secondaryContainer"], ["onSecondaryContainer", "onSecondaryContainer"],
  ["tertiary", "tertiary"], ["onTertiary", "onTertiary"], ["tertiaryContainer", "tertiaryContainer"],
  ["onTertiaryContainer", "onTertiaryContainer"], ["error", "error"], ["onError", "onError"],
  ["errorContainer", "errorContainer"], ["onErrorContainer", "onErrorContainer"], ["surface", "surface"],
  ["onSurface", "onSurface"], ["onSurfaceVariant", "onSurfaceVariant"], ["outline", "outline"],
  ["outlineVariant", "outlineVariant"], ["shadow", "shadow"], ["scrim", "scrim"],
  ["inverseSurface", "inverseSurface"], ["onInverseSurface", "inverseOnSurface"],
  ["inversePrimary", "inversePrimary"], ["primaryFixed", "primaryFixed"],
  ["onPrimaryFixed", "onPrimaryFixed"], ["primaryFixedDim", "primaryFixedDim"],
  ["onPrimaryFixedVariant", "onPrimaryFixedVariant"], ["secondaryFixed", "secondaryFixed"],
  ["onSecondaryFixed", "onSecondaryFixed"], ["secondaryFixedDim", "secondaryFixedDim"],
  ["onSecondaryFixedVariant", "onSecondaryFixedVariant"], ["tertiaryFixed", "tertiaryFixed"],
  ["onTertiaryFixed", "onTertiaryFixed"], ["tertiaryFixedDim", "tertiaryFixedDim"],
  ["onTertiaryFixedVariant", "onTertiaryFixedVariant"], ["surfaceDim", "surfaceDim"],
  ["surfaceBright", "surfaceBright"], ["surfaceContainerLowest", "surfaceContainerLowest"],
  ["surfaceContainerLow", "surfaceContainerLow"], ["surfaceContainer", "surfaceContainer"],
  ["surfaceContainerHigh", "surfaceContainerHigh"], ["surfaceContainerHighest", "surfaceContainerHighest"],
];

function buildFlutter(i: ExportInput): string {
  const out: string[] = [
    `// ${header(i.config)}`,
    `import "package:flutter/material.dart";`,
    "",
    "class MaterialTheme {",
  ];
  for (const id of SCHEME_IDS) {
    const bright = id.startsWith("dark") ? "dark" : "light";
    out.push(`  static const ColorScheme ${camelScheme(id)}Scheme = ColorScheme(`);
    out.push(`    brightness: Brightness.${bright},`);
    for (const [name, role] of FLUTTER_ROLES) out.push(`    ${name}: Color(0xff${i.schemes[id][role].slice(1).toLowerCase()}),`);
    out.push("  );", "");
  }
  out.push(
    "  static ThemeData theme(ColorScheme colorScheme) => ThemeData(",
    "        useMaterial3: true,",
    "        brightness: colorScheme.brightness,",
    "        colorScheme: colorScheme,",
    "        scaffoldBackgroundColor: colorScheme.surface,",
    "        canvasColor: colorScheme.surface,",
    "      );",
    "}",
    "",
  );
  return out.join("\n");
}

/* ---------------------------- Compose Multiplatform ---------------------- */

function buildKmp(i: ExportInput): string {
  const base = buildCompose(i).trimEnd();
  return (
    base.replace(
      "import androidx.compose.material3.darkColorScheme",
      "import androidx.compose.foundation.isSystemInDarkTheme\nimport androidx.compose.material3.MaterialTheme\nimport androidx.compose.material3.darkColorScheme",
    )
      .replace("import androidx.compose.ui.graphics.Color", "import androidx.compose.runtime.Composable\nimport androidx.compose.ui.graphics.Color") +
    [
      "",
      "",
      "/** Wrap your app (commonMain) in AppTheme. Pass highContrast for the high contrast schemes. */",
      "@Composable",
      "fun AppTheme(",
      "    darkTheme: Boolean = isSystemInDarkTheme(),",
      "    highContrast: Boolean = false,",
      "    content: @Composable () -> Unit,",
      ") {",
      "    val colorScheme = when {",
      "        darkTheme && highContrast -> darkHighContrastColorScheme",
      "        darkTheme -> darkColorScheme",
      "        highContrast -> lightHighContrastColorScheme",
      "        else -> lightColorScheme",
      "    }",
      "    MaterialTheme(colorScheme = colorScheme, content = content)",
      "}",
      "",
    ].join("\n")
  );
}

/* --------------------------------- SwiftUI ------------------------------- */

const swiftHex = (hex: string) => "0x" + hex.slice(1).toUpperCase();

function buildSwiftUI(i: ExportInput): string {
  const out: string[] = [
    `// ${header(i.config)}`,
    "import SwiftUI",
    "",
    "extension Color {",
    "    init(hex: UInt32) {",
    "        self.init(",
    "            .sRGB,",
    "            red: Double((hex >> 16) & 0xFF) / 255,",
    "            green: Double((hex >> 8) & 0xFF) / 255,",
    "            blue: Double(hex & 0xFF) / 255,",
    "            opacity: 1",
    "        )",
    "    }",
    "}",
    "",
    "struct MaterialScheme {",
    ...COMPOSE_ROLES.map((k) => `    let ${k}: Color`),
    "}",
    "",
    "enum MaterialTheme {",
  ];
  for (const id of SCHEME_IDS) {
    out.push(`    static let ${camelScheme(id)} = MaterialScheme(`);
    COMPOSE_ROLES.forEach((k, idx) => out.push(`        ${k}: Color(hex: ${swiftHex(i.schemes[id][k])})${idx < COMPOSE_ROLES.length - 1 ? "," : ""}`));
    out.push("    )", "");
  }
  out.pop();
  out.push(
    "",
    "    /// Pick the scheme for the current appearance.",
    "    static func scheme(_ colorScheme: ColorScheme, highContrast: Bool = false) -> MaterialScheme {",
    "        switch (colorScheme, highContrast) {",
    "        case (.dark, true): return darkHighContrast",
    "        case (.dark, false): return dark",
    "        case (_, true): return lightHighContrast",
    "        default: return light",
    "        }",
    "    }",
    "}",
    "",
  );
  return out.join("\n");
}

/* ------------------------------ Figma / tokens --------------------------- */

/** W3C Design Tokens (DTCG) with one group per mode. Imports into Tokens Studio and Figma variable plugins. */
function buildFigma(i: ExportInput): string {
  const token = (v: string) => ({ $type: "color", $value: v });
  const modes: Record<string, Record<string, unknown>> = {};
  for (const id of SCHEME_IDS) {
    const group: Record<string, unknown> = {};
    for (const k of ROLE_KEYS) group[kebab(k)] = token(i.schemes[id][k]);
    modes[id] = group;
  }
  const palettes: Record<string, Record<string, unknown>> = {};
  for (const p of i.theme.palettes) {
    const key = p.id.startsWith("custom:") ? slug(p.name ?? p.id) : p.id;
    const tones: Record<string, unknown> = {};
    for (const t of TONES) tones[String(t)] = token(p.tones[t]);
    palettes[kebab(key)] = tones;
  }
  const extended: Record<string, unknown> = {};
  for (const c of i.theme.custom) {
    const n = slug(c.name);
    for (const mode of ["light", "dark"] as const) {
      extended[`${n}-${mode}`] = {
        color: token(c[mode].color),
        "on-color": token(c[mode].onColor),
        "color-container": token(c[mode].colorContainer),
        "on-color-container": token(c[mode].onColorContainer),
      };
    }
  }
  const out = {
    $description: header(i.config),
    scheme: modes,
    palette: palettes,
    ...(i.theme.custom.length ? { extended } : {}),
  };
  return JSON.stringify(out, null, 2) + "\n";
}

/* --------------------------------- Android ------------------------------- */

function buildAndroid(i: ExportInput): string {
  const out: string[] = [`<?xml version="1.0" encoding="utf-8"?>`, `<!-- ${header(i.config)} -->`, "<resources>"];
  for (const id of SCHEME_IDS) {
    const [mode, ...rest] = id.split("-");
    const prefix = rest.length ? `md_theme_${mode}_${rest[0]}Contrast_` : `md_theme_${mode}_`;
    for (const k of ROLE_KEYS) out.push(`    <color name="${prefix}${k}">${i.schemes[id][k]}</color>`);
    out.push("");
  }
  out.pop();
  out.push("</resources>", "");
  return out.join("\n");
}

/* ---------------------------------- API ---------------------------------- */

export function buildExport(format: ExportFormat, input: ExportInput): string {
  switch (format) {
    case "css":
      return buildCss(input);
    case "tailwind":
      return buildTailwind(input);
    case "scss":
      return buildScss(input);
    case "json":
      return buildJson(input);
    case "compose":
      return buildCompose(input);
    case "kmp":
      return buildKmp(input);
    case "flutter":
      return buildFlutter(input);
    case "swiftui":
      return buildSwiftUI(input);
    case "figma":
      return buildFigma(input);
    case "android":
      return buildAndroid(input);
    case "project":
      return buildProject(input);
  }
}

export function parseProject(text: string): ThemeConfig | null {
  try {
    const raw = JSON.parse(text) as { config?: Partial<ThemeConfig> } & Partial<ThemeConfig>;
    const c = raw.config ?? raw;
    if (!c || typeof c.source !== "string" || !/^#[0-9a-f]{6}$/i.test(c.source)) return null;
    const core: ThemeConfig["core"] = {};
    for (const k of CORE_KEYS) {
      const v = c.core?.[k];
      if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) core[k] = v.toUpperCase();
    }
    const custom = Array.isArray(c.custom)
      ? c.custom
          .filter((x) => x && typeof x.hex === "string" && /^#[0-9a-f]{6}$/i.test(x.hex))
          .map((x) => ({
            id: String(x.id ?? Math.random().toString(36).slice(2, 8)),
            name: String(x.name ?? "Custom"),
            hex: x.hex.toUpperCase(),
            blend: x.blend !== false,
          }))
      : [];
    const variant = VARIANT_IDS.includes(c.variant as never) ? (c.variant as ThemeConfig["variant"]) : "tonalSpot";
    const contrast = typeof c.contrast === "number" ? Math.max(-1, Math.min(1, c.contrast)) : 0;
    return { source: c.source.toUpperCase(), variant, contrast, core, custom };
  } catch {
    return null;
  }
}
