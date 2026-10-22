import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

/** Material ripple: attach to an element that is `relative overflow-hidden`. */
export function useRipple() {
  return (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const dot = document.createElement("span");
    dot.className = "ripple-dot";
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove());
  };
}

type Variant = "filled" | "tonal" | "outlined" | "text";
const variants: Record<Variant, string> = {
  filled: "bg-primary text-on-primary shadow-e1 hover:shadow-e2",
  tonal: "bg-secondary-container text-on-secondary-container hover:shadow-e1",
  outlined: "border border-outline text-primary hover:bg-primary/10",
  text: "text-primary hover:bg-primary/10",
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; icon?: ReactNode }
export function Btn({ variant = "tonal", icon, children, className, ...p }: BtnProps) {
  const ripple = useRipple();
  return (
    <button
      {...p}
      onPointerDown={(e) => { ripple(e); p.onPointerDown?.(e); }}
      className={cx(
        "relative inline-flex h-10 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full px-5 text-sm font-medium",
        "transition-all duration-200 active:scale-[.97] disabled:pointer-events-none disabled:opacity-50",
        variants[variant], className
      )}
    >
      {icon}{children}
    </button>
  );
}

export function IconBtn({ children, className, label, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  const ripple = useRipple();
  return (
    <button
      {...p} title={label} aria-label={label}
      onPointerDown={(e) => { ripple(e); p.onPointerDown?.(e); }}
      className={cx(
        "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-on-surface-variant",
        "transition-all duration-200 hover:bg-on-surface/10 active:scale-90 disabled:opacity-50", className
      )}
    >{children}</button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cx("relative h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors duration-200",
        checked ? "border-primary bg-primary" : "border-outline bg-surface-highest")}
    >
      <span className={cx("absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full transition-all duration-200",
        checked ? "left-[22px] h-6 w-6 bg-on-primary" : "left-1 h-4 w-4 bg-outline")}>
        {checked && <Check size={14} className="text-primary" strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: ReactNode }[];
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-full border border-outline">
      {options.map((o, i) => (
        <button
          key={o.value} onClick={() => onChange(o.value)}
          className={cx("flex h-9 flex-1 items-center justify-center gap-1.5 px-2 text-xs font-medium transition-colors duration-200 sm:text-sm",
            i > 0 && "border-l border-outline",
            value === o.value ? "bg-secondary-container text-on-secondary-container" : "text-on-surface hover:bg-on-surface/8")}
        >
          {value === o.value ? <Check size={14} className="animate-fadeIn" /> : o.icon}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx("h-8 rounded-lg border px-3 text-sm transition-all duration-200 active:scale-95",
        active ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline text-on-surface-variant hover:bg-on-surface/8")}
    >{children}</button>
  );
}

export function Field({ label, hint, right, children }: { label: string; hint?: string; right?: ReactNode; children?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-on-surface">{label}</div>
          {hint && <div className="text-xs text-on-surface-variant">{hint}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, unit = "", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <Field label={label} right={<span className="rounded-md bg-surface-highest px-2 py-0.5 text-xs tabular-nums text-on-surface-variant">{value}{unit}</span>}>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={(e) => onChange(+e.target.value)} className="h-5 w-full cursor-pointer accent-primary" />
    </Field>
  );
}

export interface Opt { value: string; label: string; family?: string }

/** Material-style dropdown menu (the native <select> popup ignores the app theme). */
export function SelectBox({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: Opt[]; label: string }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const open = rect !== null;
  const close = () => setRect(null);
  const cur = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-menu]") && !btn.current?.contains(t)) close();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    const away = (e: Event) => { if (!(e.target as HTMLElement)?.closest?.("[data-menu]")) close(); };
    document.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", away, true);
    requestAnimationFrame(() => document.querySelector("[data-menu] [aria-selected=true]")?.scrollIntoView({ block: "center" }));
    return () => {
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", away, true);
    };
  }, [open]);

  const step = (d: number) => {
    const i = options.findIndex((o) => o.value === value);
    const n = options[Math.min(options.length - 1, Math.max(0, i + d))];
    if (n) onChange(n.value);
  };

  let style: React.CSSProperties = {};
  if (rect) {
    const below = window.innerHeight - rect.bottom - 12, above = rect.top - 12;
    const up = below < 220 && above > below;
    const w = Math.max(rect.width, 210);
    style = { left: Math.max(8, Math.min(rect.left, window.innerWidth - w - 8)), width: w, maxHeight: Math.min(300, up ? above : below), ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) };
  }

  return (
    <>
      <button
        ref={btn} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => (open ? close() : setRect(btn.current!.getBoundingClientRect()))}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); step(1); } else if (e.key === "ArrowUp") { e.preventDefault(); step(-1); } }}
        className={cx("flex h-10 w-full items-center justify-between rounded-lg border bg-transparent pl-3 pr-2.5 text-left text-sm text-on-surface transition-colors",
          open ? "border-primary" : "border-outline hover:border-on-surface")}
      >
        <span className="truncate" style={{ fontFamily: cur?.family }}>{cur?.label}</span>
        <ChevronDown size={18} className={cx("shrink-0 text-on-surface-variant transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && createPortal(
        <div data-menu role="listbox" style={style}
          className="fixed z-[60] animate-fadeIn overflow-y-auto rounded-m3 bg-surface-high py-2 shadow-e3 ring-1 ring-outline-variant">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button key={o.value} role="option" aria-selected={on} onClick={() => { onChange(o.value); close(); }}
                className={cx("flex h-11 w-full items-center gap-2 px-3 text-left text-sm transition-colors",
                  on ? "bg-secondary-container text-on-secondary-container" : "text-on-surface hover:bg-on-surface/8")}>
                <span className="flex-1 truncate" style={{ fontFamily: o.family }}>{o.label}</span>
                {on && <Check size={16} />}
              </button>
            );
          })}
        </div>, document.body)}
    </>
  );
}

export function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full border border-outline" style={{ background: value }}>
        <input type="color" aria-label={label} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
      <input
        aria-label={label} value={value} maxLength={7} spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-outline bg-transparent px-3 font-mono text-sm uppercase text-on-surface focus:border-primary"
      />
    </div>
  );
}

export function Section({ icon, title, children, defaultOpen = true }: { icon: ReactNode; title: string; children: ReactNode; defaultOpen?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={ref} open={defaultOpen} className="group rounded-m3l bg-surface-low">
      <summary className="flex h-12 cursor-pointer list-none items-center gap-3 rounded-m3l px-4 text-sm font-medium text-on-surface transition-colors hover:bg-on-surface/5 [&::-webkit-details-marker]:hidden">
        <span className="text-primary">{icon}</span>
        <span className="flex-1">{title}</span>
        <ChevronDown size={18} className="text-on-surface-variant transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="animate-fadeIn space-y-4 px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}
