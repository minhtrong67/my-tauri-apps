import { ArrowLeftRight, Check, Copy, History, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { ALL_ITEMS, displayName } from '@/lib/engine';
import type { HistoryEntry } from '@/lib/history';
import { useSettings } from '@/lib/settings';
import { relativeTime } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  onCopy: (e: HistoryEntry) => void;
  onUse: (e: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function HistorySheet({ open, onClose, entries, onCopy, onUse, onRemove, onClear }: Props) {
  const { t, lang } = useSettings();
  return (
    <Modal
      open={open} onClose={onClose} title={t('histTitle')} icon={History} variant="side"
      footer={
        <>
          <Button variant="danger" icon={Trash2} disabled={!entries.length} onClick={onClear}>{t('histClear')}</Button>
          <Button variant="filled" icon={Check} onClick={onClose}>{t('done')}</Button>
        </>
      }
    >
      {entries.length === 0 ? (
        <div className="anim-pop flex flex-col items-center gap-3 px-4 py-16 text-center">
          <span className="grid size-20 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container [animation:float_5s_ease-in-out_infinite]"><History className="size-9" aria-hidden /></span>
          <p className="text-base font-medium">{t('histEmpty')}</p>
          <p className="max-w-64 text-sm text-on-surface-variant">{t('histEmptyHint')}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {entries.map((e, i) => {
            const item = ALL_ITEMS.find((x) => x.id === e.itemId);
            return (
              <li key={e.id} className="anim-row rounded-lg bg-surface-container p-3.5" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-xs font-medium text-on-secondary-container">{item ? displayName(item, lang) : e.itemId}</span>
                  <span className="text-xs text-on-surface-variant">{relativeTime(e.ts, lang, t('justNow'))}</span>
                </div>
                <p className="line-clamp-1 text-xs text-on-surface-variant">{e.input}</p>
                <p className="selectable mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm">{e.output}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="tonal" icon={Copy} onClick={() => onCopy(e)}>{t('copy')}</Button>
                  <Button size="sm" variant="text" icon={ArrowLeftRight} onClick={() => onUse(e)}>{t('lbSwap')}</Button>
                  <IconButton icon={Trash2} size="sm" tone="danger" label={t('delete')} className="ml-auto" onClick={() => onRemove(e.id)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
