import type { Lang } from './engine';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...(typeof fallback === 'object' && !Array.isArray(fallback) ? fallback : {}), ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable: ignore */
  }
}

export function relativeTime(ts: number, lang: Lang, justNow: string) {
  const diff = Math.round((ts - Date.now()) / 1000);
  if (Math.abs(diff) < 45) return justNow;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
  return justNow;
}

export const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
export const MOD = isMac ? '⌘' : 'Ctrl';
