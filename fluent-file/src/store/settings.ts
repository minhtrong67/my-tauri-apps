import type { FolderDesign } from '../lib/folderDesign';
import { create } from 'zustand';
import type { GroupBy, SortKey, TagId, ViewMode } from '../lib/types';
import { DEFAULT_SEED } from '../lib/theme';

export interface Layout { view?: ViewMode; sortKey?: SortKey; sortDir?: 'asc' | 'desc'; groupBy?: GroupBy }
export type ColId = 'modified' | 'created' | 'type' | 'size';
export interface SavedSearch { name: string; q: string; regex: boolean; kind: string; min?: string; max?: string; minU?: string; maxU?: string; after?: string; before?: string }
export interface WinState { w: number; h: number; maximized: boolean }

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  seed: string;
  font: string;
  /** app icon set: solid / outline (Fluent) or thin outline (Lucide); colourful sidebar icons */
  iconStyle: 'filled' | 'regular' | 'lucide';
  colorIcons: boolean;
  /** default Quick access folders the user removed (ids) */
  unpinned: string[];
  /** Quick access order: "p:<place id>" / "d:<folder>" keys */
  quickOrder: string[];
  effect: 'mica' | 'tabbed' | 'acrylic' | 'frosted' | 'liquid' | 'none';
  /** UI font size in px (scales the whole interface) and file-list text size in px */
  uiFont: number;
  listFont: number;
  startTab: string;
  startPath: string;
  folderSizes: boolean;
  /** context menu entries the user switched on / off (id -> visible); missing = the entry's default */
  menu: Record<string, boolean>;
  /** the user's own random-rename styles (the built-in ones live in lib/randomRename.ts) */
  randomStyles: { id: string; label: string; pattern: string }[];
  customMenu: { id: string; label: string; program: string; args: string; scope: 'file' | 'folder' | 'any' | 'bg' }[];
  density: 'comfortable' | 'compact';
  lang: 'en' | 'vi';
  view: ViewMode;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  groupBy: GroupBy;
  showHidden: boolean;
  showExt: boolean;
  showChecks: boolean;
  showNav: boolean;
  showDetails: boolean;
  autoExpandTree: boolean;
  confirmDelete: boolean;
  thumbnails: boolean;
  rememberLayouts: boolean;
  restoreTabs: boolean;
  trayEnabled: boolean;
  globalShortcut: boolean;
  dualPane: boolean;
  windowMode: 'remember' | 'maximized';
  winState: WinState | null;
  cols: ColId[];
  colW: Record<ColId, number>;
  pinned: string[];
  recent: { path: string; t: number }[];
  frequent: Record<string, number>;
  tags: Record<string, TagId[]>;
  tagNames: Partial<Record<TagId, string>>;
  folderStyles: Record<string, FolderDesign>;
  searchHistory: string[];
  savedSearches: SavedSearch[];
  layouts: Record<string, Layout>;
  session: { a: { paths: string[]; active: number } | null };
}

export const DEFAULTS: Settings = {
  theme: 'system', seed: DEFAULT_SEED, font: 'system', iconStyle: 'filled', colorIcons: true, unpinned: [], quickOrder: [], effect: 'mica', uiFont: 14, listFont: 14, startTab: 'home', startPath: '', folderSizes: true, menu: {}, customMenu: [], randomStyles: [], density: 'comfortable',
  lang: (typeof navigator !== 'undefined' && (navigator.language || 'en').toLowerCase().startsWith('vi')) ? 'vi' : 'en',
  view: 'details', sortKey: 'name', sortDir: 'asc', groupBy: 'none',
  showHidden: false, showExt: true, showChecks: false, showNav: true, showDetails: false, autoExpandTree: false,
  confirmDelete: true, thumbnails: true, rememberLayouts: true, restoreTabs: false,
  trayEnabled: false, globalShortcut: false, dualPane: false,
  windowMode: 'remember', winState: null,
  cols: ['modified', 'type', 'size'], colW: { modified: 170, created: 170, type: 160, size: 100 },
  pinned: [], recent: [], frequent: {}, tags: {}, tagNames: {}, folderStyles: {}, searchHistory: [], savedSearches: [], layouts: {}, session: { a: null }
};

const KEY = 'fluent-file.settings.v1';
function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
    const s = { ...DEFAULTS, ...raw } as Settings;
    s.colW = { ...DEFAULTS.colW, ...(raw.colW || {}) };
    if (!Array.isArray(s.cols)) s.cols = DEFAULTS.cols.slice();
    if ((s.effect as string) === 'blur') s.effect = 'acrylic';
    if (raw.uiFont === undefined && raw.fontSize) s.uiFont = ({ sm: 13, md: 14, lg: 15.5 } as Record<string, number>)[raw.fontSize as string] ?? 14;
    s.uiFont = Math.max(11, Math.min(20, Number(s.uiFont) || 14)); s.listFont = Math.max(11, Math.min(22, Number(s.listFont) || 14));
    s.menu = { ...(raw.menu || {}) };
    if (!Array.isArray(s.customMenu)) s.customMenu = [];
    if (!Array.isArray(s.randomStyles)) s.randomStyles = [];
    if (!Array.isArray(s.unpinned)) s.unpinned = [];
    if (!Array.isArray(s.quickOrder)) s.quickOrder = [];
    if (!['filled', 'regular', 'lucide'].includes(s.iconStyle)) s.iconStyle = 'filled';
    return s;
  } catch { return { ...DEFAULTS }; }
}

interface Store extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}
let timer = 0;
export const useSettings = create<Store>((set, get) => ({
  ...load(),
  set: (patch) => set(patch),
  reset: () => {
    const k = get();
    set({ ...DEFAULTS, lang: DEFAULTS.lang, pinned: k.pinned, recent: k.recent, frequent: k.frequent, tags: k.tags, tagNames: k.tagNames, folderStyles: k.folderStyles, savedSearches: k.savedSearches, winState: k.winState });
  }
}));
// debounce persistence so rapid changes (column resize, window resize) do not hammer localStorage
useSettings.subscribe((s) => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    const { set: _s, reset: _r, ...data } = s;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota */ }
  }, 150);
});
export const getSettings = () => useSettings.getState();
