// Packs the release executable into download/Fluent-Music_<version>_x64-portable.zip (no installer needed).
// Usage:  pnpm build   then   pnpm portable
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const fail = (m) => { console.error(`\n[portable] ${m}\n`); process.exit(1); };

// the Cargo workspace keeps ONE target folder next to the project folders; a local src-tauri/target also works
const candidates = [path.resolve(root, '..', 'target', 'release', 'fluent-music.exe'), path.join(root, 'src-tauri', 'target', 'release', 'fluent-music.exe')];
const exe = candidates.find((f) => fs.existsSync(f));
if (!exe) fail(`fluent-music.exe not found. Run "pnpm build" first. Looked in:\n  ${candidates.join('\n  ')}`);

const outDir = path.join(root, 'download');
const stage = path.join(outDir, '.portable-stage');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.copyFileSync(exe, path.join(stage, 'Fluent Music.exe'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE.txt'));
fs.writeFileSync(
  path.join(stage, 'README.txt'),
  'Fluent Music (portable)\r\n\r\nRun "Fluent Music.exe". Needs the Microsoft Edge WebView2 runtime (already part of Windows 10/11).\r\nYour data is kept in %APPDATA%\\com.minhtrong67.fluent-music.\r\n\r\nhttps://github.com/minhtrong67\r\n',
);

const zip = path.join(outDir, `Fluent-Music_${version}_x64-portable.zip`);
fs.rmSync(zip, { force: true });
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${stage}\\*' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', '-q', zip, '.'], { cwd: stage, stdio: 'inherit' });
}
fs.rmSync(stage, { recursive: true, force: true });
console.log(`\n✓ ${path.relative(root, zip)}`);
