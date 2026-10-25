import type { SmartId, Track } from './types';

export const SMART_IDS: SmartId[] = ['top', 'new', 'unplayed', 'lossless'];

export const SMART_ICON: Record<SmartId, string> = { top: 'trending_up', new: 'auto_awesome', unplayed: 'eye_off', lossless: 'gem' };

const DAY = 86400000;

/** Auto-updating lists built from what is already known about the library (play counts, dates, format) */
export function smartTracks(id: SmartId, byId: Record<string, Track>, plays: Record<string, number>): Track[] {
  const all = Object.values(byId);
  switch (id) {
    case 'top':
      return Object.entries(plays)
        .filter(([i, n]) => n > 0 && byId[i])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
        .map(([i]) => byId[i]);
    case 'new': {
      const since = Date.now() - 30 * DAY;
      return all.filter((t) => t.addedAt >= since).sort((a, b) => b.addedAt - a.addedAt).slice(0, 200);
    }
    case 'unplayed':
      return all.filter((t) => !plays[t.id]).sort((a, b) => b.addedAt - a.addedAt);
    case 'lossless':
      return all.filter((t) => t.format === 'flac' || t.format === 'wav').sort((a, b) => a.title.localeCompare(b.title));
  }
}
