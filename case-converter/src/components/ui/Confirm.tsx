import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Check, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { useSettings } from '@/lib/settings';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  confirmIcon?: LucideIcon;
  tone?: 'danger' | 'primary';
  icon?: LucideIcon;
}

const Ctx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);
export const useConfirm = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('ConfirmProvider missing');
  return c;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useSettings();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((res) => { resolver.current = res; });
  }, []);
  const finish = (v: boolean) => {
    setOpen(false);
    resolver.current?.(v);
    resolver.current = null;
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal
        open={open}
        onClose={() => finish(false)}
        size="sm"
        title={opts?.title ?? ''}
        icon={opts?.icon ?? TriangleAlert}
        footer={
          <>
            <Button variant="tonal" icon={X} onClick={() => finish(false)}>{t('cancel')}</Button>
            <Button variant={opts?.tone === 'primary' ? 'filled' : 'danger'} icon={opts?.confirmIcon ?? Check} onClick={() => finish(true)}>
              {opts?.confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-on-surface-variant">{opts?.message}</p>
      </Modal>
    </Ctx.Provider>
  );
}
