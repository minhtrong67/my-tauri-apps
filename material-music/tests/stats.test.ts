import { describe, expect, it } from 'vitest';
import { computeStats } from '../src/lib/stats';
import { track } from './helpers';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 25, 15, 0, 0).getTime();

describe('computeStats', () => {
  const a = track({ id: 'a', artist: 'A1' });
  const b = track({ id: 'b', artist: 'B1' });
  const byId = { a, b };
  const listens = [
    { id: 'a', at: NOW - 1000, sec: 200 },
    { id: 'a', at: NOW - DAY, sec: 200 },
    { id: 'b', at: NOW - 10 * DAY, sec: 100 },
    { id: 'gone', at: NOW - 1000, sec: 500 },
  ];
  it('counts only songs that still exist and respects the range', () => {
    const w = computeStats(listens, byId, 'week', NOW);
    expect(w.count).toBe(2);
    expect(w.seconds).toBe(400);
    expect(w.tracks[0]).toMatchObject({ n: 2 });
    expect(computeStats(listens, byId, 'month', NOW).count).toBe(3);
    expect(computeStats(listens, byId, 'all', NOW).artists.map((x) => x.name)).toEqual(['A1', 'B1']);
  });
  it('gives seven day buckets, oldest first, ending today', () => {
    const w = computeStats(listens, byId, 'week', NOW).week;
    expect(w).toHaveLength(7);
    expect(w[6].n).toBe(2); // today: 'a' and the missing song
    expect(w[5].n).toBe(1); // yesterday
  });
});
