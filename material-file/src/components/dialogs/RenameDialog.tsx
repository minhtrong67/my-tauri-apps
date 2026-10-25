import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Pencil, X } from 'lucide-react';
import { closeModal, toast, useUI } from '../../store/ui';
import { useT } from '../../lib/i18n';
import { api } from '../../lib/api';
import type { Entry } from '../../lib/types';
import { DEFAULT_RENAME, planRename, type Case, type RenameOpts } from '../../lib/rename';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Buttons';
import { Segmented, Switch } from '../ui/Controls';
import { Select } from '../ui/Select';
import { errText, pushUndoOp, refresh, useExplorer } from '../../store/explorer';
import { FileIcon } from '../FileIcon';

const L = ({ children, label }: { children: React.ReactNode; label: string }) => <label className="block"><span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">{label}</span>{children}</label>;

/** Batch rename with live preview: pattern ({name} {n} {date} {ext}) or find & replace (plain / regex). */
export function RenameDialog() {
  const t = useT(); const p = useUI((s) => s.modals.rename) as { targets: Entry[] } | undefined;
  const id = useExplorer((s) => s.activePane); const entries = useExplorer((s) => s.panes[s.activePane].entries);
  const [o, setO] = useState<RenameOpts>(DEFAULT_RENAME); const [busy, setBusy] = useState(false);
  useEffect(() => { if (p) setO(DEFAULT_RENAME); }, [p]);
  const set = (patch: Partial<RenameOpts>) => setO((x) => ({ ...x, ...patch }));
  const siblings = useMemo(() => new Set(entries.map((e) => e.name.toLowerCase())), [entries]);
  const plans = useMemo(() => (p ? planRename(p.targets, o, siblings) : []), [p, o, siblings]);
  const changed = plans.filter((x) => x.to !== x.from.name);
  const bad = plans.filter((x) => x.error);
  const apply = async () => {
    if (!p || bad.length || !changed.length) return; setBusy(true);
    const done: { from: string; to: string }[] = [];
    try {
      // two phases (temporary names first) so names that swap or shift cannot collide
      const tmp: { from: string; tmp: string; to: string }[] = [];
      for (const [i, x] of changed.entries()) tmp.push({ from: x.from.path, tmp: await api.renameItem(x.from.path, `~mf-${Date.now()}-${i}.tmp`), to: x.to });
      for (const x of tmp) done.push({ from: x.from, to: await api.renameItem(x.tmp, x.to) });
      pushUndoOp({ type: 'rename-many', pairs: done });
      toast(t('rename.done', { n: done.length }), 'success'); closeModal('rename');
      await refresh(id, done.map((d) => d.to));
    } catch (e) { toast(errText(e), 'error'); await refresh(id); } finally { setBusy(false); }
  };
  const casing: { value: Case; label: string }[] = [{ value: 'keep', label: t('rename.caseKeep') }, { value: 'lower', label: 'abc' }, { value: 'upper', label: 'ABC' }, { value: 'title', label: 'Abc' }];
  return (
    <Modal open={!!p} onClose={() => closeModal('rename')} title={t('rename.title', { n: p?.targets.length ?? 0 })} icon={Pencil} width={680} tall
      footer={<><span className="mr-auto text-xs text-on-surface-variant">{bad.length ? t('rename.problems', { n: bad.length }) : t('rename.willRename', { n: changed.length })}</span>
        <Button tone="text" icon={X} label={t('common.cancel')} onClick={() => closeModal('rename')} />
        <Button tone="filled" icon={Check} label={t('cmd.rename')} disabled={busy || !!bad.length || !changed.length} onClick={() => void apply()} /></>}>
      <div className="space-y-4 px-6 pb-3">
        <Segmented ariaLabel="mode" value={o.mode} onChange={(v) => set({ mode: v })} options={[{ value: 'pattern', label: t('rename.modePattern') }, { value: 'replace', label: t('rename.modeReplace') }]} />
        {o.mode === 'pattern' ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-4"><L label={t('rename.pattern')}><input data-autofocus className="field font-mono" value={o.pattern} spellCheck={false} onChange={(e) => set({ pattern: e.target.value })} /></L>
              <p className="mt-1.5 text-xs text-on-surface-variant">{t('rename.tokens')}</p></div>
            <L label={t('rename.start')}><input className="field" type="number" value={o.start} onChange={(e) => set({ start: +e.target.value || 0 })} /></L>
            <L label={t('rename.step')}><input className="field" type="number" min={1} value={o.step} onChange={(e) => set({ step: Math.max(1, +e.target.value || 1) })} /></L>
            <L label={t('rename.pad')}><input className="field" type="number" min={1} max={8} value={o.pad} onChange={(e) => set({ pad: Math.min(8, Math.max(1, +e.target.value || 1)) })} /></L>
            <L label={t('rename.case')}><Select ariaLabel={t('rename.case')} value={o.casing} onChange={(v) => set({ casing: v })} options={casing} width={150} /></L>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <L label={t('rename.find')}><input data-autofocus className="field font-mono" value={o.find} spellCheck={false} onChange={(e) => set({ find: e.target.value })} /></L>
            <L label={t('rename.replaceWith')}><input className="field font-mono" value={o.replace} spellCheck={false} onChange={(e) => set({ replace: e.target.value })} /></L>
            <div className="flex items-center justify-between rounded-2xl bg-surface-container-high px-4 py-2.5"><span className="font-medium">{t('search.regex')}</span><Switch label={t('search.regex')} checked={o.regex} onChange={(v) => set({ regex: v })} /></div>
            <div className="flex items-center justify-between rounded-2xl bg-surface-container-high px-4 py-2.5"><span className="font-medium">{t('rename.matchCase')}</span><Switch label={t('rename.matchCase')} checked={o.matchCase} onChange={(v) => set({ matchCase: v })} /></div>
            <L label={t('rename.case')}><Select ariaLabel={t('rename.case')} value={o.casing} onChange={(v) => set({ casing: v })} options={casing} width={150} /></L>
          </div>
        )}
        <div>
          <div className="mb-1.5 text-xs font-bold tracking-wide text-primary uppercase">{t('rename.preview')}</div>
          <div className="max-h-64 divide-y divide-outline-variant/40 overflow-y-auto rounded-2xl bg-surface-container-low">
            {plans.slice(0, 300).map((x) => (
              <div key={x.from.path} className={`flex items-center gap-2 px-3 py-2 ${x.error ? 'bg-error/10' : ''}`}>
                <FileIcon entry={x.from} size={18} />
                <span className="min-w-0 flex-1 truncate text-on-surface-variant" title={x.from.name}>{x.from.name}</span>
                <ArrowRight className="size-4 flex-none text-primary" />
                <span className={`min-w-0 flex-1 truncate font-semibold ${x.error ? 'text-error' : x.to === x.from.name ? 'text-on-surface-variant' : ''}`} title={x.to}>{x.to || '—'}</span>
                {x.error && <span title={t('rename.err.' + x.error)} className="flex-none text-error"><AlertCircle className="size-4" /></span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
