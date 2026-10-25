import { create } from 'zustand';
import type { Lang, Place, Settings, Weather } from './types';

const K = { settings: 'wx.settings.v2', places: 'wx.places.v1', active: 'wx.active.v1', home: 'wx.home.v1', size: 'wx.winsize.v1', cache: 'wx.cache.v2' };

function read<T>(k: string, fb: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage full or blocked */
  }
}

export const defaultSettings = (): Settings => ({
  lang: ((navigator.language || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en') as Lang,
  theme: 'system',
  seed: '#0B57D0',
  palette: 'vibrant',
  adaptive: false,
  fontFamily: 'system',
  fontSize: 'md',
  tempUnit: 'c',
  windUnit: 'kmh',
  timeFormat: 'auto',
  windowMode: 'remember',
  effects: true,
  autoRefresh: true,
  refreshMins: 15,
  alwaysOnTop: false,
  alerts: false,
});

interface State {
  settings: Settings;
  places: Place[];
  activeId: string | null;
  homeId: string | null;
  size: { w: number; h: number } | null;
  model: Weather | null;
  offline: boolean;
  loading: boolean;
  error: boolean;
  setSettings: (p: Partial<Settings>) => void;
  resetSettings: () => void;
  upsertPlace: (p: Partial<Place> & { id: string }) => void;
  removePlace: (id: string) => void;
  setActive: (id: string | null) => void;
  setHome: (id: string | null) => void;
  saveSize: (s: { w: number; h: number }) => void;
  patch: (p: Partial<Pick<State, 'model' | 'offline' | 'loading' | 'error'>>) => void;
}

export const useStore = create<State>((set, get) => ({
  settings: { ...defaultSettings(), ...read<Partial<Settings>>(K.settings, {}) },
  places: read<Place[]>(K.places, []),
  activeId: read<string | null>(K.active, null),
  homeId: read<string | null>(K.home, null),
  size: read(K.size, null),
  model: null,
  offline: false,
  loading: false,
  error: false,
  setSettings: (p) => {
    const settings = { ...get().settings, ...p };
    write(K.settings, settings);
    set({ settings });
  },
  resetSettings: () => {
    const settings = defaultSettings();
    write(K.settings, settings);
    set({ settings });
  },
  upsertPlace: (p) => {
    const places = [...get().places];
    const i = places.findIndex((x) => x.id === p.id);
    if (i >= 0) places[i] = { ...places[i], ...p };
    else places.unshift(p as Place);
    places.length = Math.min(places.length, 15);
    write(K.places, places);
    set({ places });
  },
  removePlace: (id) => {
    const places = get().places.filter((p) => p.id !== id);
    write(K.places, places);
    const homeId = get().homeId === id ? null : get().homeId;
    write(K.home, homeId);
    set({ places, homeId });
  },
  setActive: (id) => {
    write(K.active, id);
    set({ activeId: id });
  },
  setHome: (id) => {
    write(K.home, id);
    set({ homeId: id });
  },
  saveSize: (size) => {
    write(K.size, size);
    set({ size });
  },
  patch: (p) => set(p),
}));

export const placeId = (lat: number, lon: number) => `${(+lat).toFixed(2)},${(+lon).toFixed(2)}`;
export const getActive = (): Place | null => {
  const s = useStore.getState();
  return s.places.find((p) => p.id === s.activeId) ?? null;
};

// Weather cache (stale-while-revalidate + offline fallback), newest 8 entries.
export const cacheGet = (key: string): Weather | null => read<Record<string, Weather>>(K.cache, {})[key] ?? null;
export function cacheSet(key: string, w: Weather) {
  const all = read<Record<string, Weather>>(K.cache, {});
  all[key] = w;
  Object.keys(all)
    .sort((a, b) => all[b].fetchedAt - all[a].fetchedAt)
    .slice(8)
    .forEach((k) => delete all[k]);
  write(K.cache, all);
}
