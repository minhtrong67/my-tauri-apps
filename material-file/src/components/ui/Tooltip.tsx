import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

/** Custom tooltip: appears after a short delay, flips to stay on screen, shows an optional shortcut. */
export function Tooltip({ label, kbd, children, side = 'bottom' }: { label?: string; kbd?: string; children: ReactElement<Record<string, unknown>>; side?: 'bottom' | 'top' | 'right' }) {
  const [pos, setPos] = useState<{ x: number; y: number; place: string } | null>(null);
  const timer = useRef(0);
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!label) return children;
  const show = (el: HTMLElement) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (side === 'right') setPos({ x: r.right + 10, y: r.top + r.height / 2, place: 'right' });
      else if (side === 'top' || r.bottom > innerHeight - 60) setPos({ x: r.left + r.width / 2, y: r.top - 8, place: 'top' });
      else setPos({ x: r.left + r.width / 2, y: r.bottom + 8, place: 'bottom' });
    }, 450);
  };
  const hide = () => { window.clearTimeout(timer.current); setPos(null); };
  const child = cloneElement(children, {
    ref: (n: HTMLElement | null) => { ref.current = n; },
    'aria-label': label,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { (children.props.onMouseEnter as ((e: unknown) => void) | undefined)?.(e); show(e.currentTarget); },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { (children.props.onMouseLeave as ((e: unknown) => void) | undefined)?.(e); hide(); },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => { (children.props.onPointerDown as ((e: unknown) => void) | undefined)?.(e); hide(); },
    onFocus: (e: React.FocusEvent<HTMLElement>) => { (children.props.onFocus as ((e: unknown) => void) | undefined)?.(e); if (e.currentTarget.matches(':focus-visible')) show(e.currentTarget); },
    onBlur: (e: React.FocusEvent<HTMLElement>) => { (children.props.onBlur as ((e: unknown) => void) | undefined)?.(e); hide(); }
  });
  return (
    <>
      {child}
      {pos && createPortal(
        <div role="tooltip" className="pointer-events-none fixed z-[300] flex items-center gap-2 rounded-xl bg-inverse-surface px-3 py-1.5 text-xs font-medium text-inverse-on-surface shadow-[var(--shadow-2)] animate-[menu-in_.25s_var(--spring)]"
          style={{ left: pos.x, top: pos.y, transform: pos.place === 'right' ? 'translateY(-50%)' : pos.place === 'top' ? 'translate(-50%,-100%)' : 'translateX(-50%)', maxWidth: 320 }}>
          <span className="whitespace-pre-line">{label}</span>
          {kbd && <span className="rounded-md bg-inverse-on-surface/15 px-1.5 py-0.5 text-[0.6875rem] tracking-wide">{kbd}</span>}
        </div>, document.body)}
    </>
  );
}
