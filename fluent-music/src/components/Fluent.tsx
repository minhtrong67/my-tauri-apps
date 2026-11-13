import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fmtTime } from '../lib/utils';

/** Fluent ProgressRing (indeterminate) */
export function ProgressRing({ size = 32, className = '', stroke, color }: { size?: number; className?: string; stroke?: number; color?: string }) {
  const sw = stroke ?? (size <= 20 ? 2 : size <= 40 ? 3 : 4);
  const r = (size - sw) / 2;
  const calm = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <svg role="progressbar" aria-busy="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`shrink-0 ${calm ? '' : 'ring-spin'} ${className}`} style={{ color: color ?? 'rgb(var(--fl-primary))' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" pathLength={100}
        strokeDasharray="40 100" className={calm ? '' : 'ring-arc'} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

/** Kept for call sites that show a loading state */
export function LoadingIndicator({ size = 48, className = '' }: { size?: number; contained?: boolean; className?: string }) {
  return <ProgressRing size={Math.round(size * 0.7)} className={className} />;
}

/** Seek slider: thin accent track, thumb appears on hover / focus / drag */
export function SeekSlider({
  value, max, onChange, onCommit, label, size = 'md',
}: { value: number; max: number; onChange: (v: number) => void; onCommit: (v: number) => void; playing?: boolean; size?: 'sm' | 'md'; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const at = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * max;
  };
  const key = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : 0;
    if (!step && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    e.stopPropagation();
    const v = e.key === 'Home' ? 0 : e.key === 'End' ? max : Math.min(max, Math.max(0, value + step));
    onChange(v);
    onCommit(v);
  };
  return (
    <div
      ref={ref} role="slider" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)} aria-valuetext={fmtTime(value)}
      className={`seek select-none focus-ring rounded-lg ${drag ? 'dragging' : ''}`} style={{ height: size === 'md' ? 20 : 16 }}
      onPointerDown={(e) => { if (max <= 0) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); onChange(at(e)); }}
      onPointerMove={(e) => drag && onChange(at(e))}
      onPointerUp={(e) => { if (!drag) return; setDrag(false); onCommit(at(e)); }}
      onPointerCancel={() => setDrag(false)}
      onKeyDown={key}
    >
      <div className="seek-track" />
      <div className="seek-fill" style={{ width: `${frac * 100}%` }} />
      <div className="seek-thumb" style={{ left: `${frac * 100}%` }} />
    </div>
  );
}
