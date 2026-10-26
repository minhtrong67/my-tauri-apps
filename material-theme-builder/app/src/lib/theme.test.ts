import { describe, expect, it } from "vitest";
import { ratioOfHex } from "./color";
import {
  CONTRAST_PAIRS,
  DEFAULT_CONFIG,
  ROLE_GROUPS,
  ROLE_KEYS,
  SCHEME_IDS,
  VARIANT_IDS,
  buildScheme,
  cssVarName,
  generate,
  generateAll,
  rolesOf,
  themeVars,
  variantPreview,
  type ThemeConfig,
} from "./theme";

const HEX = /^#[0-9A-F]{6}$/;
const SOURCES = ["#6750A4", "#E4572E", "#00897B", "#FFC107"];

describe("generate", () => {
  for (const variant of VARIANT_IDS) {
    it(`${variant}: every role is a valid #RRGGBB in light and dark`, () => {
      for (const source of SOURCES) {
        const t = generate({ ...DEFAULT_CONFIG, source, variant });
        for (const mode of [t.light, t.dark]) {
          for (const k of ROLE_KEYS) expect(mode[k], `${variant}/${source}/${k}`).toMatch(HEX);
        }
      }
    });
  }

  it("light and dark differ", () => {
    const t = generate(DEFAULT_CONFIG);
    expect(t.light.surface).not.toBe(t.dark.surface);
  });

  it("role groups only reference known roles", () => {
    for (const g of ROLE_GROUPS) for (const r of g.roles) expect(ROLE_KEYS).toContain(r);
  });

  it("includes six core palettes plus one per custom color", () => {
    const cfg: ThemeConfig = { ...DEFAULT_CONFIG, custom: [{ id: "x", name: "X", hex: "#C62828", blend: true }] };
    const t = generate(cfg);
    expect(t.palettes.length).toBe(7);
    expect(t.custom).toHaveLength(1);
    for (const mode of ["light", "dark"] as const) {
      for (const v of Object.values(t.custom[0][mode])) if (typeof v === "string") expect(v).toMatch(HEX);
    }
  });

  it("core overrides change the matching role", () => {
    const base = generate(DEFAULT_CONFIG);
    const over = generate({ ...DEFAULT_CONFIG, core: { tertiary: "#FF5722" } });
    expect(over.light.tertiary).not.toBe(base.light.tertiary);
    expect(over.light.primary).toBe(base.light.primary);
  });
});

describe("determinism", () => {
  it("buildScheme / generate are deterministic", () => {
    const cfg: ThemeConfig = { ...DEFAULT_CONFIG, source: "#E4572E", variant: "fidelity", contrast: 0.5 };
    expect(rolesOf(buildScheme(cfg, true))).toEqual(rolesOf(buildScheme(cfg, true)));
    expect(generate(cfg)).toEqual(generate(cfg));
  });
});

describe("contrast levels", () => {
  const ON: [string, string][] = [
    ["onPrimary", "primary"],
    ["onSecondary", "secondary"],
    ["onSurface", "surface"],
  ];
  for (const isDark of [false, true]) {
    it(`on-color contrast never decreases as level rises (${isDark ? "dark" : "light"})`, () => {
      for (const source of SOURCES) {
        const levels = [-1, 0, 0.5, 1].map((c) => rolesOf(buildScheme({ ...DEFAULT_CONFIG, source }, isDark, c)));
        for (const [fg, bg] of ON) {
          const ratios = levels.map((r) => ratioOfHex(r[fg as "primary"], r[bg as "primary"]));
          for (let i = 1; i < ratios.length; i++) expect(ratios[i], `${source} ${fg}/${bg}`).toBeGreaterThanOrEqual(ratios[i - 1] - 0.05);
        }
      }
    });
  }

  it("high contrast meets AA for every checked pair that demands 4.5", () => {
    const all = generateAll(DEFAULT_CONFIG);
    for (const id of ["light-high-contrast", "dark-high-contrast"] as const) {
      for (const [fg, bg, min] of CONTRAST_PAIRS) {
        if (min < 4.5) continue;
        expect(ratioOfHex(all[id][fg], all[id][bg]), `${id} ${fg}/${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("generateAll / helpers", () => {
  it("returns every scheme id with every role", () => {
    const all = generateAll(DEFAULT_CONFIG);
    expect(Object.keys(all).sort()).toEqual([...SCHEME_IDS].sort());
    for (const id of SCHEME_IDS) for (const k of ROLE_KEYS) expect(all[id][k]).toMatch(HEX);
  });
  it("generateAll light/dark match generate at default contrast", () => {
    const all = generateAll(DEFAULT_CONFIG);
    const t = generate(DEFAULT_CONFIG);
    expect(all.light).toEqual(t.light);
    expect(all.dark).toEqual(t.dark);
  });
  it("themeVars maps every role to a --md-* variable", () => {
    const vars = themeVars(generate(DEFAULT_CONFIG).light);
    expect(Object.keys(vars)).toHaveLength(ROLE_KEYS.length);
    expect(vars[cssVarName("onPrimaryContainer")]).toMatch(HEX);
    expect(cssVarName("onPrimaryContainer")).toBe("--md-on-primary-container");
  });
  it("variantPreview yields three hex colors for each variant", () => {
    for (const v of VARIANT_IDS) for (const c of variantPreview("#6750A4", v)) expect(c).toMatch(HEX);
  });
});
