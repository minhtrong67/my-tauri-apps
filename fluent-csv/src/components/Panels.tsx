// Shortcuts, command palette and column statistics dialogs.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Command as CommandIcon, ChartColumn, X, Search, CornerDownLeft } from '../lib/icons';
import { cur, visCols } from '../lib/store';
import { CMD, label, keyOf, isEnabled, run } from '../lib/commands';
import { profileColumn } from '../lib/ops';
import { fmtNum } from '../lib/util';
import { t } from '../lib/i18n';
import { SheetHeader, ScrollTopFab, useScrolled, tip, cx } from './ui';

/* ------------------------------ shortcuts ------------------------------ */

const GROUPS: [string, string[]][] = [
  ['sc.file', ['file.new', 'file.open', 'file.save', 'file.saveAs', 'file.close', 'tab.next', 'tab.prev']],
  ['sc.edit', ['edit.undo', 'edit.redo', 'edit.cut', 'edit.copy', 'edit.paste', 'edit.clear', 'edit.edit', 'edit.fillDown', 'edit.fillRight', 'edit.selectAll']],
  ['sc.structure', ['rows.insertBelow', 'rows.delete', 'rows.duplicate', 'rows.moveUp', 'rows.moveDown', 'cols.moveLeft', 'cols.moveRight', 'cols.rename']],
  ['sc.data', ['data.find', 'data.replace', 'data.goto', 'data.filterRow']],
  ['sc.app', ['app.palette', 'app.settings', 'app.fullscreen', 'app.shortcuts', 'view.zoomIn', 'view.zoomOut', 'view.zoomReset', 'view.details']],
];
const NAV: [string, string][] = [['Arrows', 'sc.move'], ['Shift + Arrows', 'sc.extend'], ['Ctrl + Arrows', 'sc.jump'], ['Enter / Tab', 'sc.confirm'], ['Esc', 'sc.cancel'], ['Alt + Enter', 'sc.newline'], ['Ctrl + Space / Shift + Space', 'sc.selcol']];

function Keys({ k }: { k: string }) {
  const parts = k.endsWith('++') ? [...k.slice(0, -2).split('+'), '+'] : k.split('+');
  return <span className="flex flex-none items-center gap-1">{parts.map((x, i) => <kbd key={i}>{x}</kbd>)}</span>;
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const [scrolled, onScroll] = useScrolled(200);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SheetHeader icon={Keyboard} title={t('app.shortcuts')} onClose={onClose} />
      <div data-scroll-main className="-mr-2 grid max-h-[62vh] flex-1 gap-x-8 gap-y-1 overflow-y-auto pr-2 sm:grid-cols-2" onScroll={onScroll}>
        {GROUPS.map(([g, ids]) => (
          <section key={g} className="mb-3 min-w-0"><h4 className="mb-1 mt-2 text-sm font-semibold">{t(g)}</h4>
            {ids.map(id => <div key={id} className="flex items-center justify-between gap-3 border-b border-stroke py-1.5 text-[.8125rem]"><span className="truncate">{label(id)}</span><Keys k={keyOf(id)} /></div>)}</section>
        ))}
        <section className="mb-3"><h4 className="mb-1 mt-2 text-sm font-semibold">{t('sc.nav')}</h4>
          {NAV.map(([k, l]) => <div key={l} className="flex items-center justify-between gap-3 border-b border-stroke py-1.5 text-[.8125rem]"><span>{t(l)}</span><span className="flex gap-1">{k.split(' + ').map(x => <kbd key={x}>{x}</kbd>)}</span></div>)}</section>
      </div>
      <ScrollTopFab show={scrolled} />
      <div className="dfoot mt-4"><button className="btn btn-filled" data-autofocus onClick={onClose}><X size={18} />{t('close')}</button></div>
    </div>
  );
}

/* ------------------------------ command palette ------------------------------ */

export function PaletteDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const all = useMemo(() => Object.keys(CMD).filter(id => !['tab.next', 'tab.prev', 'app.palette', 'app.scrollTop'].includes(id)).map(id => ({ id, text: label(id) })), []);
  const items = useMemo(() => { const v = q.trim().toLowerCase(); return all.filter(x => x.text.toLowerCase().includes(v) || x.id.toLowerCase().includes(v)); }, [q, all]);
  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => { list.current?.querySelector('[data-on="true"]')?.scrollIntoView({ block: 'nearest' }); }, [idx]);
  const go = (i: number) => { const x = items[i]; if (!x || !isEnabled(x.id)) return; onClose(); setTimeout(() => run(x.id), 180); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(idx); }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="m-3 mb-1 flex h-10 items-center gap-3 rounded bg-fill px-3 shadow-[inset_0_0_0_1px_var(--f-stroke),inset_0_-1px_0_var(--f-stroke-strong)] focus-within:shadow-[inset_0_0_0_1px_var(--f-stroke),inset_0_-2px_0_var(--f-accent)]">
        <Search size={18} className="text-accent-text" />
        <input data-autofocus autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={key} placeholder={t('palette.ph')} spellCheck={false} autoComplete="off" className="h-full min-w-0 flex-1 border-0 bg-transparent text-base outline-0" />
        <kbd>Esc</kbd>
      </div>
      <div ref={list} className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
        {items.length ? items.map((x, i) => { const I = CMD[x.id].icon; const en = isEnabled(x.id); return (
          <button key={x.id} role="option" aria-selected={i === idx} data-on={i === idx} disabled={!en} className={cx('mi !h-10', i === idx && 'bg-[var(--f-sel)]')} onMouseMove={() => setIdx(i)} onClick={() => go(i)}>
            <span className="mic"><I size={18} /></span><span className="ml">{x.text}</span>{keyOf(x.id) && <kbd>{keyOf(x.id)}</kbd>}
          </button>); }) : <p className="m-0 p-6 text-center text-fg2">{t('palette.none')}</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-stroke px-5 py-2 text-xs text-fg2"><CornerDownLeft size={13} />{t('palette.hint')}<CommandIcon size={13} className="ml-auto" /></div>
    </div>
  );
}

/* ------------------------------ column statistics ------------------------------ */

export function StatsDialog({ onClose }: { onClose: () => void }) {
  const d = cur()!;
  const c = visCols(d)[d.sel.fc], p = useMemo(() => profileColumn(d, c), [d, c]);
  const stat = (l: string, v: string) => <div className="rounded-lg border border-stroke bg-card-d p-3"><small className="block text-xs text-fg2">{l}</small><b className="block truncate text-lg font-semibold tabular-nums">{v}</b></div>;
  const maxTop = p.top[0]?.[1] || 1;
  return (
    <>
      <SheetHeader icon={ChartColumn} title={`${t('stats.title')}: ${p.name}`} onClose={onClose} />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat(t('stats.rows'), fmtNum(p.n))}{stat(t('stats.filled'), fmtNum(p.filled))}{stat(t('stats.empty'), fmtNum(p.empty))}{stat(t('stats.unique'), fmtNum(p.unique))}
        {p.nums ? <>{stat(t('min'), fmtNum(p.min))}{stat(t('max'), fmtNum(p.max))}{stat(t('avg'), fmtNum(p.avg))}{stat(t('sum'), fmtNum(p.sum))}</> : <>{stat(t('stats.minLen'), fmtNum(p.minLen))}{stat(t('stats.maxLen'), fmtNum(p.maxLen))}</>}
      </div>
      <h4 className="mb-2 mt-0 text-sm font-semibold">{t('stats.top')}</h4>
      <div className="mb-5 flex max-h-60 flex-col gap-1.5 overflow-y-auto">
        {p.top.map(([v, n]) => (
          <div key={v} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-[.8125rem]">
            <span className="truncate" {...tip(v)}>{v}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-fill-alt"><i className="block h-full rounded-full bg-accent [transition:width_.25s_var(--ease)]" style={{ width: Math.max(3, (n / maxTop) * 100) + '%' }} /></span>
            <span className="tabular-nums text-fg2">{fmtNum(n)}</span>
          </div>))}
        {!p.top.length && <p className="m-0 text-fg2">{t('details.empty')}</p>}
      </div>
      <div className="dfoot"><button className="btn btn-filled" data-autofocus onClick={onClose}><X size={18} />{t('close')}</button></div>
    </>
  );
}
