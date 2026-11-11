// Find & replace bar, advanced filter bar and the formula bar.
import { useEffect, useRef, useState } from 'react';
import { Search, CaseSensitive, WholeWord, Regex, ChevronUp, ChevronDown, X, Replace, ReplaceAll, ScanLine, Plus, Eraser, ListFilter, Funnel } from '../lib/icons';
import { app, cur, useApp, emit, rebuildView, visCols, editCells, OPS, isUnary } from '../lib/store';
import * as F from '../lib/find';
import { toggleAdvFilter, viewChanged } from '../lib/actions';
import { t } from '../lib/i18n';
import { fmtNum } from '../lib/util';
import { colName } from '../lib/csv';
import { tip, cx, Select } from './ui';

export function closeFind() {
  const f = app.find, d = cur();
  if (!f.open) return;
  const was = f.filterRows && !!f.q;
  f.open = false;
  if (d && was) rebuildView(d);
  app.focusGrid++; emit();
}

export function FindBar() {
  useApp();
  const f = app.find, d = cur();
  const [q, setQ] = useState(f.q);
  const input = useRef<HTMLInputElement>(null);
  const wasFilter = useRef(false);

  useEffect(() => { if (f.open) { input.current?.focus(); input.current?.select(); } }, [app.findFocus]); // eslint-disable-line
  useEffect(() => { const h = setTimeout(() => { if (f.q !== q) { f.q = q; emit(); } }, 90); return () => clearTimeout(h); }, [q]); // eslint-disable-line

  // recompute whenever the query, options, data or active document changes
  useEffect(() => {
    if (!f.open || !d) return;
    F.compile();
    if (f.filterRows || wasFilter.current) rebuildView(d);
    wasFilter.current = f.filterRows && !!f.q;
    const was = f.cur;
    F.recompute();
    if (was >= 0 && f.matches.length) f.cur = Math.min(was, f.matches.length - 1);
    emit();
  }, [f.open, f.q, f.matchCase, f.whole, f.regex, f.filterRows, d?.id, d?.version]); // eslint-disable-line

  if (!f.open || !d) return null;
  const count = f.error ? t('find.invalid') : !f.q ? '' : !f.matches.length ? t('find.none') : f.cur >= 0 ? t('find.of', { i: fmtNum(f.cur + 1), n: fmtNum(f.matches.length) }) : t('find.results', { n: fmtNum(f.matches.length) });
  const bad = f.error || (!!f.q && !f.matches.length);
  const tog = (key: 'matchCase' | 'whole' | 'regex', I: typeof Regex, tipText: string) => (
    <button className={cx('ibtn sm', f[key] && 'on')} aria-pressed={f[key]} onClick={() => { f[key] = !f[key]; emit(); }} {...tip(tipText)}><I size={17} /></button>
  );
  const next = (dir: number) => { if (!f.matches.length) { F.recompute(); } F.step(dir); };
  return (
    <section className="flat flex flex-none flex-col gap-2 border-b border-stroke bg-card-alt px-3 py-2 [animation:rise_.2s_var(--ease)_both]">
      <div className="flex flex-wrap items-center gap-2">
        <label className="field min-w-56 flex-1"><Search size={16} className="text-accent-text" />
          <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder={t('find.ph')} autoComplete="off" spellCheck={false}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); next(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFind(); } }} />
          {tog('matchCase', CaseSensitive, t('find.case'))}{tog('whole', WholeWord, t('find.whole'))}{tog('regex', Regex, t('find.regex'))}
        </label>
        <span className={cx('min-w-20 text-center text-[.8125rem] font-medium tabular-nums', bad ? 'text-danger' : 'text-fg2')} aria-live="polite">{count}</span>
        <button className="ibtn" onClick={() => next(-1)} {...tip(t('find.prev'))}><ChevronUp size={19} /></button>
        <button className="ibtn" onClick={() => next(1)} {...tip(t('find.next'))}><ChevronDown size={19} /></button>
        <button className={cx('btn sm', f.filterRows && 'on')} aria-pressed={f.filterRows} onClick={() => { f.filterRows = !f.filterRows; emit(); }}><ScanLine size={16} />{t('find.filter')}</button>
        <button className="ibtn" onClick={() => app.find.replace ? (f.replace = false, emit()) : (f.replace = true, emit())} {...tip(t('c.data.replace'), 'Ctrl+H')}><Replace size={19} /></button>
        <button className="ibtn" onClick={closeFind} {...tip(t('close'), 'Esc')}><X size={19} /></button>
      </div>
      {f.replace && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="field min-w-56 flex-1"><Replace size={16} className="text-accent-text" />
            <input value={f.rep} onChange={e => { f.rep = e.target.value; emit(); }} placeholder={t('find.replacePh')} autoComplete="off" spellCheck={false}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); F.replaceCurrent(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFind(); } }} /></label>
          <button className="btn sm" onClick={() => F.replaceCurrent()}><Replace size={16} />{t('find.replace')}</button>
          <button className="btn btn-filled sm" onClick={() => F.replaceAll(false)}><ReplaceAll size={16} />{t('find.replaceAll')}</button>
          <button className="btn sm" onClick={() => F.replaceAll(true)}><ScanLine size={16} />{t('find.inSelection')}</button>
        </div>)}
    </section>
  );
}

export function AdvBar() {
  useApp();
  const d = cur();
  if (!app.advOpen || !d) return null;
  const cols = d.head.map((h, i) => ({ value: String(i), label: h || colName(i) }));
  const ops = OPS.map(o => ({ value: o, label: t('op.' + o) }));
  return (
    <section className="flat flex flex-none flex-col gap-2 border-b border-stroke bg-card-alt px-3 py-2 [animation:rise_.2s_var(--ease)_both]">
      {d.flt.map((f, j) => (
        <div key={j} className="flex flex-wrap items-center gap-2">
          <Funnel size={16} className="flex-none text-accent-text" />
          <Select width="12rem" value={String(f.c)} options={cols} onChange={v => { f.c = +v; viewChanged(); }} label={t('menu.columns')} />
          <Select width="11rem" value={f.o} options={ops} onChange={v => { f.o = v; viewChanged(); }} />
          <input className="in !w-52 flex-1" placeholder={t('adv.value')} value={f.v} disabled={isUnary(f.o)} onChange={e => { f.v = e.target.value; viewChanged(); }} />
          <button className="ibtn" onClick={() => { d.flt.splice(j, 1); viewChanged(); }} {...tip(t('remove'))}><X size={18} /></button>
        </div>))}
      <div className="flex items-center gap-2">
        <button className="btn sm" onClick={() => { d.flt.push({ c: Math.max(0, d.sel.ac >= 0 ? visCols(d)[d.sel.ac] : 0), o: 'ct', v: '' }); emit(); }}><Plus size={16} />{t('adv.add')}</button>
        <button className="btn btn-danger-tonal sm" onClick={() => { d.flt = []; viewChanged(); }}><Eraser size={16} />{t('adv.clear')}</button>
        <div className="flex-1" />
        <button className="ibtn" onClick={() => toggleAdvFilter()} {...tip(t('close'))}><X size={18} /></button>
      </div>
    </section>
  );
}
void ListFilter;

export function FormulaBar() {
  useApp();
  const d = cur();
  const ok = !!d && d.sel.ar >= 0;
  const src = ok ? d!.view[d!.sel.ar] : -1, col = ok ? visCols(d!)[d!.sel.ac] : -1;
  const stored = ok ? d!.rows[src]?.[col] ?? '' : '';
  const [v, setV] = useState(stored);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setV(stored); }, [stored, src, col, d?.version]);
  if (!d) return null;
  const commit = () => { if (ok && src != null && col != null && v !== stored) editCells(t('h_edit'), [{ r: src, c: col, o: stored, n: v }], d); };
  return (
    <div className="flex h-9 flex-none items-center gap-2 border-b border-stroke px-2 text-sm">
      <div className="grid h-6 min-w-14 place-items-center rounded bg-accent-sub px-2 text-xs font-semibold text-accent-text" aria-label="Cell">{ok ? colName(col) + (src + 1) : '—'}</div>
      <input value={v} disabled={!ok} placeholder={t('fx.ph')} spellCheck={false} autoComplete="off" className="h-full min-w-0 flex-1 border-0 bg-transparent outline-0 placeholder:text-fg3 disabled:opacity-60"
        onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; commit(); }} onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); (document.querySelector('[data-grid]') as HTMLElement | null)?.focus(); } else if (e.key === 'Escape') { e.preventDefault(); setV(stored); (document.querySelector('[data-grid]') as HTMLElement | null)?.focus(); } }} />
    </div>
  );
}
