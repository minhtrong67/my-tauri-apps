import { tr } from '../i18n';
import { toTrack } from '../online';
import type { Core } from './core';
import type { GetFn, SetFn, OnlineSlice } from './types';

export const createOnlineSlice = (set: SetFn, get: GetFn, core: Core): OnlineSlice => ({
  loadingTrack: false,

  ensureOnline: (list) => {
    const now = Date.now();
    const tracks = list.map((o) => toTrack(o, now));
    set((s) => {
      const byId = { ...s.byId };
      for (const t of tracks) {
        const old = byId[t.id];
        // the user's choices (kept / since when) survive a new search that finds the same song again
        byId[t.id] = old ? { ...t, addedAt: old.addedAt, saved: old.saved } : t;
      }
      return { byId };
    });
    core.gcOnline();
    return tracks.map((t) => t.id);
  },

  playOnline: (list, start = 0) => {
    if (!list.length) return;
    const ids = get().ensureOnline(list);
    get().playTracks(ids, Math.min(Math.max(start, 0), ids.length - 1));
  },

  setOnlineSaved: (ids, saved) => {
    const todo = ids.filter((i) => get().byId[i]?.source);
    if (!todo.length) return;
    set((s) => {
      const byId = { ...s.byId };
      for (const i of todo) byId[i] = { ...byId[i], saved };
      return { byId };
    });
    get().showToast(saved ? tr('onlineSavedToast', { n: todo.length }) : tr('onlineUnsavedToast', { n: todo.length }), undefined, undefined, 'success');
  },
});
