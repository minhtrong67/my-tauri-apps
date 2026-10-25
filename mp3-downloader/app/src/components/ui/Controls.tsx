import { useId, type ReactNode, type RefObject } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { ripple } from "./ripple";

/** Công tắc Expressive: con trượt to ra khi bật, có dấu ✓. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-8 w-[52px] flex-none rounded-full border-2 transition-colors duration-300 ${checked ? "border-primary bg-primary" : "border-outline bg-surface-highest"}`}>
      <span className={`absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full transition-all duration-300 ease-spring ${checked ? "left-[22px] h-6 w-6 bg-on-primary text-primary" : "left-1.5 h-4 w-4 bg-outline"}`}>
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3.2} />}
      </span>
    </button>
  );
}

export interface ChoiceOpt<T extends string> { value: T; label: string; icon?: LucideIcon; font?: string }
interface CProps<T extends string> { value: T; options: ChoiceOpt<T>[]; onChange: (v: T) => void; label: string }

function useArrows(count: number, pick: (i: number) => void, cur: number) {
  return (e: React.KeyboardEvent) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    pick((cur + (fwd ? 1 : count - 1)) % count);
  };
}

/** Chip chọn một (radiogroup) — chip được chọn có dấu ✓ trượt vào. */
export function ChoiceChips<T extends string>({ value, options, onChange, label }: CProps<T>) {
  const cur = options.findIndex((o) => o.value === value);
  const onKey = useArrows(options.length, (i) => { onChange(options[i].value); (document.querySelectorAll(`[data-grp="${label}"] button`)[i] as HTMLElement)?.focus(); }, cur);
  return (
    <div role="radiogroup" aria-label={label} data-grp={label} onKeyDown={onKey} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onChange(o.value)} onPointerDown={ripple}
            style={o.font ? { fontFamily: o.font } : undefined}
            className={`state-layer inline-flex h-9 items-center rounded-m3-sm border text-sm font-medium transition-all duration-300 ease-spring active:rounded-full ${on ? "rounded-full border-transparent bg-secondary-container pl-2.5 pr-4 text-on-secondary-container" : "border-outline px-4 text-on-surface-variant"}`}>
            <span className={`grid overflow-hidden transition-all duration-300 ease-spring ${on ? "mr-1.5 w-[18px] opacity-100" : "mr-0 w-0 opacity-0"}`}><Check className="h-[18px] w-[18px]" strokeWidth={2.6} /></span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Nhóm nút kết nối (connected button group): mục chọn thành hình thuốc (pill), các mục còn lại bo nhỏ. */
export function Segmented<T extends string>({ value, options, onChange, label }: CProps<T>) {
  const cur = options.findIndex((o) => o.value === value);
  const onKey = useArrows(options.length, (i) => { onChange(options[i].value); (document.querySelectorAll(`[data-grp="${label}"] button`)[i] as HTMLElement)?.focus(); }, cur);
  return (
    <div role="radiogroup" aria-label={label} data-grp={label} onKeyDown={onKey} className="inline-flex flex-wrap gap-0.5 rounded-full bg-surface-highest p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onChange(o.value)} onPointerDown={ripple}
            className={`state-layer inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold transition-all duration-300 ease-spring ${on ? "rounded-full bg-primary text-on-primary shadow-e1" : "rounded-m3-sm text-on-surface-variant"}`}>
            {o.icon && <o.icon className="h-[18px] w-[18px]" strokeWidth={2.2} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

interface TFProps { label: string; value: string; onChange: (v: string) => void; leading?: ReactNode; trailing?: ReactNode; inputRef?: RefObject<HTMLInputElement>; size?: "md" | "lg"; invalid?: boolean; placeholder?: string; maxLength?: number; mono?: boolean; onEnter?: () => void; className?: string }
/** Ô nhập kiểu filled Expressive, nhãn nổi lên khi focus hoặc có nội dung. */
export function TextField({ label, value, onChange, leading, trailing, inputRef, size = "md", invalid, placeholder, maxLength, mono, onEnter, className = "" }: TFProps) {
  const id = useId();
  const up = value.length > 0 || !!placeholder;
  const h = size === "lg" ? "h-16" : "h-14";
  return (
    <div className={`group relative flex items-center rounded-m3-lg border-2 bg-surface-highest transition-[border-color,border-radius] duration-300 ease-spring focus-within:rounded-m3-md ${invalid ? "border-error" : "border-transparent focus-within:border-primary"} ${h} ${className}`}>
      {leading && <span className="pl-4 text-on-surface-variant">{leading}</span>}
      <div className="relative h-full min-w-0 flex-1">
        <input id={id} ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder ?? " "} spellCheck={false} autoComplete="off"
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          className={`peer h-full w-full bg-transparent px-4 pb-1 pt-5 outline-none placeholder:text-on-surface-variant/60 ${size === "lg" ? "text-base" : "text-sm"} ${mono ? "tabular-nums" : ""}`} style={{ caretColor: "rgb(var(--c-primary))" }} />
        <label htmlFor={id} className={`pointer-events-none absolute left-4 origin-left transition-all duration-200 ease-emph peer-focus:top-2 peer-focus:text-xs ${invalid ? "text-error peer-focus:text-error" : "text-on-surface-variant peer-focus:text-primary"} ${up ? "top-2 text-xs" : "top-1/2 -translate-y-1/2 text-sm peer-focus:translate-y-0"}`}>{label}</label>
      </div>
      {trailing && <span className="flex items-center gap-1 pr-2">{trailing}</span>}
    </div>
  );
}

/** Checkbox Expressive dùng trong danh sách chọn. */
export function CheckBox({ checked }: { checked: boolean }) {
  return <span className={`grid h-6 w-6 flex-none place-items-center rounded-lg border-2 transition-all duration-300 ease-spring ${checked ? "scale-100 border-primary bg-primary text-on-primary" : "border-outline"}`}>{checked && <Check className="h-4 w-4" strokeWidth={3.2} />}</span>;
}
