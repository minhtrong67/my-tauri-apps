import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown16Regular, type FluentIcon } from "@fluentui/react-icons";

export interface Opt<T extends string> { value: T; label: string; icon?: FluentIcon }
interface Props<T extends string> { value: T; options: Opt<T>[]; onChange: (v: T) => void; label: string; className?: string }

/** ComboBox của Fluent: flyout bo góc 8px, mục đang chọn có vạch nhấn bên trái, điều khiển được bằng bàn phím. */
export function Select<T extends string>({ value, options, onChange, label, className = "" }: Props<T>) {
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, up: false });
  const cur = options.find((o) => o.value === value) ?? options[0];

  const openMenu = () => {
    const r = btn.current!.getBoundingClientRect();
    const h = Math.min(options.length * 36 + 8, 280);
    const up = window.innerHeight - r.bottom < h + 16 && r.top > h;
    setBox({ left: r.left, top: up ? r.top - 4 : r.bottom + 4, width: Math.max(r.width, 200), up });
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
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
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
        className={`flex h-8 min-w-[200px] items-center gap-2 rounded-ctl border border-stroke border-b-strong bg-ctl px-3 text-left text-body text-fg transition-colors hover:bg-ctl-h active:bg-ctl-p ${className}`}>
        {cur.icon && <cur.icon className="h-4 w-4 text-fg-2" />}
        <span className="flex-1 truncate">{cur.label}</span>
        <ChevronDown16Regular className="text-fg-2" />
      </button>
      {open && createPortal(
        <div ref={list} role="listbox" style={{ left: box.left, top: box.top, width: box.width, transform: box.up ? "translateY(-100%)" : undefined }}
          className="animate-flyout fixed z-[650] max-h-[280px] overflow-y-auto rounded-ovl border border-flyout-line bg-flyout p-1 shadow-fly">
          {options.map((o, i) => {
            const sel = o.value === value;
            return (
              <button key={o.value} type="button" role="option" aria-selected={sel} data-i={i} onClick={() => pick(o.value)} onMouseEnter={() => setIdx(i)}
                className={`relative flex h-9 w-full items-center gap-3 rounded-ctl px-3 text-left text-body transition-colors ${i === idx ? "bg-hov" : sel ? "bg-hov/60" : ""}`}>
                {sel && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-acc" />}
                {o.icon && <o.icon className="h-4 w-4" />}
                <span className="flex-1 truncate">{o.label}</span>
              </button>
            );
          })}
        </div>, document.body)}
    </>
  );
}
