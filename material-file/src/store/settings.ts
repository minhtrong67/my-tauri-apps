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
  fontSize: 'sm' | 'md' | 'lg';
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
  checkUpdates: boolean;
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
  searchHistory: string[];
  savedSearches: SavedSearch[];
  layouts: Record<string, Layout>;
  session: { a: { paths: string[]; active: number } | null };
  lastUpdateCheck: number;
}

export const DEFAULTS: Settings = {
  theme: 'system', seed: DEFAULT_SEED, font: 'system', fontSize: 'md', density: 'comfortable',
  lang: (typeof navigator !== 'undefined' && (navigator.language || 'en').toLowerCase().startsWith('vi')) ? 'vi' : 'en',
  view: 'details', sortKey: 'name', sortDir: 'asc', groupBy: 'none',
  showHidden: false, showExt: true, showChecks: false, showNav: true, showDetails: false, autoExpandTree: false,
  confirmDelete: true, thumbnails: true, rememberLayouts: true, restoreTabs: false, checkUpdates: true,
  trayEnabled: false, globalShortcut: false, dualPane: false,
  windowMode: 'remember', winState: null,
  cols: ['modified', 'type', 'size'], colW: { modified: 170, created: 170, type: 160, size: 100 },
  pinned: [], recent: [], frequent: {}, tags: {}, tagNames: {}, searchHistory: [], savedSearches: [], layouts: {}, session: { a: null }, lastUpdateCheck: 0
};

const KEY = 'material-file.settings.v2';
function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
    const s = { ...DEFAULTS, ...raw } as Settings;
    s.colW = { ...DEFAULTS.colW, ...(raw.colW || {}) };
    if (!Array.isArray(s.cols)) s.cols = DEFAULTS.cols.slice();
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
    set({ ...DEFAULTS, lang: DEFAULTS.lang, pinned: k.pinned, recent: k.recent, frequent: k.frequent, tags: k.tags, tagNames: k.tagNames, savedSearches: k.savedSearches, winState: k.winState });
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
