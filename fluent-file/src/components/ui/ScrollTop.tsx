import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ChevronUp } from '../../lib/icons';
import { useT } from '../../lib/i18n';

/** Floating "back to top" button that appears once the target has been scrolled a good way down. */
export function ScrollTop({ target, className = 'bottom-4 right-5' }: { target: RefObject<HTMLElement | null>; className?: string }) {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = target.current; if (!el) return;
    let raf = 0;
    const on = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; setShow(el.scrollTop > 360); }); };
    on(); el.addEventListener('scroll', on, { passive: true });
    return () => { el.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf); };
  }, [target]);
  return (
    <button type="button" aria-label={t('scroll.top')} title={t('scroll.top')} tabIndex={show ? 0 : -1}
      onClick={() => target.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`absolute z-30 grid size-9 place-items-center rounded-full border border-outline-variant bg-surface-container-high text-on-surface shadow-[var(--shadow-2)] transition-[opacity,transform,background-color] duration-200 ease-fast hover:bg-surface-container-highest ${className} ${show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}>
      <ChevronUp className="size-5" strokeWidth={2} />
    </button>
  );
}

/** A scrolling area with its own back-to-top button. */
export function ScrollArea({ className = '', root = 'h-full', btn, children }: { className?: string; root?: string; btn?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className={`relative min-h-0 ${root}`}>
      <div ref={ref} className={`h-full overflow-auto ${className}`}>{children}</div>
      <ScrollTop target={ref} className={btn} />
    </div>
  );
}
