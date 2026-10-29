import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface Opt<T extends string> { value: T; label: string; style?: CSSProperties; hint?: string }
interface Props<T extends string> { value: T; onChange: (v: T) => void; options: Opt<T>[]; label?: string; className?: string; disabled?: boolean }

/** Themed dropdown (replaces the native <select>): limited height, scrollable, keyboard friendly. */
export function Select<T extends string>({ value, onChange, options, label, className, disabled }: Props<T>) {
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, up: false, max: 260 })
  const cur = options.find((o) => o.value === value)

  const openList = () => {
    const r = btn.current!.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 12, above = r.top - 12, up = below < 200 && above > below
    setBox({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: r.width, up, max: Math.min(260, Math.max(120, up ? above : below)) })
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const close = () => { setOpen(false); btn.current?.focus() }
  const pick = (v: T) => { onChange(v); close() }

  useLayoutEffect(() => { if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [open, active])
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false) }
    const esc = () => setOpen(false)
    document.addEventListener('pointerdown', away); window.addEventListener('resize', esc); window.addEventListener('blur', esc)
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('resize', esc); window.removeEventListener('blur', esc) }
  }, [open])

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() } return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(options.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[active].value) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button ref={btn} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-label={label} disabled={disabled}
        onClick={() => (open ? close() : openList())} onKeyDown={onKey}
        className={cn('sl flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 text-left text-[0.875rem] text-on-surface transition-[border-color,box-shadow] hover:border-outline', open && 'border-primary ring-2 ring-primary/25', className)}>
        <span className="truncate" style={cur?.style}>{cur?.label ?? ''}</span>
        <ChevronDown size={18} className={cn('text-on-surface-variant transition-transform duration-300 ease-[var(--ease-spring)]', open && 'rotate-180')} />
      </button>
      {open && createPortal(
        <div ref={list} role="listbox" tabIndex={-1} onKeyDown={onKey}
          className="anim-pop fixed z-[300] overflow-y-auto overscroll-contain rounded-2xl border border-outline-variant bg-surface-container-high p-1.5 elev-3"
          style={{ left: box.left, width: box.width, maxHeight: box.max, [box.up ? 'bottom' : 'top']: box.up ? window.innerHeight - box.top : box.top, transformOrigin: box.up ? 'bottom' : 'top' } as CSSProperties}>
          {options.map((o, i) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value} data-i={i} onMouseEnter={() => setActive(i)} onClick={() => pick(o.value)}
              className={cn('flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[0.875rem] transition-colors', i === active && 'bg-on-surface/10', o.value === value ? 'font-semibold text-primary' : 'text-on-surface')}>
              <span className="truncate" style={o.style}>{o.label}</span>
              {o.value === value ? <Check size={16} /> : o.hint && <span className="text-[0.72rem] text-on-surface-variant">{o.hint}</span>}
            </button>
          ))}
        </div>, document.body)}
    </>
  )
}
