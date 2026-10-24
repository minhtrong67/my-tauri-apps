import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
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

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  icon?: ReactNode;
}

export function Button({ variant = "filled", icon, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      data-ripple
      className={cn(
        "inline-flex h-10 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-sm font-medium transition-[box-shadow,transform,background-color,color] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        !!icon && variant !== "text" && "pl-4",
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
      data-tip={label}
      data-ripple
      className={cn(
        "inline-flex size-10 shrink-0 select-none items-center justify-center rounded-full transition-[transform,background-color,color] duration-200 active:scale-90 disabled:pointer-events-none disabled:opacity-35",
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
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" className={cn("relative grid auto-cols-fr grid-flow-col rounded-full bg-surface-container-high p-1", className)}>
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 rounded-full bg-secondary-container shadow-elev-1 transition-transform duration-300 ease-emphasized"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          data-tip={o.title}
          data-ripple
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors duration-200",
            o.value === value ? "text-on-secondary-container" : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          {o.icon}
          <span className={cn(hideLabelsOnSmall && "hidden min-[1100px]:inline")}>{o.label}</span>
        </button>
      ))}
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
        "relative h-8 w-13 shrink-0 rounded-full border-2 transition-colors duration-300",
        checked ? "border-primary bg-primary" : "border-outline bg-surface-container-highest",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ease-emphasized",
          checked ? "left-[1.625rem] size-6 bg-on-primary" : "left-1.5 size-4 bg-outline",
        )}
      />
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
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  track?: string;
  label: string;
}) {
  const style = track ? ({ "--track": track } as CSSProperties) : undefined;
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
        <ChevronDown className={cn("ml-1 size-5 text-on-surface-variant transition-transform duration-300 ease-emphasized", open && "rotate-180")} />
      </div>
      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-emphasized", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
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
