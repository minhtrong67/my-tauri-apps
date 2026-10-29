import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from './engine';
import { detectLanguage, makeT, type TFn } from './i18n';
import { applyScheme, DEFAULT_SEED } from './theme';
import { setNativeTheme } from './tauri';
import { loadJSON, saveJSON } from './utils';

export type ThemeMode = 'system' | 'light' | 'dark';
export type LangPref = 'auto' | Lang;
export type FontSize = 'sm' | 'md' | 'lg';
export type FontId = 'system' | 'roboto' | 'inter' | 'openSans' | 'notoSans' | 'beVietnam';

const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

/** The five bundled fonts (all support Vietnamese) plus the system font. */
export const FONTS: readonly { id: FontId; name: string | null; stack: string }[] = [
  { id: 'system', name: null, stack: SYSTEM_STACK },
  { id: 'roboto', name: 'Roboto', stack: `"Roboto", ${SYSTEM_STACK}` },
  { id: 'inter', name: 'Inter', stack: `"Inter", ${SYSTEM_STACK}` },
  { id: 'openSans', name: 'Open Sans', stack: `"Open Sans", ${SYSTEM_STACK}` },
  { id: 'notoSans', name: 'Noto Sans', stack: `"Noto Sans", ${SYSTEM_STACK}` },
  { id: 'beVietnam', name: 'Be Vietnam Pro', stack: `"Be Vietnam Pro", ${SYSTEM_STACK}` },
];

export interface Settings {
  theme: ThemeMode;
  seed: string;
  lang: LangPref;
  font: FontId;
  fontSize: FontSize;
  autoCopy: boolean;
  keepHistory: boolean;
  smartTitle: boolean;
  keepAcronyms: boolean;
  favorites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system', seed: DEFAULT_SEED, lang: 'auto', font: 'system', fontSize: 'md',
  autoCopy: false, keepHistory: true, smartTitle: true, keepAcronyms: true, favorites: [],
};

const KEY = 'cc.settings.v2';

interface Ctx {
  s: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  lang: Lang;
  dark: boolean;
  t: TFn;
}
const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(() => loadJSON(KEY, DEFAULT_SETTINGS));
  const [sysDark, setSysDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const dark = s.theme === 'system' ? sysDark : s.theme === 'dark';
  const lang: Lang = s.lang === 'auto' ? detectLanguage() : s.lang;
  const t = useMemo(() => makeT(lang), [lang]);

  useLayoutEffect(() => applyScheme(s.seed, dark), [s.seed, dark]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.fs = s.fontSize;
    root.style.setProperty('--font', (FONTS.find((f) => f.id === s.font) ?? FONTS[0]).stack);
    root.lang = lang;
  }, [s.fontSize, s.font, lang]);
  useEffect(() => void setNativeTheme(s.theme === 'system' ? null : s.theme), [s.theme]);
  useEffect(() => saveJSON(KEY, s), [s]);

  const update = useCallback((patch: Partial<Settings>) => setS((p) => ({ ...p, ...patch })), []);
  const reset = useCallback(() => setS((p) => ({ ...DEFAULT_SETTINGS, favorites: p.favorites })), []);
  const value = useMemo(() => ({ s, update, reset, lang, dark, t }), [s, update, reset, lang, dark, t]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const c = useContext(SettingsContext);
  if (!c) throw new Error('SettingsProvider missing');
  return c;
}
