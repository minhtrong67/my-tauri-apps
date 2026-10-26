import { useEffect } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { addDays, ft, mins, occurs, sod, t, ymd, type Ev } from './core';
import { get, toast } from './store';

const snoozes: { id: string; at: number }[] = [];
const FK = 'cal.fired';
const fired = (): string[] => { try { return JSON.parse(localStorage.getItem(FK) || '[]'); } catch { return []; } };

async function osNotify(title: string, body: string) {
  if (!get().s.notify) return;
  try {
    let ok = await isPermissionGranted();
    if (!ok) ok = (await requestPermission()) === 'granted';
    if (ok) sendNotification({ title, body });
  } catch { /* not running inside Tauri */ }
}
function ring(e: Ev) {
  const s = get().s;
  toast('info', `${t('remind')}: ${e.title} (${ft(e.start, s.timeFmt)})`, { label: 'snooze', fn: () => snoozes.push({ id: e.id, at: Date.now() + 3e5 }) });
  osNotify(e.title, ft(e.start, s.timeFmt) + (e.loc ? ' · ' + e.loc : ''));
}
function check() {
  const now = Date.now(), today = sod(new Date());
  for (let i = snoozes.length - 1; i >= 0; i--) if (snoozes[i].at <= now) { const e = get().events.find((x) => x.id === snoozes[i].id); snoozes.splice(i, 1); if (e) ring(e); }
  const done = fired().filter((k) => k.slice(-10) >= ymd(today)); let changed = false;
  for (const e of get().events) {
    if (e.allDay || e.remind < 0 || !e.start) continue;
    for (const d of [today, addDays(today, 1)]) {
      if (!occurs(e, d)) continue;
      const start = +d + mins(e.start) * 6e4, key = e.id + ymd(d);
      if (now >= start - e.remind * 6e4 && now <= start && !done.includes(key)) { done.push(key); changed = true; ring(e); }
    }
  }
  if (changed) localStorage.setItem(FK, JSON.stringify(done));
}
export function useReminders() {
  useEffect(() => { check(); const id = setInterval(check, 20000); return () => clearInterval(id); }, []);
}
