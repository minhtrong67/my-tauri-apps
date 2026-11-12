import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dismiss20Regular } from "@fluentui/react-icons";
import { Button, IconButton } from "./Button";
import { useI18n } from "../../lib/i18n";

function useMount(open: boolean, ms = 200) {
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

/** Bẫy focus + Esc cho hộp thoại, trả focus về phần tử trước đó khi đóng. */
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

/** Lớp phủ "smoke" bắt đầu dưới thanh tiêu đề để nút cửa sổ luôn bấm được. */
const SCRIM = "fixed inset-x-0 bottom-0 top-8 z-[100] bg-smoke transition-opacity duration-150";

interface DialogProps { open: boolean; onClose: () => void; title: string; children?: ReactNode; actions?: ReactNode; wide?: boolean }
/** ContentDialog của Fluent: tiêu đề, nội dung, thanh nút bấm bằng nhau ở đáy. */
export function Dialog({ open, onClose, title, children, actions, wide }: DialogProps) {
  const { mounted, shown } = useMount(open);
  const panel = useRef<HTMLDivElement>(null);
  useModal(open, onClose, panel);
  if (!mounted) return null;
  return createPortal(
    <div className={`${SCRIM} grid place-items-center p-4 ${shown ? "opacity-100" : "opacity-0"}`} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-ovl border border-flyout-line bg-flyout shadow-dlg transition-[transform,opacity] duration-200 ease-out ${wide ? "max-w-[520px]" : "max-w-[440px]"} ${shown ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <h2 className="text-subtitle font-semibold">{title}</h2>
          <div className="mt-3 text-body text-fg">{children}</div>
        </div>
        {actions && <div className="flex flex-none gap-2 border-t border-line bg-solid p-6 [&>*]:flex-1">{actions}</div>}
      </div>
    </div>, document.body);
}

interface ConfirmProps { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; destructive?: boolean }
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, destructive }: ConfirmProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={title}
      actions={<>
        <Button data-autofocus variant={destructive ? "danger" : "accent"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel ?? t("b.confirm")}</Button>
        <Button onClick={onClose}>{t("b.cancel")}</Button>
      </>}>{body}</Dialog>
  );
}

interface PanelProps { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }
/** Panel trượt từ bên phải (dùng cho danh sách playlist). */
export function SidePanel({ open, onClose, title, subtitle, children, footer }: PanelProps) {
  const { t } = useI18n();
  const { mounted, shown } = useMount(open, 250);
  const panel = useRef<HTMLDivElement>(null);
  useModal(open, onClose, panel);
  if (!mounted) return null;
  return createPortal(
    <div className={`${SCRIM} flex justify-end ${shown ? "opacity-100" : "opacity-0"}`} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title}
        className={`flex h-full w-full max-w-[440px] flex-col rounded-l-ovl border-l border-flyout-line bg-flyout shadow-dlg transition-transform duration-[250ms] ease-out ${shown ? "translate-x-0" : "translate-x-10"}`}>
        <div className="flex items-start gap-3 px-6 pb-3 pt-5">
          <div className="min-w-0 flex-1"><h2 className="truncate text-subtitle font-semibold">{title}</h2>{subtitle && <p className="truncate text-cap text-fg-2">{subtitle}</p>}</div>
          <IconButton icon={Dismiss20Regular} label={t("b.close")} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-1">{children}</div>
        {footer && <div className="flex flex-none flex-wrap justify-end gap-2 border-t border-line bg-solid p-4">{footer}</div>}
      </div>
    </div>, document.body);
}
