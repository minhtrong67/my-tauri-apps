import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom' | 'left' | 'right';

/** Custom tooltip: themed, animated, keyboard accessible and clamped to the viewport. */
export function Tooltip({ label, children, side = 'top', shortcut, delay = 280 }: {
  label: ReactNode; children: ReactNode; side?: Side; shortcut?: string; delay?: number;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; side: Side } | null>(null);

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => host.current && setAnchor(host.current.getBoundingClientRect()), delay);
  };
  const hide = () => { window.clearTimeout(timer.current); setAnchor(null); setPos(null); };

  useLayoutEffect(() => {
    if (!anchor || !tip.current) return;
    const t = tip.current.getBoundingClientRect();
    const gap = 10, m = 8;
    let s = side;
    if (s === 'top' && anchor.top - t.height - gap < m) s = 'bottom';
    else if (s === 'bottom' && anchor.bottom + t.height + gap > innerHeight - m) s = 'top';
    else if (s === 'left' && anchor.left - t.width - gap < m) s = 'right';
    else if (s === 'right' && anchor.right + t.width + gap > innerWidth - m) s = 'left';
    let x = anchor.left + anchor.width / 2 - t.width / 2, y = anchor.top + anchor.height / 2 - t.height / 2;
    if (s === 'top') y = anchor.top - t.height - gap;
    if (s === 'bottom') y = anchor.bottom + gap;
    if (s === 'left') x = anchor.left - t.width - gap;
    if (s === 'right') x = anchor.right + gap;
    x = Math.min(Math.max(m, x), innerWidth - t.width - m);
    y = Math.min(Math.max(m, y), innerHeight - t.height - m);
    setPos({ x, y, side: s });
  }, [anchor, side]);

  if (!label) return <>{children}</>;
  return (
    <span ref={host} className="inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onPointerDown={hide}>
      {children}
      {anchor && createPortal(
        <div
          ref={tip}
          role="tooltip"
          style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, opacity: pos ? undefined : 0, ['--tx' as string]: '0px', ['--ty' as string]: '0px' }}
          className="anim-tip pointer-events-none fixed z-[100] flex max-w-[260px] items-center gap-2 rounded-xl bg-inverse-surface px-3 py-1.5 text-xs font-medium text-inverse-on-surface shadow-lg"
        >
          <span>{label}</span>
          {shortcut && <kbd className="rounded-md bg-inverse-on-surface/15 px-1.5 py-0.5 text-[10px] font-semibold">{shortcut}</kbd>}
        </div>,
        document.body,
      )}
    </span>
  );
}
