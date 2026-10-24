// Zips ./extension into ./download/material-video-downloader-extension.zip (no extra dependencies).
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "download", "material-video-downloader-extension.zip");
mkdirSync(dirname(out), { recursive: true });
if (existsSync(out)) rmSync(out);

try {
  if (process.platform === "win32") {
    execFileSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${resolve(root, "extension")}\\*' -DestinationPath '${out}' -Force`], { stdio: "inherit" });
  } else {
    execFileSync("zip", ["-r", "-q", out, "."], { cwd: resolve(root, "extension"), stdio: "inherit" });
  }
  console.log("Extension packed ->", out);
} catch (e) {
  console.error("Could not create the zip automatically. Zip the 'extension' folder by hand.", e.message);
  process.exit(1);
}
