import { useMemo } from 'react';
import { tr, getActiveLang, type ActiveLang } from '../i18n';
import { natural, norm } from '../utils';
import type { Album, Artist, Track, ViewMode } from '../types';
import { albumKey } from './helpers';
import { useStore } from './index';

let derivedFor: Record<string, Track> | null = null;
let derivedLang: ActiveLang | null = null;
let derivedCache: { all: Track[]; albums: Album[]; artists: Artist[] } | null = null;

export function derive(byId: Record<string, Track>) {
  if (derivedFor === byId && derivedCache && derivedLang === getActiveLang()) return derivedCache;
  const all = Object.values(byId);
  const albumMap = new Map<string, Track[]>();
  const artistMap = new Map<string, Track[]>();
  for (const t of all) {
    const ak = albumKey(t);
    (albumMap.get(ak) ?? albumMap.set(ak, []).get(ak)!).push(t);
    (artistMap.get(t.artist) ?? artistMap.set(t.artist, []).get(t.artist)!).push(t);
  }
  const albums: Album[] = [...albumMap.entries()].map(([key, tracks]) => {
    const sorted = [...tracks].sort((a, b) => a.folder.localeCompare(b.folder) || a.trackNo - b.trackNo || natural(a.path, b.path));
    const artists = new Set(sorted.map((t) => t.artist));
    return {
      key,
      title: sorted[0].album,
      artist: sorted[0].albumArtist || (artists.size === 1 ? sorted[0].artist : tr('variousArtists')),
      year: Math.max(...sorted.map((t) => t.year)),
      tracks: sorted,
    };
  });
  albums.sort((a, b) => natural(a.title, b.title));
  const artists: Artist[] = [...artistMap.entries()]
    .map(([name, tracks]) => ({ name, tracks, albumCount: new Set(tracks.map(albumKey)).size }))
    .sort((a, b) => natural(a.name, b.name));
  derivedFor = byId;
  derivedLang = getActiveLang();
  derivedCache = { all, albums, artists };
  return derivedCache;
}

export function useDerived() {
  const byId = useStore((s) => s.byId);
  return useMemo(() => derive(byId), [byId]);
}

export function useCurrent(): Track | undefined {
  return useStore((s) => s.byId[s.queue[s.index]]);
}

export function useTrackList(ids: string[]): Track[] {
  const byId = useStore((s) => s.byId);
  return useMemo(() => ids.map((i) => byId[i]).filter(Boolean), [ids, byId]);
}

export function searchLibrary(byId: Record<string, Track>, q: string) {
  const { all, albums, artists } = derive(byId);
  const n = norm(q.trim());
  const words = n.split(/\s+/).filter(Boolean);
  const hit = (s: string) => {
    const x = norm(s);
    return words.every((w) => x.includes(w));
  };
  return {
    tracks: all.filter((t) => hit(`${t.title} ${t.artist} ${t.album}`)),
    albums: albums.filter((a) => hit(`${a.title} ${a.artist}`)),
    artists: artists.filter((a) => hit(a.name)),
  };
}

const DEFAULT_MODES: Record<string, ViewMode> = { albums: 'grid', artists: 'grid', playlists: 'grid' };

/** Chế độ hiển thị danh sách / lưới của từng tab (được lưu lại) */
export function useViewMode(key: string): [ViewMode, (m: ViewMode) => void] {
  const mode = useStore((s) => s.viewModes[key] ?? DEFAULT_MODES[key] ?? 'list');
  return [mode, (m) => useStore.getState().setViewMode(key, m)];
}
