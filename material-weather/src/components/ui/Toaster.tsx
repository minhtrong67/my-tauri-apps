import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { useToasts, type ToastItem } from '../../lib/ui';
import { Tooltip } from './Tooltip';
import { useT } from '../../lib/i18n';

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleX } as const;

function Toast({ item }: { item: ToastItem }) {
  const dismiss = useToasts((s) => s.dismiss);
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const hover = useRef(false);
  const close = () => { setLeaving(true); setTimeout(() => dismiss(item.id), 220); };
  useEffect(() => {
    let left = item.duration;
    const id = setInterval(() => { if (!hover.current && (left -= 100) <= 0) { clearInterval(id); close(); } }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const Icon = ICONS[item.type];
  const c = (k: 'bg' | 'fg' | 'ac') => `var(--toast-${item.type}-${k})`;
  return (
    <div role={item.type === 'error' ? 'alert' : 'status'} onPointerEnter={() => (hover.current = true)} onPointerLeave={() => (hover.current = false)}
      style={{ background: c('bg'), color: c('fg') }}
      className={`pointer-events-auto relative flex min-w-72 max-w-[min(34rem,92vw)] items-center gap-3 overflow-hidden rounded-2xl py-3 pl-4 pr-2 shadow-e3 ${leaving ? 'animate-[toastOut_0.22s_ease-in_both]' : 'animate-[toastIn_0.35s_var(--ease-emphasized)_both]'}`}>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: c('ac') }} />
      <Icon size={22} style={{ color: c('ac') }} className="ml-1 shrink-0" />
      <span className="flex-1 text-sm font-medium">{item.message}</span>
      {item.action && (
        <button className="ripple rounded-full px-3 py-1.5 text-sm font-bold" style={{ color: c('ac') }} onClick={() => { item.action!.run(); close(); }}>{item.action.label}</button>
      )}
      <Tooltip label={t('action.close')} side="top">
        <button aria-label={t('action.close')} onClick={close} className="ripple grid size-8 place-items-center rounded-full opacity-70 hover:opacity-100"><X size={16} /></button>
      </Tooltip>
    </div>
  );
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[600] flex flex-col items-center gap-2">{items.map((i) => <Toast key={i.id} item={i} />)}</div>,
    document.body,
  );
}
