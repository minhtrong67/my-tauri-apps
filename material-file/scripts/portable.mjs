// Copies the release executable to ./download as a portable build (needs WebView2 on the PC).
// Usage: npm run build:portable
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [resolve(root, '../target/release/material-file.exe'), resolve(root, 'src-tauri/target/release/material-file.exe')];
const exe = candidates.find(existsSync);
if (!exe) { console.error('material-file.exe not found. Run "npm run build:portable" (it builds first).'); process.exit(1); }
mkdirSync(resolve(root, 'download'), { recursive: true });
const out = resolve(root, 'download/Material-File-Portable.exe');
copyFileSync(exe, out);
console.log('Portable build ready:', out);
