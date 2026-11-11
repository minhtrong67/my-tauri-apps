// Confirm / prompt / list-picker dialogs. Every action button carries an icon, a label and a role colour.
import { useState, type ReactNode } from 'react';
import { Save, Trash2, X, Check, Pencil, CornerDownRight, TriangleAlert, Info, CircleAlert, FileSpreadsheet, RotateCcw, Download, type Icon } from '../lib/icons';
import { openModal } from '../lib/overlay';
import { t } from '../lib/i18n';
import { cx, tip } from './ui';

export const ICONS: Record<string, Icon> = { save: Save, trash: Trash2, x: X, check: Check, pencil: Pencil, goto: CornerDownRight, warning: TriangleAlert, info: Info, error: CircleAlert, sheet: FileSpreadsheet, restore: RotateCcw, download: Download };
export type Variant = 'primary' | 'tonal' | 'danger' | 'danger-tonal' | 'success' | 'text' | 'outlined';
const VCLASS: Record<Variant, string> = { primary: 'btn-filled', tonal: 'btn-tonal', danger: 'btn-danger', 'danger-tonal': 'btn-danger-tonal', success: 'btn-success', text: 'btn-text', outlined: 'btn-outlined' };

export interface DialogButton { id: string; label: string; icon?: string; variant?: Variant }
export type Tone = 'info' | 'warning' | 'error' | 'success';
const TONE: Record<Tone, { I: Icon; box: string }> = {
  info: { I: Info, box: 'text-accent-text' },
  warning: { I: TriangleAlert, box: 'text-warn' },
  error: { I: CircleAlert, box: 'text-danger' },
  success: { I: Check, box: 'text-success' },
};

export function ActionButton({ b, onClick }: { b: DialogButton; onClick: () => void }) {
  const I = b.icon ? ICONS[b.icon] : null;
  return <button className={cx('btn', VCLASS[b.variant || 'tonal'])} onClick={onClick} data-autofocus={b.variant === 'primary' || undefined}>{I && <I size={18} />}{b.label}</button>;
}

export function confirmDialog({ title, body, buttons, tone = 'info' }: { title: string; body: ReactNode; buttons: DialogButton[]; tone?: Tone }): Promise<string> {
  return openModal<string>(close => {
    const { I, box } = TONE[tone];
    return (
      <>
        <div className="mb-3 flex items-center gap-3"><I size={24} className={cx('flex-none', box)} /><h2 className="m-0 font-[family-name:var(--font-display)] text-xl font-semibold leading-7">{title}</h2></div>
        <p className="m-0 text-sm leading-5 text-fg2">{body}</p>
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
      <div className="mb-4 flex items-center gap-3"><I size={24} className="flex-none text-accent-text" /><h2 className="m-0 font-[family-name:var(--font-display)] text-xl font-semibold leading-7">{title}</h2></div>
      <label className="block text-sm text-fg2">{label}
        <input className="in mt-1.5" data-autofocus autoFocus type={type} min={min} max={max} value={v} onChange={e => setV(e.target.value)} onFocus={e => e.currentTarget.select()} />
      </label>
      <div className="dfoot">
        <button type="button" className="btn" onClick={() => close(null)}><X size={18} />{t('cancel')}</button>
        <button type="submit" className="btn btn-filled"><Check size={18} />{t('ok')}</button>
      </div>
    </form>
  );
}

/** Pick one entry from a list (spreadsheet sheets). Resolves with the index or -1. */
export function pickDialog({ title, items }: { title: string; items: string[] }): Promise<number> {
  return openModal<number>(close => (
    <>
      <div className="mb-4 flex items-center gap-3"><FileSpreadsheet size={24} className="flex-none text-accent-text" /><h2 className="m-0 font-[family-name:var(--font-display)] text-xl font-semibold leading-7">{title}</h2></div>
      <div className="max-h-72 overflow-auto rounded-lg border border-stroke bg-card-d p-1">
        {items.map((n, i) => <button key={i} className="mi" onClick={() => close(i)} {...tip(n)}><span className="mic"><FileSpreadsheet size={17} /></span><span className="ml truncate">{n}</span></button>)}
      </div>
      <div className="dfoot"><button className="btn" onClick={() => close(-1)}><X size={18} />{t('cancel')}</button></div>
    </>
  ), { size: 'sm' }).then(v => (v === undefined ? -1 : v));
}
