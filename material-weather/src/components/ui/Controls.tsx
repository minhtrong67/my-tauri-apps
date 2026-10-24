import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="group relative shrink-0 rounded-full">
      <span className={cn('block h-8 w-[52px] rounded-full border-2 transition-colors duration-200', checked ? 'border-primary bg-primary' : 'border-outline bg-sc-highest')}>
        <span className={cn('absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ease-emphasized group-active:w-7', checked ? 'left-[26px] size-6 bg-on-primary group-active:left-[22px]' : 'left-[7px] size-4 bg-outline')} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 overflow-hidden rounded-full border border-outline">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn('ripple flex h-9 items-center px-4 text-sm font-medium transition-colors duration-200', i > 0 && 'border-l border-outline', on ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface')}
          >
            <Check size={16} className={cn('transition-all duration-200', on ? 'mr-2 w-4 opacity-100' : 'mr-0 w-0 opacity-0')} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function OptionCard({ on, title, desc, onClick }: { on: boolean; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className={cn('ripple flex items-center gap-3.5 rounded-2xl border px-4 py-3 text-left transition-colors duration-200', on ? 'border-transparent bg-secondary-container text-on-secondary-container' : 'border-outline-variant')}>
      <span className={cn('relative size-5 shrink-0 rounded-full border-2 transition-colors', on ? 'border-primary' : 'border-outline')}>
        <span className={cn('absolute inset-[3px] rounded-full bg-primary transition-transform duration-200', on ? 'scale-100' : 'scale-0')} />
      </span>
      <span className="flex flex-col">
        <b className="font-semibold">{title}</b>
        <small className={cn('text-xs', on ? 'opacity-80' : 'text-on-surface-variant')}>{desc}</small>
      </span>
    </button>
  );
}
