import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function Card({ title, icon: Icon, action, children, className = '' }: {
  title?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-[28px] bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/.06)] ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex min-h-9 items-center gap-3">
          {Icon && <span className="flex size-9 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"><Icon size={19} /></span>}
          <h3 className="flex-1 text-base font-semibold">{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Settings-style row: label + description on the left, control on the right. */
export function Row({ label, desc, children, stack }: { label: string; desc?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={`flex gap-3 py-3 first:pt-0 last:pb-0 ${stack ? 'flex-col' : 'items-center justify-between max-sm:flex-col max-sm:items-stretch'}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="mt-0.5 text-[13px] text-on-surface-variant">{desc}</p>}
      </div>
      <div className={stack ? '' : 'shrink-0'}>{children}</div>
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, unit = '%', onChange, disabled }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="min-w-[3.25rem] rounded-full bg-secondary-container px-2.5 py-0.5 text-center text-xs font-semibold tabular-nums text-on-secondary-container">{value}{unit}</span>
      </div>
      <input
        type="range" className="m3-slider" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={label}
        style={{ ['--pct' as string]: `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** Connected button group with a sliding selection pill. */
export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: {
  value: T; options: { value: T; label: string; icon?: LucideIcon }[]; onChange: (v: T) => void; ariaLabel?: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="relative grid rounded-full bg-sc-highest p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span
        className="absolute inset-y-1 left-1 rounded-full bg-primary shadow-sm transition-transform duration-400 ease-spring"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${i * 100}%)`, transitionDuration: '.4s' }}
      />
      {options.map((o) => {
        const sel = o.value === value, Icon = o.icon;
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={sel} onClick={() => onChange(o.value)}
            className={`relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-300 ${sel ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {Icon && <Icon size={16} />}<span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[2rem] font-bold leading-tight tracking-tight">{title}</h1>
        <p className="mt-1 text-[15px] text-on-surface-variant">{subtitle}</p>
      </div>
      {children}
    </header>
  );
}
