import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

/** Keeps a component mounted while its exit animation plays. */
export function usePresence(open: boolean, ms = 170) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    setClosing(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, ms);
    return () => clearTimeout(id);
  }, [open, ms]);
  return { mounted: mounted || open, closing: closing && !open };
}

interface PopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  align?: "start" | "end";
  matchWidth?: boolean;
  maxHeight?: number;
  minWidth?: number;
  className?: string;
  role?: string;
  children: ReactNode;
}

/** Fixed-position popover that flips above the anchor when there is no room below. */
export function Popover({ anchor, open, onClose, align = "start", matchWidth, maxHeight = 320, minWidth = 0, className, role, children }: PopoverProps) {
  const { mounted, closing } = usePresence(open, 140);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number; width?: number; origin: string } | null>(null);

  const place = useCallback(() => {
    const el = ref.current;
    if (!anchor || !el) return;
    const r = anchor.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const natural = Math.min(maxHeight, el.scrollHeight);
    const down = natural <= below || below >= above;
    const maxH = Math.max(120, Math.min(maxHeight, down ? below : above));
    const width = matchWidth ? r.width : Math.max(minWidth, el.offsetWidth);
    let left = align === "start" ? r.left : r.right - width;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    const h = Math.min(natural, maxH);
    const top = down ? r.bottom + 6 : r.top - 6 - h;
    setPos({ left, top, maxH, width: matchWidth ? r.width : undefined, origin: `${down ? "top" : "bottom"} ${align === "start" ? "left" : "right"}` });
  }, [anchor, align, matchWidth, maxHeight, minWidth]);

  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        anchor?.focus();
      }
    };
    const resize = () => place();
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", resize);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", onClose);
    };
  }, [open, anchor, onClose, place]);

  if (!mounted) return null;
  return createPortal(
    <div
      ref={ref}
      role={role}
      className={cn(
        "fixed z-[120] overflow-y-auto overscroll-contain rounded-2xl bg-surface-high py-1.5 text-on-surface shadow-e3 ring-1 ring-outline-variant/40",
        closing ? "anim-fade-out" : "anim-menu-in",
        className,
      )}
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        maxHeight: pos?.maxH ?? maxHeight,
        width: pos?.width,
        visibility: pos ? "visible" : "hidden",
        ["--origin" as string]: pos?.origin,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ Menu */
export type MenuEntry =
  | { type?: "item"; label: string; icon?: LucideIcon; kbd?: string; checked?: boolean; disabled?: boolean; danger?: boolean; onClick: () => void }
  | { type: "divider" }
  | { type: "header"; label: string };

export function MenuList({ entries, onDone }: { entries: MenuEntry[]; onDone: () => void }) {
  return (
    <div role="menu" className="min-w-[15rem] max-w-[22rem]">
      {entries.map((e, i) => {
        if (e.type === "divider") return <div key={i} role="separator" className="mx-3 my-1.5 h-px bg-outline-variant/70" />;
        if (e.type === "header")
          return (
            <div key={i} className="px-4 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">
              {e.label}
            </div>
          );
        const Icon = e.icon;
        return (
          <button
            key={i}
            role={e.checked !== undefined ? "menuitemcheckbox" : "menuitem"}
            aria-checked={e.checked}
            disabled={e.disabled}
            className={cn(
              "ripple mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-3 rounded-xl px-3 py-2 text-left text-[0.8125rem] transition-colors disabled:opacity-40",
              e.danger ? "text-error" : "text-on-surface",
            )}
            onClick={() => {
              onDone();
              setTimeout(e.onClick, 0);
            }}
          >
            <span className="grid h-5 w-5 flex-none place-items-center text-on-surface-variant">
              {e.checked ? <Check size={18} strokeWidth={2.6} className="text-primary" /> : Icon ? <Icon size={18} strokeWidth={2} /> : null}
            </span>
            <span className="min-w-0 flex-1 truncate">{e.label}</span>
            {e.kbd && <span className="kbd text-on-surface-variant">{e.kbd}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Select */
export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  fontFamily?: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
  maxHeight?: number;
  icon?: LucideIcon;
}

/** Fully themed dropdown (the native <select> popup cannot follow the app theme). */
export function Select<T extends string>({ value, options, onChange, ariaLabel, className, maxHeight = 248, icon: Icon }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];
  const close = useCallback(() => setOpen(false), []);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") setActive((a) => Math.min(options.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(options.length - 1);
    else if (e.key === "Enter" || e.key === " ") {
      onChange(options[active].value);
      close();
    } else return;
    e.preventDefault();
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "ripple flex h-11 w-full items-center gap-2.5 rounded-2xl bg-surface-highest px-4 text-left text-[0.875rem] font-medium text-on-surface transition-[border-radius,background-color] duration-200 ease-standard",
          open && "rounded-xl",
          className,
        )}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKey}
      >
        {Icon && <Icon size={18} className="flex-none text-on-surface-variant" />}
        <span className="min-w-0 flex-1 truncate" style={{ fontFamily: current?.fontFamily }}>{current?.label}</span>
        <ChevronDown size={18} className={cn("flex-none text-on-surface-variant transition-transform duration-200 ease-standard", open && "rotate-180")} />
      </button>
      <Popover anchor={btn.current} open={open} onClose={close} matchWidth maxHeight={maxHeight} role="presentation">
        <div ref={list} role="listbox" aria-label={ariaLabel} className="px-1.5" onKeyDown={onKey}>
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <div
                key={o.value}
                data-i={i}
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[0.875rem] transition-colors",
                  selected ? "bg-secondary-container text-on-secondary-container" : "text-on-surface",
                  i === active && !selected && "bg-on-surface/8",
                )}
                onPointerEnter={() => setActive(i)}
                onClick={() => {
                  onChange(o.value);
                  close();
                  btn.current?.focus();
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate" style={{ fontFamily: o.fontFamily }}>{o.label}</span>
                  {o.hint && <span className="block truncate text-[0.6875rem] text-on-surface-variant">{o.hint}</span>}
                </span>
                {selected && <Check size={18} strokeWidth={2.6} className="flex-none text-primary" />}
              </div>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
