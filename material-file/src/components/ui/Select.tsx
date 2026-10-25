import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface Option<T extends string> { value: T; label: string; hint?: string; style?: React.CSSProperties }
/** Custom dropdown (no native <select>), themed for light/dark, limited height with scrolling. */
export function Select<T extends string>({ value, options, onChange, width = 220, ariaLabel }: { value: T; options: Option<T>[]; onChange: (v: T) => void; width?: number; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [hi, setHi] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const cur = options.find((o) => o.value === value) || options[0];
  const toggle = () => { if (!open && btn.current) { setRect(btn.current.getBoundingClientRect()); setHi(Math.max(0, options.findIndex((o) => o.value === value))); } setOpen(!open); };
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!(e.target as HTMLElement).closest('[data-select-pop]') && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); onChange(options[hi].value); setOpen(false); btn.current?.focus(); }
    };
    document.addEventListener('pointerdown', close, true); document.addEventListener('keydown', esc, true); window.addEventListener('blur', () => setOpen(false));
    return () => { document.removeEventListener('pointerdown', close, true); document.removeEventListener('keydown', esc, true); };
  }, [open, hi, options, onChange]);
  useEffect(() => { if (open) list.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' }); }, [hi, open]);
  const up = rect ? rect.bottom + 8 + Math.min(280, options.length * 40 + 12) > innerHeight && rect.top > 280 : false;
  return (
    <>
      <button ref={btn} type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={toggle}
        className="ripple flex h-11 items-center justify-between gap-3 rounded-2xl bg-surface-high px-4 text-left font-medium ring-1 ring-outline-variant transition-[box-shadow,border-radius] duration-300 hover:rounded-xl hover:ring-outline aria-expanded:ring-2 aria-expanded:ring-primary"
        style={{ width, ...cur?.style }}>
        <span className="truncate">{cur?.label}</span>
        <ChevronDown className={`size-5 text-on-surface-variant transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && rect && createPortal(
        <div ref={list} data-select-pop role="listbox" className="anim-menu fixed z-[260] overflow-y-auto rounded-2xl bg-surface-high p-1.5 shadow-[var(--shadow-3)] ring-1 ring-outline-variant/60"
          style={{ left: Math.max(8, Math.min(rect.left, innerWidth - Math.min(Math.max(rect.width, width), innerWidth - 16) - 8)), width: Math.min(Math.max(rect.width, width), innerWidth - 16), maxHeight: 280, ...(up ? { bottom: innerHeight - rect.top + 8, transformOrigin: 'bottom left' } : { top: rect.bottom + 8 }) }}>
          {options.map((o, i) => (
            <button key={o.value} data-i={i} type="button" role="option" aria-selected={o.value === value}
              onMouseEnter={() => setHi(i)} onClick={() => { onChange(o.value); setOpen(false); btn.current?.focus(); }}
              className={`flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left transition-colors ${i === hi ? 'bg-on-surface/10' : ''} ${o.value === value ? 'font-semibold text-primary' : ''}`}>
              <span className="min-w-0 flex-1 truncate" style={o.style}>{o.label}</span>
              {o.hint && <span className="text-xs text-on-surface-variant">{o.hint}</span>}
              {o.value === value && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </div>, document.body)}
    </>
  );
}
