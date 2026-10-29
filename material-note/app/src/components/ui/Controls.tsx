import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert, CircleCheck, Info, TriangleAlert, X, ArrowUp, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { useUi, dismissToast, type ToastItem, type ToastKind } from "../../store/ui";
import { IconButton } from "./Button";
import { useT } from "../../lib/i18n";

/* ---------------------------------------------------------------- Switch */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "group relative h-8 w-[3.25rem] flex-none rounded-full border-2 transition-colors duration-300",
        checked ? "border-primary bg-primary" : "border-outline bg-surface-highest",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full transition-all duration-300 ease-spring group-active:h-7 group-active:w-7",
          checked ? "left-[1.4rem] h-6 w-6 bg-on-primary text-primary group-active:left-[1.15rem]" : "left-1 h-4 w-4 bg-outline text-surface-highest group-active:left-0.5",
        )}
      >
        {checked && <Check size={14} strokeWidth={3.2} />}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------- Segmented */
export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  preview?: ReactNode;
}

/** Connected button group; the selected item becomes a full pill (shape morph). */
export function Segmented<T extends string>({
  value, options, onChange, ariaLabel, className,
}: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; ariaLabel: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex gap-0.5", className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        const Icon = o.icon;
        const end = i === 0 ? "rounded-l-full rounded-r-lg" : i === options.length - 1 ? "rounded-r-full rounded-l-lg" : "rounded-lg";
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "ripple flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 px-3.5 text-[0.8125rem] font-semibold transition-[border-radius,background-color,color,transform] duration-300 ease-spring active:scale-95",
              on ? "rounded-full bg-secondary-container text-on-secondary-container" : cn(end, "bg-surface-highest text-on-surface-variant"),
            )}
          >
            {on && !Icon && !o.preview ? <Check size={16} strokeWidth={2.8} /> : null}
            {Icon && <Icon size={17} strokeWidth={2.2} />}
            {o.preview}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- Toast */
const kindIcon: Record<ToastKind, LucideIcon> = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };
const kindClass: Record<ToastKind, { box: string; bar: string; chip: string }> = {
  info: { box: "bg-info-container text-on-info-container", bar: "bg-info", chip: "bg-info text-on-info" },
  success: { box: "bg-success-container text-on-success-container", bar: "bg-success", chip: "bg-success text-on-success" },
  warning: { box: "bg-warning-container text-on-warning-container", bar: "bg-warning", chip: "bg-warning text-on-warning" },
  error: { box: "bg-error-container text-on-error-container", bar: "bg-error", chip: "bg-error text-on-error" },
};

function ToastView({ item }: { item: ToastItem }) {
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const Icon = kindIcon[item.kind];
  const c = kindClass[item.kind];
  const leave = () => {
    setLeaving(true);
    window.setTimeout(() => dismissToast(item.id), 170);
  };
  return (
    <div
      role={item.kind === "error" || item.kind === "warning" ? "alert" : "status"}
      className={cn(
        "group pointer-events-auto relative flex w-full max-w-[26rem] items-center gap-3 overflow-hidden rounded-2xl py-2.5 pl-2.5 pr-2 shadow-e3 ring-1 ring-black/5",
        c.box,
        leaving ? "anim-toast-out" : "anim-slide-up",
      )}
    >
      <span className={cn("grid h-9 w-9 flex-none place-items-center rounded-xl", c.chip)}>
        <Icon size={19} strokeWidth={2.3} />
      </span>
      <p className="min-w-0 flex-1 text-[0.8125rem] font-medium leading-snug">{item.message}</p>
      {item.action && (
        <button
          type="button"
          className="ripple h-8 flex-none rounded-full px-3 text-[0.8125rem] font-semibold underline-offset-2 hover:underline"
          onClick={() => {
            item.action?.onClick();
            leave();
          }}
        >
          {item.action.label}
        </button>
      )}
      <IconButton icon={X} label={t("common.close")} small onClick={leave} className="text-current" />
      <span
        className={cn("absolute inset-x-0 bottom-0 h-[3px] origin-left group-hover:[animation-play-state:paused]", c.bar)}
        style={{ animation: `progress ${item.duration}ms linear forwards` }}
        onAnimationEnd={leave}
      />
    </div>
  );
}

export function ToastHost() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-14 z-[150] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((x) => (
        <ToastView key={x.id} item={x} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ ScrollArea */
/** Scrollable region with a floating "back to top" button once the content has been scrolled. */
export function ScrollArea({ children, className, resetKey }: { children: ReactNode; className?: string; resetKey?: unknown }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
    setShow(false);
  }, [resetKey]);
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} className={cn("h-full overflow-y-auto", className)} onScroll={(e) => setShow(e.currentTarget.scrollTop > 220)}>
        {children}
      </div>
      <button
        type="button"
        aria-label={t("common.scrollTop")}
        data-tip={t("common.scrollTop")}
        data-tip-pos="top"
        tabIndex={show ? 0 : -1}
        onClick={() => ref.current?.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "ripple absolute bottom-4 right-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary-container text-on-primary-container shadow-e3 transition-all duration-300 ease-spring active:scale-90 active:rounded-full",
          show ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-75 opacity-0",
        )}
      >
        <ArrowUp size={22} strokeWidth={2.4} />
      </button>
    </div>
  );
}
