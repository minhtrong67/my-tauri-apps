import { describe, expect, it } from 'vitest';
import { ACTIONS, comboFor, comboFromEvent, conflictFor, matchAction, prettyCombo } from '../src/lib/keymap';

const ev = (key: string, mods: Partial<{ ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean }> = {}) => ({ key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods });

describe('keymap', () => {
  it('describes key events', () => {
    expect(comboFromEvent(ev(' '))).toBe('Space');
    expect(comboFromEvent(ev('m'))).toBe('M');
    expect(comboFromEvent(ev('ArrowRight', { ctrlKey: true }))).toBe('Ctrl+ArrowRight');
    expect(comboFromEvent(ev('F5', { shiftKey: true }))).toBe('Shift+F5');
    expect(comboFromEvent(ev('Control', { ctrlKey: true }))).toBe('');
  });
  it('defaults are unique', () => {
    expect(new Set(ACTIONS.map((a) => a.def)).size).toBe(ACTIONS.length);
  });
  it('user changes win over defaults', () => {
    expect(matchAction('Space', {})).toBe('play');
    expect(matchAction('Space', { play: 'P' })).toBeNull();
    expect(matchAction('P', { play: 'P' })).toBe('play');
    expect(comboFor('mute', { mute: 'X' })).toBe('X');
  });
  it('detects conflicts', () => {
    expect(conflictFor('L', {}, 'mute')).toBe('like');
    expect(conflictFor('M', {}, 'mute')).toBeNull();
  });
  it('prints arrows nicely', () => {
    expect(prettyCombo('Ctrl+ArrowLeft')).toBe('Ctrl + ←');
  });
});
