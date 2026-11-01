// Generates the Material 3 Expressive icon set: app icon, uninstall icon, installer images, favicon and social image.
// Needs `sharp` (npm i -D sharp) and Python Pillow for the BMP files. Run: node tools/icons/make-icons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'src-tauri/icons'), assets = path.join(root, 'assets');
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(assets, { recursive: true });

// Raspberry pink (Material pink 600) is the seed colour of the app and of its icon.
const C = { primary: '#D81B60', deep: '#9E0F45', container: '#FFD9E3', onContainer: '#5C0A2C', tertiary: '#FFB300', surface: '#FFF8F8' };

const cookie = (R = 45, lobes = 12, amp = 3.6, cx = 50, cy = 50, steps = 240) => {
  let d = '';
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * Math.PI * 2, r = R + amp * Math.cos(lobes * a); d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2); }
  return d + 'Z';
};
const GLYPH = 'M33 62V40l9 11.5L51 40v22M64 40v21M58.5 55.5 64 61l5.5-5.5';
const svg = (body, size = 100) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${body}</svg>`;

/** Full app icon: scalloped cookie, a tonal "page" with the M-down mark, and a tertiary spark. */
const appFull = svg(`
  <path d="${cookie()}" fill="${C.primary}"/>
  <path d="${cookie(41, 12, 3.2)}" fill="#E8457F" opacity=".55"/>
  <rect x="27" y="29" width="46" height="52" rx="13" fill="${C.deep}" opacity=".35"/>
  <rect x="27" y="25" width="46" height="52" rx="13" fill="${C.container}"/>
  <path d="${GLYPH}" fill="none" stroke="${C.onContainer}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="73" cy="27" r="7.5" fill="${C.tertiary}"/>`);
/** Small sizes: no page, bolder mark, so it stays readable at 16 to 32 px. */
const appSmall = svg(`
  <path d="${cookie(46, 10, 4.4)}" fill="${C.primary}"/>
  <path d="M27 69V31l15 19.5L57 31v38M72 31v37M63 59.5 72 69l9-9.5" transform="translate(-2 0) scale(.96) translate(2 2)" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`);
/** Uninstall icon: same cookie in a muted tone with a bin. */
const BIN = 'M30 38h40M42 38V31a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7M35 38l3 33a4 4 0 0 0 4 3.5h16a4 4 0 0 0 4-3.5l3-33M45 48v18M55 48v18';
const uninstall = svg(`
  <path d="${cookie()}" fill="#6E4A58"/>
  <path d="${cookie(41, 12, 3.2)}" fill="#8A6070" opacity=".5"/>
  <path d="${BIN}" fill="none" stroke="#FFD9E3" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="75" cy="25" r="9" fill="#BA1A3A"/><path d="M71 21l8 8M79 21l-8 8" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>`);
const uninstallSmall = svg(`
  <path d="${cookie(46, 10, 4.4)}" fill="#6E4A58"/>
  <path d="${BIN}" transform="translate(50 52) scale(1.12) translate(-50 -52)" fill="none" stroke="#FFD9E3" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);

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

// Installer artwork (NSIS): sidebar 164x314 and header 150x57, saved as PNG here and converted to BMP below.
const sidebar = `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
  <rect width="164" height="314" fill="${C.container}"/>
  <g transform="translate(-40 150) scale(2.4)"><path d="${cookie(45, 12, 3.6, 50, 50)}" fill="${C.primary}" opacity=".16"/></g>
  <g transform="translate(60 -20) scale(1.5)"><path d="${cookie(45, 8, 5, 50, 50)}" fill="#FFB300" opacity=".28"/></g>
  <g transform="translate(32 34) scale(1)"><svg width="100" height="100" viewBox="0 0 100 100">${appFull.replace(/<\/?svg[^>]*>/g, '')}</svg></g>
</svg>`;
const header = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="57" viewBox="0 0 150 57">
  <rect width="150" height="57" fill="${C.surface}"/>
  <g transform="translate(96 5) scale(.47)"><path d="${cookie(45, 12, 3.6, 50, 50)}" fill="${C.container}"/></g>
  <g transform="translate(101 8)"><svg width="42" height="42" viewBox="0 0 100 100">${appFull.replace(/<\/?svg[^>]*>/g, '')}</svg></g>
</svg>`;
fs.writeFileSync('/tmp/sidebar.png', await sharp(Buffer.from(sidebar), { density: 288 }).resize(164, 314).flatten({ background: C.container }).png().toBuffer());
fs.writeFileSync('/tmp/header.png', await sharp(Buffer.from(header), { density: 288 }).resize(150, 57).flatten({ background: C.surface }).png().toBuffer());
execFileSync('python3', ['-c', `from PIL import Image
for src,dst in (('/tmp/sidebar.png','${out}/installer-sidebar.bmp'),('/tmp/header.png','${out}/installer-header.bmp')):
    Image.open(src).convert('RGB').save(dst,'BMP')`]);

// Social share image 1200x630 for the landing page
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${C.surface}"/>
  <g transform="translate(640 -120) scale(7.4)"><path d="${cookie(45, 12, 3.6, 50, 50)}" fill="${C.container}"/></g>
  <g transform="translate(900 330) scale(3.2)"><path d="${cookie(45, 8, 5, 50, 50)}" fill="#FFB300" opacity=".35"/></g>
  <g transform="translate(762 135) scale(3.6)"><svg width="100" height="100" viewBox="0 0 100 100">${appFull.replace(/<\/?svg[^>]*>/g, '')}</svg></g>
  <text x="80" y="270" font-family="DejaVu Sans, Arial, sans-serif" font-weight="800" font-size="84" fill="#3B0A1E">Material</text>
  <text x="80" y="360" font-family="DejaVu Sans, Arial, sans-serif" font-weight="800" font-size="84" fill="${C.primary}">Readme</text>
  <text x="80" y="430" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" fill="#5F4B52">Write and preview Markdown</text>
  <text x="80" y="472" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" fill="#5F4B52">in Material 3 Expressive.</text>
</svg>`;
fs.writeFileSync(path.join(assets, 'og-image.png'), await sharp(Buffer.from(og), { density: 144 }).resize(1200, 630).png().toBuffer());
console.log('icons ready');
