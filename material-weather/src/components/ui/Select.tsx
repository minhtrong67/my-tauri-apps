import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';

export interface Opt<T extends string> { value: T; label: string; style?: CSSProperties }

/** Custom dropdown (no native <select>): theme-aware, scrollable (max height) and keyboard accessible. */
export function Select<T extends string>({ value, options, onChange, label, className }: { value: T; options: Opt<T>[]; onChange: (v: T) => void; label: string; className?: string }) {
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number }>({ left: 0, width: 0 });
  const cur = options.find((o) => o.value === value) ?? options[0];

  const openList = () => { setHi(Math.max(options.findIndex((o) => o.value === value), 0)); setOpen(true); };
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const below = innerHeight - r.bottom, need = Math.min(options.length * 44 + 12, 232);
    setBox(below >= need || below > r.top ? { left: r.left, width: r.width, top: r.bottom + 6 } : { left: r.left, width: r.width, bottom: innerHeight - r.top + 6 });
  }, [open, options.length]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const away = () => setOpen(false);
    document.addEventListener('pointerdown', close);
    window.addEventListener('resize', away);
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('resize', away); };
  }, [open]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' }); }, [hi, open]);

  const pick = (v: T) => { onChange(v); setOpen(false); btn.current?.focus(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); return; }
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[hi].value); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <>
      <button ref={btn} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKey}
        className={cn('ripple flex h-10 min-w-44 items-center justify-between gap-3 rounded-xl border border-outline bg-sc-highest px-4 text-sm font-medium transition-colors', open && 'border-primary ring-1 ring-primary', className)}>
        <span className="truncate" style={cur.style}>{cur.label}</span>
        <ChevronDown size={18} className={cn('shrink-0 text-on-surface-variant transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && createPortal(
        <div ref={list} role="listbox" style={{ left: box.left, width: Math.max(box.width, 208), top: box.top, bottom: box.bottom }}
          className="fixed z-[500] max-h-56 origin-top overflow-y-auto rounded-2xl bg-sc p-1.5 shadow-e3 animate-[tipIn_0.15s_ease_both]">
          {options.map((o, i) => (
            <div key={o.value} data-i={i} role="option" aria-selected={o.value === value} onPointerEnter={() => setHi(i)} onClick={() => pick(o.value)}
              className={cn('flex h-10 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-sm', i === hi && 'bg-primary/12', o.value === value && 'font-semibold text-primary')}>
              <span className="truncate" style={o.style}>{o.label}</span>
              {o.value === value && <Check size={16} />}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
