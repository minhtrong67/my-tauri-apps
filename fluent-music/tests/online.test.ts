import { describe, expect, it } from 'vitest';
import { inLibrary, isOnlinePath, onlineErrorText, onlineKey, parseOnlinePath, toTrack } from '../src/lib/online';
import { track } from './helpers';

describe('online song ids', () => {
  it('round-trips source and id, even when the id has colons', () => {
    const k = onlineKey('youtube', 'dQw4w9WgXcQ');
    expect(isOnlinePath(k)).toBe(true);
    expect(parseOnlinePath(k)).toEqual({ source: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(parseOnlinePath('online:youtube:a:b')).toEqual({ source: 'youtube', id: 'a:b' });
  });

  it('rejects local paths and unknown sources', () => {
    expect(isOnlinePath('C:\\Music\\a.mp3')).toBe(false);
    expect(parseOnlinePath('C:\\Music\\a.mp3')).toBeNull();
    expect(parseOnlinePath('online:spotify:123')).toBeNull();
    expect(parseOnlinePath('online:youtube:')).toBeNull();
    expect(parseOnlinePath('online:audius:123')).toBeNull();
  });
});

describe('toTrack', () => {
  const found = { source: 'youtube' as const, id: 'rtOvBOTyX00', title: 'Closer', artist: 'The Chainsmokers', album: 'Collage', duration: 262, coverUrl: 'https://x/c.jpg' };
  it('makes a regular track with the key as id and path', () => {
    const t = toTrack(found, 5);
    expect(t.id).toBe('online:youtube:rtOvBOTyX00');
    expect(t.path).toBe(t.id);
    expect(t.source).toBe('youtube');
    expect(t.coverUrl).toBe('https://x/c.jpg');
    expect(t.addedAt).toBe(5);
    expect(t.folder).toBe('');
  });
  it('falls back to the source name when artist / album are missing', () => {
    const t = toTrack({ ...found, artist: '', album: '' });
    expect(t.artist).toBe('YouTube Music');
    expect(t.album).toBe('YouTube Music');
  });
});

describe('library membership', () => {
  it('local files always count, online songs only once kept', () => {
    expect(inLibrary(track())).toBe(true);
    expect(inLibrary(track({ source: 'youtube' }))).toBe(false);
    expect(inLibrary(track({ source: 'youtube', saved: true }))).toBe(true);
  });
});

describe('error messages', () => {
  it('maps backend codes to readable text and keeps unknown details short', () => {
    expect(onlineErrorText('E_FORBIDDEN')).not.toMatch(/E_/);
    expect(onlineErrorText('E_LOGIN')).not.toMatch(/E_/);
    expect(onlineErrorText(new Error('E_NETWORK: dns failure'))).not.toContain('dns failure');
    expect(onlineErrorText('E_YTDLP: something odd')).toContain('something odd');
    expect(onlineErrorText('')).toBeTruthy();
  });
});
