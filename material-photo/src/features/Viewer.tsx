import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Copy, Expand, FilePenLine, Files, FolderHeart, FolderSearch, Heart, ImageOff, Info, Maximize, Minimize, MapPin, MoreVertical, Pause, Pencil, Play,
  Printer, RotateCcw, RotateCw, Shuffle, Repeat, SlidersHorizontal, Trash2, Wallpaper, X, ZoomIn, ZoomOut, ScanSearch, Camera, Film, Check, Timer,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { app, setSetting, showMenu, t, useApp, userData, useSettings, useT, type MenuItem } from "../lib/store";
import { api, isTauri, reveal, src } from "../lib/tauri";
import { copyImage, copyText, deleteFiles, findEntry, goGallery, isFav, openEditor, printImage, renameDialog, rotateFile, setWallpaper, toggleFav } from "../lib/actions";
import type { ExifInfo } from "../lib/types";
import { baseName, clamp, cx, dirName, fmtSize, isEditable, shuffle } from "../lib/utils";
import { IconBtn, Spinner, Kbd, Segmented, SliderRow, Switch, Tip, Btn } from "../components/ui";
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
  const [chrome, setChrome] = useState(true);
  const [full, setFull] = useState(false);
  const [strip, setStrip] = useState(true);
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

  /* preload neighbours */
  useEffect(() => {
    [ctx[idx + 1], ctx[idx - 1]].forEach((p) => { if (p) { const i = new Image(); i.src = src(p, findEntry(p)?.mtime); } });
  }, [idx, ctx]);

  /* ---- slideshow ---- */
  useEffect(() => {
    if (!playing) return;
    order.current = slide.shuffle ? [current, ...shuffle(ctx.filter((p) => p !== current))] : null;
    const id = setTimeout(() => { setTick((x) => x + 1); }, slide.interval * 1000);
    return () => clearTimeout(id);
  }, [playing, current, slide.interval, slide.shuffle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (playing && tick) { const list = order.current ?? ctx; const i = list.indexOf(current); go(i + 1, 1); } }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!playing) order.current = null; }, [playing]);

  /* ---- auto-hide chrome ---- */
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wake = useCallback(() => {
    setChrome(true); clearTimeout(idle.current);
    idle.current = setTimeout(() => { if (!info && !slideOpts) setChrome(false); }, full || playing ? 2200 : 3500);
  }, [info, slideOpts, full, playing]);
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

  const enterAnim = slide.transition === "slide" || !playing ? (dir > 0 ? "anim-right" : "anim-right") : "";
  const imgAnim = playing ? (slide.transition === "zoom" ? "anim-scale" : slide.transition === "slide" ? "anim-right" : "anim-fade") : enterAnim;

  return (
    <div className="h-full relative bg-[#0f0f13] text-white overflow-hidden" onMouseMove={wake}>
      <div ref={stage} className={cx("absolute inset-0 touch-none", tf.z > fit + 0.001 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default")}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDbl}>
                {err ? (
          <div className="absolute inset-0 grid place-items-center text-white/70"><div className="flex flex-col items-center gap-3"><ImageOff size={56} strokeWidth={1.4} /><p className="font-medium">{tt("view.loadFail")}</p></div></div>
        ) : (
          <>
            {!nat && <div className="absolute inset-0 grid place-items-center"><Spinner size={36} /></div>}
            <div key={current} className={cx("absolute inset-0 pointer-events-none", imgAnim)}><img ref={img} src={url} alt={baseName(current)} draggable={false} className="absolute left-1/2 top-1/2 max-w-none select-none will-change-transform"
              style={{
                width: nat?.w, height: nat?.h, opacity: nat ? 1 : 0,
                transform: `translate(-50%,-50%) translate(${tf.x}px,${tf.y}px) scale(${tf.z})`,
                transition: smooth ? "transform .32s cubic-bezier(.2,0,0,1)" : "none", imageRendering: tf.z > 3 ? "pixelated" : "auto",
              }}
              onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} onError={() => setErr(true)} /></div>
          </>
        )}
      </div>

      {/* top bar */}
      <div data-chrome className={cx("absolute inset-x-0 top-0 z-20 px-3 pt-3 pb-8 flex items-start gap-2 transition-all duration-500 ease-emphasized pointer-events-none",
        "bg-gradient-to-b from-scrim/55 to-transparent text-white", chrome ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4")}>
        <div className="pointer-events-auto flex items-center gap-2 min-w-0 flex-1">
          <IconBtn icon={ArrowLeft} label={tt("back")} kbd="Esc" onClick={goGallery} className="!text-white" />
          <div className="min-w-0"><div className="font-bold truncate text-[1.05rem] leading-5">{baseName(current)}</div>
            <div className="text-xs opacity-80 font-medium">{tt("view.of", { a: idx + 1, b: ctx.length })}{nat ? ` · ${nat.w} × ${nat.h}` : ""}{entry ? ` · ${fmtSize(entry.size)}` : ""}</div></div>
        </div>
        <div className="pointer-events-auto flex items-center gap-0.5 shrink-0">
          <IconBtn icon={Heart} label={tt(fav ? "fav.remove" : "fav.add")} kbd="H" on={fav} onClick={() => toggleFav(current)} className={cx("!text-white", fav && "!text-[#ff5a7a] !bg-white/15")} />
          <span className="hidden sm:contents">
            <IconBtn icon={RotateCcw} label={tt("act.rotateLeft")} kbd="Shift+R" onClick={() => rotateFile(current, 270)} className="!text-white" />
            <IconBtn icon={RotateCw} label={tt("act.rotateRight")} kbd="R" onClick={() => rotateFile(current, 90)} className="!text-white" />
            <IconBtn icon={playing ? Pause : Play} label={playing ? tt("view.stop") : tt("act.slideshow")} kbd="S" on={playing} onClick={() => setPlaying((v) => !v)} className="!text-white" />
          </span>
          <IconBtn icon={Info} label={tt("act.info")} kbd="I" on={info} onClick={() => setInfo((v) => !v)} className="!text-white" />
          <IconBtn icon={FilePenLine} label={tt("act.edit")} kbd="E" onClick={openEditor} className="!text-white" />
          <IconBtn icon={MoreVertical} label={tt("more")} onClick={moreMenu} className="!text-white" />
        </div>
      </div>

      {/* prev / next */}
      {ctx.length > 1 && (
        <>
          <div data-chrome className={cx("absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 hidden sm:block", chrome ? "opacity-100" : "opacity-0 pointer-events-none")}><IconBtn icon={ChevronLeft} label={tt("act.prev")} kbd="←" tone="tonal" side="right" size={26} className="!size-12 shadow-e3" onClick={prev} /></div>
          <div data-chrome className={cx("absolute right-3 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 hidden sm:block", chrome ? "opacity-100" : "opacity-0 pointer-events-none", info && "md:right-[24.5rem]")}><IconBtn icon={ChevronRight} label={tt("act.next")} kbd="→" tone="tonal" side="left" size={26} className="!size-12 shadow-e3" onClick={next} /></div>
        </>
      )}

      {/* bottom: floating toolbar + filmstrip */}
      <div data-chrome className={cx("absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-3 pb-3 pt-10 transition-all duration-500 ease-emphasized pointer-events-none",
        "bg-gradient-to-t from-scrim/50 to-transparent", chrome ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")}>
        <div className="pointer-events-auto flex items-center gap-0.5 p-1.5 rounded-full glass shadow-e3 border border-outline-variant/30">
          <IconBtn sm icon={ZoomOut} label={tt("act.zoomOut")} kbd="-" onClick={() => zoomTo(tf.z / 1.3)} />
          <Tip label={isFit ? tt("act.actual") : tt("act.fit")} kbd={isFit ? "1" : "0"}><button className="btn h-9 px-3 text-sm font-bold tabular-nums min-w-[4.2rem]" onClick={() => (isFit ? zoomTo(1) : resetView(true))}>{pct}%</button></Tip>
          <IconBtn sm icon={ZoomIn} label={tt("act.zoomIn")} kbd="+" onClick={() => zoomTo(tf.z * 1.3)} />
          <div className="w-px h-6 bg-outline-variant/60 mx-1" />
          <IconBtn sm icon={isFit ? ScanSearch : Expand} label={isFit ? tt("act.actual") : tt("act.fit")} onClick={() => (isFit ? zoomTo(1) : resetView(true))} />
          <IconBtn sm icon={full ? Minimize : Maximize} label={full ? tt("act.exitFullscreen") : tt("act.fullscreen")} kbd="F" onClick={toggleFull} />
          <IconBtn sm icon={Film} label={tt("view.filmstrip")} on={strip} onClick={() => setStrip((v) => !v)} className="hidden sm:grid" />
          {playing && <><div className="w-px h-6 bg-outline-variant/60 mx-1" /><IconBtn sm icon={SlidersHorizontal} label={tt("view.slideshow.settings")} onClick={() => setSlideOpts(true)} /></>}
        </div>
        {strip && ctx.length > 1 && <Filmstrip ctx={ctx} idx={idx} onPick={(i) => go(i, i > idx ? 1 : -1)} />}
        {playing && <div className="pointer-events-none w-full max-w-md h-1 rounded-full bg-white/25 overflow-hidden"><div key={current} className="h-full bg-primary origin-left" style={{ animation: `progress ${slide.interval}s linear both` }} /></div>}
      </div>

      {showMini && nat && <Minimap nat={nat} box={box} tf={tf} url={url} />}

      {info && <InfoPanel path={current} nat={nat} onClose={() => setInfo(false)} />}

      <Modal open={slideOpts} onClose={() => setSlideOpts(false)} title={tt("view.slideshow.settings")} icon={Timer} width={440}
        actions={<><Btn kind="tonal" icon={X} onClick={() => setSlideOpts(false)}>{tt("close")}</Btn><Btn kind="filled" icon={playing ? Pause : Play} onClick={() => { setPlaying(!playing); setSlideOpts(false); }}>{playing ? tt("view.stop") : tt("view.start")}</Btn></>}>
        <div className="space-y-5 pt-1">
          <SliderRow label={tt("view.interval")} value={slide.interval} min={1} max={15} onChange={(v) => setSetting("slide", { ...slide, interval: v })} fmt={(v) => `${v}s`} />
          <div><div className="text-sm font-medium mb-2">{tt("view.transition")}</div>
            <Segmented className="w-full" value={slide.transition} onChange={(v) => setSetting("slide", { ...slide, transition: v })} options={[{ value: "fade", label: tt("tr.fade") }, { value: "slide", label: tt("tr.slide") }, { value: "zoom", label: tt("tr.zoom") }]} /></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium"><Shuffle size={18} />{tt("view.shuffle")}</span><Switch label={tt("view.shuffle")} on={slide.shuffle} onChange={(v) => setSetting("slide", { ...slide, shuffle: v })} /></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium"><Repeat size={18} />{tt("view.loop")}</span><Switch label={tt("view.loop")} on={slide.loop} onChange={(v) => setSetting("slide", { ...slide, loop: v })} /></div>
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
    <div ref={ref} className="pointer-events-auto max-w-[min(46rem,100%)] flex gap-1.5 overflow-x-auto p-1.5 rounded-[22px] glass border border-outline-variant/30 shadow-e2 hidden sm:flex">
      {ctx.slice(from, to).map((p, k) => {
        const i = from + k, on = i === idx, e = findEntry(p);
        return (
          <button key={p} data-cur={on ? "" : undefined} onClick={() => onPick(i)} aria-label={baseName(p)}
            className={cx("relative size-14 shrink-0 overflow-hidden transition-all duration-400 ease-spring", on ? "rounded-[18px] scale-110 ring-2 ring-primary mx-1" : "rounded-[12px] opacity-70 hover:opacity-100 hover:rounded-[18px]")}>
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

function Minimap({ nat, box, tf, url }: { nat: { w: number; h: number }; box: { w: number; h: number }; tf: { z: number; x: number; y: number }; url: string }) {
  const W = 132, s = W / Math.max(nat.w, nat.h), mw = nat.w * s, mh = nat.h * s;
  const vw = Math.min(1, box.w / (nat.w * tf.z)) * mw, vh = Math.min(1, box.h / (nat.h * tf.z)) * mh;
  const vx = mw / 2 - vw / 2 - (tf.x / (nat.w * tf.z)) * mw, vy = mh / 2 - vh / 2 - (tf.y / (nat.h * tf.z)) * mh;
  return (
    <div className="absolute left-4 bottom-24 z-10 rounded-[18px] overflow-hidden shadow-e3 border border-white/30 anim-pop pointer-events-none" style={{ width: mw, height: mh }}>
      <img src={url} className="size-full object-cover" alt="" />
      <div className="absolute inset-0 bg-scrim/45" />
      <div className="absolute border-2 border-primary rounded-md bg-white/10" style={{ left: clamp(vx, 0, mw - vw), top: clamp(vy, 0, mh - vh), width: vw, height: vh }} />
    </div>
  );
}

/* ---------------- Info panel ---------------- */
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
    <aside data-chrome className="absolute z-30 glass shadow-e4 border border-outline-variant/40 text-on-surface overflow-y-auto anim-right inset-x-2 bottom-2 max-h-[62vh] rounded-[28px] md:inset-x-auto md:right-3 md:top-[4.5rem] md:bottom-24 md:w-[22rem] md:max-h-none">
      <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-3 glass"><Info size={20} className="text-primary" /><h3 className="flex-1 font-bold text-lg">{tt("info.title")}</h3><IconBtn sm icon={X} label={tt("close")} onClick={onClose} /></div>
      <div className="px-5 pb-5 space-y-4">
        <dl className="space-y-2.5">{rows.filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt className="text-[.7rem] font-semibold text-on-surface-variant uppercase-none">{k}</dt><dd className="text-sm font-medium break-all">{v}</dd></div>))}</dl>
        <div className="divider" />
        <div className="flex items-center gap-2 font-bold text-sm"><Camera size={17} className="text-primary" />{tt("info.camera")}</div>
        {!ex ? <div className="skeleton h-16 rounded-2xl" /> : hasCam ? (
          <div className="grid grid-cols-2 gap-2">{cams.filter(([, v]) => v).map(([k, v]) => (<div key={k} className="rounded-2xl bg-surface-high px-3 py-2 min-w-0 first:col-span-2"><div className="text-[.68rem] font-semibold text-on-surface-variant">{k}</div><div className="text-sm font-bold truncate">{v}</div></div>))}</div>
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
  return (<div><div className="text-sm font-bold mb-2">{title}</div><canvas ref={cv} width={256} height={96} className="w-full h-24 rounded-2xl bg-scrim/80" /></div>);
}
