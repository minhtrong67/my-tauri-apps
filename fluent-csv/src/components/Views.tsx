// Row details pane, cards / list views, status bar and the welcome screen.
import { useMemo, useState, useRef } from 'react';
import { X, FolderOpen, FilePlus2, Sparkles, Minus, Plus, FileText, Heart, Code2, Command, Search, Table2, PanelRight } from '../lib/icons';
import { app, cur, useApp, editCells, setSel, visCols, rebuildView, emit, saveSettings, newDoc } from '../lib/store';
import * as IO from '../lib/io';
import { run, keyOf } from '../lib/commands';
import { delimMenu, eolMenu, encMenu } from '../lib/menus';
import { describeSel } from '../lib/selection';
import { toast } from '../lib/overlay';
import { t } from '../lib/i18n';
import { baseName, fmtNum, fmtSize } from '../lib/util';
import { Logo } from './Logo';
import { tip, cx, ScrollTopFab, useScrolled } from './ui';

/* ------------------------------ details ------------------------------ */

export function Details() {
  useApp();
  const d = cur();
  if (!d || !app.settings.details || app.mode !== 'table') return null;
  const src = d.sel.ar >= 0 ? d.view[d.sel.ar] : -1;
  const row = src >= 0 ? d.rows[src] : null;
  const commit = (c: number, v: string) => { if (row && v !== (row[c] ?? '')) editCells(t('h_edit'), [{ r: src, c, o: row[c] ?? '', n: v }], d); };
  return (
    <aside className="flex w-72 flex-none flex-col border-l border-stroke bg-layer [animation:rise_.2s_var(--ease)_both] max-lg:hidden" aria-label={t('details.title')}>
      <div className="flex items-center gap-2 px-4 pb-1 pt-3"><PanelRight size={18} className="text-accent-text" /><h3 className="m-0 flex-1 text-sm font-semibold">{t('details.title')}</h3>
        <button className="ibtn sm" onClick={() => run('view.details')} {...tip(t('close'))}><X size={16} /></button></div>
      <div data-scroll-main className="flex-1 overflow-y-auto px-4 pb-4">
        {!row ? <p className="mt-3 text-sm text-fg2">{t('details.empty')}</p> : (
          <>
            <div className="mb-2 mt-2 text-sm text-fg2">{t('row')} <b className="text-accent-text">{src + 1}</b></div>
            {d.head.map((h, c) => {
              const v = row[c] ?? '', long = v.length > 48 || v.includes('\n');
              const key = `${d.id}:${src}:${c}:${d.version}`;
              return (
                <label key={key} className="mb-2.5 block"><small className="mb-1 ml-1 block text-xs text-fg2">{h}</small>
                  {long ? <textarea className="in" rows={Math.min(6, Math.max(2, v.split('\n').length))} defaultValue={v} spellCheck={false} onBlur={e => commit(c, e.target.value)} />
                    : <input className="in" defaultValue={v} spellCheck={false} autoComplete="off" onBlur={e => commit(c, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = v; e.currentTarget.blur(); } }} />}
                </label>);
            })}
          </>)}
      </div>
    </aside>
  );
}

/* ------------------------------ cards / list ------------------------------ */

const CHUNK = 60;
export function Cards() {
  useApp();
  const d = cur()!;
  const [shown, setShown] = useState(CHUNK);
  const [scrolled, onS] = useScrolled(300);
  const cols = visCols(d);
  const n = Math.min(d.view.length, Math.max(shown, CHUNK));
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    onS(e);
    const el = e.currentTarget;
    if (n < d.view.length && el.scrollTop + el.clientHeight > el.scrollHeight - 500) setShown(n + CHUNK);
  };
  return (
    <div className="relative min-h-0 flex-1">
      <div data-scroll-main className="h-full overflow-y-auto" onScroll={onScroll}>
        <div className={cx('cardgrid', app.mode === 'list' && 'list')}>
          {Array.from({ length: n }, (_, vi) => {
            const src = d.view[vi], row = d.rows[src];
            const title = row[cols[0]] ?? '';
            return (
              <article key={src} className={cx('dcard', vi === d.sel.ar && 'sel')} style={{ animationDelay: Math.min(vi, 14) * 25 + 'ms' }} onClick={() => setSel(vi, 0, vi, Math.max(0, cols.length - 1))}>
                <header className="mb-1 flex items-center justify-between gap-2"><b className="truncate text-sm font-semibold">{title || '—'}</b><span className="chip !h-6">#{src + 1}</span></header>
                {cols.slice(1).map(c => <div key={c} className="f"><small>{d.head[c]}</small><span>{row[c] || '—'}</span></div>)}
              </article>);
          })}
        </div>
        {!d.view.length && <div className="p-10 text-center text-fg2">{t('noMatch')}</div>}
      </div>
      <ScrollTopFab show={scrolled} />
    </div>
  );
}

/* ------------------------------ status bar ------------------------------ */

export function StatusBar() {
  useApp();
  const d = cur();
  const sb = 'sbtn flex-none whitespace-nowrap rounded px-2 h-6 text-xs text-fg2 transition-colors hover:bg-hover hover:text-fg';
  return (
    <footer className="flat flex h-8 flex-none items-center gap-1 overflow-x-auto border-t border-stroke px-3 text-xs text-fg2 hide-scroll">
      {d && <>
        <span className="flex-none">{fmtNum(d.view.length)}{d.view.length !== d.rows.length ? ' / ' + fmtNum(d.rows.length) : ''} {t('rows')} · {fmtNum(visCols(d).length)}{d.hidden.size ? ' / ' + d.head.length : ''} {t('cols')}{d.size ? ' · ' + fmtSize(d.size) : ''}</span>
        <span className="ml-2 min-w-0 flex-shrink truncate text-accent-text">{describeSel()}</span>
      </>}
      <div className="flex-1" />
      {d && <>
        <button className={sb} {...tip(t('status.delim'))} onClick={e => delimMenu(e.currentTarget, d.delim, v => {
          if (!d.dirty && d.raw != null) { d.delim = v; IO.parseInto(d, d.raw); d.undo = []; d.redo = []; d.cleanId = 0; d.sc = -1; d.flt = []; d.cf = {}; d.hidden = new Set(); d.version++; rebuildView(d); emit(); }
          else { d.delim = v; emit(); }
        })}>{t({ ',': 'delim.comma', ';': 'delim.semicolon', '\t': 'delim.tab', '|': 'delim.pipe' }[d.delim] || 'delim.comma')}</button>
        <button className={sb} {...tip(t('status.enc'))} onClick={e => encMenu(e.currentTarget, d,
          v => { d.enc = v; d.bom = v.startsWith('UTF-16'); emit(); },
          async v => { await IO.reopenWithEncoding(v); },
          () => { d.bom = !d.bom; emit(); })}>{d.enc + (d.bom ? ' BOM' : '')}</button>
        <button className={sb} {...tip(t('status.eol'))} onClick={e => eolMenu(e.currentTarget, d.eol, v => { d.eol = v; emit(); })}>{d.eol === '\n' ? 'LF' : 'CRLF'}</button>
        <button className={sb} onClick={() => run('data.header')} {...tip(t('c.data.header'))}>{d.hasHeader ? t('status.headerOn') : t('status.headerOff')}</button>
      </>}
      <div className="ml-2 flex flex-none items-center gap-1">
        <button className="ibtn sm" onClick={() => run('view.zoomOut')} {...tip(t('c.view.zoomOut'), keyOf('view.zoomOut'))}><Minus size={14} /></button>
        <input type="range" min={60} max={200} step={10} value={app.settings.zoom} aria-label={t('status.zoom')} className="h-1 w-24 accent-[var(--f-accent)]" onChange={e => { app.settings.zoom = +e.target.value; saveSettings(); }} />
        <button className="ibtn sm" onClick={() => run('view.zoomIn')} {...tip(t('c.view.zoomIn'), keyOf('view.zoomIn'))}><Plus size={14} /></button>
        <button className={cx(sb, 'w-12 !px-0 tabular-nums')} onClick={() => run('view.zoomReset')} {...tip(t('c.view.zoomReset'), keyOf('view.zoomReset'))}>{app.settings.zoom}%</button>
      </div>
    </footer>
  );
}

/* ------------------------------ welcome ------------------------------ */

export function Welcome() {
  useApp();
  const recent = app.settings.recent;
  return (
    <section className="relative min-h-0 flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" style={{ background: 'radial-gradient(60% 100% at 50% 0%, var(--f-accent-sub), transparent)' }} />
      <div data-scroll-main className="relative z-10 flex h-full w-full overflow-y-auto overflow-x-hidden p-6">
      <div className="m-auto flex w-full max-w-3xl flex-col items-center text-center [animation:rise_.35s_var(--ease)_both]">
        <Logo size={96} className="drop-shadow-[0_10px_18px_rgb(0_0_0/.18)]" />
        <h1 className="m-0 mt-5 font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight">Fluent CSV</h1>
        <p className="m-0 mt-2 max-w-md text-base text-fg2">{t('welcome.title')}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button className="btn btn-filled lg" onClick={() => run('file.open')} data-autofocus><FolderOpen size={20} />{t('c.file.open')}</button>
          <button className="btn lg" onClick={() => run('file.new')}><FilePlus2 size={20} />{t('c.file.new')}</button>
          <button className="btn lg" onClick={() => IO.addDoc(IO.sampleDoc())}><Sparkles size={20} />{t('welcome.sample')}</button>
        </div>
        <p className="mb-0 mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[.8125rem] text-fg2">
          <span>{t('welcome.drop')}</span>
          <span className="inline-flex items-center gap-1.5"><Command size={14} /><kbd>Ctrl</kbd><kbd>O</kbd></span>
          <span className="inline-flex items-center gap-1.5"><Search size={14} /><kbd>Ctrl</kbd><kbd>F</kbd></span>
        </p>
        {!!recent.length && (
          <div className="mt-8 w-full text-left">
            <h3 className="mb-2 ml-1 text-sm font-semibold">{t('welcome.recent')}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {recent.slice(0, 6).map((p, i) => (
                <button key={p} className="rec flex items-center gap-3 rounded-lg border border-[var(--f-card-stroke)] bg-card p-3 text-left shadow-card transition-colors duration-100 hover:bg-[color-mix(in_srgb,var(--f-text)_4%,var(--f-card))]"
                  style={{ animation: `rise .3s var(--ease) ${i * 40}ms both` }} onClick={() => IO.openPaths([p])} {...tip(p)}>
                  <FileText size={22} className="flex-none text-accent-text" />
                  <span className="min-w-0"><b className="block truncate font-normal">{baseName(p)}</b><small className="block truncate text-xs text-fg2">{p}</small></span>
                </button>))}
            </div>
          </div>)}
      </div>
      </div>
    </section>
  );
}
void Table2; void useMemo; void newDoc; void useRef;
