import { engine } from '../audio';
import { tr, setActiveLang, resolveLang, type ActiveLang } from '../i18n';
import * as api from '../tauri';
import { setFullscreen, win } from '../window';
import { buildM3U, parseM3U } from '../m3u';
import { basename, natural, shuffled, stripExt, uid, norm } from '../utils';
import { defaultSettings, type RepeatMode, type Track } from '../types';
import { pathKey, sortTracksNatural } from './helpers';
import type { Core } from './core';
import type { GetFn, SetFn, State, UiSlice } from './types';

/** Re-enable window-size memory shortly after leaving fullscreen / mini player (once the window has settled) */
let retrackTimer: number | undefined;

export const createUiSlice = (set: SetFn, get: GetFn, core: Core): UiSlice => {
  const { subscribe, flags, snapshot, fixSettings, retrack, pushTrayLabels, relabelUnknown, snapshotLibrary, snapshotUser, applySnapshot, remapState, mergeTracks, dedupeLibrary, knownFiles, ingest, sortedIds, upsertFolderPlaylist, pruneMissing, addFolder, playCurrentIndex, scheduleSave, syncNext, allowLibrary, syncWatchers } = core;
  return {
    view: { name: 'home' },
    backStack: [],
    query: '',
    showQueue: false,
    showNowPlaying: false,
    navCollapsed: false,
    miniMode: false,
    fullscreen: false,
    viewModes: {},
    dragOver: false,
    toast: null,
    dialog: null,
    menu: null,

    set: (p) => set(p),
    nav: (v) =>
      set((s) => ({
        view: v,
        backStack: [...s.backStack.slice(-19), s.view],
        query: '',
        showNowPlaying: false,
      })),
    back: () =>
      set((s) => {
        const prev = s.backStack[s.backStack.length - 1];
        if (!prev) return {};
        return { view: prev, backStack: s.backStack.slice(0, -1), query: '' };
      }),
    setQuery: (q) => set({ query: q }),
    showToast: (text, actionLabel, action, kind = 'info') => {
      const id = Date.now();
      const dur = actionLabel ? 6000 : kind === 'error' ? 5000 : 3500;
      set({ toast: { id, text, kind, dur, actionLabel, action } });
      window.setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, dur);
    },
    openDialog: (d) => set({ dialog: d }),
    openMenu: (x, y, items) => set({ menu: { x, y, items } }),
    closeMenu: () => set({ menu: null }),

    setViewMode: (key, mode) => set((s) => ({ viewModes: { ...s.viewModes, [key]: mode } })),

    toggleFullscreen: async (on) => {
      if (get().miniMode) return;
      const v = on ?? !get().fullscreen;
      window.clearTimeout(retrackTimer);
      if (v) await api.setWindowTracking(false);
      await setFullscreen(v).catch(() => undefined);
      set({ fullscreen: v });
      if (!v) retrackTimer = window.setTimeout(retrack, 700);
    },
  };
};
