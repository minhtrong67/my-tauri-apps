import { ReactNode, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { initials } from "./lib";
import { useI18n } from "./i18n";

export function Logo({ size = 40 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EC8C6C" />
          <stop offset="1" stopColor="#C05534" />
        </linearGradient>
      </defs>
      <rect x="40" y="40" width="944" height="944" rx="232" fill={`url(#${id})`} />
      <rect x="236" y="470" width="120" height="320" rx="60" fill="#fff" />
      <rect x="452" y="330" width="120" height="460" rx="60" fill="#fff" />
      <rect x="668" y="200" width="120" height="590" rx="60" fill="#fff" fillOpacity=".4" />
    </svg>
  );
}

/** Avatar chữ cái đầu, màu ổn định theo tên */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, ["--h" as string]: h, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}
/** Nút chọn dạng phân đoạn, vạch chọn trượt mượt giữa các lựa chọn */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  iconOnly,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  label: string;
  iconOnly?: boolean;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      className={`seg ${iconOnly ? "icon-only" : ""}`}
      role="radiogroup"
      aria-label={label}
      style={{ ["--n" as string]: options.length, ["--i" as string]: i }}
    >
      <span className="seg-pill" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={iconOnly ? o.label : undefined}
          title={iconOnly ? o.label : undefined}
          className={o.value === value ? "on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {!iconOnly && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span className="thumb" />
    </button>
  );
}

export interface ToastData {
  kind: "info" | "error";
  text: string;
}
export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="toast-wrap" aria-live="polite">
      {toast && (
        <div className={`toast ${toast.kind}`} key={toast.text} role={toast.kind === "error" ? "alert" : "status"}>
          <span>{toast.text}</span>
          <button className="btn icon-btn" onClick={onClose} aria-label={t("toast.close")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirm,
  cancel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCancel]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-b">
        <h2 id="dlg-t">{title}</h2>
        <p id="dlg-b">{body}</p>
        <div className="dialog-actions">
          <button className="btn text" onClick={onCancel}>
            {cancel}
          </button>
          <button className="btn danger" ref={ref} onClick={onConfirm}>
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
