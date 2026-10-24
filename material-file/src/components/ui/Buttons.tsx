import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip } from './Tooltip';

type Tone = 'filled' | 'tonal' | 'text' | 'danger' | 'success' | 'outline';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { tone?: Tone; icon?: LucideIcon; small?: boolean; label: string }
/** Action button: always shows icon + label, coloured by intent. */
export const Button = forwardRef<HTMLButtonElement, BtnProps>(({ tone = 'tonal', icon: Icon, small, label, className = '', ...rest }, ref) => (
  <button ref={ref} type="button" className={`btn ripple btn-${tone} ${small ? 'btn-sm' : ''} ${className}`} {...rest}>
    {Icon && <Icon strokeWidth={2.2} />}<span>{label}</span>
  </button>
));
Button.displayName = 'Button';

interface IBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { icon: LucideIcon; label: string; kbd?: string; on?: boolean; small?: boolean; filled?: boolean; side?: 'bottom' | 'top' | 'right' }
/** Icon-only button; the label is shown in the custom tooltip (with the keyboard shortcut). */
export const IconButton = forwardRef<HTMLButtonElement, IBtnProps>(({ icon: Icon, label, kbd, on, small, filled, side, className = '', ...rest }, ref) => (
  <Tooltip label={label} kbd={kbd} side={side}>
    <button ref={ref} type="button" className={`ibtn ripple ${small ? 'sm' : ''} ${on ? 'on' : ''} ${filled ? 'filled' : ''} ${className}`} {...rest}><Icon strokeWidth={2} /></button>
  </Tooltip>
));
IconButton.displayName = 'IconButton';

export const CmdButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; kbd?: string; hideLabel?: boolean; danger?: boolean; extra?: ReactNode }>(
  ({ icon: Icon, label, kbd, hideLabel, danger, extra, className = '', ...rest }, ref) => (
    <Tooltip label={label} kbd={kbd}>
      <button ref={ref} type="button" className={`cmd ripple ${danger ? 'danger' : ''} ${className}`} {...rest}>
        <Icon strokeWidth={2} />{!hideLabel && <span className="max-[1040px]:hidden">{label}</span>}{extra}
      </button>
    </Tooltip>
  ));
CmdButton.displayName = 'CmdButton';
