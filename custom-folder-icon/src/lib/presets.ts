import { defaultDesign, type Design, type IconKind, type Preset } from "./types";

const mk = (name: string, c1: string, c2: string, icon: string, kind: IconKind = "mdi", extra: Partial<Design> = {}): Preset => ({
  id: "default-" + name.toLowerCase().replace(/\s+/g, "-"),
  name,
  design: {
    ...defaultDesign,
    color: c1,
    color2: c2,
    ...extra,
    icon: { ...defaultDesign.icon, enabled: true, kind, name: icon },
  },
});

export const builtInPresets: Preset[] = [
  mk("Windows 11", "#FFE9A6", "#FFC83D", "mdiFolder"),
  mk("Urgent", "#FF8A80", "#E5484D", "mdiFire"),
  mk("Done", "#7EDC9B", "#30A46C", "mdiCheckBold"),
  mk("Client", "#7FB2FF", "#3E63DD", "mdiBriefcase"),
  mk("Idea", "#FFE680", "#FFB224", "mdiLightbulb"),
  mk("Archive", "#B9C1CB", "#6B7785", "mdiArchive"),
  mk("Work", "#8FA8FF", "#5B5BD6", "mdiBriefcase"),
  mk("Personal", "#FF9EC4", "#E93D82", "mdiAccount"),
  mk("Documents", "#8EC8FF", "#0090FF", "mdiFileDocument"),
  mk("Downloads", "#7DE3D3", "#12A594", "mdiDownload"),
  mk("Pictures", "#FFB38A", "#F76B15", "mdiImage"),
  mk("Music", "#D9A6F0", "#8E4EC6", "mdiMusic"),
  mk("Videos", "#FF9A9E", "#CE2C4B", "mdiMovie"),
  mk("Games", "#A5E86B", "#30A46C", "mdiGamepadVariant"),
  mk("Code", "#6B7280", "#33363D", "mdiCodeBraces"),
  mk("Finance", "#9BE3A8", "#1E8E4E", "mdiBank"),
  mk("Travel", "#8FE0FF", "#05A2C2", "mdiAirplane"),
  mk("School", "#FFD27A", "#F59E0B", "mdiSchool"),
  mk("Health", "#FF9AA8", "#E5484D", "mdiHeartPulse"),
  mk("Private", "#9AA3AF", "#33363D", "mdiLock"),
  mk("Backup", "#9CC7FF", "#3E63DD", "mdiBackupRestore"),
  mk("Favorites", "#FFE680", "#F5A300", "mdiStar"),
  mk("GitHub", "#4A4F57", "#1B1F24", "siGithub", "brand", { style: "flat" }),
  mk("TikTok", "#2B2B2B", "#000000", "siTiktok", "brand", { style: "flat" }),
  mk("Facebook", "#4E8DFF", "#1877F2", "siFacebook", "brand", { style: "flat" }),
  mk("YouTube", "#FF6B6B", "#E5181B", "siYoutube", "brand", { style: "flat" }),
  mk("Neon Code", "#00E5FF", "#7C4DFF", "mdiConsole", "mdi", { style: "neon" }),
  mk("Glass Cloud", "#8EC8FF", "#5B8DEF", "mdiCloud", "mdi", { style: "glass" }),
];

/** White-ish brand glyphs read better on dark folders; brand logos keep their own color otherwise. */
for (const p of builtInPresets) if (p.design.icon.kind === "brand") p.design.icon.useBrand = false;

const KEY = "ffi.presets.v2";

function dedupe(list: Preset[]): Preset[] {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

export function normalizeDesign(d: Partial<Design>): Design {
  return {
    ...defaultDesign,
    ...d,
    text: { ...defaultDesign.text, ...(d.text ?? {}) },
    icon: { ...defaultDesign.icon, ...(d.icon ?? {}) },
  };
}

export function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw) as Preset[];
      if (Array.isArray(list)) return dedupe(list.map((p) => ({ ...p, design: normalizeDesign(p.design) })));
    }
    // migrate: keep presets the user created in v1, add the new built-ins
    const old = JSON.parse(localStorage.getItem("ffi.presets") || "[]") as Preset[];
    const custom = Array.isArray(old) ? old.filter((p) => !String(p.id).startsWith("default-")).map((p) => ({ ...p, design: normalizeDesign(p.design) })) : [];
    return [...builtInPresets, ...custom];
  } catch {
    return builtInPresets;
  }
}

export function savePresets(list: Preset[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
