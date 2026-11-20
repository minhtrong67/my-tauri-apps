export interface Entry {
  path: string;
  name: string;
  size: number;
  mtime: number;
  folder: string;
}
export interface Opened {
  dir: string;
  entries: Entry[];
  current: string | null;
}
export interface ExifInfo {
  make?: string; model?: string; lens?: string; iso?: string; f_number?: string; exposure?: string;
  focal?: string; date?: string; software?: string; width?: string; height?: string; lat?: number; lon?: number;
}
export type ThemeMode = "system" | "light" | "dark";
export type FontSize = "sm" | "md" | "lg";
/** Window backdrop material. mica-alt is the Windows 11 "Mica Alt" (tabbed) backdrop. frosted and liquid are CSS styles drawn on top of a system Acrylic backdrop. */
export type Material = "none" | "mica" | "mica-alt" | "acrylic" | "acrylic-alt" | "frosted" | "liquid";
export type Lang = "vi" | "en";
export type SortKey = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "size-desc" | "size-asc";
export type View = "gallery" | "viewer" | "editor";
export type Scope = { kind: "all" } | { kind: "fav" } | { kind: "albums" } | { kind: "album"; id: string };
