/* Big icon collections for the Customize-folder dialog. Everything is loaded with dynamic import() the first time a collection is
   opened, so neither start-up nor normal browsing pays for ~14,000 icons. */
export type VecKind = 'mdi' | 'fa' | 'brand';
export interface VecIcon { path: string; w: number; h: number; hex?: string }
export interface IconSet { names: string[]; search: string[]; label: (name: string) => string; get: (name: string) => VecIcon | null }

const cache = new Map<VecKind, Promise<IconSet>>();
const words = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

async function build(kind: VecKind): Promise<IconSet> {
  if (kind === 'mdi') {
    const m = (await import('@mdi/js')) as unknown as Record<string, string>;
    const names = Object.keys(m).filter((k) => k.startsWith('mdi') && typeof m[k] === 'string' && !k.endsWith('Outline')); // solid glyphs only
    const label = (n: string) => words(n.slice(3));
    return { names, search: names.map((n) => label(n).toLowerCase()), label, get: (n) => (m[n] ? { path: m[n], w: 24, h: 24 } : null) };
  }
  if (kind === 'fa') {
    const { fas } = await import('@fortawesome/free-solid-svg-icons');
    const map = new Map<string, [number, number, string]>();
    for (const def of Object.values(fas)) { const p = def.icon[4]; if (typeof p === 'string' && !map.has(def.iconName)) map.set(def.iconName, [def.icon[0], def.icon[1], p]); }
    const names = [...map.keys()].sort();
    const label = (n: string) => n.replace(/-/g, ' ');
    return { names, search: names.map(label), label, get: (n) => { const d = map.get(n); return d ? { w: d[0], h: d[1], path: d[2] } : null; } };
  }
  const si = (await import('simple-icons')) as unknown as Record<string, { title: string; path: string; hex: string }>;
  const POPULAR = ['tiktok', 'facebook', 'instagram', 'youtube', 'github', 'x', 'discord', 'telegram', 'whatsapp', 'spotify', 'google', 'gmail', 'googledrive', 'notion', 'figma', 'reddit', 'steam', 'netflix', 'apple', 'android', 'linux', 'docker', 'react', 'python', 'rust', 'typescript', 'javascript', 'pinterest', 'snapchat', 'zalo', 'messenger', 'paypal', 'twitch', 'dropbox', 'trello', 'gitlab', 'vercel', 'firebase', 'claude', 'anthropic'];
  const entries = Object.entries(si).filter(([k, v]) => k.startsWith('si') && v && typeof v === 'object' && typeof v.path === 'string');
  const rank = (k: string) => { const i = POPULAR.indexOf(k.slice(2).toLowerCase()); return i === -1 ? 9999 : i; };
  entries.sort((a, b) => rank(a[0]) - rank(b[0]) || a[1].title.localeCompare(b[1].title));
  const names = entries.map(([k]) => k); const by = Object.fromEntries(entries);
  return { names, search: names.map((n) => by[n].title.toLowerCase()), label: (n) => by[n].title, get: (n) => (by[n] ? { path: by[n].path, w: 24, h: 24, hex: '#' + by[n].hex } : null) };
}
export const loadSet = (kind: VecKind): Promise<IconSet> => { let p = cache.get(kind); if (!p) { p = build(kind); cache.set(kind, p); } return p; };

export interface EmojiItem { e: string; q: string }
export interface EmojiData { categories: { icon: string; list: EmojiItem[] }[]; all: EmojiItem[] }
const GROUPS = [{ group: 0, icon: '😀' }, { group: 1, icon: '👍' }, { group: 3, icon: '🐶' }, { group: 4, icon: '🍔' }, { group: 6, icon: '⚽' }, { group: 5, icon: '🚗' }, { group: 7, icon: '💡' }, { group: 8, icon: '❤️' }];
let emojiCache: Promise<EmojiData> | null = null;
/** skips emoji newer than Unicode 14 so they never show as empty boxes on Windows */
export function loadEmoji(): Promise<EmojiData> {
  if (!emojiCache) {
    emojiCache = import('emojibase-data/en/data.json').then((m) => {
      type Raw = { emoji: string; label: string; tags?: string[]; group?: number; version: number; order?: number };
      const raw = ((m as unknown as { default: Raw[] }).default ?? (m as unknown as Raw[])).filter((x) => x.group !== undefined && x.group !== 2 && x.group !== 9 && x.version <= 14);
      raw.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const toItem = (x: Raw): EmojiItem => ({ e: x.emoji, q: (x.label + ' ' + (x.tags ?? []).join(' ')).toLowerCase() });
      const categories = GROUPS.map((g) => ({ icon: g.icon, list: raw.filter((x) => x.group === g.group).map(toItem) }));
      return { categories, all: categories.flatMap((c) => c.list) };
    });
  }
  return emojiCache;
}

/** Resolves an icon id ("mdi:mdiStar", "brand:siGithub", "fa:star", "emoji:😀") to what a folder design stores. */
export async function resolveIcon(id: string): Promise<{ vec?: { p: string; w: number; h: number; hex?: string }; emoji?: string } | null> {
  const i = id.indexOf(':'); if (i < 0) return null;
  const kind = id.slice(0, i), name = id.slice(i + 1);
  if (kind === 'emoji') return { emoji: name };
  if (kind === 'mdi' || kind === 'fa' || kind === 'brand') { const v = (await loadSet(kind)).get(name); return v ? { vec: { p: v.path, w: v.w, h: v.h, hex: v.hex } } : null; }
  return null;
}
