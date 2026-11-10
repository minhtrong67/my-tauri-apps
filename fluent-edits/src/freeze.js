// Freeze frame: holds the picture under the playhead for a few seconds by splitting the main track and inserting a still.
import { state, dims, makeClip, insertMain, select, splitAt } from './store.js';
import { drawMainLayer } from './engine.js';
import { addGeneratedMedia } from './assets.js';
import { stripExt } from './util.js';
import { t } from './i18n.js';

export const FREEZE_SECONDS = 2;

export async function freezeFrame(toast = () => {}) {
  const tt = state.t;
  const inside = state.main.find((c) => tt > c.start + 0.05 && tt < c.start + c.dur - 0.05);
  const atEdge = !inside && state.main.find((c) => Math.abs(c.start - tt) <= 0.05);
  if (!inside && !atEdge) { toast(t('freeze.none'), 3600, 'warning'); return false; }
  try {
    const [W, H] = dims(1080);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    drawMainLayer(cv.getContext('2d', { alpha: false }), W, H, Math.min(tt, inside ? tt : atEdge.start + 0.001), null);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    if (!blob) throw new Error('PNG');
    const base = `${stripExt(state.name) || t('project.untitled')} freeze ${tt.toFixed(2)}s`;
    const media = await addGeneratedMedia(blob, base, 'png');
    if (!media) return false;
    const still = makeClip(media, 'main', 0);
    still.dur = FREEZE_SECONDS;
    let index;
    if (inside) { select('main', inside.id); splitAt(tt); index = state.main.findIndex((c) => state.sel && c.id === state.sel.id); if (index < 0) index = state.main.length; }
    else index = state.main.indexOf(atEdge);
    insertMain(still, index);
    toast(t('freeze.done', { s: FREEZE_SECONDS }), 3200, 'success');
    return true;
  } catch (e) { toast(t('toast.error', { msg: e.message || e }), 6000, 'error'); return false; }
}
