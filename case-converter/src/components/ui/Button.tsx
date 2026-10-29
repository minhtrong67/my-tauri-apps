import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger' | 'success' | 'elevated';

const VARIANTS: Record<Variant, string> = {
  filled: 'bg-primary text-on-primary',
  tonal: 'bg-secondary-container text-on-secondary-container',
  outlined: 'border border-outline text-primary',
  text: 'text-primary',
  danger: 'bg-error text-on-error',
  success: 'bg-success text-on-success',
  elevated: 'bg-surface-container-low text-primary shadow-e1',
};
const SIZES = {
  sm: 'h-9 px-4 text-[0.8125rem]',
  md: 'h-10 px-5 text-sm',
  lg: 'h-14 px-7 text-base',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof SIZES;
  icon?: LucideIcon;
  pressed?: boolean;
  children?: ReactNode;
}

/** Expressive button: pill shaped at rest, morphs to a softer rectangle while pressed or toggled on. */
export function Button({ variant = 'filled', size = 'md', icon: Icon, pressed, className, children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cn(
        'rip state inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium outline-none',
        'transition-[border-radius,background-color,color,box-shadow,transform] duration-500 ease-spring',
        pressed ? 'rounded-md' : 'rounded-full active:rounded-md',
        'active:scale-[.97] disabled:pointer-events-none disabled:opacity-40',
        variant === 'filled' && 'hover:shadow-e1',
        SIZES[size], VARIANTS[variant], className,
      )}
      {...rest}
    >
      {Icon && <Icon className={size === 'lg' ? 'size-6' : 'size-[1.125rem]'} strokeWidth={2.1} aria-hidden />}
      {children}
    </button>
  );
}

type IconTone = 'standard' | 'tonal' | 'filled' | 'danger';
const TONES: Record<IconTone, string> = {
  standard: 'text-on-surface-variant',
  tonal: 'bg-secondary-container text-on-secondary-container',
  filled: 'bg-primary text-on-primary',
  danger: 'text-error',
};

interface IconProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Tooltip and accessible name. */
  label: string;
  kbd?: string;
  tone?: IconTone;
  size?: 'sm' | 'md' | 'lg';
  pressed?: boolean;
}

export function IconButton({ icon: Icon, label, kbd, tone = 'standard', size = 'md', pressed, className, type = 'button', ...rest }: IconProps) {
  const dim = size === 'sm' ? 'size-9' : size === 'lg' ? 'size-12' : 'size-10';
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      data-tip={label}
      data-tip-kbd={kbd}
      className={cn(
        'rip state inline-flex shrink-0 items-center justify-center outline-none transition-[border-radius,background-color,color,transform] duration-500 ease-spring',
        pressed ? 'rounded-md' : 'rounded-full active:rounded-md',
        'active:scale-90 disabled:pointer-events-none disabled:opacity-40',
        dim, TONES[tone], className,
      )}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'size-[1.125rem]' : 'size-5'} strokeWidth={2.1} aria-hidden />
    </button>
  );
}
