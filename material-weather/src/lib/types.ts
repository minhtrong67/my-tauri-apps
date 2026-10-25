export type Lang = 'en' | 'vi';
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontId = 'system' | 'roboto' | 'inter' | 'open-sans' | 'be-vietnam-pro';
export type PaletteStyle = 'tonal' | 'vibrant' | 'expressive';
export type FontSize = 'sm' | 'md' | 'lg';

export interface Place {
  id: string;
  name: string;
  admin: string;
  country: string;
  lat: number;
  lon: number;
  temp?: number;
  code?: number;
  isDay?: boolean;
}

export interface Settings {
  lang: Lang;
  theme: ThemeMode;
  seed: string;
  palette: PaletteStyle;
  adaptive: boolean;
  fontFamily: FontId;
  fontSize: FontSize;
  tempUnit: 'c' | 'f';
  windUnit: 'kmh' | 'ms' | 'mph';
  timeFormat: 'auto' | '12' | '24';
  windowMode: 'remember' | 'maximized';
  effects: boolean;
  autoRefresh: boolean;
  refreshMins: 5 | 15 | 30 | 60;
  alwaysOnTop: boolean;
  alerts: boolean;
}

export interface HourPoint {
  time: string;
  temp: number;
  code: number;
  isDay: boolean;
  pop: number;
  wind: number;
  hum: number;
}
export interface DayPoint {
  date: string;
  code: number;
  max: number;
  min: number;
  sunrise: string;
  sunset: string;
  uvMax: number;
  pop: number;
  precipSum: number;
  windMax: number;
}
export interface Aqi {
  us: number | null;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
}
export interface Weather {
  place: Place;
  tempUnit: 'c' | 'f';
  windUnit: 'kmh' | 'ms' | 'mph';
  fetchedAt: number;
  utcOffset: number;
  now: {
    time: string;
    temp: number;
    feels: number;
    humidity: number;
    code: number;
    isDay: boolean;
    cloud: number;
    pressure: number;
    wind: number;
    windDir: number;
    gust: number;
    precip: number;
    visibility: number | null;
    uv: number | null;
  };
  /** every hour from today 00:00 (local) for 7 days */
  hourly: HourPoint[];
  /** index of the current hour inside `hourly` */
  hourIdx: number;
  daily: DayPoint[];
  yesterday: { max: number; min: number } | null;
  aqi: Aqi | null;
}
