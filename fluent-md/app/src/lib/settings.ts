import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ACCENT } from './theme';
import type { FontKey, SizeKey } from './fonts';

export type ThemeMode = 'system' | 'light' | 'dark';
export type LangPref = 'auto' | 'en' | 'vi';
/** Windows 11 system backdrop: Mica, Acrylic or Mica Alt (the "Tabbed" material). */
export type Material = 'mica' | 'acrylic' | 'alt';

export interface Settings {
  mode: ThemeMode;
  accent: string;
  material: Material;
  lang: LangPref;
  font: FontKey;
  size: SizeKey;
  zoom: number;
  wrap: boolean;
  lineNumbers: boolean;
  syncScroll: boolean;
  autosave: boolean;
  restore: boolean;
  spellcheck: boolean;
  saveDir: string;
  /** Share of the width given to the editor in split view. */
  split: number;
}
export const DEFAULT_SETTINGS: Settings = {
  mode: 'system', accent: DEFAULT_ACCENT, material: 'mica', lang: 'auto', font: 'system', size: 'md', zoom: 100,
  wrap: true, lineNumbers: false, syncScroll: true, autosave: false, restore: true, spellcheck: false, saveDir: '', split: 0.5,
};

interface Store extends Settings { set: (p: Partial<Settings>) => void; reset: () => void }
export const useSettings = create<Store>()(persist(
  (set) => ({ ...DEFAULT_SETTINGS, set: (p) => set(p), reset: () => set({ ...DEFAULT_SETTINGS }) }),
  { name: 'fmd.settings', version: 1, partialize: (s) => {
    const { set: _a, reset: _b, ...rest } = s; return rest;
  } },
));
export const getSettings = () => useSettings.getState();
