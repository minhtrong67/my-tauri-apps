import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, ArrowUp, type IconType } from "./icons";
import { cn } from "../../lib/utils";
import { useUi, dismissToast, type ToastItem, type ToastKind } from "../../store/ui";
import { IconButton } from "./Button";
import { useT } from "../../lib/i18n";

/* ---------------------------------------------------------------- Switch */
/** Fluent toggle switch: 40 x 20 track; the knob grows slightly on hover and press. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "group relative h-5 w-10 flex-none rounded-full border transition-colors duration-150",
        checked ? "border-brand bg-brand hover:border-brand-hover hover:bg-brand-hover active:border-brand-pressed active:bg-brand-pressed" : "border-fg2 bg-transparent hover:bg-sub-hover active:bg-sub-press",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full transition-[left,width,height,background-color] duration-150 ease-decel",
          "h-3 w-3 group-hover:h-[0.875rem] group-hover:w-[0.875rem] group-active:h-3 group-active:w-[1.0625rem]",
          checked ? "left-[1.5rem] bg-on-brand group-hover:left-[1.4375rem] group-active:left-[1.3125rem]" : "left-[0.1875rem] bg-fg2 group-hover:left-[0.125rem] group-active:left-[0.125rem]",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------- Segmented */
export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: IconType;
  preview?: ReactNode;
}

/** Segmented control: a recessed track with a raised "thumb" that glides under the selected item. */
export function Segmented<T extends string>({
  value, options, onChange, ariaLabel, className,
}: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; ariaLabel: string; className?: string }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("relative flex rounded-md border border-stroke bg-recess p-0.5", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 rounded bg-ctl shadow-fl2 ring-1 ring-stroke transition-transform duration-[280ms] ease-decel"
        style={{ width: `calc((100% - 0.25rem) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded px-3 text-sm transition-colors duration-200",
              on ? "font-semibold text-fg" : "text-fg2 hover:text-fg",
            )}
          >
            {Icon && <Icon size={16} strokeWidth={1.6} className={on ? "text-brand" : undefined} />}
            {o.preview}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- Toast */
const kindIcon: Record<ToastKind, IconType> = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };
const kindClass: Record<ToastKind, { box: string; bar: string; icon: string }> = {
  info: { box: "bg-info-bg", bar: "bg-info", icon: "text-info" },
  success: { box: "bg-ok-bg", bar: "bg-ok", icon: "text-ok" },
  warning: { box: "bg-warn-bg", bar: "bg-warn", icon: "text-warn" },
  error: { box: "bg-err-bg", bar: "bg-err", icon: "text-err" },
};

/** Message bar in the Fluent InfoBar style: tinted by severity, coloured glyph, text, optional action, dismiss. */
function ToastView({ item }: { item: ToastItem }) {
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const Icon = kindIcon[item.kind];
  const c = kindClass[item.kind];
  const leave = () => {
    setLeaving(true);
    window.setTimeout(() => dismissToast(item.id), 120);
  };
  return (
    <div
      role={item.kind === "error" || item.kind === "warning" ? "alert" : "status"}
      className={cn(
        "group pointer-events-auto relative flex w-full max-w-[26rem] items-center gap-3 overflow-hidden rounded border border-stroke py-2 pl-3 pr-1.5 text-fg shadow-fl16",
        c.box,
        leaving ? "anim-toast-out" : "anim-slide-up",
      )}
    >
      <Icon size={18} strokeWidth={1.8} className={cn("flex-none", c.icon)} aria-hidden />
      <p className="min-w-0 flex-1 py-1 text-sm leading-snug">{item.message}</p>
      {item.action && (
        <button
          type="button"
          className="fl-subtle h-8 flex-none rounded px-3 text-sm font-semibold"
          onClick={() => {
            item.action?.onClick();
            leave();
          }}
        >
          {item.action.label}
        </button>
      )}
      <IconButton icon={X} label={t("common.close")} small onClick={leave} />
      <span
        className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left group-hover:[animation-play-state:paused]", c.bar)}
        style={{ animation: `progress ${item.duration}ms linear forwards` }}
        onAnimationEnd={leave}
      />
    </div>
  );
}

export function ToastHost() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-10 right-4 z-[150] flex w-[calc(100%-2rem)] max-w-[26rem] flex-col items-end gap-2" aria-live="polite">
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
          "fl-ctl absolute bottom-4 right-5 grid h-9 w-9 place-items-center rounded shadow-fl8 transition-[transform,opacity] duration-150 ease-decel",
          show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <ArrowUp size={17} strokeWidth={1.8} />
      </button>
    </div>
  );
}
