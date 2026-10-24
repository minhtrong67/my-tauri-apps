import { useEffect, useState } from 'react';
import { AlertTriangle, HelpCircle, Info, Trash2 } from 'lucide-react';
import { closeDialog, useUI } from '../store/ui';
import { Modal } from './ui/Modal';
import { Button } from './ui/Buttons';

/** Generic confirm / prompt dialog; every action button has an icon, a label and an intent colour. */
export function AppDialog() {
  const d = useUI((s) => s.dialog);
  const [val, setVal] = useState('');
  useEffect(() => { if (d?.input) setVal(d.input.value); }, [d]);
  const Icon = d?.icon || (d?.tone === 'danger' ? Trash2 : d?.tone === 'warning' ? AlertTriangle : d?.kind === 'prompt' ? HelpCircle : Info);
  const tone = d?.tone === 'danger' ? 'bg-error/15 text-error' : d?.tone === 'warning' ? 'bg-warning/20 text-warning' : 'bg-primary-container text-on-primary-container';
  const cancel = () => closeDialog({ id: 'cancel' });
  return (
    <Modal open={!!d} onClose={cancel} width={440} footer={d?.buttons.map((b) => (
      <Button key={b.id} tone={b.tone === 'primary' ? 'filled' : b.tone} icon={b.icon} label={b.label} data-autofocus={b.tone !== 'text' && b.id !== 'cancel' && d.kind === 'confirm' ? true : undefined} onClick={() => closeDialog({ id: b.id, value: val })} />
    ))}>
      {d && (
        <div className="px-6 pt-6 pb-2">
          <div className={`mb-4 grid size-14 place-items-center rounded-[1.25rem] ${tone}`}><Icon className="size-7" /></div>
          <h2 className="mb-2 text-xl font-semibold">{d.title}</h2>
          {d.message && <p className="break-words text-on-surface-variant">{d.message}</p>}
          {d.input && (
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">{d.input.label}</span>
              <input data-autofocus className="field" value={val} onChange={(e) => setVal(e.target.value)} onFocus={(e) => e.currentTarget.select()} spellCheck={false}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); closeDialog({ id: 'ok', value: val }); } }} />
            </label>
          )}
        </div>
      )}
    </Modal>
  );
}
