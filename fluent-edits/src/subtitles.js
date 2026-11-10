// Subtitles: import .srt / .vtt as text clips, export the text track as .srt.
import { state, commit, emit, layout, makeText } from './store.js';
import { inTauri, pickOpenPath, pickSavePath, readText, writeBlob } from './io.js';
import { stripExt } from './util.js';
import { t } from './i18n.js';

const toSec = (s) => {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(s.trim());
  if (!m) return NaN;
  return (+(m[1] || 0)) * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +m[4].padEnd(3, '0') / 1000 : 0);
};

/** Parses SRT or WebVTT into [{ start, dur, text }]. */
export function parseSubtitles(src) {
  const out = [];
  const blocks = String(src).replace(/^\uFEFF/, '').replace(/\r/g, '').split(/\n{2,}/);
  for (const b of blocks) {
    const lines = b.split('\n').filter((l) => l.trim() !== '');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, rest] = lines[i].split('-->');
    const start = toSec(a), end = toSec(rest.trim().split(/\s+/)[0]);
    const text = lines.slice(i + 1).join('\n').replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').trim();
    if (!isFinite(start) || !isFinite(end) || end <= start || !text) continue;
    out.push({ start, dur: Math.max(0.1, end - start), text });
  }
  return out;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
const stamp = (x) => {
  const ms = Math.round(x * 1000);
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

export function buildSrt(clips = state.text) {
  return [...clips].sort((a, b) => a.start - b.start).map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.start + c.dur)}\n${String(c.text).trim()}\n`).join('\n');
}

function pickBrowserFile() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.srt,.vtt,.txt';
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.oncancel = () => resolve(null);
    inp.click();
  });
}

/** Adds one caption text clip per cue. Returns the number of clips created (0 when nothing was read). */
export function addCues(cues) {
  const made = [];
  for (const q of cues) {
    const c = makeText('caption', q.start);
    c.text = q.text; c.dur = q.dur;
    state.text.push(c);
    made.push(c);
  }
  if (made.length) { layout(); commit(); emit('change'); }
  return made.length;
}

export async function importSubtitles(toast = () => {}) {
  try {
    let text;
    if (inTauri) {
      const p = await pickOpenPath([{ name: 'Subtitles', extensions: ['srt', 'vtt', 'txt'] }]);
      if (!p) return false;
      text = await readText(p);
    } else {
      const f = await pickBrowserFile();
      if (!f) return false;
      text = await f.text();
    }
    const n = addCues(parseSubtitles(text));
    if (!n) { toast(t('sub.none'), 4200, 'warning'); return false; }
    toast(t('sub.imported', { n }), 3400, 'success');
    return true;
  } catch (e) { toast(t('toast.error', { msg: e.message || e }), 6000, 'error'); return false; }
}

export async function exportSubtitles(toast = () => {}) {
  if (!state.text.length) { toast(t('sub.empty'), 3600, 'warning'); return false; }
  try {
    const name = `${stripExt(state.name) || t('project.untitled')}.srt`;
    const target = await pickSavePath(name, [{ name: 'SubRip', extensions: ['srt'] }]);
    if (!target) return false;
    await writeBlob(target, new Blob([buildSrt()], { type: 'text/plain' }));
    toast(t('sub.exported', { name: String(target).split(/[\\/]/).pop() }), 3400, 'success');
    return true;
  } catch (e) { toast(t('toast.error', { msg: e.message || e }), 6000, 'error'); return false; }
}
