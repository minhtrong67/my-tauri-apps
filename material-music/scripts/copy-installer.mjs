// After `npm run build`: copies the installer into download/ with the file name the landing page links to
// (download/Material-Music_<version>_x64-setup.exe). The Cargo workspace keeps one `target` folder next to the project folders.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dirs = [path.resolve(root, '..', 'target', 'release', 'bundle', 'nsis'), path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis')];
const exe = dirs.map((d) => path.join(d, `Material Music_${version}_x64-setup.exe`)).find((f) => fs.existsSync(f));
if (!exe) {
  console.error(`\n[download] Installer for version ${version} not found in:\n  ${dirs.join('\n  ')}\nCheck that the version in package.json, src-tauri/Cargo.toml and src-tauri/tauri.conf.json is the same.\n`);
  process.exit(1);
}
const outDir = path.join(root, 'download');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `Material-Music_${version}_x64-setup.exe`);
fs.copyFileSync(exe, out);
console.log(`\n✓ ${path.relative(root, out)}  (${(fs.statSync(out).size / 1048576).toFixed(1)} MB) - the landing page Download button points here`);
