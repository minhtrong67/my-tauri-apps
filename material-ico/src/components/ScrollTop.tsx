import { useEffect, useState, type RefObject } from 'react';
import { ArrowUp } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { useSettings } from '../lib/store';

/** Floating button that appears once the content has been scrolled down. */
export function ScrollTop({ target }: { target: RefObject<HTMLElement> }) {
  const { t } = useSettings();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const on = () => setShow(el.scrollTop > 280);
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [target]);
  return (
    <div className={`absolute bottom-5 right-5 z-30 transition-all duration-300 ease-spring ${show ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-6 scale-50 opacity-0'}`}>
      <Tooltip label={t('common.scrollTop')} side="left">
        <button
          type="button" aria-label={t('common.scrollTop')} tabIndex={show ? 0 : -1}
          onClick={() => target.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="ripple flex size-14 items-center justify-center rounded-[20px] bg-primary-container text-on-primary-container shadow-lg transition-[border-radius,transform] duration-300 ease-spring hover:rounded-full active:scale-90"
        >
          <ArrowUp size={24} strokeWidth={2.4} />
        </button>
      </Tooltip>
    </div>
  );
}
