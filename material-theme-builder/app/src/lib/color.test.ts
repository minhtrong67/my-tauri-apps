import { describe, expect, it } from "vitest";
import { apcaLc, apcaLevel, labDistance, contrastRatio, hctFromHex, hexFromHct, normalizeHex, ratioOfHex, readableOn, toArgb, toHex } from "./color";

describe("normalizeHex", () => {
  it("expands, uppercases and prefixes", () => {
    expect(normalizeHex("abc")).toBe("#AABBCC");
    expect(normalizeHex("#6750a4")).toBe("#6750A4");
    expect(normalizeHex("  6750A4 ")).toBe("#6750A4");
  });
  it("rejects invalid input", () => {
    for (const v of ["", "#12", "12345", "#GGGGGG", "1234567"]) expect(normalizeHex(v)).toBeNull();
  });
});

describe("hex <-> argb", () => {
  it("round-trips", () => {
    for (const hex of ["#000000", "#FFFFFF", "#6750A4", "#E4572E", "#00897B", "#010203"]) {
      expect(toHex(toArgb(hex))).toBe(hex);
    }
  });
  it("produces opaque ARGB", () => {
    expect(toArgb("#FF0000") >>> 24).toBe(0xff);
  });
});

describe("contrast", () => {
  it("black on white is 21:1 and symmetric", () => {
    expect(ratioOfHex("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio(toArgb("#123456"), toArgb("#FEDCBA"))).toBeCloseTo(contrastRatio(toArgb("#FEDCBA"), toArgb("#123456")), 10);
  });
  it("identical colors are 1:1", () => {
    expect(ratioOfHex("#6750A4", "#6750A4")).toBeCloseTo(1, 5);
  });
  it("readableOn picks the more legible of black/white", () => {
    expect(readableOn("#FFFFFF")).toBe("#000000");
    expect(readableOn("#000000")).toBe("#FFFFFF");
    for (const hex of ["#6750A4", "#E4572E", "#FFD54F", "#1B5E20"]) {
      const pick = readableOn(hex);
      const other = pick === "#000000" ? "#FFFFFF" : "#000000";
      expect(ratioOfHex(hex, pick)).toBeGreaterThanOrEqual(ratioOfHex(hex, other));
    }
  });
});

describe("HCT", () => {
  it("hctFromHex / hexFromHct are near-inverse", () => {
    const { h, c, t } = hctFromHex("#6750A4");
    expect(hexFromHct(h, c, t)).toBe("#6750A4");
  });
  it("tone 0 is black and tone 100 is white", () => {
    expect(hexFromHct(200, 40, 0)).toBe("#000000");
    expect(hexFromHct(200, 40, 100)).toBe("#FFFFFF");
  });
});

describe("apcaLc", () => {
  it("matches reference values for black/white", () => {
    expect(apcaLc("#000000", "#FFFFFF")).toBeCloseTo(106, 0);
    expect(apcaLc("#FFFFFF", "#000000")).toBeCloseTo(-107.9, 0);
  });
  it("is 0 for identical colors and levels map to thresholds", () => {
    expect(apcaLc("#777777", "#777777")).toBe(0);
    expect(apcaLevel(80)).toBe("body");
    expect(apcaLevel(-62)).toBe("large");
    expect(apcaLevel(50)).toBe("ui");
    expect(apcaLevel(10)).toBe("fail");
  });
});

describe("labDistance", () => {
  it("is 0 for equal colors and grows with difference", () => {
    expect(labDistance("#6750A4", "#6750A4")).toBe(0);
    expect(labDistance("#000000", "#FFFFFF")).toBeGreaterThan(90);
  });
});
