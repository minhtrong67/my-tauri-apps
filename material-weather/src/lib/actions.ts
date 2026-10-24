import { RotateCcw, Trash2 } from 'lucide-react';
import { cacheGet, cacheSet, getActive, placeId, useStore } from './store';
import { fetchWeather, geoPermission, locateByGPS, locateByIP, unitsKey, type Found, type GeoError } from './api';
import { t, wmoKey } from './i18n';
import { compass, deg, makeFmt, windLabel } from './format';
import { applyWindowMode, setOnTop } from './window';
import { checkAlerts, ensureNotifyPermission } from './notify';
import { askConfirm, toast, ui } from './ui';
import type { Place, Settings } from './types';

const STALE = 5 * 60 * 1000;
let token = 0;
const key = (p: Place) => `${p.id}|${unitsKey(useStore.getState().settings)}`;
const st = () => useStore.getState();

export async function loadPlace(place: Place | null, { force = false, notify = false } = {}) {
  if (!place) return st().patch({ model: null, error: false });
  const my = ++token;
  const cached = cacheGet(key(place));
  if (cached) st().patch({ model: cached, offline: false, error: false });
  else if (st().model?.place.id !== place.id) st().patch({ model: null, error: false });
  if (!force && cached && Date.now() - cached.fetchedAt < STALE) return;

  st().patch({ loading: true });
  try {
    const m = await fetchWeather(place, st().settings);
    if (my !== token) return;
    cacheSet(key(place), m);
    st().upsertPlace({ id: place.id, temp: m.now.temp, code: m.now.code, isDay: m.now.isDay });
    st().patch({ model: m, offline: false, error: false });
    if (notify) toast.success(t('status.refreshed'), { duration: 1800 });
    if (st().settings.alerts) {
      const f = makeFmt(st().settings.lang, st().settings.timeFormat, t);
      void checkAlerts(m, f.hour);
    }
  } catch (e) {
    if (my !== token) return;
    console.warn('weather failed', e);
    if (st().model) {
      st().patch({ offline: true });
      toast.warning(t('status.offline'));
    } else st().patch({ error: true });
  } finally {
    if (my === token) st().patch({ loading: false });
  }
}
export const reload = (notify = false) => loadPlace(getActive(), { force: true, notify });

export function selectFound(p: Found, { notify = false, approx = false } = {}) {
  const place: Place = { id: placeId(p.lat, p.lon), name: p.name, admin: p.admin, country: p.country, lat: p.lat, lon: p.lon };
  const isNew = !st().places.some((x) => x.id === place.id);
  st().upsertPlace(place);
  st().setActive(place.id);
  ui().set({ navOpen: false });
  if (notify && isNew) toast.success(t('status.added', { name: place.name }), { duration: 2200 });
  if (approx) toast.info(t('loc.approxUsed'), { duration: 3200 });
  void loadPlace(st().places.find((x) => x.id === place.id)!);
}
export function activate(id: string) {
  st().setActive(id);
  ui().set({ navOpen: false });
  void loadPlace(getActive());
}
export function switchPlace(delta: number) {
  const { places, activeId } = st();
  if (places.length < 2) return;
  const i = Math.max(places.findIndex((p) => p.id === activeId), 0);
  activate(places[(i + delta + places.length) % places.length].id);
}
export async function removePlaceFlow(id: string) {
  const p = st().places.find((x) => x.id === id);
  if (!p) return;
  const ok = await askConfirm({ title: t('confirm.removeTitle', { name: p.name }), message: t('confirm.removeBody'), confirmLabel: t('action.delete'), cancelLabel: t('action.cancel'), tone: 'error', icon: Trash2, headIcon: Trash2 });
  if (!ok) return;
  st().removePlace(id);
  toast.info(t('status.removed', { name: p.name }), { duration: 2200 });
  if (id === st().activeId) {
    const next = st().homeId ? st().places.find((x) => x.id === st().homeId) : st().places[0];
    st().setActive(next?.id ?? null);
    void loadPlace(next ?? null);
  }
}
export function toggleHome(id: string) {
  const p = st().places.find((x) => x.id === id);
  if (!p) return;
  if (st().homeId === id) {
    st().setHome(null);
    toast.info(t('toast.homeUnset'), { duration: 2200 });
  } else {
    st().setHome(id);
    toast.success(t('toast.homeSet', { name: p.name }), { duration: 2400 });
  }
}

/* ---------- location: ask permission, fall back to IP ---------- */
const setLocating = (v: boolean) => ui().set({ locating: v });

function useLocation(p: Found, approx: boolean) {
  selectFound({ ...p, name: p.name || t('loc.mine'), admin: p.name ? p.admin : `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}` }, { notify: true, approx });
}
export async function runIP() {
  setLocating(true);
  try {
    useLocation(await locateByIP(), true);
  } catch {
    toast.error(t('status.detectFail'), { action: { label: t('action.retry'), run: () => void startLocate() } });
  } finally {
    setLocating(false);
  }
}
export async function runGPS(onDismiss?: () => void) {
  setLocating(true);
  toast.info(t('loc.waiting'), { duration: 2500 });
  try {
    useLocation(await locateByGPS(st().settings.lang), false);
    setLocating(false);
  } catch (e) {
    setLocating(false);
    if ((e as GeoError).code === 'denied') {
      ui().set({ location: { mode: 'denied', onAllow: () => void runGPS(onDismiss), onApprox: () => void runIP(), onDismiss } });
      return;
    }
    toast.warning(t('loc.fallback'), { duration: 3000 });
    await runIP();
  }
}
/** Entry point: explains + asks permission first; never silently uses the IP address. */
export async function startLocate({ firstRun = false } = {}) {
  if (ui().locating) return;
  ui().set({ navOpen: false });
  const onDismiss = firstRun ? useDefaultPlace : undefined;
  const state = await geoPermission();
  if (state === 'granted') return runGPS(onDismiss);
  ui().set({ location: { mode: state === 'denied' ? 'denied' : 'prompt', onAllow: () => void runGPS(onDismiss), onApprox: () => void runIP(), onDismiss } });
}
export function useDefaultPlace() {
  if (!st().places.length) selectFound({ name: 'Hà Nội', admin: '', country: 'Việt Nam', lat: 21.0285, lon: 105.8542 });
}

/* ---------- settings with side effects ---------- */
export async function changeSetting(patch: Partial<Settings>) {
  const prev = st().settings;
  st().setSettings(patch);
  const s = st().settings;
  if ('windowMode' in patch) void applyWindowMode();
  if ('alwaysOnTop' in patch) void setOnTop(s.alwaysOnTop);
  if (('tempUnit' in patch && prev.tempUnit !== s.tempUnit) || ('windUnit' in patch && prev.windUnit !== s.windUnit)) void reload();
  if ('alerts' in patch && s.alerts) {
    if (await ensureNotifyPermission()) {
      toast.success(t('toast.alertsOn'), { duration: 2400 });
      if (st().model) void checkAlerts(st().model!, makeFmt(s.lang, s.timeFormat, t).hour);
    } else {
      st().setSettings({ alerts: false });
      toast.warning(t('toast.alertsDenied'), { duration: 6000 });
    }
  }
}
export async function resetSettingsFlow() {
  const ok = await askConfirm({ title: t('confirm.resetTitle'), message: t('confirm.resetBody'), confirmLabel: t('action.reset'), cancelLabel: t('action.cancel'), tone: 'error', icon: RotateCcw, headIcon: RotateCcw });
  if (!ok) return;
  const prev = st().settings;
  st().resetSettings();
  void applyWindowMode();
  void setOnTop(false);
  if (prev.tempUnit !== st().settings.tempUnit || prev.windUnit !== st().settings.windUnit) void reload();
  toast.success(t('toast.reset'), { duration: 2400 });
}

export async function copySummary() {
  const m = st().model;
  if (!m) return;
  const n = m.now, d = m.daily[0], u = windLabel(m.windUnit);
  const text = [
    `${m.place.name}: ${deg(n.temp)}${m.tempUnit.toUpperCase()} · ${t(wmoKey(n.code))}`,
    `${t('hero.high')} ${deg(d.max)} / ${t('hero.low')} ${deg(d.min)} · ${t('hero.feels')} ${deg(n.feels)}`,
    `${t('detail.humidity')} ${Math.round(n.humidity)}% · ${t('detail.wind')} ${Math.round(n.wind)} ${u} (${compass(n.windDir, t)})`,
  ].join('\n');
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  toast.success(t('status.copied'), { duration: 1800 });
}
