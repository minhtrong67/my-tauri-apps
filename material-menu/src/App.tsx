import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Archive, LayoutList, Gauge, Layers, MousePointerClick, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, Settings as Gear, SquareMousePointer, SquareTerminal, Zap } from 'lucide-react'
import { api, errMsg } from './lib/api'
import { useApp, type Page } from './lib/app'
import { useSettings } from './lib/settings'
import type { Key } from './lib/i18n'
import { Titlebar } from './components/Titlebar'
import { Button, ConfirmDialog, Dialog, IconButton, cx, ripple, Tooltip, useToast } from './components/ui'
import { Palette } from './components/Palette'
import Overview from './pages/Overview'
import Layout from './pages/Layout'
import Commands from './pages/Commands'
import System from './pages/System'
import Backup from './pages/Backup'
import Settings from './pages/Settings'

const NAV: { id: Page; icon: typeof Gauge; label: Key }[] = [
  { id: 'overview', icon: Gauge, label: 'navOverview' },
  { id: 'layout', icon: LayoutList, label: 'navLayout' },
  { id: 'commands', icon: SquareTerminal, label: 'navCommands' },
  { id: 'system', icon: Layers, label: 'navSystem' },
  { id: 'backup', icon: Archive, label: 'navBackup' },
]

function NavItem({ id, icon: Icon, label, active, onClick, bottom, wide }: { id: string; icon: typeof Gauge; label: string; active: boolean; onClick: () => void; bottom?: boolean; wide?: boolean }) {
  if (wide) {
    return (
      <button key={id} onClick={onClick} aria-current={active ? 'page' : undefined} onPointerDown={ripple}
        className={cx('sl press flex h-14 w-full items-center gap-4 px-5 text-[0.93rem] font-medium transition-[background-color,border-radius] duration-500 ease-spring', active ? 'rounded-full bg-secondary-container text-on-secondary-container' : 'rounded-2xl text-on-surface-variant')}>
        <Icon size={22} strokeWidth={active ? 2.4 : 2} /><span className="truncate">{label}</span>
      </button>
    )
  }
  return (
    <button key={id} onClick={onClick} aria-current={active ? 'page' : undefined} onPointerDown={ripple}
      className={cx('group flex flex-col items-center gap-1 outline-offset-2', bottom ? 'flex-1 py-2' : 'w-full py-1.5')}>
      <span className={cx('sl flex h-8 items-center justify-center rounded-full transition-[width,background-color] duration-300 ease-spring', active ? 'w-16 bg-secondary-container text-on-secondary-container' : 'w-10 text-on-surface-variant group-hover:w-14 group-hover:bg-on-surface/[.06]')}>
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className={cx('text-[0.7rem] font-medium leading-none transition-colors', active ? 'text-on-surface' : 'text-on-surface-variant')}>{label}</span>
    </button>
  )
}

export default function App({ onReady }: { onReady: () => void }) {
  const { t, settings, set, ready } = useSettings()
  const toast = useToast()
  const { page, go, loading, pendingRestart, clearPending } = useApp()
  const [palette, setPalette] = useState(false)
  const wide = settings.railExpanded
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => { if (!loading) onReady() }, [loading, onReady])
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); setShowTop(false) }, [page])

  const restart = useCallback(async () => {
    setBusy(true)
    try { await api.restartExplorer(); clearPending(); toast.success(t('restartDone')) }
    catch (e) { toast.error(t('errGeneric', { msg: errMsg(e) })) }
    setBusy(false); setConfirm(false)
  }, [clearPending, t, toast])

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  useEffect(() => {
    const h = (e: Event) => { void e; setConfirm(true) }
    window.addEventListener('mm-ask-restart', h)
    return () => window.removeEventListener('mm-ask-restart', h)
  }, [])

  const Page = { overview: Overview, layout: Layout, commands: Commands, system: System, backup: Backup, settings: Settings }[page]

  return (
    <div className="flex h-full flex-col bg-surface-container-low">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <nav className={cx('hidden shrink-0 flex-col items-center gap-2 pb-4 pt-3 transition-[width,padding] duration-200 ease-emph md:flex', wide ? 'w-[248px] px-4' : 'w-[88px] px-2')} aria-label="Main">
          <div className={cx('flex w-full gap-1', wide ? 'justify-between px-1' : 'flex-col items-center')}>
            <IconButton label={wide ? t('railCollapse') : t('railExpand')} onClick={() => set({ railExpanded: !wide })} side="bottom">{wide ? <PanelLeftClose size={21} /> : <PanelLeftOpen size={21} />}</IconButton>
            <IconButton label={t('paletteTip')} onClick={() => setPalette(true)} side="bottom"><Search size={20} /></IconButton>
          </div>
          {NAV.map((n) => <NavItem key={n.id} id={n.id} icon={n.icon} label={t(n.label)} active={page === n.id} onClick={() => go(n.id)} wide={wide} />)}
          <div className="mt-auto w-full"><NavItem id="settings" icon={Gear} label={t('navSettings')} active={page === 'settings'} onClick={() => go('settings')} wide={wide} /></div>
        </nav>

        <main className="relative min-w-0 flex-1 overflow-hidden rounded-tl-[28px] bg-surface md:mr-0">
          <div ref={scroller} onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 320)} className="h-full overflow-y-auto scroll-smooth px-5 pb-28 pt-6 md:px-8 md:pb-10">
            <div key={page} className="anim-page mx-auto max-w-5xl"><Page /></div>
          </div>

          {pendingRestart && (
            <div className="absolute bottom-24 left-5 z-30 md:bottom-6 md:left-6">
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[20px] bg-tertiary" style={{ animation: 'ping-ring 2.2s ease-out 1s infinite', willChange: 'transform, opacity' }} />
              <button onClick={() => setConfirm(true)} onPointerDown={ripple} className="sl press anim-pop relative flex h-14 items-center gap-3 rounded-[20px] bg-tertiary-container pl-4 pr-5 text-on-tertiary-container shadow-e3">
                <RefreshCw size={20} /><span className="text-[0.9rem] font-semibold">{t('restartExplorer')}</span>
              </button>
            </div>
          )}
          <div id="fab-slot" className="absolute bottom-24 right-5 z-30 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
            <div className={cx('transition-[transform,opacity] duration-300 ease-spring', showTop ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none h-0 translate-y-6 scale-50 opacity-0')}>
              <Tooltip label={t('scrollTop')}>
                <button aria-label={t('scrollTop')} tabIndex={showTop ? 0 : -1} onPointerDown={ripple} onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="sl press flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary-container text-on-primary-container shadow-e3"><ArrowUp size={24} /></button>
              </Tooltip>
            </div>
          </div>
          <div id="toolbar-slot" className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6" />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-outline-variant/60 bg-surface-container px-1 md:hidden" aria-label="Main">
        {[...NAV, { id: 'settings' as Page, icon: Gear, label: 'navSettings' as Key }].map((n) => (
          <NavItem key={n.id} bottom id={n.id} icon={n.icon} label={t(n.label)} active={page === n.id} onClick={() => go(n.id)} />
        ))}
      </nav>

      <Palette open={palette} onClose={() => setPalette(false)} onRestart={() => setConfirm(true)} />
      <Dialog open={ready && !settings.onboarded} onClose={() => set({ onboarded: true })} wide title={t('obTitle')} icon={<MousePointerClick size={24} />}
        actions={<Button label={t('obStart')} icon={<Zap size={18} />} onClick={() => set({ onboarded: true })} />}>
        <p className="mb-4">{t('obSub')}</p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {([['ob1t', 'ob1d', 'bg-primary-container text-on-primary-container', <LayoutList key="a" size={22} />], ['ob2t', 'ob2d', 'bg-secondary-container text-on-secondary-container', <SquareTerminal key="b" size={22} />], ['ob3t', 'ob3d', 'bg-tertiary-container text-on-tertiary-container', <SquareMousePointer key="c" size={22} />]] as const).map(([a, b, c, i], n) => (
            <div key={a} className={cx('anim-pop rounded-3xl p-4', c)} style={{ animationDelay: `${n * 90}ms` }}>
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-surface/60">{i}</span>
              <p className="text-[0.95rem] font-semibold">{t(a)}</p><p className="mt-1 text-[0.82rem] opacity-85">{t(b)}</p>
            </div>
          ))}
        </div>
      </Dialog>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={restart} loading={busy} title={t('restartTitle')}
        confirmLabel={t('restartExplorer')} confirmIcon={<RefreshCw size={18} />} body={t('restartBody')} />
    </div>
  )
}
