import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * One global tooltip host. Any element with a `data-tip="Text"` attribute gets a themed tooltip
 * (hover after a short delay, or immediately on keyboard focus). A trailing "(Ctrl+Z)" in the
 * text is rendered as a keyboard-hint chip. Optional `data-tip-side="top|bottom|left|right"`.
 */
type Side = "top" | "bottom" | "left" | "right";

interface Tip {
  text: string;
  rect: DOMRect;
  side?: Side;
}

const SHOW_DELAY = 380;
const GAP = 10;

function split(text: string): { label: string; kbd: string | null } {
  const m = text.match(/^(.*?)\s*\(([^()]{1,24})\)$/);
  return m && /ctrl|shift|alt|⌘|esc|enter|\+/i.test(m[2]) ? { label: m[1], kbd: m[2] } : { label: text, kbd: null };
}

export function TooltipHost() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; side: Side } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const current = useRef<Element | null>(null);

  useEffect(() => {
    const hide = () => {
      window.clearTimeout(timer.current);
      current.current = null;
      setTip(null);
      setPos(null);
    };
    const show = (el: HTMLElement, delay: number) => {
      window.clearTimeout(timer.current);
      current.current = el;
      timer.current = window.setTimeout(() => {
        const text = el.getAttribute("data-tip");
        if (!text || !el.isConnected) return;
        setPos(null);
        setTip({ text, rect: el.getBoundingClientRect(), side: (el.getAttribute("data-tip-side") as Side | null) ?? undefined });
      }, delay);
    };
    const find = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.<HTMLElement>("[data-tip]") ?? null;

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = find(e.target);
      if (el === current.current) return;
      if (!el) return hide();
      show(el, SHOW_DELAY);
    };
    const onFocus = (e: FocusEvent) => {
      const el = find(e.target);
      if (el && (el as HTMLElement).matches(":focus-visible")) show(el, 0);
    };
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", hide, { passive: true });
    window.addEventListener("focusin", onFocus);
    window.addEventListener("focusout", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("keydown", hide);
    return () => {
      window.clearTimeout(timer.current);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("focusin", onFocus);
      window.removeEventListener("focusout", hide);
      window.removeEventListener("blur", hide);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("keydown", hide);
    };
  }, []);

  // Measure after render, pick the side with room, clamp inside the viewport.
  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const { width: w, height: h } = ref.current.getBoundingClientRect();
    const r = tip.rect;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let side: Side = tip.side ?? "top";
    if (side === "top" && r.top - h - GAP < 4) side = "bottom";
    else if (side === "bottom" && r.bottom + h + GAP > vh - 4) side = "top";
    else if (side === "left" && r.left - w - GAP < 4) side = "right";
    else if (side === "right" && r.right + w + GAP > vw - 4) side = "left";
    let left = r.left + r.width / 2 - w / 2;
    let top = r.top + r.height / 2 - h / 2;
    if (side === "top") top = r.top - h - GAP;
    if (side === "bottom") top = r.bottom + GAP;
    if (side === "left") left = r.left - w - GAP;
    if (side === "right") left = r.right + GAP;
    left = Math.min(Math.max(8, left), vw - w - 8);
    top = Math.min(Math.max(8, top), vh - h - 8);
    setPos({ left, top, side });
  }, [tip]);

  if (!tip) return null;
  const { label, kbd } = split(tip.text);
  return (
    <div
      ref={ref}
      role="tooltip"
      data-side={pos?.side}
      className={`pointer-events-none fixed z-[200] flex max-w-[280px] items-center gap-2 rounded-lg bg-inverse-surface px-2.5 py-1.5 text-xs font-medium leading-snug text-inverse-on-surface shadow-elev-2 ${pos ? "anim-tip" : "opacity-0"}`}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0 }}
    >
      <span>{label}</span>
      {kbd && <kbd className="rounded-md bg-inverse-on-surface/15 px-1.5 py-0.5 font-sans text-[10px] font-semibold tracking-wide">{kbd}</kbd>}
    </div>
  );
}
