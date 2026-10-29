import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface Option<T extends string> { value: T; label: string; style?: CSSProperties; hint?: string }

/** Custom dropdown (no native <select>) with themed, scrollable, height-limited menu. */
export function Select<T extends string>({ value, options, onChange, ariaLabel, className = '' }: {
  value: T; options: Option<T>[]; onChange: (v: T) => void; ariaLabel?: string; className?: string;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number } | null>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const below = innerHeight - r.bottom - 12, above = r.top - 12, want = Math.min(options.length * 44 + 12, 240);
    const up = below < want && above > below;
    setPos({ left: r.left, width: r.width, max: Math.max(120, Math.min(240, up ? above : below)), ...(up ? { bottom: innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    const close = (e: Event) => { if (!menu.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', down);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('pointerdown', down); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [open]);

  useEffect(() => { menu.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, pos]);

  const key = (e: React.KeyboardEvent) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); onChange(options[active].value); setOpen(false); }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  };

  return (
    <>
      <button
        ref={btn} type="button" role="combobox" aria-expanded={open} aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)} onKeyDown={key}
        className={`ripple flex h-11 min-w-[180px] items-center justify-between gap-3 rounded-2xl border bg-sc-high px-4 text-sm text-on-surface transition-[border-color,border-radius,background-color] duration-200 hover:bg-sc-highest ${open ? 'border-primary' : 'border-outline-variant'} ${className}`}
      >
        <span className="truncate" style={current?.style}>{current?.label}</span>
        <ChevronDown size={18} className={`shrink-0 text-on-surface-variant transition-transform duration-300 ease-spring ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && createPortal(
        <div
          ref={menu} role="listbox"
          style={{ left: pos.left, width: Math.max(pos.width, 200), top: pos.top, bottom: pos.bottom, maxHeight: pos.max }}
          className="anim-menu fixed z-[90] overflow-y-auto rounded-2xl border border-outline-variant bg-sc-high p-1.5 shadow-xl"
        >
          {options.map((o, i) => {
            const sel = o.value === value;
            return (
              <button
                key={o.value} data-i={i} role="option" aria-selected={sel} type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => { onChange(o.value); setOpen(false); btn.current?.focus(); }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${sel ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface'} ${i === active && !sel ? 'bg-on-surface/[.08]' : ''}`}
              >
                <span className="truncate" style={o.style}>{o.label}</span>
                {sel && <Check size={16} className="shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
