// Sao chép bộ cài NSIS vừa build vào downloads/ với tên cố định để landing page trỏ tới:
//   npm run build && npm run release:copy
import { readdirSync, copyFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = "src-tauri/target/release/bundle/nsis";
const files = readdirSync(dir).filter((f) => f.endsWith("-setup.exe"));
if (!files.length) throw new Error(`Không thấy file *-setup.exe trong ${dir}. Hãy chạy "npm run build" trước.`);
const latest = files.map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0].f;
mkdirSync("downloads", { recursive: true });
copyFileSync(join(dir, latest), "downloads/ClaudeTracker-Setup.exe");
console.log(`${latest} -> downloads/ClaudeTracker-Setup.exe`);
