import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Info, CircleCheck, TriangleAlert, OctagonAlert, X } from 'lucide-react';
import { useToasts, toast, useMenu, closeMenu, useConfirm, type ToastItem, type ToastKind } from '../lib/ui';
import { Popover, Modal, Btn, IconBtn } from './base';
import { useT } from '../lib/i18n';
import { cx } from '../lib/shapes';
import { isMac } from '../lib/utils';

/* ---------------------------------------------------------------- toasts */
const ICONS: Record<ToastKind, typeof Info> = { info: Info, success: CircleCheck, warning: TriangleAlert, error: OctagonAlert };
function Toast({ item }: { item: ToastItem }) {
  const t = useT();
  const [out, setOut] = useState(false);
  const I = ICONS[item.kind];
  const dismiss = () => { setOut(true); setTimeout(() => toast.dismiss(item.id), 180); };
  useEffect(() => { const id = setTimeout(dismiss, item.ms); return () => clearTimeout(id); /* eslint-disable-next-line */ }, [item.id]);
  return (
    <div className={cx('toast', item.kind, out && 'out')} role={item.kind === 'error' ? 'alert' : 'status'}>
      <span className="ti"><I aria-hidden="true" /></span>
      <span className="tm">{item.msg}</span>
      {item.action && <button type="button" className="btn text sm" onClick={() => { item.action!.run(); dismiss(); }}>{item.action.label}</button>}
      <IconBtn icon={X} size="sm" tip={t('close')} onClick={dismiss} />
      <span className="bar" style={{ animationDuration: item.ms + 'ms' }} />
    </div>
  );
}
export function ToastHost() {
  const items = useToasts((s) => s.items), ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    try { if (items.length) { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } else if (el.matches(':popover-open')) el.hidePopover(); } catch { /* ignore */ }
  }, [items]);
  return <div ref={ref} popover="manual" className="toasts" aria-live="polite">{items.map((i) => <Toast key={i.id} item={i} />)}</div>;
}

/* ----------------------------------------------------------------- menus */
export function MenuHost() {
  const menu = useMenu((s) => s.menu);
  if (!menu) return null;
  return (
    <Popover anchor={menu.anchor} alignRight={menu.alignRight} onClose={closeMenu} className="menu">
      {menu.items.map((it, i) => it.sep ? <hr key={i} /> : it.header ? <div key={i} className="mh">{it.header}</div> : (
        <button key={i} type="button" role="menuitem" className={cx('item', it.checked && 'on')} disabled={it.disabled} onClick={() => { closeMenu(); setTimeout(() => it.run?.(), 0); }}>
          {it.icon && <it.icon aria-hidden="true" />}
          <span className="tx"><b>{it.label}</b>{it.sub && <small>{it.sub}</small>}</span>
          {it.shortcut && <span className="sc">{it.shortcut}</span>}
        </button>
      ))}
    </Popover>
  );
}

/* --------------------------------------------------------------- tooltip */
export function TipHost() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; sc?: string; el: HTMLElement } | null>(null);
  useEffect(() => {
    let timer = 0, cur: HTMLElement | null = null, shown = false;
    const hide = () => { clearTimeout(timer); cur = null; setTip(null); setTimeout(() => { shown = false; }, 250); };
    const over = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-tip]') as HTMLElement | null;
      if (el === cur) return;
      clearTimeout(timer); cur = el;
      if (!el || !el.dataset.tip) { setTip(null); return; }
      timer = window.setTimeout(() => { if (cur === el) { setTip({ text: el.dataset.tip!, sc: el.dataset.sc, el }); shown = true; } }, shown ? 40 : 420);
    };
    const gone = () => hide();
    document.addEventListener('pointerover', over); document.addEventListener('pointerdown', gone, true); document.addEventListener('keydown', gone, true); addEventListener('blur', gone);
    document.addEventListener('scroll', gone, true);
    return () => { document.removeEventListener('pointerover', over); document.removeEventListener('pointerdown', gone, true); document.removeEventListener('keydown', gone, true); removeEventListener('blur', gone); document.removeEventListener('scroll', gone, true); };
  }, []);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    try { if (tip) { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } else if (el.matches(':popover-open')) el.hidePopover(); } catch { /* ignore */ }
    if (!tip) return;
    const r = tip.el.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let top = r.bottom + 8; if (top + h > innerHeight - 6) top = r.top - h - 8;
    el.style.left = Math.max(6, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 6)) + 'px'; el.style.top = top + 'px';
  }, [tip]);
  const sc = tip?.sc ? tip.sc.replace('Ctrl', isMac ? '⌘' : 'Ctrl') : '';
  return <div ref={ref} popover="manual" className="ttip" role="tooltip">{tip?.text}{sc && <kbd>{sc}</kbd>}</div>;
}

/* --------------------------------------------------------------- confirm */
export function ConfirmHost() {
  const c = useConfirm((s) => s.c);
  const [last, setLast] = useState(c);
  useEffect(() => { if (c) setLast(c); }, [c]);
  const s = c || last;
  const t = useT();
  const done = (id: string) => { useConfirm.setState({ c: null }); s?.resolve(id); };
  const cancelId = s ? (s.actions.find((a) => a.id === 'cancel') || s.actions[0]).id : 'cancel';
  return (
    <Modal open={!!c} onClose={() => done(cancelId)} label={s?.title}>
      {s && (
        <div className="dlg-in" role="alertdialog" aria-describedby="cf-body">
          {s.icon && <div className={cx('dlg-icon', s.kind)}><s.icon aria-hidden="true" /></div>}
          <h2>{s.title}</h2>
          <p id="cf-body">{s.body}</p>
          <div className="dlg-act">
            {s.actions.map((a) => <Btn key={a.id} icon={a.icon} tone={a.tone || 'tonal'} onClick={() => done(a.id)} autoFocus={a.tone === 'filled'}>{a.label}</Btn>)}
          </div>
        </div>
      )}
      <span hidden>{t('close')}</span>
    </Modal>
  );
}

/* ---------------------------------------------------------------- ripple */
export function useRipple() {
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.('.btn,.ibtn,.item,.tab,.seg>button,.chip-btn,.fab-top,.tpl,.toc-i,.radio-row,.row-sw,.wbtn') as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled) return;
      const r = el.getBoundingClientRect(), size = Math.hypot(Math.max(e.clientX - r.left, r.right - e.clientX), Math.max(e.clientY - r.top, r.bottom - e.clientY)) * 2;
      const s = document.createElement('span'); s.className = 'rp';
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      el.append(s); s.addEventListener('animationend', () => s.remove());
    };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, []);
}
