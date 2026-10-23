import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderToCanvas } from "../lib/pdf";

/** Lazily rendered page thumbnail (renders only once it scrolls into view). */
export function Thumb({ pdf, page, width, size, rev = 0 }: { pdf: PDFDocumentProxy; page: number; width: number; size: { w: number; h: number }; rev?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const [ready, setReady] = useState(false);
  const h = (size.h / size.w) * width;
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setVis(true), io.disconnect()), { rootMargin: "300px" });
    host.current && io.observe(host.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!vis || !ref.current) return;
    let live = true;
    setReady(false);
    renderToCanvas(pdf, page, (width * 2) / size.w, ref.current).then(() => live && setReady(true)).catch(() => {});
    return () => { live = false; };
  }, [vis, pdf, page, width, rev]);
  return (
    <div ref={host} className={`thumb ${ready ? "ready" : "loading"}`} style={{ width, height: h }}>
      <canvas ref={ref} style={{ width, height: h }} />
    </div>
  );
}
