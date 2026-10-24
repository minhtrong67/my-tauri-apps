/** Material ink ripple, installed once via event delegation on any `[data-ripple]` element. */
export function installRipple(): void {
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0) return;
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-ripple]");
      if (!target || (target as HTMLButtonElement).disabled) return;
      const rect = target.getBoundingClientRect();
      const size = Math.hypot(Math.max(e.clientX - rect.left, rect.right - e.clientX), Math.max(e.clientY - rect.top, rect.bottom - e.clientY)) * 2;
      const span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left - size / 2}px`;
      span.style.top = `${e.clientY - rect.top - size / 2}px`;
      target.appendChild(span);
      span.addEventListener("animationend", () => span.remove(), { once: true });
    },
    { passive: true },
  );
}
