// Flyout menus: command bar dropdowns, context menus and status bar pickers.
import { app, cur, visCols } from './state.js';
import { CMD, label, isEnabled, isChecked, keyOf, run } from './commands.js';
import { showMenu } from './ui.js';
import { ENCODINGS } from './io.js';
import { t } from './i18n.js';

const ci = id => {
  const c = CMD[id];
  const checked = c.checked ? isChecked(id) : false;
  return { label: label(id), icon: c.icon, kbd: keyOf(id), disabled: !isEnabled(id), checked: checked || undefined, danger: c.danger, run: () => run(id) };
};
const S = { sep: true };
const H = header => ({ header });
const list = ids => ids.map(x => (x === '-' ? S : ci(x)));

const LAYOUT = {
  export: ['file.saveAs', '-', 'export.csv', 'export.tsv', 'export.json', 'export.xlsx', 'export.md', 'export.html', '-', 'file.reveal'],
  rows: ['rows.insertAbove', 'rows.insertBelow', 'rows.duplicate', '-', 'rows.moveUp', 'rows.moveDown', '-', 'edit.fillDown', 'edit.fillRight', '-', 'rows.delete'],
  cols: ['cols.insertLeft', 'cols.insertRight', 'cols.duplicate', 'cols.rename', '-', 'cols.moveLeft', 'cols.moveRight', '-', 'cols.hide', 'cols.showAll', 'cols.autoFit', '-', 'cols.delete'],
  sort: ['data.sortAsc', 'data.sortDesc', 'data.sortClear', '-', { header: 'sort.apply' }, 'data.sortApplyAsc', 'data.sortApplyDesc'],
  filter: ['data.filterRow', 'data.advFilter', '-', 'data.clearFilters'],
  tools: ['data.header', '-', 'data.trim', 'data.upper', 'data.lower', 'data.title', '-', 'data.dedupe', 'data.rmEmpty', '-', 'data.stats', 'data.goto'],
};

const ctxCell = ['edit.cut', 'edit.copy', 'edit.copyHeaders', 'edit.paste', '-', 'edit.edit', 'edit.clear', '-', 'rows.insertAbove', 'rows.insertBelow', 'rows.duplicate', 'rows.delete', '-', 'data.sortAsc', 'data.sortDesc', '-', 'data.find'];
const ctxRow = ['edit.cut', 'edit.copy', 'edit.paste', '-', 'rows.insertAbove', 'rows.insertBelow', 'rows.duplicate', '-', 'rows.moveUp', 'rows.moveDown', '-', 'edit.clear', 'rows.delete'];
const ctxCol = ['data.sortAsc', 'data.sortDesc', 'data.sortClear', '-', 'cols.insertLeft', 'cols.insertRight', 'cols.rename', 'cols.duplicate', '-', 'cols.moveLeft', 'cols.moveRight', 'cols.hide', 'cols.autoFit', '-', 'data.stats', '-', 'edit.copy', 'edit.paste', '-', 'cols.delete'];

function layout(items) {
  return items.map(x => (typeof x === 'object' ? (x.header ? H(t(x.header)) : x) : list([x])[0]));
}

function colsVisibility() {
  const d = cur();
  const out = d.head.map((h, i) => ({
    label: h || t('colN', { n: i + 1 }), checked: !d.hidden.has(i) || undefined, icon: d.hidden.has(i) ? 'eyeoff' : undefined,
    run: () => {
      if (!d.hidden.has(i) && d.hidden.size >= d.head.length - 1) return;
      d.hidden = new Set(d.hidden);
      d.hidden.has(i) ? d.hidden.delete(i) : d.hidden.add(i);
      app.hooks.viewChanged?.(true);
    },
  }));
  return [H(t('menu.columns')), ...out, S, ci('cols.showAll')];
}

export function openNamedMenu(name, anchor) {
  if (name === 'colsvis') { if (cur()) showMenu(anchor, colsVisibility(), { align: 'right' }); return; }
  const items = layout(LAYOUT[name] || []);
  showMenu(anchor, items, { align: ['export', 'rows', 'cols', 'sort', 'filter', 'tools'].includes(name) ? 'left' : 'right' });
}

export function openContext(e, kind) {
  const ids = kind === 'col' ? ctxCol : kind === 'row' ? ctxRow : ctxCell;
  showMenu({ x: e.clientX, y: e.clientY }, layout(ids));
}

export function openColMenu(anchor) {
  showMenu(anchor, layout(ctxCol), { align: 'left' });
}

/* ------------------------------ status bar pickers ------------------------------ */

export function delimMenu(anchor, current, onPick) {
  const items = [[',', t('delim.comma')], [';', t('delim.semicolon')], ['\t', t('delim.tab')], ['|', t('delim.pipe')]];
  showMenu(anchor, [H(t('status.delim')), ...items.map(([v, l]) => ({ label: l, checked: current === v || undefined, run: () => onPick(v) }))]);
}

export function eolMenu(anchor, current, onPick) {
  showMenu(anchor, [H(t('status.eol')), { label: 'CRLF (Windows)', checked: current === '\r\n' || undefined, run: () => onPick('\r\n') }, { label: 'LF (Unix)', checked: current === '\n' || undefined, run: () => onPick('\n') }]);
}

export function encMenu(anchor, d, onSave, onReopen, onBom) {
  const canBom = d.enc === 'UTF-8' || d.enc.startsWith('UTF-16');
  const items = [H(t('enc.save')), ...ENCODINGS.map(([v, l]) => ({ label: l, checked: d.enc === v || undefined, run: () => onSave(v) }))];
  if (canBom) items.push(S, { label: t('enc.bom'), checked: d.bom || undefined, run: onBom });
  const reopen = !!d.path && !d.dirty;
  items.push(S, H(t('enc.reopen')), ...ENCODINGS.slice(0, 6).map(([v, l]) => ({ label: l, disabled: !reopen, run: () => onReopen(v) })));
  showMenu(anchor, items, { minWidth: 240 });
}
