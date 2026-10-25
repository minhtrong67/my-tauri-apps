import { describe, expect, it } from 'vitest';
import { setActiveLang } from '../src/lib/i18n';
import { basename, clamp, dirname, fmtLong, fmtSize, fmtTime, norm, stripExt } from '../src/lib/utils';

setActiveLang('en');

describe('utils', () => {
  it('formats time', () => {
    expect(fmtTime(0)).toBe('0:00');
    expect(fmtTime(65)).toBe('1:05');
    expect(fmtTime(3725)).toBe('1:02:05');
    expect(fmtTime(NaN)).toBe('0:00');
    expect(fmtTime(-3)).toBe('0:00');
  });
  it('never shows 60 minutes', () => {
    expect(fmtLong(7199)).toBe('2 h 0 min');
    expect(fmtLong(3600 + 59 * 60)).toBe('1 h 59 min');
    expect(fmtLong(10)).toBe('1 min');
  });
  it('formats sizes', () => {
    expect(fmtSize(512 * 1024)).toBe('512 KB');
    expect(fmtSize(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(fmtSize(3 * 1024 ** 3)).toBe('3.00 GB');
  });
  it('splits paths from both separators', () => {
    expect(basename('C:\\Music\\a.mp3')).toBe('a.mp3');
    expect(basename('C:/Music/a.mp3')).toBe('a.mp3');
    expect(dirname('C:\\Music\\a.mp3')).toBe('C:\\Music');
    expect(stripExt('a.b.flac')).toBe('a.b');
  });
  it('removes Vietnamese accents for search', () => {
    expect(norm('Đặng Thùy Chi')).toBe('dang thuy chi');
  });
  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
});
