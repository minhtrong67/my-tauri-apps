import { addDays, eventsOn, isoWeek, fmt, ft, lanes, mins, pad, parse, t, ymd, type Ev } from '../lib/core';
import { holiday } from '../lib/holidays';
import { lunar } from '../lib/lunar';
import { toast, upsert } from '../lib/store';
import { DEF } from '../lib/store';

type S = typeof DEF;
type P = { evs: Ev[]; cur: Date; s: S; onNew: (date: string, start?: number) => void; onEdit: (id: string) => void; onDay: (date: string) => void };
export const weekStart = (d: Date, s: S) => addDays(d, -((d.getDay() - s.weekStart + 7) % 7));
const moveTo = (evs: Ev[], id: string, date: string) => { const e = evs.find((x) => x.id === id); if (e && e.date !== date) { upsert({ ...e, date }); toast('success', t('moved')); } };
const Chip = ({ e, s, onEdit }: { e: Ev; s: S; onEdit: (id: string) => void }) => (
  <button draggable onDragStart={(x) => x.dataTransfer.setData('text/plain', e.id)} onClick={(x) => { x.stopPropagation(); onEdit(e.id); }} title={e.title} style={{ background: `color-mix(in srgb,${e.color} 22%,transparent)`, borderColor: e.color }}
    className="block w-full truncate text-left text-xs px-1.5 py-0.5 rounded-md border-l-[3px] hover:rounded-xl morph">{!e.allDay && <b className="font-semibold">{ft(e.start, s.timeFmt)} </b>}{e.title}</button>
);

export function MonthView({ evs, cur, s, onNew, onEdit, onDay }: P) {
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1), start = addDays(first, -((first.getDay() - s.weekStart + 7) % 7)), td = ymd(new Date());
  return (
    <div className="h-full flex flex-col p-3 gap-2">
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-variant">{Array.from({ length: 7 }, (_, i) => <span key={i}>{fmt({ weekday: 'short' }, new Date(2024, 0, 7 + s.weekStart + i))}</span>)}</div>
      <div className="grid grid-cols-7 grid-rows-6 gap-1.5 flex-1 min-h-0">
        {Array.from({ length: 42 }, (_, i) => {
          const d = addDays(start, i), ds = ymd(d), list = eventsOn(evs, d), l = lunar(d), isT = ds === td, hol = holiday(d);
          return (
            <div key={ds} onClick={() => onNew(ds)} onDragOver={(x) => x.preventDefault()} onDrop={(x) => moveTo(evs, x.dataTransfer.getData('text/plain'), ds)} style={{ animationDelay: `${i * 9}ms` }}
              className={`rise morph min-h-0 overflow-hidden p-1.5 cursor-pointer hover:rounded-[30px] hover:bg-cont ${isT ? 'bg-pc rounded-[26px]' : 'bg-low rounded-2xl'} ${d.getMonth() !== cur.getMonth() ? 'opacity-45' : ''}`}>
              <div className="flex items-center justify-between mb-0.5">
                {i % 7 === 0 && <small className="text-[9px] text-variant mr-auto ml-1">{t('week_n')}{isoWeek(d)}</small>}<span className={`size-7 grid place-items-center text-sm font-bold morph ${isT ? 'bg-primary text-onp rounded-full' : 'rounded-lg'}`}>{d.getDate()}</span>
                {s.lunar && <span className="text-[10px] text-variant">{l.d === 1 ? `${l.d}/${l.m}` : l.d}</span>}
              </div>
              {hol && <div title={hol[s.lang === 'vi' || (s.lang === 'auto' && navigator.language.startsWith('vi')) ? 1 : 0]} className="truncate text-[10px] font-semibold text-[#b3261e] dark:text-[#ffb4ab] px-1">{hol[s.lang === 'vi' || (s.lang === 'auto' && navigator.language.startsWith('vi')) ? 1 : 0]}</div>}
              <div className="space-y-0.5">{list.slice(0, hol ? 2 : 3).map((e) => <Chip key={e.id} e={e} s={s} onEdit={onEdit} />)}
                {list.length > (hol ? 2 : 3) && <button onClick={(x) => { x.stopPropagation(); onDay(ds); }} className="text-xs font-semibold text-primary px-1.5">+{list.length - (hol ? 2 : 3)} {t('more')}</button>}</div>
            </div>);
        })}
      </div>
    </div>
  );
}

const HOUR = 56;
export function TimeGrid({ evs, cur, s, onNew, onEdit, onDay, days }: P & { days: Date[] }) {
  const now = new Date(), td = ymd(now), cols = `56px repeat(${days.length},1fr)`;
  return (
    <div className="h-full flex flex-col">
      <div className="grid gap-1 px-3 pt-3 pb-1" style={{ gridTemplateColumns: cols }}><span />
        {days.map((d) => <button key={+d} onClick={() => onDay(ymd(d))} className="flex flex-col items-center py-1 rounded-2xl hover:bg-cont morph hover:rounded-3xl">
          <small className="text-xs text-variant font-semibold">{fmt({ weekday: 'short' }, d)}</small>
          <b className={`size-9 grid place-items-center text-lg morph ${ymd(d) === td ? 'bg-primary text-onp rounded-full' : 'rounded-xl'}`}>{d.getDate()}</b>
          {s.lunar && <small className="text-[10px] text-variant">{lunar(d).d}/{lunar(d).m}</small>}</button>)}</div>
      <div className="grid gap-1 px-3 pb-1 text-xs" style={{ gridTemplateColumns: cols }}><span className="text-variant self-center">{t('allDay')}</span>
        {days.map((d) => <div key={+d} className="space-y-0.5 min-h-6">{eventsOn(evs, d).filter((e) => e.allDay).map((e) => <Chip key={e.id} e={e} s={s} onEdit={onEdit} />)}</div>)}</div>
      <div className="flex-1 overflow-auto px-3 pb-3" ref={(el) => { if (el && !el.dataset.sc) { el.dataset.sc = '1'; el.scrollTop = Math.max(0, (now.getHours() - 1.5) * HOUR); } }}>
        <div className="grid relative" style={{ gridTemplateColumns: cols, height: 24 * HOUR }}>
          <div className="relative">{Array.from({ length: 23 }, (_, i) => <span key={i} className="absolute right-2 -translate-y-1/2 text-[11px] text-variant" style={{ top: (i + 1) * HOUR }}>{ft(`${pad(i + 1)}:00`, s.timeFmt)}</span>)}</div>
          {days.map((d) => { const ds = ymd(d); return (
            <div key={ds} onClick={(x) => { const r = x.currentTarget.getBoundingClientRect(); onNew(ds, Math.floor(((x.clientY - r.top) / HOUR) * 2) * 30); }}
              className="relative border-l border-ov" style={{ backgroundImage: `repeating-linear-gradient(var(--outline-variant) 0 1px,transparent 1px ${HOUR}px)` }}>
              {lanes(eventsOn(evs, d).filter((e) => !e.allDay)).map(({ e, s: a, en, lane, n }) => (
                <button key={e.id} onClick={(x) => { x.stopPropagation(); onEdit(e.id); }} className="absolute text-left text-xs p-1.5 overflow-hidden rounded-xl hover:rounded-2xl morph border-l-4 rise"
                  style={{ top: (a / 60) * HOUR, height: Math.max(((en - a) / 60) * HOUR - 2, 24), left: `calc(${(lane / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)`, background: `color-mix(in srgb,${e.color} 24%,var(--card))`, borderColor: e.color }}>
                  <b className="block truncate">{e.title}</b><span className="text-variant">{ft(e.start, s.timeFmt)}{e.end ? '–' + ft(e.end, s.timeFmt) : ''}</span></button>))}
              {ds === td && <div className="absolute left-0 right-0 h-0.5 bg-primary z-10" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR }}><i className="absolute -left-1.5 -top-[5px] size-3 rounded-full bg-primary" /></div>}
            </div>); })}
        </div>
      </div>
    </div>
  );
}

export function Agenda({ evs, cur, s, onEdit }: P) {
  const rows = Array.from({ length: 60 }, (_, i) => addDays(cur, i)).map((d) => ({ d, l: eventsOn(evs, d) })).filter((r) => r.l.length);
  if (!rows.length) return <div className="h-full grid place-items-center text-variant rise">{t('nothing')}</div>;
  return <div className="h-full overflow-auto p-4 space-y-3">{rows.map(({ d, l }, i) => (
    <section key={+d} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }} className="rise flex gap-4">
      <div className="w-16 text-center pt-2"><b className="block text-3xl font-extrabold leading-none">{d.getDate()}</b><small className="text-variant">{fmt({ weekday: 'short', month: 'short' }, d)}</small></div>
      <div className="flex-1 space-y-2">{l.map((e) => <button key={e.id} onClick={() => onEdit(e.id)} style={{ borderColor: e.color, background: `color-mix(in srgb,${e.color} 14%,var(--surface-low))` }}
        className="w-full text-left p-3 rounded-2xl hover:rounded-[28px] morph border-l-4"><small className="text-variant">{e.allDay ? t('allDay') : ft(e.start, s.timeFmt) + (e.end ? ' – ' + ft(e.end, s.timeFmt) : '')}</small><b className="block">{e.title}</b>{e.loc && <small className="text-variant">{e.loc}</small>}</button>)}</div>
    </section>))}</div>;
}
export { parse, mins };
