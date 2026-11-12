import type { ReactNode, RefObject } from "react";
import { Checkmark12Filled, type FluentIcon } from "@fluentui/react-icons";
import { useI18n } from "../../lib/i18n";

/** ToggleSwitch của Fluent: 40×20, nút tròn 12px; bật → nền màu nhấn. */
export function Switch({ checked, onChange, label, showLabel }: { checked: boolean; onChange: (v: boolean) => void; label: string; showLabel?: boolean }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-3">
      {showLabel && <span className="min-w-[1.5rem] text-right text-body text-fg">{checked ? t("on") : t("off")}</span>}
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`group relative h-5 w-10 flex-none rounded-full border transition-colors duration-100 ${checked ? "border-acc bg-acc hover:bg-acc/90" : "border-strong bg-ctl hover:bg-ctl-h"}`}>
        <span className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-all duration-150 ease-out group-hover:scale-110 group-active:scale-x-[1.35] ${checked ? "left-[22px] bg-on-acc" : "left-[4px] bg-fg-2"}`} />
      </button>
    </span>
  );
}

export interface ChoiceOpt<T extends string> { value: T; label: string; icon?: FluentIcon; font?: string }
interface CProps<T extends string> { value: T; options: ChoiceOpt<T>[]; onChange: (v: T) => void; label: string; small?: boolean; className?: string }

/** Nhóm lựa chọn đơn kiểu Segmented: mục chọn nổi lên với vạch nhấn ở đáy. */
export function Segmented<T extends string>({ value, options, onChange, label, small, className = "" }: CProps<T>) {
  const key = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = options[(i + d + options.length) % options.length];
    onChange(n.value);
    (e.currentTarget.parentElement?.querySelectorAll("button")[(i + d + options.length) % options.length] as HTMLElement)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex max-w-full flex-wrap gap-0.5 rounded-ctl border border-stroke bg-hov p-0.5 ${className}`}>
      {options.map((o, i) => {
        const sel = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={sel} tabIndex={sel ? 0 : -1} onClick={() => onChange(o.value)} onKeyDown={(e) => key(e, i)}
            style={o.font ? { fontFamily: o.font } : undefined}
            className={`relative inline-flex items-center justify-center gap-1.5 rounded-[3px] px-3 transition-colors duration-100 ${small ? "h-6 text-cap" : "h-7 text-body"} ${sel ? "bg-card font-semibold text-fg shadow-knob ring-1 ring-card-line" : "text-fg-2 hover:bg-hov hover:text-fg"}`}>
            {o.icon && <o.icon className="h-4 w-4" />}
            {o.label}
            {sel && <span className="absolute bottom-[1px] left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full bg-acc" />}
          </button>
        );
      })}
    </div>
  );
}

interface TFProps {
  label: string; value: string; onChange: (v: string) => void; leading?: ReactNode; trailing?: ReactNode; inputRef?: RefObject<HTMLInputElement>;
  size?: "md" | "lg"; invalid?: boolean; placeholder?: string; maxLength?: number; mono?: boolean; onEnter?: () => void; className?: string; header?: string;
}
/** TextBox của Fluent: nền control, viền đáy đậm hơn; focus → viền đáy 2px màu nhấn. */
export function TextField({ label, header, value, onChange, leading, trailing, inputRef, size = "md", invalid, placeholder, maxLength, mono, onEnter, className = "" }: TFProps) {
  return (
    <label className={`block ${className}`}>
      {header && <span className="mb-1 block text-body text-fg">{header}</span>}
      <span className={`flex items-center gap-2 rounded-ctl border transition-colors focus-within:bg-card focus-within:shadow-[inset_0_-1px_0_rgb(var(--acc))] ${size === "lg" ? "h-11 pl-3.5 pr-1.5" : "h-8 pl-3 pr-1"} ${invalid ? "border-err bg-ctl shadow-[inset_0_-1px_0_rgb(var(--err))]" : "border-stroke border-b-strong bg-ctl hover:bg-ctl-h focus-within:border-b-acc"}`}>
        {leading && <span className="flex-none text-fg-2">{leading}</span>}
        <input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} aria-label={label} placeholder={placeholder ?? label} spellCheck={false} autoComplete="off"
          onKeyDown={(e) => { if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } }}
          className={`min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-3 ${size === "lg" ? "text-lead" : "text-body"} ${mono ? "font-mono" : ""}`} />
        {trailing && <span className="flex flex-none items-center gap-0.5">{trailing}</span>}
      </span>
    </label>
  );
}

/** Ô đánh dấu của Fluent (chỉ hiển thị, dùng bên trong hàng bấm được). */
export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span className={`grid h-5 w-5 flex-none place-items-center rounded-ctl border transition-colors ${checked ? "border-acc bg-acc text-on-acc" : "border-strong bg-ctl"}`}>
      {checked && <Checkmark12Filled />}
    </span>
  );
}

/** Nhãn nhỏ (Tag / Badge). */
export function Tag({ children, accent, className = "" }: { children: ReactNode; accent?: boolean; className?: string }) {
  return <span className={`inline-flex h-5 items-center gap-1 rounded-ctl px-1.5 text-cap ${accent ? "bg-acc text-on-acc" : "border border-stroke bg-ctl text-fg-2"} ${className}`}>{children}</span>;
}

/** Tiêu đề trang của Fluent: Title 28px + mô tả phụ. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="flex items-end gap-4">
      <div className="min-w-0 flex-1"><h1 className="truncate text-title font-semibold">{title}</h1>{subtitle && <p className="mt-1 text-body text-fg-2">{subtitle}</p>}</div>
      {actions}
    </header>
  );
}
