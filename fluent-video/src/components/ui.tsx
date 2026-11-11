import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { useStore } from '../lib/store';
import type { MenuItem } from '../lib/types';
import { ICONS, type IconName } from './icons';
import { useT } from '../lib/useT';

/** Fluent System Icon. `fill` swaps the outline glyph for the filled one (selected / active / transport buttons). */
export function Icon({ name, fill, size = 20, className = '' }: { name: IconName; fill?: boolean; size?: number; className?: string }) {
  const def = ICONS[name];
  const C = fill ? def.f : def.r;
  return <C aria-hidden style={{ fontSize: size, width: size, height: size }} className={`shrink-0 ${className}`} />;
}

type IBVariant = 'standard' | 'filled' | 'tonal' | 'outlined';
export function IconButton({
  icon, onClick, title, variant = 'standard', size = 'md', active, fill, className = '', disabled, onContextMenu, onDark,
}: {
  icon: IconName; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; title?: string; variant?: IBVariant;
  size?: 'sm' | 'md' | 'lg'; active?: boolean; fill?: boolean; className?: string; disabled?: boolean;
  onContextMenu?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Sits on the dark video overlay: white glyph, light hover fill, accent shown in its light variant */
  onDark?: boolean;
}) {
  const dim = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const isz = size === 'lg' ? 22 : size === 'sm' ? 16 : 20;
  const v =
    variant === 'filled'
      ? 'rounded-full bg-accent text-on-accent hover:bg-accent/90 active:bg-accent/80 shadow-sm'
      : variant === 'tonal'
        ? 'rounded bg-control border border-stroke text-fg hover:bg-control-hover active:bg-control-press'
        : variant === 'outlined'
          ? 'rounded border border-stroke-strong text-fg-2 hover:bg-subtle'
          : onDark
            ? `rounded ${active ? 'text-accent-ondark' : 'text-white'} hover:bg-white/15 active:bg-white/10`
            : `rounded ${active ? 'text-accent-text' : 'text-fg-2'} hover:bg-subtle active:bg-subtle-press`;
  return (
    <button
      type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} onContextMenu={onContextMenu}
      className={`${dim} ${v} inline-flex items-center justify-center transition-[background-color,color,transform,opacity] duration-150 ease-fluent active:scale-[0.94] focus-ring disabled:opacity-40 disabled:pointer-events-none shrink-0 ${className}`}
    >
      <Icon name={icon} fill={fill || active} size={isz} />
    </button>
  );
}

export function Button({
  children, onClick, variant = 'filled', icon, className = '', disabled, danger,
}: {
  children: ReactNode; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  icon?: IconName; className?: string; disabled?: boolean; danger?: boolean;
}) {
  // filled = accent button, tonal / outlined = standard button, text = hyperlink-style subtle button
  const v =
    variant === 'filled'
      ? danger ? 'bg-danger text-on-danger hover:bg-danger/90 active:bg-danger/80' : 'bg-accent text-on-accent hover:bg-accent/90 active:bg-accent/80'
      : variant === 'text'
        ? `${danger ? 'text-danger' : 'text-accent-text'} hover:bg-subtle active:bg-subtle-press`
        : `bg-control border border-stroke hover:bg-control-hover active:bg-control-press ${danger ? 'text-danger' : 'text-fg'}`;
  return (
    <button
      type="button" disabled={disabled} onClick={onClick}
      className={`h-8 px-4 rounded inline-flex items-center justify-center gap-2 text-body transition-[background-color,color,transform] duration-150 ease-fluent active:scale-[0.98] focus-ring disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap ${v} ${className}`}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/** WinUI ToggleSwitch: 40 x 20 track, 12px knob that grows slightly on hover */
export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`group relative w-10 h-5 rounded-full border transition-colors duration-150 focus-ring shrink-0 ${checked ? 'bg-accent border-accent hover:bg-accent/90' : 'border-stroke-strong bg-transparent hover:bg-subtle'}`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 rounded-full h-3 w-3 transition-all duration-200 ease-fluent group-hover:scale-125 group-active:scale-x-[1.4] ${checked ? 'left-[23px] bg-on-accent' : 'left-[3px] bg-fg-2'}`}
      />
    </button>
  );
}

/** Segmented selector (WinUI SelectorBar): selected item gets an accent pill underneath */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; icon?: IconName }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded bg-control border border-stroke p-0.5" role="radiogroup">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`relative h-7 px-3 rounded-[3px] inline-flex items-center gap-2 text-body transition-colors duration-150 ease-fluent focus-ring ${on ? 'bg-subtle text-fg' : 'text-fg-2 hover:bg-subtle'}`}
          >
            {o.icon && <Icon name={o.icon} size={16} fill={on} />}
            {o.label}
            <span className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-[3px] rounded-full bg-accent transition-all duration-200 ease-fluent ${on ? 'w-4 opacity-100' : 'w-0 opacity-0'}`} />
          </button>
        );
      })}
    </div>
  );
}

/** ToggleButton: accent fill when on */
export function Chip({ children, selected, onClick, icon }: { children: ReactNode; selected?: boolean; onClick?: () => void; icon?: IconName }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={!!selected}
      className={`h-8 px-3 rounded inline-flex items-center gap-2 text-body border transition-colors duration-150 ease-fluent whitespace-nowrap focus-ring active:scale-[0.98] ${selected ? 'bg-accent text-on-accent border-accent hover:bg-accent/90' : 'bg-control border-stroke text-fg hover:bg-control-hover active:bg-control-press'}`}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export function Slider({
  value, min = 0, max = 100, step = 1, onChange, onCommit, className = '', label, onDark,
}: {
  value: number; min?: number; max?: number; step?: number; onChange?: (v: number) => void; onCommit?: (v: number) => void; className?: string; label?: string; onDark?: boolean;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range" aria-label={label} className={`fluent-slider ${onDark ? 'on-dark' : ''} ${className}`} min={min} max={max} step={step} value={value}
      style={{ ['--pct' as string]: `${pct}%` }}
      onChange={(e) => onChange?.(parseFloat(e.target.value))}
      onPointerUp={(e) => onCommit?.(parseFloat((e.target as HTMLInputElement).value))}
      onKeyUp={(e) => onCommit?.(parseFloat((e.target as HTMLInputElement).value))}
    />
  );
}

/** WinUI ContentDialog: smoke layer, centered 8px-radius panel, command bar with the buttons in a darker footer */
export function Modal({ title, children, actions, onClose, wide }: { title: string; children: ReactNode; actions?: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`bg-dialog text-fg rounded-lg border border-stroke-card shadow-2xl animate-scale-in max-h-[88vh] flex flex-col overflow-hidden ${wide ? 'w-[600px]' : 'w-[440px]'} max-w-full`}>
        <div className="px-6 pt-6 pb-2 shrink-0"><h2 className="text-subtitle">{title}</h2></div>
        <div className="overflow-y-auto min-h-0 px-6 pb-6 pt-2">{children}</div>
        {actions && <div className="flex justify-end gap-2 px-6 py-4 bg-dialog-footer border-t border-divider shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/** Fluent MenuFlyout / context menu with one level of fly-out sub menus */
export function ContextMenu() {
  const menu = useStore((s) => s.menu);
  const close = useStore((s) => s.closeMenu);
  const ref = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [sub, setSub] = useState<{ items: MenuItem[]; rect: DOMRect } | null>(null);
  const [subPos, setSubPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    setSub(null);
    if (!menu || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: Math.max(8, Math.min(menu.x, window.innerWidth - r.width - 8)), y: Math.max(8, Math.min(menu.y, window.innerHeight - r.height - 8)) });
  }, [menu]);

  useLayoutEffect(() => {
    if (!sub || !subRef.current || !ref.current) { setSubPos(null); return; }
    const w = subRef.current.getBoundingClientRect();
    const m = ref.current.getBoundingClientRect();
    let x = sub.rect.right - 2;
    if (x + w.width > window.innerWidth - 8) x = m.left - w.width + 2;
    const y = Math.max(8, Math.min(sub.rect.top - 6, window.innerHeight - w.height - 8));
    setSubPos({ x: Math.max(8, x), y });
  }, [sub]);

  useEffect(() => {
    if (!menu) return;
    const down = (e: globalThis.MouseEvent) => {
      const n = e.target as Node;
      if (ref.current?.contains(n) || subRef.current?.contains(n)) return;
      close();
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

  const row = (it: MenuItem, i: number, inSub: boolean) =>
    it.divider ? (
      <div key={i} className="h-px my-1 mx-0 bg-divider" />
    ) : (
      <button
        key={i} type="button" disabled={it.disabled}
        onMouseEnter={(e) => {
          if (inSub) return;
          if (it.children) setSub({ items: it.children, rect: e.currentTarget.getBoundingClientRect() });
          else setSub(null);
        }}
        onClick={(e) => {
          if (it.children) { setSub({ items: it.children, rect: e.currentTarget.getBoundingClientRect() }); return; }
          close();
          it.onClick?.();
        }}
        className={`w-[calc(100%-8px)] mx-1 h-8 px-2.5 rounded flex items-center gap-3 text-left transition-colors duration-100 hover:bg-subtle active:bg-subtle-press disabled:opacity-40 disabled:pointer-events-none ${it.danger ? 'text-danger' : 'text-fg'} ${sub && !inSub && it.children && sub.items === it.children ? 'bg-subtle' : ''}`}
      >
        <span className="w-4 flex justify-center text-fg-2">
          {it.checked ? <Icon name="check" size={16} className="text-fg animate-pop" /> : it.icon && <Icon name={it.icon} size={16} className={it.danger ? 'text-danger' : ''} />}
        </span>
        <span className="truncate text-body flex-1">{it.label}</span>
        {it.shortcut && <span className="text-caption text-fg-3 pl-4">{it.shortcut}</span>}
        {it.children && <Icon name="chevron_right" size={14} className="text-fg-3 -mr-1" />}
      </button>
    );

  const panel = 'rounded-lg acrylic bg-flyout border border-stroke-card shadow-xl py-1 overflow-y-auto max-h-[calc(100vh-16px)] animate-menu-in';
  return (
    <>
      <div ref={ref} style={{ left: pos.x, top: pos.y }} className={`fixed z-[60] min-w-[220px] max-w-[320px] ${panel}`} onContextMenu={(e) => e.preventDefault()}>
        {menu.items.map((it, i) => row(it, i, false))}
      </div>
      {sub && (
        <div
          ref={subRef} style={{ left: subPos?.x ?? -9999, top: subPos?.y ?? -9999 }}
          className={`fixed z-[61] min-w-[200px] max-w-[300px] ${panel}`} onContextMenu={(e) => e.preventDefault()}
        >
          {sub.items.map((it, i) => row(it, i, true))}
        </div>
      )}
    </>
  );
}

export function openMenuAt(e: MouseEvent, items: MenuItem[]) {
  e.preventDefault();
  e.stopPropagation();
  useStore.getState().openMenu(e.clientX, e.clientY, items);
}

export function openMenuBelow(e: MouseEvent<HTMLElement>, items: MenuItem[], alignRight = false, above = false) {
  e.stopPropagation();
  const r = e.currentTarget.getBoundingClientRect();
  const h = items.reduce((a, i) => a + (i.divider ? 9 : 32), 10);
  useStore.getState().openMenu(alignRight ? r.right - 220 : r.left, above ? r.top - h - 4 : r.bottom + 4, items);
}

/** Toast: WinUI InfoBar styled flyout */
export function Snackbar() {
  const toast = useStore((s) => s.toast);
  const t = useT();
  if (!toast) return null;
  return (
    <div key={toast.id} className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[70] animate-slide-up">
      <div className="acrylic flex items-center gap-3 min-h-[48px] pl-4 pr-1.5 py-1 rounded-lg bg-flyout border border-stroke-card shadow-xl max-w-[560px]">
        <Icon name="info" fill size={18} className="text-accent-text" />
        <span className="text-body py-2">{toast.text}</span>
        {toast.actionLabel && (
          <button className="px-3 h-8 rounded text-body text-accent-text hover:bg-subtle active:bg-subtle-press" onClick={() => { toast.action?.(); useStore.getState().set({ toast: null }); }}>
            {toast.actionLabel}
          </button>
        )}
        <button className="w-8 h-8 rounded inline-flex items-center justify-center text-fg-2 hover:bg-subtle active:bg-subtle-press" onClick={() => useStore.getState().set({ toast: null })} aria-label={t('close')}>
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}

/** Highlighted credit: author name and the AI assistant */
export function AuthorCredit({ center }: { center?: boolean }) {
  const t = useT();
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 ${center ? 'justify-center' : ''}`}>
      <span className="text-body text-fg-2">{t('author')}</span>
      <span className="px-2.5 py-0.5 rounded bg-accent text-on-accent text-body-strong">minhtrong67</span>
      <span className="text-body text-fg-2">{t('withAi')}</span>
      <span className="px-2.5 py-0.5 rounded bg-control border border-stroke text-fg text-body-strong inline-flex items-center gap-1">
        <Icon name="auto_awesome" size={14} fill className="text-accent-text" />Claude
      </span>
    </div>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return <img src="/icon.png" width={size} height={size} alt="" draggable={false} />;
}

/** WinUI InfoBar (inline message) */
export function InfoBar({ children, tone = 'info', className = '' }: { children: ReactNode; tone?: 'info' | 'warning'; className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded border border-stroke-card px-4 py-3 ${tone === 'warning' ? 'bg-danger-bg' : 'bg-card'} ${className}`}>
      <Icon name={tone === 'warning' ? 'error' : 'info'} fill size={18} className={`mt-0.5 ${tone === 'warning' ? 'text-danger' : 'text-accent-text'}`} />
      <div className="text-body min-w-0">{children}</div>
    </div>
  );
}
