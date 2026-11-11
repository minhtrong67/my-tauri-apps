import { describe, expect, it } from 'vitest';
import { findDuplicateGroups } from '../src/lib/duplicates';
import { track } from './helpers';

describe('findDuplicateGroups', () => {
  it('groups the same song, ignoring case and accents, and puts the best copy first', () => {
    const mp3 = track({ id: 'mp3', title: 'Đêm Nay', artist: 'Ca Sĩ', duration: 200, format: 'mp3', bitrate: 192 });
    const flac = track({ id: 'flac', title: 'dem nay', artist: 'ca si', duration: 201, format: 'flac', bitrate: 900 });
    const other = track({ id: 'other', title: 'Another', artist: 'Ca Sĩ' });
    const g = findDuplicateGroups([mp3, other, flac]);
    expect(g).toHaveLength(1);
    expect(g[0].map((t) => t.id)).toEqual(['flac', 'mp3']);
  });
  it('does not merge songs with a very different length', () => {
    const a = track({ title: 'Intro', artist: 'X', duration: 60 });
    const b = track({ title: 'Intro', artist: 'X', duration: 600 });
    expect(findDuplicateGroups([a, b])).toHaveLength(0);
  });
  it('needs the same album when the artist is unknown', () => {
    const a = track({ title: 'Track 01', artist: 'Unknown artist', album: 'One', duration: 100 });
    const b = track({ title: 'Track 01', artist: 'Unknown artist', album: 'Two', duration: 100 });
    const c = track({ title: 'Track 01', artist: 'Unknown artist', album: 'One', duration: 100 });
    const g = findDuplicateGroups([a, b, c], ['Unknown artist']);
    expect(g).toHaveLength(1);
    expect(g[0]).toHaveLength(2);
  });
  it('with equal quality the older copy wins', () => {
    const old = track({ id: 'old', title: 'S', artist: 'A', addedAt: 1 });
    const fresh = track({ id: 'new', title: 'S', artist: 'A', addedAt: 2 });
    expect(findDuplicateGroups([fresh, old])[0][0].id).toBe('old');
  });
});
