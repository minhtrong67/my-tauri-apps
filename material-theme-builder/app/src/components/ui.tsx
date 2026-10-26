import { useState, type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

/* ------------------------------- Buttons --------------------------------- */

export type BtnVariant = "filled" | "tonal" | "outlined" | "text" | "elevated" | "danger" | "neutral" | "success";

const BTN: Record<BtnVariant, string> = {
  filled: "bg-primary text-on-primary hover:shadow-elev-1",
  tonal: "bg-secondary-container text-on-secondary-container hover:shadow-elev-1",
  outlined: "border border-outline text-primary",
  text: "text-primary px-3",
  elevated: "bg-surface-container-low text-primary shadow-elev-1 hover:shadow-elev-2",
  danger: "bg-error text-on-error hover:shadow-elev-1",
  neutral: "bg-surface-container-highest text-on-surface hover:shadow-elev-1",
  success: "bg-tertiary text-on-tertiary hover:shadow-elev-1",
};

export type BtnSize = "xs" | "sm" | "md" | "lg";
const BTN_PAD: Record<BtnSize, string> = { xs: "px-4 text-xs", sm: "px-6 text-sm", md: "px-8 text-base", lg: "px-10 text-lg" };

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  icon?: ReactNode;
  size?: BtnSize;
}

/** Expressive button: pill at rest, morphs to a squarer shape on hover / press / when toggled on (aria-pressed). */
export function Button({ variant = "filled", size = "sm", icon, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      data-ripple
      data-size={size}
      className={cn(
        "m3e-btn inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium disabled:pointer-events-none disabled:opacity-40",
        BTN_PAD[size],
        !!icon && variant !== "text" && (size === "xs" ? "pl-3" : size === "sm" ? "pl-4" : "pl-6"),
        BTN[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "standard" | "tonal" | "filled";
  active?: boolean;
}

export function IconButton({ label, tone = "standard", active, className, children, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={active}
      data-tip={label}
      data-ripple
      className={cn(
        "m3e-icon-btn inline-flex size-10 shrink-0 select-none items-center justify-center disabled:pointer-events-none disabled:opacity-35",
        tone === "standard" && (active ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant"),
        tone === "tonal" && "bg-secondary-container text-on-secondary-container",
        tone === "filled" && "bg-primary text-on-primary",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------ Segmented -------------------------------- */

export interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  title?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  hideLabelsOnSmall,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  hideLabelsOnSmall?: boolean;
}) {
  // Roving tabindex + arrow/Home/End keys, as in the WAI-ARIA tabs pattern.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const i = options.findIndex((o) => o.value === value);
    const next = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    e.preventDefault();
    const list = e.currentTarget; // React clears currentTarget once the handler returns
    onChange(options[next].value);
    requestAnimationFrame(() => list.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus());
  };
  return (
    <div role="tablist" className={cn("cbg", className)} onKeyDown={onKeyDown}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            tabIndex={on ? 0 : -1}
            aria-selected={on}
            data-tip={o.title}
            data-ripple
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 whitespace-nowrap px-4 text-sm font-medium [&_svg]:shrink-0",
              on ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:text-on-surface",
            )}
          >
            {o.icon}
            <span className={cn(hideLabelsOnSmall && "hidden min-[1100px]:inline")}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- Chip ---------------------------------- */

export function Chip({
  selected,
  onClick,
  icon,
  children,
  className,
  title,
}: {
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      data-ripple
      data-tip={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 select-none items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-95",
        selected
          ? "border-transparent bg-secondary-container text-on-secondary-container"
          : "border-outline-variant text-on-surface-variant",
        className,
      )}
    >
      {selected ? <Check className="size-4 anim-pop" /> : icon}
      {children}
    </button>
  );
}

/* --------------------------------- Switch -------------------------------- */

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "m3e-switch relative h-8 w-13 shrink-0 rounded-full border-2 transition-colors duration-200",
        checked ? "border-primary bg-primary" : "border-outline bg-surface-container-highest",
      )}
    >
      <span
        className={cn(
          "thumb absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full",
          checked ? "left-[1.375rem] size-6 bg-on-primary text-primary" : "left-1 size-4 bg-outline text-surface-container-highest",
        )}
      >
        <Check className={cn("size-3.5 transition-[opacity,transform] duration-200", checked ? "scale-100 opacity-100" : "scale-0 opacity-0")} strokeWidth={3.5} />
      </span>
    </button>
  );
}

/* --------------------------------- Range --------------------------------- */

export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  track,
  halo,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  track?: string;
  halo?: string;
  label: string;
}) {
  const style = { ...(track ? { "--track": track } : {}), ...(halo ? { "--halo": halo } : {}) } as CSSProperties;
  return (
    <input
      type="range"
      className="mtb-range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      style={style}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

/* --------------------------------- Cards --------------------------------- */

export function Card({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={style} className={cn("rounded-3xl bg-surface-container-low p-5", className)}>
      {children}
    </div>
  );
}

export function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  action,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-3xl bg-surface-container-low">
      <div className="flex items-center pr-3">
        <button
          type="button"
          data-ripple
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-3 rounded-3xl px-5 py-4 text-left"
        >
          {icon && <span className="text-primary">{icon}</span>}
          <span className="flex-1 text-sm font-semibold tracking-wide">{title}</span>
        </button>
        {action}
        <ChevronDown className={cn("ml-1 size-5 text-on-surface-variant transition-transform duration-(--spring-spatial-d) ease-emphasized", open && "rotate-180")} />
      </div>
      <div className={cn("grid transition-[grid-template-rows] duration-(--spring-spatial-d) ease-emphasized", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}


/* ------------------------------ Misc helpers ----------------------------- */

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{children}</h3>;
}


/* ------------------- Expressive: loading, progress, shapes ------------------- */

export type ShapeName = "circle" | "cookie" | "sunny" | "clover" | "flower" | "burst" | "gem" | "squircle" | "pebble";

/** Loading indicator: a solid shape that morphs through a sequence while rotating. */
export function LoadingIndicator({ size = 48, contained, label = "Loading", className }: { size?: number; contained?: boolean; label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={cn("m3e-loader", contained && "contained", className)} style={{ "--ls": `${size}px` } as CSSProperties}>
      <i />
    </span>
  );
}

/** Wavy progress indicator (value 0-100). */
export function WavyProgress({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} className={cn("wavy", className)}>
      <span className="wave" style={{ width: `calc(${v}% - 6px)`, minWidth: 8 }} />
      <span className="rest" />
    </div>
  );
}

/** A container clipped to one of the Expressive shapes; morphs to `hoverShape` on hover. */
export function ShapeBox({ shape = "cookie", className, children, style }: { shape?: ShapeName; className?: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <span className={cn("shape grid place-items-center", `shape-${shape}`, className)} style={style}>
      {children}
    </span>
  );
}
