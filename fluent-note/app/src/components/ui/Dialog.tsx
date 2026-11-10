import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, type IconType } from "./icons";
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
  icon?: IconType;
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
  /** "top" docks the dialog near the top of the window (command palette). */
  placement?: "center" | "top";
}

const sizes = { sm: "max-w-[26rem]", md: "max-w-[32rem]", lg: "max-w-[40rem]", xl: "max-w-[54rem]" };
/** Colour of the glyph next to the title (Fluent uses a plain coloured icon, not a tinted tile). */
const tones = { primary: "text-brand", error: "text-err", warning: "text-warn" };

export function Dialog({
  open, onClose, title, subtitle, icon: Icon, iconTone = "primary", size = "md", dismissable = true, hideClose,
  footer, children, className, bodyClassName, headerless, placement = "center",
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
      className={cn(
        "fixed inset-0 z-[100] grid justify-items-center p-3 sm:p-6",
        placement === "top" ? "content-start pt-[12vh]" : "place-items-center",
        closing ? "anim-fade-out" : "anim-fade-in",
      )}
      style={{ background: "var(--fl-scrim)" }}
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
          "relative flex max-h-full w-full flex-col overflow-hidden rounded-lg border border-stroke bg-dialog text-fg shadow-fl64 outline-none",
          sizes[size],
          closing ? "anim-pop-out" : "anim-pop-in",
          className,
        )}
      >
        {!headerless && (
          <div className="flex flex-none items-start gap-3 px-6 pb-4 pt-6">
            {Icon && <Icon size={22} strokeWidth={1.6} className={cn("mt-0.5 flex-none", tones[iconTone])} aria-hidden />}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-semibold leading-7">{title}</h2>
              {subtitle && <p className="truncate text-sm text-fg2">{subtitle}</p>}
            </div>
            {!hideClose && <IconButton icon={X} label={t("common.close")} kbd="Esc" small className="-mr-2 -mt-1" onClick={onClose} />}
          </div>
        )}
        <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>{children}</div>
        {footer && <div className="flex flex-none flex-wrap items-center justify-end gap-2 border-t border-divider bg-recess px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
