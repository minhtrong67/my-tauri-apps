// Prepares assets for the landing page (index.html):
//  1. Writes the preset theme list between /*THEMES:START*/ and /*THEMES:END*/ markers in index.html and inlines
//     the Material color engine (scripts/landing-engine.mjs, bundled with esbuild) between /*ENGINE:START*/ and
//     /*ENGINE:END*/, so the page can build any theme at runtime with the same color science as the app.
//  2. Writes assets/og-image.png (1200x630), assets/apple-touch-icon.png, assets/favicon.svg.
// Usage: npm run landing
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { build } from "esbuild";
import { PALETTE, appSvg } from "./icon-art.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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
const data = { themes: Object.fromEntries(SEEDS.map(([id, seed, en, vi]) => [id, { seed, n: [en, vi] }])) };

const file = join(root, "index.html");
let html = readFileSync(file, "utf8");
html = html.replace(/\/\*THEMES:START\*\/[\s\S]*?\/\*THEMES:END\*\//, () => `/*THEMES:START*/${JSON.stringify(data)}/*THEMES:END*/`);
const bundled = await build({ entryPoints: [join(root, "scripts", "landing-engine.mjs")], bundle: true, minify: true, format: "iife", platform: "browser", target: "es2020", write: false, legalComments: "none" });
const engine = bundled.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
html = html.replace(/\/\*ENGINE:START\*\/[\s\S]*?\/\*ENGINE:END\*\//, () => `/*ENGINE:START*/${engine}/*ENGINE:END*/`);
writeFileSync(file, html);

mkdirSync(join(root, "assets"), { recursive: true });
const app = appSvg();
const V = PALETTE.violet;
writeFileSync(join(root, "assets", "favicon.svg"), app);
await sharp(Buffer.from(app), { density: 300 }).resize(180, 180).png().toFile(join(root, "assets", "apple-touch-icon.png"));

const logo = await sharp(Buffer.from(app), { density: 300 }).resize(300, 300).png().toBuffer();
const chips = [[V.light, 0], [V.pink, 1], [V.mint, 2], [V.yellow, 3], [V.peach, 4], [V.base, 5]]
  .map(([c, i]) => `<rect x="${80 + i * 74}" y="470" width="62" height="62" rx="${i % 2 ? 31 : 20}" fill="${c}" stroke="${V.light}" stroke-opacity="0.25"/>`).join("");
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${V.deep}"/>
  <circle cx="965" cy="315" r="195" fill="${V.pink}"/><circle cx="1170" cy="640" r="210" fill="${V.base}"/><circle cx="1110" cy="70" r="46" fill="${V.mint}"/>
  <text x="80" y="210" font-family="Inter, Roboto, sans-serif" font-size="30" font-weight="600" fill="${V.mint}" letter-spacing="3">MATERIAL 3 EXPRESSIVE · DESKTOP APP</text>
  <text x="80" y="300" font-family="Inter, Roboto, sans-serif" font-size="82" font-weight="700" fill="#FFFFFF">Material</text>
  <text x="80" y="390" font-family="Inter, Roboto, sans-serif" font-size="82" font-weight="700" fill="#FFFFFF">Theme Builder</text>
  <text x="80" y="440" font-family="Inter, Roboto, sans-serif" font-size="28" fill="${V.light}">Design, preview and export beautiful color themes.</text>
  ${chips}
</svg>`;
await sharp(Buffer.from(og)).composite([{ input: logo, left: 800, top: 165 }]).png().toFile(join(root, "assets", "og-image.png"));
console.log("Landing assets ready.");
