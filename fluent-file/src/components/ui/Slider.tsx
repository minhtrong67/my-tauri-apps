/** Fluent slider with a live value label. */
export function Slider({ value, min, max, step = 1, onChange, label, format, width = 220 }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; format?: (v: number) => string; width?: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3" style={{ width }}>
      <input type="range" className="f-range min-w-0 flex-1" min={min} max={max} step={step} value={value} aria-label={label} style={{ ['--p' as string]: pct + '%' }} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="w-12 flex-none text-right text-on-surface-variant tabular-nums">{format ? format(value) : value}</span>
    </div>
  );
}
