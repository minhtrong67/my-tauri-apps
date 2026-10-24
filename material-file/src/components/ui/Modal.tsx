import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { IconButton } from './Buttons';
import { useT } from '../../lib/i18n';

/** Material dialog: scrim + animated surface; closes with Esc / scrim click; bottom sheet on narrow windows. */
export function Modal({ open, onClose, title, icon: Icon, children, footer, width = 560, tall, labelledBy, bare }: {
  open: boolean; onClose: () => void; title?: string; icon?: LucideIcon; children: ReactNode; footer?: ReactNode; width?: number; tall?: boolean; labelledBy?: string; bare?: boolean;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);
  useEffect(() => {
    if (open) { prevFocus.current = document.activeElement; setMounted(true); setLeaving(false); return; }
    if (mounted) { setLeaving(true); const id = window.setTimeout(() => { setMounted(false); setLeaving(false); (prevFocus.current as HTMLElement | null)?.focus?.({ preventScroll: true }); }, 200); return () => window.clearTimeout(id); }
  }, [open, mounted]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target as HTMLElement).closest?.('[data-select-pop]')) { e.preventDefault(); e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]),input,[tabindex="0"]')].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', h, true);
    const id = window.setTimeout(() => { if (!ref.current?.contains(document.activeElement)) (ref.current?.querySelector<HTMLElement>('[data-autofocus]') || ref.current)?.focus({ preventScroll: true }); }, 30);
    return () => { document.removeEventListener('keydown', h, true); window.clearTimeout(id); };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[100] grid place-items-center p-4 max-sm:items-end max-sm:p-0 ${leaving ? 'animate-[fade-out_.2s_forwards]' : 'anim-fade'}`} style={{ background: 'var(--scrim)', backdropFilter: 'blur(2px)' }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} aria-labelledby={labelledBy} tabIndex={-1}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-[1.75rem] bg-surface-container shadow-[var(--shadow-3)] outline-none max-sm:max-h-[92%] max-sm:rounded-b-none ${leaving ? 'anim-pop-out' : 'anim-pop max-sm:animate-[sheet-in_.45s_var(--spring-soft)]'} ${tall ? 'h-[min(46rem,92vh)]' : ''}`}
        style={{ maxWidth: width }}>
        {!bare && title && (
          <header className="flex flex-none items-center gap-3 px-6 pt-5 pb-3">
            {Icon && <span className="grid size-10 place-items-center rounded-2xl bg-primary-container text-on-primary-container"><Icon className="size-5" /></span>}
            <h2 className="flex-1 truncate text-xl font-semibold">{title}</h2>
            <IconButton icon={X} label={t('common.close')} kbd="Esc" onClick={onClose} />
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="flex flex-none flex-wrap items-center justify-end gap-2 px-6 pt-3 pb-5">{footer}</footer>}
      </div>
    </div>, document.body);
}
