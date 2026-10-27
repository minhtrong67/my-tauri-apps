import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { clamp, cx } from "../lib/utils";

export interface Option<T extends string | number> { value: T; label: string; hint?: string; style?: React.CSSProperties; leading?: ReactNode }

/** Fully themed dropdown (the native <select> cannot follow light/dark themes). The list is capped in height and scrolls. */
export function Select<T extends string | number>({ value, options, onChange, className, label, maxHeight = 264, minWidth, icon }: {
  value: T; options: Option<T>[]; onChange: (v: T) => void; className?: string; label?: string; maxHeight?: number; minWidth?: number; icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; w: number; up: boolean } | null>(null);
  const cur = options.find((o) => o.value === value);

  useLayoutEffect(() => {
    if (!open || !btn.current || !list.current) { setPos(null); return; }
    const r = btn.current.getBoundingClientRect();
    const w = Math.max(r.width, minWidth ?? 0);
    const h = Math.min(list.current.scrollHeight, maxHeight + 16);
    const up = r.bottom + h + 8 > innerHeight && r.top > innerHeight - r.bottom;
    setPos({ x: clamp(r.left, 8, innerWidth - w - 8), y: up ? r.top - h - 6 : r.bottom + 6, w, up });
  }, [open, maxHeight, minWidth, options.length]);

  useEffect(() => {
    if (!open) return;
    const i = options.findIndex((o) => o.value === value);
    setActive(i);
    const close = (e: Event) => { if (!list.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); setActive((a) => { if (a >= 0) { onChange(options[a].value); setOpen(false); btn.current?.focus(); } return a; }); }
    };
    window.addEventListener("resize", () => setOpen(false)); window.addEventListener("keydown", onKey, true);
    document.addEventListener("wheel", close, { passive: true, capture: true });
    return () => { window.removeEventListener("keydown", onKey, true); document.removeEventListener("wheel", close, true); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && active >= 0) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  return (
    <>
      <button ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}
        className={cx("h-11 min-w-0 pl-4 pr-3 rounded-[14px] bg-surface-highest hover:bg-surface-high flex items-center gap-2 text-sm font-semibold text-on-surface border-2 transition-all duration-200",
          open ? "border-primary" : "border-transparent", className)}>
        {icon}
        <span className="flex-1 truncate text-left" style={cur?.style}>{cur?.label ?? ""}</span>
        <ChevronDown size={18} className={cx("shrink-0 text-on-surface-variant transition-transform duration-300 ease-spring", open && "rotate-180")} />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[170]" onMouseDown={() => setOpen(false)} />
          <div ref={list} role="listbox" style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, width: pos?.w, maxHeight: maxHeight + 16, opacity: pos ? 1 : 0, transformOrigin: pos?.up ? "bottom" : "top" }}
            className="fixed z-[180] overflow-y-auto p-2 rounded-[20px] bg-surface-container shadow-e4 border border-outline-variant/40 anim-scale">
            {options.map((o, i) => (
              <button key={String(o.value)} data-i={i} role="option" aria-selected={o.value === value} onMouseEnter={() => setActive(i)}
                onClick={() => { onChange(o.value); setOpen(false); btn.current?.focus(); }}
                className={cx("w-full min-h-10 px-3 py-2 rounded-[12px] flex items-center gap-2.5 text-left text-sm transition-colors",
                  o.value === value ? "bg-secondary-container text-on-secondary-container font-bold" : "text-on-surface font-medium",
                  i === active && o.value !== value && "bg-on-surface/8")}>
                {o.leading}
                <span className="flex-1 truncate" style={o.style}>{o.label}</span>
                {o.hint && <span className="text-xs text-on-surface-variant">{o.hint}</span>}
                {o.value === value && <Check size={16} className="shrink-0" />}
              </button>
            ))}
          </div>
        </>, document.body)}
    </>
  );
}
