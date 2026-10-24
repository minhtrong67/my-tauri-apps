import { engine } from '../audio';
import { tr, setActiveLang, resolveLang, type ActiveLang } from '../i18n';
import * as api from '../tauri';
import { setFullscreen, win } from '../window';
import { buildM3U, parseM3U } from '../m3u';
import { basename, natural, shuffled, stripExt, uid, norm } from '../utils';
import { defaultSettings, type RepeatMode, type Track } from '../types';
import { pathKey, sortTracksNatural } from './helpers';
import type { Core } from './core';
import type { GetFn, SetFn, State, LibrarySlice } from './types';


export const createLibrarySlice = (set: SetFn, get: GetFn, core: Core): LibrarySlice => {
  const { subscribe, flags, snapshot, fixSettings, retrack, pushTrayLabels, relabelUnknown, snapshotLibrary, snapshotUser, applySnapshot, remapState, mergeTracks, dedupeLibrary, knownFiles, ingest, sortedIds, upsertFolderPlaylist, pruneMissing, addFolder, playCurrentIndex, scheduleSave, syncNext, allowLibrary, syncWatchers } = core;
  return {
    byId: {},
    history: [],
    plays: {},
    scanning: null,
    syncing: false,

    importFolder: async () => {
      const dir = await api.pickFolder();
      if (dir) await addFolder(dir, false);
    },
    importFiles: async () => {
      const files = await api.pickFiles();
      if (!files.length) return;
      const res = await ingest(files); // đọc lại và ghi đè nếu bài đã có
      if (!res) return;
      const { added, updated } = mergeTracks(res.tracks);
      const ids = res.found.map((f) => f.id);
      get().showToast(
        updated ? tr('filesMerged', { added, updated }) : tr('filesAdded', { n: added }),
        tr('playNow'),
        () => get().playTracks(ids, 0),
      );
    },
    openPaths: async (paths, play) => {
      const dirs: string[] = [];
      const files: string[] = [];
      for (const p of paths) ((await api.isDir(p)) ? dirs : files).push(p);
      for (const d of dirs) await addFolder(d, play && dirs.length === 1 && files.length === 0);
      if (files.length) {
        const res = await ingest(files);
        if (!res) return;
        if (!res.found.length) {
          get().showToast(tr('noAudioSupported'));
          return;
        }
        mergeTracks(res.tracks);
        if (play) get().playTracks(res.found.map((f) => f.id), 0);
      }
    },
    rescanPlaylist: async (id) => {
      const pl = get().playlists.find((p) => p.id === id);
      if (!pl?.folder) return;
      if (!(await api.isDir(pl.folder))) {
        get().showToast(tr('folderUnreachable'));
        return;
      }
      const res = await ingest([pl.folder], { known: knownFiles() });
      if (!res) return;
      mergeTracks(res.tracks);
      const ids = sortedIds(res.found.map((f) => f.id));
      set((s) => ({ playlists: s.playlists.map((p) => (p.id === id ? { ...p, trackIds: ids } : p)) }));
      const removed = await pruneMissing();
      get().showToast(tr('rescanned', { name: pl.name, n: ids.length, extra: removed ? tr('rescannedRemoved', { n: removed }) : '' }));
    },

    syncLibrary: async (silent = false, force = false) => {
      if (flags.syncing) return;
      flags.syncing = true;
      set({ syncing: true });
      try {
        const s0 = get();
        let musicDir: string | null = null;
        if (s0.settings.autoScanMusic || force) {
          try {
            musicDir = await api.getMusicDir();
          } catch {
            /* ignore */
          }
        }
        const roots: string[] = [];
        const addRoot = (d?: string | null) => {
          if (d && !roots.some((r) => pathKey(r) === pathKey(d))) roots.push(d);
        };
        addRoot(musicDir);
        s0.playlists.forEach((p) => addRoot(p.folder));

        let added = 0;
        let updated = 0;
        for (const root of roots) {
          if (!(await api.isDir(root))) continue; // thư mục/ổ đĩa không truy cập được: giữ nguyên dữ liệu
          const res = await ingest([root], { known: knownFiles(), quiet: silent });
          if (!res) continue;
          const m = mergeTracks(res.tracks);
          added += m.added;
          updated += m.updated;
          const ids = sortedIds(res.found.map((f) => f.id));
          const isMusic = !!musicDir && pathKey(root) === pathKey(musicDir);
          const hasPlaylist = get().playlists.some((p) => p.folder && pathKey(p.folder) === pathKey(root));
          if (hasPlaylist || (isMusic && !get().settings.musicSeeded && ids.length)) {
            upsertFolderPlaylist(root, ids);
            if (isMusic && !hasPlaylist) set((st) => ({ settings: { ...st.settings, musicSeeded: true } }));
          }
        }
        const removed = await pruneMissing();
        const parts = [added && tr('libAdded', { n: added }), !silent && updated && tr('libUpdated', { n: updated }), removed && tr('libRemoved', { n: removed })].filter(Boolean);
        if (parts.length) get().showToast(`${tr('libraryWord')}: ${parts.join(', ')}`);
        else if (!silent) get().showToast(tr('libUpToDate'));
      } finally {
        flags.syncing = false;
        set({ syncing: false });
      }
    },
    rescanAll: async () => get().syncLibrary(false, true),
    removeMissing: async () => {
      const n = await pruneMissing();
      get().showToast(n ? tr('removedMissing', { n }) : tr('noMissing'));
    },
    removeTracks: (ids) => {
      const rm = new Set(ids);
      set((s) => {
        const byId = { ...s.byId };
        ids.forEach((i) => delete byId[i]);
        const cur = s.queue[s.index];
        const queue = s.queue.filter((x) => !rm.has(x));
        const index = cur && !rm.has(cur) ? queue.indexOf(cur) : Math.min(s.index, queue.length - 1);
        const liked = { ...s.liked };
        ids.forEach((i) => delete liked[i]);
        return {
          byId,
          liked,
          queue,
          baseQueue: s.baseQueue.filter((x) => !rm.has(x)),
          index,
          history: s.history.filter((h) => !rm.has(h.id)),
          playlists: s.playlists.map((p) => ({ ...p, trackIds: p.trackIds.filter((x) => !rm.has(x)) })),
        };
      });
      const st = get();
      if (st.index < 0 || !st.queue.length) {
        engine.pause();
        set({ index: -1, isPlaying: false, position: 0, duration: 0 });
      } else if (engine.path && st.byId[st.queue[st.index]]?.path !== engine.path) {
        // the song that was playing is gone: load the one that took its place (keep playing only if music was playing)
        playCurrentIndex(st.index, st.isPlaying);
      }
    },
    clearLibrary: () => {
      engine.pause();
      set({ byId: {}, playlists: [], liked: {}, history: [], plays: {}, queue: [], baseQueue: [], index: -1, isPlaying: false, position: 0, duration: 0 });
      get().showToast(tr('libraryCleared'));
    },

    editTags: async (id, edit) => {
      const t = get().byId[id];
      if (!t) return false;
      try {
        const fresh = await api.writeTags(t.path, edit);
        mergeTracks([fresh]);
        get().showToast(tr('tagsSaved'));
        return true;
      } catch (e) {
        get().showToast(tr('tagsFailed', { e: String(e) }));
        return false;
      }
    },
    setTrackCover: (id, file) => set((s) => (s.byId[id] ? { byId: { ...s.byId, [id]: { ...s.byId[id], cover: file, hasCover: true } } } : {})),
  };
};
