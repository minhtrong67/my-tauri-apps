import { kindOf, toC, toKmh, type Fmt } from './format';
import type { TFn } from './i18n';
import type { Weather } from './types';

export interface Tip {
  p: number;
  icon: 'zap' | 'umbrella' | 'leaf' | 'sun' | 'thermometer' | 'wind';
  tone: 'warn' | 'info' | 'good';
  text: string;
}

export function tipsOf(m: Weather, t: TFn, fmt: Fmt): Tip[] {
  const n = m.now, tips: Tip[] = [];
  const add = (p: number, icon: Tip['icon'], tone: Tip['tone'], key: string, vars?: Record<string, string | number>) => tips.push({ p, icon, tone, text: t(key, vars) });
  const next = m.hourly.slice(m.hourIdx, m.hourIdx + 13);
  const kind = kindOf(n.code);
  const rainy = ['rain', 'drizzle', 'storm'].includes(kind) || n.precip > 0.1;
  if (kind === 'storm' || next.some((h) => kindOf(h.code) === 'storm')) add(0, 'zap', 'warn', 'tips.storm');
  if (rainy) add(1, 'umbrella', 'info', 'tips.rainNow');
  else {
    const h = next.slice(1).find((x) => x.pop >= 50 || ['rain', 'drizzle'].includes(kindOf(x.code)));
    if (h) add(1, 'umbrella', 'info', 'tips.rainAt', { time: fmt.hour(h.time) });
    else add(6, 'umbrella', 'good', 'tips.dry');
  }
  const a = m.aqi?.us;
  if (a != null && a > 150) add(2, 'leaf', 'warn', 'tips.aqiBad');
  else if (a != null && a > 100) add(3, 'leaf', 'warn', 'tips.aqiSens');
  else if (a != null && a <= 50) add(7, 'leaf', 'good', 'tips.aqiGood');
  const uv = m.daily[0].uvMax ?? 0;
  if (uv >= 6) add(2, 'sun', 'warn', 'tips.uvHigh', { v: uv.toFixed(0) });
  else if (uv >= 3) add(5, 'sun', 'info', 'tips.uvMod', { v: uv.toFixed(0) });
  const f = toC(m, n.feels);
  if (f >= 35) add(2, 'thermometer', 'warn', 'tips.hot');
  else if (f >= 30) add(4, 'thermometer', 'info', 'tips.warm');
  else if (f <= 10) add(2, 'thermometer', 'info', 'tips.cold');
  else if (f <= 18) add(4, 'thermometer', 'info', 'tips.cool');
  else add(8, 'thermometer', 'good', 'tips.mild');
  if (toKmh(m, n.wind) >= 40) add(3, 'wind', 'warn', 'tips.wind');
  return tips.sort((x, y) => x.p - y.p).slice(0, 4);
}

/** Moon phase computed locally (synodic month). */
export function moonPhase(date = new Date()) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const p = ((((jd - 2451550.1) / 29.530588853) % 1) + 1) % 1;
  const illum = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const idx = p < 0.03 || p > 0.97 ? 0 : p < 0.22 ? 1 : p < 0.28 ? 2 : p < 0.47 ? 3 : p < 0.53 ? 4 : p < 0.72 ? 5 : p < 0.78 ? 6 : 7;
  return { p, illum, idx };
}

export function dewPoint(m: Weather): number {
  const T = toC(m, m.now.temp);
  const g = Math.log(Math.max(m.now.humidity, 1) / 100) + (17.62 * T) / (243.12 + T);
  const td = (243.12 * g) / (17.62 - g);
  return m.tempUnit === 'f' ? (td * 9) / 5 + 32 : td;
}
