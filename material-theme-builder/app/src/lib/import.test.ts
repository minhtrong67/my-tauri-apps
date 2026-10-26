import { describe, expect, it } from "vitest";
import { buildExport } from "./export";
import { parseTheme } from "./import";
import { DEFAULT_CONFIG, generate, generateAll, type ThemeConfig } from "./theme";

const cfg: ThemeConfig = { ...DEFAULT_CONFIG, source: "#00897B", variant: "vibrant", contrast: 0.5, core: { tertiary: "#FF5722" }, custom: [{ id: "a", name: "Brand", hex: "#E4572E", blend: true }] };
const out = (format: Parameters<typeof buildExport>[0]) => buildExport(format, { config: cfg, theme: generate(cfg), schemes: generateAll(cfg) });

describe("parseTheme", () => {
  it("round-trips a project file exactly", () => {
    const r = parseTheme(out("project"), "my.mtb.json");
    expect(r?.kind).toBe("project");
    expect(r?.config).toEqual(cfg);
    expect(r?.name).toBe("my");
    expect(r?.approximate).toBe(false);
  });

  it("reads the seed, core and extended colors from JSON exports", () => {
    const r = parseTheme(out("json"), "material-theme.json");
    expect(r?.kind).toBe("json");
    expect(r?.config.source).toBe("#00897B");
    expect(r?.config.variant).toBe("vibrant");
    expect(r?.config.core.tertiary).toBe("#FF5722");
    expect(r?.config.custom[0]).toMatchObject({ name: "Brand", hex: "#E4572E", blend: true });
    expect(r?.approximate).toBe(false);
  });

  it("reads Google Material Theme Builder JSON", () => {
    const google = JSON.stringify({
      description: "TYPE: CUSTOM",
      seed: "#6750A4",
      coreColors: { primary: "#6750A4", secondary: "#625B71" },
      extendedColors: [{ name: "Warn", color: "#FFAA00", description: "", harmonized: false }],
      schemes: { light: { primary: "#6750A4" } },
    });
    const r = parseTheme(google);
    expect(r?.config.source).toBe("#6750A4");
    expect(r?.config.core.secondary).toBe("#625B71");
    expect(r?.config.custom[0].blend).toBe(false);
  });

  it.each(["css", "android", "compose", "flutter"] as const)("approximates a theme from %s code", (format) => {
    const r = parseTheme(out(format));
    expect(r).not.toBeNull();
    expect(r?.approximate).toBe(true);
    expect(r?.config.source).toBe(generateAll(cfg).light.primary);
  });

  it("rejects unrelated text", () => {
    expect(parseTheme("hello world")).toBeNull();
    expect(parseTheme("{ not json")).toBeNull();
    expect(parseTheme("   ")).toBeNull();
  });
});
