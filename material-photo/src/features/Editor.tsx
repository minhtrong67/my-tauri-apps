import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Crop, History, Redo2, SlidersHorizontal, Sparkles, Pencil, Type, Smile, Droplets, Download, Undo2, Save, Eye, RotateCcw, Check, ChevronDown, Copy, X, FilePenLine, Lock,
} from "lucide-react";
import { app, showMenu, t, toast, useApp, useSettings, useT } from "../lib/store";
import { api, src } from "../lib/tauri";
import { confirmDialog } from "../lib/store";
import { createEngine, initialState, isMovable, loadSource, type EditState, type Engine, type Item, type Movable, type Pt } from "../lib/editorEngine";
import { baseName, clamp, cx, dirName, extOf, stem, uid } from "../lib/utils";
import { findEntry, openPath, refresh, refreshEntry } from "../lib/actions";
import { Btn, IconBtn, Spinner, Tip } from "../components/ui";
import { Modal } from "../components/Overlays";
import {
  AdjustPanel, BlurPanel, CropPanel, DrawPanel, ExportPanel, FiltersPanel, StickersPanel, TextPanel, type ExportOpts, type PanelProps, type Tab, type ToolState,
} from "./EditorPanels";

const TABS: { id: Tab; icon: typeof Crop; label: string }[] = [
  { id: "crop", icon: Crop, label: "ed.crop" }, { id: "adjust", icon: SlidersHorizontal, label: "ed.adjust" }, { id: "filters", icon: Sparkles, label: "ed.filters" },
  { id: "draw", icon: Pencil, label: "ed.draw" }, { id: "text", icon: Type, label: "ed.text" }, { id: "stickers", icon: Smile, label: "ed.stickers" },
  { id: "blur", icon: Droplets, label: "ed.blur" }, { id: "export", icon: Download, label: "ed.resize" },
];
const PREVIEW = 1700;
type Hist = { label: string; st: EditState };

export function Editor() {
  const tt = useT();
  const path = useApp((s) => s.current)!;
  const version = useApp((s) => s.version);
  const keepExifSetting = useSettings((s) => s.keepExif);
  const quality = useSettings((s) => s.quality);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [error, setError] = useState(false);
  const [hist, setHist] = useState<Hist[]>([{ label: tt("ed.original"), st: initialState() }]);
  const [hi, setHi] = useState(0);
  const [draft, setDraft] = useState<EditState | null>(null);
  const draftRef = useRef<EditState | null>(null);
  const [tab, setTab] = useState<Tab>("crop");
  const [sel, setSel] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tool, setToolState] = useState<ToolState>({ tool: "pen", color: "#f44336", width: 10, fill: false, aspect: null, blurMode: "pixelate" });
  const setTool = (p: Partial<ToolState>) => setToolState((s) => ({ ...s, ...p }));
  const [filterThumbs, setFilterThumbs] = useState<string[]>([]);
  const [dims, setDims] = useState({ w: 4, h: 3 });
  const [box, setBox] = useState({ w: 600, h: 400 });
  const [draftItem, setDraftItem] = useState<Item | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const disp = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const ext = extOf(path);
  const canOverwrite = ["jpg", "jpeg", "jfif", "png", "webp"].includes(ext);
  const [exp, setExpState] = useState<ExportOpts>({ format: "jpeg", quality, w: 1, h: 1, lock: true, keepExif: keepExifSetting });
  const setExp = (p: Partial<ExportOpts>) => setExpState((s) => ({ ...s, ...p }));

  const st = draft ?? hist[hi].st;
  const dirty = hi > 0;
  useEffect(() => { app.set({ editorDirty: dirty }); return () => app.set({ editorDirty: false }); }, [dirty]);

  /* ---- load picture ---- */
  useEffect(() => {
    let alive = true, bmp: ImageBitmap | HTMLImageElement | null = null;
    setEngine(null); setError(false); setHist([{ label: tt("ed.original"), st: initialState() }]); setHi(0); setDraft(null); setSel(null);
    loadSource(src(path, (findEntry(path)?.mtime ?? 0) + version)).then(async (b) => {
      if (!alive) return; bmp = b;
      const e = createEngine(b);
      setEngine(e);
      setExpState((s) => ({ ...s, w: b.width, h: b.height, format: ext === "png" ? "png" : ext === "webp" ? "webp" : "jpeg", quality }));
      // small preview of every filter for the filter tab
      const thumbs: string[] = [];
      const { FILTERS } = await import("../lib/editorEngine");
      for (const f of FILTERS) thumbs.push(e.previewDataUrl(f.id));
      if (alive) setFilterThumbs(thumbs);
    }).catch(() => alive && setError(true));
    return () => { alive = false; if (bmp && "close" in bmp) bmp.close(); };
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  /* keep the export size in sync with the crop */
  const cropKey = engine ? `${st.crop.w.toFixed(4)}|${st.crop.h.toFixed(4)}|${st.rot}` : "";
  useEffect(() => { if (engine) { const c = engine.cropSize(hist[hi].st); setExpState((s) => ({ ...s, w: c.w, h: c.h })); } }, [cropKey, hi, engine]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- measure stage ---- */
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [engine]);

  /* ---- render ---- */
  useEffect(() => {
    if (!engine || !disp.current) return;
    const id = requestAnimationFrame(() => {
      const c = engine.preview(st, PREVIEW, { full: tab === "crop", draft: draftItem, plain: compare });
      const d = disp.current!; d.width = c.width; d.height = c.height;
      d.getContext("2d")!.drawImage(c, 0, 0);
      setDims((p) => (p.w === c.width && p.h === c.height ? p : { w: c.width, h: c.height }));
    });
    return () => cancelAnimationFrame(id);
  }, [engine, st, tab, draftItem, compare]);

  const fitScale = Math.min((box.w - 8) / dims.w, (box.h - 8) / dims.h);
  const cw = Math.max(10, dims.w * fitScale), ch = Math.max(10, dims.h * fitScale);

  /* ---- history ---- */
  const commit = useCallback((label: string, fn: (s: EditState) => EditState) => {
    const base = draftRef.current ?? hist[hi].st;
    const next = fn(base);
    draftRef.current = null; setDraft(null);
    setHist((h) => [...h.slice(0, hi + 1), { label, st: next }].slice(-60));
    setHi((i) => Math.min(i + 1, 59));
  }, [hist, hi]);
  const live = useCallback((fn: (s: EditState) => EditState) => {
    const next = fn(draftRef.current ?? hist[hi].st);
    draftRef.current = next; setDraft(next);
  }, [hist, hi]);
  const commitDraft = useCallback((label: string) => { if (draftRef.current) commit(label, (s) => s); }, [commit]);
  const undo = useCallback(() => { draftRef.current = null; setDraft(null); setHi((i) => Math.max(0, i - 1)); setSel(null); }, []);
  const redo = useCallback(() => { setHi((i) => Math.min(hist.length - 1, i + 1)); }, [hist.length]);

  /* ---- leave ---- */
  const leave = useCallback(async () => {
    if (dirty && !(await confirmDialog({ title: t("ed.discardTitle"), desc: t("ed.discardDesc"), confirm: t("ed.discard"), kind: "danger", icon: X }))) return;
    app.set({ view: "viewer", editorDirty: false });
  }, [dirty]);

  /* ---- save ---- */
  const encode = async () => engine!.exportBlob(hist[hi].st, { format: exp.format, quality: exp.quality, width: exp.w, height: exp.h });
  const save = async (overwrite: boolean) => {
    if (!engine) return;
    if (overwrite) {
      const ok = await confirmDialog({ title: t("exp.overwriteTitle"), desc: t("exp.overwriteDesc", { name: baseName(path) }), confirm: t("exp.overwriteConfirm"), kind: "danger", icon: Lock });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const fmt = overwrite ? (ext === "png" ? "png" : ext === "webp" ? "webp" : "jpeg") : exp.format;
      const blob = await engine.exportBlob(hist[hi].st, { format: fmt, quality: overwrite ? quality : exp.quality, width: exp.w, height: exp.h });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const exifFrom = fmt === "jpeg" && (overwrite ? keepExifSetting : exp.keepExif) && ["jpg", "jpeg", "jfif"].includes(ext) ? path : undefined;
      if (overwrite) {
        await api.writeImage(path, bytes, exifFrom);
        await refreshEntry(path);
        toast("success", t("toast.saved"));
        app.set({ view: "viewer", editorDirty: false });
      } else {
        const outExt = fmt === "jpeg" ? "jpg" : fmt;
        const target = await api.pickSavePath(`${stem(baseName(path))}-edited.${outExt}`, dirName(path));
        if (!target) { setSaving(false); return; }
        await api.writeImage(target, bytes, exifFrom);
        await refresh(true);
        toast("success", t("toast.savedAs", { name: baseName(target) }), { action: { label: t("open"), run: () => openPath(target) } });
        app.set({ editorDirty: false });
      }
    } catch (e) { toast("error", t("toast.error", { msg: String(e) })); }
    setSaving(false);
  };
  const toClipboard = async () => {
    try { const blob = await engine!.exportBlob(hist[hi].st, { format: "png", quality: 100, width: exp.w, height: exp.h }); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); toast("success", t("toast.copied")); }
    catch { toast("error", t("toast.copyFail")); }
  };
  void encode;
  const saveMenu = (ev: React.MouseEvent<HTMLElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    showMenu([
      { label: tt("exp.saveCopy"), icon: Save, run: () => save(false) },
      { label: tt("exp.overwrite"), icon: Lock, disabled: !canOverwrite, kbd: "Ctrl+S", run: () => save(true) },
      { divider: true },
      { label: tt("exp.copyClipboard"), icon: Copy, run: toClipboard },
    ], r);
  };

  /* ---- keyboard ---- */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (app.get().view !== "editor") return;
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA";
      const key = e.key.toLowerCase();
      if (e.ctrlKey && key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (e.ctrlKey && key === "y") { e.preventDefault(); redo(); }
      else if (e.ctrlKey && key === "s") { e.preventDefault(); if (canOverwrite) save(true); else save(false); }
      else if (typing) return;
      else if ((key === "delete" || key === "backspace") && sel) { commit(t("ed.deleteItem"), (s) => ({ ...s, items: s.items.filter((i) => i.id !== sel) })); setSel(null); }
      else if (key === "escape") { if (sel) setSel(null); else leave(); }
      else if (sel && key.startsWith("arrow")) {
        e.preventDefault(); const d = e.shiftKey ? 0.02 : 0.004;
        const dx = key === "arrowleft" ? -d : key === "arrowright" ? d : 0, dy = key === "arrowup" ? -d : key === "arrowdown" ? d : 0;
        commit(t("ed.tool"), (s) => ({ ...s, items: s.items.map((i) => (i.id === sel && isMovable(i) ? (i.type === "blur" ? { ...i, x: i.x + dx, y: i.y + dy } : { ...i, x: i.x + dx, y: i.y + dy }) : i)) }));
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [undo, redo, sel, commit, leave, canOverwrite]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ================= pointer interaction on the picture ================= */
  const norm = (e: { clientX: number; clientY: number }): Pt => {
    const r = wrap.current!.getBoundingClientRect();
    return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)];
  };
  type Drag =
    | { kind: "stroke" | "shape" | "blur"; id: string }
    | { kind: "erase"; ids: Set<string> }
    | { kind: "crop"; handle: string; start: Pt; crop: EditState["crop"] }
    | { kind: "move"; id: string; start: Pt; orig: Movable }
    | { kind: "scale"; id: string; orig: Movable; d0: number }
    | { kind: "rotate"; id: string; orig: Movable };
  const drag = useRef<Drag | null>(null);
  const draftItemRef = useRef<Item | null>(null);
  const setDI = (i: Item | null) => { draftItemRef.current = i; setDraftItem(i); };

  const hitItem = (p: Pt): Movable | null => {
    const W = dims.w, H = dims.h;
    for (let i = st.items.length - 1; i >= 0; i--) {
      const it = st.items[i]; if (!isMovable(it)) continue;
      const b = engine!.itemBox(it, W, H);
      const dx = p[0] * W - b.cx, dy = p[1] * H - b.cy, c = Math.cos(-b.rot), s = Math.sin(-b.rot);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      if (Math.abs(lx) <= b.w / 2 + 6 && Math.abs(ly) <= b.h / 2 + 6) return it;
    }
    return null;
  };

  const onDown = (e: React.PointerEvent) => {
    if (!engine || compare) return;
    const target = e.target as HTMLElement;
    const handle = target.dataset.handle;
    wrap.current!.setPointerCapture(e.pointerId);
    const p = norm(e);
    if (tab === "crop" && handle) { drag.current = { kind: "crop", handle, start: p, crop: { ...st.crop } }; return; }
    if (handle === "scale" || handle === "rotate") {
      const it = st.items.find((i) => i.id === sel) as Movable; if (!it) return;
      const b = engine.itemBox(it, dims.w, dims.h);
      if (handle === "scale") drag.current = { kind: "scale", id: it.id, orig: it, d0: Math.hypot(p[0] * dims.w - b.cx, p[1] * dims.h - b.cy) || 1 };
      else drag.current = { kind: "rotate", id: it.id, orig: it };
      return;
    }
    if (tab === "text" || tab === "stickers" || tab === "blur" || tab === "draw") {
      const hit = tab !== "draw" ? hitItem(p) : null;
      if (hit && (tab !== "blur" || hit.type === "blur") ) { setSel(hit.id); drag.current = { kind: "move", id: hit.id, start: p, orig: hit }; return; }
    }
    if (tab === "blur") { const id = uid(); setSel(null); drag.current = { kind: "blur", id }; setDI({ id, type: "blur", x: p[0], y: p[1], w: 0, h: 0, mode: tool.blurMode }); (drag.current as { start?: Pt }).start = p; return; }
    if (tab === "draw") {
      if (tool.tool === "eraser") { drag.current = { kind: "erase", ids: new Set() }; eraseAt(p); return; }
      const id = uid();
      if (tool.tool === "pen" || tool.tool === "highlighter") { drag.current = { kind: "stroke", id }; setDI({ id, type: "stroke", pts: [p], color: tool.color, width: tool.width, highlighter: tool.tool === "highlighter" }); }
      else { drag.current = { kind: "shape", id }; setDI({ id, type: "shape", shape: tool.tool, a: p, b: p, color: tool.color, width: tool.width, fill: tool.fill }); }
      return;
    }
    setSel(null);
  };

  const eraseAt = (p: Pt) => {
    const d = drag.current; if (!d || d.kind !== "erase") return;
    const W = dims.w, H = dims.h, th = 14;
    const dist = (a: Pt, b: Pt, q: Pt) => { const ax = a[0] * W, ay = a[1] * H, bx = b[0] * W, by = b[1] * H, qx = q[0] * W, qy = q[1] * H; const l2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1; const tt2 = clamp(((qx - ax) * (bx - ax) + (qy - ay) * (by - ay)) / l2, 0, 1); return Math.hypot(qx - (ax + tt2 * (bx - ax)), qy - (ay + tt2 * (by - ay))); };
    for (const it of st.items) {
      if (it.type === "stroke") { for (let i = 0; i < it.pts.length; i++) if (dist(it.pts[i], it.pts[Math.min(i + 1, it.pts.length - 1)], p) < th + it.width / 2) { d.ids.add(it.id); break; } }
      else if (it.type === "shape") {
        const near = it.shape === "line" || it.shape === "arrow" ? dist(it.a, it.b, p) < th : (() => { const x0 = Math.min(it.a[0], it.b[0]), x1 = Math.max(it.a[0], it.b[0]), y0 = Math.min(it.a[1], it.b[1]), y1 = Math.max(it.a[1], it.b[1]); const inside = p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1; return it.fill ? inside : inside && (Math.min(p[0] - x0, x1 - p[0]) * W < th || Math.min(p[1] - y0, y1 - p[1]) * H < th); })();
        if (near) d.ids.add(it.id);
      }
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || !engine) return;
    const p = norm(e);
    if (d.kind === "stroke") { const cur = draftItemRef.current as Extract<Item, { type: "stroke" }>; const last = cur.pts[cur.pts.length - 1]; if (Math.hypot((p[0] - last[0]) * dims.w, (p[1] - last[1]) * dims.h) > 1.5) setDI({ ...cur, pts: [...cur.pts, p] }); }
    else if (d.kind === "shape") { const cur = draftItemRef.current as Extract<Item, { type: "shape" }>; let b = p; if (e.shiftKey) { const dx = p[0] - cur.a[0], dy = p[1] - cur.a[1]; b = Math.abs(dx * dims.w) > Math.abs(dy * dims.h) ? [p[0], cur.a[1]] : [cur.a[0], p[1]]; } setDI({ ...cur, b }); }
    else if (d.kind === "blur") { const s = (d as unknown as { start: Pt }).start; setDI({ id: d.id, type: "blur", x: Math.min(s[0], p[0]), y: Math.min(s[1], p[1]), w: Math.abs(p[0] - s[0]), h: Math.abs(p[1] - s[1]), mode: tool.blurMode }); }
    else if (d.kind === "erase") eraseAt(p);
    else if (d.kind === "move") {
      const dx = p[0] - d.start[0], dy = p[1] - d.start[1];
      live((s) => ({ ...s, items: s.items.map((i) => (i.id === d.id ? ({ ...d.orig, x: d.orig.x + dx, y: d.orig.y + dy } as Item) : i)) }));
    }
    if (d.kind === "scale") {
      const o = d.orig, b = engine.itemBox(o, dims.w, dims.h);
      if (o.type === "blur") live((s) => ({ ...s, items: s.items.map((i) => (i.id === o.id ? { ...o, w: Math.max(0.02, p[0] - o.x), h: Math.max(0.02, p[1] - o.y) } : i)) }));
      else { const k = Math.hypot(p[0] * dims.w - b.cx, p[1] * dims.h - b.cy) / d.d0; live((s) => ({ ...s, items: s.items.map((i) => (i.id === o.id ? ({ ...o, size: clamp(o.size * k, 0.015, 0.6) } as Item) : i)) })); }
    } else if (d.kind === "rotate") {
      const o = d.orig; if (o.type === "blur") return;
      const b = engine.itemBox(o, dims.w, dims.h);
      let a = Math.atan2(p[1] * dims.h - b.cy, p[0] * dims.w - b.cx) + Math.PI / 2;
      if (e.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);
      live((s) => ({ ...s, items: s.items.map((i) => (i.id === o.id ? ({ ...o, rot: a } as Item) : i)) }));
    } else if (d.kind === "crop") {
      const dx = p[0] - d.start[0], dy = p[1] - d.start[1], c = d.crop, h = d.handle, r = dims.w / dims.h, a = tool.aspect;
      let x0 = c.x, y0 = c.y, x1 = c.x + c.w, y1 = c.y + c.h;
      if (h === "move") { const nx = clamp(c.x + dx, 0, 1 - c.w), ny = clamp(c.y + dy, 0, 1 - c.h); x0 = nx; y0 = ny; x1 = nx + c.w; y1 = ny + c.h; }
      else {
        if (h.includes("w")) x0 = clamp(c.x + dx, 0, x1 - 0.04); if (h.includes("e")) x1 = clamp(c.x + c.w + dx, x0 + 0.04, 1);
        if (h.includes("n")) y0 = clamp(c.y + dy, 0, y1 - 0.04); if (h.includes("s")) y1 = clamp(c.y + c.h + dy, y0 + 0.04, 1);
        if (a) {
          let w = x1 - x0, hh = y1 - y0;
          if (h === "n" || h === "s") w = (hh * a) / r; else hh = (w * r) / a;
          if (h.includes("w")) x0 = x1 - w; else if (h.includes("e")) x1 = x0 + w; else { const mx = (x0 + x1) / 2; x0 = mx - w / 2; x1 = mx + w / 2; }
          if (h.includes("n")) y0 = y1 - hh; else if (h.includes("s")) y1 = y0 + hh; else { const my = (y0 + y1) / 2; y0 = my - hh / 2; y1 = my + hh / 2; }
          if (x0 < 0 || x1 > 1 || y0 < 0 || y1 > 1) return;
        }
      }
      live((s) => ({ ...s, crop: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }));
    }
  };

  const onUp = () => {
    const d = drag.current; drag.current = null; if (!d) return;
    if (d.kind === "stroke" || d.kind === "shape" || d.kind === "blur") {
      const it = draftItemRef.current; setDI(null);
      if (!it) return;
      if (it.type === "blur" && (it.w < 0.01 || it.h < 0.01)) return;
      commit(tt(it.type === "blur" ? "ed.blur" : it.type === "stroke" ? "draw.pen" : "ed.draw"), (s) => ({ ...s, items: [...s.items, it] }));
      if (it.type === "blur") setSel(it.id);
    } else if (d.kind === "erase") {
      if (d.ids.size) commit(tt("draw.eraser"), (s) => ({ ...s, items: s.items.filter((i) => !d.ids.has(i.id)) }));
    } else commitDraft(tt("ed.tool"));
  };

  const onDbl = (e: React.MouseEvent) => {
    if (!engine) return;
    const hit = hitItem(norm(e));
    if (hit?.type === "text") { setTab("text"); setSel(hit.id); }
  };

  const selItem = st.items.find((i) => i.id === sel && isMovable(i)) as Movable | undefined;
  const selBox = selItem && engine && !compare ? engine.itemBox(selItem, cw, ch) : null;
  const cropPx = { l: st.crop.x * cw, t: st.crop.y * ch, w: st.crop.w * cw, h: st.crop.h * ch };

  const panelProps: PanelProps = { st, engine: engine!, sel, setSel, live, commit, commitDraft, tool, setTool, filterThumbs, dims };
  const cursor = tab === "draw" ? (tool.tool === "eraser" ? "cell" : "crosshair") : tab === "blur" ? "crosshair" : "default";
  const histList = hist.map((h, i) => ({ ...h, i }));

  return (
    <div className="h-full flex flex-col bg-surface min-w-0">
      {/* top bar */}
      <header className="shrink-0 h-16 px-2 sm:px-4 flex items-center gap-1 sm:gap-2">
        <IconBtn icon={ArrowLeft} label={tt("back")} kbd="Esc" onClick={leave} />
        <div className="min-w-0 flex-1 flex items-center gap-2"><h1 className="font-bold truncate text-lg">{baseName(path)}</h1>{dirty && <span className="hidden sm:inline-flex items-center gap-1 h-6 px-2.5 rounded-lg bg-tertiary-container text-on-tertiary-container text-xs font-bold anim-pop"><FilePenLine size={12} />{tt("ed.edited")}</span>}</div>
        <IconBtn icon={Undo2} label={tt("undo")} kbd="Ctrl+Z" disabled={hi === 0} onClick={undo} />
        <IconBtn icon={Redo2} label={tt("redo")} kbd="Ctrl+Y" disabled={hi >= hist.length - 1} onClick={redo} />
        <span className="hidden sm:contents"><IconBtn icon={History} label={tt("ed.history")} onClick={() => setHistOpen(true)} />
          <IconBtn icon={RotateCcw} label={tt("ed.resetAll")} disabled={!dirty} onClick={() => commit(tt("ed.resetAll"), () => initialState())} /></span>
        <Tip label={tt("ed.compare")}><button className={cx("btn btn-icon", compare && "on")} onPointerDown={() => setCompare(true)} onPointerUp={() => setCompare(false)} onPointerLeave={() => setCompare(false)}><Eye size={22} /></button></Tip>
        <div className="flex ml-1">
          <Btn kind="filled" icon={Save} loading={saving} className="!rounded-r-md pr-4" onClick={() => save(false)}>{tt("save")}</Btn>
          <Tip label={tt("act.menu")}><button onClick={saveMenu} className="btn btn-filled !w-10 !px-0 !rounded-l-md ml-0.5" aria-label={tt("more")}><ChevronDown size={18} /></button></Tip>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* stage */}
        <div ref={stage} className="relative flex-1 min-h-[40%] md:min-h-0 min-w-0 grid place-items-center overflow-hidden bg-surface-dim md:rounded-tl-[32px] md:mr-0 md:ml-3 mb-0 mx-2 md:mx-0 rounded-[28px] md:rounded-b-none">
          {!engine && !error && <div className="flex flex-col items-center gap-3 text-on-surface-variant"><Spinner size={34} /><span className="text-sm font-medium">{tt("ed.loading")}</span></div>}
          {error && <p className="text-on-surface-variant">{tt("view.loadFail")}</p>}
          {engine && (
            <div ref={wrap} className="relative select-none touch-none anim-scale" style={{ width: cw, height: ch, cursor }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDbl}>
              <div className="absolute inset-0 checker rounded-sm" />
              <canvas ref={disp} className="absolute inset-0 w-full h-full rounded-sm shadow-e2" />
              {tab === "crop" && !compare && (<>
                <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute" style={{ left: cropPx.l, top: cropPx.t, width: cropPx.w, height: cropPx.h, boxShadow: "0 0 0 9999px rgb(0 0 0 / .58)" }} /></div>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute pointer-events-auto" data-handle="move" style={{ left: cropPx.l, top: cropPx.t, width: cropPx.w, height: cropPx.h, cursor: "move", outline: "2px solid #fff" }}>
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(#fff6 1px,transparent 1px),linear-gradient(90deg,#fff6 1px,transparent 1px)", backgroundSize: "33.333% 33.333%" }} />
                    {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => {
                      const corner = h.length === 2;
                      const pos: React.CSSProperties = { left: h.includes("w") ? 0 : h.includes("e") ? "100%" : "50%", top: h.includes("n") ? 0 : h.includes("s") ? "100%" : "50%" };
                      return <span key={h} data-handle={h} style={{ ...pos, cursor: `${h}-resize`, width: corner ? 22 : h === "n" || h === "s" ? 30 : 10, height: corner ? 22 : h === "n" || h === "s" ? 10 : 30 }}
                        className={cx("absolute -translate-x-1/2 -translate-y-1/2 bg-white shadow-e2", corner ? "rounded-[7px]" : "rounded-full")} />;
                    })}
                  </div>
                </div></>)}
              {selBox && tab !== "crop" && (
                <div className="absolute pointer-events-none" style={{ left: selBox.cx, top: selBox.cy, width: selBox.w, height: selBox.h, transform: `translate(-50%,-50%) rotate(${selBox.rot}rad)` }}>
                  <div className="absolute inset-0 rounded-md border-2 border-primary" style={{ boxShadow: "0 0 0 1px #fff8" }} />
                  <span data-handle="scale" className="absolute -right-3 -bottom-3 size-6 rounded-full bg-primary border-2 border-white pointer-events-auto cursor-nwse-resize shadow-e2" />
                  {selItem?.type !== "blur" && <>
                    <span className="absolute left-1/2 -top-7 h-7 w-px bg-primary" />
                    <span data-handle="rotate" className="absolute left-1/2 -top-10 -translate-x-1/2 size-6 rounded-full bg-primary border-2 border-white pointer-events-auto cursor-grab shadow-e2 grid place-items-center"><RotateCcw size={12} color="#fff" /></span>
                  </>}
                </div>
              )}
              {compare && <div className="absolute left-3 top-3 px-3 h-7 rounded-full bg-inverse-surface text-inverse-on-surface text-xs font-bold grid place-items-center anim-pop">{tt("ed.original")}</div>}
            </div>
          )}
        </div>

        {/* tools */}
        <aside className="shrink-0 md:w-[22.5rem] h-[44%] md:h-auto flex flex-col min-h-0 bg-surface md:bg-transparent">
          <nav className="shrink-0 grid grid-cols-8 gap-1.5 px-3 py-2.5" aria-label={tt("ed.tool")}>
            {TABS.map((x) => (
              <Tip key={x.id} label={tt(x.label as never)}>
                <button onClick={() => { setTab(x.id); if (x.id !== "text" && x.id !== "stickers" && x.id !== "blur") setSel(null); }} aria-pressed={tab === x.id}
                  className={cx("h-11 w-full grid place-items-center transition-all duration-400 ease-spring",
                    tab === x.id ? "bg-primary text-on-primary rounded-full shadow-e1 scale-105" : "rounded-[14px] bg-surface-high text-on-surface-variant hover:bg-surface-highest hover:rounded-full")}>
                  <x.icon size={19} />
                </button>
              </Tip>
            ))}
          </nav>
          <div key={tab} className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-1 anim-float"><h2 className="text-lg font-extrabold mb-3">{tt((TABS.find((x) => x.id === tab)?.label ?? "ed.crop") as never)}</h2>
            {!engine ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-2xl" />)}</div> : <>
              {tab === "crop" && <CropPanel {...panelProps} />}
              {tab === "adjust" && <AdjustPanel {...panelProps} />}
              {tab === "filters" && <FiltersPanel {...panelProps} />}
              {tab === "draw" && <DrawPanel {...panelProps} />}
              {tab === "text" && <TextPanel {...panelProps} />}
              {tab === "stickers" && <StickersPanel {...panelProps} />}
              {tab === "blur" && <BlurPanel {...panelProps} />}
              {tab === "export" && <ExportPanel {...panelProps} opts={exp} setOpts={setExp} onSave={save} onClipboard={toClipboard} canOverwrite={canOverwrite} />}
            </>}
          </div>
        </aside>
      </div>

      <Modal open={histOpen} onClose={() => setHistOpen(false)} title={tt("ed.history")} icon={History} width={420}
        actions={<Btn kind="tonal" icon={X} onClick={() => setHistOpen(false)}>{tt("close")}</Btn>}>
        <ol className="space-y-1.5 pt-1">
          {histList.slice().reverse().map((h) => (
            <li key={h.i}><button onClick={() => { setHi(h.i); setDraft(null); draftRef.current = null; setHistOpen(false); }}
              className={cx("w-full flex items-center gap-3 h-12 px-4 rounded-2xl text-left font-semibold transition-colors", h.i === hi ? "bg-secondary-container text-on-secondary-container" : "hover:bg-on-surface/8")}>
              <span className="size-7 grid place-items-center rounded-full bg-surface-highest text-xs">{h.i}</span><span className="flex-1 truncate">{h.label}</span>{h.i === hi && <Check size={18} />}
            </button></li>
          ))}
        </ol>
      </Modal>
    </div>
  );
}
