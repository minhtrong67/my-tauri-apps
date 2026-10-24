import { useMemo } from 'react';
import { localeOf, useT, type TFn } from './i18n';
import { useStore } from './store';
import type { Lang, Settings, Weather } from './types';

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const deg = (v: number | null | undefined) => (v == null ? '–' : Math.round(v) + '°');

export type Kind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
export function kindOf(code: number): Kind {
  if (code <= 1) return 'clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}
export function skyClass(code: number, isDay: boolean): string {
  const k = kindOf(code);
  if (k === 'clear' || k === 'partly') return isDay ? 'sky-clear-day' : 'sky-clear-night';
  if (k === 'cloudy') return isDay ? 'sky-cloudy-day' : 'sky-cloudy-night';
  if (k === 'drizzle') return 'sky-rain';
  return 'sky-' + k;
}

const mins = (s: string) => +s.slice(11, 13) * 60 + +s.slice(14, 16);
const use12 = (lang: Lang, tf: Settings['timeFormat']) => (tf === 'auto' ? lang === 'en' : tf === '12');

export function makeFmt(lang: Lang, tf: Settings['timeFormat'], t: TFn) {
  const h12 = use12(lang, tf);
  const loc = localeOf(lang);
  return {
    hour: (time: string) => {
      const h = +time.slice(11, 13);
      return h12 ? `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}` : lang === 'vi' ? `${h}h` : `${String(h).padStart(2, '0')}:00`;
    },
    clock: (time: string) => {
      const h = +time.slice(11, 13), m = time.slice(14, 16);
      return h12 ? `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}` : `${String(h).padStart(2, '0')}:${m}`;
    },
    dayName: (date: string, i: number) => {
      if (i === 0) return t('day.today');
      const [y, m, d] = date.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(loc, { weekday: 'short' });
    },
    dayLong: (date: string) => {
      const [y, m, d] = date.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' });
    },
    placeDateTime: (m: Weather) => {
      const s = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: h12, timeZone: 'UTC' }).format(new Date(Date.now() + m.utcOffset * 1000));
      return s.charAt(0).toUpperCase() + s.slice(1);
    },
    updated: (ts: number) => new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit', hour12: h12 }).format(new Date(ts)),
  };
}
export type Fmt = ReturnType<typeof makeFmt>;
/** Formatters bound to the current language + time-format settings. */
export function useFmt(): Fmt {
  const t = useT();
  const lang = useStore((s) => s.settings.lang);
  const tf = useStore((s) => s.settings.timeFormat);
  return useMemo(() => makeFmt(lang, tf, t), [lang, tf, t]);
}

export const windLabel = (u: string) => ({ kmh: 'km/h', ms: 'm/s', mph: 'mph' })[u] ?? u;
export const compass = (d: number, t: TFn) => t('dir.' + ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8]);
export function uvInfo(v: number | null) {
  if (v == null || v < 3) return { key: 'uv.low', color: '#43a047' };
  if (v < 6) return { key: 'uv.moderate', color: '#f9a825' };
  if (v < 8) return { key: 'uv.high', color: '#fb8c00' };
  if (v < 11) return { key: 'uv.veryHigh', color: '#e53935' };
  return { key: 'uv.extreme', color: '#8e24aa' };
}
export function aqiInfo(v: number) {
  if (v <= 50) return { key: 'aqi.good', adv: 'aqi.advice.good', color: '#43a047' };
  if (v <= 100) return { key: 'aqi.moderate', adv: 'aqi.advice.moderate', color: '#f9a825' };
  if (v <= 150) return { key: 'aqi.sensitive', adv: 'aqi.advice.sensitive', color: '#fb8c00' };
  if (v <= 200) return { key: 'aqi.unhealthy', adv: 'aqi.advice.unhealthy', color: '#e53935' };
  if (v <= 300) return { key: 'aqi.veryUnhealthy', adv: 'aqi.advice.veryUnhealthy', color: '#8e24aa' };
  return { key: 'aqi.hazardous', adv: 'aqi.advice.hazardous', color: '#7b1f3a' };
}
export function sunProgress(nowTime: string, sunrise: string, sunset: string): number | null {
  const n = mins(nowTime), a = mins(sunrise), b = mins(sunset);
  return n < a || n > b ? null : (n - a) / Math.max(b - a, 1);
}
export const daylight = (sunrise: string, sunset: string) => {
  const m = mins(sunset) - mins(sunrise);
  return { h: Math.floor(m / 60), m: m % 60 };
};
export const placeSub = (p: { admin: string; country: string }) => [p.admin, p.country].filter(Boolean).join(', ');
export const toC = (m: Weather, v: number) => (m.tempUnit === 'f' ? ((v - 32) * 5) / 9 : v);
export const toKmh = (m: Weather, v: number) => (m.windUnit === 'ms' ? v * 3.6 : m.windUnit === 'mph' ? v * 1.609 : v);
