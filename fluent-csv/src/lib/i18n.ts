import { en, vi } from './dict';

export type LangPref = 'system' | 'en' | 'vi';
export const DICT: Record<string, Record<string, string>> = { en, vi };

let current: 'en' | 'vi' = 'en';

export function resolveLang(pref: LangPref): 'en' | 'vi' {
  if (pref === 'en' || pref === 'vi') return pref;
  return /^vi\b/i.test(navigator.language || '') ? 'vi' : 'en';
}
export function setLang(pref: LangPref) { current = resolveLang(pref); document.documentElement.lang = current; }
export const lang = () => current;

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = DICT[current]?.[key] ?? en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}
