export type VecKind = "mdi" | "fa" | "brand";
export interface Vec { path: string; w: number; h: number; hex?: string }
export interface IconSet {
  names: string[];
  search: string[]; // lowercase haystack, same order as names
  label: (name: string) => string;
  get: (name: string) => Vec | null;
}

const cache = new Map<VecKind, Promise<IconSet>>();

const words = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

async function build(kind: VecKind): Promise<IconSet> {
  if (kind === "mdi") {
    const m = (await import("@mdi/js")) as unknown as Record<string, string>;
    // Prefer solid glyphs: skip the "-outline" variants.
    const names = Object.keys(m).filter((k) => k.startsWith("mdi") && typeof m[k] === "string" && !k.endsWith("Outline"));
    const label = (n: string) => words(n.slice(3));
    return { names, search: names.map((n) => label(n).toLowerCase()), label, get: (n) => (m[n] ? { path: m[n], w: 24, h: 24 } : null) };
  }
  if (kind === "fa") {
    const { fas } = await import("@fortawesome/free-solid-svg-icons");
    const map = new Map<string, [number, number, string]>();
    for (const def of Object.values(fas)) {
      const p = def.icon[4];
      if (typeof p === "string" && !map.has(def.iconName)) map.set(def.iconName, [def.icon[0], def.icon[1], p]);
    }
    const names = [...map.keys()].sort();
    const label = (n: string) => n.replace(/-/g, " ");
    return {
      names,
      search: names.map((n) => label(n)),
      label,
      get: (n) => {
        const d = map.get(n);
        return d ? { w: d[0], h: d[1], path: d[2] } : null;
      },
    };
  }
  const si = (await import("simple-icons")) as unknown as Record<string, { title: string; path: string; hex: string }>;
  const POPULAR = ["tiktok", "facebook", "instagram", "youtube", "github", "x", "discord", "telegram", "whatsapp", "spotify", "google", "gmail", "googledrive", "slack", "notion", "figma", "reddit", "steam", "netflix", "apple", "android", "docker", "visualstudiocode", "react", "vite", "tailwindcss", "typescript", "javascript", "python", "rust", "nodedotjs", "firebase", "twitch", "pinterest", "snapchat", "messenger", "zalo", "line", "wechat", "paypal", "stripe", "amazon", "ebay", "shopify", "dropbox", "onedrive", "trello", "jira", "gitlab", "figma", "canva", "adobephotoshop", "blender", "unity", "epicgames", "playstation", "xbox", "nvidia", "intel", "amd", "linux", "ubuntu", "windows11", "chrome", "firefox", "opera", "brave", "claude", "openai", "anthropic"];
  const entries = Object.entries(si).filter(([k, v]) => k.startsWith("si") && v && typeof v === "object" && typeof v.path === "string");
  const rank = (k: string) => {
    const i = POPULAR.indexOf(k.slice(2).toLowerCase());
    return i === -1 ? 9999 : i;
  };
  entries.sort((a, b) => rank(a[0]) - rank(b[0]) || a[1].title.localeCompare(b[1].title));
  const names = entries.map(([k]) => k);
  const by = Object.fromEntries(entries);
  return {
    names,
    search: names.map((n) => by[n].title.toLowerCase()),
    label: (n) => by[n].title,
    get: (n) => (by[n] ? { path: by[n].path, w: 24, h: 24, hex: "#" + by[n].hex } : null),
  };
}

export function loadSet(kind: VecKind): Promise<IconSet> {
  let p = cache.get(kind);
  if (!p) {
    p = build(kind);
    cache.set(kind, p);
  }
  return p;
}

export async function getVector(kind: VecKind, name: string): Promise<Vec | null> {
  return (await loadSet(kind)).get(name);
}
