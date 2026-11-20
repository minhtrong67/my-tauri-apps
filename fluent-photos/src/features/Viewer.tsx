import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Copy, Expand, FilePenLine, Files, FolderHeart, FolderSearch, Heart, ImageOff, Info, Maximize, Minimize, MapPin, Ellipsis, Pause, Pencil, Play,
  Printer, RotateCcw, RotateCw, Shuffle, Repeat, SlidersHorizontal, Trash2, Wallpaper, X, ZoomIn, ZoomOut, ScanSearch, Camera, Film, Check, Timer,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { app, setSetting, showMenu, t, useApp, userData, useSettings, useT, type MenuItem } from "../lib/store";
import { api, isTauri, reveal, src } from "../lib/tauri";
import { copyImage, copyText, deleteFiles, findEntry, goGallery, isFav, openEditor, printImage, renameDialog, rotateFile, setWallpaper, toggleFav } from "../lib/actions";
import type { ExifInfo } from "../lib/types";
import { baseName, clamp, cx, dirName, fmtSize, isEditable, shuffle } from "../lib/utils";
import { IconBtn, Spinner, Segmented, SliderRow, Switch, Tip, Btn, tipStore } from "../components/ui";
import { Modal } from "../components/Overlays";
import { pickAlbum } from "./Gallery";

const MIN_Z = 0.05, MAX_Z = 32;

export function Viewer() {
  const tt = useT();
  const current = useApp((s) => s.current)!;
  const ctx = useApp((s) => s.ctx);
  const version = useApp((s) => s.version);
  const confirmDel = useSettings((s) => s.confirmDelete);
  const slide = useSettings((s) => s.slide);
  const entry = useMemo(() => findEntry(current), [current, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const favs = userData.use((s) => s.favs);
  const idx = Math.max(0, ctx.indexOf(current));

  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });
  const [tf, setTf] = useState({ z: 1, x: 0, y: 0 });
  const [smooth, setSmooth] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState(false);
  const [dir, setDir] = useState(1);
  const [info, setInfo] = useState(false);
  const [idleCursor, setIdleCursor] = useState(false);
  const [full, setFull] = useState(false);
  const [strip, setStrip] = useState(false); // the picture strip only appears when asked for
  const [playing, setPlaying] = useState(false);
  const [slideOpts, setSlideOpts] = useState(false);
  const [tick, setTick] = useState(0);
  const order = useRef<string[] | null>(null);

  const fit = useMemo(() => (nat ? Math.min(box.w / nat.w, box.h / nat.h, 1) : 1), [nat, box]);
  const isFit = Math.abs(tf.z - fit) < 0.001;

  /* ---- measure stage ---- */
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const clampPan = useCallback((z: number, x: number, y: number) => {
    if (!nat) return { z, x: 0, y: 0 };
    const mx = Math.max(0, (nat.w * z - box.w) / 2), my = Math.max(0, (nat.h * z - box.h) / 2);
    return { z, x: clamp(x, -mx, mx), y: clamp(y, -my, my) };
  }, [nat, box]);

  const resetView = useCallback((animate = false) => { setSmooth(animate); setTf({ z: fit, x: 0, y: 0 }); }, [fit]);
  useEffect(() => { if (nat) { setSmooth(false); setTf({ z: fit, x: 0, y: 0 }); } }, [nat, fit]);

  const zoomTo = useCallback((nz: number, cx0?: number, cy0?: number, animate = true) => {
    setSmooth(animate);
    setTf((p) => {
      const z = clamp(nz, Math.min(fit, MIN_Z), MAX_Z);
      const ox = cx0 ?? 0, oy = cy0 ?? 0;
      return clampPan(z, ox - (ox - p.x) * (z / p.z), oy - (oy - p.y) * (z / p.z));
    });
  }, [fit, clampPan]);

  /* ---- navigation ---- */
  const go = useCallback((to: number, d: number) => {
    const list = order.current ?? ctx;
    if (!list.length) return;
    const n = slide.loop || !playing ? (to + list.length) % list.length : to;
    if (n < 0 || n >= list.length) { setPlaying(false); return; }
    setDir(d); setNat(null); setErr(false);
    app.set({ current: list[n] });
  }, [ctx, slide.loop, playing]);
  const next = useCallback(() => go(idx + 1, 1), [go, idx]);
  const prev = useCallback(() => go(idx - 1, -1), [go, idx]);

  /* No pre-loading of neighbours: a decoded full-size photo can take 50-100 MB, so only the picture on screen is kept in memory. */

  /* ---- slideshow ---- */
  useEffect(() => {
    if (!playing) return;
    order.current = slide.shuffle ? [current, ...shuffle(ctx.filter((p) => p !== current))] : null;
    const id = setTimeout(() => { setTick((x) => x + 1); }, slide.interval * 1000);
    return () => clearTimeout(id);
  }, [playing, current, slide.interval, slide.shuffle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (playing && tick) { const list = order.current ?? ctx; const i = list.indexOf(current); go(i + 1, 1); } }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!playing) order.current = null; }, [playing]);

  /* No tooltip may ever appear over a picture, and nothing in the viewer floats above it. */
  useEffect(() => { tipStore.set({ off: true, tip: null }); return () => tipStore.set({ off: false }); }, []);
  useEffect(() => { app.set({ viewerFull: full }); return () => app.set({ viewerFull: false }); }, [full]);

  /* ---- full screen: the pointer hides itself after a moment (the toolbars are gone, only the picture stays) ---- */
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wake = useCallback(() => {
    setIdleCursor(false); clearTimeout(idle.current);
    if (full) idle.current = setTimeout(() => setIdleCursor(true), 1800);
  }, [full]);
  useEffect(() => { wake(); return () => clearTimeout(idle.current); }, [wake, current]);

  /* ---- fullscreen ---- */
  const toggleFull = useCallback(async () => {
    const next = !full;
    try { if (isTauri) await getCurrentWindow().setFullscreen(next); else if (next) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { /* ignore */ }
    setFull(next);
  }, [full]);
  useEffect(() => () => { if (isTauri) getCurrentWindow().setFullscreen(false).catch(() => {}); }, []);

  /* ---- wheel / pointer ---- */
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const r = stage.current!.getBoundingClientRect();
    const px = e.clientX - r.left - r.width / 2, py = e.clientY - r.top - r.height / 2;
    if (e.ctrlKey || Math.abs(e.deltaY) > 0 || e.deltaMode) zoomTo(tf.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), px, py, false);
  }, [zoomTo, tf.z]);
  useEffect(() => {
    const el = stage.current!; el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const pts = useRef(new Map<number, { x: number; y: number }>());
  const gest = useRef<{ d0: number; z0: number; sx: number; sy: number; x0: number; y0: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-chrome]")) return;
    stage.current!.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...pts.current.values()];
    gest.current = { d0: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0, z0: tf.z, sx: e.clientX, sy: e.clientY, x0: tf.x, y0: tf.y, moved: false };
    setSmooth(false); setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    wake();
    if (!pts.current.has(e.pointerId) || !gest.current) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gest.current, v = [...pts.current.values()];
    if (v.length >= 2 && g.d0) zoomTo(g.z0 * (Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) / g.d0), 0, 0, false);
    else {
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) g.moved = true;
      if (tf.z > fit + 0.001) setTf(clampPan(tf.z, g.x0 + dx, g.y0 + dy));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const g = gest.current; pts.current.delete(e.pointerId);
    if (!pts.current.size) {
      setDragging(false);
      if (g && g.moved && tf.z <= fit + 0.001 && pts.current.size === 0) { const dx = e.clientX - g.sx; if (Math.abs(dx) > 70 && Math.abs(e.clientY - g.sy) < 90) (dx < 0 ? next : prev)(); }
      gest.current = null;
    }
  };
  const onDbl = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-chrome]")) return;
    const r = stage.current!.getBoundingClientRect();
    if (isFit) zoomTo(Math.max(1, fit * 2.5), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2); else resetView(true);
  };

  /* ---- actions ---- */
  const del = useCallback(async () => {
    const list = ctx, i = idx;
    if (await deleteFiles([current])) {
      const rest = list.filter((p) => p !== current);
      if (!rest.length) goGallery(); else app.set({ current: rest[Math.min(i, rest.length - 1)], ctx: rest });
    }
  }, [ctx, idx, current]);
  void confirmDel;

  const moreMenu = (ev: React.MouseEvent<HTMLElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const items: MenuItem[] = [
      { label: tt("act.copyImage"), icon: Copy, kbd: "Ctrl+C", run: () => copyImage(current) },
      { label: tt("act.copyPath"), icon: Files, run: () => copyText(current) },
      { label: tt("act.print"), icon: Printer, kbd: "Ctrl+P", run: () => printImage(current) },
      { label: tt("act.wallpaper"), icon: Wallpaper, run: () => setWallpaper(current) },
      { divider: true },
      { label: tt("alb.addTo"), icon: FolderHeart, run: () => pickAlbum([current]) },
      { label: tt("act.reveal"), icon: FolderSearch, run: () => reveal(current) },
      { label: tt("rename"), icon: Pencil, kbd: "F2", run: () => renameDialog(current) },
      { divider: true },
      { label: tt("delete"), icon: Trash2, danger: true, kbd: "Del", run: del },
    ];
    showMenu(items, rect);
  };

  /* ---- keyboard ---- */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (isEditable(e.target) || app.get().view !== "viewer") return;
      const key = e.key.toLowerCase();
      if (e.ctrlKey && key === "c") { e.preventDefault(); copyImage(current); return; }
      if (e.ctrlKey && key === "p") { e.preventDefault(); printImage(current); return; }
      if (e.ctrlKey || e.altKey) return;
      if (key === "arrowright" || key === "pagedown") next();
      else if (key === "arrowleft" || key === "pageup") prev();
      else if (key === "home") go(0, -1);
      else if (key === "end") go(ctx.length - 1, 1);
      else if (key === "+" || key === "=") zoomTo(tf.z * 1.3);
      else if (key === "-") zoomTo(tf.z / 1.3);
      else if (key === "0") resetView(true);
      else if (key === "1") zoomTo(1);
      else if (key === "f") toggleFull();
      else if (key === "i") setInfo((v) => !v);
      else if (key === "s") setPlaying((v) => !v);
      else if (key === " ") { e.preventDefault(); if (playing) setPlaying(false); else next(); }
      else if (key === "h") toggleFav(current);
      else if (key === "e") openEditor();
      else if (key === "r") rotateFile(current, e.shiftKey ? 270 : 90);
      else if (key === "delete") del();
      else if (key === "f2") renameDialog(current);
      else if (key === "escape") { if (full) toggleFull(); else if (playing) setPlaying(false); else if (info) setInfo(false); else goGallery(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [current, next, prev, go, ctx.length, zoomTo, tf.z, resetView, toggleFull, playing, full, info, del]);

  const mtime = entry?.mtime;
  const url = src(current, mtime ? mtime + version : version);
  const fav = favs.includes(current);
  const pct = Math.round(tf.z * 100);
  const showMini = nat && tf.z > fit * 1.08 && !playing;

  const enterAnim = slide.transition === "slide" || !playing ? "anim-right" : "";
  const imgAnim = playing ? (slide.transition === "zoom" ? "anim-scale" : slide.transition === "slide" ? "anim-right" : "anim-fade") : enterAnim;
  const nav = ctx.length > 1 && !full;

  /* Layout rule: every control lives in its own row or column around the picture. Nothing is drawn over the picture. */
  return (
    <div className="h-full flex flex-col bg-app text-on-surface overflow-hidden" onMouseMove={wake}>
      {/* command bar */}
      {!full && (
        <header className="shrink-0 h-12 px-2 flex items-center gap-1">
          <IconBtn icon={ArrowLeft} label={tt("back")} kbd="Esc" onClick={goGallery} />
          <div className="min-w-0 flex-1 px-1.5">
            <div className="truncate font-semibold leading-5">{baseName(current)}</div>
            <div className="text-xs text-on-surface-variant truncate">{tt("view.of", { a: idx + 1, b: ctx.length })}{nat ? ` · ${nat.w} × ${nat.h}` : ""}{entry ? ` · ${fmtSize(entry.size)}` : ""}</div>
          </div>
          <button type="button" aria-label={tt(fav ? "fav.remove" : "fav.add")} aria-pressed={fav} onClick={() => toggleFav(current)} className={cx("btn btn-icon", fav && "on")}>
            <Heart size={18} strokeWidth={1.75} fill={fav ? "currentColor" : "none"} className={fav ? "text-[#e74856]" : ""} />
          </button>
          <span className="hidden sm:contents">
            <IconBtn icon={RotateCcw} label={tt("act.rotateLeft")} kbd="Shift+R" onClick={() => rotateFile(current, 270)} />
            <IconBtn icon={RotateCw} label={tt("act.rotateRight")} kbd="R" onClick={() => rotateFile(current, 90)} />
            <IconBtn icon={playing ? Pause : Play} label={playing ? tt("view.stop") : tt("act.slideshow")} kbd="S" on={playing} onClick={() => setPlaying((v) => !v)} />
          </span>
          <IconBtn icon={Info} label={tt("act.info")} kbd="I" on={info} onClick={() => setInfo((v) => !v)} />
          <button type="button" aria-label={tt("act.edit")} onClick={openEditor} className="btn btn-tonal mx-1"><FilePenLine size={16} strokeWidth={1.75} /><span className="hidden md:inline">{tt("act.edit")}</span></button>
          <IconBtn icon={Ellipsis} label={tt("more")} onClick={moreMenu} />
        </header>
      )}

      {/* picture row: [previous] [stage] [next] [info panel] */}
      <div className="flex-1 min-h-0 flex">
        {nav && <div className="w-11 shrink-0 grid place-items-center"><IconBtn icon={ChevronLeft} label={tt("act.prev")} kbd="←" onClick={prev} /></div>}
        <div ref={stage} className={cx("relative flex-1 min-w-0 overflow-hidden touch-none bg-surface-dim", full && idleCursor ? "cursor-none" : tf.z > fit + 0.001 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default")}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDbl}>
          {err ? (
            <div className="absolute inset-0 grid place-items-center text-on-surface-variant"><div className="flex flex-col items-center gap-3"><ImageOff size={48} strokeWidth={1.4} /><p>{tt("view.loadFail")}</p></div></div>
          ) : (
            <>
              {!nat && <div className="absolute inset-0 grid place-items-center"><Spinner size={32} /></div>}
              <div key={current} className={cx("absolute inset-0 pointer-events-none", imgAnim)}><img ref={img} src={url} alt={baseName(current)} draggable={false} className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: nat?.w, height: nat?.h, opacity: nat ? 1 : 0, willChange: dragging || smooth ? "transform" : "auto",
                  transform: `translate(-50%,-50%) translate(${tf.x}px,${tf.y}px) scale(${tf.z})`,
                  transition: smooth ? "transform .25s cubic-bezier(0,0,0,1)" : "none", imageRendering: tf.z > 3 ? "pixelated" : "auto",
                }}
                onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} onError={() => setErr(true)} /></div>
            </>
          )}
        </div>
        {nav && <div className="w-11 shrink-0 grid place-items-center"><IconBtn icon={ChevronRight} label={tt("act.next")} kbd="→" onClick={next} /></div>}
        {info && !full && <InfoPanel path={current} nat={nat} onClose={() => setInfo(false)} />}
      </div>

      {/* bottom: filmstrip row, slideshow progress, zoom bar (all in their own rows, below the picture) */}
      {!full && (
        <>
          {strip && ctx.length > 1 && <div className="shrink-0 h-[5.25rem] px-3 items-center justify-center hidden md:flex"><Filmstrip ctx={ctx} idx={idx} onPick={(i) => go(i, i > idx ? 1 : -1)} /></div>}
          {playing && <div className="shrink-0 h-0.5 bg-on-surface/10 overflow-hidden"><div key={current} className="h-full bg-primary origin-left" style={{ animation: `progress ${slide.interval}s linear both` }} /></div>}
          <footer className="shrink-0 h-14 relative flex items-center justify-center gap-0.5 px-3">
            {showMini && nat && <Minimap nat={nat} box={box} tf={tf} url={url} />}
            <IconBtn sm icon={ZoomOut} label={tt("act.zoomOut")} kbd="-" onClick={() => zoomTo(tf.z / 1.3)} />
            <Tip label={isFit ? tt("act.actual") : tt("act.fit")} kbd={isFit ? "1" : "0"}><button className="btn btn-icon !w-auto px-2 text-sm tabular-nums min-w-[3.6rem]" onClick={() => (isFit ? zoomTo(1) : resetView(true))}>{pct}%</button></Tip>
            <IconBtn sm icon={ZoomIn} label={tt("act.zoomIn")} kbd="+" onClick={() => zoomTo(tf.z * 1.3)} />
            <div className="w-px h-5 bg-outline-variant mx-1.5" />
            <IconBtn sm icon={isFit ? ScanSearch : Expand} label={isFit ? tt("act.actual") : tt("act.fit")} onClick={() => (isFit ? zoomTo(1) : resetView(true))} />
            <IconBtn sm icon={full ? Minimize : Maximize} label={full ? tt("act.exitFullscreen") : tt("act.fullscreen")} kbd="F" onClick={toggleFull} />
            <IconBtn sm icon={Film} label={tt("view.filmstrip")} on={strip} onClick={() => setStrip((v) => !v)} className="hidden md:grid" />
            {playing && <><div className="w-px h-5 bg-outline-variant mx-1.5" /><IconBtn sm icon={SlidersHorizontal} label={tt("view.slideshow.settings")} onClick={() => setSlideOpts(true)} /></>}
          </footer>
        </>
      )}

      <Modal open={slideOpts} onClose={() => setSlideOpts(false)} title={tt("view.slideshow.settings")} icon={Timer} width={440}
        actions={<><Btn kind="filled" icon={playing ? Pause : Play} onClick={() => { setPlaying(!playing); setSlideOpts(false); }}>{playing ? tt("view.stop") : tt("view.start")}</Btn><Btn kind="tonal" onClick={() => setSlideOpts(false)}>{tt("close")}</Btn></>}>
        <div className="space-y-5 pt-1">
          <SliderRow label={tt("view.interval")} value={slide.interval} min={1} max={15} onChange={(v) => setSetting("slide", { ...slide, interval: v })} fmt={(v) => `${v}s`} />
          <div><div className="text-sm mb-2">{tt("view.transition")}</div>
            <Segmented className="w-full" value={slide.transition} onChange={(v) => setSetting("slide", { ...slide, transition: v })} options={[{ value: "fade", label: tt("tr.fade") }, { value: "slide", label: tt("tr.slide") }, { value: "zoom", label: tt("tr.zoom") }]} /></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Shuffle size={16} />{tt("view.shuffle")}</span><Switch label={tt("view.shuffle")} on={slide.shuffle} onChange={(v) => setSetting("slide", { ...slide, shuffle: v })} /></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Repeat size={16} />{tt("view.loop")}</span><Switch label={tt("view.loop")} on={slide.loop} onChange={(v) => setSetting("slide", { ...slide, loop: v })} /></div>
        </div>
      </Modal>
    </div>
  );
}

function Filmstrip({ ctx, idx, onPick }: { ctx: string[]; idx: number; onPick: (i: number) => void }) {
  const from = Math.max(0, idx - 14), to = Math.min(ctx.length, idx + 15);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("[data-cur]")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }, [idx]);
  return (
    <div ref={ref} className="max-w-[min(52rem,100%)] flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-lg">
      {ctx.slice(from, to).map((p, k) => {
        const i = from + k, on = i === idx, e = findEntry(p);
        return (
          <button key={p} data-cur={on ? "" : undefined} onClick={() => onPick(i)} aria-label={baseName(p)} aria-current={on}
            className={cx("relative size-14 shrink-0 overflow-hidden rounded transition-opacity duration-150", on ? "outline outline-2 outline-offset-1 outline-primary" : "opacity-70 hover:opacity-100")}>
            <Thumb path={p} mtime={e?.mtime ?? 0} />
          </button>
        );
      })}
    </div>
  );
}
function Thumb({ path, mtime }: { path: string; mtime: number }) {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => { let a = true; api.thumb(path, 320).then((p) => a && setU(src(p))).catch(() => a && setU(src(path, mtime))); return () => { a = false; }; }, [path, mtime]);
  return u ? <img src={u} className="size-full object-cover" alt="" draggable={false} /> : <div className="skeleton size-full" />;
}

/** Lives inside the zoom bar (below the picture), so it never covers the picture itself. */
function Minimap({ nat, box, tf, url }: { nat: { w: number; h: number }; box: { w: number; h: number }; tf: { z: number; x: number; y: number }; url: string }) {
  const s = Math.min(120 / nat.w, 40 / nat.h), mw = nat.w * s, mh = nat.h * s;
  const vw = Math.min(1, box.w / (nat.w * tf.z)) * mw, vh = Math.min(1, box.h / (nat.h * tf.z)) * mh;
  const vx = mw / 2 - vw / 2 - (tf.x / (nat.w * tf.z)) * mw, vy = mh / 2 - vh / 2 - (tf.y / (nat.h * tf.z)) * mh;
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded overflow-hidden border border-outline-variant anim-fade pointer-events-none" style={{ width: mw, height: mh }}>
      <img src={url} className="size-full object-cover" alt="" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute border-2 border-primary rounded-sm bg-white/10" style={{ left: clamp(vx, 0, mw - vw), top: clamp(vy, 0, mh - vh), width: vw, height: vh }} />
    </div>
  );
}

/* ---------------- Info panel: a column next to the picture, never on top of it ---------------- */
function InfoPanel({ path, nat, onClose }: { path: string; nat: { w: number; h: number } | null; onClose: () => void }) {
  const tt = useT();
  const version = useApp((s) => s.version);
  const entry = findEntry(path);
  const [ex, setEx] = useState<ExifInfo | null>(null);
  useEffect(() => { setEx(null); api.exif(path).then(setEx).catch(() => setEx({})); }, [path, version]);
  const cam = [ex?.make, ex?.model].filter(Boolean).join(" ");
  const rows: [string, string | undefined][] = [
    [tt("info.name"), baseName(path)], [tt("info.folder"), dirName(path)],
    [tt("info.dimensions"), nat ? `${nat.w} × ${nat.h}` : undefined], [tt("info.size"), entry ? fmtSize(entry.size) : undefined],
    [tt("info.modified"), entry ? new Date(entry.mtime).toLocaleString() : undefined], [tt("info.taken"), ex?.date?.replace(/^(\d{4})-(\d\d)-(\d\d)/, "$3/$2/$1")],
  ];
  const cams: [string, string | undefined][] = [[tt("info.camera"), cam], [tt("info.lens"), ex?.lens], [tt("info.iso"), ex?.iso], [tt("info.aperture"), ex?.f_number], [tt("info.shutter"), ex?.exposure], [tt("info.focal"), ex?.focal], [tt("info.software"), ex?.software]];
  const hasCam = cams.some(([, v]) => v);
  return (
    <aside className="w-[21rem] max-w-[42%] shrink-0 overflow-y-auto bg-layer border-l border-outline-variant text-on-surface anim-right">
      <div className="sticky top-0 z-10 flex items-center gap-2 pl-5 pr-2 h-12 bg-layer border-b border-outline-variant"><Info size={16} className="text-accent" /><h3 className="flex-1 font-semibold">{tt("info.title")}</h3><IconBtn sm icon={X} label={tt("close")} onClick={onClose} /></div>
      <div className="px-5 py-4 space-y-4">
        <dl className="space-y-2.5">{rows.filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt className="text-xs text-on-surface-variant">{k}</dt><dd className="text-sm break-all">{v}</dd></div>))}</dl>
        <div className="divider" />
        <div className="flex items-center gap-2 font-semibold text-sm"><Camera size={16} className="text-accent" />{tt("info.camera")}</div>
        {!ex ? <div className="skeleton h-16 rounded-lg" /> : hasCam ? (
          <div className="grid grid-cols-2 gap-2">{cams.filter(([, v]) => v).map(([k, v]) => (<div key={k} className="rounded bg-surface-low border border-outline-variant px-3 py-2 min-w-0 first:col-span-2 data-[w=lens]:col-span-2" data-w={k === tt("info.lens") ? "lens" : undefined}><div className="text-xs text-on-surface-variant">{k}</div><div className="text-sm truncate">{v}</div></div>))}</div>
        ) : <p className="text-sm text-on-surface-variant">{tt("info.noExif")}</p>}
        {ex?.lat != null && ex?.lon != null && (
          <Btn kind="tonal" icon={MapPin} className="w-full" onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${ex.lat}&mlon=${ex.lon}#map=15/${ex.lat}/${ex.lon}`, "_blank")}>{tt("info.openMap")} ({ex.lat.toFixed(4)}, {ex.lon.toFixed(4)})</Btn>
        )}
        <div className="divider" />
        <Histogram path={path} version={version} title={tt("info.histogram")} />
      </div>
    </aside>
  );
}

function Histogram({ path, version, title }: { path: string; version: number; title: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const blob = await (await fetch(src(path, version))).blob();
        const bmp = await createImageBitmap(blob);
        const w = 200, h = Math.max(1, Math.round((bmp.height / bmp.width) * 200));
        const c = new OffscreenCanvas(w, h), g = c.getContext("2d")!;
        g.drawImage(bmp, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data;
        const bins = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
        for (let i = 0; i < d.length; i += 4) { bins[0][d[i]]++; bins[1][d[i + 1]]++; bins[2][d[i + 2]]++; }
        const max = Math.max(...bins.flatMap((b) => Array.from(b.slice(2, 254)))) || 1;
        if (!alive || !cv.current) return;
        const ctx = cv.current.getContext("2d")!, W = cv.current.width, H = cv.current.height;
        ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "screen";
        ["#ff4d4d", "#37d65a", "#4d8dff"].forEach((col, ci) => {
          ctx.beginPath(); ctx.moveTo(0, H);
          for (let i = 0; i < 256; i++) ctx.lineTo((i / 255) * W, H - Math.min(1, bins[ci][i] / max) * (H - 4));
          ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = col + "99"; ctx.fill();
        });
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [path, version]);
  return (<div><div className="text-sm font-semibold mb-2">{title}</div><canvas ref={cv} width={256} height={96} className="w-full h-24 rounded bg-black/80" /></div>);
}
