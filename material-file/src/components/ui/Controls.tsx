import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <input type="checkbox" role="switch" aria-label={label} className="sw" checked={checked} onChange={(e) => onChange(e.target.checked)} />;
}

export interface SegOption<T extends string> { value: T; label: string; icon?: LucideIcon }
/** Segmented button group (single choice) with a sliding highlight. */
export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; ariaLabel?: string }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="relative grid rounded-full bg-surface-highest p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span aria-hidden className="absolute top-1 bottom-1 rounded-full bg-primary shadow-[var(--shadow-1)] transition-[left] duration-500 ease-spring" style={{ width: `calc((100% - 0.5rem) / ${options.length})`, left: `calc(0.25rem + ${idx} * (100% - 0.5rem) / ${options.length})` }} />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={`relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-full px-3 font-semibold whitespace-nowrap transition-colors duration-300 ${o.value === value ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
          {o.icon && <o.icon className="size-[1.0625rem]" strokeWidth={2.2} />}{o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingRow({ icon: Icon, title, desc, children, stack }: { icon?: LucideIcon; title: string; desc?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={`flex gap-4 rounded-2xl px-4 py-3 ${stack ? 'flex-col' : 'items-center justify-between'}`}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <span className="grid size-10 flex-none place-items-center rounded-xl bg-secondary-container text-on-secondary-container"><Icon className="size-5" /></span>}
        <div className="min-w-0"><div className="font-semibold">{title}</div>{desc && <div className="text-xs leading-4 text-on-surface-variant">{desc}</div>}</div>
      </div>
      <div className={stack ? '' : 'flex-none'}>{children}</div>
    </div>
  );
}
export const SectionCard = ({ children, title }: { children: ReactNode; title?: string }) => (
  <section className="mb-4">
    {title && <h3 className="mb-1.5 px-4 text-xs font-bold uppercase tracking-wider text-primary">{title}</h3>}
    <div className="card divide-y divide-outline-variant/50 overflow-hidden py-1">{children}</div>
  </section>
);
