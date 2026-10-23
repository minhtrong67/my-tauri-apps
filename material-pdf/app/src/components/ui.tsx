import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "../lib/store";

export function IconButton({ icon, label, onClick, active, disabled, className = "", size = "" }: {
  icon: ReactNode; label: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; active?: boolean; disabled?: boolean; className?: string; size?: "sm" | "";
}) {
  return (
    <button className={`icon-btn ripple ${active ? "active" : ""} ${size} ${className}`} title={label} aria-label={label} onClick={onClick} disabled={disabled}>
      {icon}
    </button>
  );
}

export function Button({ children, icon, variant = "tonal", onClick, disabled, className = "" }: {
  children: ReactNode; icon?: ReactNode; variant?: "filled" | "tonal" | "text" | "outlined" | "cancel";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; disabled?: boolean; className?: string;
}) {
  return (
    <button className={`btn ${variant} ripple ${className}`} onClick={onClick} disabled={disabled}>
      {icon}<span>{children}</span>
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}>
      <span className="thumb" />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string; icon?: ReactNode }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={`seg ripple ${value === o.value ? "on" : ""}`} onClick={() => onChange(o.value)}>
          {o.icon}<span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Dialog({ title, icon, onClose, children, actions, wide }: {
  title: string; icon?: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode; wide?: boolean;
}) {
  const t = useT();
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 160); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), close());
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  });
  return (
    <div className={`scrim ${closing ? "out" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={`dialog ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          {icon && <span className="dialog-icon">{icon}</span>}
          <h2>{title}</h2>
          <IconButton icon={<X size={20} />} label={t("close")} onClick={close} size="sm" />
        </header>
        <div className="dialog-body">{children}</div>
        {actions && <footer>{actions}</footer>}
      </div>
    </div>
  );
}

export interface MenuItem { icon?: ReactNode; label: string; hint?: string; onClick: () => void; divider?: boolean; active?: boolean }
export function Menu({ trigger, items, align = "right" }: { trigger: (toggle: () => void, open: boolean) => ReactNode; items: MenuItem[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const d = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("mousedown", d); addEventListener("keydown", k);
    return () => { removeEventListener("mousedown", d); removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      {trigger(() => setOpen((o) => !o), open)}
      {open && (
        <div className={`menu ${align}`} role="menu">
          {items.map((it, i) => (
            <div key={i}>
              {it.divider && <hr />}
              <button role="menuitem" className={`menu-item ripple ${it.active ? "on" : ""}`} onClick={() => { setOpen(false); it.onClick(); }}>
                {it.icon}<span>{it.label}</span>{it.hint && <kbd>{it.hint}</kbd>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
export const fmtSize = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
