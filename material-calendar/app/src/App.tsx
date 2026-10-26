import { useEffect, useState } from 'react';
import { CalendarClock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, List, Plus, Settings } from 'lucide-react';
import { addDays, cap, fmt, setLang, sod, t, ymd, parse } from './lib/core';
import { get, setCursor, setS, useStore } from './lib/store';
import { applyTheme } from './lib/theme';
import { useReminders } from './lib/remind';
import { initWindow } from './lib/window';
import { Agenda, MonthView, TimeGrid, weekStart } from './components/Views';
import { EventSheet, SettingsDialog } from './components/Panels';
import { IconBtn, Tip, Toasts, Btn } from './components/ui';

const VIEWS = [['month', CalendarDays], ['week', CalendarRange], ['day', CalendarClock], ['agenda', List]] as const;

export default function App() {
  const { s, events, cursor: cur } = useStore();
  const [sheet, setSheet] = useState<{ id?: string; date: string; start?: number } | null>(null);
  const [cfg, setCfg] = useState(false);
  setLang(s.lang);
  useReminders();
  useEffect(() => { applyTheme(s); }, [s.theme, s.seed, s.font, s.size]);
  useEffect(() => { const m = matchMedia('(prefers-color-scheme:dark)'), h = () => applyTheme(get().s); m.addEventListener('change', h); return () => m.removeEventListener('change', h); }, []);
  useEffect(() => { requestAnimationFrame(() => initWindow(() => get().s, (z) => setS({ winSize: z }))); const b = (e: MouseEvent) => e.preventDefault(); if (!import.meta.env.DEV) addEventListener('contextmenu', b); }, []);

  const v = s.view, step = (n: number) => setCursor(v === 'month' ? new Date(cur.getFullYear(), cur.getMonth() + n, 1) : addDays(cur, n * (v === 'week' ? 7 : v === 'day' ? 1 : 30)));
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (sheet || cfg || /INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName) || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase(), m: Record<string, string> = { m: 'month', w: 'week', d: 'day', a: 'agenda' };
      if (m[k]) setS({ view: m[k] }); else if (k === 'n') setSheet({ date: ymd(cur) }); else if (k === 't') setCursor(sod(new Date()));
      else if (k === 'arrowleft') step(-1); else if (k === 'arrowright') step(1);
    };
    addEventListener('keydown', h); return () => removeEventListener('keydown', h);
  });

  const title = v === 'week' ? (() => { const a = weekStart(cur, s), b = addDays(a, 6); return `${fmt({ day: 'numeric', month: 'short' }, a)} – ${fmt({ day: 'numeric', month: 'short', year: 'numeric' }, b)}`; })()
    : v === 'day' ? cap(fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, cur)) : cap(fmt({ month: 'long', year: 'numeric' }, cur));
  const p = { evs: events, cur, s, onNew: (date: string, start?: number) => setSheet({ date, start }), onEdit: (id: string) => setSheet({ id, date: ymd(cur) }), onDay: (d: string) => { setCursor(parse(d)); setS({ view: 'day' }); } };
  const days = v === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(cur, s), i)) : [cur];

  return (
    <div className="h-screen flex bg-surface text-on">
      <nav className="w-[88px] shrink-0 flex flex-col items-center gap-3 py-5">
        <IconBtn side="r" tip={t('create') + ' (N)'} onClick={() => setSheet({ date: ymd(cur) })} className="!size-14 bg-pc text-onpc shadow-md hover:!rounded-full"><Plus className="size-7" /></IconBtn>
        <div className="mt-4 flex flex-col gap-3">{VIEWS.map(([k, Ic]) => (
          <button key={k} onClick={() => setS({ view: k })} className="group flex flex-col items-center gap-1 text-xs font-semibold press">
            <span className={`w-14 h-8 grid place-items-center morph ${v === k ? 'bg-sc text-onsc rounded-full' : 'rounded-2xl group-hover:bg-cont group-hover:rounded-full'}`}><Ic className="size-5" /></span>{t(k)}</button>))}</div>
        <span className="flex-1" /><IconBtn side="r" tip={t('settings')} onClick={() => setCfg(true)}><Settings /></IconBtn>
      </nav>
      <main className="flex-1 min-w-0 flex flex-col pr-3 pb-3">
        <header className="h-[76px] flex items-center gap-2 px-2 shrink-0">
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight truncate mr-2">{title}</h1>
          <IconBtn tip={t('prev') + ' (←)'} onClick={() => step(-1)}><ChevronLeft /></IconBtn><IconBtn tip={t('next') + ' (→)'} onClick={() => step(1)}><ChevronRight /></IconBtn>
          <Btn v="tonal" onClick={() => setCursor(sod(new Date()))}>{t('today')}</Btn><span className="flex-1" />
          <Tip text="minhtrong67 · Claude"><span className="hidden md:inline-block px-3 py-1 rounded-full bg-pc text-onpc text-xs font-bold">minhtrong67</span></Tip>
        </header>
        <div key={v + (v === 'month' ? cur.getMonth() + '' + cur.getFullYear() : ymd(cur))} className="rise flex-1 min-h-0 rounded-[32px] bg-card overflow-hidden shadow-sm">
          {v === 'month' ? <MonthView {...p} /> : v === 'agenda' ? <Agenda {...p} /> : <TimeGrid {...p} days={days} />}
        </div>
      </main>
      {sheet && <EventSheet init={sheet} onClose={() => setSheet(null)} />}
      {cfg && <SettingsDialog onClose={() => setCfg(false)} />}
      <Toasts />
    </div>
  );
}
