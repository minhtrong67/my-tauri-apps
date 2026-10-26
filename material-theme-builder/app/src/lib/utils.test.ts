import { describe, expect, it } from "vitest";
import { clamp, cn, humanize, kebab, slug, uid } from "./utils";

describe("utils", () => {
  it("cn drops falsy parts", () => expect(cn("a", false, null, undefined, "b")).toBe("a b"));
  it("humanize", () => expect(humanize("primaryContainer")).toBe("Primary container"));
  it("kebab", () => expect(kebab("onPrimaryContainer")).toBe("on-primary-container"));
  it("slug strips diacritics and symbols", () => {
    expect(slug("Màu Đỏ Tươi!")).toBe("mau-do-tuoi");
    expect(slug("***")).toBe("color");
  });
  it("uid is non-empty and unique-ish", () => {
    expect(uid().length).toBeGreaterThan(6);
    expect(new Set(Array.from({ length: 50 }, uid)).size).toBe(50);
  });
  it("clamp", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
