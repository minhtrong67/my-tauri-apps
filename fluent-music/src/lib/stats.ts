import type { Listen, Track } from './types';

export type StatsRange = 'week' | 'month' | 'all';

const DAY = 86400000;

export interface Stats {
  count: number;
  /** total seconds of the songs that were heard */
  seconds: number;
  tracks: { track: Track; n: number }[];
  artists: { name: string; n: number }[];
  /** listens per day for the last 7 days, oldest first */
  week: { day: Date; n: number }[];
}

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function computeStats(listens: Listen[], byId: Record<string, Track>, range: StatsRange, now = Date.now()): Stats {
  const since = range === 'week' ? now - 7 * DAY : range === 'month' ? now - 30 * DAY : 0;
  const inRange = listens.filter((l) => l.at >= since && byId[l.id]);
  const perTrack = new Map<string, number>();
  const perArtist = new Map<string, number>();
  let seconds = 0;
  for (const l of inRange) {
    perTrack.set(l.id, (perTrack.get(l.id) ?? 0) + 1);
    const a = byId[l.id].artist;
    perArtist.set(a, (perArtist.get(a) ?? 0) + 1);
    seconds += l.sec;
  }
  const top = <T,>(m: Map<string, number>, map: (k: string, n: number) => T) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => map(k, n));
  const today = startOfDay(now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const from = today - (6 - i) * DAY;
    return { day: new Date(from), n: listens.filter((l) => l.at >= from && l.at < from + DAY).length };
  });
  return {
    count: inRange.length,
    seconds,
    tracks: top(perTrack, (id, n) => ({ track: byId[id], n })),
    artists: top(perArtist, (name, n) => ({ name, n })),
    week,
  };
}
