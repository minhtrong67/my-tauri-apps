import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { IconBtn } from './Btn';
import { useSettings } from '../lib/store';

type Kind = 'info' | 'success' | 'error' | 'warning';
interface Item { id: number; kind: Kind; title: string; message?: string; closing?: boolean }
type Fn = (title: string, message?: string) => void;
interface Api { info: Fn; success: Fn; error: Fn; warning: Fn }

const Ctx = createContext<Api>(null!);
export const useToast = () => useContext(Ctx);

const STYLE: Record<Kind, { icon: LucideIcon; card: string; chip: string; bar: string }> = {
  info: { icon: Info, card: 'bg-primary-container text-on-primary-container', chip: 'bg-primary text-on-primary', bar: 'bg-primary' },
  success: { icon: CircleCheck, card: 'bg-success-container text-on-success-container', chip: 'bg-success text-on-success', bar: 'bg-success' },
  error: { icon: CircleX, card: 'bg-error-container text-on-error-container', chip: 'bg-error text-on-error', bar: 'bg-error' },
  warning: { icon: TriangleAlert, card: 'bg-warning-container text-on-warning-container', chip: 'bg-warning text-on-warning', bar: 'bg-warning' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const id = useRef(0);
  const { t } = useSettings();

  const dismiss = useCallback((i: number) => {
    setItems((l) => l.map((x) => (x.id === i ? { ...x, closing: true } : x)));
    window.setTimeout(() => setItems((l) => l.filter((x) => x.id !== i)), 230);
  }, []);
  const push = useCallback((kind: Kind): Fn => (title, message) => {
    const n = ++id.current;
    setItems((l) => [...l.slice(-3), { id: n, kind, title, message }]);
  }, []);
  const api = useMemo<Api>(() => ({ info: push('info'), success: push('success'), error: push('error'), warning: push('warning') }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3 max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2" aria-live="polite">
        {items.map((it) => {
          const st = STYLE[it.kind], Icon = st.icon;
          return (
            <div key={it.id} role="status" className={`group pointer-events-auto relative overflow-hidden rounded-3xl p-3.5 pr-2 shadow-lg ring-1 ring-black/5 ${st.card} ${it.closing ? 'anim-toast-out' : 'anim-toast'}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${st.chip}`}><Icon size={20} /></span>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="text-sm font-semibold leading-snug">{it.title}</p>
                  {it.message && <p className="mt-0.5 text-[13px] leading-snug opacity-80">{it.message}</p>}
                </div>
                <IconBtn icon={X} tip={t('common.close')} size={32} onClick={() => dismiss(it.id)} />
              </div>
              <span
                className={`absolute inset-x-0 bottom-0 h-1 origin-left opacity-60 group-hover:[animation-play-state:paused] ${st.bar}`}
                style={{ animation: `progress ${it.kind === 'error' ? 6500 : 4200}ms linear forwards` }}
                onAnimationEnd={() => dismiss(it.id)}
              />
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
