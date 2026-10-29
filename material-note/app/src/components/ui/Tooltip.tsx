import { useEffect, useRef, useState } from "react";

/* Custom tooltip: any element with data-tip="Label" (and optional data-kbd="Ctrl+S") gets a themed tooltip.
 * One delegated listener keeps this free for hundreds of elements. */
interface TipState {
  text: string;
  kbd?: string;
  x: number;
  y: number;
  place: "top" | "bottom";
  visible: boolean;
}

const SHOW_DELAY = 420;

export function TooltipHost() {
  const [tip, setTip] = useState<TipState | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const target = useRef<HTMLElement | null>(null);
  const lastShown = useRef(0);

  useEffect(() => {
    const hide = () => {
      clearTimeout(timer.current);
      target.current = null;
      setTip(null);
    };
    const show = (el: HTMLElement, instant: boolean) => {
      clearTimeout(timer.current);
      const open = () => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect();
        const pref = el.dataset.tipPos === "top" ? "top" : "bottom";
        const place = pref === "bottom" && r.bottom + 56 > window.innerHeight ? "top" : pref === "top" && r.top < 56 ? "bottom" : pref;
        setTip({
          text: el.dataset.tip || "",
          kbd: el.dataset.kbd,
          x: r.left + r.width / 2,
          y: place === "bottom" ? r.bottom + 8 : r.top - 8,
          place,
          visible: false,
        });
        lastShown.current = Date.now();
      };
      // moving between neighbouring buttons shows the next tooltip immediately
      if (instant || Date.now() - lastShown.current < 500) open();
      else timer.current = window.setTimeout(open, SHOW_DELAY);
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = (e.target as HTMLElement | null)?.closest?.("[data-tip]") as HTMLElement | null;
      if (el === target.current) return;
      if (!el) {
        if (target.current) hide();
        return;
      }
      target.current = el;
      show(el, false);
    };
    const focus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el?.dataset?.tip && el.matches?.(":focus-visible")) {
        target.current = el;
        show(el, true);
      }
    };
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("scroll", hide, true);
    document.addEventListener("keydown", hide, true);
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", hide);
      window.removeEventListener("blur", hide);
      window.removeEventListener("scroll", hide, true);
      document.removeEventListener("keydown", hide, true);
    };
  }, []);

  // clamp horizontally once the real width is known, then reveal
  useEffect(() => {
    const box = boxRef.current;
    if (!tip || !box || tip.visible) return;
    const w = box.offsetWidth;
    const x = Math.min(Math.max(8 + w / 2, tip.x), window.innerWidth - 8 - w / 2);
    setTip({ ...tip, x, visible: true });
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      ref={boxRef}
      role="tooltip"
      className="pointer-events-none fixed z-[200] flex items-center gap-2 rounded-xl bg-inverse-surface px-3 py-1.5 text-[0.75rem] font-medium text-inverse-on-surface shadow-e3"
      style={{
        left: tip.x,
        top: tip.y,
        transform: `translate(-50%, ${tip.place === "top" ? "-100%" : "0"})`,
        opacity: tip.visible ? 1 : 0,
        transition: "opacity 140ms var(--ease-emphasized)",
      }}
    >
      <span>{tip.text}</span>
      {tip.kbd && <span className="kbd text-inverse-on-surface/90">{tip.kbd}</span>}
    </div>
  );
}
