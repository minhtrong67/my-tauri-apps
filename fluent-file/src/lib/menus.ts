import {
  AppWindow, ArrowDownUp, CheckSquare, ClipboardCopy, ClipboardPaste, Columns2, Copy, Eye, FileArchive, FilePlus, Filter, FolderInput, FolderOpen,
  FolderPlus, FolderSearch, Image as ImageIcon, Info, LayoutGrid, List, Maximize, Pencil, Pin, PinOff, Plus, RefreshCw, Scissors, SquareArrowOutUpRight,
  Tag, Terminal, Trash2, Undo2, Code2, FolderOutput, Home, Monitor, History, XCircle
} from './icons';
import { dialog, toast, type MenuItem } from '../store/ui';
import { fmtSize } from './format';
import { Palette as PaletteIcon, Settings, HardDrive, Wrench, Shuffle, ChevronUp, ChevronDown } from './icons';
import type { Drive, Entry, Kind, PaneId, TagId } from './types';
import { getSettings, type ColId } from '../store/settings';
import { t } from './i18n';
import { api, appWindow } from './api';
import { baseName, extOf, HOME, isVirtual, parentOf, samePath, stripExt } from './paths';
import { layoutOf } from './view';
import { isArchive } from './fileTypes';
import { openModal } from '../store/ui';
import { useExplorer, randomRename, activeTab, selectedEntries, selectAll, invertSelection, clearSelection, setLayout, setKind, copyToClipboard, copyPaths, copyText, pasteClipboard, deleteSelection, renameSelection, undoLast, newItem, newTab, navigate, jumpHistory, refresh, openNewWindow, openSelection, openWith, revealItem, showProperties, showDriveProperties, isPinned, togglePin, toggleTag, clearTags, setWallpaper, extractArchive, compressSelection, copyToOtherPane, previewEntry, openRecycle, ensureSecondPane } from '../store/explorer';
import { pk } from './paths';
import { menuOn, runCustomEntry } from './menuCatalog';
import { BUILTIN_STYLES } from './randomRename';
import { moveQuick, quickItems } from './quick';

const ex = () => useExplorer.getState();
export const tagLabel = (id: TagId) => getSettings().tagNames[id]?.trim() || t(TAGS.find((x) => x.id === id)!.key);
export const TAGS: { id: TagId; color: string; key: string }[] = [
  { id: 'star', color: '#FFB900', key: 'tag.star' }, { id: 'red', color: '#D13438', key: 'tag.red' }, { id: 'orange', color: '#F7630C', key: 'tag.orange' },
  { id: 'green', color: '#107C10', key: 'tag.green' }, { id: 'blue', color: '#0078D4', key: 'tag.blue' }, { id: 'purple', color: '#8764B8', key: 'tag.purple' }
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
/** Windows system tools plus a couple of app utilities (More menu, command palette). */
export function systemToolsMenu(): MenuItem[] {
  const tool = (kind: string) => () => { void api.runSystem(kind).catch((e) => toast(String(e), 'error')); };
  return [
    { label: t('sys.control'), icon: Settings, run: tool('control') },
    { label: t('sys.settings'), icon: Settings, run: tool('settings') },
    { label: t('sys.taskmgr'), icon: Monitor, run: tool('taskmgr') },
    { label: t('sys.devmgmt'), icon: HardDrive, run: tool('devmgmt') },
    { label: t('sys.diskmgmt'), icon: HardDrive, run: tool('diskmgmt') },
    { label: t('sys.services'), icon: Wrench, run: tool('services') },
    { label: t('sys.eventvwr'), icon: History, run: tool('eventvwr') },
    { label: t('sys.sysinfo'), icon: Info, run: tool('sysinfo') },
    { label: t('sys.envvars'), icon: Terminal, run: tool('envvars') },
    { label: t('sys.network'), icon: Monitor, run: tool('network') },
    { label: t('sys.programs'), icon: AppWindow, run: tool('programs') },
    { label: t('sys.regedit'), icon: Code2, run: tool('regedit') },
    { sep: true },
    { label: t('sys.cleanTemp'), icon: Trash2, run: () => { void cleanTempFiles(); } },
    { label: t('sys.cleanmgr'), icon: Trash2, run: tool('cleanmgr') },
    { label: t('sys.reload'), icon: RefreshCw, kbd: 'Ctrl+Shift+R', run: () => location.reload() }
  ];
}
export async function cleanTempFiles() {
  const r = await dialog({ kind: 'confirm', title: t('sys.cleanTemp'), message: t('sys.cleanAsk'), icon: Trash2, tone: 'warning', buttons: [{ id: 'cancel', label: t('common.cancel'), tone: 'tonal' }, { id: 'ok', label: t('sys.cleanGo'), tone: 'primary' }] });
  if (r.id !== 'ok') return;
  try { const res = await api.cleanTemp(); toast(t('sys.cleanDone', { size: fmtSize(res.freed, true), n: res.files }), 'success'); } catch (e) { toast(String(e), 'error'); }
}

export function moreMenuItems(id: PaneId): MenuItem[] {
  return [
    { label: t('cmd.newWindow'), icon: Plus, kbd: 'Ctrl+N', run: () => openNewWindow(ex().panes[id].path) },
    { label: t('cmd.palette'), icon: FolderSearch, kbd: 'Ctrl+K', run: () => openModal('palette') },
    { sep: true },
    { label: t('cmd.advSearch'), icon: Filter, kbd: 'Ctrl+Shift+F', run: () => openModal('search') },
    { sep: true },
    { label: t('cmd.selectAll'), icon: CheckSquare, kbd: 'Ctrl+A', run: () => selectAll(id) },
    { label: t('cmd.selectNone'), icon: CheckSquare, run: () => clearSelection(id) },
    { label: t('cmd.invert'), icon: CheckSquare, run: () => invertSelection(id) },
    { sep: true },
    { label: t('view.fullscreen'), icon: Maximize, kbd: 'F11', run: toggleFullscreen }
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
/** Random rename styles: built-in ones, then the user's own, then a shortcut to edit them. */
function randomMenu(id: PaneId): MenuItem[] {
  const own = getSettings().randomStyles;
  return [
    ...BUILTIN_STYLES.map((b): MenuItem => ({ label: t(b.key), icon: Shuffle, run: () => void randomRename(id, b.pattern) })),
    ...(own.length ? [{ sep: true } as MenuItem, ...own.map((o): MenuItem => ({ label: o.label, icon: Shuffle, run: () => void randomRename(id, o.pattern) }))] : []),
    { sep: true }, { label: t('cmd.randomCustomize'), icon: Settings, run: () => openModal('settings') }
  ];
}

/** user-defined entries (Settings > Context menu) that apply to the given kind of target */
function customItems(scope: 'file' | 'folder' | 'bg', paths: string[]): MenuItem[] {
  const list = getSettings().customMenu.filter((c) => c.scope === 'any' ? scope !== 'bg' : c.scope === scope);
  if (!list.length) return [];
  return [{ sep: true }, ...list.map((c): MenuItem => ({ label: c.label, icon: AppWindow, run: () => { void runCustomEntry(c, paths).catch((e) => toast(String(e), 'error')); } }))];
}

/** Context menu of the selection: Windows 11 style quick-action row, then entries that fit files or folders. */
export function itemMenuItems(id: PaneId): MenuItem[] {
  const sel = selectedEntries(id); const one: Entry | null = sel.length === 1 ? sel[0] : null; const T = ex().tools; const p = ex().panes[id];
  const dirs = sel.length > 0 && sel.every((e) => e.isDir); const g = dirs ? 'd' : 'f'; const on = (k: string) => menuOn(`${g}.${k}`);
  const paths = sel.map((e) => e.path);
  const items: MenuItem[] = [{ row: [
    { label: t('cmd.cut') + ' (Ctrl+X)', icon: Scissors, run: () => copyToClipboard(id, true) },
    { label: t('cmd.copy') + ' (Ctrl+C)', icon: Copy, run: () => copyToClipboard(id, false) },
    { label: t('cmd.rename') + ' (F2)', icon: Pencil, run: () => renameSelection(id) },
    { label: t('cmd.delete') + ' (Del)', icon: Trash2, danger: true, run: () => deleteSelection(id, false) }
  ] }, { sep: true }];
  if (on('open')) items.push({ label: t('cmd.open'), icon: FolderOpen, kbd: 'Enter', run: () => openSelection(id) });
  if (one?.isDir) {
    if (on('newTab')) items.push({ label: t('cmd.openNewTab'), icon: Plus, run: () => newTab(id, one.path) });
    if (on('newWindow')) items.push({ label: t('cmd.openNewWindow'), icon: SquareArrowOutUpRight, run: () => openNewWindow(one.path) });
    if (on('terminal')) items.push({ label: t('cmd.openTerminal'), icon: Terminal, run: () => openWith('terminal', one.path) });
    if (on('code') && T.code) items.push({ label: t('cmd.openCode'), icon: Code2, run: () => openWith('code', one.path) });
  }
  if (one && !one.isDir) {
    if (on('openWith')) {
      const w: MenuItem[] = [];
      if (T.code) w.push({ label: 'Visual Studio Code', icon: Code2, run: () => openWith('code', one.path) });
      w.push({ label: t('cmd.openNotepad'), icon: AppWindow, run: () => openWith('notepad', one.path) });
      if (T.winrar && isArchive(one)) w.push({ label: 'WinRAR', icon: FileArchive, run: () => openWith('winrar', one.path) });
      items.push({ label: t('cmd.openWith'), icon: AppWindow, items: w });
    }
    if (on('preview')) items.push({ label: t('cmd.preview'), icon: Eye, kbd: 'Space', run: () => previewEntry(one) });
    if (on('wallpaper') && ['jpg', 'jpeg', 'png', 'bmp'].includes(extOf(one.name))) items.push({ label: t('cmd.setWallpaper'), icon: ImageIcon, run: () => setWallpaper(one.path) });
  }
  if (one && p.search) items.push({ label: t('cmd.openLocation'), icon: FolderOpen, run: () => navigate(id, parentOf(one.path) || '', { select: [one.path] }) });
  if (one && !one.isDir && on('reveal')) items.push({ label: t('cmd.reveal'), icon: Monitor, run: () => revealItem(one.path) });
  if (one && isArchive(one) && on('extract')) items.push({ sep: true }, { label: t('cmd.extractHere'), icon: FileArchive, run: () => extractArchive(id, one, false) }, { label: t('cmd.extractTo', { name: stripExt(one.name) }), icon: FileArchive, run: () => extractArchive(id, one, true) });
  items.push({ sep: true });
  if (one?.isDir && on('pin')) items.push({ label: isPinned(one.path) ? t('cmd.unpin') : t('cmd.pin'), icon: isPinned(one.path) ? PinOff : Pin, run: () => togglePin(one.path) });
  if (dirs && on('customize')) items.push({ label: t('cmd.customizeFolder'), icon: PaletteIcon, run: () => openModal('folderStyle', { paths }) });
  if (p.path && !p.search && on('compress')) {
    const c: MenuItem[] = [{ label: t('cmd.zip'), icon: FileArchive, run: () => compressSelection(id, 'zip') }];
    if (T.winrar) c.push({ label: t('cmd.rar'), icon: FileArchive, run: () => compressSelection(id, 'rar') });
    items.push({ label: t('cmd.compress'), icon: FileArchive, items: c });
  }
  if (on('random')) items.push({ label: t('cmd.randomRename'), icon: Shuffle, items: randomMenu(id) });
  if (on('tag')) items.push({ label: t('tag.title'), icon: Tag, items: tagMenu(paths) });
  if (getSettings().dualPane && on('otherPane')) items.push({ label: t('cmd.copyOther'), icon: FolderInput, run: () => copyToOtherPane(id, false) }, { label: t('cmd.moveOther'), icon: FolderOutput, run: () => copyToOtherPane(id, true) });
  if (on('copyPath')) items.push({ label: t('cmd.copyPath'), icon: ClipboardCopy, kbd: 'Ctrl+Shift+C', run: () => copyPaths(id) });
  items.push(...customItems(dirs ? 'folder' : 'file', paths));
  if (on('properties')) items.push({ sep: true }, { label: t('cmd.properties'), icon: Info, kbd: 'Alt+Enter', run: () => showProperties(id) });
  return tidyMenu(items);
}
export function backgroundMenuItems(id: PaneId): MenuItem[] {
  const p = ex().panes[id]; const path = p.path as string; const on = (k: string) => menuOn('b.' + k); const T = ex().tools;
  if (isVirtual(path)) return [{ label: t('nav.refresh'), icon: RefreshCw, kbd: 'F5', run: () => refresh(id) }];
  const items: MenuItem[] = [];
  if (on('view')) items.push({ label: t('cmd.view'), icon: LayoutGrid, items: viewMenuItems(id, true) });
  if (on('sort')) items.push({ label: t('cmd.sortBy'), icon: ArrowDownUp, items: sortMenuItems(id) });
  if (on('refresh')) items.push({ label: t('nav.refresh'), icon: RefreshCw, kbd: 'F5', run: () => refresh(id) });
  items.push({ sep: true });
  if (on('new')) items.push({ label: t('cmd.new'), icon: Plus, items: newMenuItems(id) });
  if (on('paste')) items.push({ label: t('cmd.paste'), icon: ClipboardPaste, kbd: 'Ctrl+V', disabled: !ex().clip, run: () => pasteClipboard(id) });
  if (on('undo')) items.push({ label: t('cmd.undo'), icon: Undo2, kbd: 'Ctrl+Z', disabled: ex().undo.length === 0, run: undoLast });
  items.push({ sep: true });
  if (on('terminal')) items.push({ label: t('cmd.openTerminal'), icon: Terminal, run: () => openWith('terminal', path) });
  if (on('code') && T.code) items.push({ label: t('cmd.openCode'), icon: Code2, run: () => openWith('code', path) });
  if (on('newTab')) items.push({ label: t('cmd.openNewTab'), icon: Plus, run: () => newTab(id, path) });
  if (on('newWindow')) items.push({ label: t('cmd.openNewWindow'), icon: SquareArrowOutUpRight, run: () => openNewWindow(path) });
  if (on('pin')) items.push({ label: isPinned(path) ? t('cmd.unpin') : t('cmd.pin'), icon: isPinned(path) ? PinOff : Pin, run: () => togglePin(path) });
  if (on('customize') && parentOf(path) !== '') items.push({ label: t('cmd.customizeFolder'), icon: PaletteIcon, run: () => openModal('folderStyle', { paths: [path] }) });
  if (on('copyPath')) items.push({ label: t('cmd.copyPathBtn'), icon: ClipboardCopy, run: () => copyText(path) });
  items.push(...customItems('bg', [path]));
  items.push({ sep: true });
  if (on('selectAll')) items.push({ label: t('cmd.selectAll'), icon: CheckSquare, kbd: 'Ctrl+A', run: () => selectAll(id) });
  if (on('properties')) items.push({ label: t('cmd.properties'), icon: Info, run: () => showProperties(id) });
  return tidyMenu(items);
}
/** drops leading / trailing / doubled separators left behind when entries are switched off */
function tidyMenu(items: MenuItem[]): MenuItem[] {
  const out: MenuItem[] = [];
  for (const it of items) { if (it.sep && (!out.length || out[out.length - 1].sep)) continue; out.push(it); }
  while (out.length && out[out.length - 1].sep) out.pop();
  return out;
}
export function sidebarMenuItems(id: PaneId, path: string, drive?: Drive): MenuItem[] {
  if (!path || path === HOME) return [{ label: t('cmd.open'), icon: path === HOME ? Home : Monitor, run: () => navigate(id, path || '') }];
  const defaultPlace = ex().places.find((p) => p.id !== 'home' && samePath(p.path, path));
  const quickKey = defaultPlace && !getSettings().unpinned.includes(defaultPlace.id) ? 'p:' + defaultPlace.id : isPinned(path) ? 'd:' + pk(path) : null;
  const items: MenuItem[] = [
    { label: t('cmd.open'), icon: FolderOpen, run: () => navigate(id, path) },
    { label: t('cmd.openNewTab'), icon: Plus, run: () => newTab(id, path) },
    { label: t('cmd.openNewWindow'), icon: SquareArrowOutUpRight, run: () => openNewWindow(path) },
    ...toolItems(path), { sep: true },
    defaultPlace
      ? { label: t('cmd.unpin'), icon: PinOff, run: () => getSettings().set({ unpinned: [...getSettings().unpinned, defaultPlace.id] }) }
      : { label: isPinned(path) ? t('cmd.unpin') : t('cmd.pin'), icon: isPinned(path) ? PinOff : Pin, run: () => togglePin(path) },
    { label: t('cmd.copyPathBtn'), icon: ClipboardCopy, run: () => copyText(path) }
  ];
  if (quickKey) {
    const list = quickItems(ex().places, getSettings().pinned, getSettings().unpinned, getSettings().quickOrder); const at = list.findIndex((q) => q.key === quickKey);
    items.push({ sep: true }, { label: t('quick.moveUp'), icon: ChevronUp, disabled: at <= 0, run: () => moveQuick(list, quickKey, at - 1) }, { label: t('quick.moveDown'), icon: ChevronDown, disabled: at < 0 || at >= list.length - 1, run: () => moveQuick(list, quickKey, at + 1) });
  }
  if (!drive && parentOf(path) !== '') items.push({ label: t('cmd.customizeFolder'), icon: PaletteIcon, run: () => openModal('folderStyle', { paths: [path] }) });
  const d = drive || ex().drives.find((x) => samePath(x.path, path));
  if (d) items.push({ sep: true }, { label: t('cmd.properties'), icon: Info, run: () => showDriveProperties(d) });
  return items;
}
export function historyItems(id: PaneId, kind: 'back' | 'fwd'): MenuItem[] {
  const tb = activeTab(ex().panes[id]);
  return (kind === 'back' ? tb.back : tb.fwd).map((p, i) => ({ label: p === HOME || p === '' ? tabTitle(p) : p, icon: History, run: () => jumpHistory(id, kind, i) })).reverse().slice(0, 15);
}
export const recycleItem = (): MenuItem => ({ label: t('place.recycle'), icon: Trash2, run: openRecycle });

