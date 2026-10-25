import { engine } from '../audio';
import { tr, setActiveLang, resolveLang, type ActiveLang } from '../i18n';
import * as api from '../tauri';
import { win } from '../window';
import { buildM3U, parseM3U } from '../m3u';
import { basename, natural, shuffled, stripExt, uid, norm } from '../utils';
import { defaultSettings, type RepeatMode, type Track } from '../types';
import { pathKey, sortTracksNatural } from './helpers';
import type { Core } from './core';
import type { GetFn, SetFn, State, PlaylistSlice } from './types';


export const createPlaylistSlice = (set: SetFn, get: GetFn, core: Core): PlaylistSlice => {
  const { subscribe, flags, snapshot, fixSettings, retrack, pushTrayLabels, relabelUnknown, snapshotLibrary, snapshotUser, applySnapshot, remapState, mergeTracks, dedupeLibrary, knownFiles, ingest, sortedIds, upsertFolderPlaylist, pruneMissing, addFolder, playCurrentIndex, scheduleSave, syncNext, allowLibrary, syncWatchers } = core;
  return {
    playlists: [],
    liked: {},

    toggleLike: (id) =>
      set((s) => {
        const liked = { ...s.liked };
        if (liked[id]) delete liked[id];
        else liked[id] = Date.now();
        return { liked };
      }),
    createPlaylist: (name, ids = []) => {
      const id = uid();
      set((s) => ({ playlists: [...s.playlists, { id, name: name.trim() || tr('newPlaylist'), trackIds: ids, createdAt: Date.now() }] }));
      return id;
    },
    renamePlaylist: (id, name) =>
      set((s) => ({ playlists: s.playlists.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)) })),
    deletePlaylist: (id) => {
      set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }));
      const v = get().view;
      if (v.name === 'playlist' && v.id === id) get().nav({ name: 'playlists' });
    },
    addToPlaylist: (pid, ids) => {
      let added = 0;
      set((s) => ({
        playlists: s.playlists.map((p) => {
          if (p.id !== pid) return p;
          const have = new Set(p.trackIds);
          const add = ids.filter((i) => !have.has(i));
          added = add.length;
          return { ...p, trackIds: [...p.trackIds, ...add] };
        }),
      }));
      get().showToast(added ? tr('addedToPlaylistN', { n: added }) : tr('alreadyInPlaylist'), undefined, undefined, added ? 'success' : 'warning');
    },
    removeFromPlaylist: (pid, index) =>
      set((s) => ({ playlists: s.playlists.map((p) => (p.id === pid ? { ...p, trackIds: p.trackIds.filter((_, i) => i !== index) } : p)) })),
    reorderPlaylist: (pid, from, to) =>
      set((s) => ({
        playlists: s.playlists.map((p) => {
          if (p.id !== pid) return p;
          const ids = [...p.trackIds];
          const [m] = ids.splice(from, 1);
          ids.splice(to, 0, m);
          return { ...p, trackIds: ids };
        }),
      })),
    exportPlaylist: async (pid) => {
      const pl = get().playlists.find((p) => p.id === pid);
      if (!pl) return;
      const path = await api.pickSavePath(`${pl.name}.m3u8`, ['m3u8', 'm3u'], 'Playlist M3U');
      if (!path) return;
      const tracks = pl.trackIds.map((i) => get().byId[i]).filter(Boolean);
      await api.writeTextFile(path, buildM3U(tracks));
      get().showToast(tr('exported', { name: pl.name }), undefined, undefined, 'success');
    },
    importPlaylistFile: async () => {
      const path = await api.pickOne(['m3u', 'm3u8'], 'Playlist M3U');
      if (!path) return;
      const paths = parseM3U(await api.readTextFile(path), path);
      const res = await ingest(paths);
      if (!res) return;
      if (!res.found.length) {
        get().showToast(tr('noValidSongsInM3U'), undefined, undefined, 'warning');
        return;
      }
      mergeTracks(res.tracks);
      const ids = res.found.map((f) => f.id);
      const pid = get().createPlaylist(stripExt(basename(path)), ids);
      get().nav({ name: 'playlist', id: pid });
      get().showToast(tr('imported', { n: ids.length }), undefined, undefined, 'success');
    },

  };
};
