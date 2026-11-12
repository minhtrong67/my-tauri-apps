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
  /** chart series of the chosen range: 7 days / 30 days / 12 weeks */
  series: { start: Date; n: number }[];
  /** listens per hour of the day (24) */
  hours: number[];
  /** listens per weekday, Monday first (7) */
  weekdays: number[];
  albums: { name: string; artist: string; n: number }[];
  /** distinct songs heard / days with at least one listen in the range */
  uniqueTracks: number;
  activeDays: number;
  perActiveDay: number;
  avgSeconds: number;
  /** listens in the previous period of the same length (null for "all") */
  prevCount: number | null;
  /** consecutive days with listening up to today (all history) and the best run ever */
  streak: number;
  bestStreak: number;
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
  const hours = Array(24).fill(0) as number[];
  const weekdays = Array(7).fill(0) as number[];
  const perAlbum = new Map<string, { artist: string; n: number }>();
  const days = new Set<number>();
  for (const l of inRange) {
    const d = new Date(l.at);
    hours[d.getHours()]++;
    weekdays[(d.getDay() + 6) % 7]++;
    days.add(startOfDay(l.at));
    const t = byId[l.id];
    if (t.album) {
      const k = `${t.album}\u0000${t.artist}`;
      const cur = perAlbum.get(k);
      if (cur) cur.n++;
      else perAlbum.set(k, { artist: t.artist, n: 1 });
    }
  }
  const albums = [...perAlbum.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([k, v]) => ({ name: k.split('\u0000')[0], artist: v.artist, n: v.n }));

  // series of the range (one pass over the listens, bucketed)
  const nBuckets = range === 'month' ? 30 : range === 'all' ? 12 : 7;
  const step = range === 'all' ? 7 * DAY : DAY;
  const firstStart = today - (nBuckets - 1) * step;
  const counts = Array(nBuckets).fill(0) as number[];
  for (const l of listens) {
    if (l.at < firstStart || !byId[l.id]) continue;
    const i = Math.min(nBuckets - 1, Math.floor((l.at - firstStart) / step));
    counts[i]++;
  }
  const series = counts.map((n, i) => ({ start: new Date(firstStart + i * step), n }));

  const prevCount = range === 'all' ? null : listens.filter((l) => l.at >= since - (now - since) && l.at < since && byId[l.id]).length;

  // streaks over the whole history
  const allDays = [...new Set(listens.filter((l) => byId[l.id]).map((l) => startOfDay(l.at)))].sort((a, b) => a - b);
  let best = 0, run = 0, prev = -1;
  for (const d of allDays) {
    run = prev >= 0 && Math.round((d - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  let streak = 0;
  const set = new Set(allDays);
  for (let d = set.has(today) ? today : today - DAY; set.has(d); d -= DAY) streak++;

  return {
    uniqueTracks: perTrack.size,
    activeDays: days.size,
    perActiveDay: days.size ? inRange.length / days.size : 0,
    avgSeconds: inRange.length ? seconds / inRange.length : 0,
    hours, weekdays, albums, series, prevCount, streak, bestStreak: best,
    count: inRange.length,
    seconds,
    tracks: top(perTrack, (id, n) => ({ track: byId[id], n })),
    artists: top(perArtist, (name, n) => ({ name, n })),
    week,
  };
}
