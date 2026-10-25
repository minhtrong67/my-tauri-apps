import { norm } from './utils';
import type { Track } from './types';

const LOSSLESS = new Set(['flac', 'wav']);
const DURATION_TOLERANCE = 2; // seconds

/** Better copy first: lossless, then higher bitrate, then bigger file, then the one added earlier */
const quality = (a: Track, b: Track) =>
  Number(LOSSLESS.has(b.format)) - Number(LOSSLESS.has(a.format)) || b.bitrate - a.bitrate || b.size - a.size || a.addedAt - b.addedAt;

/**
 * Songs that exist more than once in the library: same title + artist (+ album when the artist is unknown)
 * and almost the same length. Each group is sorted best copy first (that one is the one to keep).
 */
export function findDuplicateGroups(tracks: Track[], unknownArtists: string[] = []): Track[][] {
  const buckets = new Map<string, Track[]>();
  for (const t of tracks) {
    const title = norm(t.title.trim());
    if (!title) continue;
    const artist = norm(t.artist.trim());
    const unknown = !artist || unknownArtists.map(norm).includes(artist);
    const key = `${title}\u0001${unknown ? `?${norm(t.album)}` : artist}`;
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(t);
  }
  const groups: Track[][] = [];
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    // split by length: a 3 min and a 9 min song with the same title are different songs
    const byLen = [...list].sort((a, b) => a.duration - b.duration);
    let cur: Track[] = [byLen[0]];
    const flush = () => {
      if (cur.length > 1) groups.push(cur.sort(quality));
    };
    for (const t of byLen.slice(1)) {
      if (t.duration - cur[cur.length - 1].duration <= DURATION_TOLERANCE) cur.push(t);
      else {
        flush();
        cur = [t];
      }
    }
    flush();
  }
  return groups.sort((a, b) => a[0].title.localeCompare(b[0].title));
}
