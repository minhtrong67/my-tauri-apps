import { getSettings } from '../store/settings';
import { pk } from './paths';
import type { Place } from './types';

/** One entry of Quick access: a default place ("p:desktop") or a pinned folder ("d:<path key>"). */
export interface QuickItem { key: string; path: string; placeId?: string }

/** The Quick access list in the user's own order (new items go to the end). */
export function quickItems(places: Place[], pinned: string[], unpinned: string[], order: string[]): QuickItem[] {
  const base: QuickItem[] = [
    ...places.filter((p) => p.id !== 'home' && !unpinned.includes(p.id)).map((p) => ({ key: 'p:' + p.id, path: p.path, placeId: p.id })),
    ...pinned.map((p) => ({ key: 'd:' + pk(p), path: p }))
  ];
  const rank = new Map(order.map((k, i) => [k, i]));
  return base.map((it, i) => ({ it, r: rank.has(it.key) ? rank.get(it.key)! : 1e6 + i })).sort((a, b) => a.r - b.r).map((x) => x.it);
}

/** Moves `key` to position `to` and saves the whole order. */
export function moveQuick(items: QuickItem[], key: string, to: number) {
  const list = items.map((i) => i.key);
  const from = list.indexOf(key); if (from < 0) return;
  list.splice(from, 1); list.splice(Math.max(0, Math.min(list.length, to)), 0, key);
  getSettings().set({ quickOrder: list });
}
