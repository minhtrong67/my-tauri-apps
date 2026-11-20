import { createStore } from "./createStore";
import type { LucideIcon } from "lucide-react";
import { translate, type Key } from "./i18n";
import type { Entry, Lang, Material, Scope, SortKey, ThemeMode, FontSize, View } from "./types";

/* ------------------------------ Settings (persisted) ------------------------------ */
export interface Settings {
  theme: ThemeMode; accent: string; material: Material; navCompact: boolean; fontSize: FontSize; lang: Lang; font: string;
  autoLoad: boolean; libraryPath: string; tile: number; sort: SortKey; group: boolean;
  confirmDelete: boolean; keepExif: boolean; quality: number; reduceMotion: boolean;
  slide: { interval: number; transition: "fade" | "slide" | "zoom"; shuffle: boolean; loop: boolean };
  windowMode: "remember" | "maximized";
}
export const DEFAULTS: Settings = {
  theme: "system", accent: "#0078D4", material: "mica", navCompact: false, fontSize: "md",
  lang: typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en",
  font: "system", autoLoad: true, libraryPath: "", tile: 190, sort: "date-desc", group: true,
  confirmDelete: true, keepExif: true, quality: 95, reduceMotion: false,
  slide: { interval: 4, transition: "fade", shuffle: false, loop: true }, windowMode: "remember",
};
const SKEY = "mp.settings.v2";
function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SKEY) || "{}");
    return { ...DEFAULTS, ...raw, slide: { ...DEFAULTS.slide, ...(raw.slide || {}) } };
  } catch { return DEFAULTS; }
}
export const settings = createStore<Settings>(loadSettings());
settings.subscribe(() => { try { localStorage.setItem(SKEY, JSON.stringify(settings.get())); } catch { /* storage may be unavailable */ } });
export const useSettings = <R,>(sel: (s: Settings) => R) => settings.use(sel);
export const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => settings.set({ [k]: v } as Partial<Settings>);

/* ------------------------------ Translations ------------------------------ */
export const t = (key: Key, vars?: Record<string, string | number>) => translate(settings.get().lang, key, vars);
export function useT() {
  const lang = settings.use((s) => s.lang);
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

/* ------------------------------ User data: favourites and albums ------------------------------ */
export interface Album { id: string; name: string; paths: string[] }
interface UserData { favs: string[]; albums: Album[]; presets: { id: string; name: string; adj: Record<string, number>; filter: string; amount: number }[] }
const DKEY = "mp.data.v1";
function loadData(): UserData {
  try { return { favs: [], albums: [], presets: [], ...JSON.parse(localStorage.getItem(DKEY) || "{}") }; } catch { return { favs: [], albums: [], presets: [] }; }
}
export const userData = createStore<UserData>(loadData());
userData.subscribe(() => { try { localStorage.setItem(DKEY, JSON.stringify(userData.get())); } catch { /* ignore */ } });

/* ------------------------------ App state (not persisted) ------------------------------ */
export interface AppState {
  view: View; scope: Scope;
  dir: string; entries: Entry[]; scopeEntries: Entry[]; loading: boolean; loaded: boolean;
  current: string | null; ctx: string[]; selection: string[]; selecting: boolean;
  search: string; folder: string; format: string;
  settingsOpen: boolean; aboutOpen: boolean; dupOpen: boolean; editorDirty: boolean; version: number;
  /** true while the viewer is full screen (the chrome is hidden, so toasts must not cover the picture) */
  viewerFull: boolean;
  /** false when the chosen window material is not supported by this Windows version */
  materialOk: boolean;
}
export const app = createStore<AppState>({
  view: "gallery", scope: { kind: "all" }, dir: "", entries: [], scopeEntries: [], loading: false, loaded: false,
  current: null, ctx: [], selection: [], selecting: false, search: "", folder: "", format: "",
  settingsOpen: false, aboutOpen: false, dupOpen: false, editorDirty: false, version: 0, viewerFull: false, materialOk: true,
});
export const useApp = <R,>(sel: (s: AppState) => R) => app.use(sel);

/* ------------------------------ Toasts ------------------------------ */
export type ToastKind = "info" | "success" | "warning" | "error";
export interface ToastItem { id: number; kind: ToastKind; msg: string; action?: { label: string; run: () => void }; ms: number }
export const toasts = createStore<{ list: ToastItem[] }>({ list: [] });
let tid = 1;
export function toast(kind: ToastKind, msg: string, opts: { action?: ToastItem["action"]; ms?: number } = {}) {
  // Full-screen viewing: nothing may cover the picture, so only errors are shown.
  if (app.get().viewerFull && app.get().view === "viewer" && kind !== "error") return 0;
  const item: ToastItem = { id: tid++, kind, msg, action: opts.action, ms: opts.ms ?? (opts.action ? 6500 : 3600) };
  // The same message never stacks; at most two toasts are on screen.
  toasts.set((s) => ({ list: [...s.list.filter((x) => x.msg !== msg).slice(-1), item] }));
  return item.id;
}
export const dismissToast = (id: number) => toasts.set((s) => ({ list: s.list.filter((x) => x.id !== id) }));

/* ------------------------------ Global dialogs and menus ------------------------------ */
export interface ConfirmOpts { title: string; desc?: string; confirm: string; icon?: LucideIcon; kind?: "danger" | "primary" }
export const confirmStore = createStore<{ opts: ConfirmOpts | null; resolve: ((v: boolean) => void) | null }>({ opts: null, resolve: null });
export const confirmDialog = (opts: ConfirmOpts) => new Promise<boolean>((resolve) => confirmStore.set({ opts, resolve }));

export interface PromptOpts { title: string; label: string; value?: string; confirm: string; icon?: LucideIcon; select?: boolean }
export const promptStore = createStore<{ opts: PromptOpts | null; resolve: ((v: string | null) => void) | null }>({ opts: null, resolve: null });
export const promptDialog = (opts: PromptOpts) => new Promise<string | null>((resolve) => promptStore.set({ opts, resolve }));

export interface MenuItem { label?: string; icon?: LucideIcon; kbd?: string; danger?: boolean; disabled?: boolean; divider?: boolean; run?: () => void }
export const menuStore = createStore<{ open: boolean; x: number; y: number; anchor: DOMRect | null; items: MenuItem[] }>({ open: false, x: 0, y: 0, anchor: null, items: [] });
export const showMenu = (items: MenuItem[], at: { x: number; y: number } | DOMRect) => {
  if (at instanceof DOMRect) menuStore.set({ open: true, items, anchor: at, x: at.left, y: at.bottom });
  else menuStore.set({ open: true, items, anchor: null, x: at.x, y: at.y });
};
export const hideMenu = () => menuStore.set({ open: false });
