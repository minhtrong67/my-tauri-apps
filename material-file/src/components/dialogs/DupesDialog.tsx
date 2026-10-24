import { useEffect, useMemo, useRef, useState } from 'react';
import { CopyPlus, Eye, ScanSearch, Square, SquareCheck, Trash2, X } from 'lucide-react';
import { closeModal, toast, useUI } from '../../store/ui';
import { useT } from '../../lib/i18n';
import { api, listen } from '../../lib/api';
import { fmtSize } from '../../lib/format';
import type { DupGroup } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button, IconButton } from '../ui/Buttons';
import { Select } from '../ui/Select';
import { confirmDialog, errText, refreshAll, revealItem, useExplorer } from '../../store/explorer';
import { baseName, isVirtual, parentOf } from '../../lib/paths';
import { EmptyState } from '../EmptyState';

const MINS = [{ value: '1024', label: '≥ 1 KB' }, { value: '102400', label: '≥ 100 KB' }, { value: '1048576', label: '≥ 1 MB' }, { value: '10485760', label: '≥ 10 MB' }];
export function DupesDialog() {
  const t = useT(); const open = useUI((s) => !!s.modals.dupes);
  const root = useExplorer((s) => s.panes[s.activePane].path);
  const real = !!root && !isVirtual(root);
  const [min, setMin] = useState('102400'); const [busy, setBusy] = useState(false); const [groups, setGroups] = useState<DupGroup[] | null>(null);
  const [prog, setProg] = useState({ stage: '', done: 0, total: 0 }); const [picked, setPicked] = useState<Set<string>>(new Set());
  const run = useRef(0);
  useEffect(() => { if (open) { setGroups(null); setPicked(new Set()); setBusy(false); } }, [open]);
  useEffect(() => { if (!open) return; let un: (() => void) | undefined; void listen<{ stage: string; done: number; total: number }>('dup-progress', setProg).then((u) => { un = u; }); return () => un?.(); }, [open]);
  const scan = async () => {
    if (!real) return; const my = ++run.current; setBusy(true); setGroups(null); setPicked(new Set()); setProg({ stage: 'scan', done: 0, total: 0 });
    try { const r = await api.findDuplicates(root as string, +min); if (run.current === my) { setGroups(r); setPicked(new Set(r.flatMap((g) => g.paths.slice(1)))); } }
    catch (e) { if (!String(e).includes('cancelled')) toast(errText(e), 'error'); } finally { if (run.current === my) setBusy(false); }
  };
  const stop = () => { run.current++; void api.cancelOp(); setBusy(false); };
  const wasted = useMemo(() => (groups || []).reduce((n, g) => n + g.size * (g.paths.length - 1), 0), [groups]);
  const sel = useMemo(() => (groups || []).reduce((n, g) => n + g.paths.filter((p) => picked.has(p)).length * g.size, 0), [groups, picked]);
  const del = async () => {
    const paths = [...picked]; if (!paths.length) return;
    if (!(await confirmDialog({ title: t('dupes.deleteTitle'), message: t('dupes.deleteMsg', { n: paths.length, size: fmtSize(sel, true) }), confirmLabel: t('cmd.delete'), confirmIcon: Trash2, tone: 'danger', icon: Trash2 }))) return;
    try { await api.deleteItems(paths, false); toast(t('msg.deleted'), 'success'); setGroups((g) => (g || []).map((x) => ({ ...x, paths: x.paths.filter((p) => !picked.has(p)) })).filter((x) => x.paths.length > 1)); setPicked(new Set()); refreshAll(); } catch (e) { toast(errText(e), 'error'); }
  };
  const toggle = (p: string) => setPicked((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });
  return (
    <Modal open={open} onClose={() => { stop(); closeModal('dupes'); }} title={t('dupes.title')} icon={CopyPlus} width={720} tall
      footer={<>
        <span className="mr-auto text-xs text-on-surface-variant">{groups ? t('dupes.summary', { groups: groups.length, size: fmtSize(wasted, true) }) : ''}</span>
        <Button tone="danger" icon={Trash2} label={t('dupes.deleteSel', { n: picked.size })} disabled={!picked.size} onClick={() => void del()} />
        <Button tone="tonal" icon={X} label={t('common.close')} onClick={() => { stop(); closeModal('dupes'); }} />
      </>}>
      <div className="px-6 pb-3">
        <p className="mb-3 text-on-surface-variant">{t('dupes.desc', { folder: real ? baseName(root as string) : '—' })}</p>
        <div className="flex flex-wrap items-center gap-2"><Select ariaLabel={t('dupes.minSize')} value={min} onChange={setMin} options={MINS} width={150} />
          {busy ? <Button tone="danger" icon={X} label={t('common.cancel')} onClick={stop} /> : <Button tone="filled" icon={ScanSearch} label={t('dupes.scan')} disabled={!real} onClick={() => void scan()} />}</div>
        {busy && <div className="mt-4"><div className={`h-2 overflow-hidden rounded-full bg-surface-highest ${prog.total ? '' : 'indet'}`}>{prog.total > 0 && <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: Math.min(100, (prog.done / prog.total) * 100) + '%' }} />}</div>
          <div className="mt-1.5 text-xs text-on-surface-variant">{prog.stage === 'scan' ? t('dupes.scanning', { n: prog.done.toLocaleString() }) : t('dupes.hashing', { done: prog.done.toLocaleString(), total: prog.total.toLocaleString() })}</div></div>}
      </div>
      <div className="space-y-3 px-6 pb-4">
        {groups && groups.length === 0 && <EmptyState kind="check" title={t('dupes.none')} />}
        {groups?.map((g, gi) => (
          <div key={gi} className="card anim-item overflow-hidden p-2" style={{ animationDelay: Math.min(gi, 10) * 30 + 'ms' }}>
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-primary"><CopyPlus className="size-4" />{t('dupes.group', { n: g.paths.length, size: fmtSize(g.size, true) })}</div>
            {g.paths.map((p) => (
              <div key={p} className="flex items-center gap-1 rounded-xl hover:bg-on-surface/8">
                <button type="button" onClick={() => toggle(p)} aria-pressed={picked.has(p)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left">
                  {picked.has(p) ? <SquareCheck className="size-5 flex-none text-error" /> : <Square className="size-5 flex-none text-on-surface-variant" />}
                  <span className="min-w-0"><span className="block truncate font-medium">{baseName(p)}</span><span className="block truncate text-xs text-on-surface-variant">{parentOf(p)}</span></span>
                </button>
                <IconButton icon={Eye} label={t('cmd.reveal')} small onClick={() => void revealItem(p)} />
              </div>
            ))}
          </div>
        ))}
      </div>
      
    </Modal>
  );
}
