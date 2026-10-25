import type { Key } from './i18n';

/** In-app shortcuts the user can change (Settings → Keyboard shortcuts) */
export const ACTIONS = [
  { id: 'play', def: 'Space', label: 'scPlay' },
  { id: 'next', def: 'Ctrl+ArrowRight', label: 'scNext' },
  { id: 'prev', def: 'Ctrl+ArrowLeft', label: 'scPrev' },
  { id: 'seekFwd', def: 'ArrowRight', label: 'scSeekFwd' },
  { id: 'seekBack', def: 'ArrowLeft', label: 'scSeekBack' },
  { id: 'volUp', def: 'ArrowUp', label: 'scVolUp' },
  { id: 'volDown', def: 'ArrowDown', label: 'scVolDown' },
  { id: 'mute', def: 'M', label: 'scMute' },
  { id: 'shuffle', def: 'S', label: 'scShuffle' },
  { id: 'repeat', def: 'R', label: 'scRepeat' },
  { id: 'like', def: 'L', label: 'scLike' },
  { id: 'queue', def: 'Q', label: 'scQueue' },
  { id: 'now', def: 'N', label: 'scNow' },
  { id: 'refresh', def: 'F5', label: 'scRefresh' },
] as const satisfies readonly { id: string; def: string; label: Key }[];

export type ActionId = (typeof ACTIONS)[number]['id'];

/** Combinations the app keeps for itself */
export const RESERVED = ['Escape', 'Tab', 'Ctrl+F', 'Enter'];

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph']);

/** "Ctrl+Shift+K" style text of a key event ('' for a lone modifier key) */
export function comboFromEvent(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): string {
  if (MODIFIER_KEYS.has(e.key)) return '';
  const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const mods = [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', e.shiftKey && key.length > 1 ? 'Shift' : ''].filter(Boolean);
  return [...mods, key].join('+');
}

export const comboFor = (id: ActionId, keymap: Record<string, string>) => keymap[id] ?? ACTIONS.find((a) => a.id === id)!.def;

export function matchAction(combo: string, keymap: Record<string, string>): ActionId | null {
  if (!combo) return null;
  for (const a of ACTIONS) if (comboFor(a.id, keymap) === combo) return a.id;
  return null;
}

const GLYPH: Record<string, string> = { ArrowRight: '→', ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓' };
export const prettyCombo = (c: string) => c.split('+').map((p) => GLYPH[p] ?? p).join(' + ');

/** The action that already uses this combination (other than `except`) */
export function conflictFor(combo: string, keymap: Record<string, string>, except: ActionId): ActionId | null {
  const hit = matchAction(combo, keymap);
  return hit && hit !== except ? hit : null;
}
