import { useEffect, useRef, useState, type RefObject } from "react";
import { TriangleAlert } from "lucide-react";
import { CodeCanvas } from "./CodeCanvas";
import { useApp } from "../lib/store";
import { useT } from "../lib/i18n";
import { cx } from "./ui";

export function Preview({ canvasRef, busy, flashKey }: { canvasRef: RefObject<HTMLDivElement>; busy: boolean; flashKey: number }) {
  const t = useT();
  const transparent = useApp((s) => s.design.bgType === "transparent");
  const outScale = useApp((s) => s.design.scale);
  const holder = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [cut, setCut] = useState(false);
  const [zoom, setZoom] = useState<"fit" | "100">("fit");

  useEffect(() => {
    const ro = new ResizeObserver(() => holder.current && setAvail({ w: holder.current.clientWidth, h: holder.current.clientHeight }));
    holder.current && ro.observe(holder.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const upd = () => setSize({ w: el.offsetWidth || 1, h: el.offsetHeight || 1 });
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasRef]);

  const s = zoom === "100" ? 1 : Math.max(0.05, Math.min(2, (avail.w - 40) / size.w, (avail.h - 40) / size.h));

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div ref={holder} className={cx("flex min-h-0 flex-1 p-5", zoom === "100" ? "overflow-auto" : "overflow-hidden")}>
        <div
          className={cx("relative m-auto shrink-0 animate-pop overflow-hidden rounded-lg shadow-e3 ring-1 ring-outline-variant", transparent && "checker")}
          style={{ width: size.w * s, height: size.h * s }}
        >
          <div style={{ width: size.w, height: size.h, transform: `scale(${s})`, transformOrigin: "0 0" }}>
            <CodeCanvas ref={canvasRef} onCut={setCut} />
          </div>
          {busy && <div className="skeleton pointer-events-none absolute inset-0 animate-shimmer" />}
          {flashKey > 0 && <div key={flashKey} className="pointer-events-none absolute inset-0 animate-flash bg-white" />}
        </div>
      </div>

      {/* floating controls: zoom + output pixel size */}
      <div className="pointer-events-none absolute left-4 top-3 flex items-center gap-2">
        <div role="radiogroup" className="pointer-events-auto flex gap-0.5 rounded-full bg-surface-high/90 p-1 shadow-e1 backdrop-blur">
          {(["fit", "100"] as const).map((z) => (
            <button key={z} role="radio" aria-checked={zoom === z} onClick={() => setZoom(z)}
              className={cx("h-7 rounded-full px-3 text-xs font-medium transition-all duration-300 ease-spring",
                zoom === z ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-on-surface/10")}>
              {z === "fit" ? t("zoomFit") : t("zoom100")}
            </button>
          ))}
        </div>
        <span className="rounded-full bg-surface-high/90 px-3 py-1.5 text-xs tabular-nums text-on-surface-variant shadow-e1 backdrop-blur">
          {Math.round(size.w * outScale)} × {Math.round(size.h * outScale)} px
        </span>
      </div>

      {cut && (
        <div className="absolute inset-x-4 bottom-3 flex animate-toastIn items-center gap-2 rounded-m3 bg-warning-container px-3 py-2 text-xs text-on-warning-container">
          <TriangleAlert size={16} className="shrink-0" /> {t("cutOff")}
        </div>
      )}
    </div>
  );
}
