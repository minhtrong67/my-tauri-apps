// Saves media created inside the app (freeze frames, voice-overs) and adds it to the library.
import { inTauri, pickSavePath, writeBlob, fileExists } from './io.js';
import { importFiles, importPaths } from './media.js';
import { settings, saveSettings } from './settings.js';

const safe = (s) => String(s).replace(/[\\/:*?"<>|]/g, '_').trim() || 'media';

/**
 * Browser: imports the blob directly. Desktop: writes it into the export folder (or asks once where to put it)
 * so the project can reference it by path. Returns the new media item or null.
 */
export async function addGeneratedMedia(blob, base, ext) {
  const name = `${safe(base)}.${ext}`;
  if (!inTauri) {
    const { added } = await importFiles([new File([blob], name, { type: blob.type })]);
    return added[0] || null;
  }
  let target;
  const dir = settings.export.dir || settings.export.lastDir || '';
  if (dir) {
    const sep = dir.includes('\\') && !dir.includes('/') ? '\\' : '/';
    const join = (n) => dir.replace(/[\\/]+$/, '') + sep + n;
    target = join(name);
    for (let i = 1; (await fileExists(target)) && i < 500; i++) target = join(`${safe(base)} (${i}).${ext}`);
  } else {
    target = await pickSavePath(name, [{ name: ext.toUpperCase(), extensions: [ext] }]);
    if (!target) return null;
    settings.export.lastDir = target.replace(/[\\/][^\\/]*$/, '');
    saveSettings();
  }
  await writeBlob(target, blob);
  const { added } = await importPaths([target]);
  return added[0] || null;
}
