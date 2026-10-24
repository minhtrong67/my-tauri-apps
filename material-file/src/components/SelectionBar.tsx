import { ClipboardCopy, Copy, Pencil, Scissors, Trash2, X } from 'lucide-react';
import { useExplorer, clearSelection, copyToClipboard, copyPaths, deleteSelection, renameSelection } from '../store/explorer';
import { useT } from '../lib/i18n';
import { IconButton } from './ui/Buttons';

/** Floating action bar that springs in when several items are selected. */
export function SelectionBar() {
  const t = useT();
  const id = useExplorer((s) => s.activePane); const n = useExplorer((s) => s.panes[s.activePane].selected.size);
  if (n < 2) return null;
  return (
    <div key="bar" className="pointer-events-auto absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full bg-inverse-surface py-1.5 pr-2 pl-4 text-inverse-on-surface shadow-[var(--shadow-3)] animate-[toast-in_.5s_var(--spring)]">
      <span className="mr-2 font-semibold whitespace-nowrap">{t('status.selected', { n })}</span>
      {[
        { icon: Scissors, label: t('cmd.cut'), run: () => copyToClipboard(id, true) }, { icon: Copy, label: t('cmd.copy'), run: () => copyToClipboard(id, false) },
        { icon: ClipboardCopy, label: t('cmd.copyPath'), run: () => copyPaths(id) }, { icon: Pencil, label: t('cmd.rename'), run: () => void renameSelection(id) }, { icon: Trash2, label: t('cmd.delete'), run: () => void deleteSelection(id, false) }
      ].map((b) => <IconButton key={b.label} icon={b.icon} label={b.label} side="top" onClick={b.run} className="!text-inverse-on-surface hover:!bg-inverse-on-surface/15" />)}
      <IconButton icon={X} label={t('common.clear')} side="top" onClick={() => clearSelection(id)} className="!text-inverse-on-surface hover:!bg-inverse-on-surface/15" />
    </div>
  );
}
