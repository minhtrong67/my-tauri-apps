import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

export interface Opt<T extends string> { value: T; label: string; icon?: LucideIcon }
interface Props<T extends string> { value: T; options: Opt<T>[]; onChange: (v: T) => void; label: string; className?: string }

/** Dropdown tuỳ chỉnh: hỗ trợ sáng/tối, giới hạn chiều cao + cuộn, điều khiển bằng bàn phím. */
export function Select<T extends string>({ value, options, onChange, label, className = "" }: Props<T>) {
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, up: false });
  const cur = options.find((o) => o.value === value) ?? options[0];

  const openMenu = () => {
    const r = btn.current!.getBoundingClientRect();
    const h = Math.min(options.length * 44 + 16, 264);
    const up = window.innerHeight - r.bottom < h + 16 && r.top > h;
    setBox({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 200), up });
    setIdx(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (focus = true) => { setOpen(false); if (focus) btn.current?.focus(); };
  const pick = (v: T) => { onChange(v); close(); };

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close(false); };
    const rs = () => close(false);
    document.addEventListener("pointerdown", down);
    window.addEventListener("resize", rs);
    return () => { document.removeEventListener("pointerdown", down); window.removeEventListener("resize", rs); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (open) list.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`)?.scrollIntoView({ block: "nearest" }); }, [idx, open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openMenu(); } return; }
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % options.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i + options.length - 1) % options.length); }
    else if (e.key === "Home") { e.preventDefault(); setIdx(0); }
    else if (e.key === "End") { e.preventDefault(); setIdx(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(options[idx].value); }
    else if (e.key === "Tab") close(false);
  };

  return (
    <>
      <button ref={btn} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        onClick={() => (open ? close() : openMenu())} onKeyDown={onKey}
        className={`state-layer flex h-12 min-w-[200px] items-center gap-2 rounded-m3-md border border-outline-variant bg-surface-highest px-4 text-left text-sm font-medium transition-[border-radius,border-color] duration-300 ease-spring ${open ? "rounded-b-m3-sm border-primary" : ""} ${className}`}>
        {cur.icon && <cur.icon className="h-[18px] w-[18px] text-on-surface-variant" />}
        <span className="flex-1 truncate">{cur.label}</span>
        <ChevronDown className={`h-5 w-5 text-on-surface-variant transition-transform duration-300 ease-spring ${open ? "rotate-180" : ""}`} />
      </button>
      {open && createPortal(
        <div ref={list} role="listbox" style={{ left: box.left, top: box.top, width: box.width, transform: box.up ? "translateY(-100%)" : undefined }}
          className="animate-pop fixed z-[150] max-h-64 overflow-y-auto rounded-m3-md bg-surface-high p-2 shadow-e3">
          {options.map((o, i) => {
            const sel = o.value === value;
            return (
              <button key={o.value} type="button" role="option" aria-selected={sel} data-i={i} onClick={() => pick(o.value)} onMouseEnter={() => setIdx(i)}
                className={`flex h-11 w-full items-center gap-3 rounded-m3-sm px-3 text-left text-sm font-medium transition-colors ${sel ? "bg-secondary-container text-on-secondary-container" : "text-on-surface"} ${i === idx ? "bg-on-surface/10" : ""} ${sel && i === idx ? "!bg-secondary-container" : ""}`}>
                {o.icon && <o.icon className="h-[18px] w-[18px]" />}
                <span className="flex-1 truncate">{o.label}</span>
                {sel && <Check className="h-4 w-4" strokeWidth={2.6} />}
              </button>
            );
          })}
        </div>, document.body)}
    </>
  );
}
