import { describe, expect, it } from 'vitest';
import { buildM3U, parseM3U } from '../src/lib/m3u';
import { track } from './helpers';

describe('m3u', () => {
  it('writes an extended playlist', () => {
    const t = track({ title: 'Hi', artist: 'Me', duration: 61.4, path: 'C:\\a\\b.mp3' });
    expect(buildM3U([t])).toBe('#EXTM3U\r\n#EXTINF:61,Me - Hi\r\nC:\\a\\b.mp3\r\n');
  });
  it('keeps absolute paths and resolves relative ones next to the playlist', () => {
    const text = '#EXTM3U\n#EXTINF:1,x\nC:/Music/one.mp3\nsub/two.flac\nfile:///D:/three.mp3\n\n';
    expect(parseM3U(text, 'C:\\Lists\\mix.m3u')).toEqual(['C:\\Music\\one.mp3', 'C:\\Lists\\sub\\two.flac', 'D:\\three.mp3']);
  });
});
