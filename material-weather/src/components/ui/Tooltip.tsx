import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom' | 'left' | 'right';

/** Custom tooltip (Material "plain tooltip"): shows on hover after a short delay and on keyboard focus. */
export function Tooltip({ label, side = 'bottom', children }: { label: string; side?: Side; children: ReactNode }) {
  const host = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = () => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 350);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
    setPos(null);
  };
  useLayoutEffect(() => {
    if (!open || !host.current || !tip.current) return;
    const r = host.current.getBoundingClientRect(), t = tip.current.getBoundingClientRect(), g = 8;
    let x = r.left + r.width / 2 - t.width / 2, y = r.bottom + g;
    if (side === 'top') y = r.top - t.height - g;
    if (side === 'left') { x = r.left - t.width - g; y = r.top + r.height / 2 - t.height / 2; }
    if (side === 'right') { x = r.right + g; y = r.top + r.height / 2 - t.height / 2; }
    if (side === 'bottom' && y + t.height > innerHeight - 4) y = r.top - t.height - g;
    setPos({ x: Math.min(Math.max(x, 8), innerWidth - t.width - 8), y: Math.min(Math.max(y, 8), innerHeight - t.height - 8) });
  }, [open, side, label]);

  return (
    <span
      ref={host}
      className="inline-flex"
      onPointerEnter={show}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={(e) => (e.target as HTMLElement).matches(':focus-visible') && show()}
      onBlur={hide}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={tip}
            role="tooltip"
            style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999, opacity: pos ? 1 : 0 }}
            className="pointer-events-none fixed z-[400] max-w-xs rounded-lg bg-inverse-surface px-3 py-1.5 text-xs font-medium text-inverse-on-surface shadow-e2 animate-[tipIn_0.15s_ease_both]"
          >
            {label}
          </div>,
          document.body,
        )}
    </span>
  );
}
