import { inTauri } from './window';
import { t } from './i18n';
import { kindOf } from './format';
import type { Weather } from './types';

type Plugin = typeof import('@tauri-apps/plugin-notification');
const plugin = async (): Promise<Plugin | null> => {
  if (!inTauri()) return null;
  try {
    return await import('@tauri-apps/plugin-notification');
  } catch {
    return null;
  }
};

/** Asks the OS for notification permission (returns true when granted). */
export async function ensureNotifyPermission(): Promise<boolean> {
  const p = await plugin();
  if (p) {
    if (await p.isPermissionGranted()) return true;
    return (await p.requestPermission()) === 'granted';
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

export async function sendNotification(title: string, body: string) {
  const p = await plugin();
  if (p) return p.sendNotification({ title, body });
  if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
}

const KEY = 'wx.alerted.v1';
/** Rain / thunderstorm alert for the next hours (max one notification per kind and place every 6 h). */
export async function checkAlerts(m: Weather, fmtHour: (t: string) => string) {
  const next = m.hourly.slice(m.hourIdx + 1, m.hourIdx + 7);
  const storm = next.find((h) => kindOf(h.code) === 'storm');
  const raining = ['rain', 'drizzle', 'storm'].includes(kindOf(m.now.code));
  const rain = raining ? undefined : next.slice(0, 3).find((h) => h.pop >= 70 && ['rain', 'drizzle'].includes(kindOf(h.code)));
  const log: Record<string, number> = JSON.parse(localStorage.getItem(KEY) || '{}');
  const now = Date.now();
  for (const [kind, hit, key] of [['storm', storm, 'alert.storm'], ['rain', rain, 'alert.rain']] as const) {
    if (!hit) continue;
    const id = `${m.place.id}:${kind}`;
    if (now - (log[id] ?? 0) < 6 * 3600e3) continue;
    log[id] = now;
    localStorage.setItem(KEY, JSON.stringify(log));
    await sendNotification(m.place.name, t(key, { time: fmtHour(hit.time) }));
    return; // one notification per refresh
  }
}
