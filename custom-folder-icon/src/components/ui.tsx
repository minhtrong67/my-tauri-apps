import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { translate, type Key, type Lang } from "../lib/i18n";

export const LangCtx = createContext<Lang>("en");
export function useT() {
  const lang = useContext(LangCtx);
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

export function Field({ label, children, inline }: { label: string; children: ReactNode; inline?: boolean }) {
  return (
    <div className={inline ? "flex items-center justify-between gap-3" : "flex flex-col gap-1.5"}>
      <label className="text-[12.5px]" style={{ color: "var(--text2)" }}>{label}</label>
      {children}
    </div>
  );
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg p-3" style={{ background: "var(--layer2)", border: "1px solid var(--stroke)" }}>
      {title && <h3 className="m-0 text-[13px] font-semibold">{title}</h3>}
      {children}
    </section>
  );
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <button role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)} />;
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px]">{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

export function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="checkbox" aria-checked={checked} className="cb" onClick={(e) => { e.stopPropagation(); onChange(!checked); }}>
      <svg viewBox="0 0 12 12"><path d="M2.4 6.4l2.3 2.3 4.9-5" /></svg>
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="seg" style={{ "--n": options.length, "--i": idx } as CSSProperties}>
      <span className="seg-thumb" />
      {options.map((o) => (
        <button key={o.value} data-on={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[12.5px]" style={{ color: "var(--text2)" }}>
        <span>{label}</span>
        <span className="tabular-nums">{Number.isInteger(step) ? value : value.toFixed(2)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input className="input" value={value} spellCheck={false} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onChange(e.target.value)} />
      </div>
    </Field>
  );
}

export interface Option<T extends string> { value: T; label: string; style?: CSSProperties }

/** Fluent-style combo box rendered in a portal so scroll containers never clip it. */
export function Select<T extends string>({ value, options, onChange }: { value: T; options: Option<T>[]; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, maxH: 280, up: false });
  const btn = useRef<HTMLButtonElement>(null);
  const cur = options.find((o) => o.value === value);

  const toggle = () => {
    if (!open && btn.current) {
      const r = btn.current.getBoundingClientRect();
      const below = innerHeight - r.bottom - 12;
      const want = Math.min(280, options.length * 34 + 8);
      const up = below < want && r.top > below;
      setPos({ left: r.left, top: up ? r.top - 4 : r.bottom + 4, width: r.width, maxH: Math.min(280, (up ? r.top : below) - 8), up });
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);

  return (
    <>
      <button ref={btn} className="combo" data-open={open} onClick={toggle} style={cur?.style}>
        <span className="truncate">{cur?.label}</span>
        <ChevronDown size={16} />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[99]" onMouseDown={() => setOpen(false)} />
          <div className="menu" style={{ left: pos.left, width: pos.width, maxHeight: pos.maxH, top: pos.up ? undefined : pos.top, bottom: pos.up ? innerHeight - pos.top : undefined, transformOrigin: pos.up ? "bottom" : "top" }}>
            {options.map((o) => (
              <button key={o.value} className="opt" data-on={o.value === value} style={o.style} onClick={() => { onChange(o.value); setOpen(false); }}>
                {o.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
