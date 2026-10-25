import {
  AppWindow, ArrowDownUp, CheckSquare, ClipboardCopy, ClipboardPaste, Columns2, Copy, CopyPlus, Eye, FileArchive, FilePlus, Filter, FolderInput, FolderOpen,
  FolderPlus, FolderSearch, Image as ImageIcon, Info, LayoutGrid, List, Maximize, Pencil, Pin, PinOff, Plus, RefreshCw, Scissors, Settings as SettingsIcon, SquareArrowOutUpRight,
  Tag, Terminal, Trash2, Undo2, Code2, FolderOutput, HardDrive, Home, Monitor, History, XCircle
} from 'lucide-react';
import type { MenuItem } from '../store/ui';
import type { Drive, Entry, Kind, PaneId, TagId } from './types';
import { getSettings, type ColId } from '../store/settings';
import { t } from './i18n';
import { appWindow } from './api';
import { baseName, extOf, HOME, isVirtual, parentOf, samePath, stripExt } from './paths';
import { layoutOf } from './view';
import { isArchive } from './fileTypes';
import { openModal } from '../store/ui';
import { useExplorer, activeTab, selectedEntries, selectAll, invertSelection, clearSelection, setLayout, setKind, copyToClipboard, copyPaths, copyText, pasteClipboard, deleteSelection, renameSelection, undoLast, newItem, newTab, navigate, jumpHistory, refresh, openNewWindow, openSelection, openWith, revealItem, showProperties, showDriveProperties, isPinned, togglePin, toggleTag, clearTags, setWallpaper, extractArchive, compressSelection, copyToOtherPane, previewEntry, openRecycle, ensureSecondPane } from '../store/explorer';
import { pk } from './paths';

const ex = () => useExplorer.getState();
export const tagLabel = (id: TagId) => getSettings().tagNames[id]?.trim() || t(TAGS.find((x) => x.id === id)!.key);
export const TAGS: { id: TagId; color: string; key: string }[] = [
  { id: 'star', color: '#FFB300', key: 'tag.star' }, { id: 'red', color: '#E53935', key: 'tag.red' }, { id: 'orange', color: '#FB8C00', key: 'tag.orange' },
  { id: 'green', color: '#43A047', key: 'tag.green' }, { id: 'blue', color: '#1E88E5', key: 'tag.blue' }, { id: 'purple', color: '#8E24AA', key: 'tag.purple' }
];
const flag = (k: 'showNav' | 'showDetails' | 'showChecks' | 'showExt' | 'showHidden', v: boolean) => getSettings().set({ [k]: v });
const layout = (id: PaneId) => layoutOf(getSettings(), ex().panes[id].path);
const tabTitle = (p: string | null) => (p === HOME ? t('place.home') : p === null || p === '' ? t('place.thispc') : baseName(p));
export const toggleFullscreen = async () => { if (!appWindow) return; try { await appWindow.setFullscreen(!(await appWindow.isFullscreen())); } catch { /* ignore */ } };

export function newMenuItems(id: PaneId): MenuItem[] {
  return [
    { label: t('new.folder'), icon: FolderPlus, kbd: 'Ctrl+Shift+N', run: () => newItem(id, 'folder') },
    { label: t('new.text'), icon: FilePlus, run: () => newItem(id, 'text') },
    { sep: true },
    { label: t('new.markdown'), icon: FilePlus, run: () => newItem(id, 'markdown') },
    { label: t('new.json'), icon: FilePlus, run: () => newItem(id, 'json') },
    { label: t('new.html'), icon: FilePlus, run: () => newItem(id, 'html') },
    { label: t('new.csv'), icon: FilePlus, run: () => newItem(id, 'csv') }
  ];
}
export function groupMenuItems(id: PaneId): MenuItem[] {
  const L = layout(id);
  return (['none', 'name', 'type', 'modified', 'size'] as const).map((g) => ({ label: t('group.' + g), check: L.groupBy === g, run: () => setLayout(ex().panes[id].path, { groupBy: g }) }));
}
export function sortMenuItems(id: PaneId): MenuItem[] {
  const L = layout(id); const p = ex().panes[id].path;
  return [
    ...(['name', 'modified', 'created', 'type', 'size'] as const).map((k) => ({ label: t('sort.' + k), check: L.sortKey === k, run: () => setLayout(p, { sortKey: k }) })),
    { sep: true },
    { label: t('sort.asc'), check: L.sortDir === 'asc', run: () => setLayout(p, { sortDir: 'asc' as const }) },
    { label: t('sort.desc'), check: L.sortDir === 'desc', run: () => setLayout(p, { sortDir: 'desc' as const }) },
    { sep: true },
    { label: t('cmd.groupBy'), icon: List, items: groupMenuItems(id) }
  ];
}
export const COL_ORDER: ColId[] = ['modified', 'created', 'type', 'size'];
export function columnMenuItems(): MenuItem[] {
  const s = getSettings();
  return COL_ORDER.map((c) => ({ label: t('col.' + c), check: s.cols.includes(c), run: () => s.set({ cols: s.cols.includes(c) ? s.cols.filter((x) => x !== c) : [...s.cols, c] }) }));
}
export function filterMenuItems(id: PaneId): MenuItem[] {
  const cur = ex().panes[id].kind;
  const base = (['all', 'folders', 'docs', 'images', 'video', 'audio', 'archives', 'code', 'tagged'] as Kind[]).map((k) => ({ label: t('filter.' + k), check: cur === k, run: () => setKind(id, k) }));
  const tags = TAGS.map((tg) => ({ label: tagLabel(tg.id), swatch: tg.color, check: cur === `tag-${tg.id}`, run: () => setKind(id, `tag-${tg.id}` as Kind) }));
  return [...base, { sep: true } as MenuItem, ...tags];
}
export function viewMenuItems(id: PaneId, withShow = true): MenuItem[] {
  const L = layout(id); const p = ex().panes[id].path; const s = getSettings();
  const items: MenuItem[] = [
    { label: t('view.details'), icon: List, check: L.view === 'details', kbd: 'Ctrl+1', run: () => setLayout(p, { view: 'details' }) },
    { label: t('view.large'), icon: LayoutGrid, check: L.view === 'large', run: () => setLayout(p, { view: 'large' }) },
    { label: t('view.medium'), icon: LayoutGrid, check: L.view === 'grid', kbd: 'Ctrl+2', run: () => setLayout(p, { view: 'grid' }) },
    { label: t('view.small'), icon: LayoutGrid, check: L.view === 'small', run: () => setLayout(p, { view: 'small' }) }
  ];
  if (withShow) items.push({ sep: true }, { label: t('cmd.columns'), icon: Columns2, items: columnMenuItems() },
    { label: t('cmd.show'), icon: Eye, items: [
      { label: t('view.nav'), check: s.showNav, run: () => flag('showNav', !s.showNav) },
      { label: t('view.detailsPane'), check: s.showDetails, kbd: 'Alt+P', run: () => flag('showDetails', !s.showDetails) },
      { label: t('view.checks'), check: s.showChecks, run: () => flag('showChecks', !s.showChecks) },
      { label: t('view.ext'), check: s.showExt, run: () => flag('showExt', !s.showExt) },
      { label: t('view.hidden'), check: s.showHidden, run: () => flag('showHidden', !s.showHidden) },
      { label: t('view.dual'), check: s.dualPane, kbd: 'F9', run: () => toggleDual() }
    ] });
  return items;
}
export async function toggleDual() {
  const s = getSettings(); const on = !s.dualPane;
  s.set({ dualPane: on });
  if (on) { await ensureSecondPane(); } else useExplorer.setState({ activePane: 'a' });
}
export function moreMenuItems(id: PaneId): MenuItem[] {
  return [
    { label: t('cmd.newWindow'), icon: Plus, kbd: 'Ctrl+N', run: () => openNewWindow(ex().panes[id].path) },
    { label: t('cmd.palette'), icon: FolderSearch, kbd: 'Ctrl+K', run: () => openModal('palette') },
    { sep: true },
    { label: t('cmd.dupes'), icon: CopyPlus, run: () => openModal('dupes') },
    { label: t('cmd.usage'), icon: HardDrive, run: () => openModal('usage') },
    { label: t('cmd.advSearch'), icon: Filter, kbd: 'Ctrl+Shift+F', run: () => openModal('search') },
    { sep: true },
    { label: t('cmd.selectAll'), icon: CheckSquare, kbd: 'Ctrl+A', run: () => selectAll(id) },
    { label: t('cmd.selectNone'), icon: CheckSquare, run: () => clearSelection(id) },
    { label: t('cmd.invert'), icon: CheckSquare, run: () => invertSelection(id) },
    { sep: true },
    { label: t('view.fullscreen'), icon: Maximize, kbd: 'F11', run: toggleFullscreen },
    { label: t('toolbar.settings'), icon: SettingsIcon, kbd: 'Ctrl+,', run: () => openModal('settings') }
  ];
}
function tagMenu(paths: string[]): MenuItem[] {
  const tags = getSettings().tags;
  return [
    ...TAGS.map((tg) => ({ label: tagLabel(tg.id), swatch: tg.color, check: paths.length > 0 && paths.every((p) => (tags[pk(p)] || []).includes(tg.id)), run: () => toggleTag(paths, tg.id) })),
    { sep: true },
    { label: t('tag.clear'), icon: XCircle, disabled: !paths.some((p) => (tags[pk(p)] || []).length), run: () => clearTags(paths) }
  ];
}
function toolItems(path: string): MenuItem[] {
  const T = ex().tools; const items: MenuItem[] = [];
  items.push({ label: t('cmd.openTerminal'), icon: Terminal, run: () => openWith('terminal', path) });
  if (T.code) items.push({ label: t('cmd.openCode'), icon: Code2, run: () => openWith('code', path) });
  return items;
}
export function itemMenuItems(id: PaneId): MenuItem[] {
  const sel = selectedEntries(id); const one: Entry | null = sel.length === 1 ? sel[0] : null; const T = ex().tools; const p = ex().panes[id];
  const items: MenuItem[] = [{ label: t('cmd.open'), icon: FolderOpen, kbd: 'Enter', run: () => openSelection(id) }];
  if (one && !one.isDir) items.push({ label: t('cmd.preview'), icon: Eye, kbd: 'Space', run: () => previewEntry(one) });
  if (one?.isDir) items.push({ label: t('cmd.openNewTab'), icon: Plus, run: () => newTab(id, one.path) }, { label: t('cmd.openNewWindow'), icon: SquareArrowOutUpRight, run: () => openNewWindow(one.path) }, ...toolItems(one.path));
  if (one && !one.isDir) {
    const w: MenuItem[] = [];
    if (T.code) w.push({ label: 'Visual Studio Code', icon: Code2, run: () => openWith('code', one.path) });
    w.push({ label: t('cmd.openNotepad'), icon: AppWindow, run: () => openWith('notepad', one.path) });
    if (T.winrar && isArchive(one)) w.push({ label: 'WinRAR', icon: FileArchive, run: () => openWith('winrar', one.path) });
    items.push({ label: t('cmd.openWith'), icon: AppWindow, items: w });
    if (['jpg', 'jpeg', 'png', 'bmp'].includes(extOf(one.name))) items.push({ label: t('cmd.setWallpaper'), icon: ImageIcon, run: () => setWallpaper(one.path) });
  }
  if (one && p.search) items.push({ label: t('cmd.openLocation'), icon: FolderOpen, run: () => navigate(id, parentOf(one.path) || '', { select: [one.path] }) });
  if (one) items.push({ label: t('cmd.reveal'), icon: Monitor, run: () => revealItem(one.path) });
  if (one && isArchive(one)) items.push({ sep: true }, { label: t('cmd.extractHere'), icon: FileArchive, run: () => extractArchive(id, one, false) }, { label: t('cmd.extractTo', { name: stripExt(one.name) }), icon: FileArchive, run: () => extractArchive(id, one, true) });
  if (p.path && !p.search) {
    const c: MenuItem[] = [{ label: t('cmd.zip'), icon: FileArchive, run: () => compressSelection(id, 'zip') }];
    if (T.winrar) c.push({ label: t('cmd.rar'), icon: FileArchive, run: () => compressSelection(id, 'rar') });
    items.push({ label: t('cmd.compress'), icon: FileArchive, items: c });
  }
  if (one?.isDir) items.push({ label: isPinned(one.path) ? t('cmd.unpin') : t('cmd.pin'), icon: isPinned(one.path) ? PinOff : Pin, run: () => togglePin(one.path) });
  items.push({ label: t('tag.title'), icon: Tag, items: tagMenu(sel.map((e) => e.path)) });
  if (getSettings().dualPane) items.push({ label: t('cmd.copyOther'), icon: FolderInput, run: () => copyToOtherPane(id, false) }, { label: t('cmd.moveOther'), icon: FolderOutput, run: () => copyToOtherPane(id, true) });
  items.push({ sep: true },
    { label: t('cmd.cut'), icon: Scissors, kbd: 'Ctrl+X', run: () => copyToClipboard(id, true) },
    { label: t('cmd.copy'), icon: Copy, kbd: 'Ctrl+C', run: () => copyToClipboard(id, false) },
    { label: t('cmd.copyPath'), icon: ClipboardCopy, kbd: 'Ctrl+Shift+C', run: () => copyPaths(id) },
    { sep: true },
    { label: t('cmd.rename'), icon: Pencil, kbd: 'F2', run: () => renameSelection(id) },
    { label: t('cmd.delete'), icon: Trash2, kbd: 'Del', danger: true, run: () => deleteSelection(id, false) },
    { sep: true },
    { label: t('cmd.properties'), icon: Info, kbd: 'Alt+Enter', run: () => showProperties(id) });
  return items;
}
export function backgroundMenuItems(id: PaneId): MenuItem[] {
  const p = ex().panes[id]; const path = p.path as string;
  if (isVirtual(path)) return [{ label: t('nav.refresh'), icon: RefreshCw, kbd: 'F5', run: () => refresh(id) }];
  return [
    { label: t('cmd.view'), icon: LayoutGrid, items: viewMenuItems(id, true) },
    { label: t('cmd.sortBy'), icon: ArrowDownUp, items: sortMenuItems(id) },
    { label: t('nav.refresh'), icon: RefreshCw, kbd: 'F5', run: () => refresh(id) },
    { sep: true },
    { label: t('cmd.new'), icon: Plus, items: newMenuItems(id) },
    { sep: true },
    { label: t('cmd.paste'), icon: ClipboardPaste, kbd: 'Ctrl+V', disabled: !ex().clip, run: () => pasteClipboard(id) },
    { label: t('cmd.undo'), icon: Undo2, kbd: 'Ctrl+Z', disabled: ex().undo.length === 0, run: undoLast },
    { sep: true },
    ...toolItems(path),
    { label: t('cmd.openNewTab'), icon: Plus, run: () => newTab(id, path) },
    { label: t('cmd.openNewWindow'), icon: SquareArrowOutUpRight, run: () => openNewWindow(path) },
    { label: isPinned(path) ? t('cmd.unpin') : t('cmd.pin'), icon: isPinned(path) ? PinOff : Pin, run: () => togglePin(path) },
    { label: t('cmd.copyPathBtn'), icon: ClipboardCopy, run: () => copyText(path) },
    { sep: true },
    { label: t('cmd.selectAll'), icon: CheckSquare, kbd: 'Ctrl+A', run: () => selectAll(id) },
    { label: t('cmd.properties'), icon: Info, run: () => showProperties(id) }
  ];
}
export function sidebarMenuItems(id: PaneId, path: string, drive?: Drive): MenuItem[] {
  if (!path || path === HOME) return [{ label: t('cmd.open'), icon: path === HOME ? Home : Monitor, run: () => navigate(id, path || '') }];
  const items: MenuItem[] = [
    { label: t('cmd.open'), icon: FolderOpen, run: () => navigate(id, path) },
    { label: t('cmd.openNewTab'), icon: Plus, run: () => newTab(id, path) },
    { label: t('cmd.openNewWindow'), icon: SquareArrowOutUpRight, run: () => openNewWindow(path) },
    ...toolItems(path), { sep: true },
    { label: isPinned(path) ? t('cmd.unpin') : t('cmd.pin'), icon: isPinned(path) ? PinOff : Pin, run: () => togglePin(path) },
    { label: t('cmd.copyPathBtn'), icon: ClipboardCopy, run: () => copyText(path) }
  ];
  const d = drive || ex().drives.find((x) => samePath(x.path, path));
  if (d) items.push({ sep: true }, { label: t('cmd.properties'), icon: Info, run: () => showDriveProperties(d) });
  return items;
}
export function historyItems(id: PaneId, kind: 'back' | 'fwd'): MenuItem[] {
  const tb = activeTab(ex().panes[id]);
  return (kind === 'back' ? tb.back : tb.fwd).map((p, i) => ({ label: p === HOME || p === '' ? tabTitle(p) : p, icon: History, run: () => jumpHistory(id, kind, i) })).reverse().slice(0, 15);
}
export const recycleItem = (): MenuItem => ({ label: t('place.recycle'), icon: Trash2, run: openRecycle });

