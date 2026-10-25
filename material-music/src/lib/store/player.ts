import { engine } from '../audio';
import { tr, setActiveLang, resolveLang, type ActiveLang } from '../i18n';
import * as api from '../tauri';
import { win } from '../window';
import { buildM3U, parseM3U } from '../m3u';
import { basename, natural, shuffled, stripExt, uid, norm } from '../utils';
import { defaultSettings, type RepeatMode, type Track } from '../types';
import { pathKey, sortTracksNatural } from './helpers';
import type { Core } from './core';
import type { GetFn, SetFn, State, PlayerSlice } from './types';


export const createPlayerSlice = (set: SetFn, get: GetFn, core: Core): PlayerSlice => {
  const { subscribe, flags, snapshot, fixSettings, retrack, pushTrayLabels, relabelUnknown, snapshotLibrary, snapshotUser, applySnapshot, remapState, mergeTracks, dedupeLibrary, knownFiles, ingest, sortedIds, upsertFolderPlaylist, pruneMissing, addFolder, playCurrentIndex, scheduleSave, syncNext, allowLibrary, syncWatchers } = core;
  return {
    queue: [],
    baseQueue: [],
    index: -1,
    isPlaying: false,
    position: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off',
    sleepAt: null,
    sleepEndOfTrack: false,

    playTracks: (ids, start = 0, forceShuffle) => {
      if (!ids.length) return;
      const s = get();
      const shuffleOn = forceShuffle ?? s.shuffle;
      let queue = ids;
      let index = start;
      if (shuffleOn) {
        const first = ids[start];
        queue = [first, ...shuffled(ids.filter((_, i) => i !== start))];
        index = 0;
      }
      set({ queue, baseQueue: ids, shuffle: shuffleOn });
      get().playIndex(index);
    },
    playIndex: (i) => {
      const s = get();
      const id = s.queue[i];
      const t = s.byId[id];
      if (!t) return;
      playCurrentIndex(i, true);
      set((st) => ({
        isPlaying: true,
        plays: { ...st.plays, [id]: (st.plays[id] ?? 0) + 1 },
        history: [{ id, at: Date.now() }, ...st.history.filter((h) => h.id !== id)].slice(0, 200),
      }));
    },
    togglePlay: () => {
      const s = get();
      if (s.index < 0 || !s.queue.length) {
        const all = sortTracksNatural(Object.values(s.byId));
        if (all.length) get().playTracks(all.map((t) => t.id), 0);
        return;
      }
      if (!engine.path) playCurrentIndex(s.index, true);
      else engine.toggle();
    },
    next: (auto = false) => {
      const { queue, index, repeat } = get();
      if (!queue.length) return;
      let i = index + 1;
      if (i >= queue.length) {
        if (repeat === 'all') i = 0;
        else {
          if (auto) {
            engine.pause();
            engine.seek(0);
            set({ isPlaying: false });
          }
          return;
        }
      }
      get().playIndex(i);
    },
    prev: () => {
      const { queue, index, repeat } = get();
      if (!queue.length) return;
      if (engine.audio.currentTime > 3 || (index <= 0 && repeat !== 'all')) {
        engine.seek(0);
        return;
      }
      get().playIndex(index <= 0 ? queue.length - 1 : index - 1);
    },
    seek: (t) => {
      engine.seek(t);
      set({ position: t });
    },
    setVolume: (v) => {
      set((s) => ({ settings: { ...s.settings, volume: v, muted: false } }));
      engine.setVolume(v, false);
    },
    toggleMute: () => {
      const s = get().settings;
      set({ settings: { ...s, muted: !s.muted } });
      engine.setVolume(s.volume, !s.muted);
    },
    toggleShuffle: () => {
      const s = get();
      const cur = s.queue[s.index];
      if (!s.shuffle) {
        const rest = s.queue.filter((_, i) => i !== s.index);
        set({ shuffle: true, queue: cur ? [cur, ...shuffled(rest)] : shuffled(rest), index: cur ? 0 : -1 });
      } else {
        const base = s.baseQueue.length ? s.baseQueue : s.queue;
        set({ shuffle: false, queue: base, index: cur ? base.indexOf(cur) : -1 });
      }
    },
    cycleRepeat: () => set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),
    playNext: (ids) => {
      const s = get();
      if (s.index < 0) return get().playTracks(ids, 0);
      const q = [...s.queue];
      q.splice(s.index + 1, 0, ...ids);
      set({ queue: q, baseQueue: [...s.baseQueue, ...ids] });
      get().showToast(ids.length > 1 ? tr('willPlayNextN', { n: ids.length }) : tr('willPlayNext'), undefined, undefined, 'success');
    },
    addToQueue: (ids) => {
      const s = get();
      if (s.index < 0) return get().playTracks(ids, 0);
      set({ queue: [...s.queue, ...ids], baseQueue: [...s.baseQueue, ...ids] });
      get().showToast(ids.length > 1 ? tr('addedToQueueN', { n: ids.length }) : tr('addedToQueue'), undefined, undefined, 'success');
    },
    removeFromQueue: (i) =>
      set((s) => {
        if (i === s.index) return {};
        const id = s.queue[i];
        const queue = s.queue.filter((_, k) => k !== i);
        const bi = s.baseQueue.indexOf(id);
        const baseQueue = bi >= 0 ? [...s.baseQueue.slice(0, bi), ...s.baseQueue.slice(bi + 1)] : s.baseQueue;
        return { queue, baseQueue, index: i < s.index ? s.index - 1 : s.index };
      }),
    moveInQueue: (from, to) =>
      set((s) => {
        if (from === to) return {};
        const q = [...s.queue];
        const [m] = q.splice(from, 1);
        q.splice(to, 0, m);
        const cur = s.queue[s.index];
        return { queue: q, index: q.indexOf(cur) };
      }),
    clearQueue: () =>
      set((s) => {
        const cur = s.queue[s.index];
        return cur ? { queue: [cur], baseQueue: [cur], index: 0 } : { queue: [], baseQueue: [], index: -1 };
      }),
    setSleep: (m) => {
      if (m === null) set({ sleepAt: null, sleepEndOfTrack: false });
      else if (m === 'track') set({ sleepAt: null, sleepEndOfTrack: true });
      else set({ sleepAt: Date.now() + m * 60000, sleepEndOfTrack: false });
    },
  };
};
