import { useEffect, useState } from 'react';
import { Check, FileImage, FolderCog, FolderOpen, Info, X } from 'lucide-react';
import { Modal } from './Modal';
import { Btn } from './Btn';
import { useToast } from './Toast';
import { useSettings } from '../lib/store';
import { applyFolderIcon, baseName, isTauri, pickFolder, pickIco, type PickedFile } from '../lib/tauri';

/** Side sheet that applies an .ico (the one being edited, or a chosen file) to a folder. */
export function ApplySheet({ open, onClose, getIco, onApplied }: {
  open: boolean; onClose: () => void; getIco?: () => Promise<Uint8Array | null>; onApplied: (folder: string) => void;
}) {
  const { t } = useSettings();
  const toast = useToast();
  const [folder, setFolder] = useState<string | null>(null);
  const [ico, setIco] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setFolder(null); setIco(null); setBusy(false); } }, [open]);

  const chooseFolder = async () => {
    if (!isTauri) return toast.info(t('toast.desktopOnly'), t('toast.desktopOnlyMsg'));
    const p = await pickFolder();
    if (p) setFolder(p);
  };
  const chooseIco = async () => {
    const f = await pickIco();
    if (!f) return;
    if (f.bytes.length < 6 || f.bytes[0] !== 0 || f.bytes[1] !== 0 || f.bytes[2] !== 1 || f.bytes[3] !== 0) return toast.error(t('toast.badIco'));
    setIco(f);
  };

  const ready = !!folder && (getIco || ico);
  const apply = async () => {
    if (!folder) return;
    setBusy(true);
    try {
      const bytes = getIco ? await getIco() : ico?.bytes;
      if (!bytes) return;
      await applyFolderIcon(folder, bytes);
      onApplied(folder);
      toast.success(t('toast.applied'), t('toast.appliedMsg'));
      onClose();
    } catch (e) {
      if ((e as Error).message === 'desktop-only') toast.info(t('toast.desktopOnly'), t('toast.desktopOnlyMsg'));
      else toast.error(t('toast.applyFail'), String(e));
    } finally { setBusy(false); }
  };

  const Pick = ({ label, value, icon: Icon, onClick, btn }: { label: string; value: string | null; icon: typeof FolderOpen; onClick: () => void; btn: string }) => (
    <div className="rounded-3xl bg-sc-highest/60 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container"><Icon size={22} /></span>
        <p className={`min-w-0 flex-1 break-all text-sm leading-snug ${value ? 'text-on-surface' : 'text-on-surface-variant'}`}>{value ?? t('sheet.none')}</p>
      </div>
      <Btn className="mt-3" variant="tonal" size="sm" icon={Icon} label={value ? t('common.change') : btn} onClick={onClick} />
    </div>
  );

  return (
    <Modal
      open={open} onClose={onClose} variant="sheet" title={t('sheet.title')} icon={FolderCog}
      actions={<>
        <Btn variant="tonal" icon={X} label={t('common.cancel')} onClick={onClose} />
        <Btn variant="filled" icon={Check} label={t('common.apply')} disabled={!ready} loading={busy} onClick={apply} />
      </>}
    >
      <div className="space-y-3">
        <Pick label={t('sheet.folder')} value={folder} icon={FolderOpen} onClick={chooseFolder} btn={t('sheet.chooseFolder')} />
        {getIco
          ? <p className="flex items-center gap-2 rounded-2xl bg-secondary-container/60 px-4 py-3 text-on-secondary-container"><FileImage size={18} />{t('sheet.fromEditor')}</p>
          : <Pick label={t('sheet.icoFile')} value={ico ? baseName(ico.name) : null} icon={FileImage} onClick={chooseIco} btn={t('sheet.chooseIco')} />}
        <p className="flex gap-2.5 rounded-2xl bg-tertiary-container/60 p-4 text-[13px] leading-relaxed text-on-tertiary-container">
          <Info size={18} className="mt-0.5 shrink-0" />{t('sheet.note')}
        </p>
      </div>
    </Modal>
  );
}
