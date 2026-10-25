import { engine } from '../audio';
import { tr, type ActiveLang } from '../i18n';
import * as api from '../tauri';
import { basename, uid } from '../utils';
import { defaultSettings, type Playlist, type Settings, type Track } from '../types';
import { normalize, pathKey, replayGainDb, sortTracksNatural } from './helpers';
import type { GetFn, SetFn, State, SubscribeFn } from './types';

let saveTimer: number | undefined;
let libSaveTimer: number | undefined;

/** Helpers shared by every slice (persistence, library merge/scan, playback loading) */
export function createCore(set: SetFn, get: GetFn, subscribe: SubscribeFn) {
  const snapshot = () => {
    const s = get();
    return JSON.stringify({
      v: 1,
      tracks: Object.values(s.byId),
      playlists: s.playlists,
      liked: s.liked,
      history: s.history,
      plays: s.plays,
      settings: s.settings,
      session: {
        queue: s.queue,
        baseQueue: s.baseQueue,
        index: s.index,
        position: engine.audio.currentTime || 0,
        shuffle: s.shuffle,
        repeat: s.repeat,
      },
      navCollapsed: s.navCollapsed,
      viewModes: s.viewModes,
    });
  };

  const LEGACY_PRESETS: Record<string, string> = { 'Phẳng': 'flat', 'Bass mạnh': 'bass', 'Treble sáng': 'treble', 'Giọng hát': 'vocal', 'Cổ_điển': 'classical', 'Tùy chỉnh': 'custom' };
  const fixSettings = (s: Settings): Settings => ({ ...s, eqPreset: LEGACY_PRESETS[s.eqPreset] ?? s.eqPreset.toLowerCase() });

  const retrack = () => {
    const s = get();
    if (!s.miniMode) void api.setWindowTracking(true);
  };

  /** Tray menu labels follow the UI language */
  const pushTrayLabels = () => void api.setTrayLabels([tr('trayShow'), tr('trayToggle'), tr('trayPrev'), tr('trayNext'), tr('trayQuit')]);

  /** Library entries that carry the localized "unknown artist/album" placeholder follow the language switch */
  const relabelUnknown = (from: ActiveLang, to: ActiveLang) => {
    if (from === to) return;
    const pairs: [string, string][] = [[tr('unknownArtist', undefined, from), tr('unknownArtist', undefined, to)], [tr('unknownAlbum', undefined, from), tr('unknownAlbum', undefined, to)]];
    set((s) => {
      const byId: Record<string, Track> = {};
      for (const t of Object.values(s.byId)) {
        byId[t.id] = { ...t, artist: t.artist === pairs[0][0] ? pairs[0][1] : t.artist, album: t.album === pairs[1][0] ? pairs[1][1] : t.album };
      }
      return { byId };
    });
  };

  /** Library file: tracks only (rewritten rarely) */
  const snapshotLibrary = () => JSON.stringify({ v: 2, tracks: Object.values(get().byId) });

  /** User file: small and cheap to rewrite (playlists, favorites, history, settings, session) */
  const snapshotUser = () => {
    const s = get();
    return JSON.stringify({
      v: 2,
      playlists: s.playlists,
      liked: s.liked,
      history: s.history,
      plays: s.plays,
      settings: s.settings,
      session: { queue: s.queue, baseQueue: s.baseQueue, index: s.index, position: engine.audio.currentTime || 0, shuffle: s.shuffle, repeat: s.repeat },
      navCollapsed: s.navCollapsed,
      viewModes: s.viewModes,
    });
  };

  /** Applies a (full or partial) snapshot; only the keys that are present are touched */
  const applySnapshot = (raw: string) => {
    const d = JSON.parse(raw);
    const patch: Partial<State> = {};
    if (Array.isArray(d.tracks)) {
      const byId: Record<string, Track> = {};
      for (const t of d.tracks as Track[]) byId[t.id] = t;
      patch.byId = byId;
    }
    if (d.playlists !== undefined) patch.playlists = d.playlists ?? [];
    if (d.liked !== undefined) patch.liked = d.liked ?? {};
    if (d.history !== undefined) patch.history = d.history ?? [];
    if (d.plays !== undefined) patch.plays = d.plays ?? {};
    if (d.settings !== undefined) patch.settings = fixSettings({ ...defaultSettings, ...(d.settings ?? {}) });
    if (d.navCollapsed !== undefined) patch.navCollapsed = !!d.navCollapsed;
    if (d.viewModes !== undefined) patch.viewModes = d.viewModes ?? {};
    set(patch);
    return d;
  };

  /** Khi mã bài hát đổi (ví dụ dữ liệu cũ), chuyển mọi tham chiếu sang mã mới */
  const remapState = (s: State, remap: Record<string, string>) => {
    const r = (id: string) => remap[id] ?? id;
    const remapKeys = <T,>(o: Record<string, T>) => {
      const out: Record<string, T> = {};
      for (const [k, v] of Object.entries(o)) out[r(k)] = v;
      return out;
    };
    const seen = new Set<string>();
    return {
      queue: s.queue.map(r),
      baseQueue: s.baseQueue.map(r),
      playlists: s.playlists.map((p) => ({ ...p, trackIds: [...new Set(p.trackIds.map(r))] })),
      liked: remapKeys(s.liked),
      plays: remapKeys(s.plays),
      history: s.history.map((h) => ({ ...h, id: r(h.id) })).filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true))),
    };
  };

  /** Thêm / ghi đè bài hát theo đường dẫn: cùng tệp thì cập nhật, không tạo bản sao */
  const mergeTracks = (tracks: Track[]) => {
    let added = 0;
    let updated = 0;
    set((s) => {
      const byId = { ...s.byId };
      const byPath = new Map<string, string>();
      for (const t of Object.values(byId)) byPath.set(pathKey(t.path), t.id);
      const remap: Record<string, string> = {};
      for (const raw of tracks) {
        const t = normalize(raw);
        const pk = pathKey(t.path);
        const sameFileId = byPath.get(pk);
        if (sameFileId && sameFileId !== t.id) {
          const old = byId[sameFileId];
          delete byId[sameFileId];
          remap[sameFileId] = t.id;
          byId[t.id] = { ...t, addedAt: old?.addedAt ?? t.addedAt };
          updated++;
        } else {
          const old = byId[t.id];
          if (old) updated++;
          else added++;
          byId[t.id] = old ? { ...t, addedAt: old.addedAt } : t;
        }
        byPath.set(pk, t.id);
      }
      return Object.keys(remap).length ? { byId, ...remapState(s, remap) } : { byId };
    });
    return { added, updated };
  };

  /** Gộp các bản ghi trùng đường dẫn (nếu có) */
  const dedupeLibrary = () => {
    const s = get();
    const groups = new Map<string, Track[]>();
    for (const t of Object.values(s.byId)) {
      const k = pathKey(t.path);
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(t);
    }
    const remap: Record<string, string> = {};
    const byId = { ...s.byId };
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      g.sort((a, b) => a.addedAt - b.addedAt);
      for (const dup of g.slice(1)) {
        remap[dup.id] = g[0].id;
        delete byId[dup.id];
      }
    }
    if (Object.keys(remap).length) set({ byId, ...remapState(s, remap) });
  };

  const knownFiles = (): api.KnownFile[] =>
    // songs scanned before ReplayGain existed (no `rgv`) are left out so they are read once more
    Object.values(get().byId)
      .filter((t) => t.rgv === 1)
      .map((t) => ({ path: t.path, size: t.size, modified: t.modified ?? 0 }));

  /** Quét đường dẫn. `known` có giá trị = quét tăng dần (bỏ qua tệp không đổi); không có = đọc lại và ghi đè. */
  const ingest = async (paths: string[], opts: { known?: api.KnownFile[]; quiet?: boolean } = {}): Promise<api.ScanResult | null> => {
    const timer = opts.quiet ? window.setTimeout(() => set({ scanning: { done: 0, total: 0 } }), 1200) : undefined;
    if (!opts.quiet) set({ scanning: { done: 0, total: 0 } });
    try {
      return await api.scanPaths(paths, opts.known);
    } catch (e) {
      if (!opts.quiet) get().showToast(tr('scanFailed', { e: String(e) }), undefined, undefined, 'error');
      return null;
    } finally {
      window.clearTimeout(timer);
      set({ scanning: null });
    }
  };

  const sortedIds = (ids: string[]) => {
    const byId = get().byId;
    return sortTracksNatural(ids.map((i) => byId[i]).filter(Boolean)).map((t) => t.id);
  };

  const upsertFolderPlaylist = (dir: string, ids: string[]) => {
    const existing = get().playlists.find((p) => p.folder && pathKey(p.folder) === pathKey(dir));
    if (existing) {
      set((s) => ({ playlists: s.playlists.map((p) => (p.id === existing.id ? { ...p, trackIds: ids } : p)) }));
      return existing.id;
    }
    const id = uid();
    set((s) => ({
      playlists: [...s.playlists, { id, name: basename(dir) || dir, trackIds: ids, createdAt: Date.now(), folder: dir }],
    }));
    return id;
  };

  /** Xóa các bài mà tệp đã bị xóa khỏi ổ đĩa (bỏ qua khi cả ổ đĩa đang không truy cập được) */
  const pruneMissing = async (): Promise<number> => {
    const all = Object.values(get().byId);
    if (!all.length) return 0;
    try {
      const gone = new Set((await api.findRemoved(all.map((t) => t.path))).map(pathKey));
      const ids = all.filter((t) => gone.has(pathKey(t.path))).map((t) => t.id);
      if (ids.length) get().removeTracks(ids);
      return ids.length;
    } catch {
      return 0;
    }
  };

  const addFolder = async (dir: string, play: boolean) => {
    const res = await ingest([dir]);
    if (!res) return;
    if (!res.found.length) {
      get().showToast(tr('noSongsInFolder'), undefined, undefined, 'warning');
      return;
    }
    const { added, updated } = mergeTracks(res.tracks);
    const ids = sortedIds(res.found.map((f) => f.id));
    const pid = upsertFolderPlaylist(dir, ids);
    if (play) get().playTracks(ids, 0);
    else
      get().showToast(
        updated ? tr('folderMerged', { name: basename(dir), added, updated }) : tr('folderAdded', { n: added, name: basename(dir) }),
        tr('openPlaylist'),
        () => get().nav({ name: 'playlist', id: pid }),
      );
  };


  /** Tell the engine which song is next (preloaded for gapless / crossfade) */
  const syncNext = () => {
    const s = get();
    const cfg = s.settings;
    const enabled = (cfg.gapless || cfg.crossfade > 0) && !s.sleepEndOfTrack && s.repeat !== 'one' && s.index >= 0;
    let next: Track | undefined;
    if (enabled) {
      let i = s.index + 1;
      if (i >= s.queue.length) i = s.repeat === 'all' ? 0 : -1;
      if (i >= 0) next = s.byId[s.queue[i]];
    }
    engine.setNext(next ? next.path : null, next ? replayGainDb(next, cfg.replayGain) : 0);
  };

  const playCurrentIndex = (i: number, autoplay: boolean, startAt = 0) => {
    const s = get();
    const t = s.byId[s.queue[i]];
    if (!t) return;
    engine.load(t.path, autoplay, startAt, replayGainDb(t, s.settings.replayGain));
    set({ index: i, position: startAt, duration: t.duration });
    syncNext();
  };

  /** Let the asset protocol serve the folders that hold the library */
  const allowLibrary = () => api.allowPaths([...new Set(Object.values(get().byId).map((t) => t.folder).filter(Boolean))]);

  let musicDirCache: string | null | undefined;
  let watchKey = '';
  /** (Re)start the folder watcher when the watched folders or the setting change */
  const syncWatchers = async () => {
    const s = get();
    const roots: string[] = [];
    if (s.settings.watchFolders) {
      s.playlists.forEach((p) => p.folder && roots.push(p.folder));
      if (s.settings.autoScanMusic) {
        if (musicDirCache === undefined) musicDirCache = await api.getMusicDir().catch(() => null);
        if (musicDirCache) roots.push(musicDirCache);
      }
    }
    const list = [...new Set(roots)].sort();
    const key = JSON.stringify(list);
    if (key === watchKey) return;
    watchKey = key;
    void api.watchFolders(list, list.length > 0);
  };

  const flags = { syncing: false, errorStreak: 0, initPromise: null as Promise<void> | null };

  function scheduleSave(kind: 'library' | 'user') {
    if (kind === 'library') {
      window.clearTimeout(libSaveTimer);
      libSaveTimer = window.setTimeout(() => api.saveState('library', snapshotLibrary()).catch((e) => console.error('Save failed', e)), 1500);
    } else {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => api.saveState('user', snapshotUser()).catch((e) => console.error('Save failed', e)), 800);
    }
  }

  return {
    subscribe, flags, snapshot, fixSettings, retrack, pushTrayLabels, relabelUnknown, snapshotLibrary, snapshotUser, applySnapshot, remapState,
    mergeTracks, dedupeLibrary, knownFiles, ingest, sortedIds, upsertFolderPlaylist, pruneMissing, addFolder, playCurrentIndex, scheduleSave,
    syncNext, allowLibrary, syncWatchers,
  };
}

export type Core = ReturnType<typeof createCore>;
