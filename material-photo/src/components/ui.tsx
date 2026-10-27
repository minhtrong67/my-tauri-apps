import { cloneElement, isValidElement, useRef, type ReactElement, type ReactNode, type MouseEventHandler } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { createStore } from "../lib/createStore";
import { cx } from "../lib/utils";

/* ---------- Tooltip (one shared host, see Overlays.tsx) ---------- */
export const tipStore = createStore<{ tip: { label: string; kbd?: string; rect: DOMRect; side: "top" | "bottom" | "left" | "right" } | null }>({ tip: null });

export function Tip({ label, kbd, side = "bottom", children, disabled }: { label: string; kbd?: string; side?: "top" | "bottom" | "left" | "right"; children: ReactElement; disabled?: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  if (!isValidElement(children) || disabled) return children;
  const show = (el: HTMLElement, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => tipStore.set({ tip: { label, kbd, side, rect: el.getBoundingClientRect() } }), delay);
  };
  const hide = () => { clearTimeout(timer.current); tipStore.set({ tip: null }); };
  const p = children.props as Record<string, unknown>;
  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { show(e.currentTarget, 380); (p.onMouseEnter as MouseEventHandler<HTMLElement> | undefined)?.(e); },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { hide(); (p.onMouseLeave as MouseEventHandler<HTMLElement> | undefined)?.(e); },
    onFocus: (e: React.FocusEvent<HTMLElement>) => { if (e.currentTarget.matches(":focus-visible")) show(e.currentTarget, 80); },
    onBlur: hide,
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => { hide(); (p.onMouseDown as MouseEventHandler<HTMLElement> | undefined)?.(e); },
    "aria-label": (p["aria-label"] as string) || label,
  });
}

/* ---------- Buttons ---------- */
type Kind = "filled" | "tonal" | "outlined" | "text" | "danger";
export function Btn({ kind = "tonal", icon: Icon, children, size, className, loading, ...rest }: {
  kind?: Kind; icon?: LucideIcon; size?: "sm" | "lg"; loading?: boolean; className?: string; children?: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} disabled={rest.disabled || loading}
      className={cx("btn", `btn-${kind}`, size === "sm" && "btn-sm", size === "lg" && "btn-lg", className)}>
      {loading ? <Loader2 size={18} className="anim-spin" /> : Icon && <Icon size={size === "sm" ? 16 : 18} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

export function IconBtn({ icon: Icon, label, kbd, on, sm, tone, side, className, size, ...rest }: {
  icon: LucideIcon; label: string; kbd?: string; on?: boolean; sm?: boolean; tone?: "filled" | "tonal"; side?: "top" | "bottom" | "left" | "right"; className?: string; size?: number;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Tip label={label} kbd={kbd} side={side} disabled={rest.disabled}>
      <button type="button" {...rest} aria-pressed={on} className={cx("btn btn-icon", sm && "sm", on && "on", tone, className)}>
        <Icon size={size ?? (sm ? 18 : 22)} strokeWidth={2} />
      </button>
    </Tip>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cx("switch", on && "on")} />;
}

export function Segmented<T extends string>({ value, options, onChange, className }: {
  value: T; options: { value: T; label: string; icon?: LucideIcon }[]; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div className={cx("inline-flex rounded-full bg-surface-high p-1 gap-1", className)} role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cx("flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-[.8125rem] font-semibold transition-all duration-300 ease-spring flex-1",
              on ? "bg-primary text-on-primary shadow-e1" : "text-on-surface-variant hover:bg-on-surface/8")}>
            {o.icon && <o.icon size={16} strokeWidth={2.2} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SliderRow({ label, value, min, max, step = 1, onChange, onCommit, fmt, center, reset }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; onCommit?: (v: number) => void; fmt?: (v: number) => string; center?: boolean; reset?: number;
}) {
  const p = ((value - min) / (max - min)) * 100;
  const style = (center
    ? { "--p": `${p}%`, "--a": `${Math.min(50, p)}%`, "--b": `${Math.max(50, p)}%` }
    : { "--p": `${p}%` }) as unknown as React.CSSProperties;
  return (
    <label className="block select-none">
      <div className="flex items-center justify-between text-[.8125rem] mb-0.5">
        <span className="font-medium text-on-surface" onDoubleClick={() => reset !== undefined && onChange(reset)}>{label}</span>
        <span className="tabular-nums text-on-surface-variant font-semibold">{fmt ? fmt(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} style={style}
        onChange={(e) => onChange(+e.target.value)} onPointerUp={(e) => onCommit?.(+(e.target as HTMLInputElement).value)}
        onKeyUp={(e) => onCommit?.(+(e.target as HTMLInputElement).value)} />
    </label>
  );
}

export function Spinner({ size = 28 }: { size?: number }) {
  return <Loader2 size={size} className="anim-spin text-primary" />;
}

export function EmptyState({ icon: Icon, title, desc, children }: { icon: LucideIcon; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="h-full w-full grid place-items-center p-8 text-center">
      <div className="max-w-sm flex flex-col items-center gap-4 anim-float">
        <div className="relative size-28 grid place-items-center">
          <div className="absolute inset-0 bg-primary-container anim-breathe" style={{ borderRadius: "38% 62% 55% 45% / 48% 40% 60% 52%" }} />
          <Icon size={46} strokeWidth={1.6} className="relative text-on-primary-container" />
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
        {desc && <p className="text-on-surface-variant text-sm leading-relaxed">{desc}</p>}
        {children && <div className="flex flex-wrap gap-2 justify-center mt-1">{children}</div>}
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid place-items-center min-w-6 h-6 px-1.5 rounded-md bg-surface-highest text-on-surface-variant text-[.7rem] font-semibold border border-outline-variant/70">{children}</kbd>;
}

export function Chip({ on, onClick, icon: Icon, children }: { on?: boolean; onClick?: () => void; icon?: LucideIcon; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={cx("chip shrink-0 whitespace-nowrap", on && "on")} aria-pressed={on}>{Icon && <Icon size={15} />}{children}</button>;
}
