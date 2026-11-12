import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** ToolTip của Fluent: hiện sau khi rê chuột hoặc focus bàn phím. */
export function Tooltip({ label, children, disabled }: { label: string; children: ReactNode; disabled?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number>();
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const show = () => {
    if (disabled) return;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const up = r.top > 72;
      const x = Math.min(Math.max(r.left + r.width / 2, 110), window.innerWidth - 110);
      setPos({ x, y: up ? r.top - 6 : r.bottom + 6, up });
    }, 400);
  };
  const hide = () => { clearTimeout(timer.current); setPos(null); };
  return (
    <span ref={ref} className="inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onPointerDown={hide}>
      {children}
      {pos && label && createPortal(
        <div role="tooltip" style={{ left: pos.x, top: pos.y, transform: pos.up ? "translate(-50%,-100%)" : "translate(-50%,0)" }}
          className="animate-pop pointer-events-none fixed z-[700] max-w-[280px] rounded-ctl border border-flyout-line bg-flyout px-2.5 py-1.5 text-center text-cap text-fg shadow-fly">
          {label}
        </div>, document.body)}
    </span>
  );
}
