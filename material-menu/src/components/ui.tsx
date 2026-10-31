import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactElement, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'
import { useSettings } from '../lib/settings'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

/* ---------- ripple ---------- */
export function ripple(e: RPointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const size = Math.max(r.width, r.height) * 2
  const d = document.createElement('span')
  d.className = 'ripple-dot'
  d.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`
  el.appendChild(d)
  d.addEventListener('animationend', () => d.remove())
}

/* ---------- presence (mount/unmount with exit animation) ---------- */
export function usePresence(open: boolean, ms = 170) {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) { setMounted(true); return }
    const id = window.setTimeout(() => setMounted(false), ms)
    return () => window.clearTimeout(id)
  }, [open, ms])
  return mounted
}

/* ---------- buttons ---------- */
export type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'error' | 'errorTonal'
const VARIANT: Record<Variant, string> = {
  filled: 'bg-primary text-on-primary shadow-e1 hover:shadow-e2',
  tonal: 'bg-secondary-container text-on-secondary-container',
  outlined: 'border border-outline text-primary',
  text: 'text-primary',
  error: 'bg-error text-on-error shadow-e1 hover:shadow-e2',
  errorTonal: 'bg-error-container text-on-error-container',
}

interface BtnProps {
  label: string; icon?: ReactNode; variant?: Variant; size?: 'sm' | 'md' | 'lg'
  onClick?: (e: RMouseEvent<HTMLButtonElement>) => void; disabled?: boolean; className?: string; type?: 'button' | 'submit'
  loading?: boolean
}
export function Button({ label, icon, variant = 'filled', size = 'md', onClick, disabled, className, type = 'button', loading }: BtnProps) {
  const h = size === 'sm' ? 'h-9 px-4 text-[0.85rem] gap-1.5 rounded-[18px] active:rounded-[10px]'
    : size === 'lg' ? 'h-14 px-7 text-base gap-2.5 rounded-[28px] active:rounded-[14px]'
    : 'h-11 px-5 text-[0.92rem] gap-2 rounded-[22px] active:rounded-[12px]'
  return (
    <button
      type={type} disabled={disabled || loading} onClick={onClick} onPointerDown={ripple}
      className={cx('sl press inline-flex shrink-0 items-center justify-center font-medium tracking-[.01em] disabled:pointer-events-none disabled:opacity-40', h, VARIANT[variant], className)}
    >
      {loading ? <span className="h-[1.1em] w-[1.1em] rounded-full border-2 border-current border-t-transparent" style={{ animation: 'spin .7s linear infinite' }} /> : icon}
      <span>{label}</span>
    </button>
  )
}

interface IconBtnProps {
  label: string; children: ReactNode; onClick?: (e: RMouseEvent<HTMLButtonElement>) => void
  variant?: 'standard' | 'tonal' | 'filled' | 'error'; size?: 'sm' | 'md'; disabled?: boolean; className?: string
  side?: 'top' | 'bottom'; pressed?: boolean
}
export function IconButton({ label, children, onClick, variant = 'standard', size = 'md', disabled, className, side, pressed }: IconBtnProps) {
  const v = {
    standard: 'text-on-surface-variant', tonal: 'bg-secondary-container text-on-secondary-container',
    filled: 'bg-primary text-on-primary', error: 'text-error',
  }[variant]
  return (
    <Tooltip label={label} side={side}>
      <button
        type="button" aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick} onPointerDown={ripple}
        className={cx('sl press inline-flex shrink-0 items-center justify-center rounded-full active:rounded-xl disabled:pointer-events-none disabled:opacity-40', size === 'sm' ? 'h-8 w-8' : 'h-10 w-10', v, className)}
      >
        {children}
      </button>
    </Tooltip>
  )
}

/* ---------- tooltip ---------- */
export function Tooltip({ label, children, side = 'top' }: { label: string; children: ReactElement | ReactNode; side?: 'top' | 'bottom' }) {
  const [pos, setPos] = useState<{ x: number; y: number; place: 'top' | 'bottom' } | null>(null)
  const timer = useRef<number>(0)
  const ref = useRef<HTMLSpanElement>(null)
  const show = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const place = side === 'top' && r.top < 56 ? 'bottom' : side === 'bottom' && window.innerHeight - r.bottom < 56 ? 'top' : side
      const half = Math.min(label.length * 3.6 + 14, 170)
      const x = Math.min(Math.max(r.left + r.width / 2, half + 8), window.innerWidth - half - 8)
      setPos({ x, y: place === 'top' ? r.top - 8 : r.bottom + 8, place })
    }, 380)
  }
  const hide = () => { window.clearTimeout(timer.current); setPos(null) }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <span ref={ref} className="inline-flex" onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide} onPointerDown={hide}>
      {children}
      {pos && createPortal(
        <div
          role="tooltip"
          style={{ left: pos.x, top: pos.y, animation: 'tip-in .16s var(--spring) both', transformOrigin: pos.place === 'top' ? 'bottom center' : 'top center' }}
          className={cx('pointer-events-none fixed z-[300] max-w-[340px] rounded-lg bg-inverse-surface px-3 py-1.5 text-[0.78rem] font-medium leading-snug text-inverse-on-surface shadow-e2', pos.place === 'top' && '-translate-y-full')}
        >
          {label}
        </div>,
        document.body,
      )}
    </span>
  )
}

/* ---------- switch ---------- */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cx('group relative h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors duration-300 disabled:opacity-40', checked ? 'border-primary bg-primary' : 'border-outline bg-surface-container-highest')}
    >
      <span
        className={cx('absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300 ease-spring group-active:h-7 group-active:w-7',
          checked ? 'left-[22px] h-6 w-6 bg-on-primary group-active:left-[18px]' : 'left-[4px] h-4 w-4 bg-outline group-active:left-[3px]')}
      >
        <Check size={14} strokeWidth={3} className={cx('text-primary transition-all duration-300', checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0')} />
      </span>
    </button>
  )
}

/* ---------- segmented ---------- */
export function Segmented<T extends string>({ value, onChange, options, className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: ReactNode }[]; className?: string
}) {
  return (
    <div role="radiogroup" className={cx('inline-flex overflow-hidden rounded-full border border-outline', className)}>
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} onPointerDown={ripple}
            className={cx('sl flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 text-[0.88rem] font-medium transition-colors duration-300', i > 0 && 'border-l border-outline',
              on ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface')}
          >
            {on ? <Check size={16} strokeWidth={2.6} className="anim-pop" /> : o.icon}
            <span>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------- select ---------- */
export interface Opt<T> { value: T; label: string; hint?: string; icon?: ReactNode; style?: CSSProperties }
export function Select<T extends string>({ value, onChange, options, icon, className, ariaLabel, maxHeight = 264 }: {
  value: T; onChange: (v: T) => void; options: Opt<T>[]; icon?: ReactNode; className?: string; ariaLabel: string; maxHeight?: number
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [box, setBox] = useState<{ left: number; top: number; width: number; max: number; up: boolean } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const mounted = usePresence(open)
  const id = useId()
  const cur = options.find((o) => o.value === value)

  const openList = () => {
    const r = btn.current!.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const up = below < Math.min(maxHeight, options.length * 44 + 12) && above > below
    const max = Math.max(140, Math.min(maxHeight, up ? above : below))
    setBox({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 200), max, up })
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      const t = e.target as Node
      if (!list.current?.contains(t) && !btn.current?.contains(t)) setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('pointerdown', down)
    window.addEventListener('resize', close)
    return () => { document.removeEventListener('pointerdown', down); window.removeEventListener('resize', close) }
  }, [open])
  useLayoutEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, mounted])

  const pick = (v: T) => { onChange(v); setOpen(false); btn.current?.focus() }
  const key = (e: React.KeyboardEvent) => {
    if (!open) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() } return }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(options.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[active].value) }
  }

  return (
    <>
      <button
        ref={btn} type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
        onClick={() => (open ? setOpen(false) : openList())} onKeyDown={key}
        className={cx('sl flex h-12 w-full items-center gap-3 rounded-2xl border bg-surface-container-lowest/60 px-4 text-left text-[0.95rem] transition-colors', open ? 'border-primary' : 'border-outline-variant hover:border-outline', className)}
      >
        {icon && <span className="text-on-surface-variant">{icon}</span>}
        <span className="min-w-0 flex-1 truncate" style={cur?.style}>{cur?.label}</span>
        <ChevronDown size={18} className={cx('text-on-surface-variant transition-transform duration-300 ease-spring', open && 'rotate-180')} />
      </button>
      {mounted && box && createPortal(
        <div
          ref={list} id={id} role="listbox" tabIndex={-1}
          style={{ left: box.left, top: box.top, width: box.width, maxHeight: box.max, transformOrigin: box.up ? 'bottom' : 'top' }}
          className={cx('fixed z-[250] overflow-y-auto rounded-2xl bg-surface-container-high p-1.5 shadow-e3', box.up && '-translate-y-full', open ? 'anim-pop' : 'anim-pop-out')}
        >
          {options.map((o, i) => (
            <div
              key={o.value} data-i={i} role="option" aria-selected={o.value === value}
              onPointerMove={() => setActive(i)} onClick={() => pick(o.value)}
              className={cx('flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-[0.93rem] transition-colors',
                o.value === value ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface', i === active && o.value !== value && 'bg-on-surface/[.08]')}
            >
              {o.icon}
              <span className="min-w-0 flex-1"><span className="block truncate" style={o.style}>{o.label}</span>
                {o.hint && <span className="block truncate text-[0.75rem] text-on-surface-variant">{o.hint}</span>}</span>
              {o.value === value && <Check size={16} strokeWidth={2.6} />}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

/* ---------- modal / dialog / sheet ---------- */
function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])
}

export function Dialog({ open, onClose, icon, title, children, actions, tone = 'primary', wide }: {
  open: boolean; onClose: () => void; icon?: ReactNode; title: string; children?: ReactNode; actions?: ReactNode
  tone?: 'primary' | 'error'; wide?: boolean
}) {
  const mounted = usePresence(open)
  useEsc(open, onClose)
  if (!mounted) return null
  return createPortal(
    <div className={cx('fixed inset-x-0 bottom-0 top-10 z-[150] flex items-center justify-center p-5', open ? 'anim-fade' : 'anim-fade-out')} style={{ background: 'rgb(var(--c-scrim) / .42)', backdropFilter: 'blur(2px)' }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cx('flex max-h-full w-full flex-col rounded-[28px] bg-surface-container-high p-6 shadow-e3', wide ? 'max-w-xl' : 'max-w-md', open ? 'anim-pop' : 'anim-pop-out')}>
        {icon && (
          <div className={cx('mb-4 flex h-12 w-12 items-center justify-center rounded-2xl', tone === 'error' ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container')}>
            {icon}
          </div>
        )}
        <h2 className="text-[1.4rem] font-semibold leading-tight">{title}</h2>
        {children && <div className="mt-3 min-h-0 flex-1 overflow-y-auto text-[0.93rem] leading-relaxed text-on-surface-variant">{children}</div>}
        {actions && <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, confirmIcon, danger, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel: string
  confirmIcon: ReactNode; danger?: boolean; loading?: boolean
}) {
  const { t } = useSettings()
  return (
    <Dialog open={open} onClose={onClose} title={title} tone={danger ? 'error' : 'primary'} icon={confirmIcon}
      actions={<>
        <Button label={t('cancel')} icon={<X size={18} />} variant="tonal" onClick={onClose} />
        <Button label={confirmLabel} icon={confirmIcon} variant={danger ? 'error' : 'filled'} onClick={onConfirm} loading={loading} />
      </>}>
      {body}
    </Dialog>
  )
}

export function Sheet({ open, onClose, title, subtitle, icon, children, footer }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; icon?: ReactNode; children: ReactNode; footer: ReactNode
}) {
  const { t } = useSettings()
  const mounted = usePresence(open, 190)
  useEsc(open, onClose)
  if (!mounted) return null
  return createPortal(
    <div className={cx('fixed inset-x-0 bottom-0 top-10 z-[140] flex justify-end', open ? 'anim-fade' : 'anim-fade-out')} style={{ background: 'rgb(var(--c-scrim) / .38)' }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside role="dialog" aria-modal="true" aria-label={title}
        className={cx('flex h-full w-full max-w-[540px] flex-col bg-surface-container-low shadow-e3 sm:my-3 sm:mr-3 sm:h-[calc(100%-1.5rem)] sm:rounded-[28px]', open ? 'anim-sheet' : 'anim-sheet-out')}>
        <header className="flex items-center gap-3 px-6 pb-3 pt-5">
          {icon && <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">{icon}</span>}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.25rem] font-semibold leading-tight">{title}</h2>
            {subtitle && <p className="truncate text-[0.82rem] text-on-surface-variant">{subtitle}</p>}
          </div>
          <IconButton label={t('close')} onClick={onClose}><X size={20} /></IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">{children}</div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/60 px-6 py-4">{footer}</footer>
      </aside>
    </div>,
    document.body,
  )
}

/* ---------- small pieces ---------- */
export function Chip({ children, tone = 'neutral', icon, className }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'tertiary' | 'warning' | 'success'; icon?: ReactNode; className?: string }) {
  const c = {
    neutral: 'bg-surface-container-highest text-on-surface-variant', primary: 'bg-primary-container text-on-primary-container',
    tertiary: 'bg-tertiary-container text-on-tertiary-container', warning: 'bg-warning-container text-on-warning-container', success: 'bg-success-container text-on-success-container',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[0.72rem] font-medium', c, className)}>{icon}{children}</span>
}

export function ToggleChip({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon?: ReactNode; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} onPointerDown={ripple}
      className={cx('sl press inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[0.85rem] font-medium transition-colors duration-300',
        on ? 'border-transparent bg-secondary-container text-on-secondary-container' : 'border-outline text-on-surface-variant')}>
      {on ? <Check size={15} strokeWidth={2.8} className="anim-pop" /> : icon}{children}
    </button>
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[0.82rem] font-medium text-on-surface-variant">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block px-1 text-[0.78rem] text-error">{error}</span>
        : hint ? <span className="mt-1.5 block px-1 text-[0.78rem] text-on-surface-variant/80">{hint}</span> : null}
    </label>
  )
}

export function EmptyState({ icon, title, sub, action }: { icon: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="anim-pop flex flex-col items-center gap-3 py-14 text-center">
      <div className="blob flex h-24 w-24 items-center justify-center bg-secondary-container text-on-secondary-container">{icon}</div>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      {sub && <p className="max-w-sm text-[0.9rem] text-on-surface-variant">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[2rem] font-semibold leading-none tracking-tight">{title}</h1>
        {sub && <p className="mt-2 text-[0.95rem] text-on-surface-variant">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ---------- toast ---------- */
type ToastVariant = 'info' | 'success' | 'error' | 'warning'
interface ToastItem { id: number; variant: ToastVariant; message: string; action?: { label: string; onClick: () => void }; out?: boolean }
const ToastCtx = createContext<{ push: (v: ToastVariant, m: string, a?: ToastItem['action']) => void }>({ push: () => {} })
export const useToast = () => {
  const { push } = useContext(ToastCtx)
  return {
    info: (m: string, a?: ToastItem['action']) => push('info', m, a),
    success: (m: string, a?: ToastItem['action']) => push('success', m, a),
    error: (m: string, a?: ToastItem['action']) => push('error', m, a),
    warning: (m: string, a?: ToastItem['action']) => push('warning', m, a),
  }
}
const TOAST_STYLE: Record<ToastVariant, string> = {
  info: 'bg-primary-container text-on-primary-container', success: 'bg-success-container text-on-success-container',
  error: 'bg-error-container text-on-error-container', warning: 'bg-warning-container text-on-warning-container',
}

export function ToastProvider({ children, icons }: { children: ReactNode; icons: Record<ToastVariant, ReactNode> }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const n = useRef(0)
  const { t } = useSettings()
  const dismiss = useCallback((id: number) => {
    setItems((a) => a.map((x) => (x.id === id ? { ...x, out: true } : x)))
    window.setTimeout(() => setItems((a) => a.filter((x) => x.id !== id)), 180)
  }, [])
  const push = useCallback((variant: ToastVariant, message: string, action?: ToastItem['action']) => {
    const id = ++n.current
    setItems((a) => [...a.slice(-2), { id, variant, message, action }])
    window.setTimeout(() => dismiss(id), variant === 'error' ? 6500 : 4200)
  }, [dismiss])
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[400] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 md:bottom-6 md:right-6">
        {items.map((x) => (
          <div key={x.id} role="status" style={{ animation: `${x.out ? 'toast-out .18s' : 'toast-in .45s'} var(--spring) both` }}
            className={cx('pointer-events-auto relative overflow-hidden rounded-2xl p-3.5 pr-2 shadow-e3', TOAST_STYLE[x.variant])}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">{icons[x.variant]}</span>
              <p className="min-w-0 flex-1 pt-0.5 text-[0.9rem] font-medium leading-snug">{x.message}</p>
              {x.action && <button onClick={() => { x.action!.onClick(); dismiss(x.id) }} className="sl rounded-full px-3 py-1.5 text-[0.82rem] font-semibold">{x.action.label}</button>}
              <IconButton label={t('close')} size="sm" onClick={() => dismiss(x.id)}><X size={16} /></IconButton>
            </div>
            {!x.out && <span className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-current opacity-30" style={{ animation: `shrink ${x.variant === 'error' ? 6.5 : 4.2}s linear forwards` }} />}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
