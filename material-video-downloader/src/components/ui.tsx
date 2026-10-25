import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { useEscape } from "../lib/hooks";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------------------------------------------------------------- Buttons */

type Variant = "filled" | "tonal" | "outlined" | "text" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  size?: "md" | "lg";
}

const VARIANTS: Record<Variant, string> = {
  filled: "bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/30",
  tonal: "bg-secondary-container text-on-secondary-container hover:shadow-md",
  outlined: "border-2 border-outline-variant text-primary hover:bg-primary/8",
  text: "text-primary hover:bg-primary/10",
  danger: "bg-error text-on-error hover:shadow-lg hover:shadow-error/30",
};

export function Button({ variant = "filled", icon, size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx(
        "ripple-host morph inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-full font-semibold tracking-[0.01em] hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        size === "lg" ? "h-14 px-8 text-base" : "h-11 px-6 text-sm",
        !!icon && (size === "lg" ? "pl-6" : "pl-5"),
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "default" | "primary" | "danger" | "tonal";
  size?: "sm" | "md";
}

export function IconButton({ label, tone = "default", size = "md", className, children, ...rest }: IconButtonProps) {
  const tones = {
    default: "text-on-surface-variant hover:bg-on-surface/8",
    primary: "text-primary hover:bg-primary/10",
    danger: "text-error hover:bg-error/10",
    tonal: "bg-secondary-container text-on-secondary-container hover:brightness-105",
  };
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cx(
        "ripple-host morph inline-flex shrink-0 items-center justify-center rounded-full active:scale-90 disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "size-9" : "size-11",
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Chips */

export function Chip({
  selected,
  onClick,
  icon,
  children,
  count,
}: {
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "ripple-host inline-flex h-10 shrink-0 items-center gap-1.5 px-4 text-sm font-semibold transition-all duration-500 ease-spring active:scale-95",
        selected
          ? "rounded-full bg-primary text-on-primary shadow-md shadow-primary/25"
          : "rounded-xl bg-surface-container text-on-surface-variant hover:rounded-2xl hover:bg-surface-high",
      )}
    >
      {selected ? <Check size={16} strokeWidth={3} className="anim-pop" /> : icon}
      {children}
      {count !== undefined && count > 0 && (
        <span className={cx("ml-0.5 rounded-full px-1.5 text-xs font-bold tabular-nums", selected ? "bg-on-primary/20" : "bg-on-surface/10")}>{count}</span>
      )}
    </button>
  );
}

/* ----------------------------------------------------- Segmented button */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T, e: React.MouseEvent) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cx("flex gap-[3px]", className)}>
      {options.map((o, i) => {
        const active = o.value === value;
        const edge = i === 0 ? "rounded-l-full rounded-r-lg" : i === options.length - 1 ? "rounded-r-full rounded-l-lg" : "rounded-lg";
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={(e) => onChange(o.value, e)}
            className={cx(
              "ripple-host inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 px-4 text-sm font-semibold transition-all duration-500 ease-spring active:scale-[0.97]",
              active ? "rounded-full bg-primary text-on-primary shadow-md shadow-primary/25" : cx(edge, "bg-surface-highest text-on-surface hover:bg-surface-high"),
            )}
          >
            {active ? <Check size={17} strokeWidth={3} className="anim-pop shrink-0" /> : o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- Switch */

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 transition-colors duration-200",
        checked ? "border-primary bg-primary" : "border-outline bg-surface-highest",
      )}
    >
      <span
        className={cx(
          "absolute flex items-center justify-center rounded-full transition-all duration-300 ease-spring",
          checked ? "left-[22px] size-6 bg-on-primary text-primary" : "left-[4px] size-4 bg-outline text-surface-highest",
        )}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}

/* ----------------------------------------------------------------- Slider */

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="m3-slider h-8 w-full cursor-pointer"
      style={{ ["--pct" as string]: `${pct}%` }}
    />
  );
}

/* ------------------------------------------------------------------ Select */

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 cursor-pointer rounded-lg border border-outline bg-surface px-3 text-sm text-on-surface outline-none transition-colors hover:bg-on-surface/4 focus:border-primary focus:ring-1 focus:ring-primary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ---------------------------------------------------------------- Dialog */

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  icon,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  wide?: boolean;
}) {
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="anim-scrim absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cx(
          "anim-sheet relative flex max-h-full w-full flex-col overflow-hidden rounded-t-[36px] bg-surface-high shadow-2xl sm:rounded-[40px]",
          wide ? "sm:max-w-[640px]" : "sm:max-w-[480px]",
        )}
      >
        <div className="flex items-center gap-3 px-6 pt-6 pb-2">
          {icon && <span className="relative flex size-12 items-center justify-center"><span className="shape-cookie absolute inset-0 bg-primary-container" /><span className="relative text-on-primary-container">{icon}</span></span>}
          <h2 className="min-w-0 flex-1 truncate text-[1.625rem] leading-9 font-semibold tracking-tight text-on-surface">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">{children}</div>
        {actions && <div className="flex flex-wrap items-center justify-end gap-2 px-6 pt-3 pb-6">{actions}</div>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Menu (popup) */

export function Menu({
  anchor,
  children,
}: {
  anchor: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEscape(() => setOpen(false), open);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {anchor({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className="anim-pop absolute right-0 top-full z-30 mt-1 min-w-56 origin-top-right overflow-hidden rounded-3xl bg-surface-high py-2 shadow-xl ring-1 ring-outline-variant/40">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "ripple-host flex h-11 w-full items-center gap-3 px-4 text-left text-sm transition-colors hover:bg-on-surface/8",
        danger ? "text-error" : "text-on-surface",
      )}
    >
      <span className="flex size-5 items-center justify-center opacity-80">{icon}</span>
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Expressive bits */

export function Loader({ size = 48 }: { size?: number }) {
  return <span className="m3e-loader" style={{ ["--size" as string]: `${size}px` }} role="progressbar" aria-label="Loading" />;
}

export function ShapeBadge({
  shape = "cookie",
  size = 48,
  tone = "primary",
  children,
}: {
  shape?: "cookie" | "flower" | "clover" | "sunny" | "gem";
  size?: number;
  tone?: "primary" | "secondary" | "tertiary" | "error";
  children: ReactNode;
}) {
  const bg = { primary: "bg-primary-container", secondary: "bg-secondary-container", tertiary: "bg-tertiary-container", error: "bg-error-container" }[tone];
  const fg = { primary: "text-on-primary-container", secondary: "text-on-secondary-container", tertiary: "text-on-tertiary-container", error: "text-on-error-container" }[tone];
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span className={cx(`shape-${shape} absolute inset-0`, bg)} />
      <span className={cx("relative", fg)}>{children}</span>
    </span>
  );
}
