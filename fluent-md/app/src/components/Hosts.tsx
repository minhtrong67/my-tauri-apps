import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IcInfo, IcSuccess, IcWarning, IcError, IcCloseS, type FluentIcon } from '../lib/icons';
import { useToasts, toast, useMenu, closeMenu, useConfirm, type ToastItem, type ToastKind } from '../lib/ui';
import { Popover, Modal, Btn } from './base';
import { useT } from '../lib/i18n';
import { cx, isMac } from '../lib/utils';

/* ---------------------------------------------------------------- toasts (Fluent InfoBar) */
const ICONS: Record<ToastKind, FluentIcon> = { info: IcInfo, success: IcSuccess, warning: IcWarning, error: IcError };
function Toast({ item }: { item: ToastItem }) {
  const t = useT();
  const [out, setOut] = useState(false);
  const I = ICONS[item.kind];
  const dismiss = () => { setOut(true); setTimeout(() => toast.dismiss(item.id), 150); };
  useEffect(() => { const id = setTimeout(dismiss, item.ms); return () => clearTimeout(id); /* eslint-disable-next-line */ }, [item.id]);
  return (
    <div className={cx('toast', item.kind, out && 'out')} role={item.kind === 'error' ? 'alert' : 'status'}>
      <span className="ti"><I aria-hidden="true" /></span>
      <span className="tm">{item.msg}</span>
      {item.action && <button type="button" className="btn standard sm" onClick={() => { item.action!.run(); dismiss(); }}><span className="bl">{item.action.label}</span></button>}
      <button type="button" className="ibtn xs" data-tip={t('close')} aria-label={t('close')} onClick={dismiss}><IcCloseS aria-hidden="true" /></button>
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

/* ----------------------------------------------------------------- menus (MenuFlyout) */
export function MenuHost() {
  const menu = useMenu((s) => s.menu);
  if (!menu) return null;
  return (
    <Popover anchor={menu.anchor} alignRight={menu.alignRight} onClose={closeMenu} className="menu">
      {menu.items.map((it, i) => it.sep ? <hr key={i} /> : it.header ? <div key={i} className="mh">{it.header}</div> : (
        <button key={i} type="button" role="menuitem" className={cx('item', it.checked && 'on')} disabled={it.disabled} onClick={() => { closeMenu(); setTimeout(() => it.run?.(), 0); }}>
          {it.icon ? <it.icon aria-hidden="true" /> : <span className="ph" />}
          <span className="tx"><b>{it.label}</b>{it.sub && <small>{it.sub}</small>}</span>
          {it.shortcut && <span className="sc">{it.shortcut.replace('Ctrl', isMac ? '⌘' : 'Ctrl')}</span>}
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
      timer = window.setTimeout(() => { if (cur === el) { setTip({ text: el.dataset.tip!, sc: el.dataset.sc, el }); shown = true; } }, shown ? 40 : 500);
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
    let top = r.bottom + 6; if (top + h > innerHeight - 6) top = r.top - h - 6;
    el.style.left = Math.max(6, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 6)) + 'px'; el.style.top = top + 'px';
  }, [tip]);
  const sc = tip?.sc ? tip.sc.replace('Ctrl', isMac ? '⌘' : 'Ctrl') : '';
  return <div ref={ref} popover="manual" className="ttip" role="tooltip">{tip?.text}{sc && <kbd>{sc}</kbd>}</div>;
}

/* --------------------------------------------------------------- confirm (ContentDialog) */
export function ConfirmHost() {
  const c = useConfirm((s) => s.c);
  const [last, setLast] = useState(c);
  useEffect(() => { if (c) setLast(c); }, [c]);
  const s = c || last;
  const t = useT();
  const done = (id: string) => { useConfirm.setState({ c: null }); s?.resolve(id); };
  const cancelId = s ? (s.actions.find((a) => a.id === 'cancel') || s.actions[s.actions.length - 1]).id : 'cancel';
  return (
    <Modal open={!!c} onClose={() => done(cancelId)} label={s?.title}>
      {s && (
        <div className="dlg-in confirm" role="alertdialog" aria-describedby="cf-body">
          <div className="dlg-text">
            <h2>{s.icon && <span className={cx('dlg-icon', s.kind)}><s.icon aria-hidden="true" /></span>}{s.title}</h2>
            <p id="cf-body">{s.body}</p>
          </div>
          <div className="dlg-act">
            {s.actions.map((a) => <Btn key={a.id} tone={a.tone || 'tonal'} onClick={() => done(a.id)} autoFocus={a.tone === 'filled'}>{a.label}</Btn>)}
          </div>
        </div>
      )}
      <span hidden>{t('close')}</span>
    </Modal>
  );
}
