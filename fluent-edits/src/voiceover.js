// Voice-over: record the microphone while the project plays, then drop the take on the audio track at the start point.
import { state, makeClip, addClip } from './store.js';
import * as engine from './engine.js';
import { addGeneratedMedia } from './assets.js';
import { stripExt } from './util.js';
import { t } from './i18n.js';

let rec = null; // { mr, stream, chunks, from, tick }

export const isRecording = () => !!rec;

function wavBlob(buf) {
  const ch = Math.min(buf.numberOfChannels, 2), len = buf.length, rate = buf.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, rate, true); data.setUint32(28, rate * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
  w(36, 'data'); data.setUint32(40, len * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Blob([data], { type: 'audio/wav' });
}

async function toWav(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  try { return wavBlob(await ctx.decodeAudioData(await blob.arrayBuffer())); } finally { ctx.close(); }
}

/** Start / stop. `onState(recording, seconds)` lets the toolbar button show progress. */
export async function toggleVoiceOver(toast = () => {}, onState = () => {}) {
  if (rec) return stop(toast, onState);
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no-mic');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mr = new MediaRecorder(stream);
    const chunks = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const from = state.t;
    rec = { mr, stream, chunks, from, tick: 0, t0: performance.now() };
    mr.start(250);
    if (!state.playing) engine.play();
    rec.tick = setInterval(() => onState(true, (performance.now() - rec.t0) / 1000), 200);
    onState(true, 0);
    toast(t('vo.recording'), 3200, 'info');
    return true;
  } catch (e) {
    rec = null; onState(false, 0);
    toast(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? t('vo.denied') : e && /no-mic|NotFound/.test(e.message + e.name) ? t('vo.nomic') : t('toast.error', { msg: e.message || e }), 5200, 'error');
    return false;
  }
}

async function stop(toast, onState) {
  const r = rec; rec = null;
  clearInterval(r.tick);
  engine.pause();
  const done = new Promise((res) => { r.mr.onstop = res; });
  if (r.mr.state !== 'inactive') r.mr.stop();
  await done;
  r.stream.getTracks().forEach((k) => k.stop());
  onState(false, 0);
  try {
    const raw = new Blob(r.chunks, { type: r.mr.mimeType || 'audio/webm' });
    if (raw.size < 800) return false;
    const wav = await toWav(raw);
    const media = await addGeneratedMedia(wav, `${stripExt(state.name) || t('project.untitled')} voice-over`, 'wav');
    if (!media) return false;
    const clip = makeClip(media, 'audio', r.from);
    clip.start = r.from;
    addClip('audio', clip);
    engine.seek(r.from);
    toast(t('vo.saved'), 3200, 'success');
    return true;
  } catch (e) { toast(t('toast.error', { msg: e.message || e }), 6000, 'error'); return false; }
}
