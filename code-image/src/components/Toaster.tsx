import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useToasts, type ToastVariant } from "../lib/toast";
import { useT } from "../lib/i18n";
import { cx } from "./ui";

const styles: Record<ToastVariant, { box: string; dot: string; icon: React.ReactNode }> = {
  info: { box: "bg-info-container text-on-info-container", dot: "bg-info text-on-info", icon: <Info size={18} /> },
  success: { box: "bg-success-container text-on-success-container", dot: "bg-success text-on-success", icon: <CircleCheck size={18} /> },
  warning: { box: "bg-warning-container text-on-warning-container", dot: "bg-warning text-on-warning", icon: <TriangleAlert size={18} /> },
  error: { box: "bg-error-container text-on-error-container", dot: "bg-error text-on-error", icon: <CircleAlert size={18} /> },
};

/** Stacked toasts with 4 variants (info / success / warning / error); colours adapt to light and dark. */
export function Toaster() {
  const t = useT();
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6">
      {items.map((x) => {
        const st = styles[x.variant];
        return (
          <div key={x.id} role={x.variant === "error" ? "alert" : "status"}
            className={cx("pointer-events-auto relative flex w-[min(92vw,440px)] animate-toastIn items-center gap-3 overflow-hidden rounded-2xl py-2.5 pl-2.5 pr-2 shadow-e3 ring-1 ring-black/5", st.box)}>
            <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full", st.dot)}>{st.icon}</span>
            <span className="min-w-0 flex-1 break-words text-sm leading-snug">{x.message}</span>
            {x.action && (
              <button onClick={() => { x.action!.run(); dismiss(x.id); }}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold underline-offset-2 transition-colors hover:bg-on-surface/10">{x.action.label}</button>
            )}
            <button onClick={() => dismiss(x.id)} aria-label={t("close")}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full opacity-70 transition hover:bg-on-surface/10 hover:opacity-100"><X size={16} /></button>
            <span className="absolute inset-x-0 bottom-0 h-[3px] origin-left animate-shrink bg-current opacity-25" style={{ animationDuration: `${x.ms}ms` }} />
          </div>
        );
      })}
    </div>
  );
}
