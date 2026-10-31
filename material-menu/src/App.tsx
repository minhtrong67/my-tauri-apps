import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Archive, LayoutList, Gauge, Layers, RefreshCw, Settings as Gear, SquareTerminal } from 'lucide-react'
import { api, errMsg } from './lib/api'
import { useApp, type Page } from './lib/app'
import { useSettings } from './lib/settings'
import type { Key } from './lib/i18n'
import { Titlebar } from './components/Titlebar'
import { ConfirmDialog, cx, ripple, Tooltip, useToast } from './components/ui'
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

function NavItem({ id, icon: Icon, label, active, onClick, bottom }: { id: string; icon: typeof Gauge; label: string; active: boolean; onClick: () => void; bottom?: boolean }) {
  return (
    <button key={id} onClick={onClick} aria-current={active ? 'page' : undefined} onPointerDown={ripple}
      className={cx('group flex flex-col items-center gap-1 outline-offset-2', bottom ? 'flex-1 py-2' : 'w-full py-1.5')}>
      <span className={cx('sl flex h-8 items-center justify-center rounded-full transition-all duration-500 ease-spring', active ? 'w-16 bg-secondary-container text-on-secondary-container' : 'w-10 text-on-surface-variant group-hover:w-14 group-hover:bg-on-surface/[.06]')}>
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className={cx('text-[0.7rem] font-medium leading-none transition-colors', active ? 'text-on-surface' : 'text-on-surface-variant')}>{label}</span>
    </button>
  )
}

export default function App({ onReady }: { onReady: () => void }) {
  const { t } = useSettings()
  const toast = useToast()
  const { page, go, loading, pendingRestart, clearPending } = useApp()
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
    const h = (e: Event) => { void e; setConfirm(true) }
    window.addEventListener('mm-ask-restart', h)
    return () => window.removeEventListener('mm-ask-restart', h)
  }, [])

  const Page = { overview: Overview, layout: Layout, commands: Commands, system: System, backup: Backup, settings: Settings }[page]

  return (
    <div className="flex h-full flex-col bg-surface-container-low">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-[88px] shrink-0 flex-col items-center gap-2 px-2 pb-4 pt-3 md:flex" aria-label="Main">
          {NAV.map((n) => <NavItem key={n.id} id={n.id} icon={n.icon} label={t(n.label)} active={page === n.id} onClick={() => go(n.id)} />)}
          <div className="mt-auto w-full"><NavItem id="settings" icon={Gear} label={t('navSettings')} active={page === 'settings'} onClick={() => go('settings')} /></div>
        </nav>

        <main className="relative min-w-0 flex-1 overflow-hidden rounded-tl-[28px] bg-surface md:mr-0">
          <div ref={scroller} onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 320)} className="h-full overflow-y-auto scroll-smooth px-5 pb-28 pt-6 md:px-8 md:pb-10">
            <div key={page} className="anim-page mx-auto max-w-5xl"><Page /></div>
          </div>

          {pendingRestart && (
            <div className="absolute bottom-24 left-5 z-30 md:bottom-6 md:left-6">
              <button onClick={() => setConfirm(true)} onPointerDown={ripple} className="sl press anim-pop flex h-14 items-center gap-3 rounded-[20px] bg-tertiary-container pl-4 pr-5 text-on-tertiary-container shadow-e3" style={{ animation: 'pop-in .4s var(--spring) both, ping-soft 2.2s ease-out 1s infinite' }}>
                <RefreshCw size={20} /><span className="text-[0.9rem] font-semibold">{t('restartExplorer')}</span>
              </button>
            </div>
          )}
          <div className={cx('absolute bottom-24 right-5 z-30 transition-all duration-500 ease-spring md:bottom-6 md:right-6', showTop ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-6 scale-50 opacity-0')}>
            <Tooltip label={t('scrollTop')}>
              <button aria-label={t('scrollTop')} tabIndex={showTop ? 0 : -1} onPointerDown={ripple} onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="sl press flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary-container text-on-primary-container shadow-e3"><ArrowUp size={24} /></button>
            </Tooltip>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-outline-variant/60 bg-surface-container px-1 md:hidden" aria-label="Main">
        {[...NAV, { id: 'settings' as Page, icon: Gear, label: 'navSettings' as Key }].map((n) => (
          <NavItem key={n.id} bottom id={n.id} icon={n.icon} label={t(n.label)} active={page === n.id} onClick={() => go(n.id)} />
        ))}
      </nav>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={restart} loading={busy} title={t('restartTitle')}
        confirmLabel={t('restartExplorer')} confirmIcon={<RefreshCw size={18} />} body={t('restartBody')} />
    </div>
  )
}
