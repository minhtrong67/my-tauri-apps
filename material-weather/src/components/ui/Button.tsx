import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { Tooltip } from './Tooltip';

type Variant = 'filled' | 'tonal' | 'text' | 'error' | 'outlined';
const V: Record<Variant, string> = {
  filled: 'bg-primary text-on-primary hover:shadow-e1',
  tonal: 'bg-secondary-container text-on-secondary-container hover:shadow-e1',
  text: 'text-primary',
  error: 'bg-error text-on-error hover:shadow-e1',
  outlined: 'border border-outline text-primary',
};

/**
 * Material 3 Expressive button: pill shape that morphs to a rounded square while pressed (spring motion).
 * Dialog / sheet actions always combine an icon, a label and a colour.
 */
export function Btn({ variant = 'filled', icon: Icon, children, className, ...p }: { variant?: Variant; icon?: LucideIcon } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className={cn('ripple press-morph inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold active:scale-[0.97] active:rounded-xl', V[variant], className)}>
      {Icon && <Icon size={18} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

/** Icon button: round, becomes a rounded square (shape morph) when toggled on or pressed. */
export function IconBtn({ label, icon: Icon, active, size = 22, side, className, children, ...p }: { label: string; icon: LucideIcon; active?: boolean; size?: number; side?: 'top' | 'bottom' | 'left' | 'right'; children?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Tooltip label={label} side={side}>
      <button
        {...p}
        aria-label={label}
        className={cn('ripple press-morph grid size-12 shrink-0 place-items-center active:rounded-xl active:scale-95', active ? 'rounded-2xl bg-primary text-on-primary' : 'rounded-full text-on-surface-variant hover:text-on-surface', className)}
      >
        <Icon size={size} />
        {children}
      </button>
    </Tooltip>
  );
}

/** Extended floating action button (expands its label on hover / focus). */
export function Fab({ label, icon: Icon, className, ...p }: { label: string; icon: LucideIcon } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} aria-label={label} className={cn('ripple press-morph group flex h-14 items-center rounded-[20px] bg-primary-container px-4 text-on-primary-container shadow-e3 hover:rounded-[28px] hover:shadow-[0_6px_16px_3px_rgb(0_0_0/0.2)] active:scale-95', className)}>
      <Icon size={24} />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-[max-width,opacity,margin] duration-300 ease-spring group-hover:ml-3 group-hover:max-w-40 group-hover:opacity-100 group-focus-visible:ml-3 group-focus-visible:max-w-40 group-focus-visible:opacity-100">{label}</span>
    </button>
  );
}
