// Command registry shared by the command bar, menus, context menus, the palette and the keyboard.
import {
  FilePlus2, FolderOpen, Save, SaveAll, X, FolderSearch, Download, Settings as Cog, Info, Keyboard, Command, Maximize, Palette, Languages,
  Undo2, Redo2, Scissors, Copy, ClipboardPaste, Eraser, Pencil, ArrowDownToLine, ArrowRightToLine, Table2, Rows3, Columns3, Trash2,
  MoveUp, MoveDown, MoveLeft, MoveRight, EyeOff, Eye, ArrowDownAZ, ArrowUpAZ, Search, Replace, CornerDownRight, ListFilter, WandSparkles,
  ChartColumn, LayoutGrid, List, PanelRight, ZoomIn, ZoomOut, ScanSearch, Snowflake, ArrowUpToLine, ListPlus, Columns2 as ColumnsIcon, type Icon,
} from './icons';
import { app, cur, undo, redo, visCols } from './store';
import * as O from './ops';
import * as IO from './io';
import * as A from './actions';
import { t } from './i18n';

const has = () => !!cur();
const hasSel = () => !!cur() && cur()!.sel.ar >= 0;
const hasRows = () => !!cur() && cur()!.rows.length > 0;
const activeCol = () => { const d = cur(); return d && d.sel.ac >= 0 ? visCols(d)[d.sel.fc] : -1; };

export interface Command {
  icon: Icon; key?: string; alt?: string[]; grid?: boolean; danger?: boolean;
  enabled?: () => boolean; checked?: () => boolean; run: () => void;
}

function viewSort(dir: number) {
  const d = cur(), c = activeCol();
  if (!d || c < 0) return;
  A.setSort(c, dir);
}

/** key: shortcut (display + matching). grid: only when focus is not in a text field. */
export const CMD: Record<string, Command> = {
  'file.new': { icon: FilePlus2, key: 'Ctrl+N', run: () => IO.addDoc(IO.blankDoc()) },
  'file.open': { icon: FolderOpen, key: 'Ctrl+O', run: () => IO.openDialogFiles() },
  'file.save': { icon: Save, key: 'Ctrl+S', enabled: has, run: () => IO.saveDoc(cur()) },
  'file.saveAs': { icon: SaveAll, key: 'Ctrl+Shift+S', enabled: has, run: () => IO.saveDoc(cur(), true) },
  'file.close': { icon: X, key: 'Ctrl+W', enabled: has, run: () => A.closeTab(cur()) },
  'file.reveal': { icon: FolderSearch, enabled: () => !!cur()?.path && IO.inTauri, run: () => IO.reveal() },
  'export.csv': { icon: Download, enabled: has, run: () => IO.exportAs('csv') },
  'export.tsv': { icon: Download, enabled: has, run: () => IO.exportAs('tsv') },
  'export.json': { icon: Download, enabled: has, run: () => IO.exportAs('json') },
  'export.xlsx': { icon: Download, enabled: has, run: () => IO.exportAs('xlsx') },
  'export.md': { icon: Download, enabled: has, run: () => IO.exportAs('md') },
  'export.html': { icon: Download, enabled: has, run: () => IO.exportAs('html') },

  'app.settings': { icon: Cog, key: 'Ctrl+,', run: () => A.openSettings() },
  'app.about': { icon: Info, run: () => A.openSettings('about') },
  'app.shortcuts': { icon: Keyboard, key: 'F1', run: () => A.openShortcuts() },
  'app.palette': { icon: Command, key: 'Ctrl+Shift+P', run: () => A.openPalette() },
  'app.fullscreen': { icon: Maximize, key: 'F11', run: () => A.toggleFullscreen() },
  'app.theme': { icon: Palette, run: () => A.cycleTheme() },
  'app.language': { icon: Languages, run: () => A.toggleLang() },
  'tab.next': { icon: X, key: 'Ctrl+Tab', enabled: () => app.docs.length > 1, run: () => A.cycleTab(1) },
  'tab.prev': { icon: X, key: 'Ctrl+Shift+Tab', enabled: () => app.docs.length > 1, run: () => A.cycleTab(-1) },

  'edit.undo': { icon: Undo2, key: 'Ctrl+Z', grid: true, enabled: () => !!cur()?.undo.length, run: () => { undo(); } },
  'edit.redo': { icon: Redo2, key: 'Ctrl+Y', alt: ['Ctrl+Shift+Z'], grid: true, enabled: () => !!cur()?.redo.length, run: () => { redo(); } },
  'edit.cut': { icon: Scissors, key: 'Ctrl+X', grid: true, enabled: hasSel, run: () => A.clipboard('cut') },
  'edit.copy': { icon: Copy, key: 'Ctrl+C', grid: true, enabled: hasSel, run: () => A.clipboard('copy') },
  'edit.copyHeaders': { icon: Copy, key: 'Ctrl+Shift+C', grid: true, enabled: hasSel, run: () => A.clipboard('copyh') },
  'edit.paste': { icon: ClipboardPaste, key: 'Ctrl+V', grid: true, enabled: has, run: () => A.clipboard('paste') },
  'edit.clear': { icon: Eraser, key: 'Delete', enabled: hasSel, run: () => O.clearSelection() },
  'edit.edit': { icon: Pencil, key: 'F2', grid: true, enabled: hasSel, run: () => A.beginEdit() },
  'edit.fillDown': { icon: ArrowDownToLine, key: 'Ctrl+D', grid: true, enabled: hasSel, run: () => O.fill('down') },
  'edit.fillRight': { icon: ArrowRightToLine, key: 'Ctrl+R', grid: true, enabled: hasSel, run: () => O.fill('right') },
  'edit.selectAll': { icon: Table2, key: 'Ctrl+A', grid: true, enabled: hasRows, run: () => A.selectAll() },

  'rows.insertAbove': { icon: ListPlus, enabled: has, run: () => O.insertRows('above') },
  'rows.insertBelow': { icon: ListPlus, key: 'Ctrl+Shift++', enabled: has, run: () => O.insertRows('below') },
  'rows.delete': { icon: Trash2, key: 'Ctrl+Shift+Delete', danger: true, enabled: hasRows, run: () => O.deleteRows() },
  'rows.duplicate': { icon: Copy, key: 'Ctrl+Shift+D', enabled: hasRows, run: () => O.duplicateRows() },
  'rows.moveUp': { icon: MoveUp, key: 'Alt+ArrowUp', grid: true, enabled: hasRows, run: () => O.moveRows(-1) },
  'rows.moveDown': { icon: MoveDown, key: 'Alt+ArrowDown', grid: true, enabled: hasRows, run: () => O.moveRows(1) },

  'cols.insertLeft': { icon: Columns3, enabled: has, run: () => O.insertCols('left') },
  'cols.insertRight': { icon: Columns3, enabled: has, run: () => O.insertCols('right') },
  'cols.delete': { icon: Trash2, danger: true, enabled: hasSel, run: () => O.deleteCols() },
  'cols.rename': { icon: Pencil, key: 'Ctrl+Shift+R', enabled: hasSel, run: () => A.renameCol(activeCol()) },
  'cols.duplicate': { icon: Copy, enabled: hasSel, run: () => O.duplicateCol() },
  'cols.moveLeft': { icon: MoveLeft, key: 'Alt+ArrowLeft', grid: true, enabled: hasSel, run: () => O.moveCols(-1) },
  'cols.moveRight': { icon: MoveRight, key: 'Alt+ArrowRight', grid: true, enabled: hasSel, run: () => O.moveCols(1) },
  'cols.hide': { icon: EyeOff, enabled: hasSel, run: () => A.hideCols() },
  'cols.showAll': { icon: Eye, enabled: () => !!cur()?.hidden.size, run: () => A.showAllCols() },
  'cols.autoFit': { icon: ColumnsIcon, enabled: hasSel, run: () => A.autoFitColumn(cur()!.sel.fc) },

  'data.sortAsc': { icon: ArrowDownAZ, enabled: hasSel, run: () => viewSort(1) },
  'data.sortDesc': { icon: ArrowUpAZ, enabled: hasSel, run: () => viewSort(-1) },
  'data.sortClear': { icon: Eraser, enabled: () => !!cur() && cur()!.sc >= 0, run: () => A.setSort(-1, 1) },
  'data.sortApplyAsc': { icon: ArrowDownAZ, enabled: hasRows, run: () => O.sortData(activeCol(), 1) },
  'data.sortApplyDesc': { icon: ArrowUpAZ, enabled: hasRows, run: () => O.sortData(activeCol(), -1) },
  'data.find': { icon: Search, key: 'Ctrl+F', enabled: has, run: () => A.openFind(false) },
  'data.replace': { icon: Replace, key: 'Ctrl+H', enabled: has, run: () => A.openFind(true) },
  'data.goto': { icon: CornerDownRight, key: 'Ctrl+G', enabled: hasRows, run: () => A.gotoRow() },
  'data.filterRow': { icon: ListFilter, key: 'Ctrl+Shift+L', enabled: has, checked: () => !!cur()?.showFilterRow, run: () => A.toggleFilterRow() },
  'data.advFilter': { icon: ListFilter, enabled: has, checked: () => !!app.advOpen, run: () => A.toggleAdvFilter() },
  'data.clearFilters': { icon: Eraser, enabled: () => { const d = cur(); return !!d && (d.flt.length > 0 || Object.keys(d.cf).length > 0 || d.sc >= 0); }, run: () => A.clearFilters() },
  'data.header': { icon: Table2, enabled: has, checked: () => !!cur()?.hasHeader, run: () => O.toggleHeader() },
  'data.dedupe': { icon: WandSparkles, enabled: hasRows, run: () => O.removeDuplicates() },
  'data.rmEmpty': { icon: WandSparkles, enabled: hasRows, run: () => O.removeEmptyRows() },
  'data.trim': { icon: WandSparkles, enabled: hasRows, run: () => O.transform(t('c.data.trim'), O.T.trim) },
  'data.upper': { icon: WandSparkles, enabled: hasRows, run: () => O.transform(t('c.data.upper'), O.T.upper) },
  'data.lower': { icon: WandSparkles, enabled: hasRows, run: () => O.transform(t('c.data.lower'), O.T.lower) },
  'data.title': { icon: WandSparkles, enabled: hasRows, run: () => O.transform(t('c.data.title'), O.T.title) },
  'data.stats': { icon: ChartColumn, enabled: hasSel, run: () => A.openStats() },

  'view.table': { icon: Table2, enabled: has, checked: () => app.mode === 'table', run: () => A.setMode('table') },
  'view.cards': { icon: LayoutGrid, enabled: has, checked: () => app.mode === 'cards', run: () => A.setMode('cards') },
  'view.list': { icon: List, enabled: has, checked: () => app.mode === 'list', run: () => A.setMode('list') },
  'view.details': { icon: PanelRight, key: 'Ctrl+Shift+I', enabled: has, checked: () => !!app.settings.details, run: () => A.toggleDetails() },
  'view.freeze': { icon: Snowflake, enabled: has, checked: () => !!cur()?.freeze, run: () => A.toggleFreeze() },
  'view.zoomIn': { icon: ZoomIn, key: 'Ctrl+=', alt: ['Ctrl++'], run: () => A.zoom(10) },
  'view.zoomOut': { icon: ZoomOut, key: 'Ctrl+-', run: () => A.zoom(-10) },
  'view.zoomReset': { icon: ScanSearch, key: 'Ctrl+0', run: () => A.zoom(0) },
  'app.scrollTop': { icon: ArrowUpToLine, run: () => A.scrollToTop() },
};

export const label = (id: string) => t('c.' + id);
export const isEnabled = (id: string) => (CMD[id]?.enabled ? !!CMD[id].enabled!() : true);
export const isChecked = (id: string) => !!CMD[id]?.checked?.();
export const keyOf = (id: string) => CMD[id]?.key || '';

export function run(id: string) {
  const c = CMD[id];
  if (!c || (c.enabled && !c.enabled())) return;
  c.run();
}

/* ------------------------------ keyboard ------------------------------ */

function normalizeKey(e: KeyboardEvent) {
  let k = e.key;
  if (k === ' ') k = 'Space';
  if (k.length === 1) k = k.toUpperCase();
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(k);
  return parts.join('+');
}

let map: Map<string, string> | null = null;
function buildMap() {
  map = new Map();
  for (const [id, c] of Object.entries(CMD)) for (const k of [c.key, ...(c.alt || [])]) if (k) map.set(k, id);
}

export function handleKey(e: KeyboardEvent): boolean {
  if (!map) buildMap();
  const id = map!.get(normalizeKey(e));
  if (!id) return false;
  const c = CMD[id];
  const el = e.target as HTMLElement;
  const tag = (el.tagName || '').toLowerCase();
  const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
  if (inField && (c.grid || id === 'edit.clear' || id === 'rows.insertBelow' || id === 'rows.delete')) return false;
  if (id === 'edit.clear' && !el.closest?.('[data-grid]')) return false;
  e.preventDefault();
  run(id);
  return true;
}
