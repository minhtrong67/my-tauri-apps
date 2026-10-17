import { useEffect, useRef, useState } from 'react';
import { engine } from '../lib/engine';
import { mediaUrl } from '../lib/tauri';
import { useCurrent, useStore } from '../lib/store';
import { fmtTime } from '../lib/utils';

/**
 * Seek bar: buffered range, A-B markers, drag to scrub, hover time + frame preview.
 * The moving parts are updated straight on the DOM from one animation-frame loop (no React re-render per frame),
 * and the preview <video> only exists while the pointer is over the bar, so it never competes with playback.
 */
export function SeekBar() {
  const cur = useCurrent();
  const duration = useStore((s) => s.duration);
  const loopA = useStore((s) => s.loopA);
  const loopB = useStore((s) => s.loopB);
  const bar = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const buf = useRef<HTMLDivElement>(null);
  const prev = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [previewOn, setPreviewOn] = useState(false);
  // a second decoder on a very high bitrate file (4K / HEVC / 10-bit) would steal the decoder from playback:
  // above ~25 Mbps the bar shows only the time tooltip
  const heavy = !!cur && duration > 0 && (cur.size * 8) / duration > 25_000_000;
  const scrubRef = useRef<number | null>(null);
  const seekTimer = useRef<number>();
  const offTimer = useRef<number>();
  const hoverTimer = useRef<number>();

  scrubRef.current = scrub;

  // progress + buffered range, written directly to the DOM
  useEffect(() => {
    let raf = 0;
    let lastBuf = 0;
    const tick = (now: number) => {
      const el = engine.el;
      const d = el && isFinite(el.duration) ? el.duration : 0;
      if (el && d > 0) {
        const t = scrubRef.current ?? el.currentTime;
        const pct = `${Math.min(100, (t / d) * 100)}%`;
        if (fill.current) fill.current.style.width = pct;
        if (knob.current) knob.current.style.left = pct;
        if (buf.current && now - lastBuf > 250) {
          lastBuf = now;
          const b = el.buffered;
          let end = 0;
          for (let i = 0; i < b.length; i++) if (b.start(i) <= el.currentTime + 0.5) end = Math.max(end, b.end(i));
          buf.current.style.width = `${Math.min(100, (end / d) * 100)}%`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // the preview video is created lazily (only while hovering) and torn down shortly after
  useEffect(() => {
    const v = prev.current;
    if (!previewOn || !v || !cur) return;
    let stale = false;
    void mediaUrl(cur.path).then((u) => {
      if (!stale) v.src = u;
    });
    return () => {
      stale = true;
      v.removeAttribute('src');
      v.load();
    };
  }, [previewOn, cur?.path]);

  const timeAt = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    return { x, t: (x / r.width) * duration };
  };

  const drawPreview = () => {
    const v = prev.current, c = canvas.current;
    if (!v || !c || !v.videoWidth) return;
    c.width = 192;
    c.height = Math.round((192 * v.videoHeight) / v.videoWidth);
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!duration) return;
    const h = timeAt(e.clientX);
    setHover(h);
    if (scrub !== null) setScrub(h.t);
    window.clearTimeout(offTimer.current);
    if (!heavy && !previewOn && scrub === null && !hoverTimer.current) hoverTimer.current = window.setTimeout(() => { hoverTimer.current = undefined; setPreviewOn(true); }, 280);
    window.clearTimeout(seekTimer.current);
    // the preview is a second decoder on the same file: only drive it once the pointer rests, never while dragging,
    // and never while the main video is seeking, buffering or has only just finished a seek
    if (scrub !== null) return;
    seekTimer.current = window.setTimeout(() => {
      const v = prev.current;
      const main = engine.el;
      const busy = !main || main.seeking || main.readyState < 3 || performance.now() - engine.lastSeekEnd < 1200;
      if (v && v.readyState >= 1 && isFinite(h.t) && !busy && !v.seeking) v.currentTime = h.t;
    }, 220);
  };

  const onLeave = () => {
    if (scrub !== null) return;
    setHover(null);
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = undefined;
    window.clearTimeout(offTimer.current);
    offTimer.current = window.setTimeout(() => setPreviewOn(false), 1200);
  };

  const onDown = (e: React.PointerEvent) => {
    if (!duration) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setScrub(timeAt(e.clientX).t);
    // release the preview decoder before the real seek starts
    window.clearTimeout(seekTimer.current);
    setPreviewOn(false);
  };
  const onUp = (e: React.PointerEvent) => {
    if (scrub === null) return;
    useStore.getState().seek(timeAt(e.clientX).t);
    setScrub(null);
  };

  return (
    <div
      ref={bar} className="group relative h-6 flex items-center cursor-pointer touch-none"
      onPointerMove={onMove} onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={onLeave}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {previewOn && !heavy && <video ref={prev} muted preload="metadata" crossOrigin="anonymous" className="hidden" onSeeked={drawPreview} onLoadedData={drawPreview} />}
      <div className="relative w-full h-1 group-hover:h-1.5 rounded-full bg-white/25 transition-[height] duration-200">
        <div ref={buf} className="absolute inset-y-0 left-0 rounded-full bg-white/35" />
        <div ref={fill} className="absolute inset-y-0 left-0 rounded-full bg-primary" />
        {loopA !== null && duration > 0 && <div className="absolute -top-1 -bottom-1 w-0.5 bg-tertiary" style={{ left: `${(loopA / duration) * 100}%` }} />}
        {loopB !== null && duration > 0 && <div className="absolute -top-1 -bottom-1 w-0.5 bg-tertiary" style={{ left: `${(loopB / duration) * 100}%` }} />}
        {loopA !== null && loopB !== null && duration > 0 && (
          <div className="absolute inset-y-0 bg-tertiary/60" style={{ left: `${(loopA / duration) * 100}%`, width: `${((loopB - loopA) / duration) * 100}%` }} />
        )}
        <div ref={knob} className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow scale-0 group-hover:scale-100 transition-transform" />
      </div>
      {hover && duration > 0 && (
        <div className="absolute bottom-7 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none animate-fade-in" style={{ left: Math.min(Math.max(hover.x, 100), (bar.current?.clientWidth ?? 0) - 100) }}>
          <canvas ref={canvas} className="rounded-lg shadow-lg border border-white/30 bg-black max-w-[192px]" style={{ display: previewOn && !heavy ? undefined : 'none' }} />
          <div className="px-2 py-0.5 rounded-md bg-black/80 text-white text-label-md tabular-nums">{fmtTime(scrub ?? hover.t)}</div>
        </div>
      )}
    </div>
  );
}
