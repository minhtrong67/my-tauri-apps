// Prepares assets for the landing page (index.html):
//  1. Embeds precomputed Material 3 color roles (light + dark) for each theme color between the
//     /*THEMES:START*/ and /*THEMES:END*/ markers in index.html, using the same engine as the app.
//  2. Writes assets/og-image.png (1200x630), assets/apple-touch-icon.png, assets/favicon.svg.
// Usage: npm run landing
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Hct, MaterialDynamicColors, SchemeTonalSpot, hexFromArgb, argbFromHex } from "@material/material-color-utilities";
import { appSvg } from "./icon-art.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROLES = ["primary","onPrimary","primaryContainer","onPrimaryContainer","secondary","onSecondary","secondaryContainer","onSecondaryContainer","tertiary","onTertiary","tertiaryContainer","onTertiaryContainer","error","onError","errorContainer","onErrorContainer","surface","onSurface","surfaceVariant","onSurfaceVariant","outline","outlineVariant","inverseSurface","inverseOnSurface","inversePrimary","surfaceDim","surfaceBright","surfaceContainerLowest","surfaceContainerLow","surfaceContainer","surfaceContainerHigh","surfaceContainerHighest","scrim","shadow"];
const SEEDS = [
  ["baseline", "#6750A4", "Baseline", "Mặc định"],
  ["red", "#F44336", "Red", "Đỏ"],
  ["pink", "#E91E63", "Pink", "Hồng"],
  ["purple", "#9C27B0", "Purple", "Tím"],
  ["indigo", "#3F51B5", "Indigo", "Chàm"],
  ["blue", "#2196F3", "Blue", "Xanh dương"],
  ["cyan", "#00BCD4", "Cyan", "Lơ"],
  ["teal", "#009688", "Teal", "Mòng két"],
  ["green", "#4CAF50", "Green", "Xanh lá"],
  ["amber", "#FFC107", "Amber", "Hổ phách"],
  ["orange", "#FF9800", "Orange", "Cam"],
  ["deepOrange", "#FF5722", "Deep Orange", "Cam đậm"],
  ["brown", "#795548", "Brown", "Nâu"],
];
const roles = (seed, dark) => {
  const s = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), dark, 0);
  return ROLES.map((r) => hexFromArgb(MaterialDynamicColors[r].getArgb(s)).toUpperCase());
};
const data = { roles: ROLES, themes: Object.fromEntries(SEEDS.map(([id, seed, en, vi]) => [id, { seed, n: [en, vi], l: roles(seed, false), d: roles(seed, true) }])) };

const file = join(root, "index.html");
let html = readFileSync(file, "utf8");
html = html.replace(/\/\*THEMES:START\*\/[\s\S]*?\/\*THEMES:END\*\//, `/*THEMES:START*/${JSON.stringify(data)}/*THEMES:END*/`);
writeFileSync(file, html);

mkdirSync(join(root, "assets"), { recursive: true });
const app = appSvg("OG");
writeFileSync(join(root, "assets", "favicon.svg"), app);
await sharp(Buffer.from(app), { density: 300 }).resize(180, 180).png().toFile(join(root, "assets", "apple-touch-icon.png"));

const logo = await sharp(Buffer.from(app), { density: 300 }).resize(300, 300).png().toBuffer();
const chips = [["#EADDFF", 0], ["#D0BCFF", 1], ["#FFD8E4", 2], ["#CCC2DC", 3], ["#9A82DB", 4], ["#4F378B", 5]]
  .map(([c, i]) => `<rect x="${80 + i * 74}" y="470" width="62" height="62" rx="${i % 2 ? 31 : 20}" fill="${c}"/>`).join("");
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2B1B63"/><stop offset="1" stop-color="#6750A4"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1080" cy="80" r="260" fill="#D0BCFF" opacity="0.14"/><circle cx="150" cy="640" r="250" fill="#EFB8C8" opacity="0.14"/>
  <text x="80" y="210" font-family="Inter, Roboto, sans-serif" font-size="30" font-weight="600" fill="#D0BCFF" letter-spacing="3">MATERIAL DESIGN 3 · DESKTOP APP</text>
  <text x="80" y="300" font-family="Inter, Roboto, sans-serif" font-size="82" font-weight="700" fill="#FFFFFF">Material</text>
  <text x="80" y="390" font-family="Inter, Roboto, sans-serif" font-size="82" font-weight="700" fill="#FFFFFF">Theme Builder</text>
  <text x="80" y="440" font-family="Inter, Roboto, sans-serif" font-size="28" fill="#E8DEF8">Design, preview and export beautiful color themes.</text>
  ${chips}
</svg>`;
await sharp(Buffer.from(og)).composite([{ input: logo, left: 800, top: 165 }]).png().toFile(join(root, "assets", "og-image.png"));
console.log("Landing assets ready.");
