// Generates the Fluent icon set: app icon, uninstall icon, installer images and favicon.
// Needs `sharp` (npm i -D sharp) and Python Pillow for the BMP files. Run: node tools/icons/make-icons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'src-tauri/icons'), assets = path.join(root, 'assets');
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(assets, { recursive: true });

const GLYPH = 'M24 66V36l11 15 11-15v30M63 36v22M54 50l9 9 9-9';   // the "M↓" Markdown mark

const svg = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs>${defs}</defs>${body}</svg>`;
const DEFS = `
  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe9f7"/></linearGradient>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fa9ff"/><stop offset="1" stop-color="#0063c1"/></linearGradient>
  <linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="2.2"/></filter>`;

/** Full icon: a document with a folded corner and a blue Markdown badge, layered like a Windows 11 app icon. */
const appFull = svg(`
  <path d="M26 14h30l22 22v44a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z" fill="#0b2a52" opacity=".28" filter="url(#soft)" transform="translate(0 3)"/>
  <path d="M26 8h30l22 22v50a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" fill="url(#pg)"/>
  <path d="M56 8v16a6 6 0 0 0 6 6h16z" fill="#b8d3f2"/>
  <rect x="30" y="38" width="26" height="4" rx="2" fill="#a9c1df"/><rect x="30" y="47" width="18" height="4" rx="2" fill="#c3d5ea"/>
  <rect x="9" y="56" width="82" height="34" rx="9" fill="#04204a" opacity=".3" filter="url(#soft)" transform="translate(0 2)"/>
  <rect x="9" y="54" width="82" height="34" rx="9" fill="url(#bg)"/>
  <rect x="9" y="54" width="82" height="17" rx="9" fill="url(#sh)"/>
  <path d="${GLYPH}" transform="translate(12.6 31.5) scale(.78)" fill="none" stroke="#fff" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>`, DEFS);

/** Small sizes: no page detail, a bolder badge, so the mark stays readable at 16 to 48 px. */
const appSmall = svg(`
  <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#bg)"/>
  <rect x="6" y="6" width="88" height="44" rx="20" fill="url(#sh)"/>
  <path d="M24 70V32l17 22 17-22v38M76 32v30M65 53l11 11 11-11" transform="translate(-2 0) scale(.96) translate(2 2)" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`, DEFS);

/** Uninstall icon: the same document in grey with a bin and a red badge. */
const BIN = 'M34 44h32M44 44v-5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v5M38 44l2 26a4 4 0 0 0 4 3.5h12a4 4 0 0 0 4-3.5l2-26M47 52v14M53 52v14';
const uninstall = svg(`
  <path d="M26 8h30l22 22v56a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" fill="#e6eaf0"/>
  <path d="M56 8v16a6 6 0 0 0 6 6h16z" fill="#c4ccd8"/>
  <rect x="14" y="30" width="72" height="56" rx="10" fill="#5b6b82"/>
  <path d="${BIN}" transform="translate(0 6)" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="80" cy="20" r="13" fill="#c42b1c"/><path d="M74.5 14.5l11 11M85.5 14.5l-11 11" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>`, DEFS);
const uninstallSmall = svg(`
  <rect x="6" y="6" width="88" height="88" rx="20" fill="#5b6b82"/>
  <path d="${BIN}" transform="translate(50 50) scale(1.3) translate(-50 -52)" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`, DEFS);

fs.writeFileSync(path.join(assets, 'app-icon.svg'), appFull);
fs.writeFileSync(path.join(assets, 'favicon.svg'), appSmall);
fs.writeFileSync(path.join(assets, 'uninstall-icon.svg'), uninstall);

const png = (s, size) => sharp(Buffer.from(s), { density: 384 }).resize(size, size).png().toBuffer();
const SMALL = new Set([16, 24, 32, 40, 48]);
const pick = (full, small, size) => (SMALL.has(size) ? small : full);

/** Writes a multi-size PNG-compressed .ico. */
async function ico(file, full, small, sizes) {
  const imgs = await Promise.all(sizes.map(async (s) => ({ s, buf: await png(pick(full, small, s), s) })));
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
  let offset = 6 + imgs.length * 16; const dir = [], data = [];
  for (const { s, buf } of imgs) {
    const e = Buffer.alloc(16); e.writeUInt8(s >= 256 ? 0 : s, 0); e.writeUInt8(s >= 256 ? 0 : s, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(offset, 12);
    dir.push(e); data.push(buf); offset += buf.length;
  }
  fs.writeFileSync(file, Buffer.concat([head, ...dir, ...data]));
}

const SIZES = [16, 24, 32, 48, 64, 128, 256];
await ico(path.join(out, 'icon.ico'), appFull, appSmall, SIZES);
await ico(path.join(out, 'uninstall.ico'), uninstall, uninstallSmall, SIZES);
for (const [name, size, s] of [['32x32.png', 32, appSmall], ['64x64.png', 64, appFull], ['128x128.png', 128, appFull], ['128x128@2x.png', 256, appFull], ['icon.png', 512, appFull]]) fs.writeFileSync(path.join(out, name), await png(s, size));
fs.writeFileSync(path.join(assets, 'app-icon-1024.png'), await png(appFull, 1024));
fs.writeFileSync(path.join(root, 'app/public/favicon.svg'), appSmall);
fs.writeFileSync(path.join(root, 'app/public/icon.png'), await png(appFull, 256));
for (const [n, s] of [['Square30x30Logo', 30], ['Square44x44Logo', 44], ['Square71x71Logo', 71], ['Square89x89Logo', 89], ['Square107x107Logo', 107], ['Square142x142Logo', 142], ['Square150x150Logo', 150], ['Square284x284Logo', 284], ['Square310x310Logo', 310], ['StoreLogo', 50]]) fs.writeFileSync(path.join(out, n + '.png'), await png(pick(appFull, appSmall, s), s));

// ICNS (macOS) with PNG payloads
const icnsTypes = [['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024]];
const chunks = [];
for (const [t, s] of icnsTypes) { const b = await png(pick(appFull, appSmall, s), s); const h = Buffer.alloc(8); h.write(t, 0, 'ascii'); h.writeUInt32BE(b.length + 8, 4); chunks.push(h, b); }
const body = Buffer.concat(chunks), hd = Buffer.alloc(8); hd.write('icns', 0, 'ascii'); hd.writeUInt32BE(body.length + 8, 4);
fs.writeFileSync(path.join(out, 'icon.icns'), Buffer.concat([hd, body]));

// Installer artwork (NSIS): sidebar 164x314 and header 150x57, converted to BMP below.
const inner = (s) => s.replace(/<defs>[\s\S]*?<\/defs>/, '').replace(/<\/?svg[^>]*>/g, '');
const sidebar = `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314"><defs>${DEFS}
  <linearGradient id="sb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eaf3ff"/><stop offset="1" stop-color="#c9defa"/></linearGradient></defs>
  <rect width="164" height="314" fill="url(#sb)"/>
  <circle cx="150" cy="40" r="90" fill="#3fa9ff" opacity=".18"/><circle cx="10" cy="300" r="110" fill="#0063c1" opacity=".14"/>
  <g transform="translate(22 52) scale(1.2)">${inner(appFull)}</g></svg>`;
const header = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="57" viewBox="0 0 150 57"><defs>${DEFS}</defs>
  <rect width="150" height="57" fill="#f9f9f9"/><g transform="translate(100 8) scale(.42)">${inner(appFull)}</g></svg>`;
fs.writeFileSync('/tmp/sidebar.png', await sharp(Buffer.from(sidebar), { density: 288 }).resize(164, 314).flatten({ background: '#eaf3ff' }).png().toBuffer());
fs.writeFileSync('/tmp/header.png', await sharp(Buffer.from(header), { density: 288 }).resize(150, 57).flatten({ background: '#f9f9f9' }).png().toBuffer());
execFileSync('python3', ['-c', `from PIL import Image
for src,dst in (('/tmp/sidebar.png','${out}/installer-sidebar.bmp'),('/tmp/header.png','${out}/installer-header.bmp')):
    Image.open(src).convert('RGB').save(dst,'BMP')`]);
console.log('icons ready');
