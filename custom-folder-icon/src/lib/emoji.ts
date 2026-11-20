export interface EmojiItem { e: string; q: string }
export interface EmojiData { categories: { icon: string; list: EmojiItem[] }[]; all: EmojiItem[] }

// Emojibase groups: 0 smileys, 1 people, 3 animals, 4 food, 5 travel, 6 activities, 7 objects, 8 symbols
const GROUPS: { group: number; icon: string }[] = [
  { group: 0, icon: "😀" },
  { group: 1, icon: "👍" },
  { group: 3, icon: "🐶" },
  { group: 4, icon: "🍔" },
  { group: 6, icon: "⚽" },
  { group: 5, icon: "🚗" },
  { group: 7, icon: "💡" },
  { group: 8, icon: "❤️" },
];

let cache: Promise<EmojiData> | null = null;

/** Loaded lazily; skips emoji newer than Unicode 14 so they never render as empty boxes on Windows. */
export function loadEmoji(): Promise<EmojiData> {
  if (!cache) {
    cache = import("emojibase-data/en/data.json").then((m) => {
      type Raw = { emoji: string; label: string; tags?: string[]; group?: number; version: number; order?: number };
      const raw = ((m as unknown as { default: Raw[] }).default ?? (m as unknown as Raw[])).filter(
        (x) => x.group !== undefined && x.group !== 2 && x.group !== 9 && x.version <= 14,
      );
      raw.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const toItem = (x: Raw): EmojiItem => ({ e: x.emoji, q: (x.label + " " + (x.tags ?? []).join(" ")).toLowerCase() });
      const categories = GROUPS.map((g) => ({ icon: g.icon, list: raw.filter((x) => x.group === g.group).map(toItem) }));
      return { categories, all: categories.flatMap((c) => c.list) };
    });
  }
  return cache;
}
