import { useEffect, useState } from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'
import { isTauri } from '../lib/api'
import { useSettings } from '../lib/settings'
import { cx, Tooltip } from './ui'

async function win() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow()
}

export function AppMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="20" fill="rgb(var(--c-primary))" />
      <rect x="14" y="12" width="30" height="34" rx="8" fill="rgb(var(--c-primary-container))" />
      <rect x="19" y="19" width="14" height="4" rx="2" fill="rgb(var(--c-primary))" />
      <rect x="19" y="27" width="20" height="4" rx="2" fill="rgb(var(--c-primary) / .5)" />
      <rect x="19" y="35" width="10" height="4" rx="2" fill="rgb(var(--c-primary) / .5)" />
      <path d="M36 38l14 8-6 2 4 7-4 2-4-7-5 4z" fill="rgb(var(--c-tertiary-container))" stroke="rgb(var(--c-on-primary-container))" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export function Titlebar() {
  const { t } = useSettings()
  const [max, setMax] = useState(false)

  useEffect(() => {
    if (!isTauri) return
    let un: (() => void) | undefined
    ;(async () => {
      const w = await win()
      const sync = () => w.isMaximized().then(setMax).catch(() => {})
      sync()
      un = await w.onResized(sync)
    })()
    return () => un?.()
  }, [])

  const act = async (k: 'min' | 'max' | 'close') => {
    if (!isTauri) return
    const w = await win()
    if (k === 'min') await w.minimize()
    else if (k === 'max') await w.toggleMaximize()
    else await w.close()
  }
  const btn = 'sl flex h-10 w-[46px] items-center justify-center text-on-surface-variant transition-colors'
  return (
    <header className="flex h-10 shrink-0 select-none items-center bg-surface-container-low">
      <div data-tauri-drag-region className="flex h-full min-w-0 flex-1 items-center gap-2.5 pl-3.5">
        <span data-tauri-drag-region className="pointer-events-none"><AppMark size={20} /></span>
        <span data-tauri-drag-region className="pointer-events-none truncate text-[0.82rem] font-medium">{t('appName')}</span>
      </div>
      <Tooltip label={t('winMinimize')} side="bottom"><button className={btn} aria-label={t('winMinimize')} onClick={() => act('min')}><Minus size={16} /></button></Tooltip>
      <Tooltip label={max ? t('winRestore') : t('winMaximize')} side="bottom">
        <button className={btn} aria-label={max ? t('winRestore') : t('winMaximize')} onClick={() => act('max')}>
          {max ? <Copy size={13} className="-scale-x-100" /> : <Square size={13} />}
        </button>
      </Tooltip>
      <Tooltip label={t('winClose')} side="bottom">
        <button className={cx(btn, 'hover:!bg-error hover:!text-on-error')} aria-label={t('winClose')} onClick={() => act('close')}><X size={17} /></button>
      </Tooltip>
    </header>
  )
}
