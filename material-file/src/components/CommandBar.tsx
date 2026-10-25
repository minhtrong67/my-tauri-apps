import { ArrowDownUp, ChevronDown, ClipboardPaste, Copy, FolderInput, FolderOutput, LayoutGrid, MoreHorizontal, Pencil, Plus, Scissors, Trash2, Undo2, Filter as FilterIcon } from 'lucide-react';
import { useExplorer, copyToClipboard, pasteClipboard, renameSelection, deleteSelection, undoLast, copyToOtherPane } from '../store/explorer';
import { useSettings } from '../store/settings';
import { showMenu } from '../store/ui';
import { useT } from '../lib/i18n';
import { isVirtual } from '../lib/paths';
import { CmdButton } from './ui/Buttons';
import { filterMenuItems, moreMenuItems, newMenuItems, sortMenuItems, viewMenuItems } from '../lib/menus';
import { layoutOf } from '../lib/view';

export function CommandBar() {
  const t = useT();
  const id = useExplorer((s) => s.activePane); const path = useExplorer((s) => s.panes[s.activePane].path);
  const nSel = useExplorer((s) => s.panes[s.activePane].selected.size); const clip = useExplorer((s) => s.clip); const undoN = useExplorer((s) => s.undo.length);
  const kind = useExplorer((s) => s.panes[s.activePane].kind);
  const dual = useSettings((s) => s.dualPane); const S = useSettings(); const L = layoutOf(S, path);
  const real = path !== null && !isVirtual(path); const has = nSel > 0;
  const menuAt = (items: ReturnType<typeof sortMenuItems>) => (e: React.MouseEvent<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); showMenu(items, r.left, r.bottom + 4); };
  const chev = <ChevronDown className="!size-3.5 opacity-70" />;
  return (
    <div className="flex-none bg-surface-container px-2.5 pt-2 pb-1.5"><div role="toolbar" aria-label={t('toolbar.aria')} className="toolbar-float flex h-12 items-center gap-0.5 overflow-x-auto px-2 [scrollbar-width:none]">
      <CmdButton icon={Plus} label={t('cmd.new')} disabled={!real} onClick={(e) => menuAt(newMenuItems(id))(e)} extra={chev} className="fab !bg-primary-container !text-on-primary-container [&_svg]:!text-on-primary-container !pr-3" />
      <i className="mx-1.5 h-6 w-px flex-none bg-outline-variant" />
      <CmdButton icon={Scissors} label={t('cmd.cut')} hideLabel kbd="Ctrl+X" disabled={!has} onClick={() => copyToClipboard(id, true)} />
      <CmdButton icon={Copy} label={t('cmd.copy')} hideLabel kbd="Ctrl+C" disabled={!has} onClick={() => copyToClipboard(id, false)} />
      <CmdButton icon={ClipboardPaste} label={t('cmd.paste')} hideLabel kbd="Ctrl+V" disabled={!clip || !real} onClick={() => void pasteClipboard(id)} />
      <CmdButton icon={Pencil} label={t('cmd.rename')} hideLabel kbd="F2" disabled={!has} onClick={() => void renameSelection(id)} />
      <CmdButton icon={Trash2} label={t('cmd.delete')} hideLabel kbd="Del" danger disabled={!has} onClick={() => void deleteSelection(id, false)} />
      <CmdButton icon={Undo2} label={t('cmd.undo')} hideLabel kbd="Ctrl+Z" disabled={!undoN} onClick={() => void undoLast()} />
      {dual && <><i className="mx-1.5 h-6 w-px flex-none bg-outline-variant" />
        <CmdButton icon={FolderInput} label={t('cmd.copyOther')} hideLabel disabled={!has} onClick={() => void copyToOtherPane(id, false)} />
        <CmdButton icon={FolderOutput} label={t('cmd.moveOther')} hideLabel disabled={!has} onClick={() => void copyToOtherPane(id, true)} /></>}
      <span className="flex-1" />
      <CmdButton icon={ArrowDownUp} label={t('cmd.sort')} disabled={!real} onClick={menuAt(sortMenuItems(id))} extra={chev} />
      <CmdButton icon={LayoutGrid} label={t('cmd.view')} onClick={menuAt(viewMenuItems(id))} extra={chev} className={L.view === 'details' ? '' : ''} />
      <CmdButton icon={FilterIcon} label={t('cmd.filter')} disabled={!real} onClick={menuAt(filterMenuItems(id))} extra={chev} className={kind !== 'all' ? '!bg-secondary-container !text-on-secondary-container' : ''} />
      <CmdButton icon={MoreHorizontal} label={t('cmd.more')} hideLabel onClick={menuAt(moreMenuItems(id))} />
    </div></div>
  );
}
