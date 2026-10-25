// Builds download/latest.json (the update manifest read by the in-app updater) and copies the signed installer into download/.
// Usage:  npm run release -- "What is new in this version"
// Needs the signing key: set TAURI_SIGNING_PRIVATE_KEY (path to the key file or its content) before `npm run release`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const baseUrl = (process.env.UPDATE_BASE_URL || 'https://material-music-player-delta.vercel.app/download').replace(/\/$/, '');
const notes = process.argv.slice(2).join(' ').trim() || process.env.RELEASE_NOTES || `Material Music ${version}`;

const fail = (msg) => {
  console.error(`\n[update manifest] ${msg}\n`);
  process.exit(1);
};

// the Cargo workspace keeps ONE target folder next to the project folders; a local src-tauri/target also works
const dirs = [path.resolve(root, '..', 'target', 'release', 'bundle', 'nsis'), path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis')];
const dir = dirs.find((d) => fs.existsSync(d));
if (!dir) fail(`Build output not found. Looked in:\n  ${dirs.join('\n  ')}`);

const exe = fs.readdirSync(dir).find((f) => f.endsWith(`_${version}_x64-setup.exe`));
if (!exe) fail(`No installer for version ${version} in ${dir}. Run "npm run release" first (and bump the version in package.json, src-tauri/Cargo.toml and src-tauri/tauri.conf.json).`);
const sigFile = path.join(dir, `${exe}.sig`);
if (!fs.existsSync(sigFile)) fail(`${exe}.sig is missing. The installer was not signed: set TAURI_SIGNING_PRIVATE_KEY and run "npm run release" again.`);

const outDir = path.join(root, 'download');
fs.mkdirSync(outDir, { recursive: true });
const outName = `Material-Music_${version}_x64-setup.exe`;
fs.copyFileSync(path.join(dir, exe), path.join(outDir, outName));

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature: fs.readFileSync(sigFile, 'utf8').trim(),
      url: `${baseUrl}/${outName}`,
    },
  },
};
fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n[update manifest] download/${outName}\n[update manifest] download/latest.json  (version ${version})\nDeploy the "download" folder to ${baseUrl}\n`);
