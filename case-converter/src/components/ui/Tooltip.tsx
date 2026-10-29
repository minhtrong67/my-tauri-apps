import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Tip { text: string; kbd?: string; rect: DOMRect }

/** One global tooltip. Any element with a data-tip attribute (and optional data-tip-kbd) gets it on hover or keyboard focus. */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const current = useRef<Element | null>(null);
  const lastShown = useRef(0);

  useEffect(() => {
    const hide = () => {
      clearTimeout(timer.current);
      current.current = null;
      setTip(null);
    };
    const show = (el: Element) => {
      const text = el.getAttribute('data-tip');
      if (!text || !el.isConnected) return;
      lastShown.current = Date.now();
      setTip({ text, kbd: el.getAttribute('data-tip-kbd') ?? undefined, rect: el.getBoundingClientRect() });
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !(e.target instanceof Element)) return;
      const el = e.target.closest('[data-tip]');
      if (el === current.current) return;
      hide();
      if (!el) return;
      current.current = el;
      timer.current = window.setTimeout(() => show(el), Date.now() - lastShown.current < 600 ? 0 : 380);
    };
    const focus = (e: FocusEvent) => {
      if (!(e.target instanceof Element) || !e.target.matches(':focus-visible')) return;
      const el = e.target.closest('[data-tip]');
      if (el) {
        hide();
        current.current = el;
        show(el);
      }
    };
    document.addEventListener('pointerover', over, true);
    document.addEventListener('focusin', focus, true);
    for (const ev of ['pointerdown', 'keydown', 'scroll', 'wheel']) window.addEventListener(ev, hide, true);
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    return () => {
      document.removeEventListener('pointerover', over, true);
      document.removeEventListener('focusin', focus, true);
      for (const ev of ['pointerdown', 'keydown', 'scroll', 'wheel']) window.removeEventListener(ev, hide, true);
      document.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
      clearTimeout(timer.current);
    };
  }, []);

  useLayoutEffect(() => {
    const el = box.current;
    if (!tip || !el) return;
    const { rect } = tip;
    // The popover top layer keeps the tooltip above open dialogs and sheets.
    if (!el.matches(':popover-open')) el.showPopover?.();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = rect.left + rect.width / 2 - w / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    const below = rect.top - h - 10 < 8;
    const y = below ? rect.bottom + 10 : rect.top - h - 10;
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    el.style.transformOrigin = below ? 'top' : 'bottom';
    el.style.visibility = 'visible';
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      ref={box}
      popover="manual"
      role="tooltip"
      style={{ visibility: 'hidden' }}
      className="pointer-events-none fixed bottom-auto left-0 right-auto top-0 m-0 overflow-visible border-0 bg-transparent p-0"
    >
      <div className="pop flex max-w-72 items-center gap-2 rounded-md bg-inverse-surface px-3 py-1.5 text-xs font-medium text-inverse-on-surface shadow-e2">
        <span>{tip.text}</span>
        {tip.kbd && <kbd className="rounded-xs bg-inverse-on-surface/15 px-1.5 py-0.5 font-sans text-[0.6875rem]">{tip.kbd}</kbd>}
      </div>
    </div>
  );
}
