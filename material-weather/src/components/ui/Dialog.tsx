import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { IconBtn } from './Button';
import { usePresence, useModal } from './usePresence';
import { useT } from '../../lib/i18n';

interface Base { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string }

export function Dialog({ open, onClose, label, children, className }: Base) {
  const { mounted, closing } = usePresence(open, 200);
  const ref = useRef<HTMLDivElement>(null);
  useModal(open, onClose, ref);
  if (!mounted) return null;
  return createPortal(
    <div
      className={cn('fixed inset-0 z-[100] grid place-items-center bg-scrim/35 p-4', closing ? 'animate-[fadeOut_0.2s_ease_both]' : 'animate-fade')}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={cn('relative flex max-h-[min(780px,92vh)] w-full max-w-[600px] flex-col overflow-hidden rounded-[36px] bg-sc-high shadow-e3', closing ? 'animate-[popOut_0.2s_ease-in_both]' : 'animate-pop', className)}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({ icon: Icon, title, onClose }: { icon: LucideIcon; title: string; onClose: () => void }) {
  const t = useT();
  return (
    <header className="flex items-center gap-3 py-4 pl-6 pr-3">
      <span className="shape-cookie grid size-11 shrink-0 place-items-center bg-primary-container text-on-primary-container"><Icon size={22} /></span>
      <h2 className="flex-1 text-2xl font-semibold tracking-tight">{title}</h2>
      <IconBtn label={t('action.close')} icon={X} onClick={onClose} />
    </header>
  );
}
export const DialogActions = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-4">{children}</div>;

/** Material side sheet. */
export function Sheet({ open, onClose, label, icon, title, children }: { open: boolean; onClose: () => void; label: string; icon: LucideIcon; title: string; children: ReactNode }) {
  const { mounted, closing } = usePresence(open, 280);
  const ref = useRef<HTMLDivElement>(null);
  useModal(open, onClose, ref);
  if (!mounted) return null;
  return createPortal(
    <div className={cn('fixed inset-0 z-[100] bg-scrim/35', closing ? 'animate-[fadeOut_0.28s_ease_both]' : 'animate-fade')} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn('absolute inset-y-0 right-0 flex w-[min(28rem,100vw)] flex-col overflow-hidden rounded-l-[36px] bg-sc-low shadow-e3', closing ? 'animate-[sheetOut_0.28s_cubic-bezier(0.3,0,0.8,0.15)_both]' : 'animate-[sheetIn_0.4s_var(--ease-emphasized)_both]')}
      >
        <DialogHeader icon={icon} title={title} onClose={onClose} />
        <div className="dlg-scroll flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
