// Generates the colour palettes embedded in the landing page (index.html), using the same
// Material 3 algorithm as the app, so the website and the app always match.
//   npm run palettes
import { Hct, SchemeVibrant, MaterialDynamicColors, argbFromHex, hexFromArgb } from "@material/material-color-utilities";
import { readFileSync, writeFileSync } from "node:fs";

const PRESETS = ["#6B4EFF", "#6750A4", "#0B6BCB", "#00897B", "#2E7D32", "#B58900", "#C25E00", "#D32F2F", "#D81B60", "#546E7A"];
const ROLES = [
  "primary", "onPrimary", "primaryContainer", "onPrimaryContainer", "secondary", "onSecondary", "secondaryContainer",
  "onSecondaryContainer", "tertiary", "onTertiary", "tertiaryContainer", "onTertiaryContainer", "error", "onError",
  "errorContainer", "onErrorContainer", "surface", "onSurface", "surfaceVariant", "onSurfaceVariant",
  "surfaceContainerLowest", "surfaceContainerLow", "surfaceContainer", "surfaceContainerHigh", "surfaceContainerHighest",
  "outline", "outlineVariant", "inverseSurface", "inverseOnSurface", "inversePrimary", "scrim",
];
const kebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
const out = {};
for (const seed of PRESETS) {
  out[seed] = {};
  for (const dark of [false, true]) {
    const scheme = new SchemeVibrant(Hct.fromInt(argbFromHex(seed)), dark, 0);
    const map = {};
    for (const r of ROLES) map[kebab(r)] = hexFromArgb(MaterialDynamicColors[r].getArgb(scheme));
    out[seed][dark ? "dark" : "light"] = map;
  }
}
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const next = html.replace(/\/\*PALETTES:START\*\/[\s\S]*?\/\*PALETTES:END\*\//, "/*PALETTES:START*/" + JSON.stringify(out) + "/*PALETTES:END*/");
writeFileSync(new URL("../index.html", import.meta.url), next);
console.log("Palettes written for", PRESETS.length, "colours");
