import { describe, expect, it } from 'vitest';
import { activeLine, parseLyrics } from '../src/lib/lrc';

describe('parseLyrics', () => {
  it('reads synced lines, repeated time tags and skips id tags', () => {
    const l = parseLyrics('[ar:Someone]\n[00:12.50]Hello\n[00:05.00][00:30.25]Chorus\n');
    expect(l.synced).toBe(true);
    expect(l.lines.map((x) => x.text)).toEqual(['Chorus', 'Hello', 'Chorus']);
    expect(l.lines.map((x) => x.time)).toEqual([5, 12.5, 30.25]);
  });
  it('treats text without time tags as plain lyrics', () => {
    const l = parseLyrics('line one\nline two');
    expect(l.synced).toBe(false);
    expect(l.lines).toHaveLength(2);
  });
  it('understands 2 and 3 digit fractions and minutes over 59', () => {
    const l = parseLyrics('[01:02.5]a\n[61:00.123]b');
    expect(l.lines[0].time).toBeCloseTo(62.5);
    expect(l.lines[1].time).toBeCloseTo(3660.123);
  });
});

describe('activeLine', () => {
  const lines = [{ time: 1, text: 'a' }, { time: 5, text: 'b' }, { time: 9, text: 'c' }];
  it('finds the line being sung', () => {
    expect(activeLine(lines, 0)).toBe(-1);
    expect(activeLine(lines, 1)).toBe(0);
    expect(activeLine(lines, 6)).toBe(1);
    expect(activeLine(lines, 100)).toBe(2);
  });
  it('shifts with a lyrics offset (position + offset)', () => {
    expect(activeLine(lines, 4 + 1.0)).toBe(1); // lyrics shown 1 s earlier
    expect(activeLine(lines, 4)).toBe(0);
  });
});
