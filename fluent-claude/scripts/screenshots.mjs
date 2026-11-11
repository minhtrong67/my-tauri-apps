// Chụp ảnh cho README từ giao diện chạy với dữ liệu giả (không lộ email thật).
//   npm run dev:mock                                                  (terminal 1)
//   npx playwright install chromium && node scripts/screenshots.mjs   (terminal 2)
// Trình duyệt không có Mica thật nên chế độ mock tự vẽ hình nền Windows mô phỏng phía sau cửa sổ.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL ?? "http://localhost:1420/";
const CHROME = process.env.CHROME_PATH; // tuỳ chọn: đường dẫn Chrome có sẵn
mkdirSync("screenshots", { recursive: true });

const shots = [
  { file: "image01", theme: "dark", effect: "mica", view: "grid", tab: "dashboard" },
  { file: "image02", theme: "light", effect: "mica", view: "grid", tab: "dashboard" },
  { file: "image03", theme: "dark", effect: "acrylic", view: "list", tab: "dashboard" },
  { file: "image04", theme: "light", effect: "tabbed", view: "grid", tab: "settings" },
];

const browser = await chromium.launch({ executablePath: CHROME });
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: "en-US" });
  await ctx.addInitScript((p) => localStorage.setItem("fluent-claude.prefs", JSON.stringify(p)), { theme: s.theme, lang: "en", font: "md", view: s.view, accent: "blue", ff: "system", effect: s.effect, transparency: true, navOpen: true });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForSelector(".nav");
  if (s.tab === "settings") await page.click(".nav-foot .nav-item");
  await page.waitForTimeout(1800); // chờ animation vào xong
  await page.screenshot({ path: `screenshots/${s.file}.png` });
  await ctx.close();
}
await browser.close();
console.log("done");
