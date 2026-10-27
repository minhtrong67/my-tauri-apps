import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle, Check, Trash2, type LucideIcon } from "lucide-react";
import { tipStore, Btn, Kbd } from "./ui";
import { confirmStore, dismissToast, hideMenu, menuStore, promptStore, toasts, useT } from "../lib/store";
import { clamp, cx } from "../lib/utils";

/* ---------- Tooltip host ---------- */
export function TooltipHost() {
  const tip = tipStore.use((s) => s.tip);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (!tip || !ref.current) { setPos(null); return; }
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight, r = tip.rect, g = 10;
    let side = tip.side;
    if (side === "bottom" && r.bottom + g + h > innerHeight) side = "top";
    if (side === "top" && r.top - g - h < 0) side = "bottom";
    let x = r.left + r.width / 2 - w / 2, y = side === "bottom" ? r.bottom + g : r.top - g - h;
    if (side === "right") { x = r.right + g; y = r.top + r.height / 2 - h / 2; }
    if (side === "left") { x = r.left - g - w; y = r.top + r.height / 2 - h / 2; }
    setPos({ x: clamp(x, 8, innerWidth - w - 8), y: clamp(y, 8, innerHeight - h - 8) });
  }, [tip]);
  if (!tip) return null;
  return createPortal(
    <div ref={ref} role="tooltip" key={tip.label} style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, opacity: pos ? 1 : 0 }}
      className="fixed z-[200] pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-inverse-surface text-inverse-on-surface text-[.78rem] font-medium shadow-e3 max-w-[18rem] anim-pop">
      <span>{tip.label}</span>
      {tip.kbd && <span className="px-1.5 py-0.5 rounded-md bg-inverse-on-surface/15 text-[.68rem] font-semibold">{tip.kbd}</span>}
    </div>, document.body);
}

/* ---------- Context / dropdown menu host (always clamped inside the window) ---------- */
export function MenuHost() {
  const m = menuStore.use((s) => s);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; origin: string } | null>(null);
  useLayoutEffect(() => {
    if (!m.open || !ref.current) { setPos(null); return; }
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight, pad = 8;
    let x = m.x, y = m.y, oy = "top";
    if (m.anchor) {
      x = m.anchor.right - w; y = m.anchor.bottom + 6;
      if (y + h > innerHeight - pad) { y = m.anchor.top - h - 6; oy = "bottom"; }
    } else if (y + h > innerHeight - pad) { y = m.y - h; oy = "bottom"; }
    if (!m.anchor && x + w > innerWidth - pad) x = m.x - w;
    setPos({ x: clamp(x, pad, innerWidth - w - pad), y: clamp(y, pad, innerHeight - h - pad), origin: `${m.anchor ? "right" : "left"} ${oy}` });
  }, [m.open, m.x, m.y, m.anchor, m.items]);
  useEffect(() => {
    if (!m.open) return;
    const close = () => hideMenu();
    const key = (e: KeyboardEvent) => e.key === "Escape" && hideMenu();
    window.addEventListener("blur", close); window.addEventListener("resize", close); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("blur", close); window.removeEventListener("resize", close); window.removeEventListener("keydown", key); };
  }, [m.open]);
  if (!m.open) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[150]" onMouseDown={hideMenu} onContextMenu={(e) => { e.preventDefault(); hideMenu(); }} />
      <div ref={ref} role="menu" style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, opacity: pos ? 1 : 0, transformOrigin: pos?.origin }}
        className="fixed z-[160] min-w-[13.5rem] max-w-[min(22rem,calc(100vw-16px))] max-h-[calc(100vh-16px)] overflow-y-auto p-2 rounded-[22px] bg-surface-container shadow-e4 border border-outline-variant/40 anim-scale">
        {m.items.map((it, i) => it.divider ? <div key={i} className="divider my-1.5 mx-2" /> : (
          <button key={i} role="menuitem" disabled={it.disabled} onClick={() => { hideMenu(); it.run?.(); }}
            className={cx("w-full flex items-center gap-3 h-10 px-3 rounded-[14px] text-sm font-medium text-left transition-colors disabled:opacity-40",
              it.danger ? "text-error hover:bg-error/10" : "text-on-surface hover:bg-on-surface/8")}>
            {it.icon && <it.icon size={18} className={it.danger ? "" : "text-on-surface-variant"} />}
            <span className="flex-1 truncate">{it.label}</span>
            {it.kbd && <span className="text-xs text-on-surface-variant">{it.kbd}</span>}
          </button>
        ))}
      </div>
    </>, document.body);
}

/* ---------- Toasts ---------- */
const TOAST: Record<string, { icon: LucideIcon; cls: string }> = {
  info: { icon: Info, cls: "bg-info text-on-info" },
  success: { icon: CheckCircle2, cls: "bg-success text-on-success" },
  warning: { icon: AlertTriangle, cls: "bg-warning text-on-warning" },
  error: { icon: XCircle, cls: "bg-error-container text-on-error-container" },
};
function ToastCard({ id, kind, msg, action, ms }: { id: number; kind: string; msg: string; action?: { label: string; run: () => void }; ms: number }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(ms);
  useEffect(() => {
    if (paused) return;
    const start = Date.now();
    const to = setTimeout(() => dismissToast(id), remaining.current);
    return () => { clearTimeout(to); remaining.current -= Date.now() - start; };
  }, [paused, id]);
  const { icon: Icon, cls } = TOAST[kind];
  return (
    <div role="status" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className={cx("relative overflow-hidden pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2.5 min-h-[3.25rem] rounded-[20px] shadow-e3 border border-black/5 dark:border-white/10 max-w-[min(32rem,calc(100vw-24px))] anim-toast", cls)}>
      <Icon size={22} strokeWidth={2.2} className="shrink-0" />
      <span className="text-sm font-medium leading-snug py-1">{msg}</span>
      {action && <button onClick={() => { action.run(); dismissToast(id); }} className="ml-1 h-9 px-3.5 rounded-full text-sm font-bold bg-current/12 hover:bg-current/20 transition-colors shrink-0"><span className="text-inherit">{action.label}</span></button>}
      <button onClick={() => dismissToast(id)} aria-label="close" className="size-9 grid place-items-center rounded-full hover:bg-current/12 shrink-0"><X size={18} /></button>
      <span className="absolute left-0 bottom-0 h-[3px] w-full bg-current/35 origin-left" style={{ animation: `progress ${ms}ms linear reverse both`, animationPlayState: paused ? "paused" : "running" }} />
    </div>
  );
}
export function ToastHost() {
  const list = toasts.use((s) => s.list);
  return createPortal(
    <div className="fixed z-[300] left-0 right-0 flex flex-col items-center gap-2 pointer-events-none px-3 bottom-[calc(var(--toast-bottom,24px)+env(safe-area-inset-bottom))]">
      {list.map((x) => <ToastCard key={x.id} {...x} />)}
    </div>, document.body);
}

/* ---------- Modal / bottom sheet ---------- */
export function Modal({ open, onClose, title, icon: Icon, children, actions, width = 520, tall, noPad }: {
  open: boolean; onClose: () => void; title: string; icon?: LucideIcon; children: ReactNode; actions?: ReactNode; width?: number; tall?: boolean; noPad?: boolean;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) { setClosing(true); const to = setTimeout(() => { setMounted(false); setClosing(false); }, 200); return () => clearTimeout(to); }
  }, [open, mounted]);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", k, true);
    setTimeout(() => (panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current)?.focus(), 30);
    return () => { window.removeEventListener("keydown", k, true); prev?.focus?.(); };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
      <div className={cx("absolute inset-0 scrim-bg", closing ? "opacity-0 transition-opacity duration-200" : "anim-fade")} onMouseDown={onClose} />
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} style={{ ["--w" as string]: `${width}px` }}
        className={cx("relative w-full sm:w-[min(var(--w),100%)] outline-none bg-surface-container text-on-surface shadow-e4 flex flex-col overflow-hidden",
          "rounded-t-[32px] sm:rounded-[32px] max-h-[92vh]", tall && "sm:h-[min(44rem,92vh)]",
          closing ? "opacity-0 translate-y-6 scale-95 transition-all duration-200" : "anim-sheet sm:anim-scale")}>
        <div className="sm:hidden mx-auto mt-2.5 mb-0.5 h-1.5 w-10 rounded-full bg-outline-variant shrink-0" />
        <header className="flex items-center gap-3 px-6 pt-5 pb-3 shrink-0">
          {Icon && <span className="size-11 grid place-items-center rounded-2xl bg-primary-container text-on-primary-container shrink-0"><Icon size={22} /></span>}
          <h2 className="flex-1 text-[1.375rem] font-bold leading-tight truncate">{title}</h2>
          <button onClick={onClose} aria-label={t("close")} className="btn btn-icon sm"><X size={20} /></button>
        </header>
        <div className={cx("flex-1 min-h-0 overflow-y-auto", !noPad && "px-6 pb-4")}>{children}</div>
        {actions && <footer className="flex flex-wrap justify-end gap-2 px-6 py-4 shrink-0 border-t border-outline-variant/40 bg-surface-container">{actions}</footer>}
      </div>
    </div>, document.body);
}

/* ---------- Global confirm + prompt dialogs ---------- */
export function ConfirmHost() {
  const t = useT();
  const { opts, resolve } = confirmStore.use((s) => s);
  const done = (v: boolean) => { resolve?.(v); confirmStore.set({ opts: null, resolve: null }); };
  const last = useRef(opts); if (opts) last.current = opts;
  const o = last.current;
  if (!o) return null;
  const danger = o.kind === "danger";
  return (
    <Modal open={!!opts} onClose={() => done(false)} title={o.title} icon={o.icon ?? (danger ? Trash2 : Check)} width={440}
      actions={<>
        <Btn kind="tonal" icon={X} onClick={() => done(false)}>{t("cancel")}</Btn>
        <Btn kind={danger ? "danger" : "filled"} icon={o.icon ?? (danger ? Trash2 : Check)} onClick={() => done(true)} data-autofocus>{o.confirm}</Btn>
      </>}>
      {o.desc && <p className="text-on-surface-variant leading-relaxed">{o.desc}</p>}
    </Modal>
  );
}

export function PromptHost() {
  const t = useT();
  const { opts, resolve } = promptStore.use((s) => s);
  const [val, setVal] = useState("");
  const last = useRef(opts); if (opts) last.current = opts;
  useEffect(() => { if (opts) setVal(opts.value ?? ""); }, [opts]);
  const o = last.current;
  if (!o) return null;
  const done = (v: string | null) => { resolve?.(v); promptStore.set({ opts: null, resolve: null }); };
  const submit = () => val.trim() && done(val.trim());
  return (
    <Modal open={!!opts} onClose={() => done(null)} title={o.title} icon={o.icon} width={440}
      actions={<>
        <Btn kind="tonal" icon={X} onClick={() => done(null)}>{t("cancel")}</Btn>
        <Btn kind="filled" icon={o.icon ?? Check} onClick={submit} disabled={!val.trim()}>{o.confirm}</Btn>
      </>}>
      <label className="block">
        <span className="text-sm font-medium text-on-surface-variant">{o.label}</span>
        <input data-autofocus className="field mt-1.5" value={val} onChange={(e) => setVal(e.target.value)} placeholder={o.label}
          onFocus={(e) => o.select && e.currentTarget.select()} onKeyDown={(e) => e.key === "Enter" && submit()} />
      </label>
    </Modal>
  );
}
export { Kbd };
