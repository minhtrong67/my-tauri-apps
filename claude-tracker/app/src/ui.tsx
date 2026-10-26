import { cloneElement, ReactElement, ReactNode, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CheckCircle2, ChevronDown, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { initials } from "./lib";
import { useI18n } from "./i18n";
import { CLAUDE, COOKIE_PATH, CREAM } from "./logo";
import type { Sample } from "./types";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true" className="logo">
      <path d={COOKIE_PATH} fill={CLAUDE} />
      <rect x="236" y="470" width="120" height="320" rx="60" fill={CREAM} />
      <rect x="452" y="330" width="120" height="460" rx="60" fill={CREAM} />
      <rect x="668" y="200" width="120" height="590" rx="60" fill={CREAM} fillOpacity=".5" />
    </svg>
  );
}

/** Avatar: ảnh thật của Chrome profile; không có ảnh thì dùng chữ cái đầu. Hình dạng đổi (tròn ↔ bo vuông) theo trạng thái. */
export function Avatar({ name, src, size = 44 }: { name: string; src?: string; size?: number }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  const photo = !!src && !bad;
  return (
    <span className={`avatar ${photo ? "photo" : ""}`} aria-hidden="true" style={{ width: size, height: size, ["--h" as string]: h, fontSize: size * 0.36 }}>
      {photo ? <img src={src} alt="" width={size} height={size} decoding="async" onError={() => setBad(true)} /> : initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ Tooltip */

/** Tooltip tuỳ biến: hiện khi hover (có độ trễ) và khi focus bàn phím; hỗ trợ cả sáng/tối qua CSS variables. */
export function Tip({ label, kbd, side = "top", children }: { label: string; kbd?: string; side?: "top" | "bottom" | "right"; children: ReactElement }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);
  const timer = useRef<number>();
  const tipRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const show = (el: HTMLElement, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      setDx(0);
      setPos(side === "right" ? { x: r.right + 10, y: r.top + r.height / 2 } : { x: r.left + r.width / 2, y: side === "top" ? r.top - 8 : r.bottom + 8 });
    }, delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!pos) return;
    const off = () => setPos(null);
    window.addEventListener("scroll", off, true);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("scroll", off, true);
      window.removeEventListener("blur", off);
    };
  }, [pos]);
  // Giữ tooltip trong khung nhìn
  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!el || !pos || side === "right") return;
    const r = el.getBoundingClientRect();
    if (r.left < 8) setDx(8 - r.left);
    else if (r.right > window.innerWidth - 8) setDx(window.innerWidth - 8 - r.right);
  }, [pos, side]);

  const child = children as ReactElement<Record<string, unknown>>;
  return (
    <>
      {cloneElement(child, {
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(e.currentTarget, 420),
        onMouseLeave: hide,
        onFocus: (e: React.FocusEvent<HTMLElement>) => e.currentTarget.matches(":focus-visible") && show(e.currentTarget, 80),
        onBlur: hide,
        onMouseDown: hide,
        "aria-describedby": pos ? id : undefined,
      })}
      {pos &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            className={`tip tip-${side}`}
            style={{ left: pos.x, top: pos.y, ["--dx" as string]: `${dx}px` }}
          >
            {label}
            {kbd && <kbd>{kbd}</kbd>}
          </div>,
          document.body
        )}
    </>
  );
}

/* ------------------------------------------------------------------ Segmented / Switch */

export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}
/** Nút chọn dạng phân đoạn, vạch chọn trượt mượt (spring) giữa các lựa chọn */
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
    <div className={`seg ${iconOnly ? "icon-only" : ""}`} role="radiogroup" aria-label={label} style={{ ["--n" as string]: options.length, ["--i" as string]: i }}>
      <span className="seg-pill" aria-hidden="true" />
      {options.map((o) => {
        const btn = (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value} aria-label={iconOnly ? o.label : undefined} className={o.value === value ? "on" : ""} onClick={() => onChange(o.value)}>
            {o.icon}
            {!iconOnly && <span>{o.label}</span>}
          </button>
        );
        return iconOnly ? (
          <Tip key={o.value} label={o.label}>
            {btn}
          </Tip>
        ) : (
          btn
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span className="thumb">
        <Check size={14} strokeWidth={3.2} aria-hidden="true" />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ Select (tuỳ biến, thay <select> mặc định) */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  style?: React.CSSProperties;
}
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  placeholder,
  icon,
  className = "",
}: {
  value: T | "";
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  label: string;
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{ left: number; width: number; top: number; bottom: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const sel = options.find((o) => o.value === value);

  const openList = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    setRect({ left: r.left, width: r.width, top: r.top, bottom: r.bottom });
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }, [options, value]);
  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  }, []);
  const pick = (v: T) => {
    onChange(v);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !btn.current?.contains(t)) close(false);
    };
    const off = () => close(false);
    document.addEventListener("mousedown", down);
    window.addEventListener("resize", off);
    window.addEventListener("scroll", off, true);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("resize", off);
      window.removeEventListener("scroll", off, true);
    };
  }, [open, close]);
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(options.length - 1, a + 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
    else if (e.key === "Home") (e.preventDefault(), setActive(0));
    else if (e.key === "End") (e.preventDefault(), setActive(options.length - 1));
    else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), options[active] && pick(options[active].value));
    else if (e.key === "Escape") (e.preventDefault(), e.stopPropagation(), close());
    else if (e.key === "Tab") close(false);
  };

  // Mở lên trên nếu phía dưới không đủ chỗ; luôn giới hạn chiều cao và cho cuộn
  const maxH = 15 * 16;
  const below = rect ? window.innerHeight - rect.bottom - 12 : 0;
  const up = !!rect && below < Math.min(maxH, options.length * 44 + 12) && rect.top > below;
  const style: React.CSSProperties | undefined = rect
    ? { left: rect.left, width: rect.width, maxHeight: Math.min(maxH, (up ? rect.top : below) - 4), ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) }
    : undefined;

  return (
    <>
      <button
        ref={btn}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        className={`select ${open ? "open" : ""} ${className}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKey}
      >
        {icon}
        <span className={`sel-value ${sel ? "" : "ph"}`} style={sel?.style}>
          {sel ? sel.label : placeholder}
        </span>
        <ChevronDown size={18} className="sel-chev" aria-hidden="true" />
      </button>
      {open &&
        style &&
        createPortal(
          <ul ref={list} id={id} role="listbox" aria-label={label} className={`sel-list ${up ? "up" : ""}`} style={style}>
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={`${i === active ? "act" : ""} ${o.value === value ? "on" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.value)}
              >
                <span className="sel-text">
                  <span style={o.style}>{o.label}</span>
                  {o.hint && <small>{o.hint}</small>}
                </span>
                {o.value === value && <Check size={16} aria-hidden="true" />}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
}

/* ------------------------------------------------------------------ Toast */

export type ToastKind = "info" | "success" | "warning" | "error";
export interface ToastData {
  kind: ToastKind;
  text: string;
  /** thời gian tự đóng (ms), 0 = giữ tới khi người dùng đóng */
  ms: number;
  id: number;
}
const TOAST_ICON = { info: Info, success: CheckCircle2, warning: TriangleAlert, error: XCircle } as const;

export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="toast-wrap" aria-live="polite">
      {toast &&
        (() => {
          const Icon = TOAST_ICON[toast.kind];
          return (
            <div className={`toast ${toast.kind}`} key={toast.id} role={toast.kind === "error" ? "alert" : "status"}>
              <Icon size={20} className="toast-ic" aria-hidden="true" />
              <span className="toast-text">{toast.text}</span>
              <Tip label={t("toast.close")}>
                <button className="btn icon-btn" onClick={onClose} aria-label={t("toast.close")}>
                  <X size={16} />
                </button>
              </Tip>
              {toast.ms > 0 && <span className="toast-bar" style={{ animationDuration: `${toast.ms}ms` }} aria-hidden="true" />}
            </div>
          );
        })()}
    </div>
  );
}

/* ------------------------------------------------------------------ Dialog */

/** Dialog nền: khoá focus trong hộp thoại, Esc để đóng, trả focus về nút đã mở */
export function Dialog({
  title,
  icon,
  tone = "primary",
  children,
  actions,
  onClose,
  role = "dialog",
}: {
  title: string;
  icon?: ReactNode;
  tone?: "primary" | "danger";
  children: ReactNode;
  actions: ReactNode;
  onClose: () => void;
  role?: "dialog" | "alertdialog";
}) {
  const box = useRef<HTMLDivElement>(null);
  const tid = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const q = () => Array.from(box.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input, textarea, [href], [tabindex]:not([tabindex='-1'])") ?? []);
    (box.current?.querySelector<HTMLElement>("[data-autofocus]") ?? q()[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab") {
        const f = q();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
        else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className={`dialog ${tone}`} role={role} aria-modal="true" aria-labelledby={tid}>
        {icon && <span className="dialog-icon" aria-hidden="true">{icon}</span>}
        <h2 id={tid}>{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
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
  tone = "danger",
  icon,
  confirmIcon,
}: {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "primary";
  icon?: ReactNode;
  confirmIcon?: ReactNode;
}) {
  return (
    <Dialog
      role="alertdialog"
      tone={tone}
      title={title}
      icon={icon}
      onClose={onCancel}
      actions={
        <>
          <button className="btn outlined" onClick={onCancel}>
            <X size={17} aria-hidden="true" />
            {cancel}
          </button>
          <button className={`btn ${tone === "danger" ? "danger" : "filled"}`} data-autofocus onClick={onConfirm}>
            {confirmIcon}
            {confirm}
          </button>
        </>
      }
    >
      <p>{body}</p>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Hiển thị dữ liệu */

/** Thanh tiến độ "gợn sóng" của Material 3 Expressive: phần đã đi là sóng chuyển động, phần còn lại là đường thẳng kết thúc bằng chấm */
export function WavyProgress({ value, tone = "primary", label, animate = true }: { value: number; tone?: "primary" | "ok" | "warn" | "danger"; label: string; animate?: boolean }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className={`wavy ${tone} ${animate ? "" : "still"}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
      <div className="wavy-track" />
      <div className="wavy-fill" style={{ width: `${v}%` }} />
      <span className="wavy-dot" />
    </div>
  );
}

/** Biểu đồ nhỏ mức dùng trong cửa sổ reset hiện tại */
export function Sparkline({ pts, from, to, tone = "primary" }: { pts: Sample[]; from: number; to: number; tone?: "primary" | "ok" | "warn" | "danger" }) {
  const d = useMemo(() => {
    if (pts.length < 2 || to <= from) return null;
    const x = (t: number) => Math.min(1, Math.max(0, (t - from) / (to - from))) * 120;
    const y = (u: number) => 30 - Math.min(100, Math.max(0, u)) * 0.28;
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[2]).toFixed(1)}`).join("");
    const last = pts[pts.length - 1];
    return { line, area: `${line}L${x(last[0]).toFixed(1)} 30L${x(pts[0][0]).toFixed(1)} 30Z`, lx: x(last[0]), ly: y(last[2]) };
  }, [pts, from, to]);
  if (!d) return null;
  return (
    <svg className={`spark ${tone}`} viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
      <path d={d.area} className="spark-area" />
      <path d={d.line} className="spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skel ${className}`} aria-hidden="true" />;
}
