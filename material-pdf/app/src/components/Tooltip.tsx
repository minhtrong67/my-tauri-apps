import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** One global, custom tooltip driven by `data-tip="Label (Shortcut)"` attributes. */
export function TooltipHost() {
  const [tip, setTip] = useState<{ el: HTMLElement; text: string; kbd?: string } | null>(null);
  const [shown, setShown] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const warm = useRef(0);

  useEffect(() => {
    let timer = 0, cur: HTMLElement | null = null;
    const hide = () => { clearTimeout(timer); cur = null; setShown(false); setTip(null); };
    const open = (el: HTMLElement) => {
      const raw = el.dataset.tip ?? "";
      const m = /^(.*?)\s*\(([^()]+)\)$/.exec(raw);
      setTip({ el, text: m ? m[1] : raw, kbd: m?.[2] });
      requestAnimationFrame(() => setShown(true));
      warm.current = Date.now();
    };
    const over = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.<HTMLElement>("[data-tip]");
      if (!el || el === cur) return;
      hide(); cur = el;
      timer = window.setTimeout(() => open(el), Date.now() - warm.current < 600 ? 60 : 420);
    };
    const out = (e: MouseEvent) => {
      if (cur && !cur.contains(e.relatedTarget as Node)) { warm.current = Date.now(); hide(); }
    };
    const focus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el.dataset?.tip && el.matches(":focus-visible")) { hide(); cur = el; open(el); }
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", hide);
    window.addEventListener("pointerdown", hide, true);
    window.addEventListener("keydown", hide, true);
    window.addEventListener("wheel", hide, { passive: true, capture: true });
    window.addEventListener("blur", hide);
    return () => {
      hide();
      document.removeEventListener("mouseover", over); document.removeEventListener("mouseout", out);
      document.removeEventListener("focusin", focus); document.removeEventListener("focusout", hide);
      window.removeEventListener("pointerdown", hide, true); window.removeEventListener("keydown", hide, true);
      window.removeEventListener("wheel", hide, true); window.removeEventListener("blur", hide);
    };
  }, []);

  useLayoutEffect(() => {
    const b = box.current;
    if (!tip || !b) return;
    const r = tip.el.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, gap = 10;
    const below = r.bottom + gap + h < innerHeight - 6;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    b.style.left = x + "px";
    b.style.top = (below ? r.bottom + gap : r.top - gap - h) + "px";
    b.style.setProperty("--ax", Math.min(Math.max(14, r.left + r.width / 2 - x), w - 14) + "px");
    b.dataset.place = below ? "bottom" : "top";
  }, [tip]);

  if (!tip) return null;
  return (
    <div ref={box} className={`tooltip ${shown ? "show" : ""}`} role="tooltip">
      <span>{tip.text}</span>{tip.kbd && <kbd>{tip.kbd}</kbd>}
    </div>
  );
}
