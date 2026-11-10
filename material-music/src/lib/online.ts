import { onlineResolve, type OnlineTrack } from './tauri';
import { tr, type Key } from './i18n';
import type { OnlineSource, Track } from './types';

export const SOURCE_LABEL: Record<OnlineSource, string> = { youtube: 'YouTube Music' };

const PREFIX = 'online:';

/** Online songs use `online:<source>:<id>` as both their id and their "path" (the player turns it into a stream when it plays) */
export const isOnlinePath = (p: string | null | undefined): p is string => !!p && p.startsWith(PREFIX);
export const onlineKey = (source: string, id: string) => `${PREFIX}${source}:${id}`;

export function parseOnlinePath(p: string): { source: OnlineSource; id: string } | null {
  if (!isOnlinePath(p)) return null;
  const rest = p.slice(PREFIX.length);
  const i = rest.indexOf(':');
  const source = rest.slice(0, i) as OnlineSource;
  const id = rest.slice(i + 1);
  return i > 0 && id && source === 'youtube' ? { source, id } : null;
}

/** Is this song part of the library lists? (local files always, online songs once the user kept them) */
export const inLibrary = (t: Track) => !t.source || !!t.saved;

/** A found song as a regular Track (so queue, favorites, playlists, lyrics... all work the same) */
export function toTrack(o: OnlineTrack, now = Date.now()): Track {
  const key = onlineKey(o.source, o.id);
  return {
    id: key, path: key, title: o.title, artist: o.artist || SOURCE_LABEL[o.source], album: o.album || SOURCE_LABEL[o.source], albumArtist: '', genre: '',
    year: 0, trackNo: 0, duration: o.duration, bitrate: 0, sampleRate: 0, format: o.source, size: 0, addedAt: now, folder: '',
    hasCover: !!o.coverUrl, cover: undefined, coverUrl: o.coverUrl || undefined,
    source: o.source, remoteId: o.id,
  };
}

// ---------- stream resolving ----------

const TTL = 20 * 60 * 1000;
const cache = new Map<string, { url: string; at: number }>();
const inflight = new Map<string, Promise<string>>();

/** Local stream URL for an online song (cached for a while; `fresh` skips the cache after a playback error) */
export function resolveStream(path: string, fresh = false): Promise<string> {
  const p = parseOnlinePath(path);
  if (!p) return Promise.reject(new Error('E_BAD_ID'));
  const hit = cache.get(path);
  if (!fresh && hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.url);
  const pending = inflight.get(path);
  if (!fresh && pending) return pending;
  const job = onlineResolve(p.id, fresh)
    .then((r) => {
      cache.set(path, { url: r.url, at: Date.now() });
      return r.url;
    })
    .finally(() => inflight.delete(path));
  inflight.set(path, job);
  return job;
}

export const forgetStream = (path: string) => cache.delete(path);

// ---------- error messages ----------

const CODES: Record<string, Key> = {
  E_NETWORK: 'onErrNetwork',
  E_HTTP: 'onErrNetwork',
  E_TIMEOUT: 'onErrTimeout',
  E_BOT: 'onErrForbidden',
  E_JS: 'onErrForbidden',
  E_RATE: 'onErrRate',
  E_UNAVAILABLE: 'onErrUnavailable',
  E_FORMAT: 'onErrForbidden',
  E_FORBIDDEN: 'onErrForbidden',
  E_LOGIN: 'onErrLogin',
  E_BAD_ID: 'onErrUnavailable',
  E_CHECKSUM: 'onErrChecksum',
  E_DISK: 'onErrDisk',
};

/** Backend error ("E_CODE" or "E_CODE: detail") -> a sentence in the interface language */
export function onlineErrorText(err: unknown): string {
  const raw = String(err instanceof Error ? err.message : err ?? '');
  const m = /E_[A-Z_]+/.exec(raw);
  const key = m && CODES[m[0]];
  if (key) return tr(key);
  const detail = raw.replace(/^E_[A-Z_]+:?\s*/, '').trim();
  return detail ? tr('onErrGeneric', { e: detail.slice(0, 160) }) : tr('onErrUnknown');
}
