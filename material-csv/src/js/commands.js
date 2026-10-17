// Command registry shared by the command bar, menus, context menus, the palette and the keyboard.
import { app, cur, undo, redo, visCols } from './state.js';
import * as O from './ops.js';
import * as IO from './io.js';
import { selectAll, startEdit, autoFitColumn } from './grid.js';
import { t } from './i18n.js';

const has = () => !!cur();
const hasSel = () => !!cur() && cur().sel.ar >= 0;
const hasRows = () => !!cur() && cur().rows.length > 0;
const H = (name, ...a) => app.hooks[name]?.(...a);
const activeCol = () => { const d = cur(); return d && d.sel.ac >= 0 ? visCols(d)[d.sel.fc] : -1; };

function viewSort(dir) {
  const d = cur(), c = activeCol();
  if (c < 0) return;
  d.sc = c; d.sd = dir;
  H('viewChanged');
}

/** key: shortcut (display + matching). grid: only when focus is not in a text field. */
export const CMD = {
  'file.new': { icon: 'new', key: 'Ctrl+N', run: () => IO.addDoc(IO.blankDoc()) },
  'file.open': { icon: 'open', key: 'Ctrl+O', run: () => IO.openDialogFiles() },
  'file.save': { icon: 'save', key: 'Ctrl+S', enabled: has, run: () => IO.saveDoc(cur()) },
  'file.saveAs': { icon: 'saveas', key: 'Ctrl+Shift+S', enabled: has, run: () => IO.saveDoc(cur(), true) },
  'file.close': { icon: 'x', key: 'Ctrl+W', enabled: has, run: () => H('closeTab', cur()) },
  'file.reveal': { icon: 'folder', enabled: () => !!cur()?.path && IO.inTauri, run: () => IO.reveal() },
  'export.csv': { icon: 'export', enabled: has, run: () => IO.exportAs('csv') },
  'export.tsv': { icon: 'export', enabled: has, run: () => IO.exportAs('tsv') },
  'export.json': { icon: 'export', enabled: has, run: () => IO.exportAs('json') },
  'export.xlsx': { icon: 'export', enabled: has, run: () => IO.exportAs('xlsx') },
  'export.md': { icon: 'export', enabled: has, run: () => IO.exportAs('md') },
  'export.html': { icon: 'export', enabled: has, run: () => IO.exportAs('html') },

  'app.settings': { icon: 'gear', key: 'Ctrl+,', run: () => H('openSettings') },
  'app.about': { icon: 'info', run: () => H('openSettings', 'about') },
  'app.shortcuts': { icon: 'keyboard', key: 'F1', run: () => H('openShortcuts') },
  'app.palette': { icon: 'command', key: 'Ctrl+Shift+P', run: () => H('openPalette') },
  'app.fullscreen': { icon: 'fullscreen', key: 'F11', run: () => H('toggleFullscreen') },
  'app.theme': { icon: 'palette', run: () => H('cycleTheme') },
  'app.language': { icon: 'globe', run: () => H('toggleLang') },
  'tab.next': { key: 'Ctrl+Tab', enabled: () => app.docs.length > 1, run: () => H('cycleTab', 1) },
  'tab.prev': { key: 'Ctrl+Shift+Tab', enabled: () => app.docs.length > 1, run: () => H('cycleTab', -1) },

  'edit.undo': { icon: 'undo', key: 'Ctrl+Z', grid: true, enabled: () => !!cur()?.undo.length, run: () => undo() },
  'edit.redo': { icon: 'redo', key: 'Ctrl+Y', alt: ['Ctrl+Shift+Z'], grid: true, enabled: () => !!cur()?.redo.length, run: () => redo() },
  'edit.cut': { icon: 'cut', key: 'Ctrl+X', grid: true, enabled: hasSel, run: () => H('clipboard', 'cut') },
  'edit.copy': { icon: 'copy', key: 'Ctrl+C', grid: true, enabled: hasSel, run: () => H('clipboard', 'copy') },
  'edit.copyHeaders': { icon: 'copy', key: 'Ctrl+Shift+C', grid: true, enabled: hasSel, run: () => H('clipboard', 'copyh') },
  'edit.paste': { icon: 'paste', key: 'Ctrl+V', grid: true, enabled: has, run: () => H('clipboard', 'paste') },
  'edit.clear': { icon: 'clear', key: 'Delete', enabled: hasSel, run: () => O.clearSelection() },
  'edit.edit': { icon: 'new', key: 'F2', grid: true, enabled: hasSel, run: () => startEdit() },
  'edit.fillDown': { icon: 'filldown', key: 'Ctrl+D', grid: true, enabled: hasSel, run: () => O.fill('down') },
  'edit.fillRight': { icon: 'fillright', key: 'Ctrl+R', grid: true, enabled: hasSel, run: () => O.fill('right') },
  'edit.selectAll': { icon: 'table', key: 'Ctrl+A', grid: true, enabled: hasRows, run: () => selectAll() },

  'rows.insertAbove': { icon: 'rowadd', enabled: has, run: () => O.insertRows('above') },
  'rows.insertBelow': { icon: 'rowadd', key: 'Ctrl+Shift++', enabled: has, run: () => O.insertRows('below') },
  'rows.delete': { icon: 'trash', key: 'Ctrl+Shift+Delete', danger: true, enabled: hasRows, run: () => O.deleteRows() },
  'rows.duplicate': { icon: 'copy', key: 'Ctrl+Shift+D', enabled: hasRows, run: () => O.duplicateRows() },
  'rows.moveUp': { icon: 'moveup', key: 'Alt+ArrowUp', grid: true, enabled: hasRows, run: () => O.moveRows(-1) },
  'rows.moveDown': { icon: 'movedown', key: 'Alt+ArrowDown', grid: true, enabled: hasRows, run: () => O.moveRows(1) },

  'cols.insertLeft': { icon: 'coladd', enabled: has, run: () => O.insertCols('left') },
  'cols.insertRight': { icon: 'coladd', enabled: has, run: () => O.insertCols('right') },
  'cols.delete': { icon: 'trash', danger: true, enabled: hasSel, run: () => O.deleteCols() },
  'cols.rename': { icon: 'new', key: 'Ctrl+Shift+R', enabled: hasSel, run: () => H('renameCol', activeCol()) },
  'cols.duplicate': { icon: 'copy', enabled: hasSel, run: () => O.duplicateCol() },
  'cols.moveLeft': { icon: 'moveleft', key: 'Alt+ArrowLeft', grid: true, enabled: hasSel, run: () => O.moveCols(-1) },
  'cols.moveRight': { icon: 'moveright', key: 'Alt+ArrowRight', grid: true, enabled: hasSel, run: () => O.moveCols(1) },
  'cols.hide': { icon: 'eyeoff', enabled: hasSel, run: () => H('hideCols') },
  'cols.showAll': { icon: 'eye', enabled: () => !!cur()?.hidden.size, run: () => { cur().hidden = new Set(); H('viewChanged', true); } },
  'cols.autoFit': { icon: 'cols', enabled: hasSel, run: () => autoFitColumn(cur().sel.fc) },

  'data.sortAsc': { icon: 'sortasc', enabled: hasSel, run: () => viewSort(1) },
  'data.sortDesc': { icon: 'sortdesc', enabled: hasSel, run: () => viewSort(-1) },
  'data.sortClear': { icon: 'clear', enabled: () => !!cur() && cur().sc >= 0, run: () => { cur().sc = -1; H('viewChanged'); } },
  'data.sortApplyAsc': { icon: 'sortasc', enabled: hasRows, run: () => O.sortData(activeCol(), 1) },
  'data.sortApplyDesc': { icon: 'sortdesc', enabled: hasRows, run: () => O.sortData(activeCol(), -1) },
  'data.find': { icon: 'search', key: 'Ctrl+F', enabled: has, run: () => H('openFind', false) },
  'data.replace': { icon: 'replace', key: 'Ctrl+H', enabled: has, run: () => H('openFind', true) },
  'data.goto': { icon: 'goto', key: 'Ctrl+G', enabled: hasRows, run: () => H('gotoRow') },
  'data.filterRow': { icon: 'filter', key: 'Ctrl+Shift+L', enabled: has, checked: () => !!cur()?.showFilterRow, run: () => H('toggleFilterRow') },
  'data.advFilter': { icon: 'filter', enabled: has, checked: () => !!app.advOpen, run: () => H('toggleAdvFilter') },
  'data.clearFilters': { icon: 'clear', enabled: () => !!cur() && (cur().flt.length || Object.keys(cur().cf).length || cur().sc >= 0), run: () => H('clearFilters') },
  'data.header': { icon: 'table', enabled: has, checked: () => !!cur()?.hasHeader, run: () => O.toggleHeader() },
  'data.dedupe': { icon: 'tools', enabled: hasRows, run: () => O.removeDuplicates() },
  'data.rmEmpty': { icon: 'tools', enabled: hasRows, run: () => O.removeEmptyRows() },
  'data.trim': { icon: 'tools', enabled: hasRows, run: () => O.transform(t('c.data.trim'), O.T.trim) },
  'data.upper': { icon: 'tools', enabled: hasRows, run: () => O.transform(t('c.data.upper'), O.T.upper) },
  'data.lower': { icon: 'tools', enabled: hasRows, run: () => O.transform(t('c.data.lower'), O.T.lower) },
  'data.title': { icon: 'tools', enabled: hasRows, run: () => O.transform(t('c.data.title'), O.T.title) },
  'data.stats': { icon: 'stats', enabled: hasSel, run: () => H('openStats') },

  'view.table': { icon: 'table', enabled: has, checked: () => app.mode === 'table', run: () => H('setMode', 'table') },
  'view.cards': { icon: 'grid', enabled: has, checked: () => app.mode === 'cards', run: () => H('setMode', 'cards') },
  'view.list': { icon: 'list', enabled: has, checked: () => app.mode === 'list', run: () => H('setMode', 'list') },
  'view.details': { icon: 'panel', key: 'Ctrl+Shift+I', enabled: has, checked: () => !!app.settings.details, run: () => H('toggleDetails') },
  'view.zoomIn': { icon: 'plus', key: 'Ctrl+=', alt: ['Ctrl++'], run: () => H('zoom', 10) },
  'view.zoomOut': { icon: 'minus', key: 'Ctrl+-', run: () => H('zoom', -10) },
  'view.zoomReset': { icon: 'search', key: 'Ctrl+0', run: () => H('zoom', 0) },
};

export const label = id => t('c.' + id);
export const isEnabled = id => (CMD[id].enabled ? !!CMD[id].enabled() : true);
export const isChecked = id => !!CMD[id].checked?.();
export const keyOf = id => CMD[id].key || '';

export function run(id) {
  const c = CMD[id];
  if (!c || (c.enabled && !c.enabled())) return;
  c.run();
}
app.hooks.run = run;

/* ------------------------------ keyboard ------------------------------ */

function normalize(e) {
  let k = e.key;
  if (k === ' ') k = 'Space';
  if (k.length === 1) k = k.toUpperCase();
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(k);
  return parts.join('+');
}

let map = null;
function buildMap() {
  map = new Map();
  for (const [id, c] of Object.entries(CMD)) {
    for (const k of [c.key, ...(c.alt || [])]) if (k) map.set(k, id);
  }
}

export function handleKey(e) {
  if (!map) buildMap();
  const k = normalize(e);
  const id = map.get(k);
  if (!id) return false;
  const c = CMD[id];
  const tag = (e.target.tagName || '').toLowerCase();
  const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
  if (inField && (c.grid || id === 'edit.clear' || id === 'rows.insertBelow' || id === 'rows.delete')) return false;
  if (id === 'edit.clear' && !e.target.closest?.('#scroller')) return false;
  e.preventDefault();
  run(id);
  return true;
}
