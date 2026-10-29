import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption { value: string; label: string }
interface Props {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  label: string;
  className?: string;
}

/** Custom dropdown: follows the theme, scrolls when long, supports the keyboard and flips upward near the window edge. */
export function Select({ value, options, onChange, label, className }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useLayoutEffect(() => {
    if (!open || !root.current) return;
    const r = root.current.getBoundingClientRect();
    setUp(window.innerHeight - r.bottom < 270 && r.top > window.innerHeight - r.bottom);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
    root.current?.querySelector('button')?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={root} className={cn('relative', className)} onKeyDown={onKey}>
      <button
        type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="listbox"
        onClick={() => (open ? setOpen(false) : openList())}
        className={cn(
          'rip state flex h-12 w-full items-center gap-2 rounded-md border bg-surface-container-highest px-4 text-left text-sm outline-none transition-[border-radius,border-color] duration-500 ease-spring',
          open ? 'rounded-b-xs border-primary' : 'border-outline-variant',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown className={cn('size-5 shrink-0 text-on-surface-variant transition-transform duration-500 ease-spring', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ul
          ref={list} id={id} role="listbox" aria-label={label}
          className={cn(
            'pop absolute left-0 right-0 z-50 max-h-56 overflow-y-auto rounded-md bg-surface-container-high py-1.5 shadow-e3',
            up ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top',
          )}
        >
          {options.map((o, i) => (
            <li
              key={o.value} role="option" aria-selected={o.value === value} data-i={i}
              onPointerEnter={() => setActive(i)} onClick={() => choose(i)}
              className={cn(
                'mx-1.5 flex h-10 items-center gap-2 rounded-sm px-3 text-sm',
                i === active && 'bg-on-surface/8', o.value === value && 'bg-secondary-container font-medium text-on-secondary-container',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.value === value && <Check className="size-4 shrink-0" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
