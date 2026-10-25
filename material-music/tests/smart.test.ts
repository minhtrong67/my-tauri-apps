import { describe, expect, it } from 'vitest';
import { defaultRules, ruleTracks, rulesAreEmpty, smartTracks } from '../src/lib/smart';
import { track } from './helpers';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

const lib = () => {
  const a = track({ id: 'a', title: 'Alpha', genre: 'Rock', year: 1999, bitrate: 320, format: 'mp3', addedAt: NOW - 2 * DAY, duration: 180 });
  const b = track({ id: 'b', title: 'Beta', genre: 'Pop rock', year: 2010, bitrate: 128, format: 'mp3', addedAt: NOW - 40 * DAY, duration: 900 });
  const c = track({ id: 'c', title: 'Gamma', genre: 'Jazz', year: 0, bitrate: 900, format: 'flac', addedAt: NOW - 1 * DAY, duration: 240 });
  return { byId: { a, b, c } };
};
const ids = (r: ReturnType<typeof ruleTracks>) => r.map((t) => t.id);

describe('custom smart playlists', () => {
  it('an empty rule set is detected', () => {
    expect(rulesAreEmpty(defaultRules())).toBe(true);
    expect(rulesAreEmpty({ ...defaultRules(), onlyLiked: true })).toBe(false);
  });
  it('matches genre text (case-insensitive, contains)', () => {
    const { byId } = lib();
    expect(ids(ruleTracks({ ...defaultRules(), genre: 'ROCK' }, byId, {}, {}, NOW))).toEqual(['a', 'b']);
  });
  it('year range ignores songs without a year', () => {
    const { byId } = lib();
    expect(ids(ruleTracks({ ...defaultRules(), yearFrom: 1990, yearTo: 2005 }, byId, {}, {}, NOW))).toEqual(['a']);
  });
  it('combines bitrate, format, length and recently added', () => {
    const { byId } = lib();
    expect(ids(ruleTracks({ ...defaultRules(), minBitrate: 256 }, byId, {}, {}, NOW))).toEqual(['a', 'c']);
    expect(ids(ruleTracks({ ...defaultRules(), formats: ['flac'] }, byId, {}, {}, NOW))).toEqual(['c']);
    expect(ids(ruleTracks({ ...defaultRules(), maxMinutes: 5 }, byId, {}, {}, NOW))).toEqual(['a', 'c']);
    expect(ids(ruleTracks({ ...defaultRules(), addedDays: 7 }, byId, {}, {}, NOW))).toEqual(['a', 'c']);
  });
  it('uses play counts and favorites', () => {
    const { byId } = lib();
    expect(ids(ruleTracks({ ...defaultRules(), played: 'played' }, byId, { b: 3 }, {}, NOW))).toEqual(['b']);
    expect(ids(ruleTracks({ ...defaultRules(), played: 'unplayed' }, byId, { b: 3 }, {}, NOW))).toEqual(['a', 'c']);
    expect(ids(ruleTracks({ ...defaultRules(), onlyLiked: true }, byId, {}, { c: 1 }, NOW))).toEqual(['c']);
  });
});

describe('built-in smart playlists', () => {
  it('lists lossless songs', () => {
    const { byId } = lib();
    expect(smartTracks('lossless', byId, {}).map((t) => t.id)).toEqual(['c']);
  });
});
