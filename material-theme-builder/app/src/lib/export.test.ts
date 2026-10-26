import { describe, expect, it } from "vitest";
import { EXPORT_FORMATS, buildExport, type ExportFormat } from "./export";
import { DEFAULT_CONFIG, generate, generateAll, type ThemeConfig } from "./theme";

const cfg: ThemeConfig = { ...DEFAULT_CONFIG, source: "#E4572E", variant: "expressive", custom: [{ id: "a", name: "Brand Red", hex: "#C62828", blend: true }] };
const input = { config: cfg, theme: generate(cfg), schemes: generateAll(cfg) };
const primary = input.schemes.light.primary;

const balanced = (code: string, open: string, close: string) => code.split(open).length === code.split(close).length;

describe("buildExport", () => {
  it.each(EXPORT_FORMATS.map((f) => f.id))("%s output is non-empty and contains the light primary", (format) => {
    const out = buildExport(format as ExportFormat, input);
    expect(out.length).toBeGreaterThan(200);
    if (format === "project") return;
    const needle = ["compose", "kmp", "flutter", "swiftui"].includes(format) ? primary.slice(1) : primary;
    expect(out.toLowerCase()).toContain(needle.toLowerCase());
  });

  it("emits valid JSON for json, figma and project", () => {
    for (const f of ["json", "figma", "project"] as const) expect(() => JSON.parse(buildExport(f, input))).not.toThrow();
  });

  it("figma tokens follow the DTCG shape", () => {
    const t = JSON.parse(buildExport("figma", input));
    expect(t.scheme.light.primary).toEqual({ $type: "color", $value: primary });
    expect(t.palette.primary["40"].$type).toBe("color");
    expect(Object.keys(t.extended)).toContain("brand-red-light");
  });

  it("swiftui and kmp output has balanced braces and a theme entry point", () => {
    const swift = buildExport("swiftui", input);
    expect(balanced(swift, "{", "}")).toBe(true);
    expect(swift).toContain("enum MaterialTheme");
    expect(swift).toContain("static func scheme(");
    const kmp = buildExport("kmp", input);
    expect(balanced(kmp, "{", "}")).toBe(true);
    expect(kmp).toContain("fun AppTheme(");
    expect(kmp).toContain("import androidx.compose.runtime.Composable");
  });

  it("android xml declares every scheme", () => {
    const xml = buildExport("android", input);
    expect(xml).toContain('name="md_theme_dark_highContrast_primary"');
    expect(xml.trim().endsWith("</resources>")).toBe(true);
  });
});
