import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, X, type LucideIcon } from "lucide-react";
import { Button, IconButton } from "./Button";
import { useI18n } from "../../lib/i18n";

function useMount(open: boolean, ms = 260) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))); return () => cancelAnimationFrame(r); }
    setShown(false);
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { mounted, shown };
}

function useModal(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => (panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>("button"))?.focus({ preventScroll: true }), 60);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("button:not(:disabled),input,[tabindex]:not([tabindex='-1'])")];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => { clearTimeout(t); document.removeEventListener("keydown", key, true); prev?.focus?.({ preventScroll: true }); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}

interface DialogProps { open: boolean; onClose: () => void; icon?: LucideIcon; title: string; children?: ReactNode; actions?: ReactNode; centered?: boolean; tone?: "default" | "danger" }
/** Hộp thoại M3 Expressive: icon, tiêu đề, nội dung, hàng nút hành động (nhãn + icon + màu). */
export function Dialog({ open, onClose, icon: Icon, title, children, actions, centered, tone = "default" }: DialogProps) {
  const { mounted, shown } = useMount(open);
  const panel = useRef<HTMLDivElement>(null);
  useModal(open, onClose, panel);
  if (!mounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[100] grid place-items-center p-4 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`} style={{ background: "rgb(0 0 0 / .42)" }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-m3-xl bg-surface-high p-6 shadow-e3 transition-all duration-[360ms] ease-spring ${shown ? "scale-100 opacity-100" : "scale-90 opacity-0"} ${centered ? "items-center text-center" : ""}`}>
        {Icon && <div className={`mb-3 grid h-14 w-14 place-items-center rounded-m3-lg ${tone === "danger" ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container"}`}><Icon className="h-7 w-7" /></div>}
        <h2 className="t-headline !text-2xl">{title}</h2>
        <div className="t-body mt-2 min-h-0 flex-1 overflow-y-auto text-on-surface-variant">{children}</div>
        {actions && <div className={`mt-6 flex flex-wrap gap-2 ${centered ? "justify-center" : "justify-end"}`}>{actions}</div>}
      </div>
    </div>, document.body);
}

interface ConfirmProps { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; confirmIcon?: LucideIcon; destructive?: boolean; icon?: LucideIcon }
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, confirmIcon, destructive, icon }: ConfirmProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} icon={icon} title={title} tone={destructive ? "danger" : "default"}
      actions={<>
        <Button variant={destructive ? "tonal" : "errorTonal"} icon={X} onClick={onClose}>{t("b.cancel")}</Button>
        <Button data-autofocus variant={destructive ? "error" : "filled"} icon={confirmIcon ?? Check} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel ?? t("b.confirm")}</Button>
      </>}>{body}</Dialog>
  );
}

interface SheetProps { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; icon?: LucideIcon }
/** Side sheet trượt từ bên phải (bottom sheet trên màn hình hẹp). */
export function Sheet({ open, onClose, title, subtitle, children, footer, icon: Icon }: SheetProps) {
  const { t } = useI18n();
  const { mounted, shown } = useMount(open, 380);
  const panel = useRef<HTMLDivElement>(null);
  useModal(open, onClose, panel);
  if (!mounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[100] flex justify-end transition-opacity duration-300 max-sm:items-end ${shown ? "opacity-100" : "opacity-0"}`} style={{ background: "rgb(0 0 0 / .42)" }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title}
        className={`sheet-enter flex h-full w-full max-w-md flex-col rounded-l-m3-xl bg-surface-low shadow-e3 max-sm:h-[85%] max-sm:max-w-none max-sm:rounded-l-none max-sm:rounded-t-m3-xl ${shown ? "translate-x-0 max-sm:translate-y-0" : "translate-x-full max-sm:translate-x-0 max-sm:translate-y-full"}`}>
        <div className="flex items-center gap-3 p-5 pb-3">
          {Icon && <div className="grid h-11 w-11 place-items-center rounded-m3-md bg-primary-container text-on-primary-container"><Icon className="h-6 w-6" /></div>}
          <div className="min-w-0 flex-1"><h2 className="t-title !text-xl truncate">{title}</h2>{subtitle && <p className="t-small truncate text-on-surface-variant">{subtitle}</p>}</div>
          <IconButton icon={X} label={t("b.close")} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 p-5 pt-3">{footer}</div>}
      </div>
    </div>, document.body);
}
