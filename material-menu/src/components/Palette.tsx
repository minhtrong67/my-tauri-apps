import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Archive, CornerDownLeft, Gauge, LayoutList, Layers, Plus, RefreshCw, Search, Settings as Gear, SquareMousePointer, SquareTerminal, Zap } from 'lucide-react'
import { useApp, type Page } from '../lib/app'
import { useSettings } from '../lib/settings'
import type { Key } from '../lib/i18n'
import { cx, usePresence } from './ui'

interface Cmd { id: string; label: string; icon: ReactNode; run: () => void; hint?: string }

export function Palette({ open, onClose, onRestart }: { open: boolean; onClose: () => void; onRestart: () => void }) {
  const { t } = useSettings()
  const { state, go, setClassic } = useApp()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const mounted = usePresence(open)
  const input = useRef<HTMLInputElement>(null)

  const all = useMemo<Cmd[]>(() => {
    const page = (id: Page, label: Key, icon: ReactNode): Cmd => ({ id, label: t(label), icon, run: () => go(id), hint: '→' })
    return [
      page('overview', 'navOverview', <Gauge size={18} />), page('layout', 'navLayout', <LayoutList size={18} />), page('commands', 'navCommands', <SquareTerminal size={18} />),
      page('system', 'navSystem', <Layers size={18} />), page('backup', 'navBackup', <Archive size={18} />), page('settings', 'navSettings', <Gear size={18} />),
      { id: 'add', label: t('actAdd'), icon: <Plus size={18} />, run: () => { go('commands'); window.setTimeout(() => window.dispatchEvent(new Event('mm-add-command')), 80) } },
      { id: 'classic', label: t('actClassic'), icon: <SquareMousePointer size={18} />, run: () => setClassic(!state.classic) },
      { id: 'restart', label: t('actRestart'), icon: <RefreshCw size={18} />, run: onRestart },
      ...state.entries.map((e) => ({ id: 'e' + e.id, label: e.label, icon: <Zap size={18} />, run: () => go('commands'), hint: t('navCommands') })),
    ]
  }, [t, go, setClassic, state, onRestart])

  const list = useMemo(() => { const s = q.trim().toLowerCase(); return s ? all.filter((c) => c.label.toLowerCase().includes(s)) : all }, [all, q])
  useEffect(() => { setActive(0) }, [q])
  useEffect(() => { if (open) { setQ(''); window.setTimeout(() => input.current?.focus(), 30) } }, [open])
  if (!mounted) return null

  const run = (c?: Cmd) => { if (!c) return; onClose(); c.run() }
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(list.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') run(list[active])
  }
  return createPortal(
    <div className={cx('fixed inset-x-0 bottom-0 top-10 z-[200] flex items-start justify-center px-4 pt-[12vh]', open ? 'anim-fade' : 'anim-fade-out')} style={{ background: 'rgb(var(--c-scrim) / .4)' }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-label={t('paletteTip')} className={cx('w-full max-w-xl overflow-hidden rounded-[28px] bg-surface-container-high shadow-e3', open ? 'anim-pop' : 'anim-pop-out')}>
        <div className="flex items-center gap-3 px-5 pt-4">
          <Search size={20} className="text-on-surface-variant" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder={t('paletteHint')} aria-label={t('paletteHint')} className="h-12 flex-1 bg-transparent text-[1.05rem] outline-none placeholder:text-on-surface-variant/60" />
          <kbd className="rounded-md bg-surface-container-highest px-2 py-0.5 text-[0.7rem] text-on-surface-variant">Esc</kbd>
        </div>
        <ul className="max-h-[48vh] overflow-y-auto p-2 pt-1">
          {list.length === 0 && <li className="p-6 text-center text-[0.9rem] text-on-surface-variant">{t('paletteEmpty')}</li>}
          {list.map((c, i) => (
            <li key={c.id}>
              <button onPointerMove={() => setActive(i)} onClick={() => run(c)} className={cx('flex h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-[0.95rem] transition-colors', i === active ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface')}>
                {c.icon}<span className="flex-1 truncate">{c.label}</span>
                {i === active ? <CornerDownLeft size={15} /> : c.hint && <span className="text-[0.75rem] text-on-surface-variant">{c.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
