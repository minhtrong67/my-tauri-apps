import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SEED } from './theme';
import type { FontKey, SizeKey } from './fonts';

export type ThemeMode = 'system' | 'light' | 'dark';
export type LangPref = 'auto' | 'en' | 'vi';

export interface Settings {
  mode: ThemeMode;
  seed: string;
  contrast: 0 | 0.5 | 1;
  lang: LangPref;
  font: FontKey;
  size: SizeKey;
  zoom: number;
  wrap: boolean;
  lineNumbers: boolean;
  syncScroll: boolean;
  autosave: boolean;
  restore: boolean;
  saveDir: string;
}
export const DEFAULT_SETTINGS: Settings = {
  mode: 'system', seed: DEFAULT_SEED, contrast: 0, lang: 'auto', font: 'system', size: 'md', zoom: 100,
  wrap: true, lineNumbers: false, syncScroll: true, autosave: false, restore: true, saveDir: '',
};

interface Store extends Settings { set: (p: Partial<Settings>) => void; reset: () => void }
export const useSettings = create<Store>()(persist(
  (set) => ({ ...DEFAULT_SETTINGS, set: (p) => set(p), reset: () => set({ ...DEFAULT_SETTINGS }) }),
  { name: 'mr3.settings', version: 1, partialize: (s) => {
    const { set: _a, reset: _b, ...rest } = s; return rest;
  } },
));
export const getSettings = () => useSettings.getState();
