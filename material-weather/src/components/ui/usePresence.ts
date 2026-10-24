import { useEffect, useRef, useState } from 'react';

/** Keeps a component mounted while its exit animation plays. */
export function usePresence(open: boolean, ms = 220) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const id = window.setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(id);
  }, [open, ms]);
  return { mounted: mounted || open, closing: !open };
}

const stack: symbol[] = [];
/** Modal behaviour: Esc closes the top-most layer, Tab is trapped, focus is restored on close. */
export function useModal(active: boolean, onClose: () => void, root: React.RefObject<HTMLElement | null>) {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!active) return;
    const id = Symbol('modal');
    stack.push(id);
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(root.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    const t = window.setTimeout(() => (root.current?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus({ preventScroll: true }), 30);
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') { e.preventDefault(); cb.current(); }
      else if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
      prev?.focus?.({ preventScroll: true });
    };
  }, [active, root]);
}
export const isModalOpen = () => stack.length > 0;
