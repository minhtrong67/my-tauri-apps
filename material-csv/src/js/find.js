// Find & replace over the current view.
import { app, cur, visCols, editCells, rebuildView } from './state.js';
import { toast } from './ui.js';
import { t } from './i18n.js';
import { setSel, renderRows } from './grid.js';

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Compiles the query into a global regexp (or null when empty / invalid). */
export function compile() {
  const f = app.find;
  f.error = false; f.re = null;
  if (!f.q) return null;
  try {
    let src = f.regex ? f.q : esc(f.q);
    if (f.whole) src = '^(?:' + src + ')$';
    f.re = new RegExp(src, f.matchCase ? 'g' : 'gi');
  } catch { f.error = true; }
  return f.re;
}

/** Collects matches (view row, visible column), optionally restricted to the selection. */
export function recompute(scopeSel = false) {
  const d = cur(), f = app.find;
  f.matches = []; f.cur = -1;
  if (!d || !compile()) return;
  const cols = visCols(d), re = f.re;
  let r1 = 0, r2 = d.view.length - 1, c1 = 0, c2 = cols.length - 1;
  if (scopeSel && d.sel.ar >= 0) {
    r1 = Math.min(d.sel.ar, d.sel.fr); r2 = Math.max(d.sel.ar, d.sel.fr);
    c1 = Math.min(d.sel.ac, d.sel.fc); c2 = Math.max(d.sel.ac, d.sel.fc);
  }
  for (let vi = r1; vi <= r2; vi++) {
    const row = d.rows[d.view[vi]];
    for (let vc = c1; vc <= c2; vc++) {
      const v = row[cols[vc]];
      if (v) { re.lastIndex = 0; if (re.test(v)) f.matches.push({ vi, vc }); }
    }
    if (f.matches.length > 200000) break;
  }
}

export function goto(i) {
  const f = app.find;
  if (!f.matches.length) return;
  f.cur = (i + f.matches.length) % f.matches.length;
  const m = f.matches[f.cur];
  setSel(m.vi, m.vc, m.vi, m.vc);
  renderRows(true);
}

/** Moves to the next match after the active cell. */
export function step(dir) {
  const d = cur(), f = app.find;
  if (!f.matches.length) return;
  const { ar, ac } = d.sel;
  const key = (vi, vc) => vi * 1e5 + vc;
  const here = key(ar, ac);
  let idx = -1;
  if (dir > 0) idx = f.matches.findIndex(m => key(m.vi, m.vc) > here);
  else for (let i = f.matches.length - 1; i >= 0; i--) if (key(f.matches[i].vi, f.matches[i].vc) < here) { idx = i; break; }
  if (idx < 0) idx = dir > 0 ? 0 : f.matches.length - 1;
  goto(idx);
}

function replaceIn(v) {
  const f = app.find;
  f.re.lastIndex = 0;
  return f.regex ? v.replace(f.re, f.rep) : v.replace(f.re, () => f.rep);
}

export function replaceCurrent() {
  const d = cur(), f = app.find;
  if (!f.re || !f.matches.length) return;
  let m = f.matches[f.cur];
  const sel = d.sel;
  if (!m || m.vi !== sel.ar || m.vc !== sel.ac) { step(1); m = f.matches[f.cur]; if (!m) return; }
  const src = d.view[m.vi], c = visCols(d)[m.vc], o = d.rows[src][c];
  editCells(t('h_replace'), [{ r: src, c, o, n: replaceIn(o) }], d);
  const keep = f.cur;
  recompute();
  if (f.matches.length) goto(Math.min(keep, f.matches.length - 1));
}

export function replaceAll(scopeSel = false) {
  const d = cur(), f = app.find;
  if (!f.re) return;
  recompute(scopeSel);
  const cols = visCols(d), ch = [];
  for (const m of f.matches) {
    const src = d.view[m.vi], c = cols[m.vc], o = d.rows[src][c];
    ch.push({ r: src, c, o, n: replaceIn(o) });
  }
  const n = editCells(t('h_replace'), ch, d);
  recompute();
  toast(n ? t('replacedN', { n }) : t('nothingToDo'), n ? 'ok' : 'info');
}

export function refreshFilter() {
  const d = cur();
  if (!d) return;
  compile();
  rebuildView(d);
}
