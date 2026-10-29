import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button, IconButton, type Variant } from './Button'
import { ScrollTop } from './ScrollTop'

export interface DialogAction { label: string; icon: LucideIcon; variant?: Variant; onClick: () => void; disabled?: boolean }
interface Props {
  open: boolean; onClose: () => void; title: string; icon?: LucideIcon; actions?: DialogAction[]; closeLabel: string
  size?: 'sm' | 'md' | 'lg'; children: ReactNode; tone?: 'primary' | 'danger'; scrollTopLabel?: string
}

/** Keeps a component mounted while its exit animation plays. */
function useMounted(open: boolean, ms = 200) {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) { setMounted(true); return }
    const t = setTimeout(() => setMounted(false), ms)
    return () => clearTimeout(t)
  }, [open, ms])
  return mounted
}

const FOCUSABLE = 'button:not(:disabled),[href],input:not(:disabled),select,textarea,[tabindex]:not([tabindex="-1"])'

export function Dialog({ open, onClose, title, icon: Icon, actions, closeLabel, size = 'md', children, tone = 'primary', scrollTopLabel }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const mounted = useMounted(open)
  const card = useRef<HTMLDivElement>(null)
  const prev = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    prev.current = document.activeElement as HTMLElement
    const t = setTimeout(() => (card.current?.querySelector<HTMLElement>('[data-autofocus]') ?? card.current?.querySelector<HTMLElement>('[data-body] ' + FOCUSABLE) ?? card.current)?.focus({ preventScroll: true }), 60)
    return () => { clearTimeout(t); prev.current?.focus?.({ preventScroll: true }) }
  }, [open])

  if (!mounted) return null
  const w = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl'
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    if (e.key !== 'Tab' || !card.current) return
    const f = [...card.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null)
    if (!f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" onKeyDown={onKey}>
      <div className="scrim absolute inset-0" style={{ animation: `${open ? 'fade-in' : 'fade-in'} .2s ease both`, opacity: open ? 1 : 0, transition: 'opacity .2s' }} onClick={onClose} />
      <div ref={card} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={cn('relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface-container-high text-on-surface outline-none elev-5 sm:rounded-[28px]', w)}
        style={{ animation: open ? 'pop-in .4s var(--ease-spring) both' : undefined, opacity: open ? undefined : 0, transform: open ? undefined : 'scale(.94) translateY(10px)', transition: 'opacity .18s, transform .18s' }}>
        <div className="flex items-center gap-3 px-6 pb-3 pt-5">
          {Icon && <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tone === 'danger' ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container')}><Icon size={22} /></span>}
          <h2 className="min-w-0 flex-1 truncate text-[1.25rem] font-semibold tracking-tight">{title}</h2>
          <IconButton icon={X} label={closeLabel} shortcut="Esc" onClick={onClose} />
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div ref={bodyRef} data-body className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">{children}</div>
          {scrollTopLabel && <ScrollTop target={bodyRef} label={scrollTopLabel} />}
        </div>
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant/60 bg-surface-container-high px-6 py-4">
            {actions.map((a) => <Button key={a.label} variant={a.variant ?? 'tonal'} icon={a.icon} onClick={a.onClick} disabled={a.disabled} data-autofocus={a === actions[actions.length - 1] ? '' : undefined}>{a.label}</Button>)}
          </div>
        )}
      </div>
    </div>, document.body)
}
