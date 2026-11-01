import { cur, visCols } from './store';
import { rect, selectionStats } from './ops';
import { colName } from './csv';
import { t } from './i18n';
import { fmtNum } from './util';

export function describeSel() {
  const d = cur(), r = rect(d);
  if (!d || !r) return '';
  const rows = r.r2 - r.r1 + 1, cols = r.c2 - r.c1 + 1;
  if (rows === 1 && cols === 1) return '';
  const st = selectionStats(d);
  let s = t('selCells', { n: fmtNum(rows * cols) });
  if (st && st.nums > 1) s += ` · ${t('sum')} ${fmtNum(st.sum)} · ${t('avg')} ${fmtNum(st.sum / st.nums)} · ${t('min')} ${fmtNum(st.min)} · ${t('max')} ${fmtNum(st.max)}`;
  return s;
}
export const cellRef = () => { const d = cur(); return d && d.sel.ar >= 0 ? colName(visCols(d)[d.sel.ac] ?? 0) + (d.view[d.sel.ar] + 1) : ''; };
