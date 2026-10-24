import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUp, ChevronRight, Cloud, Droplets, Eye, Gauge, Leaf, Moon as MoonIcon, Sun, Sunrise, Sunset, Thermometer, Umbrella, Wind, Zap, type LucideIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { useT } from '../lib/i18n';
import { aqiInfo, clamp, compass, daylight, deg, sunProgress, useFmt, uvInfo, windLabel } from '../lib/format';
import { dewPoint, moonPhase, tipsOf, type Tip } from '../lib/insights';
import { ui } from '../lib/ui';
import type { HourPoint, Weather } from '../lib/types';
import { WxIcon } from './WxIcon';
import { cn } from './ui/cn';

const useModel = () => useStore((s) => s.model)!;
const tipIcon: Record<Tip['icon'], LucideIcon> = { zap: Zap, umbrella: Umbrella, leaf: Leaf, sun: Sun, thermometer: Thermometer, wind: Wind };
const tone: Record<Tip['tone'], string> = { warn: 'bg-error-container text-on-error-container', info: 'bg-secondary-container text-on-secondary-container', good: 'bg-tertiary-container text-on-tertiary-container' };

export const SectionTitle = ({ children }: { children: ReactNode }) => <h2 className="mb-3 pl-2 text-base font-semibold">{children}</h2>;
const Card = ({ children, i, className }: { children: ReactNode; i: number; className?: string }) => (
  <section className={cn('animate-rise rounded-[28px] bg-sc-low p-5 pr-2', className)} style={{ animationDelay: `${i * 70}ms` }}>{children}</section>
);

/* ------------------------------ tips ------------------------------ */
export function Tips() {
  const m = useModel(), t = useT(), fmt = useFmt();
  const tips = useMemo(() => tipsOf(m, t, fmt), [m, t, fmt]);
  return (
    <section className="animate-rise">
      <SectionTitle>{t('tips.title')}</SectionTitle>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(15.5rem,1fr))] gap-2.5">
        {tips.map((x, i) => {
          const Icon = tipIcon[x.icon];
          return (
            <div key={x.text} style={{ animationDelay: `${i * 70 + 100}ms` }} className={cn('flex animate-rise items-center gap-3 rounded-2xl px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5', tone[x.tone])}>
              <Icon size={22} className="shrink-0" />
              <span className="text-sm">{x.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------ hourly ------------------------------ */
export type Metric = 'temp' | 'rain' | 'wind' | 'humidity';
const COL = 68;
function smooth(p: [number, number][]) {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
const val = (h: HourPoint, k: Metric) => (k === 'temp' ? h.temp : k === 'rain' ? h.pop : k === 'wind' ? h.wind : h.hum);

export function HourChart({ hours, metric, now }: { hours: HourPoint[]; metric: Metric; now?: boolean }) {
  const fmt = useFmt(), t = useT();
  const vs = hours.map((h) => val(h, metric));
  const fixed = metric === 'rain' || metric === 'humidity';
  const lo = fixed ? 0 : Math.min(...vs), hi = fixed ? 100 : Math.max(...vs);
  const H = 96, top = 28, bot = 14, W = hours.length * COL;
  const pts: [number, number][] = vs.map((v, i) => [i * COL + COL / 2, top + ((hi - v) / (hi - lo || 1)) * (H - top - bot)]);
  const line = smooth(pts);
  const suffix = metric === 'temp' ? '°' : metric === 'wind' ? '' : '%';
  return (
    <div className="overflow-x-auto pb-2 pr-2">
      <div style={{ width: W }} className="flex flex-col">
        <div className="flex">
          {hours.map((h, i) => (
            <div key={h.time} className="flex w-[68px] shrink-0 flex-col items-center gap-1 text-xs text-on-surface-variant">
              <span className="font-semibold text-on-surface">{now && i === 0 ? t('hour.now') : fmt.hour(h.time)}</span>
              <WxIcon code={h.code} isDay={h.isDay} size={34} />
            </div>
          ))}
        </div>
        <svg key={metric} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--md-primary)" stopOpacity=".28" /><stop offset="1" stopColor="var(--md-primary)" stopOpacity="0" /></linearGradient></defs>
          <path d={`${line} L${pts.at(-1)![0]},${H} L${pts[0][0]},${H} Z`} fill="url(#hg)" className="animate-fade" />
          <path d={line} pathLength={1} className="hline" />
          {pts.map(([x, y], i) => (
            <g key={i}>
              <text x={x} y={y - 11} textAnchor="middle" className="fill-on-surface text-[13px] font-semibold">{Math.round(vs[i])}{suffix}</text>
              <circle cx={x} cy={y} r={3.5} className="fill-sc-low stroke-primary" strokeWidth={2.5} />
            </g>
          ))}
        </svg>
        <div className="flex">
          {hours.map((h) => (
            <div key={h.time} className={cn('flex w-[68px] shrink-0 items-center justify-center gap-1 text-xs text-primary', h.pop < 10 && 'opacity-40')}>
              <Droplets size={13} />{Math.round(h.pop)}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Hourly() {
  const m = useModel(), t = useT();
  const [metric, setMetric] = useState<Metric>('temp');
  const hours = m.hourly.slice(m.hourIdx, m.hourIdx + 24);
  const tabs: [Metric, string][] = [['temp', 'hourly.temp'], ['rain', 'hourly.rain'], ['wind', 'hourly.wind'], ['humidity', 'hourly.humidity']];
  return (
    <Card i={1}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 pr-3">
        <h2 className="text-base font-semibold">{t('section.hourly')}</h2>
        <div role="tablist" className="flex gap-1 rounded-full bg-sc p-1">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={metric === k} onClick={() => setMetric(k)} className={cn('ripple rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200', metric === k ? 'bg-primary text-on-primary' : 'text-on-surface-variant')}>{t(label)}</button>
          ))}
        </div>
      </div>
      <HourChart hours={hours} metric={metric} now />
    </Card>
  );
}

/* ------------------------------ detail tiles ------------------------------ */
function Tile({ icon: Icon, title, i, children, className, onClick }: { icon: LucideIcon; title: string; i: number; children: ReactNode; className?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} style={{ animationDelay: `${i * 55 + 150}ms` }} className={cn('flex min-h-[7.5rem] animate-rise flex-col gap-1.5 rounded-[28px] bg-sc-low p-4 text-left transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-sc', onClick && 'ripple cursor-pointer', className)}>
      <div className="flex items-center gap-2 font-medium text-on-surface-variant"><Icon size={18} />{title}{onClick && <ChevronRight size={16} className="ml-auto" />}</div>
      {children}
    </Tag>
  );
}
const Big = ({ v, unit, small }: { v: ReactNode; unit?: string; small?: boolean }) => (
  <div className={cn('font-normal leading-tight tabular-nums', small ? 'text-lg font-medium' : 'text-[2rem]')}>{v}{unit && <small className="ml-1 text-sm font-medium text-on-surface-variant">{unit}</small>}</div>
);
const Sub = ({ children }: { children: ReactNode }) => <div className="text-[0.8rem] text-on-surface-variant">{children}</div>;
const Meter = ({ pct, color = 'var(--md-primary)' }: { pct: number; color?: string }) => (
  <div className="relative mt-auto h-1.5 overflow-hidden rounded-full bg-sc-highest"><i className="block h-full origin-left animate-[grow_0.9s_var(--ease-emphasized)_both] rounded-full" style={{ width: `${clamp(pct, 0, 100)}%`, background: color }} /></div>
);

function MoonSVG({ p }: { p: number }) {
  const r = 26, c = 28, k = Math.cos(2 * Math.PI * p), rx = Math.abs(k) * r, waxing = p < 0.5;
  const limb = waxing ? 1 : 0, term = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;
  return (
    <svg viewBox="0 0 56 56" width={56} height={56} aria-hidden="true">
      <circle cx={c} cy={c} r={r} className="fill-sc-highest" />
      <path d={`M${c} ${c - r} A${r} ${r} 0 0 ${limb} ${c} ${c + r} A${rx.toFixed(2)} ${r} 0 0 ${term} ${c} ${c - r}Z`} fill="#ffe082" style={{ filter: 'drop-shadow(0 0 4px rgb(255 224 130 / .5))' }} />
    </svg>
  );
}

function SunSide({ icon: I, time, label }: { icon: LucideIcon; time: string; label: string }) {
  return <div className="flex flex-col items-center gap-0.5 text-on-surface-variant"><I size={22} /><b className="text-lg font-medium text-on-surface">{time}</b><small>{label}</small></div>;
}
function SunTile({ m, i }: { m: Weather; i: number }) {
  const t = useT(), fmt = useFmt();
  const d = m.daily[0], p = sunProgress(m.now.time, d.sunrise, d.sunset), q = p ?? 0, th = Math.PI * (1 - q);
  const x = 120 + 100 * Math.cos(th), y = 76 - 64 * Math.sin(th), dl = daylight(d.sunrise, d.sunset), arc = 'M20 76 A100 64 0 0 1 220 76';
  return (
    <Tile icon={Sun} title={t('detail.sun')} i={i} className="col-span-full">
      <div className="flex items-center justify-center gap-6">
        <SunSide icon={Sunrise} time={fmt.clock(d.sunrise)} label={t('detail.sunrise')} />
        <svg viewBox="0 0 240 92" className="w-[min(20rem,50%)]" aria-hidden="true">
          <path d={arc} fill="none" strokeWidth={4} strokeLinecap="round" strokeDasharray="4 8" className="stroke-sc-highest" />
          <path d={arc} fill="none" strokeWidth={4} strokeLinecap="round" pathLength={1} className="arc-fg" style={{ stroke: '#ffb300', ['--p' as string]: q }} />
          <line x1={10} y1={76} x2={230} y2={76} strokeWidth={1.5} className="stroke-outline-variant" />
          <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={9} fill={p == null ? 'var(--md-outline)' : '#ffc107'} opacity={p == null ? 0.5 : 1} style={p == null ? undefined : { filter: 'drop-shadow(0 0 6px rgb(255 193 7 / .8))' }} />
        </svg>
        <SunSide icon={Sunset} time={fmt.clock(d.sunset)} label={t('detail.sunset')} />
      </div>
      <div className="text-center text-[0.8rem] text-on-surface-variant">{t('detail.daylight', { h: dl.h, m: dl.m })}</div>
    </Tile>
  );
}

export function Details() {
  const m = useModel(), t = useT();
  const n = m.now, wu = windLabel(m.windUnit), imperial = m.windUnit === 'mph';
  const vis = n.visibility == null ? null : imperial ? n.visibility / 1609.34 : n.visibility / 1000;
  const uv = uvInfo(n.uv), mp = moonPhase(), a = m.aqi?.us != null ? aqiInfo(m.aqi.us) : null;
  return (
    <section className="animate-rise" style={{ animationDelay: '140ms' }}>
      <SectionTitle>{t('section.details')}</SectionTitle>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
        <Tile icon={Droplets} title={t('detail.humidity')} i={0}><Big v={Math.round(n.humidity)} unit="%" /><Meter pct={n.humidity} /><Sub>{t('detail.dew', { v: deg(dewPoint(m)) })}</Sub></Tile>
        <Tile icon={Wind} title={t('detail.wind')} i={1}>
          <div className="flex flex-1 items-center justify-between gap-2">
            <div><Big v={Math.round(n.wind)} unit={wu} /><Sub>{t('detail.windFrom', { dir: compass(n.windDir, t) })}</Sub><Sub>{t('detail.gusts', { v: `${Math.round(n.gust)} ${wu}` })}</Sub></div>
            <div className="relative grid size-16 shrink-0 place-items-center rounded-full border-2 border-outline-variant">
              <span className="absolute top-px text-[10px] font-bold text-on-surface-variant">N</span>
              <ArrowUp size={22} className="mt-1.5 text-primary transition-transform duration-700 ease-emphasized" style={{ transform: `rotate(${(n.windDir + 180) % 360}deg)` }} />
            </div>
          </div>
        </Tile>
        <Tile icon={Gauge} title={t('detail.pressure')} i={2}><Big v={Math.round(n.pressure)} unit="hPa" /></Tile>
        <Tile icon={Sun} title={t('detail.uv')} i={3}>
          <Big v={n.uv == null ? '–' : n.uv.toFixed(1)} /><Sub>{t(uv.key)}</Sub>
          <div className="relative mt-auto h-1.5 rounded-full" style={{ background: 'linear-gradient(90deg,#43a047,#f9a825,#fb8c00,#e53935,#8e24aa)' }}>
            <i className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-sc-low" style={{ left: `${clamp(((n.uv ?? 0) / 11) * 100, 0, 100)}%`, background: uv.color }} />
          </div>
        </Tile>
        <Tile icon={Eye} title={t('detail.visibility')} i={4}><Big v={vis == null ? '–' : vis >= 10 ? Math.round(vis) : vis.toFixed(1)} unit={imperial ? 'mi' : 'km'} /></Tile>
        <Tile icon={Cloud} title={t('detail.cloud')} i={5}><Big v={Math.round(n.cloud)} unit="%" /><Meter pct={n.cloud} color="var(--md-secondary)" /></Tile>
        <Tile icon={Droplets} title={t('detail.precip')} i={6}><Big v={n.precip.toFixed(1)} unit={m.tempUnit === 'f' ? 'in' : 'mm'} /><Sub>{t('detail.precipHint')}</Sub></Tile>
        <Tile icon={Leaf} title={t('detail.aqi')} i={7} onClick={m.aqi ? () => ui().set({ aqiSheet: true }) : undefined}>
          {a && m.aqi ? (<><Big v={Math.round(m.aqi.us!)} unit="AQI" /><Sub>{t(a.key)}</Sub><Meter pct={(m.aqi.us! / 300) * 100} color={a.color} /></>) : <Sub>{t('detail.unavailable')}</Sub>}
        </Tile>
        <Tile icon={MoonIcon} title={t('detail.moon')} i={8}>
          <div className="flex flex-1 items-center gap-3.5"><MoonSVG p={mp.p} /><div><Big small v={t('moon.' + mp.idx)} /><Sub>{t('moon.illum', { v: Math.round(mp.illum * 100) })}</Sub></div></div>
        </Tile>
        <SunTile m={m} i={9} />
      </div>
    </section>
  );
}

/* ------------------------------ daily ------------------------------ */
export function Daily() {
  const m = useModel(), t = useT(), fmt = useFmt();
  const lo = Math.min(...m.daily.map((d) => d.min)), hi = Math.max(...m.daily.map((d) => d.max)), span = hi - lo || 1;
  return (
    <Card i={3} className="pr-3">
      <h2 className="mb-3 text-base font-semibold">{t('section.daily')}</h2>
      <div className="flex flex-col">
        {m.daily.map((d, i) => {
          const left = ((d.min - lo) / span) * 100, width = Math.max(((d.max - d.min) / span) * 100, 6);
          return (
            <button key={d.date} onClick={() => ui().set({ daySheet: i })} style={{ animationDelay: `${i * 60 + 250}ms` }}
              className="ripple grid h-[52px] animate-rise grid-cols-[84px_40px_58px_40px_1fr_40px] items-center gap-2.5 rounded-xl px-2 text-left transition-colors max-md:grid-cols-[70px_36px_1fr_36px]">
              <span className="font-semibold capitalize">{fmt.dayName(d.date, i)}</span>
              <WxIcon code={d.code} isDay size={34} />
              <span className={cn('flex items-center gap-0.5 text-xs text-primary max-md:hidden', d.pop < 10 && 'opacity-40')}><Droplets size={13} />{Math.round(d.pop)}%</span>
              <span className="text-right font-medium tabular-nums text-on-surface-variant max-md:hidden">{deg(d.min)}</span>
              <span className="relative h-2 rounded bg-sc-highest">
                <span className="absolute inset-y-0 origin-left animate-[grow_0.9s_var(--ease-emphasized)_0.4s_both] rounded" style={{ left: `${left}%`, width: `${width}%`, background: 'linear-gradient(90deg,#4fc3f7,#ffb74d,#ff7043)' }}>
                  {i === 0 && <i className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-primary bg-white" style={{ left: `${clamp(((m.now.temp - d.min) / (d.max - d.min || 1)) * 100, 0, 100)}%` }} />}
                </span>
              </span>
              <span className="font-medium tabular-nums">{deg(d.max)}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
