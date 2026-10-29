import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip } from './Tooltip';

export type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'error' | 'warning' | 'success';

const V: Record<Variant, string> = {
  filled: 'bg-primary text-on-primary shadow-sm hover:shadow-md',
  tonal: 'bg-secondary-container text-on-secondary-container',
  outlined: 'border border-outline text-primary',
  text: 'text-primary',
  error: 'bg-error text-on-error shadow-sm hover:shadow-md',
  warning: 'bg-warning text-on-warning shadow-sm hover:shadow-md',
  success: 'bg-success text-on-success shadow-sm hover:shadow-md',
};
const SZ = { sm: 'h-8 px-3.5 text-xs gap-1.5', md: 'h-10 px-5 text-sm gap-2', lg: 'h-12 px-6 text-[15px] gap-2.5' };
const ISZ = { sm: 16, md: 18, lg: 20 };

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: keyof typeof SZ; icon?: LucideIcon; label?: ReactNode; full?: boolean; loading?: boolean;
}

/** Label + icon button. Shape morphs from pill to rounded-square on press (M3 Expressive). */
export function Btn({ variant = 'filled', size = 'md', icon: Icon, label, full, loading, className = '', children, disabled, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ripple inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium transition-[border-radius,box-shadow,transform,opacity] duration-300 ease-spring before:absolute before:inset-0 before:-z-10 before:bg-current before:opacity-0 before:transition-opacity hover:before:opacity-[.08] active:rounded-2xl active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 ${SZ[size]} ${V[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading
        ? <span className="spinner shrink-0 bg-current" style={{ width: ISZ[size], height: ISZ[size] }} />
        : Icon && <Icon size={ISZ[size]} strokeWidth={2.2} className="shrink-0" />}
      {label ?? children}
    </button>
  );
}

interface IconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon; tip: string; shortcut?: string; tone?: 'standard' | 'tonal' | 'filled' | 'error'; size?: number; side?: 'top' | 'bottom' | 'left' | 'right';
}

export function IconBtn({ icon: Icon, tip, shortcut, tone = 'standard', size = 40, side, className = '', ...rest }: IconBtnProps) {
  const tones = {
    standard: 'text-on-surface-variant', tonal: 'bg-secondary-container text-on-secondary-container',
    filled: 'bg-primary text-on-primary shadow-sm', error: 'bg-error-container text-on-error-container',
  };
  return (
    <Tooltip label={tip} shortcut={shortcut} side={side}>
      <button
        type="button"
        aria-label={tip}
        {...rest}
        style={{ width: size, height: size }}
        className={`ripple inline-flex shrink-0 items-center justify-center rounded-full transition-[border-radius,transform,opacity] duration-300 ease-spring before:absolute before:inset-0 before:-z-10 before:bg-current before:opacity-0 before:transition-opacity hover:before:opacity-[.1] active:scale-90 active:rounded-xl disabled:pointer-events-none disabled:opacity-40 ${tones[tone]} ${className}`}
      >
        <Icon size={Math.round(size * 0.5)} strokeWidth={2.1} />
      </button>
    </Tooltip>
  );
}
