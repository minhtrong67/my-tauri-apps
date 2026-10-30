import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, Check, ChevronDown, X } from "lucide-react";

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

type Variant = "filled" | "tonal" | "outlined" | "text" | "danger";
const variants: Record<Variant, string> = {
  filled: "bg-primary text-on-primary shadow-e1 hover:shadow-e2",
  tonal: "bg-secondary-container text-on-secondary-container hover:shadow-e1",
  outlined: "border border-outline text-primary hover:bg-primary/10",
  text: "text-primary hover:bg-primary/10",
  danger: "bg-error text-on-error shadow-e1 hover:shadow-e2",
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
        "transition-all duration-300 ease-spring active:scale-[.96] active:rounded-2xl disabled:pointer-events-none disabled:opacity-50",
        (variant === "filled" || variant === "danger") && "shine",
        variants[variant], className
      )}
    >
      {icon}{children}
    </button>
  );
}

export function IconBtn({ children, className, label, hint, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; hint?: string }) {
  const ripple = useRipple();
  return (
    <Tooltip label={label} hint={hint}>
      <button
        {...p} aria-label={label}
        onPointerDown={(e) => { ripple(e); p.onPointerDown?.(e); }}
        className={cx(
          "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-on-surface-variant",
          "transition-all duration-300 ease-spring hover:bg-on-surface/10 active:scale-90 active:rounded-xl disabled:opacity-50", className
        )}
      >{children}</button>
    </Tooltip>
  );
}

/** Custom tooltip: themed, delayed, flips above/below and shows an optional shortcut hint. */
export function Tooltip({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number>();
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const up = r.bottom + 64 > window.innerHeight;
      setPos({ x: Math.min(Math.max(r.left + r.width / 2, 90), window.innerWidth - 90), y: up ? r.top - 8 : r.bottom + 8, up });
    }, 380);
  };
  const hide = () => { window.clearTimeout(timer.current); setPos(null); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!pos) return;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [pos]);
  return (
    <span
      ref={ref} className="inline-flex"
      onPointerEnter={show} onPointerLeave={hide} onPointerDown={hide}
      onFocus={(e) => { if ((e.target as HTMLElement).matches(":focus-visible")) show(); }} onBlur={hide}
    >
      {children}
      {pos && createPortal(
        <div className="pointer-events-none fixed z-[80]" style={{ left: pos.x, top: pos.y, transform: `translate(-50%, ${pos.up ? "-100%" : "0"})` }}>
          <div role="tooltip" className="flex animate-pop items-center gap-2 whitespace-nowrap rounded-lg bg-inverse-surface px-2.5 py-1.5 text-xs font-medium text-inverse-on-surface shadow-e2">
            {label}
            {hint && <kbd className="rounded bg-inverse-on-surface/20 px-1.5 py-0.5 font-sans text-[10px] tracking-wide">{hint}</kbd>}
          </div>
        </div>, document.body)}
    </span>
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

/** Material 3 Expressive connected button group: the selected item morphs into a full pill. */
export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: ReactNode }[];
}) {
  return (
    <div role="radiogroup" className="flex w-full gap-0.5">
      {options.map((o, i) => {
        const on = value === o.value;
        const edge = i === 0 ? "rounded-l-full rounded-r-lg" : i === options.length - 1 ? "rounded-r-full rounded-l-lg" : "rounded-lg";
        return (
          <button
            key={o.value} role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cx("flex h-10 min-w-0 flex-1 items-center justify-center gap-1 px-1.5 text-xs font-medium transition-all duration-300 ease-spring active:scale-95",
              on ? "rounded-full bg-primary text-on-primary shadow-e1" : cx("bg-secondary-container/60 text-on-secondary-container hover:bg-secondary-container", edge))}
          >
            {on ? <Check size={14} strokeWidth={3} className="animate-pop" /> : o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx("h-8 rounded-lg border px-3 text-sm transition-all duration-300 ease-spring active:scale-95 hover:rounded-xl",
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
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="rounded-m3xl bg-surface-low">
      <button
        aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
        className="flex h-14 w-full items-center gap-3 rounded-m3xl px-4 text-sm font-medium text-on-surface transition-colors hover:bg-on-surface/5"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-container text-on-primary-container">{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown size={18} className={cx("text-on-surface-variant transition-transform duration-500 ease-spring", open && "rotate-180")} />
      </button>
      <div id={id} className="acc" data-open={open} aria-hidden={!open} {...(open ? {} : ({ inert: "" } as object))}>
        <div><div className="space-y-4 px-4 pb-4 pt-1">{children}</div></div>
      </div>
    </section>
  );
}

/** Modal shell: scrim, spring-in, Esc to close, focus trap and focus restore. */
export function Modal({ onClose, children, className, label }: { onClose: () => void; children: ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref.current!;
    const prev = document.activeElement as HTMLElement | null;
    const items = () => [...el.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null);
    (el.querySelector<HTMLElement>("[data-autofocus]") ?? items()[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close.current(); return; }
      if (e.key !== "Tab") return;
      const l = items();
      if (!l.length) return;
      const a = l[0], b = l[l.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    };
    el.addEventListener("keydown", key);
    return () => { el.removeEventListener("keydown", key); prev?.focus?.(); };
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-50 grid animate-fadeIn place-items-center bg-black/45 p-3 backdrop-blur-[3px]"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label}
        className={cx("animate-pop overflow-hidden rounded-m3xxl bg-surface-container shadow-e3 ring-1 ring-outline-variant/60", className)}>
        {children}
      </div>
    </div>, document.body);
}

/** Confirm dialog: both actions carry a label, an icon and a distinct colour. */
export function ConfirmDialog({ title, message, icon, confirmLabel, cancelLabel, confirmIcon, tone = "danger", onConfirm, onCancel }: {
  title: string; message: string; icon: ReactNode; confirmLabel: string; cancelLabel: string; confirmIcon: ReactNode;
  tone?: "danger" | "primary"; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal onClose={onCancel} label={title} className="w-full max-w-sm p-6">
      <div className={cx("mb-4 grid h-14 w-14 place-items-center rounded-[40%_60%_55%_45%/55%_45%_60%_40%]", tone === "danger" ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container")}>{icon}</div>
      <h2 className="text-xl font-medium text-on-surface">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Btn variant="tonal" icon={<X size={18} />} onClick={onCancel}>{cancelLabel}</Btn>
        <Btn variant={tone === "danger" ? "danger" : "filled"} icon={confirmIcon} onClick={onConfirm} data-autofocus>{confirmLabel}</Btn>
      </div>
    </Modal>
  );
}

/** Small dialog with a single text input. */
export function PromptDialog({ title, label, placeholder, confirmLabel, cancelLabel, icon, confirmIcon, onSubmit, onCancel }: {
  title: string; label: string; placeholder: string; confirmLabel: string; cancelLabel: string; icon: ReactNode; confirmIcon: ReactNode;
  onSubmit: (v: string) => void; onCancel: () => void;
}) {
  const [v, setV] = useState("");
  const ok = v.trim().length > 0;
  return (
    <Modal onClose={onCancel} label={title} className="w-full max-w-sm p-6">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-[55%_45%_40%_60%/45%_55%_45%_55%] bg-primary-container text-on-primary-container">{icon}</div>
      <h2 className="text-xl font-medium text-on-surface">{title}</h2>
      <label className="mt-4 block text-xs text-on-surface-variant">{label}</label>
      <input
        data-autofocus value={v} maxLength={32} placeholder={placeholder}
        onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ok) onSubmit(v.trim()); }}
        className="mt-1 h-12 w-full rounded-xl border border-outline bg-transparent px-4 text-sm text-on-surface focus:border-primary"
      />
      <div className="mt-6 flex justify-end gap-2">
        <Btn variant="tonal" icon={<X size={18} />} onClick={onCancel}>{cancelLabel}</Btn>
        <Btn variant="filled" icon={confirmIcon} disabled={!ok} onClick={() => onSubmit(v.trim())}>{confirmLabel}</Btn>
      </div>
    </Modal>
  );
}

/** Scrollable area with a "scroll to top" FAB that appears once the content is scrolled. */
export function ScrollArea({ className, innerClassName, children, label, scrollRef, onScroll }: {
  className?: string; innerClassName?: string; children: ReactNode; label: string;
  scrollRef?: RefObject<HTMLDivElement>; onScroll?: (el: HTMLDivElement) => void;
}) {
  const own = useRef<HTMLDivElement>(null);
  const ref = scrollRef ?? own;
  const [show, setShow] = useState(false);
  return (
    <div className={cx("relative min-h-0", className)}>
      <div ref={ref} className={cx("h-full overflow-y-auto overscroll-contain", innerClassName)}
        onScroll={(e) => { const el = e.currentTarget; setShow(el.scrollTop > 240); onScroll?.(el); }}>
        {children}
      </div>
      <div className={cx("absolute bottom-4 right-4 transition-all duration-500 ease-spring", show ? "scale-100 opacity-100" : "pointer-events-none scale-50 opacity-0")}>
        <Tooltip label={label}>
          <button
            aria-label={label} tabIndex={show ? 0 : -1}
            onClick={() => ref.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-container text-on-primary-container shadow-e3 transition-all duration-300 ease-spring hover:rounded-full active:scale-90"
          ><ArrowUp size={22} /></button>
        </Tooltip>
      </div>
    </div>
  );
}
