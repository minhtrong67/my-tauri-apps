import { useCallback, useEffect } from "react";
import { translate, type TKey } from "./i18n";
import { useSettings } from "../store/settings";

export function useT() {
  const lang = useSettings((s) => s.lang);
  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  return { t, lang };
}

/** Material ripple on every element that has the `ripple-host` class. */
export function useGlobalRipple() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const host = (e.target as HTMLElement | null)?.closest<HTMLElement>(".ripple-host");
      if (!host || host.hasAttribute("disabled") || host.getAttribute("aria-disabled") === "true") return;
      const rect = host.getBoundingClientRect();
      const size = Math.hypot(Math.max(e.clientX - rect.left, rect.right - e.clientX), Math.max(e.clientY - rect.top, rect.bottom - e.clientY)) * 2;
      const span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left - size / 2}px`;
      span.style.top = `${e.clientY - rect.top - size / 2}px`;
      host.appendChild(span);
      span.addEventListener("animationend", () => span.remove(), { once: true });
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
}

export function useEscape(handler: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handler();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handler, active]);
}
