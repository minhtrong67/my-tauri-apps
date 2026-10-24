import { useEffect, useReducer, useRef, type ReactNode } from 'react';
import { CloudOff, Copy, MapPin, Minus, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '../lib/store';
import { useT, wmoKey } from '../lib/i18n';
import { deg, placeSub, skyClass, useFmt } from '../lib/format';
import { createFX } from '../lib/fx';
import { changeSetting, copySummary, toggleHome } from '../lib/actions';
import { WxIcon } from './WxIcon';
import { Tooltip } from './ui/Tooltip';
import { cn } from './ui/cn';

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  useEffect(() => {
    const el = ref.current, from = shown.current;
    shown.current = value;
    if (!el || from === value || matchMedia('(prefers-reduced-motion: reduce)').matches) { if (el) el.textContent = String(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min((now - t0) / 650, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(from + (value - from) * e));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

/** Re-renders every `ms` (keeps the local clock fresh). */
function useTick(ms: number) {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(() => !document.hidden && tick(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

const Chip = ({ children }: { children: ReactNode }) => <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 backdrop-blur-md">{children}</span>;

export function Hero() {
  const m = useStore((s) => s.model)!;
  const offline = useStore((s) => s.offline);
  const effects = useStore((s) => s.settings.effects);
  const homeId = useStore((s) => s.homeId);
  const t = useT();
  const fmt = useFmt();
  const canvas = useRef<HTMLCanvasElement>(null);
  const fx = useRef<ReturnType<typeof createFX> | null>(null);
  useTick(30000);

  useEffect(() => {
    fx.current = createFX(canvas.current!);
    return () => fx.current?.destroy();
  }, []);
  useEffect(() => fx.current?.set(m.now.code, m.now.isDay), [m.now.code, m.now.isDay]);
  useEffect(() => fx.current?.enable(effects), [effects]);

  const n = m.now, today = m.daily[0];
  const isHome = homeId === m.place.id;
  const delta = m.yesterday ? Math.round(today.max - m.yesterday.max) : null;
  const other = m.tempUnit === 'c' ? 'F' : 'C';

  return (
    <section className={cn('relative grid min-h-[17rem] animate-[pop_0.6s_var(--ease-emphasized)_both] grid-cols-[1fr_auto] items-center gap-4 overflow-hidden rounded-[28px] px-8 pb-10 pt-7 text-white shadow-e1 [--wx-cloud:#fff] [--wx-cloud2:#dbe4ee] max-md:grid-cols-1 max-md:px-5', skyClass(n.code, n.isDay))}>
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" />
      <div className="relative z-10 [text-shadow:0_1px_12px_rgb(0_0_0/0.18)]">
        <div className="flex items-center gap-1.5">
          <MapPin size={22} />
          <h1 className="text-[1.65rem] font-semibold leading-tight">{m.place.name}</h1>
          <Tooltip label={t(isHome ? 'home.unset' : 'home.set')}>
            <button aria-label={t(isHome ? 'home.unset' : 'home.set')} onClick={() => toggleHome(m.place.id)} className="ripple grid size-8 place-items-center rounded-full transition-transform active:scale-90">
              <Star size={19} className={cn('transition-all duration-300', isHome && 'scale-110 fill-yellow-300 text-yellow-300')} />
            </button>
          </Tooltip>
        </div>
        <div className="ml-7 opacity-85">{placeSub(m.place)}</div>
        <div className="ml-7 text-[0.8rem] opacity-85">{fmt.placeDateTime(m)}</div>
        <div className="mt-2.5 flex items-start font-light leading-none tracking-tight tabular-nums">
          <span className="text-[6.5rem] max-md:text-[5.25rem]"><CountUp value={Math.round(n.temp)} /></span>
          <Tooltip label={t('hero.switchUnit', { u: other })}>
            <button onClick={() => void changeSetting({ tempUnit: m.tempUnit === 'c' ? 'f' : 'c' })} aria-label={t('hero.switchUnit', { u: other })} className="ripple mt-3 rounded-xl px-2 py-1 text-3xl font-normal tracking-normal transition-colors hover:bg-white/15">
              °{m.tempUnit.toUpperCase()}
            </button>
          </Tooltip>
        </div>
        <div className="mb-3 mt-1 text-[1.4rem] font-medium">{t(wmoKey(n.code))}</div>
        <div className="flex flex-wrap gap-2 text-sm font-medium [text-shadow:none]">
          <Chip>{t('hero.high')} {deg(today.max)}</Chip>
          <Chip>{t('hero.low')} {deg(today.min)}</Chip>
          <Chip>{t('hero.feels')} {deg(n.feels)}</Chip>
          {delta != null && (
            <Chip>
              {delta > 0 ? <TrendingUp size={15} /> : delta < 0 ? <TrendingDown size={15} /> : <Minus size={15} />}
              {delta === 0 ? t('hero.same') : t(delta > 0 ? 'hero.warmer' : 'hero.cooler', { v: Math.abs(delta) })}
            </Chip>
          )}
        </div>
      </div>
      <div className="relative z-10 pr-3 drop-shadow-[0_10px_24px_rgb(0_0_0/0.2)] max-md:hidden"><WxIcon code={n.code} isDay={n.isDay} size={168} animated /></div>
      <Tooltip label={t('action.copy')}>
        <button aria-label={t('action.copy')} onClick={() => void copySummary()} className="ripple absolute right-3.5 top-3.5 z-20 grid size-10 place-items-center rounded-full bg-white/20 backdrop-blur-md transition hover:bg-white/30 active:scale-90"><Copy size={19} /></button>
      </Tooltip>
      <div className={cn('absolute bottom-3 right-5 z-10 flex items-center gap-1.5 text-xs opacity-85', offline && 'rounded-full bg-black/30 px-2.5 py-0.5 opacity-100')}>
        {offline && <><CloudOff size={14} /><span>{t('hero.offline')} ·</span></>}
        <span>{t('hero.updated', { time: fmt.updated(m.fetchedAt) })}</span>
      </div>
    </section>
  );
}
