import { useEffect, useMemo, useRef, useState } from "react";
import { hctFromHex, hexFromHct, normalizeHex, type HctValue } from "../lib/color";
import { cn } from "../lib/utils";
import { useSettings } from "../state/settings";
import { Range } from "./ui";

/** Text input that only commits valid hex colors. */
export function HexField({
  value,
  onChange,
  label,
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <input
      value={text}
      aria-label={label}
      spellCheck={false}
      maxLength={7}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (/^#?[0-9a-f]{6}$/i.test(raw.trim())) {
          const n = normalizeHex(raw);
          if (n && n !== value) onChange(n);
        }
      }}
      onBlur={() => {
        const n = normalizeHex(text);
        if (n) {
          setText(n);
          if (n !== value) onChange(n);
        } else setText(value);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-outline-variant bg-transparent px-3 font-mono text-sm uppercase outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary",
        className,
      )}
    />
  );
}

const stops = (n: number, f: (p: number) => string) => Array.from({ length: n + 1 }, (_, i) => f(i / n)).join(", ");

/** Hue / Chroma / Tone sliders with live gradient tracks. */
export function HctPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { t } = useSettings();
  const [hct, setHct] = useState<HctValue>(() => hctFromHex(value));
  const last = useRef(value);

  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setHct(hctFromHex(value));
    }
  }, [value]);

  const emit = (next: HctValue) => {
    setHct(next);
    const hex = hexFromHct(next.h, next.c, next.t);
    last.current = hex;
    onChange(hex);
  };

  const tracks = useMemo(() => {
    const c = Math.max(hct.c, 36);
    const tone = Math.min(Math.max(hct.t, 45), 70);
    return {
      h: `linear-gradient(to right, ${stops(12, (p) => hexFromHct(p * 360, c, tone))})`,
      c: `linear-gradient(to right, ${stops(8, (p) => hexFromHct(hct.h, p * 120, hct.t))})`,
      t: `linear-gradient(to right, ${stops(10, (p) => hexFromHct(hct.h, hct.c, p * 100))})`,
    };
  }, [hct.h, hct.c, hct.t]);

  const rows: [string, string, number, number, string, (v: number) => void][] = [
    [t("picker.hue"), "H", Math.round(hct.h), 360, tracks.h, (v) => emit({ ...hct, h: v })],
    [t("picker.chroma"), "C", Math.round(hct.c), 120, tracks.c, (v) => emit({ ...hct, c: v })],
    [t("picker.tone"), "T", Math.round(hct.t), 100, tracks.t, (v) => emit({ ...hct, t: v })],
  ];

  return (
    <div className="space-y-2">
      {rows.map(([label, letter, val, max, track, set]) => (
        <div key={letter} className="flex items-center gap-3">
          <span className="w-4 text-xs font-semibold text-on-surface-variant" data-tip={label}>
            {letter}
          </span>
          <Range label={label} value={val} min={0} max={max} step={1} track={track} onChange={set} />
          <span className="w-8 text-right font-mono text-xs tabular-nums text-on-surface-variant">{val}</span>
        </div>
      ))}
    </div>
  );
}
