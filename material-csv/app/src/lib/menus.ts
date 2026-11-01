// Flyout menus: command bar dropdowns, context menus and status bar pickers.
import { EyeOff, Eye } from 'lucide-react';
import { cur } from './store';
import { CMD, label, isEnabled, isChecked, keyOf, run } from './commands';
import { showMenu, type MenuItem } from './overlay';
import { toggleColVisible } from './actions';
import { ENCODINGS } from './io';
import { t } from './i18n';

const ci = (id: string): MenuItem => {
  const c = CMD[id];
  return { label: label(id), icon: c.icon, kbd: keyOf(id), disabled: !isEnabled(id), checked: c.checked ? isChecked(id) || undefined : undefined, danger: c.danger, run: () => run(id) } as MenuItem;
};
const SEP: MenuItem = { sep: true };
const layout = (ids: (string | { header: string })[]): MenuItem[] => ids.map(x => (typeof x === 'object' ? { header: t(x.header) } : x === '-' ? SEP : ci(x)));

const LAYOUT: Record<string, (string | { header: string })[]> = {
  export: ['file.saveAs', '-', 'export.csv', 'export.tsv', 'export.json', 'export.xlsx', 'export.md', 'export.html', '-', 'file.reveal'],
  rows: ['rows.insertAbove', 'rows.insertBelow', 'rows.duplicate', '-', 'rows.moveUp', 'rows.moveDown', '-', 'edit.fillDown', 'edit.fillRight', '-', 'rows.delete'],
  cols: ['cols.insertLeft', 'cols.insertRight', 'cols.duplicate', 'cols.rename', '-', 'cols.moveLeft', 'cols.moveRight', '-', 'cols.hide', 'cols.showAll', 'cols.autoFit', 'view.freeze', '-', 'cols.delete'],
  sort: ['data.sortAsc', 'data.sortDesc', 'data.sortClear', '-', { header: 'sort.apply' }, 'data.sortApplyAsc', 'data.sortApplyDesc'],
  filter: ['data.filterRow', 'data.advFilter', '-', 'data.clearFilters'],
  tools: ['data.header', '-', 'data.trim', 'data.upper', 'data.lower', 'data.title', '-', 'data.dedupe', 'data.rmEmpty', '-', 'data.stats', 'data.goto'],
};
const ctxCell = ['edit.cut', 'edit.copy', 'edit.copyHeaders', 'edit.paste', '-', 'edit.edit', 'edit.clear', '-', 'rows.insertAbove', 'rows.insertBelow', 'rows.duplicate', 'rows.delete', '-', 'data.sortAsc', 'data.sortDesc', '-', 'data.find'];
const ctxRow = ['edit.cut', 'edit.copy', 'edit.paste', '-', 'rows.insertAbove', 'rows.insertBelow', 'rows.duplicate', '-', 'rows.moveUp', 'rows.moveDown', '-', 'edit.clear', 'rows.delete'];
const ctxCol = ['data.sortAsc', 'data.sortDesc', 'data.sortClear', '-', 'cols.insertLeft', 'cols.insertRight', 'cols.rename', 'cols.duplicate', '-', 'cols.moveLeft', 'cols.moveRight', 'cols.hide', 'cols.autoFit', 'view.freeze', '-', 'data.stats', '-', 'edit.copy', 'edit.paste', '-', 'cols.delete'];

export function openNamedMenu(name: string, anchor: HTMLElement) {
  if (name === 'colsvis') {
    const d = cur(); if (!d) return;
    const items: MenuItem[] = [{ header: t('menu.columns') }, ...d.head.map((h, i) => ({ label: h || t('colN', { n: i + 1 }), checked: !d.hidden.has(i) || undefined, icon: d.hidden.has(i) ? EyeOff : undefined, run: () => toggleColVisible(i) } as MenuItem)), SEP, ci('cols.showAll')];
    showMenu(anchor, items, { align: 'right', minWidth: 220 });
    return;
  }
  showMenu(anchor, layout(LAYOUT[name] || []), { align: 'left' });
}
export function openContext(e: { clientX: number; clientY: number }, kind: 'cell' | 'row' | 'col') {
  showMenu({ x: e.clientX, y: e.clientY }, layout(kind === 'col' ? ctxCol : kind === 'row' ? ctxRow : ctxCell));
}
export function openColMenu(anchor: HTMLElement) { showMenu(anchor, layout(ctxCol), { align: 'left' }); }

export function delimMenu(anchor: HTMLElement, current: string, onPick: (v: string) => void) {
  const items: [string, string][] = [[',', t('delim.comma')], [';', t('delim.semicolon')], ['\t', t('delim.tab')], ['|', t('delim.pipe')]];
  showMenu(anchor, [{ header: t('status.delim') }, ...items.map(([v, l]) => ({ label: l, checked: current === v || undefined, run: () => onPick(v) }))]);
}
export function eolMenu(anchor: HTMLElement, current: string, onPick: (v: string) => void) {
  showMenu(anchor, [{ header: t('status.eol') }, { label: 'CRLF (Windows)', checked: current === '\r\n' || undefined, run: () => onPick('\r\n') }, { label: 'LF (Unix)', checked: current === '\n' || undefined, run: () => onPick('\n') }]);
}
export function encMenu(anchor: HTMLElement, d: { enc: string; bom: boolean; path: string | null; dirty: boolean }, onSave: (v: string) => void, onReopen: (v: string) => void, onBom: () => void) {
  const canBom = d.enc === 'UTF-8' || d.enc.startsWith('UTF-16');
  const items: MenuItem[] = [{ header: t('enc.save') }, ...ENCODINGS.map(([v, l]) => ({ label: l, checked: d.enc === v || undefined, run: () => onSave(v) }))];
  if (canBom) items.push(SEP, { label: t('enc.bom'), checked: d.bom || undefined, run: onBom });
  const reopen = !!d.path && !d.dirty;
  items.push(SEP, { header: t('enc.reopen') }, ...ENCODINGS.slice(0, 6).map(([v, l]) => ({ label: l, disabled: !reopen, run: () => onReopen(v) })));
  showMenu(anchor, items, { minWidth: 250 });
}
void Eye;
