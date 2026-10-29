import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Tooltip } from './Tooltip'

export type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'tertiary' | 'danger' | 'dangerTonal' | 'success' | 'warning'
type Size = 'sm' | 'md' | 'lg'

const V: Record<Variant, string> = {
  filled: 'bg-primary text-on-primary elev-1',
  tonal: 'bg-secondary-container text-on-secondary-container',
  outlined: 'border border-outline text-primary',
  text: 'text-primary',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  danger: 'bg-error text-on-error elev-1',
  dangerTonal: 'bg-error-container text-on-error-container',
  success: 'bg-success text-on-success elev-1',
  warning: 'bg-warning-container text-on-warning-container',
}
const S: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3.5 text-[0.8rem]', md: 'h-10 gap-2 px-5 text-[0.875rem]', lg: 'h-14 gap-2.5 px-7 text-[1rem]',
}
const ISZ: Record<Size, number> = { sm: 16, md: 18, lg: 22 }

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; icon?: LucideIcon; trailing?: LucideIcon; selected?: boolean; tip?: ReactNode; shortcut?: string
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'tonal', size = 'md', icon: Icon, trailing: Trail, selected, className, children, tip, shortcut, type = 'button', ...rest }, ref) {
  const b = (
    <button ref={ref} type={type} aria-pressed={selected} className={cn('sl morph inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium', V[variant], S[size], selected && 'sq', className)} {...rest}>
      {Icon && <Icon size={ISZ[size]} strokeWidth={2.1} />}
      {children != null && children !== false && <span>{children}</span>}
      {Trail && <Trail size={ISZ[size]} strokeWidth={2.1} />}
    </button>
  )
  return tip ? <Tooltip label={tip} shortcut={shortcut}>{b}</Tooltip> : b
})

type IVar = 'standard' | 'filled' | 'tonal' | 'outlined' | 'danger'
const IV: Record<IVar, string> = {
  standard: 'text-on-surface-variant', filled: 'bg-primary text-on-primary', tonal: 'bg-secondary-container text-on-secondary-container',
  outlined: 'border border-outline text-on-surface-variant', danger: 'text-error',
}
interface IBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon; label: string; shortcut?: string; variant?: IVar; size?: 'sm' | 'md' | 'lg'; selected?: boolean; side?: 'top' | 'bottom' | 'left' | 'right'; iconSize?: number
}
export const IconButton = forwardRef<HTMLButtonElement, IBtnProps>(function IconButton(
  { icon: Icon, label, shortcut, variant = 'standard', size = 'md', selected, side, iconSize, className, type = 'button', ...rest }, ref) {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
  return (
    <Tooltip label={label} shortcut={shortcut} side={side}>
      <button ref={ref} type={type} aria-label={label} aria-pressed={selected} className={cn('sl morph inline-flex shrink-0 items-center justify-center', IV[selected ? 'filled' : variant], dim, selected && 'sq', className)} {...rest}>
        <Icon size={iconSize ?? (size === 'sm' ? 17 : size === 'lg' ? 24 : 20)} strokeWidth={2.1} />
      </button>
    </Tooltip>
  )
})
