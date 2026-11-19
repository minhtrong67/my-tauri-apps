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
    <div role="radiogroup" aria-label={ariaLabel} className="relative grid rounded-md border border-outline-variant bg-surface-container-low p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span aria-hidden className="absolute top-0.5 bottom-0.5 rounded-[3px] bg-primary transition-[left] duration-150 ease-fast" style={{ width: `calc((100% - 0.25rem) / ${options.length})`, left: `calc(0.125rem + ${idx} * (100% - 0.25rem) / ${options.length})` }} />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={`relative z-10 flex h-8 items-center justify-center gap-1.5 rounded px-3 whitespace-nowrap transition-colors duration-150 ${o.value === value ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
          {o.icon && <o.icon className="size-4" strokeWidth={1.75} />}{o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingRow({ icon: Icon, title, desc, children, stack }: { icon?: LucideIcon; title: string; desc?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={`flex gap-4 rounded-md border border-outline-variant bg-surface px-4 py-3 ${stack ? 'flex-col' : 'items-center justify-between'}`}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <Icon className="size-5 flex-none text-on-surface" strokeWidth={1.6} />}
        <div className="min-w-0"><div>{title}</div>{desc && <div className="text-xs leading-4 text-on-surface-variant">{desc}</div>}</div>
      </div>
      <div className={stack ? '' : 'flex-none'}>{children}</div>
    </div>
  );
}
export const SectionCard = ({ children, title }: { children: ReactNode; title?: string }) => (
  <section className="mb-5">
    {title && <h3 className="mb-2 px-1 text-sm font-semibold">{title}</h3>}
    <div className="flex flex-col gap-1">{children}</div>
  </section>
);
