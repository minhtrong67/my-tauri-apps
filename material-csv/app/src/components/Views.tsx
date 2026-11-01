// Row details pane, cards / list views, status bar and the welcome screen.
import { useMemo, useState, useRef } from 'react';
import { X, FolderOpen, FilePlus2, Sparkles, Minus, Plus, FileText, Heart, Code2, Command, Search, Table2, PanelRight } from 'lucide-react';
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
    <aside className="flex w-72 flex-none flex-col rounded-[1.75rem] bg-sc-low [animation:rise_.35s_var(--emph-out)_both] max-lg:hidden" aria-label={t('details.title')}>
      <div className="flex items-center gap-2 px-4 pb-1 pt-3"><span className="grid size-9 place-items-center rounded-xl bg-primary-container text-on-primary-container"><PanelRight size={18} /></span><h3 className="m-0 flex-1 text-base font-medium">{t('details.title')}</h3>
        <button className="ibtn sm" onClick={() => run('view.details')} {...tip(t('close'))}><X size={16} /></button></div>
      <div data-scroll-main className="flex-1 overflow-y-auto px-4 pb-4">
        {!row ? <p className="mt-3 text-sm text-on-surface-variant">{t('details.empty')}</p> : (
          <>
            <div className="mb-2 mt-2 text-sm text-on-surface-variant">{t('row')} <b className="text-primary">{src + 1}</b></div>
            {d.head.map((h, c) => {
              const v = row[c] ?? '', long = v.length > 48 || v.includes('\n');
              const key = `${d.id}:${src}:${c}:${d.version}`;
              return (
                <label key={key} className="mb-2.5 block"><small className="mb-1 ml-1 block text-xs text-on-surface-variant">{h}</small>
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
                <header className="mb-1 flex items-center justify-between gap-2"><b className="truncate text-base font-medium">{title || '—'}</b><span className="chip !h-6">#{src + 1}</span></header>
                {cols.slice(1).map(c => <div key={c} className="f"><small>{d.head[c]}</small><span>{row[c] || '—'}</span></div>)}
              </article>);
          })}
        </div>
        {!d.view.length && <div className="p-10 text-center text-on-surface-variant">{t('noMatch')}</div>}
      </div>
      <ScrollTopFab show={scrolled} />
    </div>
  );
}

/* ------------------------------ status bar ------------------------------ */

export function StatusBar() {
  useApp();
  const d = cur();
  const sb = 'sbtn flex-none whitespace-nowrap rounded-full px-3 h-7 text-xs font-medium text-on-surface-variant transition-colors hover:bg-on-surface/10 relative overflow-hidden';
  return (
    <footer className="mx-2 mb-2 mt-1 flex h-9 flex-none items-center gap-1 overflow-x-auto rounded-full bg-sc px-3 text-xs text-on-surface-variant hide-scroll">
      {d && <>
        <span className="flex-none">{fmtNum(d.view.length)}{d.view.length !== d.rows.length ? ' / ' + fmtNum(d.rows.length) : ''} {t('rows')} · {fmtNum(visCols(d).length)}{d.hidden.size ? ' / ' + d.head.length : ''} {t('cols')}{d.size ? ' · ' + fmtSize(d.size) : ''}</span>
        <span className="ml-2 min-w-0 flex-shrink truncate font-semibold text-primary">{describeSel()}</span>
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
        <button className="ibtn sm" onClick={() => run('view.zoomOut')} {...tip(t('c.view.zoomOut'), keyOf('view.zoomOut'))}><Minus size={15} /></button>
        <input type="range" min={60} max={200} step={10} value={app.settings.zoom} aria-label={t('status.zoom')} className="h-1 w-24 accent-[var(--m-primary)]" onChange={e => { app.settings.zoom = +e.target.value; saveSettings(); }} />
        <button className="ibtn sm" onClick={() => run('view.zoomIn')} {...tip(t('c.view.zoomIn'), keyOf('view.zoomIn'))}><Plus size={15} /></button>
        <button className={cx(sb, 'w-12 !px-0 tabular-nums')} onClick={() => run('view.zoomReset')} {...tip(t('c.view.zoomReset'), keyOf('view.zoomReset'))}>{app.settings.zoom}%</button>
      </div>
    </footer>
  );
}

/* ------------------------------ welcome ------------------------------ */

export function Welcome() {
  useApp();
  const recent = app.settings.recent;
  const mv = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = mv.current; if (!el || !app.settings.anim) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3)); el.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3));
  };
  const blob = 'pointer-events-none absolute [animation:morph_12s_ease-in-out_infinite] [transition:transform_.6s_var(--emph-out)]';
  return (
    <section ref={mv} onMouseMove={onMove} className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-sc-low">
      <div className={cx(blob, 'bg-primary-container opacity-70')} style={{ width: '34rem', height: '34rem', left: '-8rem', top: '-10rem', transform: 'translate(calc(var(--mx,0)*30px), calc(var(--my,0)*30px))' }} />
      <div className={cx(blob, 'bg-tertiary-container opacity-70')} style={{ width: '26rem', height: '26rem', right: '-6rem', bottom: '-8rem', animationDelay: '-4s', transform: 'translate(calc(var(--mx,0)*-40px), calc(var(--my,0)*-40px))' }} />
      <div className={cx(blob, 'bg-secondary-container opacity-60')} style={{ width: '14rem', height: '14rem', right: '14%', top: '8%', animationDelay: '-8s', transform: 'translate(calc(var(--mx,0)*50px), calc(var(--my,0)*20px))' }} />
      <div data-scroll-main className="relative z-10 flex h-full w-full overflow-y-auto overflow-x-hidden p-6">
      <div className="m-auto flex w-full max-w-3xl flex-col items-center text-center [animation:rise_.6s_var(--emph-out)_both]">
        <Logo size={116} className="[animation:floaty_6s_ease-in-out_infinite] drop-shadow-[0_18px_28px_color-mix(in_srgb,var(--m-primary)_35%,transparent)]" />
        <h1 className="m-0 mt-5 text-[clamp(2.2rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-tight">Material CSV</h1>
        <p className="m-0 mt-2 max-w-md text-[1.0625rem] text-on-surface-variant">{t('welcome.title')}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button className="btn btn-filled lg" onClick={() => run('file.open')} data-autofocus><FolderOpen size={22} />{t('c.file.open')}</button>
          <button className="btn btn-tonal lg" onClick={() => run('file.new')}><FilePlus2 size={22} />{t('c.file.new')}</button>
          <button className="btn btn-outlined lg" onClick={() => IO.addDoc(IO.sampleDoc())}><Sparkles size={22} />{t('welcome.sample')}</button>
        </div>
        <p className="mb-0 mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[.8125rem] text-on-surface-variant">
          <span>{t('welcome.drop')}</span>
          <span className="inline-flex items-center gap-1.5"><Command size={14} /><kbd>Ctrl</kbd><kbd>O</kbd></span>
          <span className="inline-flex items-center gap-1.5"><Search size={14} /><kbd>Ctrl</kbd><kbd>F</kbd></span>
        </p>
        {!!recent.length && (
          <div className="mt-8 w-full text-left">
            <h3 className="mb-2 ml-2 text-xs font-bold uppercase tracking-wider text-primary">{t('welcome.recent')}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {recent.slice(0, 6).map((p, i) => (
                <button key={p} className="rec flex items-center gap-3 rounded-[1.25rem] bg-sc p-3 text-left transition-[background-color,border-radius,transform] duration-300 [transition-timing-function:var(--spring)] hover:-translate-y-0.5 hover:rounded-[1.75rem] hover:bg-sc-high"
                  style={{ animation: `rise .45s var(--emph-out) ${i * 50}ms both` }} onClick={() => IO.openPaths([p])} {...tip(p)}>
                  <span className="grid size-10 flex-none place-items-center rounded-xl bg-secondary-container text-on-secondary-container"><FileText size={19} /></span>
                  <span className="min-w-0"><b className="block truncate font-medium">{baseName(p)}</b><small className="block truncate text-xs text-on-surface-variant">{p}</small></span>
                </button>))}
            </div>
          </div>)}
      </div>
      </div>
    </section>
  );
}
void Table2; void useMemo; void newDoc;
