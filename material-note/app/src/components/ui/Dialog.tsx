import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { usePresence } from "./Popover";
import { IconButton } from "./Button";
import { useT } from "../../lib/i18n";

const stack: symbol[] = [];

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconTone?: "primary" | "error" | "warning";
  size?: "sm" | "md" | "lg" | "xl";
  /** Closing via scrim click / Escape (disabled for destructive confirmations) */
  dismissable?: boolean;
  hideClose?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerless?: boolean;
}

const sizes = { sm: "max-w-[26rem]", md: "max-w-[32rem]", lg: "max-w-[40rem]", xl: "max-w-[54rem]" };
const tones = {
  primary: "bg-primary-container text-on-primary-container",
  error: "bg-error-container text-on-error-container",
  warning: "bg-warning-container text-on-warning-container",
};

export function Dialog({
  open, onClose, title, subtitle, icon: Icon, iconTone = "primary", size = "md", dismissable = true, hideClose,
  footer, children, className, bodyClassName, headerless,
}: DialogProps) {
  const t = useT();
  const { mounted, closing } = usePresence(open, 170);
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(Symbol("dialog"));
  const returnFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const me = id.current;
    stack.push(me);
    returnFocus.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const root = ref.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>("[data-autofocus]") ?? root;
      target.focus({ preventScroll: true });
      if (target instanceof HTMLInputElement) target.select();
    });
    const key = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== me) return;
      if (e.key === "Escape" && dismissable) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, [tabindex]:not([tabindex="-1"]), a[href]')].filter((n) => n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", key, true);
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
      const back = returnFocus.current;
      if (back && back.isConnected) setTimeout(() => back.focus({ preventScroll: true }), 0);
    };
  }, [open, dismissable]);

  if (!mounted) return null;
  return createPortal(
    <div
      className={cn("fixed inset-0 z-[100] grid place-items-center p-3 sm:p-6", closing ? "anim-fade-out" : "anim-fade-in")}
      style={{ background: "color-mix(in srgb, var(--md-scrim) 52%, transparent)", backdropFilter: "blur(3px)" }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && dismissable) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-full w-full flex-col overflow-hidden rounded-[1.75rem] bg-surface-low text-on-surface shadow-e5 outline-none",
          sizes[size],
          closing ? "anim-pop-out" : "anim-pop-in",
          className,
        )}
      >
        {!headerless && (
          <div className="flex flex-none items-center gap-3.5 px-6 pb-3 pt-5">
            {Icon && (
              <span className={cn("grid h-11 w-11 flex-none place-items-center rounded-[1rem]", tones[iconTone])}>
                <Icon size={22} strokeWidth={2.2} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[1.125rem] font-semibold leading-tight">{title}</h2>
              {subtitle && <p className="truncate text-[0.8125rem] text-on-surface-variant">{subtitle}</p>}
            </div>
            {!hideClose && <IconButton icon={X} label={t("common.close")} kbd="Esc" onClick={onClose} />}
          </div>
        )}
        <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>{children}</div>
        {footer && <div className="flex flex-none flex-wrap items-center justify-end gap-2 px-6 pb-5 pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
