import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { tr } from '../lib/i18n';
import { IconButton } from './ui';

/** A horizontally scrolling row with previous / next buttons (shown while there is more to scroll to; they appear on hover). */
export function ScrollRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [can, setCan] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setCan((c) => (c.left === left && c.right === right ? c : { left, right }));
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { el.removeEventListener('scroll', measure); ro.disconnect(); };
  }, [measure, children]);
  const go = (dir: 1 | -1) => box.current?.scrollBy({ left: dir * Math.max(240, (box.current?.clientWidth ?? 600) * 0.85), behavior: 'smooth' });
  const btn = 'absolute top-1/2 -translate-y-1/2 z-10 transition-opacity duration-normal';
  return (
    <div className="relative group/row">
      <div ref={box} className={`flex gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>{children}</div>
      <div className={`${btn} left-2 ${can.left ? 'opacity-0 group-hover/row:opacity-100 focus-within:opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <IconButton icon="chevron_left" variant="tonal" title={tr('scrollPrev')} onClick={() => go(-1)} className="!rounded-full shadow-lg !bg-surface-container-lowest" />
      </div>
      <div className={`${btn} right-2 ${can.right ? 'opacity-0 group-hover/row:opacity-100 focus-within:opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <IconButton icon="chevron_right" variant="tonal" title={tr('scrollNext')} onClick={() => go(1)} className="!rounded-full shadow-lg !bg-surface-container-lowest" />
      </div>
    </div>
  );
}
