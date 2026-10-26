import { normalizeHex } from "./color";
import { parseProject } from "./export";
import { DEFAULT_CONFIG, VARIANT_IDS, type CoreKey, type CustomColorDef, type ThemeConfig } from "./theme";

export type ImportKind = "project" | "json" | "css" | "xml" | "kotlin" | "dart";

export interface ImportResult {
  config: ThemeConfig;
  kind: ImportKind;
  /** Suggested theme name (from the file name or the file itself). */
  name?: string;
  /**
   * True when the seed color could not be read from the file and was reconstructed from the
   * generated color roles. The result has the same hues but may differ slightly.
   */
  approximate: boolean;
}

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v: unknown): string | null => (typeof v === "string" ? normalizeHex(v) : null);

const CORE_FROM_JSON: Record<string, CoreKey> = {
  primary: "primary",
  secondary: "secondary",
  tertiary: "tertiary",
  neutral: "neutral",
  neutralVariant: "neutralVariant",
  error: "error",
};

/** Material Theme Builder (web) and this app both write `seed`, `coreColors`, `extendedColors`, `schemes`. */
function fromJson(raw: Record<string, unknown>): ImportResult | null {
  const core = (raw.coreColors ?? {}) as Record<string, unknown>;
  const schemes = raw.schemes as Record<string, Record<string, unknown>> | undefined;
  const seed = hex(raw.seed) ?? hex(core.primary);
  const fromScheme = hex(schemes?.light?.primary);
  const source = seed ?? fromScheme;
  if (!source) return null;

  const cfgCore: ThemeConfig["core"] = {};
  for (const [k, id] of Object.entries(CORE_FROM_JSON)) {
    if (k === "primary") continue;
    const v = hex(core[k]);
    if (v && v !== source) cfgCore[id] = v;
  }

  // Without a seed, secondary / tertiary roles keep the reconstructed theme close to the original.
  if (!seed && schemes?.light) {
    const sec = hex(schemes.light.secondary);
    const ter = hex(schemes.light.tertiary);
    if (sec) cfgCore.secondary = sec;
    if (ter) cfgCore.tertiary = ter;
  }

  const extended = Array.isArray(raw.extendedColors) ? (raw.extendedColors as Record<string, unknown>[]) : [];
  const custom: CustomColorDef[] = extended
    .map((x, i) => {
      const h = hex(x.color ?? x.value);
      if (!h) return null;
      return { id: `imp${i}`, name: String(x.name ?? `Custom ${i + 1}`).slice(0, 24), hex: h, blend: x.harmonized !== false };
    })
    .filter((x): x is CustomColorDef => !!x)
    .slice(0, 8);

  const variant = VARIANT_IDS.includes(raw.variant as never) ? (raw.variant as ThemeConfig["variant"]) : DEFAULT_CONFIG.variant;
  const contrast = typeof raw.contrast === "number" ? Math.max(-1, Math.min(1, raw.contrast)) : 0;
  const name = typeof raw.name === "string" ? raw.name : undefined;
  return { config: { source, variant, contrast, core: cfgCore, custom }, kind: "json", name, approximate: !seed };
}

/** Reads the light-scheme primary / secondary / tertiary colors out of generated code. */
function fromRoles(roles: { primary?: string | null; secondary?: string | null; tertiary?: string | null }, kind: ImportKind): ImportResult | null {
  if (!roles.primary) return null;
  const core: ThemeConfig["core"] = {};
  if (roles.secondary) core.secondary = roles.secondary;
  if (roles.tertiary) core.tertiary = roles.tertiary;
  return { config: { ...DEFAULT_CONFIG, source: roles.primary, core, custom: [] }, kind, approximate: true };
}

const firstHex = (text: string, re: RegExp): string | null => {
  const m = re.exec(text);
  return m ? normalizeHex("#" + m[1]) : null;
};

function fromCss(text: string): ImportResult | null {
  const role = (r: string) => firstHex(text, new RegExp(`--md-sys-color-${r}\\s*:\\s*#([0-9a-f]{3,6})\\b`, "i"));
  return fromRoles({ primary: role("primary"), secondary: role("secondary"), tertiary: role("tertiary") }, "css");
}

function fromXml(text: string): ImportResult | null {
  const role = (r: string) => firstHex(text, new RegExp(`name="md_theme_light_${r}"[^>]*>\\s*#(?:[0-9a-f]{2})?([0-9a-f]{6})\\s*<`, "i"));
  return fromRoles({ primary: role("primary"), secondary: role("secondary"), tertiary: role("tertiary") }, "xml");
}

function fromKotlin(text: string): ImportResult | null {
  const role = (r: string) => firstHex(text, new RegExp(`val\\s+${r}Light\\s*=\\s*Color\\(\\s*0x[0-9a-f]{2}([0-9a-f]{6})\\s*\\)`, "i"));
  return fromRoles({ primary: role("primary"), secondary: role("secondary"), tertiary: role("tertiary") }, "kotlin");
}

function fromDart(text: string): ImportResult | null {
  const role = (r: string) => firstHex(text, new RegExp(`\\b${r}\\s*:\\s*Color\\(\\s*0x[0-9a-f]{2}([0-9a-f]{6})\\s*\\)`, "i"));
  return fromRoles({ primary: role("primary"), secondary: role("secondary"), tertiary: role("tertiary") }, "dart");
}

/**
 * Detects and parses a theme from pasted text or a file:
 * - `.mtb.json` project files from this app
 * - JSON from Google's Material Theme Builder (and this app's JSON export)
 * - CSS custom properties, Android `colors.xml`, Compose `Color(0xFF…)` and Flutter `ColorScheme` code
 */
export function parseTheme(text: string, fileName?: string): ImportResult | null {
  const src = text.trim();
  if (!src) return null;
  const baseName = fileName?.replace(/\.mtb\.json$|\.[a-z0-9]+$/i, "");

  if (src.startsWith("{")) {
    try {
      const raw = JSON.parse(src) as Record<string, unknown>;
      if (raw.app === "material-theme-builder" || (raw.config && typeof raw.config === "object")) {
        const config = parseProject(src);
        return config ? { config, kind: "project", name: baseName, approximate: false } : null;
      }
      const r = fromJson(raw);
      if (r) return { ...r, name: r.name ?? baseName };
      // A bare config object ({ source, variant, ... })
      const config = parseProject(src);
      return config ? { config, kind: "project", name: baseName, approximate: false } : null;
    } catch {
      return null;
    }
  }

  const r =
    (/--md-sys-color-primary\s*:/i.test(src) && fromCss(src)) ||
    (/name="md_theme_/i.test(src) && fromXml(src)) ||
    (/Color\(\s*0x/i.test(src) && /val\s+primaryLight\b/.test(src) && fromKotlin(src)) ||
    (/ColorScheme\s*\(/.test(src) && fromDart(src)) ||
    null;
  return r ? { ...r, name: baseName } : null;
}

export const isHex = (v: string): boolean => HEX.test(v);
