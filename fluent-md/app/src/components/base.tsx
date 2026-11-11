import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { IcChevronDown, IcCheck, type FluentIcon } from '../lib/icons';
import { cx } from '../lib/utils';
import { useT } from '../lib/i18n';
import type { Tone } from '../lib/ui';

/* ------------------------------------------------------------------ buttons */
/** Tones map to Fluent button types: filled = accent, tonal/outlined = standard, text = subtle, error = critical. */
interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> { icon?: FluentIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg'; tip?: string; sc?: string }
export function Btn({ icon: I, tone = 'tonal', size = 'md', className, children, tip, sc, ...p }: BtnProps) {
  return (
    <button type="button" className={cx('btn', tone, size !== 'md' && size, className)} data-tip={tip} data-sc={sc} {...p}>
      {I && <I aria-hidden="true" />}{children !== undefined && children !== null && <span className="bl">{children}</span>}
    </button>
  );
}
interface IBProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> { icon: FluentIcon; tip: string; sc?: string; size?: 'xs' | 'sm' | 'md'; on?: boolean; toggle?: boolean; variant?: 'accent' | 'tonal' }
export function IconBtn({ icon: I, tip, sc, size = 'md', on, toggle, variant, className, ...p }: IBProps) {
  return (
    <button type="button" className={cx('ibtn', size !== 'md' && size, toggle && 'toggle', on && 'on', variant, className)} data-tip={tip} data-sc={sc} aria-label={tip} aria-pressed={toggle ? !!on : undefined} {...p}>
      <I aria-hidden="true" />
    </button>
  );
}

/** Segmented selector (like a Fluent SelectorBar): the chosen item gets a raised surface and an accent indicator. */
export function Seg<T extends string | number>({ value, items, onChange, fill, compact, label }: {
  value: T; items: { value: T; label?: string; icon?: FluentIcon; tip?: string; sc?: string }[]; onChange: (v: T, e: React.MouseEvent) => void; fill?: boolean; compact?: boolean; label?: string;
}) {
  return (
    <div className={cx('seg', fill && 'fill', compact && 'compact')} role="radiogroup" aria-label={label}>
      {items.map((it) => (
        <button key={String(it.value)} type="button" role="radio" aria-checked={it.value === value} className={cx(it.value === value && 'on')} data-tip={it.tip} data-sc={it.sc} onClick={(e) => onChange(it.value, e)}>
          {it.icon && <it.icon aria-hidden="true" />}{it.label && <span>{it.label}</span>}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- settings card */
/** One row of a Fluent settings card: optional icon, title and description on the left, the control on the right. */
export function SettingRow({ icon: I, title, desc, children, onClick, stack, className }: { icon?: FluentIcon; title: string; desc?: string; children?: ReactNode; onClick?: () => void; stack?: boolean; className?: string }) {
  return (
    <div className={cx('setting', stack && 'stack', onClick && 'click', className)} onClick={onClick}>
      <div className="s-head">
        {I && <span className="s-ic"><I aria-hidden="true" /></span>}
        <span className="tx"><b>{title}</b>{desc && <small>{desc}</small>}</span>
        {!stack && children && <span className="s-ctl">{children}</span>}
      </div>
      {stack && children && <div className="s-body">{children}</div>}
    </div>
  );
}

export function Switch({ checked, onChange, title, desc, icon }: { checked: boolean; onChange: (v: boolean) => void; title: string; desc?: string; icon?: FluentIcon }) {
  const t = useT();
  return (
    <label className="setting click">
      <div className="s-head">
        {icon && (() => { const I = icon; return <span className="s-ic"><I aria-hidden="true" /></span>; })()}
        <span className="tx"><b>{title}</b>{desc && <small>{desc}</small>}</span>
        <span className="s-ctl"><span className="sw-t">{checked ? t('on') : t('off')}</span>
          <span className="sw"><input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} /><i /></span></span>
      </div>
    </label>
  );
}

/** Fluent radio buttons. */
export function Radios<T extends string>({ value, items, onChange, label }: { value: T; items: { value: T; label: string; desc?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="radios" role="radiogroup" aria-label={label}>
      {items.map((it) => (
        <div key={it.value} role="radio" aria-checked={it.value === value} tabIndex={0} className={cx('radio-row', it.value === value && 'on')} onClick={() => onChange(it.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(it.value); } }}>
          <span className="radio" /><span className="tx"><b>{it.label}</b>{it.desc && <small>{it.desc}</small>}</span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- modal */
export function Modal({ open, onClose, className, children, label, align }: { open: boolean; onClose: () => void; className?: string; children: ReactNode; label?: string; align?: 'top' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [render, setRender] = useState(open);
  useEffect(() => { if (open) setRender(true); }, [open]);
  useLayoutEffect(() => {
    const d = ref.current; if (!d) return;
    if (open) { if (!d.open) { d.classList.remove('closing'); d.showModal(); } }
    else if (d.open) {
      d.classList.add('closing');
      setTimeout(() => { d.classList.remove('closing'); if (d.open) d.close(); setRender(false); }, 190);
    } else setRender(false);
  }, [open, render]);
  if (!render) return null;
  return (
    <dialog ref={ref} className={cx('dlg', className)} aria-label={label} style={align === 'top' ? { marginTop: 0 } : undefined}
      onCancel={(e) => { e.preventDefault(); onClose(); }} onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}>
      {children}
    </dialog>
  );
}

/* ------------------------------------------------------------------ popover */
/** Places an element next to an anchor, flipping and clamping so it always stays visible. */
export function place(el: HTMLElement, anchor: HTMLElement | { x: number; y: number }, alignRight = false) {
  const r = 'getBoundingClientRect' in anchor ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0 };
  const w = el.offsetWidth, h = el.offsetHeight, pad = 8, gap = 4;
  let left = alignRight ? r.right - w : r.left;
  if (el.dataset.match) { el.style.minWidth = r.width + 'px'; }
  left = Math.max(pad, Math.min(left, innerWidth - w - pad));
  let top = r.bottom + gap, up = false;
  if (top + h > innerHeight - pad) { const above = r.top - gap - h; if (above >= pad) { top = above; up = true; } else top = Math.max(pad, innerHeight - h - pad); }
  el.style.left = left + 'px'; el.style.top = top + 'px'; el.style.setProperty('--ox', `${Math.max(0, r.left - left)}px ${up ? 'bottom' : 'top'}`);
}

export function Popover({ anchor, onClose, className, children, alignRight, match }: { anchor: HTMLElement | { x: number; y: number }; onClose: () => void; className?: string; children: ReactNode; alignRight?: boolean; match?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [out, setOut] = useState(false);
  const host = ('closest' in anchor ? anchor.closest('dialog') : null) || document.body;
  const close = () => { setOut(true); setTimeout(onClose, 100); };
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    try { el.showPopover(); } catch { /* unsupported: fixed positioning still works */ }
    place(el, anchor, alignRight);
    el.querySelector<HTMLElement>('[data-first],button:not(:disabled)')?.focus({ preventScroll: true });
    const down = (e: PointerEvent) => { const n = e.target as Node; if (!el.contains(n) && !('contains' in anchor && anchor.contains(n))) close(); };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...el.querySelectorAll<HTMLElement>('button:not(:disabled)')], i = items.indexOf(document.activeElement as HTMLElement);
        e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener('pointerdown', down, true); document.addEventListener('keydown', key, true); addEventListener('blur', close); addEventListener('resize', close);
    return () => { document.removeEventListener('pointerdown', down, true); document.removeEventListener('keydown', key, true); removeEventListener('blur', close); removeEventListener('resize', close); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return createPortal(<div ref={ref} popover="manual" data-match={match ? '1' : undefined} className={cx('pop', className, out && 'out')} role="menu">{children}</div>, host);
}

/* ------------------------------------------------------------------- select */
export interface Opt<T extends string> { value: T; label: string; style?: CSSProperties }
/** Fluent ComboBox. */
export function Select<T extends string>({ value, options, onChange, label }: { value: T; options: Opt<T>[]; onChange: (v: T) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const cur = options.find((o) => o.value === value) || options[0];
  return (
    <div className="select">
      <button ref={btn} type="button" className="sel-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        <span className="v" style={cur.style}>{cur.label}</span><IcChevronDown aria-hidden="true" />
      </button>
      {open && btn.current && (
        <Popover anchor={btn.current} match onClose={() => setOpen(false)} className="menu sel-list">
          {options.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value} className={cx('item', o.value === value && 'on')} {...(o.value === value ? { 'data-first': '' } : {})}
              onClick={() => { onChange(o.value); setOpen(false); btn.current?.focus(); }}>
              <span className="tx"><b style={o.style}>{o.label}</b></span>{o.value === value && <IcCheck aria-hidden="true" />}
            </button>
          ))}
        </Popover>
      )}
    </div>
  );
}
