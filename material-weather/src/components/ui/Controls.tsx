import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

/** Material 3 Expressive switch: bigger thumb with an icon, springy movement. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="group relative shrink-0 rounded-full">
      <span className={cn('block h-8 w-[52px] rounded-full border-2 transition-colors duration-300', checked ? 'border-primary bg-primary' : 'border-outline bg-sc-highest')}>
        <span className={cn('absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full transition-all duration-300 ease-spring group-active:w-7', checked ? 'left-[26px] size-6 bg-on-primary text-primary group-active:left-[22px]' : 'left-[6px] size-5 bg-outline text-sc-highest')}>
          {checked ? <Check size={14} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
        </span>
      </span>
    </button>
  );
}

/**
 * Connected button group (Material 3 Expressive): items are separated by a small gap,
 * the selected item becomes a full pill and the others keep small inner corners.
 */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  const n = options.length;
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 gap-0.5">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'ripple press-morph flex h-10 items-center px-4 text-sm font-semibold active:scale-[0.96]',
              on ? 'rounded-full bg-primary text-on-primary' : 'bg-sc-highest text-on-surface hover:bg-secondary-container',
              !on && (i === 0 ? 'rounded-l-full rounded-r-md' : i === n - 1 ? 'rounded-l-md rounded-r-full' : 'rounded-md'),
            )}
          >
            <Check size={16} strokeWidth={2.6} className={cn('transition-all duration-300', on ? 'mr-1.5 w-4 opacity-100' : 'mr-0 w-0 opacity-0')} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function OptionCard({ on, title, desc, onClick }: { on: boolean; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className={cn('ripple press-morph flex items-center gap-3.5 border px-4 py-3 text-left', on ? 'rounded-[28px] border-transparent bg-secondary-container text-on-secondary-container' : 'rounded-2xl border-outline-variant')}>
      <span className={cn('relative size-5 shrink-0 rounded-full border-2 transition-colors', on ? 'border-primary' : 'border-outline')}>
        <span className={cn('absolute inset-[3px] rounded-full bg-primary transition-transform duration-300 ease-spring', on ? 'scale-100' : 'scale-0')} />
      </span>
      <span className="flex flex-col">
        <b className="font-semibold">{title}</b>
        <small className={cn('text-xs', on ? 'opacity-80' : 'text-on-surface-variant')}>{desc}</small>
      </span>
    </button>
  );
}
