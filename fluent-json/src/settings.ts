import type { LangSetting } from './i18n';
import { bus } from './bus';

export interface WindowState { w: number; h: number; x?: number; y?: number; maximized?: boolean }
export type Material = 'mica' | 'acrylic' | 'mica-alt';
export interface Settings {
  theme: 'light' | 'dark' | 'system';
  color: string;
  systemAccent: boolean;
  material: Material;
  navOpen: boolean;
  fontSize: 'small' | 'medium' | 'large';
  codeFont: 'default' | 'jetbrains-mono' | 'fira-code' | 'cascadia-code' | 'source-code-pro' | 'roboto-mono' | 'ibm-plex-mono' | 'consolas';
  font: 'system' | 'segoe-ui' | 'inter' | 'roboto' | 'be-vietnam-pro' | 'arial';
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
  theme: 'system', color: '#0078D4', systemAccent: true, material: 'mica', navOpen: false, codeFont: 'default', fontSize: 'medium', font: 'system', lang: 'auto', windowMode: 'remember',
  indent: 2, wrap: false, restore: true, motion: true, viewMode: 'split', splitRatio: 0.55, treeSync: true,
};

const KEY = 'fluent-json:settings';

export const CODE_FONT_IDS = ['default', 'jetbrains-mono', 'fira-code', 'cascadia-code', 'source-code-pro', 'roboto-mono', 'ibm-plex-mono', 'consolas'];
const FONT_IDS = ['system', 'segoe-ui', 'inter', 'roboto', 'be-vietnam-pro', 'arial'];
export const MATERIALS: Material[] = ['mica', 'mica-alt', 'acrylic'];

function load(): Settings {
  try {
    const s: Settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    if (!FONT_IDS.includes(s.font)) s.font = 'system'; // fonts removed in v1.1 fall back to the system font
    if (!/^#[0-9a-f]{6}$/i.test(s.color)) s.color = DEFAULTS.color;
    if (!CODE_FONT_IDS.includes(s.codeFont)) s.codeFont = 'default';
    if (!MATERIALS.includes(s.material)) s.material = 'mica';
    return s;
  } catch { return { ...DEFAULTS }; }
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

/** Windows accent colours. */
export const PALETTE: { name: string; hex: string }[] = [
  { name: 'Gold', hex: '#FFB900' }, { name: 'Orange', hex: '#F7630C' }, { name: 'Rust', hex: '#DA3B01' }, { name: 'Brick', hex: '#D13438' },
  { name: 'Red', hex: '#E81123' }, { name: 'Rose', hex: '#EA005E' }, { name: 'Plum', hex: '#E3008C' }, { name: 'Orchid', hex: '#B146C2' },
  { name: 'Violet', hex: '#8764B8' }, { name: 'Iris', hex: '#744DA9' }, { name: 'Indigo', hex: '#6B69D6' }, { name: 'Blue', hex: '#0078D4' },
  { name: 'Cobalt', hex: '#0063B1' }, { name: 'Sky', hex: '#00B7C3' }, { name: 'Teal', hex: '#038387' }, { name: 'Mint', hex: '#00B294' },
  { name: 'Green', hex: '#107C10' }, { name: 'Olive', hex: '#498205' }, { name: 'Steel', hex: '#69797E' }, { name: 'Stone', hex: '#7A7574' },
];
