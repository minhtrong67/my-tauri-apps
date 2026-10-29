import type { ReactNode } from 'react';
import { ArrowUp, Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SegOption<T extends string> { value: T; label: string; icon?: LucideIcon }

/** Connected button group (single choice). The selected segment morphs into a full pill. */
export function Segmented<T extends string>({ value, onChange, options, label, className }: {
  value: T; onChange: (v: T) => void; options: SegOption<T>[]; label: string; className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-0.5', className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        const Icon = o.icon ?? (on ? Check : null);
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cn(
              'rip state inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 px-3 text-sm font-medium outline-none',
              'transition-[border-radius,background-color,color] duration-500 ease-spring',
              on ? 'rounded-full bg-secondary-container text-on-secondary-container' : cn('bg-surface-container-highest text-on-surface-variant rounded-md', i === 0 && 'rounded-l-full', i === options.length - 1 && 'rounded-r-full'),
            )}
          >
            {Icon && <Icon className="size-[1.125rem] shrink-0" strokeWidth={2.1} aria-hidden />}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full border-2 outline-none transition-colors duration-300',
        checked ? 'border-primary bg-primary' : 'border-outline bg-surface-container-highest',
      )}
    >
      <span
        className={cn(
          'grid place-items-center rounded-full transition-[width,height,margin,background-color] duration-500 ease-bounce',
          checked ? 'ml-[1.375rem] size-6 bg-on-primary text-primary' : 'ml-1 size-4 bg-outline text-transparent',
        )}
      >
        <Check className={cn('size-3.5 transition-opacity', checked ? 'opacity-100' : 'opacity-0')} strokeWidth={3} aria-hidden />
      </span>
    </button>
  );
}

/** Toggle chip: pill when idle, softer rectangle with a check when selected. */
export function Chip({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button" aria-pressed={selected} onClick={onClick}
      className={cn(
        'rip state inline-flex h-10 items-center rounded-full px-4 text-sm font-medium outline-none',
        'transition-[border-radius,background-color,color,border-color,transform] duration-500 ease-spring active:scale-95',
        selected ? 'rounded-md bg-secondary-container text-on-secondary-container' : 'border border-outline-variant text-on-surface-variant',
        className,
      )}
    >
      <span className={cn('grid overflow-hidden transition-[width,margin] duration-500 ease-spring', selected ? 'mr-2 w-4' : 'mr-0 w-0')}>
        <Check className="size-4" strokeWidth={2.6} aria-hidden />
      </span>
      <span>{children}</span>
    </button>
  );
}

export function Card({ title, icon: Icon, actions, children, className, bodyClassName }: {
  title?: string; icon?: LucideIcon; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-xl bg-surface-container-low', className)}>
      {(title || actions) && (
        <header className="flex min-h-14 flex-wrap items-center gap-2 px-4 pt-2 sm:px-5">
          {Icon && <Icon className="size-5 shrink-0 text-primary" strokeWidth={2.1} aria-hidden />}
          <h2 className="min-w-0 flex-1 truncate text-base font-medium">{title}</h2>
          {actions}
        </header>
      )}
      <div className={cn('flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-5', !title && !actions && 'pt-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function ScrollTop({ visible, onClick, label }: { visible: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button" aria-label={label} data-tip={label} onClick={onClick} tabIndex={visible ? 0 : -1}
      className={cn(
        'rip state absolute bottom-4 right-4 z-20 grid size-14 place-items-center rounded-lg bg-primary-container text-on-primary-container shadow-e3 outline-none',
        'transition-[opacity,transform,border-radius] duration-500 ease-bounce hover:rounded-full active:scale-90',
        visible ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-6 scale-50 opacity-0',
      )}
    >
      <ArrowUp className="size-6" strokeWidth={2.4} aria-hidden />
    </button>
  );
}
