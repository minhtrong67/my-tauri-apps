import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { Tooltip } from './Tooltip';

type Variant = 'filled' | 'tonal' | 'text' | 'error' | 'outlined';
const V: Record<Variant, string> = {
  filled: 'bg-primary text-on-primary hover:shadow-e1',
  tonal: 'bg-secondary-container text-on-secondary-container',
  text: 'text-primary',
  error: 'bg-error text-on-error hover:shadow-e1',
  outlined: 'border border-outline text-primary',
};

/** Material button. Dialog / sheet actions always combine an icon, a label and a colour. */
export function Btn({ variant = 'filled', icon: Icon, children, className, ...p }: { variant?: Variant; icon?: LucideIcon } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className={cn('ripple inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[box-shadow,transform] duration-200 active:scale-[0.97]', V[variant], className)}>
      {Icon && <Icon size={18} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

export function IconBtn({ label, icon: Icon, active, size = 22, side, className, children, ...p }: { label: string; icon: LucideIcon; active?: boolean; size?: number; side?: 'top' | 'bottom' | 'left' | 'right'; children?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Tooltip label={label} side={side}>
      <button
        {...p}
        aria-label={label}
        className={cn('ripple grid size-12 shrink-0 place-items-center rounded-full transition-colors', active ? 'bg-primary-container text-primary' : 'text-on-surface-variant hover:text-on-surface', className)}
      >
        <Icon size={size} />
        {children}
      </button>
    </Tooltip>
  );
}
