// Keyframes: animate opacity / scale / position / rotation of a clip over its own timeline.
// A clip stores `kf = { scale: [{ t, v }, …], x: […] }` where `t` is seconds from the clip start.
// Without keyframes a property keeps using the plain value (c.scale, c.x …), so old projects are unaffected.
import { state } from './store.js';

export const KF_KEYS = ['opacity', 'scale', 'x', 'y', 'rot'];
const EPS = 0.04;                                   // two keyframes closer than this are the same one
const smooth = (u) => u * u * (3 - 2 * u);          // ease in-out between two keyframes

export const kfHas = (c, key) => !!(c.kf && c.kf[key] && c.kf[key].length);
export const kfAny = (c) => !!c.kf && KF_KEYS.some((k) => kfHas(c, k));

/** Value of `key` at local time `lt` (seconds from clip start). */
export function kfGet(c, key, lt, fallback) {
  const a = c.kf && c.kf[key];
  if (!a || !a.length) return c[key] ?? fallback;
  if (lt <= a[0].t) return a[0].v;
  const last = a[a.length - 1];
  if (lt >= last.t) return last.v;
  let i = 1;
  while (a[i].t < lt) i++;
  const p = a[i - 1], n = a[i];
  return p.v + (n.v - p.v) * smooth((lt - p.t) / (n.t - p.t));
}

/** Playhead position relative to the clip, clamped to the clip. */
export const localT = (c) => Math.min(Math.max(state.t - c.start, 0), c.dur);

/** Current value of a property (animated or plain) at the playhead. */
export const propGet = (c, key, fallback) => kfGet(c, key, localT(c), fallback);

/** Writes a property: updates the keyframe at the playhead if the property is animated, else the plain value. */
export function propSet(c, key, v) {
  if (kfHas(c, key)) kfSet(c, key, localT(c), v);
  else c[key] = v;
}

const idxAt = (a, lt) => a.findIndex((k) => Math.abs(k.t - lt) < EPS);
export const kfAt = (c, key, lt = localT(c)) => kfHas(c, key) && idxAt(c.kf[key], lt) >= 0;

export function kfSet(c, key, lt, v) {
  c.kf ||= {};
  const a = (c.kf[key] ||= []);
  const i = idxAt(a, lt);
  if (i >= 0) a[i].v = v;
  else { a.push({ t: Math.round(lt * 100) / 100, v }); a.sort((x, y) => x.t - y.t); }
}

/** Adds a keyframe at the playhead (holding the current value) or removes the one that is there. Returns true if added. */
export function kfToggle(c, key, lt = localT(c)) {
  const a = c.kf && c.kf[key];
  const i = a ? idxAt(a, lt) : -1;
  if (i >= 0) {
    const v = a[i].v;
    a.splice(i, 1);
    if (!a.length) { c[key] = v; delete c.kf[key]; if (!Object.keys(c.kf).length) delete c.kf; }
    return false;
  }
  const v = kfGet(c, key, lt);
  kfSet(c, key, lt, v);
  return true;
}

export function kfClear(c, key) {
  if (!c.kf) return;
  if (key) delete c.kf[key]; else c.kf = {};
  if (!Object.keys(c.kf).length) delete c.kf;
}

/** Sorted unique keyframe times of every animated property (for the timeline diamonds). */
export function kfTimes(c) {
  if (!c.kf) return [];
  const set = new Set();
  for (const k of KF_KEYS) for (const p of c.kf[k] || []) set.add(p.t);
  return [...set].sort((a, b) => a - b);
}

/** Splits the keyframes of `left` at local time `cut`; `right` receives the rest, re-based to its own start. */
export function kfSplit(left, right, cut) {
  if (!left.kf) return;
  const L = {}, R = {};
  for (const k of KF_KEYS) {
    const a = left.kf[k];
    if (!a || !a.length) continue;
    const v = kfGet(left, k, cut);
    L[k] = a.filter((p) => p.t < cut - 0.001).concat([{ t: cut, v }]);
    R[k] = [{ t: 0, v }].concat(a.filter((p) => p.t > cut + 0.001).map((p) => ({ t: Math.round((p.t - cut) * 100) / 100, v: p.v })));
  }
  left.kf = L; right.kf = R;
}

/** Drops keyframes that fall after the clip end (after trimming) and keeps the last value at the new end. */
export function kfTrim(c) {
  if (!c.kf) return;
  for (const k of KF_KEYS) {
    const a = c.kf[k];
    if (!a) continue;
    const kept = a.filter((p) => p.t <= c.dur + 0.001);
    if (kept.length !== a.length) kept.push({ t: c.dur, v: kfGet(c, k, c.dur) });
    c.kf[k] = kept.length ? kept : a.slice(0, 1);
  }
}

/** A copy of `kf` with every keyframe moved by `delta` seconds (used when the start of a clip is trimmed). */
export function kfShifted(kf, delta) {
  if (!kf) return kf;
  const out = {};
  for (const k of Object.keys(kf)) out[k] = kf[k].map((p) => ({ t: Math.round((p.t + delta) * 100) / 100, v: p.v }));
  return out;
}
