import { useState } from 'react';
import { FileUp, Folder, FolderCog, FolderOpen, FolderX, Trash2, Undo2 } from 'lucide-react';
import { Btn, IconBtn } from '../components/Btn';
import { Card, PageHeader } from '../components/Controls';
import { ConfirmDialog } from '../components/Modal';
import { ApplySheet } from '../components/ApplySheet';
import { useToast } from '../components/Toast';
import { useSettings } from '../lib/store';
import { baseName, folderExists, isTauri, removeFolderIcon, revealFolder } from '../lib/tauri';
import type { FolderEntry } from '../lib/folders';

export default function Folders({ list, onAdd, onRemove }: { list: FolderEntry[]; onAdd: (p: string) => void; onRemove: (p: string) => void }) {
  const { t, s } = useSettings();
  const toast = useToast();
  const [sheet, setSheet] = useState(false);
  const [target, setTarget] = useState<FolderEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const fmt = (ts: number) => new Date(ts).toLocaleDateString(s.lang === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium' });

  const reveal = async (p: string) => {
    try {
      if (!(await folderExists(p))) return toast.warning(t('folders.missing'), p);
      await revealFolder(p);
    } catch { toast.info(t('toast.desktopOnly'), t('toast.desktopOnlyMsg')); }
  };
  const restore = async () => {
    if (!target) return;
    setBusy(true);
    try {
      if (isTauri) await removeFolderIcon(target.path);
      onRemove(target.path);
      toast.success(t('toast.restored'));
      setTarget(null);
    } catch (e) {
      toast.error(t('toast.restoreFail'), String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6 max-sm:p-4">
      <PageHeader title={t('folders.title')} subtitle={t('folders.subtitle')}>
        <Btn icon={FileUp} label={t('folders.add')} onClick={() => setSheet(true)} />
      </PageHeader>

      {list.length === 0 ? (
        <Card className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden text-center">
          <span className="anim-blob absolute -right-10 -top-14 size-56 bg-tertiary-container/70" />
          <span className="anim-blob absolute -bottom-16 -left-10 size-60 bg-primary-container/70 [animation-delay:-3s]" />
          <div className="relative flex flex-col items-center">
            <span className="anim-blob anim-float mb-5 flex size-24 items-center justify-center bg-secondary-container text-on-secondary-container"><FolderCog size={40} /></span>
            <h2 className="text-xl font-bold">{t('folders.emptyTitle')}</h2>
            <p className="mt-1.5 max-w-sm text-on-surface-variant">{t('folders.emptySub')}</p>
            <Btn className="mt-6" size="lg" icon={FileUp} label={t('folders.add')} onClick={() => setSheet(true)} />
          </div>
        </Card>
      ) : (
        <ul className="stagger space-y-3">
          {list.map((f) => (
            <li key={f.path} className="flex items-center gap-4 rounded-[28px] bg-card p-4 pr-3 shadow-[0_1px_2px_rgb(0_0_0/.06)] transition-[transform,box-shadow] duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container"><Folder size={26} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{baseName(f.path)}</p>
                <p className="truncate text-[13px] text-on-surface-variant" title={f.path}>{f.path}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant/80">{t('folders.appliedOn', { date: fmt(f.appliedAt) })}</p>
              </div>
              <IconBtn icon={FolderOpen} tip={t('folders.reveal')} tone="tonal" onClick={() => reveal(f.path)} />
              <IconBtn icon={Undo2} tip={t('folders.restore')} tone="error" onClick={() => setTarget(f)} />
            </li>
          ))}
        </ul>
      )}

      <ApplySheet open={sheet} onClose={() => setSheet(false)} onApplied={onAdd} />
      <ConfirmDialog
        open={!!target} onClose={() => setTarget(null)} onConfirm={restore} busy={busy} variant="error" icon={FolderX}
        title={t('folders.restoreTitle')} message={t('folders.restoreMsg', { name: target ? baseName(target.path) : '' })}
        confirmLabel={t('folders.restoreBtn')} confirmIcon={Trash2}
      />
    </div>
  );
}
