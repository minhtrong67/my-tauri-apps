// Checks that English and Vietnamese have the same keys, that no text is empty and that {placeholders} match.
// Usage: npm run check:i18n
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/lib/i18n.ts'), 'utf8');

function block(start) {
  const i = src.indexOf(start);
  if (i < 0) throw new Error(`Cannot find "${start}" in i18n.ts`);
  const end = src.indexOf('\n};', i);
  return src.slice(i, end);
}
function entries(text) {
  const map = new Map();
  for (const m of text.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*("(?:[^"\\]|\\.)*")\s*,?\s*$/gm)) map.set(m[1], JSON.parse(m[2]));
  return map;
}

const en = entries(block('const en = {'));
const vi = entries(block('const vi: Record<Key, string> = {'));
const holders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
let problems = 0;
const bad = (msg) => { problems += 1; console.error(`✗ ${msg}`); };

for (const k of en.keys()) if (!vi.has(k)) bad(`"${k}" is missing in Vietnamese`);
for (const k of vi.keys()) if (!en.has(k)) bad(`"${k}" exists only in Vietnamese`);
for (const [k, v] of en) {
  if (!v.trim()) bad(`"${k}" is empty in English`);
  const t = vi.get(k);
  if (t !== undefined && !t.trim()) bad(`"${k}" is empty in Vietnamese`);
  if (t !== undefined && holders(v) !== holders(t)) bad(`"${k}": placeholders differ (en {${holders(v)}} / vi {${holders(t)}})`);
}

// keys that no source file mentions (informational only: some are built dynamically)
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f.name) && !p.endsWith('i18n.ts')) files.push(fs.readFileSync(p, 'utf8'));
  }
})(path.join(root, 'src'));
const all = files.join('\n');
const unused = [...en.keys()].filter((k) => !all.includes(`'${k}'`) && !all.includes(`"${k}"`) && !all.includes(`\`${k}\``));
if (unused.length) console.log(`ℹ ${unused.length} keys are not referenced literally (may be built dynamically): ${unused.slice(0, 12).join(', ')}${unused.length > 12 ? ', …' : ''}`);

console.log(`${en.size} English / ${vi.size} Vietnamese texts checked.`);
if (problems) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log('✓ i18n is consistent');
