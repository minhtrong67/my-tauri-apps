// Captures the 4 README / landing-page screenshots (screenshots/image01..image04.png).
// Usage: npm run build:web && npx vite preview --port 4173 &  node scripts/screenshots.mjs
// Requires Playwright (not a project dependency): npm i -D playwright  (or set PLAYWRIGHT_MODULE).
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "screenshots");
mkdirSync(out, { recursive: true });
const URL = process.env.APP_URL || "http://localhost:4173/";

const cfg = (source, variant = "tonalSpot") => ({ source, variant, contrast: 0, core: {}, custom: [] });
const shots = [
  { file: "image01.png", mode: "light", lang: "en", accent: "#6750A4", config: cfg("#6750A4"), tab: 0 },
  { file: "image02.png", mode: "dark", lang: "en", accent: "#009688", config: cfg("#00897B", "vibrant"), tab: 0, split: true },
  { file: "image03.png", mode: "light", lang: "en", accent: "#FF5722", config: cfg("#E4572E", "expressive"), tab: 2 },
  { file: "image04.png", mode: "dark", lang: "vi", accent: "#673AB7", config: cfg("#6750A4"), page: "settings" },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, colorScheme: s.mode, locale: s.lang === "vi" ? "vi-VN" : "en-US" });
  await ctx.addInitScript(
    ([settings, config]) => {
      localStorage.setItem("mtb.settings", JSON.stringify(settings));
      localStorage.setItem("mtb.current", JSON.stringify(config));
    },
    [{ mode: s.mode, accent: s.accent, fontSize: "medium", lang: s.lang, font: "roboto", windowMode: "remember", windowSize: null }, s.config],
  );
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(900);
  if (s.page === "settings") await p.keyboard.press("Control+,");
  if (s.tab) await p.locator("[role=tab]").nth(s.tab).click();
  if (s.split) await p.locator("[role=tab]").filter({ hasText: /Both|Cả hai/ }).click();
  await p.waitForTimeout(900);
  await p.mouse.move(5, 5);
  await p.screenshot({ path: join(out, s.file) });
  await ctx.close();
  console.log("saved", s.file);
}
await browser.close();
