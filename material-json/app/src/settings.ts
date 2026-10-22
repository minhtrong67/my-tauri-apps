import type { LangSetting } from './i18n';
import { bus } from './bus';

export interface WindowState { w: number; h: number; x?: number; y?: number; maximized?: boolean }
export interface Settings {
  theme: 'light' | 'dark' | 'system';
  color: string;
  fontSize: 'small' | 'medium' | 'large';
  lang: LangSetting;
  windowMode: 'remember' | 'maximized';
  window?: WindowState;
  indent: 2 | 4 | 'tab';
  wrap: boolean;
  restore: boolean;
  motion: boolean;
  viewMode: 'code' | 'split' | 'tree';
  splitRatio: number;
  treeSync: boolean;
}

export const DEFAULTS: Settings = {
  theme: 'system', color: '#FF9800', fontSize: 'medium', lang: 'auto', windowMode: 'remember',
  indent: 2, wrap: false, restore: true, motion: true, viewMode: 'split', splitRatio: 0.55, treeSync: true,
};

const KEY = 'material-json:settings';

function load(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}

export const settings: Settings = load();

export function update(patch: Partial<Settings>) {
  Object.assign(settings, patch);
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage full */ }
  bus.emit('settings', Object.keys(patch));
}

export function resetSettings() {
  const win = settings.window;
  for (const k of Object.keys(settings)) delete (settings as unknown as Record<string, unknown>)[k];
  Object.assign(settings, DEFAULTS, { window: win });
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  bus.emit('settings', Object.keys(DEFAULTS));
}

export const PALETTE: { name: string; hex: string }[] = [
  { name: 'Red', hex: '#F44336' }, { name: 'Pink', hex: '#E91E63' }, { name: 'Purple', hex: '#9C27B0' }, { name: 'Deep Purple', hex: '#673AB7' },
  { name: 'Indigo', hex: '#3F51B5' }, { name: 'Blue', hex: '#2196F3' }, { name: 'Light Blue', hex: '#03A9F4' }, { name: 'Cyan', hex: '#00BCD4' },
  { name: 'Teal', hex: '#009688' }, { name: 'Green', hex: '#4CAF50' }, { name: 'Light Green', hex: '#8BC34A' }, { name: 'Lime', hex: '#CDDC39' },
  { name: 'Yellow', hex: '#FFEB3B' }, { name: 'Amber', hex: '#FFC107' }, { name: 'Orange', hex: '#FF9800' }, { name: 'Deep Orange', hex: '#FF5722' },
  { name: 'Brown', hex: '#795548' }, { name: 'Blue Grey', hex: '#607D8B' },
];
