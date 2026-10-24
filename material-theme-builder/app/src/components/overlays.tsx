import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Check, ChevronDown, Save, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { useSettings } from "../state/settings";
import { Button, IconButton, type BtnVariant } from "./ui";

/* ------------------------------------------------------------------ */
/* Presence: keep an element mounted long enough to play its exit      */
/* ------------------------------------------------------------------ */

function usePresence(open: boolean, ms = 180) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    if (!mounted) return;
    setLeaving(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, ms);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ms]);
  return { mounted, leaving };
}

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, onClose]);
}

/** Keeps Tab focus inside `ref` while active, and restores focus to the opener on close. */
function useFocusTrap(active: boolean, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !el) return;
      const f = el.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[href],[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [active, ref]);
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

type Tone = "primary" | "error" | "warning";

const TONE_ICON: Record<Tone, string> = {
  primary: "bg-primary-container text-on-primary-container",
  error: "bg-error-container text-on-error-container",
  warning: "bg-tertiary-container text-on-tertiary-container",
};

export function Dialog({
  open,
  onClose,
  icon,
  tone = "primary",
  title,
  children,
  actions,
  align = "center",
}: {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  tone?: Tone;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  align?: "center" | "start";
}) {
  const { mounted, leaving } = usePresence(open);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEscape(open, onClose);
  useFocusTrap(open, ref);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className={cn("absolute inset-0 bg-scrim/45 backdrop-blur-[2px]", leaving ? "anim-scrim-out" : "anim-scrim")} onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className={cn("relative w-full max-w-sm rounded-[28px] bg-surface-container-high p-6 shadow-elev-3", leaving ? "anim-dialog-out" : "anim-dialog")}
      >
        <div className={cn("flex flex-col gap-3", align === "center" ? "items-center text-center" : "items-start")}>
          <span className={cn("anim-pop grid size-14 place-items-center rounded-[20px]", TONE_ICON[tone])}>{icon}</span>
          <h2 id={titleId} className="text-2xl leading-tight">
            {title}
          </h2>
        </div>
        {children && <div className={cn("mt-3 text-sm text-on-surface-variant", align === "center" && "text-center")}>{children}</div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmIcon,
  tone = "error",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  confirmIcon: ReactNode;
  tone?: Tone;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useSettings();
  const variant: BtnVariant = tone === "error" ? "danger" : "filled";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      tone={tone}
      icon={tone === "primary" ? <Check className="size-7" /> : <TriangleAlert className="size-7" />}
      title={title}
      actions={
        <>
          <Button variant="neutral" icon={<X className="size-4" />} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant={variant} icon={confirmIcon} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Dialog>
  );
}

export function PromptDialog({
  open,
  title,
  label,
  initial,
  confirmLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  initial: string;
  confirmLabel: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const { t } = useSettings();
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initial);
      requestAnimationFrame(() => ref.current?.select());
    }
  }, [open, initial]);

  const submit = () => value.trim() && onSubmit(value.trim());
  return (
    <Dialog
      open={open}
      onClose={onClose}
      icon={<Bookmark className="size-7" />}
      title={title}
      actions={
        <>
          <Button variant="neutral" icon={<X className="size-4" />} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button icon={<Save className="size-4" />} onClick={submit} disabled={!value.trim()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <label className="relative mt-1 block text-left">
        <span className="absolute -top-2 left-3 bg-surface-container-high px-1 text-xs text-primary">{label}</span>
        <input
          ref={ref}
          value={value}
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-14 w-full select-text rounded-xl border-2 border-primary bg-transparent px-4 text-on-surface outline-none"
        />
      </label>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet (side sheet on desktop, bottom sheet on small screens)        */
/* ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  icon,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useSettings();
  const { mounted, leaving } = usePresence(open, 220);
  const ref = useRef<HTMLDivElement>(null);
  useEscape(open, onClose);
  useFocusTrap(open, ref);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div className={cn("absolute inset-0 bg-scrim/40", leaving ? "anim-scrim-out" : "anim-scrim")} onClick={onClose} />
      <aside
        ref={ref}
        role="dialog"
        aria-modal
        aria-label={title}
        className={cn(
          "absolute flex flex-col bg-surface-container-low shadow-elev-3",
          "inset-x-0 bottom-0 max-h-[85%] rounded-t-[28px] md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[400px] md:rounded-[28px]",
          leaving ? "anim-sheet-out" : "anim-sheet",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-outline-variant md:hidden" />
        <header className="flex items-center gap-3 px-5 pb-2 pt-4">
          <span className="grid size-10 place-items-center rounded-full bg-secondary-container text-on-secondary-container">{icon}</span>
          <h2 className="flex-1 text-xl">{title}</h2>
          <IconButton label={t("common.close")} onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">{children}</div>
        {actions && <footer className="flex justify-end gap-2 px-5 pb-5 pt-3">{actions}</footer>}
      </aside>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Select: fully themed dropdown (no native <select>)                  */
/* ------------------------------------------------------------------ */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  hint?: string;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  icon: Icon,
  className,
  maxHeight = 248,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  label: string;
  icon?: LucideIcon;
  className?: string;
  maxHeight?: number;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const { mounted, leaving } = usePresence(open, 140);
  const selected = options.find((o) => o.value === value) ?? options[0];
  const SelIcon = selected?.icon ?? Icon;

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  }, []);

  const openList = () => {
    const r = btn.current!.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const flip = below < Math.min(maxHeight, options.length * 44 + 8) && above > below;
    const max = Math.max(120, Math.min(maxHeight, flip ? above : below));
    setBox(flip ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 6, max } : { left: r.left, width: r.width, top: r.bottom + 6, max });
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!list.current?.contains(n) && !btn.current?.contains(n)) close(false);
    };
    const hide = (e: Event) => {
      if (list.current?.contains(e.target as Node)) return;
      close(false);
    };
    window.addEventListener("pointerdown", away);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [open, close]);

  useLayoutEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, mounted]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(options[active].value);
      close();
    } else if (e.key.length === 1) {
      const next = options.findIndex((o, i) => i > active && o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      const any = next >= 0 ? next : options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (any >= 0) setActive(any);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        ref={btn}
        type="button"
        data-ripple
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKey}
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-xl border bg-surface-container-low px-3.5 text-left text-sm font-medium transition-[border-color,box-shadow,background-color] duration-200 hover:bg-surface-container",
          open ? "border-primary shadow-[0_0_0_1px_var(--md-primary)]" : "border-outline",
        )}
      >
        {SelIcon && <SelIcon className="size-4 shrink-0 text-primary" />}
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-on-surface-variant transition-transform duration-(--spring-spatial-d) ease-emphasized", open && "rotate-180")} />
      </button>
      {mounted &&
        box &&
        createPortal(
          <div
            ref={list}
            id={id}
            role="listbox"
            aria-label={label}
            onKeyDown={onKey}
            className={cn("fixed z-[150] overflow-y-auto overscroll-contain rounded-2xl bg-surface-container-high p-1.5 shadow-elev-3 ring-1 ring-outline-variant", leaving ? "anim-menu-out" : "anim-menu")}
            style={{ left: box.left, width: Math.max(box.width, 180), top: box.top, bottom: box.bottom, maxHeight: box.max, transformOrigin: box.top != null ? "top" : "bottom" }}
          >
            {options.map((o, i) => {
              const OptIcon = o.icon;
              const sel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  data-i={i}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => {
                    onChange(o.value);
                    close();
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors duration-100",
                    sel ? "bg-secondary-container font-semibold text-on-secondary-container" : "text-on-surface",
                    i === active && !sel && "bg-on-surface/8",
                  )}
                >
                  {OptIcon && <OptIcon className="size-4 shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.hint && <span className="block truncate text-xs font-normal text-on-surface-variant">{o.hint}</span>}
                  </span>
                  {sel && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
