import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * One tooltip for the whole app. Any element with a `data-tip` attribute gets it.
 * It sits below the element, flips above when there is no room and is clamped to the window.
 */
export default function TooltipHost() {
  const [tip, setTip] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const timer = useRef<number>(0);
  const current = useRef<Element | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hide = () => {
      current.current = null;
      clearTimeout(timer.current);
      setTip(null);
      setPos(null);
    };
    const over = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip]") ?? null;
      if (el === current.current) return;
      hide();
      if (!el) return;
      current.current = el;
      timer.current = window.setTimeout(() => {
        const text = el.getAttribute("data-tip");
        if (text && el.isConnected) setTip({ text, rect: el.getBoundingClientRect() });
      }, 350);
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseleave", hide);
    addEventListener("mousedown", hide, true);
    addEventListener("keydown", hide, true);
    addEventListener("scroll", hide, true);
    addEventListener("blur", hide);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseleave", hide);
      removeEventListener("mousedown", hide, true);
      removeEventListener("keydown", hide, true);
      removeEventListener("scroll", hide, true);
      removeEventListener("blur", hide);
      clearTimeout(timer.current);
    };
  }, []);

  // measure after render, then place
  useLayoutEffect(() => {
    if (!tip || !box.current) return;
    const { width: w, height: h } = box.current.getBoundingClientRect();
    const r = tip.rect;
    const gap = 8;
    let top = r.bottom + gap;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - gap - h);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    setPos({ left, top });
  }, [tip]);

  if (!tip) return null;
  return createPortal(
    <div ref={box} className="tip" style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }} role="tooltip">
      {tip.text}
    </div>,
    document.body,
  );
}
