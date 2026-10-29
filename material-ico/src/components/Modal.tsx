import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { Check, X } from 'lucide-react';
import { Btn, type Variant } from './Btn';
import { useSettings } from '../lib/store';

type Tone = 'primary' | 'error' | 'warning' | 'success';
const TONE: Record<Tone, string> = {
  primary: 'bg-primary-container text-on-primary-container', error: 'bg-error-container text-on-error-container',
  warning: 'bg-warning-container text-on-warning-container', success: 'bg-success-container text-on-success-container',
};

/** Shared shell for dialogs (centered) and sheets (side on desktop, bottom on narrow screens). */
export function Modal({ open, onClose, title, icon: Icon, tone = 'primary', variant = 'dialog', children, actions }: {
  open: boolean; onClose: () => void; title: string; icon?: LucideIcon; tone?: Tone; variant?: 'dialog' | 'sheet'; children?: ReactNode; actions?: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return; }
    if (!mounted) return;
    setClosing(true);
    const id = window.setTimeout(() => { setMounted(false); setClosing(false); }, 230);
    return () => window.clearTimeout(id);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);

  if (!mounted) return null;
  const sheet = variant === 'sheet';
  return createPortal(
    <div className={`fixed inset-0 z-[60] flex ${sheet ? 'items-stretch justify-end max-sm:items-end' : 'items-center justify-center p-4'}`}>
      <div onClick={onClose} className={`absolute inset-0 bg-scrim/40 backdrop-blur-[3px] ${closing ? 'anim-fade-out' : 'anim-fade'}`} />
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`relative flex flex-col bg-sc-high text-on-surface shadow-2xl ${
          sheet
            ? `h-full w-[min(100vw,430px)] rounded-l-[32px] max-sm:h-auto max-sm:max-h-[92%] max-sm:w-full max-sm:rounded-l-none max-sm:rounded-t-[32px] ${closing ? 'anim-sheet-out' : 'anim-sheet'}`
            : `max-h-full w-[min(100%,440px)] rounded-[32px] ${closing ? 'anim-dialog-out' : 'anim-dialog'}`
        }`}
      >
        <div className="flex items-center gap-3 px-6 pb-2 pt-6">
          {Icon && <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${TONE[tone]}`}><Icon size={22} /></span>}
          <h2 className="flex-1 text-xl font-semibold leading-tight">{title}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3 text-sm text-on-surface-variant">{children}</div>
        {actions && <div className="flex flex-wrap justify-end gap-2.5 px-6 pb-6 pt-3">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, confirmIcon, variant = 'error', icon, busy }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: ReactNode; confirmLabel: string;
  confirmIcon?: LucideIcon; variant?: Extract<Variant, 'error' | 'warning' | 'filled'>; icon?: LucideIcon; busy?: boolean;
}) {
  const { t } = useSettings();
  const tone: Tone = variant === 'filled' ? 'primary' : variant;
  return (
    <Modal
      open={open} onClose={onClose} title={title} icon={icon} tone={tone}
      actions={<>
        <Btn variant="tonal" icon={X} label={t('common.cancel')} onClick={onClose} />
        <Btn variant={variant} icon={confirmIcon ?? Check} label={confirmLabel} disabled={busy} onClick={onConfirm} />
      </>}
    >
      <p className="leading-relaxed">{message}</p>
    </Modal>
  );
}
