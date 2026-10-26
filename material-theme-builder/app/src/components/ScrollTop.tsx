import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "../lib/utils";
import { useSettings } from "../state/settings";

const SHOW_AFTER = 280;

/**
 * Floating "scroll to top" button. Pages scroll inside their own panels, so instead of tracking the window
 * it listens (capture phase) for scroll events and remembers which scrollable element was scrolled last.
 */
export function ScrollTop({ resetKey }: { resetKey: string }) {
  const { t } = useSettings();
  const [visible, setVisible] = useState(false);
  const target = useRef<HTMLElement | null>(null);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    target.current = null;
    setVisible(false);
  }, [resetKey]);

  useEffect(() => {
    let raf = 0;
    const onScroll = (e: Event) => {
      const el = e.target instanceof HTMLElement ? e.target : document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
      if (!el || el.clientHeight < 200) return; // ignore small inner lists such as dropdowns
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (el.scrollTop > SHOW_AFTER) target.current = el;
        else if (target.current !== el) return;
        const on = el.scrollTop > SHOW_AFTER;
        setVisible(on);
        const max = el.scrollHeight - el.clientHeight;
        ring.current?.style.setProperty("stroke-dashoffset", String(100 - (max > 0 ? (el.scrollTop / max) * 100 : 0)));
      });
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      cancelAnimationFrame(raf);
    };
  }, []);

  const go = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.current?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      aria-label={t("scroll.top")}
      data-tip={t("scroll.top")}
      data-ripple
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={go}
      style={{ position: "fixed" }} // beats the [data-ripple] { position: relative } rule
      className={cn(
        "group bottom-20 right-4 z-30 grid size-14 place-items-center rounded-[20px] bg-tertiary-container text-on-tertiary-container shadow-elev-3",
        "transition-[opacity,transform,border-radius] duration-(--spring-spatial-d) ease-emphasized hover:rounded-full hover:bg-tertiary hover:text-on-tertiary active:scale-90 md:bottom-6 md:right-6",
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-75 opacity-0",
      )}
    >
      <svg viewBox="0 0 36 36" className="pointer-events-none absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="2" />
        <circle ref={ring} cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset="100" className="transition-[stroke-dashoffset] duration-150" />
      </svg>
      <ArrowUp className="size-6 transition-transform duration-300 group-hover:-translate-y-0.5" />
    </button>
  );
}
