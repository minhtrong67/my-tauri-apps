import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './Button';
import { useSettings } from '@/lib/settings';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: LucideIcon;
  /** "dialog" is centered (a bottom sheet on phones); "side" slides in from the right. */
  variant?: 'dialog' | 'side';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  /** Action buttons. Every action should have a label, an icon and a color. */
  footer?: ReactNode;
  bodyClassName?: string;
  headerExtra?: ReactNode;
  /** No padding around the body (for custom layouts). */
  flush?: boolean;
  /** No header: the children fill the whole panel (command palette). */
  bare?: boolean;
  /** Anchor a dialog near the top of the window. */
  top?: boolean;
}

const WIDTH = { sm: 'w-[min(94vw,26rem)]', md: 'w-[min(94vw,34rem)]', lg: 'w-[min(94vw,54rem)]' };

export function Modal({ open, onClose, title, icon: Icon, variant = 'dialog', size = 'md', children, footer, bodyClassName, headerExtra, flush, bare, top }: Props) {
  const { t } = useSettings();
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const id = setTimeout(() => { setMounted(false); setClosing(false); }, 250);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (mounted && d && !d.open) {
      d.showModal();
      // Focus the panel (not the first button) so no focus ring flashes on open; Tab still reaches every control.
      d.querySelector<HTMLElement>('.panel')?.focus({ preventScroll: true });
    }
  }, [mounted]);

  if (!mounted) return null;
  const side = variant === 'side';
  return (
    <dialog
      ref={ref}
      aria-label={title}
      data-closing={closing || undefined}
      className={cn('m3', side ? 'side' : 'sheetable', top && 'top')}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div
        tabIndex={-1}
        className={cn(
          'panel flex flex-col overflow-hidden bg-surface-container-high text-on-surface shadow-e3',
          side ? 'h-dvh w-[min(100vw,28rem)] rounded-l-xl' : cn('max-h-[min(92dvh,50rem)] rounded-xl max-sm:w-full max-sm:rounded-b-none', WIDTH[size]),
        )}
      >
        {!bare && <header className="flex shrink-0 items-center gap-3 px-6 pb-3 pt-5">
          {Icon && (
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container transition-[border-radius] duration-500 ease-spring hover:rounded-md">
              <Icon className="size-6" strokeWidth={2} aria-hidden />
            </span>
          )}
          <h2 className="min-w-0 flex-1 truncate text-[1.375rem] font-medium leading-tight">{title}</h2>
          {headerExtra}
          <IconButton icon={X} label={t('close')} onClick={onClose} />
        </header>}
        <div className={cn('min-h-0 flex-1 overflow-y-auto', !flush && !bare && 'px-6 pb-4', bodyClassName)}>{children}</div>
        {footer && <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-outline-variant/50 px-6 py-4 max-sm:flex-col-reverse max-sm:[&>button]:w-full">{footer}</footer>}
      </div>
    </dialog>
  );
}
