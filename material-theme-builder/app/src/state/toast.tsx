import { createContext, useCallback, useContext, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { copyText } from "../lib/tauri";
import { uid } from "../lib/utils";
import { useSettings } from "./settings";

export type ToastType = "info" | "success" | "warning" | "error";

interface ToastAction {
  label: string;
  run: () => void;
}

interface ToastItem {
  id: string;
  type: ToastType;
  text: string;
  duration: number;
  action?: ToastAction;
  leaving?: boolean;
}

interface Opts {
  type?: ToastType;
  action?: ToastAction;
}

interface ToastCtx {
  push: (text: string, opts?: Opts) => void;
  info: (text: string, action?: ToastAction) => void;
  success: (text: string, action?: ToastAction) => void;
  warning: (text: string, action?: ToastAction) => void;
  error: (text: string, action?: ToastAction) => void;
  copy: (text: string, label?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const ICONS: Record<ToastType, LucideIcon> = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleX };
const DURATION: Record<ToastType, number> = { info: 3200, success: 2600, warning: 4200, error: 5200 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});
  const { t } = useSettings();

  const dismiss = useCallback((id: string) => {
    window.clearTimeout(timers.current[id]);
    setItems((list) => list.map((i) => (i.id === id ? { ...i, leaving: true } : i)));
    window.setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 220);
  }, []);

  const push = useCallback<ToastCtx["push"]>(
    (text, opts) => {
      const id = uid();
      const type = opts?.type ?? "info";
      const duration = opts?.action ? Math.max(DURATION[type], 6000) : DURATION[type];
      setItems((list) => [...list.slice(-3), { id, type, text, duration, action: opts?.action }]);
      timers.current[id] = window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo<ToastCtx>(() => {
    const typed = (type: ToastType) => (text: string, action?: ToastAction) => push(text, { type, action });
    return {
      push,
      info: typed("info"),
      success: typed("success"),
      warning: typed("warning"),
      error: typed("error"),
      copy: (text, label) => {
        void copyText(text).then((ok) => (ok ? push(t("toast.copied", { value: label ?? text }), { type: "success" }) : push(t("toast.copyFailed"), { type: "error" })));
      },
    };
  }, [push, t]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {items.map((i) => {
          const Icon = ICONS[i.type];
          return (
            <div
              key={i.id}
              role={i.type === "error" ? "alert" : "status"}
              className={`toast toast-${i.type} pointer-events-auto relative flex min-h-12 w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl py-2 pl-3 pr-2 text-sm shadow-elev-3 ${i.leaving ? "anim-toast-out" : "anim-toast-in"}`}
            >
              <span className="toast-badge grid size-8 shrink-0 place-items-center rounded-full">
                <Icon className="size-[18px]" />
              </span>
              <span className="flex-1 py-1 font-medium">{i.text}</span>
              {i.action && (
                <button
                  data-ripple
                  className="toast-action rounded-full px-3 py-1.5 text-sm font-semibold"
                  onClick={() => {
                    i.action?.run();
                    dismiss(i.id);
                  }}
                >
                  {i.action.label}
                </button>
              )}
              <button data-ripple data-tip={t("common.close")} aria-label={t("common.close")} className="grid size-8 shrink-0 place-items-center rounded-full opacity-70 hover:opacity-100" onClick={() => dismiss(i.id)}>
                <X className="size-4" />
              </button>
              <span className="toast-progress absolute inset-x-0 bottom-0 h-[3px] origin-left" style={{ animationDuration: `${i.duration}ms` } as CSSProperties} />
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
