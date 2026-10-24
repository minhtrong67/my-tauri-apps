import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pdfjs, uid } from "../lib/pdf";
import { peek, request } from "../lib/render";
import { addAnnots, gotoPage, removeAnnot, setZoom } from "../lib/actions";
import { useStore, type Annot, type Doc, type Tool } from "../lib/store";
import { useT } from "../lib/store";
import { PageFields } from "./PageFields";

const PAD = 20, GAP = 14;
const EMPTY: Annot[] = [];

interface PVProps {
  pdf: PDFDocumentProxy; index: number; scale: number; w: number; h: number; top: number; left: number;
  q: string; cur: number; jump: number; warm: boolean; forms: Doc["forms"]; annots: Annot[]; tool: Tool; color: string; strokeW: number; textSize: number;
}

const PageView = memo(function PageView(p: PVProps) {
  const { pdf, index, scale } = p;
  const canvasHost = useRef<HTMLDivElement>(null);
  const textHost = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [textTick, setTextTick] = useState(0);
  const first = useRef(true);

  useLayoutEffect(() => {
    let dead = false, tl: { cancel(): void } | null = null, req: ReturnType<typeof request> | null = null;
    const show = (c: HTMLCanvasElement) => {
      c.style.cssText = "width:100%;height:100%";
      canvasHost.current?.replaceChildren(c);
      setReady(true);
    };
    const cached = peek(pdf, index, scale);
    if (cached) show(cached); // synchronous: no blank frame when a page re-mounts
    const timer = setTimeout(async () => {
      try {
        if (!cached) {
          req = request(pdf, index, scale);
          const c = await req.promise;
          if (dead || !c) return;
          show(c);
        }
        const page = await pdf.getPage(index + 1);
        if (dead) return;
        const vp = page.getViewport({ scale });
        const div = document.createElement("div");
        div.className = "textLayer";
        const t = new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: div, viewport: vp });
        tl = t;
        await t.render();
        if (dead) return;
        textHost.current?.replaceChildren(div);
        setTextTick((n) => n + 1);
        for (const n of p.warm ? [index + 1, index - 1] : []) { // warm the cache for page flipping
          if (n < 0 || n >= pdf.numPages || peek(pdf, n, scale)) continue;
          const r = request(pdf, n, scale); r.promise.finally(r.release);
        }
      } catch (e: any) {
        if (!String(e?.message).toLowerCase().includes("cancel")) console.warn(e);
      }
    }, cached || first.current ? 0 : 110);
    first.current = false;
    return () => { dead = true; clearTimeout(timer); req?.release(); tl?.cancel(); };
  }, [pdf, index, scale]);

  // search highlights
  useEffect(() => {
    const root = textHost.current; if (!root) return;
    const q = p.q.toLowerCase();
    let n = 0, scrollTo: Element | null = null;
    root.querySelectorAll("span").forEach((s) => {
      s.classList.remove("hit", "cur");
      if (s.children.length || !q || !s.textContent?.trim()) return;
      if (s.textContent.toLowerCase().includes(q)) {
        s.classList.add("hit");
        if (n === p.cur) { s.classList.add("cur"); scrollTo = s; }
        n++;
      }
    });
    const hit = scrollTo as HTMLElement | null, sc = root.closest<HTMLElement>(".viewer");
    if (hit && sc) {
      const r = hit.getBoundingClientRect(), b = sc.getBoundingClientRect();
      sc.scrollTo({ top: sc.scrollTop + (r.top - b.top) - sc.clientHeight / 3, left: sc.scrollLeft + (r.left - b.left) - sc.clientWidth / 2, behavior: "smooth" });
    }
  }, [p.q, p.cur, p.jump, textTick]);

  return (
    <div className={`page ${ready ? "ready" : "loading"}`} data-i={index}
      style={{ width: p.w, height: p.h, top: p.top, left: p.left, ["--scale-factor" as any]: scale, ["--total-scale-factor" as any]: scale }}>
      <div className="canvas-host" ref={canvasHost} />
      <div className="text-host" ref={textHost} style={{ pointerEvents: p.tool === "none" || p.tool === "highlight" ? "auto" : "none" }} />
      <PageFields pdf={pdf} index={index} scale={scale} active={p.tool === "none"} forms={p.forms} />
      <AnnotLayer {...p} />
    </div>
  );
});

function AnnotLayer({ index, scale, w, h, annots, tool, color, strokeW, textSize }: PVProps) {
  const t = useT();
  const svg = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<Annot | null>(null);
  const [editor, setEditor] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const W = w / scale, H = h / scale;
  const pt = (e: React.PointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  };
  const drawing = tool === "pen" || tool === "rect";
  const down = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("[data-annot]") && tool === "eraser") return;
    if (e.button !== 0) return;
    const [x, y] = pt(e);
    if (!drawing) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDraft(tool === "pen"
      ? { id: uid(), type: "pen", page: index, pts: [[x, y]], color, width: strokeW }
      : { id: uid(), type: "rect", page: index, x, y, w: 0, h: 0, color, width: strokeW });
  };
  const place = (e: React.MouseEvent) => {
    if (tool !== "text" || (e.target as Element).closest("textarea")) return;
    const r = svg.current!.getBoundingClientRect();
    setEditor({ x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }); setText("");
  };
  const move = (e: React.PointerEvent) => {
    if (!draft) return;
    const [x, y] = pt(e);
    if (draft.type === "pen") {
      const l = draft.pts[draft.pts.length - 1];
      if (Math.hypot(l[0] - x, l[1] - y) > 0.8) setDraft({ ...draft, pts: [...draft.pts, [x, y]] });
    } else if (draft.type === "rect") setDraft({ ...draft, w: x - draft.x, h: y - draft.y });
  };
  const up = () => {
    if (!draft) return;
    if (draft.type === "rect") {
      const r = { ...draft, x: Math.min(draft.x, draft.x + draft.w), y: Math.min(draft.y, draft.y + draft.h), w: Math.abs(draft.w), h: Math.abs(draft.h) };
      if (r.w > 3 && r.h > 3) addAnnots([r]);
    } else if (draft.type === "pen" && draft.pts.length > 1) addAnnots([draft]);
    setDraft(null);
  };
  const commitText = () => {
    if (editor && text.trim()) addAnnots([{ id: uid(), type: "text", page: index, x: editor.x, y: editor.y, text, color, size: textSize }]);
    setEditor(null); setText("");
  };
  const hit = (a: Annot) => ({ "data-annot": a.id, onPointerDown: tool === "eraser" ? (e: React.PointerEvent) => { e.stopPropagation(); removeAnnot(a.id); } : undefined,
    style: { pointerEvents: tool === "eraser" ? "auto" : "none", cursor: tool === "eraser" ? "pointer" : undefined } as React.CSSProperties });
  const render = (a: Annot, key?: string) => {
    if (a.type === "highlight") return <rect key={key ?? a.id} x={a.x} y={a.y} width={a.w} height={a.h} fill={a.color} className="hl" {...hit(a)} />;
    if (a.type === "rect") return <rect key={key ?? a.id} x={a.x} y={a.y} width={a.w} height={a.h} fill="none" stroke={a.color} strokeWidth={a.width} {...hit(a)} />;
    if (a.type === "pen") return <polyline key={key ?? a.id} points={a.pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={a.color} strokeWidth={a.width} strokeLinecap="round" strokeLinejoin="round" {...hit(a)} />;
    return (
      <text key={key ?? a.id} x={a.x} y={a.y} fill={a.color} fontSize={a.size} dominantBaseline="hanging" fontFamily="system-ui, 'Segoe UI', Roboto, sans-serif" {...hit(a)}>
        {a.text.split("\n").map((l, i) => <tspan key={i} x={a.x} dy={i ? a.size * 1.25 : 0}>{l || " "}</tspan>)}
      </text>
    );
  };
  const active = drawing || tool === "text" || tool === "eraser";
  return (
    <>
      <svg ref={svg} className={`annot-layer tool-${tool}`} viewBox={`0 0 ${W} ${H}`} style={{ pointerEvents: active ? "auto" : "none" }}
        onPointerDown={down} onClick={place} onMouseDown={(e) => tool === "text" && e.preventDefault()} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {annots.map((a) => render(a))}
        {draft && render(draft, "draft")}
      </svg>
      {editor && (
        <textarea autoFocus className="annot-editor" value={text} placeholder={t("typeHere")} onChange={(e) => setText(e.target.value)}
          onBlur={commitText} onKeyDown={(e) => { if (e.key === "Escape") { setEditor(null); setText(""); } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commitText(); }}
          style={{ left: editor.x * scale, top: editor.y * scale, fontSize: textSize * scale, color }} />
      )}
    </>
  );
}

export function Viewer({ doc }: { doc: Doc }) {
  const tool = useStore((s) => s.tool), color = useStore((s) => s.color), strokeW = useStore((s) => s.strokeW);
  const textSize = useStore((s) => s.textSize), search = useStore((s) => s.search), present = useStore((s) => s.present);
  const night = useStore((s) => s.settings.nightPages);
  const layout = useStore((s) => (s.present ? "single" : s.settings.layout));
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [range, setRange] = useState<[number, number]>([0, 4]);
  const pad = present ? 0 : PAD;

  useLayoutEffect(() => {
    const el = box.current!;
    let t = 0;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = window.setTimeout(() => setSize({ w: el.clientWidth, h: el.clientHeight }), 90); });
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  const maxW = useMemo(() => Math.max(...doc.sizes.map((s) => s.w)), [doc.sizes]);
  const scale = useMemo(() => {
    const cur = doc.sizes[doc.page] ?? doc.sizes[0];
    const fitW = (size.w - pad * 2) / (layout === "single" ? cur.w : maxW);
    const fitP = Math.min(fitW, (size.h - pad * 2) / cur.h);
    const s = present ? fitP : doc.fit === "width" ? fitW : doc.fit === "page" ? fitP : doc.scale;
    return Math.max(0.1, Math.min(6, s || 1));
  }, [doc.fit, doc.scale, doc.page, doc.sizes, size, layout, maxW, present, pad]);

  useEffect(() => { if (Math.abs(scale - doc.scale) > 1e-4) useStore.getState().patchDoc(doc.id, { scale }); }, [scale]);

  const singlePage = layout === "single" ? doc.page : 0;
  const geo = useMemo(() => {
    const dims = (i: number) => ({ w: doc.sizes[i].w * scale, h: doc.sizes[i].h * scale });
    if (layout === "single") {
      const d = dims(singlePage);
      const cw = Math.max(size.w, d.w + pad * 2);
      return { tops: [pad], total: Math.max(size.h, d.h + pad * 2), contentW: cw, single: { i: singlePage, ...d, top: Math.max(pad, (size.h - d.h) / 2), left: (cw - d.w) / 2 } };
    }
    const tops: number[] = []; let y = pad;
    for (let i = 0; i < doc.numPages; i++) { tops.push(y); y += dims(i).h + GAP; }
    return { tops, total: y - GAP + pad, contentW: Math.max(size.w, maxW * scale + pad * 2), single: null };
  }, [doc.sizes, doc.numPages, singlePage, scale, layout, size, pad, maxW]);

  const lastFromScroll = useRef(-1);
  const prev = useRef({ scale, total: geo.total, cw: geo.contentW });

  // keep the viewport centred on the same spot when zoom / layout changes
  useLayoutEffect(() => {
    const el = box.current!, p = prev.current;
    if (p.scale !== scale && layout === "continuous" && p.total > 0) {
      el.scrollTop = ((el.scrollTop + el.clientHeight / 2) / p.total) * geo.total - el.clientHeight / 2;
      el.scrollLeft = ((el.scrollLeft + el.clientWidth / 2) / p.cw) * geo.contentW - el.clientWidth / 2;
    }
    prev.current = { scale, total: geo.total, cw: geo.contentW };
  }, [scale, geo.total, geo.contentW, layout]);

  const idxAt = useCallback((y: number) => {
    const { tops } = geo; let lo = 0, hi = tops.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tops[m] <= y) lo = m; else hi = m - 1; }
    return lo;
  }, [geo]);
  const updateRange = useCallback(() => {
    const el = box.current!; if (!geo.tops.length || geo.single) return;
    const a = Math.max(0, idxAt(el.scrollTop - 900)), b = Math.min(geo.tops.length - 1, idxAt(el.scrollTop + el.clientHeight + 900));
    setRange((r) => (r[0] === a && r[1] === b ? r : [a, b]));
  }, [geo, idxAt]);
  const onScroll = useCallback(() => {
    const el = box.current!; if (layout === "single") return;
    updateRange();
    const cur = idxAt(el.scrollTop + el.clientHeight * 0.35);
    if (cur !== doc.page) { lastFromScroll.current = cur; useStore.getState().patchDoc(doc.id, { page: cur }); }
  }, [layout, updateRange, idxAt, doc.page, doc.id]);
  useEffect(() => { updateRange(); }, [updateRange, size]);

  // programmatic navigation
  useEffect(() => {
    const el = box.current!;
    if (layout === "single") { el.scrollTop = 0; return; }
    if (lastFromScroll.current === doc.page) { lastFromScroll.current = -1; return; }
    el.scrollTo({ top: Math.max(0, geo.tops[doc.page] - PAD), behavior: "auto" });
  }, [doc.page, layout, doc.rev]);
  useEffect(() => { lastFromScroll.current = -1; }, [doc.id]);

  // ctrl+wheel zoom, edge-wheel page flip in single layout
  const cooldown = useRef(0);
  useEffect(() => {
    const el = box.current!;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) { e.preventDefault(); setZoom(scale * Math.exp(-e.deltaY * 0.0018)); return; }
      if (layout !== "single" || Date.now() < cooldown.current) return;
      if (e.deltaY > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 2 && doc.page < doc.numPages - 1) { cooldown.current = Date.now() + 320; gotoPage(doc.page + 1); }
      else if (e.deltaY < 0 && el.scrollTop <= 0 && doc.page > 0) { cooldown.current = Date.now() + 320; gotoPage(doc.page - 1); }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [scale, layout, doc.page, doc.numPages]);

  // highlight tool: turn the text selection into highlight annotations
  const onMouseUp = () => {
    if (tool !== "highlight") return;
    const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const rects = [...sel.getRangeAt(0).getClientRects()].filter((r) => r.width > 2 && r.height > 2);
    const pages = [...box.current!.querySelectorAll<HTMLElement>(".page")].map((el) => ({ i: +el.dataset.i!, r: el.getBoundingClientRect() }));
    const out: Annot[] = [];
    for (const r of rects) {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const pg = pages.find((p) => cx >= p.r.left && cx <= p.r.right && cy >= p.r.top && cy <= p.r.bottom);
      if (!pg) continue;
      out.push({ id: uid(), type: "highlight", page: pg.i, color, x: (r.left - pg.r.left) / scale, y: (r.top - pg.r.top) / scale, w: r.width / scale, h: r.height / scale });
    }
    addAnnots(out); sel.removeAllRanges();
  };

  const items = geo.single
    ? [geo.single]
    : Array.from({ length: Math.max(0, range[1] - range[0] + 1) }, (_, k) => {
        const i = range[0] + k; if (i >= doc.numPages) return null;
        const w = doc.sizes[i].w * scale, h = doc.sizes[i].h * scale;
        return { i, w, h, top: geo.tops[i], left: (geo.contentW - w) / 2 };
      }).filter(Boolean) as { i: number; w: number; h: number; top: number; left: number }[];

  const byPage = useMemo(() => { const m = new Map<number, Annot[]>(); doc.annots.forEach((a) => m.set(a.page, [...(m.get(a.page) ?? []), a])); return m; }, [doc.annots]);
  const hitPages = useMemo(() => new Set(search.hits.map((h) => h.page)), [search.hits]);
  return (
    <div className={`viewer ${night ? "night" : ""} ${present ? "present" : ""}`} ref={box} onScroll={onScroll} onMouseUp={onMouseUp} tabIndex={-1}>
      <div className="canvas-area" style={{ width: geo.contentW, height: geo.total }}>
        {items.map((it) => {
                    const curHit = search.cur >= 0 ? search.hits[search.cur] : null;
          const curIdx = curHit && curHit.page === it.i ? curHit.idx : -1;
          return (
            <PageView key={`${doc.rev}-${it.i}`} warm={layout === "single"} pdf={doc.pdf} index={it.i} scale={scale} w={it.w} h={it.h} top={it.top} left={it.left}
              q={hitPages.has(it.i) ? search.q : ""} cur={curIdx} jump={curIdx >= 0 ? search.jump : 0}
              forms={doc.forms} annots={byPage.get(it.i) ?? EMPTY} tool={tool} color={color} strokeW={strokeW} textSize={textSize} />
          );
        })}
      </div>
    </div>
  );
}
