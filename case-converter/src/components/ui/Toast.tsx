import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { useSettings } from '@/lib/settings';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export interface ToastInput {
  type?: ToastType;
  message: string;
  action?: { label: string; icon?: LucideIcon; onClick: () => void };
  duration?: number;
}
interface ToastItem extends ToastInput { id: number; type: ToastType; leaving: boolean }

const STYLE: Record<ToastType, { box: string; Icon: LucideIcon }> = {
  info: { box: 'bg-info-container text-on-info-container', Icon: Info },
  success: { box: 'bg-success-container text-on-success-container', Icon: CircleCheck },
  warning: { box: 'bg-warning-container text-on-warning-container', Icon: TriangleAlert },
  error: { box: 'bg-error-container text-on-error-container', Icon: CircleX },
};

const Ctx = createContext<((t: ToastInput) => void) | null>(null);
export const useToast = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('ToastProvider missing');
  return c;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useSettings();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const layer = useRef<HTMLDivElement>(null);

  const dismiss = useCallback((id: number) => {
    setItems((p) => p.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 240);
  }, []);

  const push = useCallback((input: ToastInput) => {
    const id = ++seq.current;
    setItems((p) => [...p.filter((x) => !x.leaving).slice(-2), { ...input, id, type: input.type ?? 'info', leaving: false }]);
  }, []);

  // Keep the stack in the top layer so toasts also show above open dialogs and sheets.
  useEffect(() => {
    const el = layer.current;
    if (!el || !items.length) return;
    if (el.matches(':popover-open')) el.hidePopover();
    el.showPopover?.();
  }, [items.length, items[items.length - 1]?.id]);

  const value = useMemo(() => push, [push]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        ref={layer}
        popover="manual"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 left-0 right-0 top-auto m-0 flex w-full flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-0 md:bottom-6"
      >
        {items.map((it) => {
          const { box, Icon } = STYLE[it.type];
          const ms = it.duration ?? (it.action ? 6000 : it.type === 'error' ? 5500 : 3200);
          return (
            <div
              key={it.id}
              role={it.type === 'error' ? 'alert' : 'status'}
              style={{ animation: `${it.leaving ? 'toast-out .22s var(--ease-emphasized)' : 'toast-in .55s var(--ease-bounce)'} both` }}
              className={cn('group pointer-events-auto relative flex w-[min(32rem,calc(100vw-1.5rem))] items-center gap-3 overflow-hidden rounded-[1.25rem] py-2.5 pl-3 pr-2 shadow-e3', box)}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-current/12">
                <Icon className="size-5" strokeWidth={2.2} aria-hidden />
              </span>
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{it.message}</p>
              {it.action && (
                <Button
                  size="sm" variant="text" icon={it.action.icon} className="text-current"
                  onClick={() => { it.action?.onClick(); dismiss(it.id); }}
                >
                  {it.action.label}
                </Button>
              )}
              <button
                type="button" aria-label={t('close')} data-tip={t('close')}
                onClick={() => dismiss(it.id)}
                className="rip state grid size-8 shrink-0 place-items-center rounded-full outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
              {!it.leaving && (
                <span
                  className="absolute inset-x-0 bottom-0 h-1 origin-left bg-current opacity-40 group-hover:[animation-play-state:paused]"
                  style={{ animation: `shrink ${ms}ms linear forwards` }}
                  onAnimationEnd={() => dismiss(it.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
