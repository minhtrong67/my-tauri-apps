import type { SmartId, SmartRules, Track } from './types';

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

export const defaultRules = (): SmartRules => ({
  genre: '', yearFrom: 0, yearTo: 0, minBitrate: 0, formats: [], onlyLiked: false, addedDays: 0, maxMinutes: 0, played: 'any',
});

/** Does the rule set filter anything at all? (an empty rule set would list the whole library) */
export const rulesAreEmpty = (r: SmartRules) =>
  !r.genre.trim() && !r.yearFrom && !r.yearTo && !r.minBitrate && !r.formats.length && !r.onlyLiked && !r.addedDays && !r.maxMinutes && r.played === 'any';

/** The songs that match a user-made smart playlist (all rules must match) */
export function ruleTracks(r: SmartRules, byId: Record<string, Track>, plays: Record<string, number>, liked: Record<string, number>, now = Date.now()): Track[] {
  const genre = r.genre.trim().toLowerCase();
  const since = r.addedDays ? now - r.addedDays * DAY : 0;
  return Object.values(byId)
    .filter((t) => {
      if (genre && !t.genre.toLowerCase().includes(genre)) return false;
      if (r.yearFrom && (!t.year || t.year < r.yearFrom)) return false;
      if (r.yearTo && (!t.year || t.year > r.yearTo)) return false;
      if (r.minBitrate && t.bitrate < r.minBitrate) return false;
      if (r.formats.length && !r.formats.includes(t.format)) return false;
      if (r.onlyLiked && !liked[t.id]) return false;
      if (since && t.addedAt < since) return false;
      if (r.maxMinutes && t.duration > r.maxMinutes * 60) return false;
      if (r.played === 'played' && !plays[t.id]) return false;
      if (r.played === 'unplayed' && plays[t.id]) return false;
      return true;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
