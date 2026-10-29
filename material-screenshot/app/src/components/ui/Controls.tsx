import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Field({ label, value, children, className }: { label: string; value?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <div className="mb-0.5 flex items-center justify-between text-[0.8rem] font-medium text-on-surface-variant">
        <span>{label}</span>{value != null && <output className="rounded-md bg-surface-container-highest px-1.5 py-0.5 text-[0.72rem] font-semibold tabular-nums text-on-surface">{value}</output>}
      </div>
      {children}
    </label>
  )
}

interface SliderProps { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }
export function Slider({ label, value, min, max, step = 1, onChange, format }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <Field label={label} value={format ? format(value) : value}>
      <input type="range" min={min} max={max} step={step} value={value} style={{ '--v': `${pct}%` } as CSSProperties} onChange={(e) => onChange(+e.target.value)} />
    </Field>
  )
}

export function Switch({ checked, onChange, label, hint, icon: Icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; icon?: LucideIcon }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="sl morph flex w-full items-center gap-3 rounded-2xl px-1 py-1.5 text-left">
      {Icon && <Icon size={18} className="text-on-surface-variant" />}
      <span className="min-w-0 flex-1"><span className="block text-[0.875rem] font-medium text-on-surface">{label}</span>{hint && <span className="block text-[0.75rem] text-on-surface-variant">{hint}</span>}</span>
      <span className={cn('relative h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors duration-300', checked ? 'border-primary bg-primary' : 'border-outline bg-surface-container-highest')}>
        <span className={cn('absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300 ease-[var(--ease-spring)]', checked ? 'left-[22px] h-6 w-6 bg-on-primary text-primary' : 'left-[6px] h-4 w-4 bg-outline')}>
          {checked && <Check size={14} strokeWidth={3} />}
        </span>
      </span>
    </button>
  )
}

export interface SegOpt<T extends string | number> { value: T; label?: string; icon?: LucideIcon; tip?: string }
/** Connected button group; the selected item morphs to a rounder shape. */
export function Segmented<T extends string | number>({ value, onChange, options, className, wrap }: { value: T; onChange: (v: T) => void; options: SegOpt<T>[]; className?: string; wrap?: boolean }) {
  return (
    <div role="radiogroup" className={cn('flex gap-0.5', wrap && 'flex-wrap', className)}>
      {options.map((o, i) => {
        const on = o.value === value, first = i === 0, last = i === options.length - 1
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} title={undefined} aria-label={o.tip ?? o.label} onClick={() => onChange(o.value)}
            className={cn('sl flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 border px-3 text-[0.8rem] font-medium transition-[border-radius,background-color,color] duration-300 ease-[var(--ease-spring)]',
              on ? 'rounded-full border-secondary-container bg-secondary-container text-on-secondary-container' : cn('border-outline-variant text-on-surface-variant', wrap ? 'rounded-xl' : cn(first ? 'rounded-l-full rounded-r-md' : last ? 'rounded-l-md rounded-r-full' : 'rounded-md')))}>
            {on && !o.icon && <Check size={15} className="anim-pop" />}
            {o.icon && <o.icon size={16} />}
            {o.label && <span className="truncate">{o.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Chip({ selected, onClick, children, icon: Icon, className }: { selected?: boolean; onClick: () => void; children: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={cn('sl morph sq inline-flex h-9 items-center gap-1.5 border px-3 text-[0.8rem] font-medium', selected ? 'border-secondary-container bg-secondary-container text-on-secondary-container' : 'border-outline-variant text-on-surface-variant', className)}>
      {selected ? <Check size={15} className="anim-pop" /> : Icon && <Icon size={15} />}
      <span>{children}</span>
    </button>
  )
}

const HEX = /^#([0-9a-f]{6})$/i
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [txt, setTxt] = useState(value)
  useEffect(() => setTxt(value), [value])
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-outline-variant" style={{ background: value }}>
        <input type="color" aria-label={label} value={HEX.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full opacity-0" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.75rem] font-medium text-on-surface-variant">{label}</div>
        <input value={txt.toUpperCase()} maxLength={7} spellCheck={false} aria-label={label + ' hex'}
          onChange={(e) => { const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value; setTxt(v); if (HEX.test(v)) onChange(v.toLowerCase()) }}
          onBlur={() => setTxt(value)} className="w-full border-0 bg-transparent p-0 font-mono text-[0.85rem] text-on-surface outline-none" />
      </div>
    </div>
  )
}

export const inputCls = 'h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 text-[0.875rem] text-on-surface outline-none transition-[border-color,box-shadow] placeholder:text-on-surface-variant/60 hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/25'

export function Card({ title, icon: Icon, children, className, tone }: { title?: string; icon?: LucideIcon; children: ReactNode; className?: string; tone?: 'highlight' }) {
  return (
    <section className={cn('rounded-[24px] p-4', tone === 'highlight' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container', className)}>
      {title && <h3 className="mb-3 flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-wider opacity-80">{Icon && <Icon size={16} />}{title}</h3>}
      {children}
    </section>
  )
}
