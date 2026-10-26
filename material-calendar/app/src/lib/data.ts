import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { COLORS, uid, ymd, type Ev } from './core';
import { addMany, get, toast } from './store';

export async function exportEvents() {
  try {
    const path = await save({ defaultPath: `material-calendar-${ymd(new Date())}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!path) return;
    await writeTextFile(path, JSON.stringify({ app: 'material-calendar', version: 1, events: get().events }, null, 2));
    toast('success', 'exported');
  } catch (e) { console.warn(e); toast('error', 'importBad'); }
}

export async function importEvents() {
  try {
    const path = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (typeof path !== 'string') return;
    const data = JSON.parse(await readTextFile(path)), list: Partial<Ev>[] = Array.isArray(data) ? data : data.events;
    if (!Array.isArray(list)) throw new Error('bad file');
    const ids = new Set(get().events.map((e) => e.id)), hm = (v?: string) => (/^\d\d:\d\d$/.test(v || '') ? v! : '');
    const ok: Ev[] = list.filter((r) => r && typeof r.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date || '')).map((r) => ({
      id: r.id && !ids.has(r.id) ? r.id : uid(), title: r.title!.slice(0, 120), loc: String(r.loc || ''), desc: String(r.desc || ''), date: r.date!, allDay: !!r.allDay,
      start: r.allDay ? '' : hm(r.start) || '09:00', end: r.allDay ? '' : hm(r.end), color: COLORS.includes(r.color || '') ? r.color! : COLORS[0],
      repeat: ['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(r.repeat || '') ? r.repeat! : 'none', remind: [-1, 0, 5, 15, 30, 60].includes(r.remind as number) ? r.remind! : -1,
    }));
    addMany(ok); toast(ok.length ? 'success' : 'warning', ok.length ? 'imported' : 'importBad');
  } catch (e) { console.warn(e); toast('error', 'importBad'); }
}
