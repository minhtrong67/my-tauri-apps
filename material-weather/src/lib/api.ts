// Open-Meteo (https://open-meteo.com) - free, no API key.
import type { Aqi, DayPoint, HourPoint, Place, Settings, Weather } from './types';

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';

async function getJSON<T = any>(url: string, { signal, timeout = 12000 }: { signal?: AbortSignal; timeout?: number } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface Found {
  name: string;
  admin: string;
  country: string;
  lat: number;
  lon: number;
}

export async function searchPlaces(query: string, lang: string, signal?: AbortSignal): Promise<Found[]> {
  const q = new URLSearchParams({ name: query, count: '8', language: lang, format: 'json' });
  const data = await getJSON<{ results?: any[] }>(`${GEO}?${q}`, { signal });
  return (data.results ?? []).map((r) => ({ name: r.name, admin: r.admin1 || '', country: r.country || '', lat: r.latitude, lon: r.longitude }));
}

// ---- Location --------------------------------------------------------------
export type GeoPermission = 'granted' | 'prompt' | 'denied';
export async function geoPermission(): Promise<GeoPermission> {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state as GeoPermission;
  } catch {
    return 'prompt';
  }
}
export type GeoError = { code: 'denied' | 'timeout' | 'unavailable' | 'unsupported' };

export function getPosition(timeout = 15000): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject({ code: 'unsupported' } as GeoError);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (e) => reject({ code: e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable' } as GeoError),
      { enableHighAccuracy: false, timeout, maximumAge: 10 * 60 * 1000 },
    );
  });
}

async function reverseGeocode(lat: number, lon: number, lang: string) {
  try {
    const q = new URLSearchParams({ latitude: String(lat), longitude: String(lon), localityLanguage: lang });
    const d = await getJSON<any>(`https://api.bigdatacloud.net/data/reverse-geocode-client?${q}`, { timeout: 7000 });
    const name: string = d.city || d.locality || d.principalSubdivision || '';
    return { name, admin: d.city || d.locality ? d.principalSubdivision || '' : '', country: d.countryName || '' };
  } catch {
    return null;
  }
}

export async function locateByGPS(lang: string): Promise<Found> {
  const c = await getPosition();
  const r = (await reverseGeocode(c.latitude, c.longitude, lang)) ?? { name: '', admin: '', country: '' };
  return { ...r, lat: c.latitude, lon: c.longitude };
}

const IP_PROVIDERS: (() => Promise<Found>)[] = [
  async () => {
    const d = await getJSON<any>('https://ipwho.is/', { timeout: 7000 });
    if (d.success === false || d.latitude == null) throw new Error('ipwho');
    return { name: d.city || d.region || d.country, admin: d.city ? d.region || '' : '', country: d.country || '', lat: d.latitude, lon: d.longitude };
  },
  async () => {
    const d = await getJSON<any>('https://get.geojs.io/v1/ip/geo.json', { timeout: 7000 });
    if (!d.latitude) throw new Error('geojs');
    return { name: d.city || d.region || d.country, admin: d.city ? d.region || '' : '', country: d.country || '', lat: +d.latitude, lon: +d.longitude };
  },
  async () => {
    const d = await getJSON<any>('https://ipapi.co/json/', { timeout: 7000 });
    if (!d.latitude) throw new Error('ipapi');
    return { name: d.city || d.region || d.country_name, admin: d.city ? d.region || '' : '', country: d.country_name || '', lat: d.latitude, lon: d.longitude };
  },
];
export async function locateByIP(): Promise<Found> {
  for (const p of IP_PROVIDERS) {
    try {
      return await p();
    } catch {
      /* try the next provider */
    }
  }
  throw new Error('ip location failed');
}

// ---- Weather ---------------------------------------------------------------
export const unitsKey = (s: Settings) => `${s.tempUnit}-${s.windUnit}`;

export async function fetchWeather(place: Place, s: Settings): Promise<Weather> {
  const common = { latitude: String(place.lat), longitude: String(place.lon), timezone: 'auto' };
  const wp = new URLSearchParams({
    ...common,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day,visibility,uv_index,wind_speed_10m,relative_humidity_2m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max',
    forecast_days: '7',
    past_days: '1',
    temperature_unit: s.tempUnit === 'f' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: s.windUnit,
    precipitation_unit: s.tempUnit === 'f' ? 'inch' : 'mm',
  });
  const ap = new URLSearchParams({ ...common, current: 'us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide' });
  const [fc, aq] = await Promise.allSettled([getJSON<any>(`${FORECAST}?${wp}`), getJSON<any>(`${AIR}?${ap}`)]);
  if (fc.status !== 'fulfilled') throw fc.reason;
  return normalize(place, fc.value, aq.status === 'fulfilled' ? aq.value : null, s);
}

function normalize(place: Place, f: any, aq: any, s: Settings): Weather {
  const c = f.current, h = f.hourly, d = f.daily;
  const today = String(c.time).slice(0, 10);
  const start = Math.max(h.time.findIndex((x: string) => x.startsWith(today)), 0);
  const hourly: HourPoint[] = [];
  for (let i = start; i < h.time.length; i++) {
    hourly.push({ time: h.time[i], temp: h.temperature_2m[i], code: h.weather_code[i], isDay: h.is_day[i] === 1, pop: h.precipitation_probability?.[i] ?? 0, wind: h.wind_speed_10m?.[i] ?? 0, hum: h.relative_humidity_2m?.[i] ?? 0 });
  }
  const hourIdx = Math.max(hourly.findIndex((x) => x.time === String(c.time).slice(0, 13) + ':00'), 0);
  const all: DayPoint[] = d.time.map((date: string, i: number) => ({
    date, code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], sunrise: d.sunrise[i], sunset: d.sunset[i],
    uvMax: d.uv_index_max?.[i] ?? 0, pop: d.precipitation_probability_max?.[i] ?? 0, precipSum: d.precipitation_sum?.[i] ?? 0, windMax: d.wind_speed_10m_max?.[i] ?? 0,
  }));
  const ti = Math.max(all.findIndex((x) => x.date === today), 0);
  const y = ti > 0 ? all[ti - 1] : null;
  const ac = aq?.current;
  const aqi: Aqi | null = ac ? { us: ac.us_aqi ?? null, pm25: ac.pm2_5 ?? null, pm10: ac.pm10 ?? null, o3: ac.ozone ?? null, no2: ac.nitrogen_dioxide ?? null, so2: ac.sulphur_dioxide ?? null, co: ac.carbon_monoxide ?? null } : null;
  return {
    place, tempUnit: s.tempUnit, windUnit: s.windUnit, fetchedAt: Date.now(), utcOffset: f.utc_offset_seconds || 0,
    now: {
      time: c.time, temp: c.temperature_2m, feels: c.apparent_temperature, humidity: c.relative_humidity_2m, code: c.weather_code, isDay: c.is_day === 1,
      cloud: c.cloud_cover, pressure: c.pressure_msl, wind: c.wind_speed_10m, windDir: c.wind_direction_10m, gust: c.wind_gusts_10m, precip: c.precipitation,
      visibility: h.visibility?.[start + hourIdx] ?? null, uv: h.uv_index?.[start + hourIdx] ?? null,
    },
    hourly, hourIdx, daily: all.slice(ti, ti + 7), yesterday: y ? { max: y.max, min: y.min } : null, aqi,
  };
}
