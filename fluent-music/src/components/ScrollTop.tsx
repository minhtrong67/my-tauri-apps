import { useEffect, useState, type RefObject } from 'react';
import { tr } from '../lib/i18n';
import { IconButton } from './ui';

/** Floating "back to top" button for a scrolling box: appears once the content is scrolled far enough */
export function ScrollTop({ target, threshold = 480 }: { target: RefObject<HTMLElement>; threshold?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const on = () => setShow(el.scrollTop > threshold);
    on();
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [target, threshold]);
  return (
    <div className={`absolute right-6 bottom-6 z-30 transition-all duration-slow ease-decel ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90 pointer-events-none'}`}>
      <IconButton icon="arrow_upward" variant="tonal" size="lg" title={tr('scrollTop')} onClick={() => target.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="!rounded-lg shadow-lg !bg-surface-container-lowest" />
    </div>
  );
}
