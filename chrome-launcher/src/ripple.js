// Hiệu ứng ripple kiểu Material cho mọi nút
export function initRipple() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = e.target.closest?.("button");
      if (!el || el.disabled || reduce.matches) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const s = document.createElement("span");
      s.className = "rip";
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      el.appendChild(s);
      s.addEventListener("animationend", () => s.remove(), { once: true });
    },
    { passive: true }
  );
}
