import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { tr } from '../lib/i18n';
import { useStore } from '../lib/store';
import type { MenuItem } from '../lib/types';
import { FILLABLE, ICONS } from './icons';

export function Icon({ name, fill, size = 24, className = '' }: { name: string; fill?: boolean; size?: number; className?: string }) {
  const Cmp = ICONS[name];
  if (!Cmp) {
    if (import.meta.env.DEV) console.warn(`Unknown icon: ${name}`);
    return <span style={{ width: size, height: size }} className={`inline-block shrink-0 ${className}`} />;
  }
  return (
    <Cmp
      aria-hidden="true" size={size} strokeWidth={size >= 40 ? 1.5 : 2} absoluteStrokeWidth={size < 20}
      fill={fill && FILLABLE.has(name) ? 'currentColor' : 'none'} className={`shrink-0 ${className}`}
    />
  );
}

type IBVariant = 'standard' | 'filled' | 'tonal' | 'outlined';
export function IconButton({
  icon, onClick, title, variant = 'standard', size = 'md', active, fill, className = '', disabled, onContextMenu, pop,
}: {
  icon: string; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; title?: string; variant?: IBVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl'; active?: boolean; fill?: boolean; className?: string; disabled?: boolean;
  onContextMenu?: (e: MouseEvent<HTMLButtonElement>) => void; pop?: boolean;
}) {
  const isz = size === 'xl' ? 32 : size === 'lg' ? 28 : size === 'sm' ? 20 : 24;
  const v =
    variant === 'filled'
      ? 'bg-primary text-on-primary hover:shadow-md hover:brightness-110'
      : variant === 'tonal'
        ? 'bg-secondary-container text-on-secondary-container hover:brightness-95'
        : variant === 'outlined'
          ? 'border border-outline text-on-surface-variant hover:bg-on-surface/[.08]'
          : active
            ? 'bg-secondary-container text-on-secondary-container hover:brightness-95'
            : 'text-on-surface-variant hover:bg-on-surface/[.08] active:bg-on-surface/[.12]';
  return (
    <button
      type="button" title={title} aria-label={title} aria-pressed={active} disabled={disabled} onClick={onClick} onContextMenu={onContextMenu}
      className={`ripple ibtn ibtn-${size} ${v} inline-flex items-center justify-center focus-ring disabled:opacity-40 disabled:pointer-events-none shrink-0 ${className}`}
    >
      {pop ? <span key={`${icon}${active ? 1 : 0}`} className="pop-heart inline-flex"><Icon name={icon} fill={fill || active} size={isz} /></span> : <Icon name={icon} fill={fill || active} size={isz} />}
    </button>
  );
}

type BtnSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const BTN_SIZE: Record<BtnSize, { cls: string; icon: number; padIcon: string; pad: string }> = {
  xs: { cls: 'btn-xs gap-1.5 text-label-md', icon: 16, padIcon: 'pl-3 pr-4', pad: 'px-4' },
  sm: { cls: 'btn-sm gap-2 text-label-lg', icon: 18, padIcon: 'pl-4 pr-6', pad: 'px-6' },
  md: { cls: 'btn-md gap-2.5 text-title-md', icon: 24, padIcon: 'pl-6 pr-8', pad: 'px-8' },
  lg: { cls: 'btn-lg gap-3 text-headline-sm', icon: 32, padIcon: 'pl-10 pr-12', pad: 'px-12' },
  xl: { cls: 'btn-xl gap-4 text-headline-md', icon: 40, padIcon: 'pl-14 pr-16', pad: 'px-16' },
};

/** Button with five sizes. Round by default; it squares off while pressed, and a selected toggle button stays square. */
export function Button({
  children, onClick, variant = 'filled', icon, className = '', disabled, danger, size = 'sm', toggle, selected,
}: {
  children: ReactNode; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  icon?: string; className?: string; disabled?: boolean; danger?: boolean; size?: BtnSize; toggle?: boolean; selected?: boolean;
}) {
  const z = BTN_SIZE[size];
  const v = toggle
    ? selected ? 'btn-sheen bg-primary text-on-primary hover:brightness-110' : 'bg-surface-container-highest text-on-surface-variant hover:brightness-95'
    : variant === 'filled'
      ? danger ? 'btn-sheen bg-error text-on-error hover:brightness-110' : 'btn-sheen bg-primary text-on-primary hover:shadow-md hover:brightness-110'
      : variant === 'tonal'
        ? 'bg-secondary-container text-on-secondary-container hover:brightness-95'
        : variant === 'outlined'
          ? 'border border-outline text-primary hover:bg-primary/[.08]'
          : `${danger ? 'text-error' : 'text-primary'} hover:bg-primary/[.08]`;
  return (
    <button
      type="button" disabled={disabled} onClick={onClick} aria-pressed={toggle ? !!selected : undefined}
      className={`ripple btn ${z.cls} ${icon ? z.padIcon : z.pad} inline-flex items-center justify-center focus-ring disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap ${v} ${className}`}
    >
      {icon && <Icon name={icon} size={z.icon} />}
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, decorative, label }: { checked: boolean; onChange?: (v: boolean) => void; decorative?: boolean; label?: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} aria-hidden={decorative || undefined} tabIndex={decorative ? -1 : 0}
      onClick={decorative ? undefined : () => onChange?.(!checked)}
      className={`relative w-[52px] h-8 rounded-full border-2 transition-colors duration-200 focus-ring shrink-0 ${decorative ? 'pointer-events-none' : ''} ${checked ? 'bg-primary border-primary' : 'bg-surface-container-highest border-outline'}`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ease-spring-bouncy flex items-center justify-center ${checked ? 'left-[22px] w-6 h-6 bg-on-primary' : 'left-1.5 w-4 h-4 bg-outline'}`}
      >
        {checked && <Icon name="check" size={16} className="text-primary" />}
      </span>
    </button>
  );
}

/** Connected button group (Material 3 Expressive): the chosen item becomes a full pill, its neighbours keep tight inner corners */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; icon?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="cbg" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className="ripple cbg-item focus-ring">
          {value === o.value ? <Icon name="check" size={18} className="animate-pop" /> : o.icon ? <Icon name={o.icon} size={18} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ children, selected, onClick, icon }: { children: ReactNode; selected?: boolean; onClick?: () => void; icon?: string }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`ripple h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-label-lg border transition-colors whitespace-nowrap ${selected ? 'bg-secondary-container text-on-secondary-container border-transparent' : 'border-outline text-on-surface-variant hover:bg-on-surface/[.08]'}`}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export function Slider({
  value, min = 0, max = 100, step = 1, onChange, onCommit, className = '', label, size = 'md', format,
}: {
  value: number; min?: number; max?: number; step?: number; onChange?: (v: number) => void; onCommit?: (v: number) => void; className?: string; label?: string;
  size?: 'sm' | 'md'; /** shows a value bubble above the handle while it is pressed */ format?: (v: number) => string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const [drag, setDrag] = useState(false);
  return (
    <div className="relative w-full">
      <input
        type="range" aria-label={label} className={`m3-slider ${size === 'sm' ? 'm3-slider-sm' : ''} ${className}`} min={min} max={max} step={step} value={value}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        onPointerDown={() => setDrag(true)}
        onPointerUp={(e) => { setDrag(false); onCommit?.(parseFloat((e.target as HTMLInputElement).value)); }}
        onBlur={() => setDrag(false)}
        onKeyUp={(e) => onCommit?.(parseFloat((e.target as HTMLInputElement).value))}
      />
      {format && <span className={`slider-bubble ${drag ? 'on' : ''}`} style={{ left: `calc(${pct}% + ${((0.5 - pct / 100) * 4).toFixed(2)}px)` }}>{format(value)}</span>}
    </div>
  );
}

export function Modal({ title, children, actions, onClose, wide }: { title: string; children: ReactNode; actions?: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bg-surface-container-high text-on-surface rounded-m3-xl p-6 shadow-2xl animate-scale-in max-h-[88vh] flex flex-col ${wide ? 'w-[640px]' : 'w-[420px]'} max-w-full`}>
        <h2 className="text-headline-sm emph mb-4 shrink-0">{title}</h2>
        <div className="overflow-y-auto min-h-0 -mx-2 px-2">{children}</div>
        {actions && <div className="flex justify-end gap-2 mt-6 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/** Menu ngữ cảnh / dropdown Material 3 */
export function ContextMenu() {
  const menu = useStore((s) => s.menu);
  const close = useStore((s) => s.closeMenu);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: Math.max(8, Math.min(menu.x, window.innerWidth - r.width - 8)), y: Math.max(8, Math.min(menu.y, window.innerHeight - r.height - 8)) });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const down = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('mousedown', down);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', down);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
    };
  }, [menu, close]);

  if (!menu) return null;
  return (
    <div
      ref={ref} style={{ left: pos.x, top: pos.y }}
      className="fixed z-[60] min-w-[220px] max-w-[320px] py-2 rounded-xl bg-surface-container shadow-xl border border-outline-variant/40 animate-scale-in origin-top-left"
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.items.map((it, i) =>
        it.divider ? (
          <div key={i} className="h-px my-2 bg-outline-variant" />
        ) : (
          <button
            key={i} type="button" disabled={it.disabled}
            onClick={() => { close(); it.onClick?.(); }}
            className={`ripple w-full h-12 px-3 flex items-center gap-3 text-body-lg text-left hover:bg-on-surface/[.08] disabled:opacity-40 ${it.danger ? 'text-error' : 'text-on-surface'}`}
          >
            <span className="w-6 flex justify-center text-on-surface-variant">{it.icon && <Icon name={it.icon} size={20} className={it.danger ? 'text-error' : ''} />}</span>
            <span className="truncate text-body-md">{it.label}</span>
          </button>
        ),
      )}
    </div>
  );
}

export function openMenuAt(e: MouseEvent, items: MenuItem[]) {
  e.preventDefault();
  e.stopPropagation();
  useStore.getState().openMenu(e.clientX, e.clientY, items);
}

export function openMenuBelow(e: MouseEvent<HTMLElement>, items: MenuItem[], alignRight = false) {
  e.stopPropagation();
  const r = e.currentTarget.getBoundingClientRect();
  useStore.getState().openMenu(alignRight ? r.right - 220 : r.left, r.bottom + 4, items);
}

const TOAST_ICON = { info: 'info', success: 'check_circle', warning: 'warning', error: 'error' } as const;

/** Toast with four kinds (info / success / warning / error); colours come from CSS variables that change with the light / dark theme */
export function Snackbar() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  const close = () => useStore.getState().set({ toast: null });
  return (
    <div key={toast.id} className="fixed left-1/2 -translate-x-1/2 bottom-28 z-[70] animate-slide-up" role={toast.kind === 'error' ? 'alert' : 'status'}>
      <div className={`toast toast-${toast.kind} relative overflow-hidden flex items-center gap-3 min-h-[52px] pl-3 pr-2 py-1 rounded-2xl max-w-[560px]`}>
        <span className="toast-icon w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"><Icon name={TOAST_ICON[toast.kind]} size={20} className="animate-pop" /></span>
        <span className="text-body-md py-2">{toast.text}</span>
        {toast.actionLabel && (
          <button className="toast-btn px-3 h-9 rounded-full text-label-lg font-semibold" onClick={() => { toast.action?.(); close(); }}>
            {toast.actionLabel}
          </button>
        )}
        <button className="toast-btn w-9 h-9 rounded-full inline-flex items-center justify-center" onClick={close} aria-label={tr('close')}>
          <Icon name="close" size={20} />
        </button>
        <span className="toast-timer" style={{ animationDuration: `${toast.dur}ms` }} />
      </div>
    </div>
  );
}

/** Highlighted credit: author name and the AI assistant */
export function AuthorCredit({ center }: { center?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 ${center ? 'justify-center' : ''}`}>
      <span className="text-body-md text-on-surface-variant">{tr('author')}</span>
      <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-label-lg shadow-sm transition-transform duration-300 hover:scale-105">minhtrong67</span>
      <span className="text-body-md text-on-surface-variant">{tr('withAi')}</span>
      <span className="px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-label-lg inline-flex items-center gap-1 shadow-sm transition-transform duration-300 hover:scale-105">
        <Icon name="auto_awesome" size={16} fill />Claude
      </span>
    </div>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return <img src="/icon.png" width={size} height={size} alt="" draggable={false} className="rounded-lg" />;
}

/** Material ripple: spawns an expanding wave from the pointer on any `.ripple` element */
export function installRipple() {
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('.ripple');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const r = el.getBoundingClientRect();
    const d = Math.hypot(Math.max(e.clientX - r.left, r.right - e.clientX), Math.max(e.clientY - r.top, r.bottom - e.clientY)) * 2;
    const w = document.createElement('span');
    w.className = 'ripple-wave';
    w.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    el.appendChild(w);
    w.addEventListener('animationend', () => w.remove());
  }, { passive: true });
}

/**
 * Custom dropdown (the native <select> ignores the app theme). The list is capped in height and scrolls,
 * flips above the button when there is no room below, and works with the keyboard (↑ ↓ Enter Esc).
 */
export function Select<T extends string>({
  value, options, onChange, label, icon, className = '', minWidth = 220,
}: {
  value: T; options: { value: T; label: string; hint?: string }[]; onChange: (v: T) => void; label: string; icon?: string; className?: string; minWidth?: number;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const [hi, setHi] = useState(0);
  const cur = options.find((o) => o.value === value);
  const open = pos !== null;

  const show = () => {
    const r = btn.current!.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 200 && above > below;
    const width = Math.max(r.width, minWidth);
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), width,
      top: up ? undefined : r.bottom + 4, bottom: up ? window.innerHeight - r.top + 4 : undefined,
      maxH: Math.max(120, Math.min(264, up ? above : below)),
    });
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
  };
  const close = () => setPos(null);
  const pick = (v: T) => { onChange(v); close(); btn.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !btn.current?.contains(t)) close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); btn.current?.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setHi((h) => Math.min(options.length - 1, h + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setHi((h) => Math.max(0, h - 1)); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (options[hi]) pick(options[hi].value); }
    };
    const away = (e: Event) => { if (!list.current?.contains(e.target as Node)) close(); };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', away, true);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', away, true);
    };
     
  }, [open, hi, options]);

  useLayoutEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, hi]);

  return (
    <>
      <button
        ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => (open ? close() : show())}
        style={{ minWidth }}
        className={`ripple h-12 px-4 rounded-xl border bg-transparent inline-flex items-center justify-between gap-3 text-body-lg text-on-surface transition-colors focus-ring ${open ? 'border-primary' : 'border-outline hover:bg-on-surface/[.06]'} ${className}`}
      >
        <span className="inline-flex items-center gap-2.5 min-w-0">
          {icon && <Icon name={icon} size={20} className="text-on-surface-variant" />}
          <span className="truncate">{cur?.label ?? ''}</span>
        </span>
        <Icon name="expand_more" size={20} className={`text-on-surface-variant transition-transform duration-300 ease-emphasized ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={list} role="listbox" aria-label={label}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          className="z-[120] overflow-y-auto overscroll-contain rounded-2xl bg-surface-container-high text-on-surface py-1.5 shadow-xl ring-1 ring-outline-variant/40 animate-scale-in origin-top"
        >
          {options.map((o, i) => (
            <button
              key={o.value} type="button" role="option" aria-selected={o.value === value} data-i={i}
              onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}
              className={`w-full min-h-11 px-4 py-2 flex items-center gap-3 text-left text-body-lg transition-colors ${i === hi ? 'bg-on-surface/[.08]' : ''} ${o.value === value ? 'text-primary' : ''}`}
            >
              <span className="w-5 shrink-0">{o.value === value && <Icon name="check" size={20} />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{o.label}</span>
                {o.hint && <span className="block truncate text-body-sm text-on-surface-variant">{o.hint}</span>}
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
