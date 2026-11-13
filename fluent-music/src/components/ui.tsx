import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { tr } from '../lib/i18n';
import { useStore } from '../lib/store';
import type { MenuItem } from '../lib/types';
import { ICONS } from './icons';
import { ProgressRing } from './Fluent';

/** Fluent System Icon. `fill` picks the Filled glyph (selected / active states) when one exists. */
export function Icon({ name, fill, size = 24, className = '' }: { name: string; fill?: boolean; size?: number; className?: string }) {
  if (name === 'progress_activity') return <ProgressRing size={size} className={className} />;
  const set = ICONS[name];
  if (!set) {
    if (import.meta.env.DEV) console.warn(`Unknown icon: ${name}`);
    return <span style={{ width: size, height: size }} className={`inline-block shrink-0 ${className}`} />;
  }
  const small = size <= 20;
  const Cmp = fill && set.f20 ? (small ? set.f20 : set.f24!) : small ? set.r20 : set.r24;
  return <Cmp aria-hidden="true" fontSize={size} className={`shrink-0 ${className}`} style={{ width: size, height: size }} />;
}

type IBVariant = 'standard' | 'filled' | 'tonal' | 'outlined';
export function IconButton({
  icon, onClick, title, variant = 'standard', size = 'md', active, fill, className = '', disabled, onContextMenu, pop, busy,
}: {
  icon: string; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; title?: string; variant?: IBVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl'; active?: boolean; fill?: boolean; className?: string; disabled?: boolean;
  onContextMenu?: (e: MouseEvent<HTMLButtonElement>) => void; pop?: boolean;
  /** shows a progress ring instead of the icon (something is loading) */
  busy?: boolean;
}) {
  const isz = size === 'xl' ? 28 : size === 'lg' ? 24 : size === 'sm' ? 16 : 20;
  const v =
    variant === 'filled'
      ? 'fl-accent fl-round'
      : variant === 'tonal' || variant === 'outlined'
        ? 'fl-std'
        : active
          ? 'fl-subtle'
          : 'fl-subtle';
  return (
    <button
      type="button" title={title} aria-label={title} aria-pressed={active} disabled={disabled} onClick={onClick} onContextMenu={onContextMenu}
      className={`fl-ibtn fl-ibtn-${size} ${v} focus-ring shrink-0 ${active && variant === 'standard' ? '!text-on-primary-container' : ''} ${className}`}
    >
      {busy ? <ProgressRing size={isz} color={variant === 'filled' ? 'rgb(var(--fl-on-primary))' : undefined} /> : pop ? <span key={`${icon}${active ? 1 : 0}`} className="pop-heart inline-flex"><Icon name={icon} fill={fill || active} size={isz} /></span> : <Icon name={icon} fill={fill || active} size={isz} />}
    </button>
  );
}

type BtnSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const BTN_ICON: Record<BtnSize, number> = { xs: 16, sm: 16, md: 20, lg: 20, xl: 24 };

/** Fluent button: accent (filled), standard (tonal / outlined), subtle / hyperlink (text). Toggle buttons use the accent fill while selected. */
export function Button({
  children, onClick, variant = 'filled', icon, className = '', disabled, danger, size = 'sm', toggle, selected,
}: {
  children: ReactNode; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  icon?: string; className?: string; disabled?: boolean; danger?: boolean; size?: BtnSize; toggle?: boolean; selected?: boolean;
}) {
  const v = toggle
    ? selected ? 'fl-sel' : 'fl-std'
    : variant === 'filled'
      ? danger ? 'fl-danger' : 'fl-accent'
      : variant === 'text'
        ? `fl-text ${danger ? 'fl-text-danger' : ''}`
        : danger ? 'fl-std !text-error' : 'fl-std';
  return (
    <button
      type="button" disabled={disabled} onClick={onClick} aria-pressed={toggle ? !!selected : undefined}
      className={`fl-btn fl-btn-${size} ${v} focus-ring ${className}`}
    >
      {icon && <Icon name={icon} size={BTN_ICON[size]} />}
      {children}
    </button>
  );
}

/** Toggle switch (Fluent ToggleSwitch: 40×20) */
export function Switch({ checked, onChange, decorative, label }: { checked: boolean; onChange?: (v: boolean) => void; decorative?: boolean; label?: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} aria-hidden={decorative || undefined} tabIndex={decorative ? -1 : 0}
      onClick={decorative ? undefined : () => onChange?.(!checked)}
      className={`fl-switch focus-ring ${decorative ? 'pointer-events-none' : ''}`}
    >
      <span className="fl-switch-knob" />
    </button>
  );
}

/** Segmented selector: a recessed track with the chosen item raised and marked with an accent bar */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; icon?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="fl-seg" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className="fl-seg-item focus-ring">
          {o.icon && <Icon name={o.icon} size={16} fill={value === o.value} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ children, selected, onClick, icon }: { children: ReactNode; selected?: boolean; onClick?: () => void; icon?: string }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={selected}
      className={`h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-body-lg border transition-colors duration-fast whitespace-nowrap focus-ring ${selected ? 'bg-primary-container text-on-primary-container border-primary/40 font-semibold' : 'bg-ctl border-card-stroke text-on-surface hover:bg-ctl-hover'}`}
    >
      {icon && <Icon name={icon} size={16} fill={selected} />}
      {children}
    </button>
  );
}

export function Slider({
  value, min = 0, max = 100, step = 1, onChange, onCommit, className = '', label, size = 'md', format,
}: {
  value: number; min?: number; max?: number; step?: number; onChange?: (v: number) => void; onCommit?: (v: number) => void; className?: string; label?: string;
  size?: 'sm' | 'md'; /** shows a value tooltip above the thumb while it is pressed */ format?: (v: number) => string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const [drag, setDrag] = useState(false);
  const half = size === 'sm' ? 8 : 10;
  return (
    <div className="relative w-full">
      <input
        type="range" aria-label={label} className={`fl-slider ${size === 'sm' ? 'fl-slider-sm' : ''} ${className}`} min={min} max={max} step={step} value={value}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        onPointerDown={() => setDrag(true)}
        onPointerUp={(e) => { setDrag(false); onCommit?.(parseFloat((e.target as HTMLInputElement).value)); }}
        onBlur={() => setDrag(false)}
        onKeyUp={(e) => onCommit?.(parseFloat((e.target as HTMLInputElement).value))}
      />
      {format && <span className={`slider-bubble ${drag ? 'on' : ''}`} style={{ left: `calc(${pct}% + ${((0.5 - pct / 100) * half * 2).toFixed(2)}px)` }}>{format(value)}</span>}
    </div>
  );
}

/** ContentDialog */
export function Modal({ title, children, actions, onClose, wide }: { title: string; children: ReactNode; actions?: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center fl-smoke animate-fade-in p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`fl-dialog text-on-surface animate-dialog-in max-h-[88vh] flex flex-col overflow-hidden ${wide ? 'w-[640px]' : 'w-[440px]'} max-w-full`}>
        <div className="p-6 pb-5 min-h-0 flex flex-col">
          <h2 className="text-headline-sm mb-3 shrink-0">{title}</h2>
          <div className="overflow-y-auto min-h-0 -mx-2 px-2 text-body-lg">{children}</div>
        </div>
        {actions && <div className="flex justify-end gap-2 px-6 py-5 shrink-0 bg-surface-dim/60 border-t border-divider">{actions}</div>}
      </div>
    </div>
  );
}

/** Context menu / MenuFlyout */
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
      ref={ref} style={{ left: pos.x, top: pos.y }} role="menu"
      className="fixed z-[60] min-w-[220px] max-w-[320px] p-1 fl-flyout animate-scale-in origin-top-left"
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.items.map((it, i) =>
        it.divider ? (
          <div key={i} className="h-px my-1 mx-[-4px] bg-divider" />
        ) : (
          <button
            key={i} type="button" role="menuitem" disabled={it.disabled}
            onClick={() => { close(); it.onClick?.(); }}
            className={`w-full h-8 px-3 rounded-lg flex items-center gap-3 text-left hover:bg-subtle active:bg-subtle-2 disabled:opacity-40 ${it.danger ? 'text-error' : 'text-on-surface'}`}
          >
            <span className="w-4 flex justify-center">{it.icon && <Icon name={it.icon} size={16} className={it.danger ? 'text-error' : 'text-on-surface-variant'} />}</span>
            <span className="truncate text-body-lg">{it.label}</span>
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

/** InfoBar-style notification (info / success / warning / error) */
export function Snackbar() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  const close = () => useStore.getState().set({ toast: null });
  return (
    <div key={toast.id} className="fixed left-1/2 -translate-x-1/2 bottom-28 z-[70] animate-slide-up" role={toast.kind === 'error' ? 'alert' : 'status'}>
      <div className={`toast toast-${toast.kind} relative overflow-hidden flex items-center gap-3 min-h-[48px] pl-5 pr-2 py-1 max-w-[560px]`}>
        <span className="toast-icon inline-flex items-center justify-center shrink-0"><Icon name={TOAST_ICON[toast.kind]} size={20} fill /></span>
        <span className="text-body-lg py-2">{toast.text}</span>
        {toast.actionLabel && (
          <button className="toast-btn px-3 h-8 rounded-lg text-body-lg font-semibold" onClick={() => { toast.action?.(); close(); }}>
            {toast.actionLabel}
          </button>
        )}
        <button className="toast-btn w-8 h-8 rounded-lg inline-flex items-center justify-center" onClick={close} aria-label={tr('close')}>
          <Icon name="close" size={16} />
        </button>
        <span className="toast-timer" style={{ animationDuration: `${toast.dur}ms` }} />
      </div>
    </div>
  );
}

/** Credit: author name and the AI assistant */
export function AuthorCredit({ center }: { center?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 ${center ? 'justify-center' : ''}`}>
      <span className="text-body-md text-on-surface-variant">{tr('author')}</span>
      <span className="fl-badge !bg-primary !text-on-primary font-semibold">minhtrong67</span>
      <span className="text-body-md text-on-surface-variant">{tr('withAi')}</span>
      <span className="fl-badge gap-1 font-semibold"><Icon name="auto_awesome" size={14} fill />Claude</span>
    </div>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return <img src="/icon.png" width={size} height={size} alt="" draggable={false} />;
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
        className={`h-8 pl-3 pr-2.5 rounded-lg border bg-ctl border-card-stroke border-b-outline/60 inline-flex items-center justify-between gap-3 text-body-lg text-on-surface hover:bg-ctl-hover transition-colors duration-fast focus-ring ${open ? 'bg-ctl-hover' : ''} ${className}`}
      >
        <span className="inline-flex items-center gap-2.5 min-w-0">
          {icon && <Icon name={icon} size={16} className="text-on-surface-variant" />}
          <span className="truncate">{cur?.label ?? ''}</span>
        </span>
        <Icon name="expand_more" size={16} className={`text-on-surface-variant transition-transform duration-slow ease-decel ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={list} role="listbox" aria-label={label}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          className="z-[120] overflow-y-auto overscroll-contain fl-flyout text-on-surface p-1 animate-scale-in origin-top"
        >
          {options.map((o, i) => (
            <button
              key={o.value} type="button" role="option" aria-selected={o.value === value} data-i={i}
              onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}
              className={`relative w-full min-h-8 px-3 py-1 rounded-lg flex items-center gap-2 text-left text-body-lg ${i === hi ? 'bg-subtle' : ''} ${o.value === value ? 'bg-subtle before:content-[\'\'] before:absolute before:left-0 before:top-1/2 before:-mt-2 before:w-[3px] before:h-4 before:rounded-sm before:bg-primary' : ''}`}
            >
              
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
