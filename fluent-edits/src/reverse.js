// Reverse: renders the used part of a video clip backwards with FFmpeg (desktop) and swaps the clip onto the new file.
import { state, getMedia, commit, emit, layout } from './store.js';
import { inTauri, ffmpegAvailable, ffmpegReverse, fileExists } from './io.js';
import { importPaths } from './media.js';
import { settings } from './settings.js';
import { stripExt } from './util.js';
import { t } from './i18n.js';

export const MAX_REVERSE_SECONDS = 120;
let busy = false;

export async function reverseClip(c, toast = () => {}) {
  if (busy || !c || c.kind !== 'video') return false;
  const m = getMedia(c.mediaId);
  if (!inTauri || !m || !m.path) { toast(t('rev.desktop'), 4600, 'warning'); return false; }
  const len = c.dur * (c.speed || 1);
  if (len > MAX_REVERSE_SECONDS) { toast(t('rev.long', { s: MAX_REVERSE_SECONDS }), 5200, 'warning'); return false; }
  if (!(await ffmpegAvailable())) { toast(t('rev.noffmpeg'), 6000, 'warning'); return false; }
  busy = true;
  try {
    const dir = (settings.export.dir || settings.export.lastDir || '').replace(/[\\/]+$/, '');
    const src = m.path;
    const sep = (dir || src).includes('\\') && !(dir || src).includes('/') ? '\\' : '/';
    const folder = dir || src.replace(/[\\/][^\\/]*$/, '');
    const base = `${stripExt(m.name)} reversed`;
    let target = `${folder}${sep}${base}.mp4`;
    for (let i = 1; (await fileExists(target)) && i < 500; i++) target = `${folder}${sep}${base} (${i}).mp4`;
    toast(t('rev.working'), 60000, 'info');
    await ffmpegReverse(src, target, c.in, len);
    const { added } = await importPaths([target]);
    if (!added[0]) throw new Error(t('rev.fail'));
    c.mediaId = added[0].id;
    c.in = 0;
    layout(); commit(); emit('change'); emit('inspect');
    toast(t('rev.done'), 3400, 'success');
    return true;
  } catch (e) {
    toast(t('toast.error', { msg: String(e && e.message || e) }), 7000, 'error');
    return false;
  } finally { busy = false; }
}
