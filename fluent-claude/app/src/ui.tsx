import { cloneElement, ReactElement, ReactNode, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Checkmark16Regular, CheckmarkCircle20Filled, ChevronDown16Regular, DismissCircle20Filled, Dismiss16Regular, Info20Filled, Warning20Filled,
} from "@fluentui/react-icons";
import { initials } from "./lib";
import { useI18n } from "./i18n";
import type { Sample } from "./types";

/** Logo Fluent Claude: ô vuông bo mềm màu cam Claude, vòng tiến độ + ba cột mức dùng (cùng hình học với app icon). */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="fc-bg" x1="140" y1="64" x2="884" y2="960" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F7A47E" />
          <stop offset=".5" stopColor="#DE7B58" />
          <stop offset="1" stopColor="#B8512C" />
        </linearGradient>
        <radialGradient id="fc-hi" cx="300" cy="170" r="650" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".34" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fc-rim" x1="0" y1="64" x2="0" y2="960" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".62" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fc-dk" x1="0" y1="64" x2="0" y2="960" gradientUnits="userSpaceOnUse">
          <stop offset=".47" stopColor="#2D1208" stopOpacity="0" />
          <stop offset="1" stopColor="#2D1208" stopOpacity=".24" />
        </linearGradient>
      </defs>
      <rect x="64" y="64" width="896" height="896" rx="208" fill="url(#fc-bg)" />
      <rect x="64" y="64" width="896" height="896" rx="208" fill="url(#fc-hi)" />
      <rect x="64" y="64" width="896" height="896" rx="208" fill="url(#fc-dk)" />
      <rect x="67" y="67" width="890" height="890" rx="205" fill="none" stroke="url(#fc-rim)" strokeWidth="6" />
      <circle cx="512" cy="500" r="270" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="64" />
      <path d="M512 230A270 270 0 1 1 242 500" fill="none" stroke="#fff" strokeOpacity=".97" strokeWidth="64" strokeLinecap="round" />
      <rect x="372" y="520" width="64" height="120" rx="32" fill="#fff" fillOpacity=".98" />
      <rect x="480" y="450" width="64" height="190" rx="32" fill="#fff" fillOpacity=".98" />
      <rect x="588" y="380" width="64" height="260" rx="32" fill="#fff" fillOpacity=".55" />
    </svg>
  );
}

/** Avatar: ảnh thật của Chrome profile; không có ảnh thì dùng chữ cái đầu. */
export function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  const photo = !!src && !bad;
  return (
    <span className={`avatar ${photo ? "photo" : ""}`} aria-hidden="true" style={{ width: size, height: size, ["--h" as string]: h, fontSize: size * 0.38 }}>
      {photo ? <img src={src} alt="" width={size} height={size} decoding="async" onError={() => setBad(true)} /> : initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ Tooltip */

/** ToolTip kiểu Fluent: hiện khi hover (có độ trễ) và khi focus bàn phím; luôn nằm trong khung nhìn. */
export function Tip({ label, kbd, side = "top", disabled, children }: { label: string; kbd?: string; side?: "top" | "bottom" | "right"; disabled?: boolean; children: ReactElement }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);
  const timer = useRef<number>();
  const tipRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const show = (el: HTMLElement, delay: number) => {
    if (disabled) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      setDx(0);
      setPos(side === "right" ? { x: r.right + 8, y: r.top + r.height / 2 } : { x: r.left + r.width / 2, y: side === "top" ? r.top - 6 : r.bottom + 6 });
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
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(e.currentTarget, 500),
        onMouseLeave: hide,
        onFocus: (e: React.FocusEvent<HTMLElement>) => e.currentTarget.matches(":focus-visible") && show(e.currentTarget, 80),
        onBlur: hide,
        onMouseDown: hide,
        "aria-describedby": pos ? id : undefined,
      })}
      {pos &&
        createPortal(
          <div ref={tipRef} id={id} role="tooltip" className={`tip tip-${side}`} style={{ left: pos.x, top: pos.y, ["--dx" as string]: `${dx}px` }}>
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
/** Nhóm nút chọn một (SelectorBar): chỉ báo accent trượt mượt giữa các lựa chọn */
export function Segmented<T extends string>({ value, options, onChange, label, iconOnly }: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; label: string; iconOnly?: boolean }) {
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

/** ToggleSwitch của WinUI: nút 40×20, có chữ Bật/Tắt bên cạnh */
export function Switch({ checked, onChange, label, disabled, showState = true }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; showState?: boolean }) {
  const { t } = useI18n();
  return (
    <span className="switch-wrap">
      {showState && <span className="switch-state" aria-hidden="true">{checked ? t("common.on") : t("common.off")}</span>}
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch" onClick={() => onChange(!checked)}>
        <span className="thumb" />
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ ComboBox */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  style?: React.CSSProperties;
}
export function Select<T extends string>({ value, options, onChange, label, placeholder, icon, className = "" }: { value: T | ""; options: SelectOption<T>[]; onChange: (v: T) => void; label: string; placeholder?: string; icon?: ReactNode; className?: string }) {
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

  const maxH = 18 * 14;
  const below = rect ? window.innerHeight - rect.bottom - 12 : 0;
  const up = !!rect && below < Math.min(maxH, options.length * 40 + 12) && rect.top > below;
  const style: React.CSSProperties | undefined = rect
    ? { left: rect.left, width: Math.max(rect.width, 180), maxHeight: Math.min(maxH, (up ? rect.top : below) - 4), ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) }
    : undefined;

  return (
    <>
      <button ref={btn} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-label={label} className={`select ${open ? "open" : ""} ${className}`} onClick={() => (open ? close() : openList())} onKeyDown={onKey}>
        {icon}
        <span className={`sel-value ${sel ? "" : "ph"}`} style={sel?.style}>{sel ? sel.label : placeholder}</span>
        <ChevronDown16Regular className="sel-chev" aria-hidden="true" />
      </button>
      {open &&
        style &&
        createPortal(
          <ul ref={list} id={id} role="listbox" aria-label={label} className={`sel-list ${up ? "up" : ""}`} style={style}>
            {options.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value} className={`${i === active ? "act" : ""} ${o.value === value ? "on" : ""}`} onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o.value)}>
                <span className="sel-text">
                  <span style={o.style}>{o.label}</span>
                  {o.hint && <small>{o.hint}</small>}
                </span>
                {o.value === value && <Checkmark16Regular aria-hidden="true" />}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
}

/* ------------------------------------------------------------------ InfoBar (toast + inline) */

export type ToastKind = "info" | "success" | "warning" | "error";
export interface ToastData {
  kind: ToastKind;
  text: string;
  /** thời gian tự đóng (ms), 0 = giữ tới khi người dùng đóng */
  ms: number;
  id: number;
}
const INFO_ICON = { info: Info20Filled, success: CheckmarkCircle20Filled, warning: Warning20Filled, error: DismissCircle20Filled } as const;

/** InfoBar nằm trong trang (banner cảnh báo, lỗi kết nối...) */
export function InfoBar({ kind = "info", title, children, action }: { kind?: ToastKind; title?: string; children: ReactNode; action?: ReactNode }) {
  const Icon = INFO_ICON[kind];
  return (
    <div className={`infobar ${kind}`} role={kind === "error" || kind === "warning" ? "alert" : "status"}>
      <Icon className="ib-ic" aria-hidden="true" />
      <div className="ib-text">
        {title && <b>{title}</b>}
        <span>{children}</span>
      </div>
      {action}
    </div>
  );
}

export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="toast-wrap" aria-live="polite">
      {toast && (
        <div className={`infobar toast ${toast.kind}`} key={toast.id} role={toast.kind === "error" ? "alert" : "status"}>
          {(() => {
            const Icon = INFO_ICON[toast.kind];
            return <Icon className="ib-ic" aria-hidden="true" />;
          })()}
          <div className="ib-text">
            <span>{toast.text}</span>
          </div>
          <Tip label={t("toast.close")}>
            <button className="btn subtle icon-btn" onClick={onClose} aria-label={t("toast.close")}>
              <Dismiss16Regular />
            </button>
          </Tip>
          {toast.ms > 0 && <span className="toast-bar" style={{ animationDuration: `${toast.ms}ms` }} aria-hidden="true" />}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ ContentDialog */

/** Hộp thoại kiểu WinUI ContentDialog: khoá focus, Esc để đóng, trả focus về nút đã mở */
export function Dialog({ title, children, actions, onClose, role = "dialog" }: { title: string; icon?: ReactNode; tone?: "primary" | "danger"; children: ReactNode; actions: ReactNode; onClose: () => void; role?: "dialog" | "alertdialog" }) {
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
      <div ref={box} className="dialog" role={role} aria-modal="true" aria-labelledby={tid}>
        <div className="dialog-main">
          <h2 id={tid}>{title}</h2>
          <div className="dialog-body">{children}</div>
        </div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, body, confirm, cancel, onConfirm, onCancel, tone = "danger", confirmIcon }: { title: string; body: string; confirm: string; cancel: string; onConfirm: () => void; onCancel: () => void; tone?: "danger" | "primary"; icon?: ReactNode; confirmIcon?: ReactNode }) {
  return (
    <Dialog
      role="alertdialog"
      title={title}
      onClose={onCancel}
      actions={
        <>
          <button className={`btn ${tone === "danger" ? "critical" : "accent"}`} data-autofocus onClick={onConfirm}>
            {confirmIcon}
            {confirm}
          </button>
          <button className="btn" onClick={onCancel}>
            {cancel}
          </button>
        </>
      }
    >
      <p>{body}</p>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Hiển thị dữ liệu */

type Tone = "accent" | "ok" | "warn" | "danger";

/** ProgressBar xác định của WinUI: thanh 4px bo tròn, màu theo trạng thái */
export function ProgressBar({ value, tone = "accent", label, thin }: { value: number; tone?: Tone; label: string; thin?: boolean }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className={`pbar ${tone} ${thin ? "thin" : ""}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
      <div className="pbar-fill" style={{ width: `${v}%` }} />
    </div>
  );
}

/** ProgressRing: vòng tiến độ (xác định hoặc quay vô hạn khi không truyền value) */
export function ProgressRing({ value, size = 56, stroke = 5, tone = "accent", label, children }: { value?: number; size?: number; stroke?: number; tone?: Tone; label: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value === undefined ? undefined : Math.min(100, Math.max(0, value));
  return (
    <div className={`pring ${tone} ${v === undefined ? "indet" : ""}`} style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v === undefined ? undefined : Math.round(v)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="pring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle className="pring-fill" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={v === undefined ? c * 0.72 : c * (1 - v / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      {children && <span className="pring-label">{children}</span>}
    </div>
  );
}

/** Biểu đồ nhỏ mức dùng trong cửa sổ reset hiện tại */
export function Sparkline({ pts, from, to, tone = "accent" }: { pts: Sample[]; from: number; to: number; tone?: Tone }) {
  const d = useMemo(() => {
    if (pts.length < 2 || to <= from) return null;
    const x = (t: number) => Math.min(1, Math.max(0, (t - from) / (to - from))) * 120;
    const y = (u: number) => 30 - Math.min(100, Math.max(0, u)) * 0.28;
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[2]).toFixed(1)}`).join("");
    const last = pts[pts.length - 1];
    return { line, area: `${line}L${x(last[0]).toFixed(1)} 30L${x(pts[0][0]).toFixed(1)} 30Z` };
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
