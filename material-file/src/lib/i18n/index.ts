import { useSettings } from '../../store/settings';
import { enBase } from './en.base';
import { viBase } from './vi.base';
import { enExtra } from './en.extra';
import { viExtra } from './vi.extra';

const dict: Record<string, Record<string, string>> = {
  en: { ...enBase, ...enExtra },
  vi: { ...viBase, ...viExtra }
};

export type Vars = Record<string, string | number>;
export function translate(lang: string, key: string, vars?: Vars): string {
  let s = dict[lang]?.[key] ?? dict.en[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}
/** Non-reactive translator (reads the current language). Use inside event handlers and stores. */
export const t = (key: string, vars?: Vars) => translate(useSettings.getState().lang, key, vars);
/** Reactive translator: re-renders the component when the language changes. */
export function useT() {
  const lang = useSettings((s) => s.lang);
  return (key: string, vars?: Vars) => translate(lang, key, vars);
}
