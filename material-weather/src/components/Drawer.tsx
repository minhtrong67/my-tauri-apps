import { House, LocateFixed, MapPin, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { useT } from '../lib/i18n';
import { placeSub } from '../lib/format';
import { activate, removePlaceFlow, startLocate, toggleHome } from '../lib/actions';
import { useUI } from '../lib/ui';
import { WxIcon } from './WxIcon';
import { Credit } from './Credit';
import { Btn } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { cn } from './ui/cn';

export function Drawer() {
  const t = useT();
  const places = useStore((s) => s.places);
  const activeId = useStore((s) => s.activeId);
  const homeId = useStore((s) => s.homeId);
  const navOpen = useUI((s) => s.navOpen);
  const locating = useUI((s) => s.locating);
  const set = useUI((s) => s.set);
  return (
    <>
      <div onClick={() => set({ navOpen: false })} className={cn('fixed inset-0 z-[35] bg-scrim/35 transition-opacity duration-300 min-[961px]:hidden', navOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} />
      <aside className={cn('z-40 flex w-[300px] shrink-0 flex-col rounded-r-2xl bg-sc-low px-3 pb-3 pt-4 transition-transform duration-[400ms] ease-emphasized max-[960px]:fixed max-[960px]:inset-y-0 max-[960px]:left-0 max-[960px]:shadow-e3', navOpen ? 'max-[960px]:translate-x-0' : 'max-[960px]:-translate-x-[105%]')}>
        <div className="flex items-center gap-3 px-3 pb-4 pt-1">
          <img src="/logo.svg" width={44} height={44} alt="" className="rounded-xl" />
          <div><div className="text-[1.15rem] font-semibold leading-tight">{t('app.name')}</div><div className="text-xs text-on-surface-variant">Open-Meteo</div></div>
        </div>
        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">{t('nav.locations')}</div>
        <nav className="-mx-1 flex flex-1 flex-col gap-0.5 overflow-y-auto px-1">
          {!places.length && <div className="p-4 text-center text-on-surface-variant">{t('nav.empty')}</div>}
          {places.map((p, i) => {
            const active = p.id === activeId;
            return (
              <div key={p.id} role="button" tabIndex={0} onClick={() => activate(p.id)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activate(p.id); } }}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className={cn('ripple group flex h-[60px] shrink-0 animate-[slideLeft_0.35s_var(--ease-emphasized)_both] cursor-pointer items-center gap-3 rounded-full pl-3 pr-2 transition-[background-color,transform] duration-200 active:scale-[0.985]', active && 'bg-secondary-container text-on-secondary-container')}>
                <span className="grid w-8 place-items-center">{p.code != null ? <WxIcon code={p.code} isDay={p.isDay !== false} size={30} /> : <MapPin size={22} />}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="flex items-center gap-1 truncate font-semibold">{p.name}{homeId === p.id && <House size={13} className="shrink-0 text-primary" />}</b>
                  <small className={cn('truncate', active ? 'opacity-75' : 'text-on-surface-variant')}>{placeSub(p)}</small>
                </span>
                <span className="min-w-9 text-right text-base font-semibold tabular-nums">{p.temp != null ? Math.round(p.temp) + '°' : ''}</span>
                <span className="flex w-0 items-center overflow-hidden opacity-0 transition-all duration-200 group-focus-within:w-16 group-focus-within:opacity-100 group-hover:w-16 group-hover:opacity-100">
                  <Tooltip label={t(homeId === p.id ? 'home.unset' : 'home.set')} side="top"><button aria-label={t('home.set')} onClick={(e) => { e.stopPropagation(); toggleHome(p.id); }} className="ripple grid size-8 place-items-center rounded-full"><House size={16} className={homeId === p.id ? 'fill-current text-primary' : ''} /></button></Tooltip>
                  <Tooltip label={t('nav.remove')} side="top"><button aria-label={t('nav.remove')} onClick={(e) => { e.stopPropagation(); void removePlaceFlow(p.id); }} className="ripple grid size-8 place-items-center rounded-full text-on-surface-variant hover:text-error"><Trash2 size={16} /></button></Tooltip>
                </span>
              </div>
            );
          })}
        </nav>
        <div className="flex flex-col gap-3 px-1 pt-3">
          <Btn variant="tonal" icon={LocateFixed} className="w-full" disabled={locating} onClick={() => void startLocate()}>{t('nav.detect')}</Btn>
          <div className="text-center text-xs text-on-surface-variant"><Credit /></div>
        </div>
      </aside>
    </>
  );
}
