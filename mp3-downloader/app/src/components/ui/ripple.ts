import type { PointerEvent } from "react";
/** Hiệu ứng gợn sóng: gắn vào onPointerDown của phần tử có position:relative + overflow:hidden. */
export function ripple(e: PointerEvent<HTMLElement>) {
  if (e.button !== 0) return;
  const host = e.currentTarget;
  if ((host as HTMLButtonElement).disabled) return;
  const r = host.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const s = document.createElement("span");
  s.className = "ripple";
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  host.appendChild(s);
  s.addEventListener("animationend", () => s.remove());
}
