import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fmtTime } from '../lib/utils';

/* ---------- Loading indicator: a shape that morphs between cookie / pentagon / triangle / flower while turning ---------- */
const PTS = 72;
function shape(n: number, a: number, squash = 1): string {
  const pts: string[] = [];
  for (let i = 0; i < PTS; i++) {
    const th = (i / PTS) * Math.PI * 2;
    const r = (1 + a * Math.cos(n * th)) / (1 + Math.abs(a));
    pts.push(`${(50 + 46 * r * Math.cos(th)).toFixed(1)} ${(50 + 46 * squash * r * Math.sin(th)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
const SHAPES = [shape(9, 0.1), shape(5, 0.14), shape(3, 0.2), shape(12, 0.09), shape(6, 0.17), shape(2, 0.12, 0.86)];
const VALUES = [...SHAPES, SHAPES[0]].join(';');
const SPLINE = Array(SHAPES.length).fill('0.34 1.56 0.64 1').join(';');
const TIMES = Array.from({ length: SHAPES.length + 1 }, (_, i) => (i / SHAPES.length).toFixed(3)).join(';');

export function LoadingIndicator({ size = 48, contained = true, className = '' }: { size?: number; contained?: boolean; className?: string }) {
  const calm = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <span
      role="progressbar" aria-busy="true" style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center shrink-0 rounded-full ${contained ? 'bg-primary-container text-primary' : 'text-primary'} ${className}`}
    >
      <svg viewBox="0 0 100 100" width={size * (contained ? 0.62 : 1)} height={size * (contained ? 0.62 : 1)} className={calm ? '' : 'li-spin'} fill="currentColor">
        <path d={SHAPES[0]}>
          {!calm && <animate attributeName="d" dur="5.4s" repeatCount="indefinite" calcMode="spline" values={VALUES} keyTimes={TIMES} keySplines={SPLINE} />}
        </path>
      </svg>
    </span>
  );
}

/* ---------- Wavy seek bar: the played part is a wave that flows while music plays and flattens when paused ---------- */
export function WavySeek({
  value, max, onChange, onCommit, playing, size = 'md', label,
}: { value: number; max: number; onChange: (v: number) => void; onCommit: (v: number) => void; playing: boolean; size?: 'sm' | 'md'; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const [w, setW] = useState(300);
  const [drag, setDrag] = useState(false);
  const H = size === 'md' ? 30 : 22;
  const sw = size === 'md' ? 5 : 4;
  const A = size === 'md' ? 4.5 : 3;
  const L = size === 'md' ? 32 : 24;
  const hh = size === 'md' ? 26 : 20;
  const gap = 7;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.max(40, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const x = frac * w;
  const path = useMemo(() => {
    let d = '';
    for (let px = -L; px <= w + L; px += 2) d += `${px === -L ? 'M' : 'L'}${px} ${(H / 2 + A * Math.sin((px / L) * Math.PI * 2)).toFixed(2)}`;
    return d;
  }, [w, L, A, H]);

  const at = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * max;
  };
  const key = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : 0;
    if (!step && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const v = e.key === 'Home' ? 0 : e.key === 'End' ? max : Math.min(max, Math.max(0, value + step));
    onChange(v);
    onCommit(v);
  };

  return (
    <div
      ref={ref} role="slider" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)} aria-valuetext={fmtTime(value)}
      className="relative w-full cursor-pointer touch-none select-none focus-ring rounded-full" style={{ height: H }}
      onPointerDown={(e) => { if (max <= 0) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); onChange(at(e)); }}
      onPointerMove={(e) => drag && onChange(at(e))}
      onPointerUp={(e) => { if (!drag) return; setDrag(false); onCommit(at(e)); }}
      onPointerCancel={() => setDrag(false)}
      onKeyDown={key}
    >
      <svg width={w} height={H} className="overflow-visible block">
        <defs>
          <clipPath id={clipId}><rect x={-sw} y={-A - sw} width={Math.max(0, x - gap + sw)} height={H + 2 * (A + sw)} /></clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <g className="wave-amp" style={{ transformOrigin: `0px ${H / 2}px`, transform: `scaleY(${playing ? 1 : 0.001})` }}>
            <path d={path} fill="none" stroke="rgb(var(--md-primary))" strokeWidth={sw} strokeLinecap="round" vectorEffect="non-scaling-stroke" className="wave-run"
              style={{ ['--wl' as string]: `${L}px`, animationPlayState: playing ? 'running' : 'paused' }} />
          </g>
        </g>
        {x + gap + sw < w && <line x1={x + gap + sw / 2} x2={w} y1={H / 2} y2={H / 2} stroke="rgb(var(--md-secondary-container))" strokeWidth={sw} strokeLinecap="round" />}
        <circle cx={x} cy={H / 2} r={drag ? hh / 2 + 6 : hh / 2 + 2} fill="rgb(var(--md-primary))" opacity={drag ? 0.16 : 0} className="seek-halo" />
        <rect x={x - (drag ? 1.5 : 2)} y={H / 2 - hh / 2} width={drag ? 3 : 4} height={hh} rx={2} fill="rgb(var(--md-primary))" />
      </svg>
    </div>
  );
}
