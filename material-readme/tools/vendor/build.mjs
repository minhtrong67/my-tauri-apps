// Rebuilds the two bundled libraries used by the frontend.
//   cd tools/vendor && npm install && npm run build
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../src/vendor');

for (const [entry, file, name] of [
  ['entry-cm.js', 'codemirror.js', 'CM'],
  ['entry-theme.js', 'mcu.js', 'MCU'],
]) {
  await build({
    entryPoints: [path.join(here, entry)],
    outfile: path.join(out, file),
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: name,
    target: 'chrome105',
    legalComments: 'none',
    logLevel: 'info',
  });
}
