// Confirm / prompt / list-picker dialogs. Every action button carries an icon, a label and a role colour.
import { useState, type ReactNode } from 'react';
import { Save, Trash2, X, Check, Pencil, CornerDownRight, TriangleAlert, Info, CircleAlert, FileSpreadsheet, RotateCcw, Download, type LucideIcon } from 'lucide-react';
import { openModal } from '../lib/overlay';
import { t } from '../lib/i18n';
import { cx, tip } from './ui';

export const ICONS: Record<string, LucideIcon> = { save: Save, trash: Trash2, x: X, check: Check, pencil: Pencil, goto: CornerDownRight, warning: TriangleAlert, info: Info, error: CircleAlert, sheet: FileSpreadsheet, restore: RotateCcw, download: Download };
export type Variant = 'primary' | 'tonal' | 'danger' | 'danger-tonal' | 'success' | 'text' | 'outlined';
const VCLASS: Record<Variant, string> = { primary: 'btn-filled', tonal: 'btn-tonal', danger: 'btn-danger', 'danger-tonal': 'btn-danger-tonal', success: 'btn-success', text: 'btn-text', outlined: 'btn-outlined' };

export interface DialogButton { id: string; label: string; icon?: string; variant?: Variant }
export type Tone = 'info' | 'warning' | 'error' | 'success';
const TONE: Record<Tone, { I: LucideIcon; box: string }> = {
  info: { I: Info, box: 'bg-primary-container text-on-primary-container' },
  warning: { I: TriangleAlert, box: 'bg-warning-container text-on-warning-container' },
  error: { I: CircleAlert, box: 'bg-error-container text-on-error-container' },
  success: { I: Check, box: 'bg-success-container text-on-success-container' },
};

export function ActionButton({ b, onClick }: { b: DialogButton; onClick: () => void }) {
  const I = b.icon ? ICONS[b.icon] : null;
  return <button className={cx('btn', VCLASS[b.variant || 'text'])} onClick={onClick} data-autofocus={b.variant === 'primary' || undefined}>{I && <I size={18} />}{b.label}</button>;
}

export function confirmDialog({ title, body, buttons, tone = 'info' }: { title: string; body: ReactNode; buttons: DialogButton[]; tone?: Tone }): Promise<string> {
  return openModal<string>(close => {
    const { I, box } = TONE[tone];
    return (
      <>
        <div className="mb-3 flex items-center gap-3"><span className={cx('grid size-12 flex-none place-items-center rounded-2xl', box)}><I size={24} /></span><h2 className="m-0 text-[1.375rem] font-medium leading-7">{title}</h2></div>
        <p className="mb-6 mt-1 text-[.9375rem] leading-6 text-on-surface-variant">{body}</p>
        <div className="dfoot">{buttons.map(b => <ActionButton key={b.id} b={b} onClick={() => close(b.id)} />)}</div>
      </>
    );
  }, { size: 'sm' }).then(v => v ?? 'cancel');
}

export function promptDialog({ title, label, value = '', type = 'text', min, max, icon = 'pencil' }: { title: string; label?: string; value?: string; type?: string; min?: number; max?: number; icon?: string }): Promise<string | null> {
  return openModal<string | null>(close => <PromptBody {...{ title, label, value, type, min, max, icon }} close={close} />, { size: 'sm' }).then(v => (v === undefined ? null : v));
}

function PromptBody({ title, label, value, type, min, max, icon, close }: { title: string; label?: string; value: string; type: string; min?: number; max?: number; icon: string; close: (v?: string | null) => void }) {
  const [v, setV] = useState(value);
  const I = ICONS[icon] || Pencil;
  return (
    <form onSubmit={e => { e.preventDefault(); close(v); }}>
      <div className="mb-4 flex items-center gap-3"><span className="grid size-12 flex-none place-items-center rounded-2xl bg-primary-container text-on-primary-container"><I size={22} /></span><h2 className="m-0 text-[1.375rem] font-medium leading-7">{title}</h2></div>
      <label className="mb-6 block text-sm text-on-surface-variant">{label}
        <input className="in mt-1.5" data-autofocus autoFocus type={type} min={min} max={max} value={v} onChange={e => setV(e.target.value)} onFocus={e => e.currentTarget.select()} />
      </label>
      <div className="dfoot">
        <button type="button" className="btn btn-tonal" onClick={() => close(null)}><X size={18} />{t('cancel')}</button>
        <button type="submit" className="btn btn-filled"><Check size={18} />{t('ok')}</button>
      </div>
    </form>
  );
}

/** Pick one entry from a list (spreadsheet sheets). Resolves with the index or -1. */
export function pickDialog({ title, items }: { title: string; items: string[] }): Promise<number> {
  return openModal<number>(close => (
    <>
      <div className="mb-4 flex items-center gap-3"><span className="grid size-12 flex-none place-items-center rounded-2xl bg-primary-container text-on-primary-container"><FileSpreadsheet size={22} /></span><h2 className="m-0 text-[1.375rem] font-medium leading-7">{title}</h2></div>
      <div className="mb-5 max-h-72 overflow-auto rounded-2xl bg-sc p-1.5">
        {items.map((n, i) => <button key={i} className="mi" onClick={() => close(i)} {...tip(n)}><span className="mic"><FileSpreadsheet size={17} /></span><span className="ml truncate">{n}</span></button>)}
      </div>
      <div className="dfoot"><button className="btn btn-tonal" onClick={() => close(-1)}><X size={18} />{t('cancel')}</button></div>
    </>
  ), { size: 'sm' }).then(v => (v === undefined ? -1 : v));
}
