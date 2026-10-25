import { useEffect, useState } from 'react';
import { Bookmark, BookmarkPlus, Regex, Search, X } from 'lucide-react';
import { closeModal, useUI } from '../../store/ui';
import { useT } from '../../lib/i18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Buttons';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Controls';
import { deepSearch, promptDialog, useExplorer } from '../../store/explorer';
import { useSettings, type SavedSearch } from '../../store/settings';
import { extsForKind } from '../../lib/fileTypes';
import type { Kind } from '../../lib/types';
import { baseName } from '../../lib/paths';

const UNITS = [{ value: '1024', label: 'KB' }, { value: '1048576', label: 'MB' }, { value: '1073741824', label: 'GB' }];
const dayMs = (v: string, end: boolean) => (v ? new Date(v + (end ? 'T23:59:59' : 'T00:00:00')).getTime() : undefined);

export function SearchDialog() {
  const t = useT(); const open = useUI((s) => !!s.modals.search);
  const id = useExplorer((s) => s.activePane); const path = useExplorer((s) => s.panes[s.activePane].path);
  const [q, setQ] = useState(''); const [regex, setRegex] = useState(false); const [kind, setKind] = useState<Kind>('all');
  const [min, setMin] = useState(''); const [minU, setMinU] = useState('1048576'); const [max, setMax] = useState(''); const [maxU, setMaxU] = useState('1048576');
  const [after, setAfter] = useState(''); const [before, setBefore] = useState('');
  useEffect(() => { if (open) { const el = document.querySelector<HTMLInputElement>(`[data-search="${id}"]`); if (el?.value) setQ(el.value); } }, [open, id]);
  const submit = () => {
    closeModal('search');
    void deepSearch(id, q.trim(), { regex, exts: extsForKind(kind), minSize: min ? +min * +minU : undefined, maxSize: max ? +max * +maxU : undefined, after: dayMs(after, false), before: dayMs(before, true) });
  };
  const saved = useSettings((s) => s.savedSearches);
  const snapshot = (name: string): SavedSearch => ({ name, q, regex, kind, min, max, minU, maxU, after, before });
  const save = async () => {
    const name = await promptDialog({ title: t('search.saveTitle'), label: t('search.saveLabel'), value: q.trim().slice(0, 30), icon: BookmarkPlus, okLabel: t('common.save') });
    if (name) useSettings.getState().set({ savedSearches: [...saved.filter((s) => s.name !== name), snapshot(name)].slice(-12) });
  };
  const apply = (s: SavedSearch) => { setQ(s.q); setRegex(s.regex); setKind(s.kind as Kind); setMin(s.min || ''); setMax(s.max || ''); setMinU(s.minU || '1048576'); setMaxU(s.maxU || '1048576'); setAfter(s.after || ''); setBefore(s.before || ''); };
  const reset = () => { setQ(''); setRegex(false); setKind('all'); setMin(''); setMax(''); setAfter(''); setBefore(''); };
  const L = ({ children, label }: { children: React.ReactNode; label: string }) => <label className="block"><span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">{label}</span>{children}</label>;
  return (
    <Modal open={open} onClose={() => closeModal('search')} title={t('search.advanced')} icon={Search} width={560}
      footer={<><Button tone="text" icon={X} label={t('common.reset')} onClick={reset} /><Button tone="tonal" icon={BookmarkPlus} label={t('common.save')} onClick={() => void save()} /><Button tone="filled" icon={Search} label={t('search.run')} onClick={submit} /></>}>
      <form className="space-y-4 px-6 pb-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {saved.length > 0 && <div className="flex flex-wrap gap-2">{saved.map((s) => (
          <span key={s.name} className="chip on !pr-1"><button type="button" className="flex items-center gap-1.5" onClick={() => apply(s)}><Bookmark />{s.name}</button>
            <button type="button" aria-label={t('common.delete')} className="ibtn sm !size-6" onClick={() => useSettings.getState().set({ savedSearches: saved.filter((x) => x.name !== s.name) })}><X className="!size-3.5" /></button></span>))}</div>}
        <p className="text-on-surface-variant">{t('search.scope', { folder: path ? baseName(path) : '—' })}</p>
        <L label={t('search.name')}><input data-autofocus className="field" value={q} onChange={(e) => setQ(e.target.value)} spellCheck={false} placeholder={regex ? '^IMG_\\d+\\.(jpg|png)$' : t('search.namePh')} /></L>
        <div className="flex items-center justify-between rounded-2xl bg-surface-container-high px-4 py-2.5"><span className="flex items-center gap-2 font-medium"><Regex className="size-5 text-primary" />{t('search.regex')}</span><Switch label={t('search.regex')} checked={regex} onChange={setRegex} /></div>
        <L label={t('search.kind')}><Select ariaLabel={t('search.kind')} value={kind} onChange={setKind} width={220} options={(['all', 'docs', 'images', 'video', 'audio', 'archives', 'code'] as Kind[]).map((k) => ({ value: k, label: t('filter.' + k) }))} /></L>
        <div className="grid gap-3 sm:grid-cols-2">
          <L label={t('search.minSize')}><div className="flex gap-2"><input className="field" type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} /><Select ariaLabel="unit" value={minU} onChange={setMinU} options={UNITS} width={86} /></div></L>
          <L label={t('search.maxSize')}><div className="flex gap-2"><input className="field" type="number" min="0" value={max} onChange={(e) => setMax(e.target.value)} /><Select ariaLabel="unit" value={maxU} onChange={setMaxU} options={UNITS} width={86} /></div></L>
          <L label={t('search.after')}><input className="field" type="date" value={after} onChange={(e) => setAfter(e.target.value)} /></L>
          <L label={t('search.before')}><input className="field" type="date" value={before} onChange={(e) => setBefore(e.target.value)} /></L>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
