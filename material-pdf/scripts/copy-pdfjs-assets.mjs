// Copies pdf.js CMaps + standard fonts into app/public so CJK / legacy PDFs render correctly offline.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/pdfjs-dist");
const out = resolve(root, "app/public");
if (!existsSync(src)) process.exit(0);
mkdirSync(out, { recursive: true });
for (const dir of ["cmaps", "standard_fonts"]) {
  if (existsSync(resolve(src, dir))) cpSync(resolve(src, dir), resolve(out, dir), { recursive: true });
}
console.log("pdf.js assets copied");
