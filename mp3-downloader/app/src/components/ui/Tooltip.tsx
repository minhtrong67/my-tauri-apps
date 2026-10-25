import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Tooltip tuỳ chỉnh (theo sáng/tối), hiện sau khi rê chuột hoặc focus bàn phím. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number>();
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const show = () => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const up = r.top > 56;
      const x = Math.min(Math.max(r.left + r.width / 2, 100), window.innerWidth - 100);
      setPos({ x, y: up ? r.top - 8 : r.bottom + 8, up });
    }, 350);
  };
  const hide = () => { clearTimeout(timer.current); setPos(null); };
  return (
    <span ref={ref} className="inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onPointerDown={hide}>
      {children}
      {pos && label && createPortal(
        <div role="tooltip" style={{ left: pos.x, top: pos.y, transform: pos.up ? "translate(-50%,-100%)" : "translate(-50%,0)" }}
          className="animate-tip pointer-events-none fixed z-[200] max-w-[260px] rounded-m3-sm bg-inverse-surface px-3 py-1.5 text-center text-xs font-medium text-inverse-on-surface shadow-e2">
          {label}
        </div>, document.body)}
    </span>
  );
}
