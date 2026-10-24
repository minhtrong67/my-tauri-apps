import { Check, Info, Keyboard, LocateFixed, MapPinOff, X } from 'lucide-react';
import { useT } from '../lib/i18n';
import { useUI } from '../lib/ui';
import { Dialog, DialogActions, DialogHeader } from './ui/Dialog';
import { Btn } from './ui/Button';
import { openExternal } from '../lib/window';
import { cn } from './ui/cn';
import { APP_VERSION } from '../lib/meta';

/* ---------- confirm dialog (label + icon + coloured action) ---------- */
export function ConfirmHost() {
  const c = useUI((s) => s.confirm);
  const set = useUI((s) => s.set);
  const done = (v: boolean) => { c?.resolve(v); set({ confirm: null }); };
  const Head = c?.headIcon ?? Info;
  return (
    <Dialog open={!!c} onClose={() => done(false)} label={c?.title ?? ''} className="max-w-[420px]">
      {c && (
        <>
          <div className="flex flex-col items-center gap-2.5 px-7 pb-1 pt-8 text-center">
            <div className={cn('grid size-16 place-items-center rounded-full', c.tone === 'error' ? 'bg-error-container text-error' : 'bg-primary-container text-primary')}><Head size={30} /></div>
            <h2 className="text-2xl font-medium">{c.title}</h2>
            <p className="text-on-surface-variant">{c.message}</p>
          </div>
          <DialogActions>
            <Btn variant="tonal" icon={X} onClick={() => done(false)} data-autofocus>{c.cancelLabel}</Btn>
            <Btn variant={c.tone === 'error' ? 'error' : 'filled'} icon={c.icon} onClick={() => done(true)}>{c.confirmLabel}</Btn>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

/* ---------- location permission ---------- */
export function LocationDialog() {
  const loc = useUI((s) => s.location);
  const set = useUI((s) => s.set);
  const t = useT();
  const denied = loc?.mode === 'denied';
  const close = () => { const l = loc; set({ location: null }); l?.onDismiss?.(); };
  const act = (fn: () => void) => { set({ location: null }); fn(); };
  return (
    <Dialog open={!!loc} onClose={close} label={t(denied ? 'loc.deniedTitle' : 'loc.title')} className="max-w-[460px]">
      {loc && (
        <>
          <div className="flex flex-col items-center gap-2.5 px-7 pb-2 pt-8 text-center">
            <div className={cn('relative grid size-[72px] place-items-center rounded-full', denied ? 'bg-error-container text-error' : 'bg-primary-container text-on-primary-container')}>
              {denied ? <MapPinOff size={34} /> : <LocateFixed size={34} />}
              <span className={cn('absolute inset-0 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border-2', denied ? 'border-error' : 'border-primary')} />
            </div>
            <h2 className="text-2xl font-medium">{t(denied ? 'loc.deniedTitle' : 'loc.title')}</h2>
            <p className="leading-relaxed text-on-surface-variant">{t(denied ? 'loc.deniedBody' : 'loc.body')}</p>
          </div>
          <DialogActions>
            {denied ? (
              <>
                <Btn variant="text" icon={X} onClick={close}>{t('action.close')}</Btn>
                <Btn variant="tonal" icon={LocateFixed} onClick={() => act(loc.onAllow)}>{t('loc.retry')}</Btn>
                <Btn variant="filled" icon={Check} onClick={() => act(loc.onApprox)} data-autofocus>{t('loc.approx')}</Btn>
              </>
            ) : (
              <>
                <Btn variant="text" icon={X} onClick={close}>{t('loc.notNow')}</Btn>
                <Btn variant="tonal" icon={Info} onClick={() => act(loc.onApprox)}>{t('loc.approx')}</Btn>
                <Btn variant="filled" icon={LocateFixed} onClick={() => act(loc.onAllow)} data-autofocus>{t('loc.allow')}</Btn>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

/* ---------- about ---------- */
export function AboutDialog() {
  const open = useUI((s) => s.about);
  const set = useUI((s) => s.set);
  const t = useT();
  const close = () => set({ about: false });
  return (
    <Dialog open={open} onClose={close} label={t('about.title')} className="max-w-[440px]">
      <div className="flex flex-col items-center gap-2 px-7 pb-3 pt-9 text-center">
        <img src="/logo.svg" width={96} height={96} alt="" className="animate-[float_4s_ease-in-out_infinite] rounded-[24px] shadow-e2" />
        <h2 className="mt-2 text-3xl font-medium">{t('app.name')}</h2>
        <div className="text-on-surface-variant">{t('about.version', { v: APP_VERSION })}</div>
        <p className="text-on-surface-variant">{t('about.desc')}</p>
        <div className="my-2 flex items-center gap-5">
          <div className="flex flex-col items-center gap-1.5"><small className="text-on-surface-variant">{t('about.createdBy')}</small><span className="rounded-full bg-primary-container px-4 py-1 text-lg font-bold text-on-primary-container">minhtrong67</span></div>
          <div className="flex flex-col items-center gap-1.5"><small className="text-on-surface-variant">{t('about.withAi')}</small><span className="rounded-full bg-gradient-to-r from-[#d97757] to-[#c15f3c] px-4 py-1 text-lg font-bold text-white">Claude</span></div>
        </div>
        <button className="text-sm text-primary underline-offset-2 hover:underline" onClick={() => void openExternal('https://open-meteo.com/')}>{t('about.data')}</button>
      </div>
      <DialogActions><Btn variant="filled" icon={Check} onClick={close} data-autofocus>{t('action.ok')}</Btn></DialogActions>
    </Dialog>
  );
}

/* ---------- keyboard shortcuts ---------- */
export function ShortcutsDialog() {
  const open = useUI((s) => s.shortcuts);
  const set = useUI((s) => s.set);
  const t = useT();
  const close = () => set({ shortcuts: false });
  const rows: [string[], string][] = [[['Ctrl', 'K'], 'shortcuts.search'], [['F5'], 'shortcuts.refresh'], [['Ctrl', ','], 'shortcuts.settings'], [['Alt', '↑ / ↓'], 'shortcuts.switch'], [['?'], 'shortcuts.help'], [['Esc'], 'shortcuts.close']];
  return (
    <Dialog open={open} onClose={close} label={t('shortcuts.title')} className="max-w-[440px]">
      <DialogHeader icon={Keyboard} title={t('shortcuts.title')} onClose={close} />
      <div className="flex flex-col gap-1 px-6 pb-2">
        {rows.map(([keys, label]) => (
          <div key={label} className="flex items-center justify-between rounded-xl px-2 py-2.5 odd:bg-sc-low">
            <span>{t(label)}</span>
            <span className="flex gap-1">{keys.map((k) => <kbd key={k} className="rounded-lg border border-outline-variant bg-sc-highest px-2 py-0.5 font-sans text-xs font-semibold">{k}</kbd>)}</span>
          </div>
        ))}
      </div>
      <DialogActions><Btn variant="filled" icon={Check} onClick={close} data-autofocus>{t('action.ok')}</Btn></DialogActions>
    </Dialog>
  );
}
