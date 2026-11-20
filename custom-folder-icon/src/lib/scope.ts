import type { Design } from "./types";

export type Aspect = "style" | "color" | "pattern" | "icon" | "text";
export const ASPECTS: Aspect[] = ["style", "color", "pattern", "icon", "text"];

/** Copy only the chosen parts of `cur` onto `base`; everything else on `base` is kept. */
export function mergeDesign(base: Design, cur: Design, scope: Aspect[]): Design {
  const d: Design = { ...base };
  if (scope.includes("style")) d.style = cur.style;
  if (scope.includes("color")) Object.assign(d, { fill: cur.fill, color: cur.color, color2: cur.color2, angle: cur.angle });
  if (scope.includes("pattern")) Object.assign(d, { pattern: cur.pattern, patternSize: cur.patternSize, patternIntensity: cur.patternIntensity, patternColor: cur.patternColor });
  if (scope.includes("icon")) d.icon = { ...cur.icon };
  if (scope.includes("text")) d.text = { ...cur.text };
  return d;
}

export function loadScope(): Aspect[] {
  try {
    const raw = JSON.parse(localStorage.getItem("ffi.scope") || "null") as Aspect[] | null;
    if (Array.isArray(raw)) return raw.filter((a) => ASPECTS.includes(a));
  } catch { /* use default */ }
  return ASPECTS;
}
export const saveScope = (s: Aspect[]) => localStorage.setItem("ffi.scope", JSON.stringify(s));
