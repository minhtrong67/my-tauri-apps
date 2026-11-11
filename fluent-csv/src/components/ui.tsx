// Reusable Fluent building blocks: tooltip host, select, switch, segmented group, toast / modal / menu hosts, scroll-to-top.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Info, CircleCheck, CircleAlert, TriangleAlert, X, ArrowUp, type Icon } from '../lib/icons';
import { toasts, dismissToast, modals, closeModal, menu, closeMenu, type MenuItem } from '../lib/overlay';
import { useApp } from '../lib/store';
import { t } from '../lib/i18n';
import { scrollToTop } from '../lib/actions';

/* ───────────────────────────── tooltip host ─────────────────────────────
   Any element with data-tip="text" (and optional data-kbd="Ctrl+S") gets a themed tooltip. */

export function TooltipHost() {
  const [tip, setTip] = useState<{ text: string; kbd?: string; x: number; y: number; below: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const el = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const hide = () => { clearTimeout(timer.current); target.current = null; setTip(null); };
    const show = (n: HTMLElement) => {
      const text = n.dataset.tip; if (!text) return;
      const r = n.getBoundingClientRect();
      const below = r.bottom + 44 < innerHeight;
      setTip({ text, kbd: n.dataset.kbd, x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
    };
    const over = (e: Event) => {
      const n = (e.target as HTMLElement).closest?.('[data-tip]') as HTMLElement | null;
      if (n === target.current) return;
      clearTimeout(timer.current);
      target.current = n;
      if (!n) { setTip(null); return; }
      timer.current = setTimeout(() => show(n), tip ? 60 : 420);
    };
    document.addEventListener('pointerover', over, true);
    document.addEventListener('focusin', e => { const n = (e.target as HTMLElement).closest?.('[data-tip]') as HTMLElement | null; if (n && (e.target as HTMLElement).matches(':focus-visible')) { target.current = n; show(n); } }, true);
    document.addEventListener('focusout', hide, true);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('keydown', hide, true);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => { document.removeEventListener('pointerover', over, true); window.removeEventListener('blur', hide); };
  }, [tip]);

  useLayoutEffect(() => {
    const n = el.current; if (!n || !tip) return;
    const w = n.offsetWidth, h = n.offsetHeight;
    const x = Math.min(Math.max(8, tip.x - w / 2), innerWidth - w - 8);
    n.style.left = x + 'px';
    n.style.top = (tip.below ? tip.y : tip.y - h) + 'px';
    n.style.setProperty('--ty', tip.below ? '-4px' : '4px');
  }, [tip]);

  if (!tip) return null;
  return createPortal(<div ref={el} className="tip" role="tooltip" style={{ left: -999, top: -999 }}>{tip.text}{tip.kbd && <kbd>{tip.kbd}</kbd>}</div>, document.body);
}

/** Props for a tooltip: <button {...tip('Save', 'Ctrl+S')}> */
export const tip = (text?: string, kbd?: string) => (text ? { 'data-tip': text, ...(kbd ? { 'data-kbd': kbd } : {}), 'aria-label': text } : {});

/* ───────────────────────────── switch / segmented ───────────────────────────── */

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <label className="sw" aria-label={label}><input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} /><span className="track" /></label>;
}

export function Segmented<T extends string>({ value, options, onChange, iconOnly }: { value: T; options: { v: T; label: string; icon?: Icon }[]; onChange: (v: T) => void; iconOnly?: boolean }) {
  return (
    <div className={'bgroup' + (iconOnly ? ' ico' : '')} role="radiogroup">
      {options.map(o => (
        <button key={o.v} role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)} {...(iconOnly ? tip(o.label) : {})}>
          {o.icon && <o.icon size={16} />}{!iconOnly && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────────── custom select ─────────────────────────────
   Themed dropdown with a bounded, scrollable list (never the native <select>). */

export interface Opt { value: string; label: string; hint?: string; style?: CSSProperties; icon?: Icon }

export function Select({ value, options, onChange, width = '14rem', placeholder, maxHeight = 232, disabled, label }: { value: string; options: Opt[]; onChange: (v: string) => void; width?: string; placeholder?: string; maxHeight?: number; disabled?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxH: number; up: boolean } | null>(null);
  const sel = options.find(o => o.value === value);

  const place = useCallback(() => {
    const b = btn.current; if (!b) return;
    const r = b.getBoundingClientRect();
    const spaceBelow = innerHeight - r.bottom - 12, spaceAbove = r.top - 12;
    const need = Math.min(maxHeight, options.length * 40 + 14);
    const up = spaceBelow < need && spaceAbove > spaceBelow;
    setPos({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 160), maxH: Math.min(maxHeight, up ? spaceAbove : spaceBelow), up });
  }, [maxHeight, options.length]);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    setIdx(Math.max(0, options.findIndex(o => o.value === value)));
    const out = (e: MouseEvent) => { const n = e.target as Node; if (!pop.current?.contains(n) && !btn.current?.contains(n)) setOpen(false); };
    const rs = () => setOpen(false);
    document.addEventListener('mousedown', out, true); window.addEventListener('resize', rs); window.addEventListener('blur', rs);
    return () => { document.removeEventListener('mousedown', out, true); window.removeEventListener('resize', rs); window.removeEventListener('blur', rs); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) pop.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [idx, open, pos]);

  const choose = (v: string) => { onChange(v); setOpen(false); btn.current?.focus(); };
  const key = (e: React.KeyboardEvent) => {
    if (!open) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); } return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setIdx(0); } else if (e.key === 'End') { e.preventDefault(); setIdx(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[idx].value); }
    else if (e.key.length === 1) { const k = options.findIndex(o => o.label.toLowerCase().startsWith(e.key.toLowerCase())); if (k >= 0) setIdx(k); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <>
      <button ref={btn} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen(o => !o)} onKeyDown={key}
        className="field w-full cursor-default text-left disabled:opacity-40" style={{ width, ...(sel?.style || {}) }}>
        {sel?.icon && <sel.icon size={16} className="text-fg2" />}
        <span className="min-w-0 flex-1 truncate">{sel ? sel.label : <span className="text-fg2">{placeholder || t('selectPh')}</span>}</span>
        <ChevronDown size={16} className={'flex-none text-fg2 transition-transform duration-150 ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && pos && createPortal(
        <div ref={pop} role="listbox" className="select-pop" style={{ left: pos.left, width: pos.width, maxHeight: pos.maxH, ...(pos.up ? { bottom: innerHeight - pos.top, transformOrigin: 'bottom' } : { top: pos.top }) }}>
          {options.map((o, i) => (
            <button key={o.value} role="option" aria-selected={o.value === value} aria-checked={o.value === value} data-active={i === idx} className="mi" style={{ ...(o.style || {}), ...(i === idx ? { background: 'var(--f-hover)' } : {}) }}
              onMouseEnter={() => setIdx(i)} onClick={() => choose(o.value)}>
              <span className="mic">{o.value === value ? <Check size={16} /> : o.icon ? <o.icon size={16} /> : null}</span>
              <span className="ml truncate">{o.label}</span>
              {o.hint && <span className="text-xs text-fg2">{o.hint}</span>}
            </button>
          ))}
        </div>, document.body)}
    </>
  );
}

/* ───────────────────────────── toast host ───────────────────────────── */

const TOAST_ICON: Record<string, Icon> = { info: Info, success: CircleCheck, error: CircleAlert, warning: TriangleAlert };

export function ToastHost() {
  const list = toasts.use();
  return createPortal(
    <div className="pointer-events-none fixed bottom-14 right-4 z-[110] flex flex-col items-end gap-2" aria-live="polite">
      {list.map(x => { const I = TOAST_ICON[x.kind]; return (
        <div key={x.id} role={x.kind === 'error' ? 'alert' : 'status'} className={`toast pointer-events-auto ${x.kind}${x.leaving ? ' leaving' : ''}`}>
          <span className="tic"><I size={20} /></span>
          <span className="flex-1 text-sm">{x.msg}</span>
          <button className="ibtn sm" onClick={() => dismissToast(x.id)} {...tip(t('close'))}><X size={16} /></button>
          <i className="bar" style={{ animationDuration: x.ms + 'ms', width: '100%' }} />
        </div>); })}
    </div>, document.body);
}

/* ───────────────────────────── modal host ───────────────────────────── */

const SIZES = { sm: '27rem', md: '37rem', lg: '48rem', xl: '60rem' };

export function ModalHost() {
  const list = modals.use();
  useEffect(() => {
    if (!list.length) return;
    const top = list[list.length - 1];
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && top.opts.dismissable !== false) { e.preventDefault(); e.stopPropagation(); closeModal(top.id); } };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, [list]);
  return <>{list.map((m, i) => <ModalView key={m.id} m={m} top={i === list.length - 1} />)}</>;
}

function ModalView({ m, top }: { m: (typeof modals extends { get: () => (infer U)[] } ? U : never); top: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<Element | null>(document.activeElement);
  useEffect(() => {
    const r = ref.current; if (!r) return;
    (r.querySelector('[data-autofocus]') as HTMLElement || r.querySelector('.btn-filled,.btn-danger') as HTMLElement || r)?.focus?.({ preventScroll: true });
    const p = prev.current as HTMLElement | null;
    return () => { setTimeout(() => { if (!document.querySelector('.scrim')) p?.focus?.({ preventScroll: true }); }, 200); };
  }, []);
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return;
    const f = [...ref.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea,[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const w = SIZES[m.opts.size || 'sm'];
  return (
    <div className={'scrim' + (m.closing ? ' closing' : '') + (top ? '' : ' !bg-black/5')} style={{ placeItems: m.opts.align === 'top' ? 'start center' : 'center', paddingTop: m.opts.align === 'top' ? '12vh' : undefined }}
      onMouseDown={e => { if (e.target === e.currentTarget && m.opts.dismissable !== false) closeModal(m.id); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" onKeyDown={trap} className={'sheet outline-none ' + (m.opts.className ?? 'p-6')} style={{ width: `min(${w}, 100%)`, height: m.opts.size === 'xl' ? 'min(41rem, 100%)' : undefined }}>
        {m.render(v => closeModal(m.id, v))}
      </div>
    </div>
  );
}

/* ───────────────────────────── flyout menu host ───────────────────────────── */

export function MenuHost() {
  const m = menu.use();
  const ref = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(-1);

  useLayoutEffect(() => {
    const el = ref.current; if (!el || !m) return;
    let x: number, y: number, ox = 'left', oy = 'top';
    if (m.target instanceof HTMLElement) {
      const r = m.target.getBoundingClientRect();
      y = r.bottom + 6; x = m.align === 'right' ? r.right - el.offsetWidth : r.left;
      if (y + el.offsetHeight > innerHeight - 8) { y = r.top - el.offsetHeight - 6; oy = 'bottom'; }
    } else { x = m.target.x; y = m.target.y; if (y + el.offsetHeight > innerHeight - 8) { y = innerHeight - el.offsetHeight - 8; oy = 'bottom'; } }
    if (x + el.offsetWidth > innerWidth - 8) ox = 'right';
    x = Math.min(Math.max(8, x), innerWidth - el.offsetWidth - 8);
    el.style.left = x + 'px'; el.style.top = Math.max(8, y) + 'px'; el.style.setProperty('--ox', `${ox} ${oy}`);
    setFocus(-1);
  }, [m]);

  useEffect(() => {
    if (!m) return;
    const out = (e: MouseEvent) => { const n = e.target as Node; if (!ref.current?.contains(n) && !(m.target instanceof HTMLElement && m.target.contains(n))) closeMenu(); };
    const key = (e: KeyboardEvent) => {
      const items = m.items.map((it, i) => ({ it, i })).filter(x => !x.it.sep && !x.it.header && !x.it.disabled);
      const pos = items.findIndex(x => x.i === focus);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(items[(pos + 1) % items.length]?.i ?? -1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(items[(pos - 1 + items.length) % items.length]?.i ?? -1); }
      else if (e.key === 'Enter' && focus >= 0) { e.preventDefault(); e.stopPropagation(); run(m.items[focus]); }
      else if (e.key === 'Tab') e.preventDefault();
    };
    document.addEventListener('mousedown', out, true); document.addEventListener('keydown', key, true); window.addEventListener('blur', closeMenu);
    if (m.target instanceof HTMLElement) m.target.classList.add('on');
    return () => { document.removeEventListener('mousedown', out, true); document.removeEventListener('keydown', key, true); window.removeEventListener('blur', closeMenu); if (m.target instanceof HTMLElement) m.target.classList.remove('on'); };
  }, [m, focus]);

  const run = (it: MenuItem) => { if (it.disabled || !it.run) return; closeMenu(); it.run(); };
  if (!m) return null;
  return createPortal(
    <div ref={ref} role="menu" className="menu" style={{ minWidth: m.minWidth, left: -999, top: -999 }}>
      {m.items.map((it, i) => it.sep ? <div key={i} className="msep" /> : it.header ? <div key={i} className="mhead">{it.header}</div> : (
        <button key={i} role="menuitem" aria-checked={it.checked || undefined} disabled={it.disabled} className={'mi' + (it.danger ? ' danger' : '')} style={focus === i ? { background: 'var(--f-hover)' } : undefined}
          onMouseEnter={() => setFocus(i)} onClick={() => run(it)}>
          <span className="mic">{it.checked ? <Check size={16} /> : it.icon ? <it.icon size={17} /> : null}</span>
          <span className="ml">{it.label}</span>{it.kbd && <kbd>{it.kbd}</kbd>}
        </button>))}
    </div>, document.body);
}

/* ───────────────────────────── scroll to top FAB ───────────────────────────── */

export function ScrollTopFab({ show }: { show: boolean }) {
  useApp();
  return <button className={'fab' + (show ? ' show' : '')} tabIndex={show ? 0 : -1} onClick={scrollToTop} {...tip(t('scrollTop'))}><ArrowUp size={22} /></button>;
}

/** Shows the FAB for any scroll container after `after` px. */
export function useScrolled(after = 320) {
  const [s, setS] = useState(false);
  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => setS(e.currentTarget.scrollTop > after), [after]);
  return [s, onScroll, setS] as const;
}

export function SheetHeader({ icon: I, title, onClose, sub }: { icon?: Icon; title: string; sub?: string; onClose?: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {I && <I size={24} className="flex-none text-accent-text" />}
      <div className="min-w-0 flex-1"><h2 className="m-0 truncate font-[family-name:var(--font-display)] text-xl font-semibold leading-7">{title}</h2>{sub && <p className="m-0 text-sm text-fg2">{sub}</p>}</div>
      {onClose && <button className="ibtn" onClick={onClose} {...tip(t('close'), 'Esc')}><X size={18} /></button>}
    </div>
  );
}

export const cx = (...a: unknown[]) => a.filter(x => typeof x === 'string' && x).join(' ');
export type { ReactNode };
