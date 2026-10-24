import { useCallback } from 'react';
import en from '../locales/en';
import vi from '../locales/vi';
import { useStore } from './store';
import type { Lang } from './types';

const dict: Record<Lang, Record<string, string>> = { en, vi };

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'vi', label: 'Tiếng Việt' },
];
export type Vars = Record<string, string | number>;
export type TFn = (key: string, vars?: Vars) => string;

export function translate(lang: Lang, key: string, vars?: Vars): string {
  let s = dict[lang][key] ?? dict.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
/** Non-React helper (reads the current language from the store). */
export const t: TFn = (key, vars) => translate(useStore.getState().settings.lang, key, vars);
/** React hook: re-renders the component when the language changes. */
export function useT(): TFn {
  const lang = useStore((s) => s.settings.lang);
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}
export const localeOf = (lang: Lang) => (lang === 'vi' ? 'vi-VN' : 'en-US');

const KNOWN = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
export function wmoKey(code: number): string {
  const c = KNOWN.includes(code) ? code : [...KNOWN].reverse().find((k) => k <= code) ?? 0;
  return 'wmo.' + c;
}
