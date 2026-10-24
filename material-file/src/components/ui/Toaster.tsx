import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { dismissToast, useUI, type ToastKind } from '../../store/ui';

const KIND: Record<ToastKind, { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: 'bg-[color-mix(in_oklab,var(--info)_20%,var(--surface-container-high))] text-on-surface [--accent:var(--info)]' },
  success: { icon: CheckCircle2, cls: 'bg-[color-mix(in_oklab,var(--success)_20%,var(--surface-container-high))] text-on-surface [--accent:var(--success)]' },
  warning: { icon: AlertTriangle, cls: 'bg-[color-mix(in_oklab,var(--warning)_22%,var(--surface-container-high))] text-on-surface [--accent:var(--warning)]' },
  error: { icon: XCircle, cls: 'bg-[color-mix(in_oklab,var(--error)_20%,var(--surface-container-high))] text-on-surface [--accent:var(--error)]' }
};
export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-14 left-1/2 z-[400] flex w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2 flex-col items-stretch gap-2" aria-live="polite">
      {toasts.map((t) => {
        const k = KIND[t.kind]; const Icon = k.icon;
        return (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl py-2.5 pr-2 pl-3 shadow-[var(--shadow-3)] ring-1 ring-[var(--accent)]/40 ${k.cls} ${t.leaving ? 'animate-[toast-out_.25s_forwards]' : 'animate-[toast-in_.5s_var(--spring)]'}`}>
            <Icon className="size-5 flex-none text-[var(--accent)]" strokeWidth={2.3} />
            <span className="min-w-0 flex-1 break-words font-medium">{t.msg}</span>
            <button type="button" aria-label="Close" onClick={() => dismissToast(t.id)} className="ibtn sm ripple !size-8"><X /></button>
          </div>
        );
      })}
    </div>
  );
}
