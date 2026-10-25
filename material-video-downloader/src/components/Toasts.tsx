import { X } from "lucide-react";
import { useUi } from "../store/ui";
import { cx } from "./ui";

export function Toasts() {
  const { toasts, dismiss } = useUi();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "anim-toast pointer-events-auto flex min-h-12 w-full max-w-md items-center gap-3 rounded-[20px] py-2 pr-2 pl-5 text-sm shadow-xl",
            t.tone === "error" ? "bg-error text-on-error" : "bg-inverse-surface text-inverse-on-surface",
          )}
        >
          <span className="min-w-0 flex-1 break-words" data-selectable>{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
              className="ripple-host h-9 shrink-0 rounded-full px-3 font-medium text-inverse-primary transition-colors hover:bg-white/10"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="flex size-9 shrink-0 items-center justify-center rounded-full opacity-80 transition-colors hover:bg-white/10">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
