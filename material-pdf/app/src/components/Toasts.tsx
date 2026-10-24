import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useStore, useT, type ToastType } from "../lib/store";

const ICON = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert } as const;
const LIFE: Record<ToastType, number> = { info: 3600, success: 3600, warning: 4800, error: 6000 };

/** Stacked, typed toasts (info / success / warning / error). Colors come from --toast-* tokens, so they follow light/dark. */
export function ToastHost() {
  const t = useT();
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex w-[min(560px,92vw)] -translate-x-1/2 flex-col-reverse items-stretch gap-2" aria-live="polite">
      {toasts.map((x) => {
        const Icon = ICON[x.type];
        return (
          <div key={x.id} role={x.type === "error" ? "alert" : "status"} data-type={x.type}
            className="toast pointer-events-auto relative flex min-h-12 items-center gap-3 overflow-hidden rounded-2xl border border-(--toast-ic)/25 bg-(--toast-bg) py-2 pr-2 pl-3.5 text-(--toast-fg) shadow-(--elev3)"
            style={{ ["--life" as any]: `${LIFE[x.type]}ms` }}>
            <span className="toast-ico grid size-8 shrink-0 place-items-center rounded-full bg-(--toast-ic) text-(--toast-bg)"><Icon size={18} strokeWidth={2.4} /></span>
            <span className="min-w-0 flex-1 text-[.92rem] leading-snug font-medium break-words">{x.msg}</span>
            <button className="icon-btn ripple sm shrink-0" style={{ color: "var(--toast-fg)" }} data-tip={t("close")} aria-label={t("close")} onClick={() => dismiss(x.id)}><X size={16} /></button>
            <i className="toast-life absolute inset-x-0 bottom-0 h-[3px] origin-left bg-(--toast-ic)/70" />
          </div>
        );
      })}
    </div>
  );
}
