// Removes files from earlier versions that no longer exist in this one (copying a new version over an old folder keeps them).
//   pnpm clean:stale
import { rmSync, existsSync } from 'node:fs';
const stale = [
  'src/components/dialogs/DupesDialog.tsx', 'src/components/dialogs/UsageDialog.tsx', 'src/components/dialogs/UpdateDialog.tsx',
  'src/lib/treemap.ts', 'src/fonts.css', 'src/assets/fonts', 'src/lib/folderStyle.ts', 'download/Material-File-Setup.exe'
];
for (const p of stale) { if (existsSync(p)) { rmSync(p, { recursive: true, force: true }); console.log('removed', p); } }
console.log('done');
