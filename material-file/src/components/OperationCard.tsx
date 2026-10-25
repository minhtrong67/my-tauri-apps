import { X } from 'lucide-react';
import { useUI } from '../store/ui';
import { useT } from '../lib/i18n';
import { api } from '../lib/api';
import { fmtSize } from '../lib/format';
import { Button } from './ui/Buttons';
import { WavyProgress } from './ui/Progress';

export function OperationCard() {
  const t = useT(); const op = useUI((s) => s.op);
  if (!op || !op.visible) return null;
  const pct = op.total ? Math.min(100, Math.round((op.done / op.total) * 100)) : 0;
  return (
    <div role="status" className="fixed right-4 bottom-12 z-[350] w-80 rounded-[1.75rem] bg-surface-container-high p-4 shadow-[var(--shadow-3)] ring-1 ring-outline-variant/60 animate-[toast-in_.5s_var(--spring)]">
      <div className="mb-1 flex items-center justify-between"><b>{op.title}</b><span className="text-xs font-semibold text-primary tabular-nums">{op.total ? pct + '%' : ''}</span></div>
      <div className="mb-2 truncate text-xs text-on-surface-variant" title={op.name}>{op.name || '…'}</div>
      <WavyProgress value={op.total ? pct : undefined} />
      <div className="mt-3 flex items-center justify-between"><span className="text-xs text-on-surface-variant tabular-nums">{op.total ? `${fmtSize(op.done, true)} / ${fmtSize(op.total, true)}` : ''}</span>
        <Button tone="danger" small icon={X} label={t('common.cancel')} onClick={() => void api.cancelOp()} /></div>
    </div>
  );
}
