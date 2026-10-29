import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyTheme, DEFAULT_SEED } from './theme';
import { fontStack, SIZE_PX, type FontId } from './fonts';
import { translate, type Key, type Lang } from './i18n';
import { setNativeTheme } from './windowState';

export type Mode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type WindowMode = 'remember' | 'maximized';
export type SaveMode = 'ask' | 'folder';

export interface Settings {
  mode: Mode;
  seed: string;
  fontSize: FontSize;
  font: FontId;
  lang: Lang;
  windowMode: WindowMode;
  saveMode: SaveMode;
  saveDir: string | null;
}

const KEY = 'mico.settings';

export const DEFAULTS: Settings = {
  mode: 'system',
  seed: DEFAULT_SEED,
  fontSize: 'medium',
  font: 'system',
  lang: typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en',
  windowMode: 'remember',
  saveMode: 'ask',
  saveDir: null,
};

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = (s: Settings) => (s.mode === 'system' ? prefersDark() : s.mode === 'dark');

function paint(s: Settings) {
  applyTheme(s.seed, isDark(s));
  const root = document.documentElement;
  root.style.fontSize = SIZE_PX[s.fontSize] + 'px';
  root.style.setProperty('--app-font', fontStack(s.font));
  root.lang = s.lang;
}

/** Applied before React renders so the first frame already has the right theme. */
export function bootTheme() {
  paint(loadSettings());
}

interface Ctx {
  s: Settings;
  dark: boolean;
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
}
const SettingsCtx = createContext<Ctx>(null!);
export const useSettings = () => useContext(SettingsCtx);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(loadSettings);
  const [sysDark, setSysDark] = useState(prefersDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSysDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const dark = s.mode === 'system' ? sysDark : s.mode === 'dark';

  useEffect(() => {
    paint({ ...s, mode: dark ? 'dark' : 'light' });
    setNativeTheme(s.mode === 'system' ? null : s.mode);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
  }, [s, dark]);

  const set = useCallback((patch: Partial<Settings>) => setS((p) => ({ ...p, ...patch })), []);
  const reset = useCallback(() => setS({ ...DEFAULTS }), []);
  const t = useCallback((key: Key, vars?: Record<string, string | number>) => translate(s.lang, key, vars), [s.lang]);
  const value = useMemo(() => ({ s, dark, set, reset, t }), [s, dark, set, reset, t]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}
