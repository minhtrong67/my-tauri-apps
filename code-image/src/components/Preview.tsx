import { useEffect, useRef, useState, type RefObject } from "react";
import { AlertTriangle } from "lucide-react";
import { CodeCanvas } from "./CodeCanvas";
import { useApp } from "../lib/store";
import { useT } from "../lib/i18n";

export function Preview({ canvasRef }: { canvasRef: RefObject<HTMLDivElement> }) {
  const t = useT();
  const transparent = useApp((s) => s.design.bgType === "transparent");
  const holder = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [cut, setCut] = useState(false);

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

  const s = Math.max(0.05, Math.min(1, (avail.w - 40) / size.w, (avail.h - 40) / size.h));

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div ref={holder} className="grid min-h-0 flex-1 place-items-center overflow-hidden p-5">
        <div
          className={`animate-rise overflow-hidden rounded-lg shadow-e3 ring-1 ring-outline-variant ${transparent ? "checker" : ""}`}
          style={{ width: size.w * s, height: size.h * s }}
        >
          <div style={{ width: size.w, height: size.h, transform: `scale(${s})`, transformOrigin: "0 0" }}>
            <CodeCanvas ref={canvasRef} onCut={setCut} />
          </div>
        </div>
      </div>
      {cut && (
        <div className="absolute inset-x-4 bottom-3 flex animate-toast items-center gap-2 rounded-m3 bg-error-container px-3 py-2 text-xs text-on-error-container">
          <AlertTriangle size={16} className="shrink-0" /> {t("cutOff")}
        </div>
      )}
    </div>
  );
}
