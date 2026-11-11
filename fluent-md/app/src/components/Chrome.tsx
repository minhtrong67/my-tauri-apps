import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef } from 'react';
import {
  IcOpen, IcNew, IcSave, IcRecent, IcMore, IcSearch, IcOutline, IcSettings, IcSun, IcMoon, IcSystem, IcClose, IcCloseS, IcAdd, IcDocS, IcUndo, IcRedo, IcBold, IcItalic,
  IcStrike, IcCode, IcLink, IcImage, IcUl, IcOl, IcTask, IcQuote, IcCodeBlock, IcTable, IcHr, IcChevronDownS, IcZoomIn, IcZoomOut, IcEdit, IcSplit, IcEye, IcBook,
  IcSaveAll, IcDocText, IcPrint, IcKeyboard, IcFocus, IcReveal, IcCopy, IcDocCopy, IcDelete, IcClock, IcAlign, IcBadge, IcH1, IcCommand, IcAddS, type FluentIcon,
} from '../lib/icons';
import { useApp, docName } from '../lib/controller';
import * as C from '../lib/controller';
import { useT } from '../lib/i18n';
import { useSettings } from '../lib/settings';
import { changeSettings, cycleMode } from '../lib/appearance';
import { openMenu, showOverlay, type MenuItem } from '../lib/ui';
import { api } from '../lib/tauri';
import { cx } from '../lib/utils';
import { sc, newBlank, copyPath } from '../lib/commands';
import { IconBtn, Btn, Seg } from './base';

/* Windows 11 caption glyphs, drawn like Segoe Fluent Icons so they stay crisp at every scale. */
const Min = () => <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5h10" /></svg>;
const Max = () => <svg viewBox="0 0 10 10" aria-hidden="true"><rect x=".5" y=".5" width="9" height="9" rx="1.5" /></svg>;
const Restore = () => <svg viewBox="0 0 10 10" aria-hidden="true"><rect x=".5" y="2.5" width="7" height="7" rx="1.5" /><path d="M2.5 2.5v-1a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" /></svg>;
const Shut = () => <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M.5.5l9 9M9.5.5l-9 9" /></svg>;

export function TitleBar() {
  const t = useT();
  const maximized = useApp((s) => s.maximized);
  const hasDocs = useApp((s) => s.docs.length > 0);
  const w = api.win();
  return (
    <div className="titlebar" data-tauri-drag-region>
      <img className="tb-icon" src="icon.png" alt="" draggable={false} data-tauri-drag-region />
      {!hasDocs && <span className="tb-title" data-tauri-drag-region>{t('app_name')}</span>}
      <Tabs />
      <div className="tb-fill" data-tauri-drag-region />
      <div className="wc">
        <button type="button" className="wbtn" data-tip={t('w_min')} aria-label={t('w_min')} onClick={() => w?.minimize()}><Min /></button>
        <button type="button" className="wbtn" data-tip={maximized ? t('w_restore') : t('w_max')} aria-label={maximized ? t('w_restore') : t('w_max')}
          onClick={() => w?.toggleMaximize().then(() => w.isMaximized().then((m) => useApp.setState({ maximized: m })))}>{maximized ? <Restore /> : <Max />}</button>
        <button type="button" className="wbtn close" data-tip={t('w_close')} aria-label={t('w_close')} onClick={() => w?.close()}><Shut /></button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- tabs */
function Tabs() {
  const t = useT();
  const docs = useApp((s) => s.docs), activeId = useApp((s) => s.activeId);
  const strip = useRef<HTMLDivElement>(null), drag = useRef<{ id: number; x0: number; el: HTMLElement; moved: boolean } | null>(null);
  useEffect(() => { strip.current?.querySelector('.tab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [activeId, docs.length]);

  // Tabs are reordered with pointer events: HTML5 drag and drop is disabled in the window because files can be dropped onto it.
  const down = (e: React.PointerEvent<HTMLDivElement>, id: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.x')) return;
    drag.current = { id, x0: e.clientX, el: e.currentTarget, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x0; if (!d.moved && Math.abs(dx) < 6) return;
    d.moved = true; d.el.classList.add('dragging'); d.el.style.transform = `translateX(${dx}px)`;
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null; if (!d) return;
    d.el.classList.remove('dragging'); d.el.style.transform = '';
    if (!d.moved) return;
    const others = [...(strip.current?.querySelectorAll<HTMLElement>('.tab') || [])].filter((el) => el !== d.el);
    const target = others.find((el) => { const r = el.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; });
    C.moveDoc(d.id, target ? Number(target.dataset.id) : null);
  };

  const menu = (e: React.MouseEvent, id: number, path: string) => {
    e.preventDefault();
    const i = docs.findIndex((d) => d.id === id);
    openMenu({ x: e.clientX, y: e.clientY }, [
      { label: t('close_tab'), icon: IcClose, shortcut: 'Ctrl+W', run: () => C.closeDoc(id) },
      { label: t('close_others'), run: () => C.closeOthers(id), disabled: docs.length < 2 },
      { label: t('close_right'), run: () => C.closeRight(id), disabled: i >= docs.length - 1 },
      { label: t('close_all'), run: () => C.closeAllDocs() },
      { sep: true },
      { label: t('copy_path'), icon: IcCopy, run: () => { api.copy(path); }, disabled: !path },
      { label: t('reveal'), icon: IcReveal, run: () => api.reveal(path), disabled: !path },
    ]);
  };

  return (
    <div className="tabs" role="tablist" ref={strip} onWheel={(e) => { if (strip.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) strip.current.scrollLeft += e.deltaY; }}>
      {docs.map((d) => (
        <div key={d.id} role="tab" tabIndex={0} data-id={d.id} aria-selected={d.id === activeId} className={cx('tab', d.id === activeId && 'on', d.dirty && 'dirty')} data-tip={d.path || docName(d)}
          onPointerDown={(e) => down(e, d.id)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => menu(e, d.id, d.path)}
          onClick={() => C.activate(d.id)} onAuxClick={(e) => { if (e.button === 1) C.closeDoc(d.id); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') C.activate(d.id); }}>
          <IcDocS aria-hidden="true" /><span className="tn">{docName(d)}</span><span className="dot" />
          <button type="button" className="x" data-tip={t('close_tab')} aria-label={t('close_tab')} onClick={(e) => { e.stopPropagation(); C.closeDoc(d.id); }}><IcCloseS /></button>
        </div>
      ))}
      <button type="button" className="tab-add" data-tip={t('new')} data-sc={sc('new')} aria-label={t('new')} onClick={newBlank}><IcAddS aria-hidden="true" /></button>
    </div>
  );
}

/* ------------------------------------------------------------ command bar */
export function CommandBar() {
  const t = useT();
  const { mode, nav, hasDoc, dirty, findOpen, anyDirty } = useApp(useShallow((s) => { const d = s.docs.find((x) => x.id === s.activeId); return { mode: s.mode, nav: s.nav, hasDoc: !!d, dirty: !!d?.dirty, findOpen: s.findOpen, anyDirty: s.docs.some((x) => x.dirty) }; }));
  const modeSetting = useSettings((s) => s.mode);
  const recentBtn = useRef<HTMLButtonElement>(null), moreBtn = useRef<HTMLButtonElement>(null);
  const ThemeIcon: FluentIcon = modeSetting === 'light' ? IcSun : modeSetting === 'dark' ? IcMoon : IcSystem;

  const recentMenu = () => {
    const r = useApp.getState().recent;
    const items: MenuItem[] = r.length ? [...r.map((x): MenuItem => ({ label: x.name, sub: x.path, icon: IcDocS as FluentIcon, run: () => C.openRecent(x) })), { sep: true }, { label: t('clear_recent'), icon: IcDelete, run: C.clearRecent }]
      : [{ label: t('no_recent'), icon: IcClock, disabled: true }];
    openMenu(recentBtn.current!, items);
  };
  const moreMenu = () => openMenu(moreBtn.current!, [
    { label: t('templates'), icon: IcBook, run: () => showOverlay('templates') },
    { label: t('save_as'), icon: IcDocCopy, shortcut: sc('saveas'), run: () => { C.save(undefined, true); }, disabled: !hasDoc },
    { label: t('save_all'), icon: IcSaveAll, shortcut: sc('saveall'), run: () => { C.saveAll(); }, disabled: !anyDirty },
    { sep: true },
    { label: t('export_html'), icon: IcDocText, run: () => C.exportHtml(), disabled: !hasDoc },
    { label: t('print'), icon: IcPrint, shortcut: sc('print'), run: () => C.printDoc(), disabled: !hasDoc },
    { sep: true },
    { label: t('copy_path'), icon: IcCopy, run: copyPath, disabled: !hasDoc || !C.activePath() },
    { label: t('reveal'), icon: IcReveal, run: () => api.reveal(C.activePath()), disabled: !hasDoc || !C.activePath() },
    { sep: true },
    { label: t('focus_mode'), icon: IcFocus, shortcut: 'F11', run: C.toggleFocus },
    { label: t('shortcuts'), icon: IcKeyboard, shortcut: 'F1', run: () => showOverlay('shortcuts') },
  ]);

  return (
    <div className="cmdbar" role="toolbar" aria-label={t('command_bar')}>
      <div className="grp start">
        <Btn icon={IcNew} tone="text" onClick={newBlank} tip={t('new')} sc={sc('new')}><span className="hide-md">{t('new')}</span></Btn>
        <Btn icon={IcOpen} tone="text" onClick={() => C.pickAndOpen()} tip={t('open')} sc={sc('open')}><span className="hide-md">{t('open')}</span></Btn>
        <IconBtn icon={IcSave} tip={t('save')} sc={sc('save')} disabled={!hasDoc} on={dirty} toggle onClick={() => { C.save(); }} />
        <span className="vsep" />
        <button ref={recentBtn} type="button" className="ibtn" data-tip={t('recent')} aria-label={t('recent')} aria-haspopup="menu" onClick={recentMenu}><IcRecent /></button>
        <button ref={moreBtn} type="button" className="ibtn" data-tip={t('more')} aria-label={t('more')} aria-haspopup="menu" onClick={moreMenu}><IcMore /></button>
      </div>
      <Seg value={mode} onChange={(v) => C.setMode(v)} label={t('view_mode')} items={[
        { value: 'edit', label: t('m_edit'), icon: IcEdit, sc: sc('edit') },
        { value: 'split', label: t('m_split'), icon: IcSplit, sc: sc('split') },
        { value: 'preview', label: t('m_preview'), icon: IcEye, sc: sc('preview') },
      ]} />
      <div className="grp end">
        <IconBtn icon={IcSearch} tip={t('find')} sc={sc('find')} toggle on={findOpen} disabled={!hasDoc} onClick={() => (findOpen ? C.closeFind() : C.openFind(false))} />
        <IconBtn icon={IcOutline} tip={nav ? t('outline_hide') : t('outline_show')} sc={sc('outline')} toggle on={nav} onClick={() => C.setNav(!nav)} />
        <span className="vsep" />
        <IconBtn icon={ThemeIcon} tip={t('s_theme')} onClick={() => changeSettings({ mode: cycleMode(modeSetting) })} />
        <IconBtn icon={IcCommand} tip={t('commands')} sc="Ctrl+Shift+P" onClick={() => showOverlay('palette')} />
        <IconBtn icon={IcSettings} tip={t('settings')} sc={sc('settings')} onClick={() => showOverlay('settings')} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ format bar */
export function FormatBar() {
  const t = useT();
  const { show, canUndo, canRedo } = useApp(useShallow((s) => ({ show: s.activeId !== null && s.mode !== 'preview', canUndo: s.canUndo, canRedo: s.canRedo })));
  const hBtn = useRef<HTMLButtonElement>(null), iBtn = useRef<HTMLButtonElement>(null);
  const F = ({ icon, tip, run, k, off }: { icon: FluentIcon; tip: string; run: () => void; k?: string; off?: boolean }) => <IconBtn icon={icon} size="sm" tip={tip} sc={k} onClick={run} disabled={off} tabIndex={show ? 0 : -1} />;
  const headingMenu = () => openMenu(hBtn.current!, [
    { label: t('h_para'), run: () => C.runCmd('heading', 0) },
    ...[1, 2, 3, 4, 5, 6].map((n): MenuItem => ({ label: `${t('h_n')} ${n}`, sub: '#'.repeat(n), run: () => C.runCmd('heading', n) })),
  ]);
  const insertMenu = () => openMenu(iBtn.current!, [
    { label: t('c_table'), icon: IcTable, run: () => C.runCmd('table') }, { label: t('c_hr'), icon: IcHr, run: () => C.runCmd('hr') },
    { label: t('c_toc'), icon: IcAlign, run: C.insertToc }, { label: t('c_badge'), icon: IcBadge, run: () => showOverlay('badge') },
    { label: t('templates'), icon: IcBook, run: () => showOverlay('templates') },
  ]);
  return (
    <div className={cx('fmt-wrap', !show && 'off')} aria-hidden={!show}>
      <div><div className="fmt" role="toolbar" aria-label={t('c_heading')}>
        <F icon={IcUndo} tip={t('c_undo')} k="Ctrl+Z" off={!canUndo} run={() => C.runCmd('undo')} /><F icon={IcRedo} tip={t('c_redo')} k="Ctrl+Y" off={!canRedo} run={() => C.runCmd('redo')} />
        <span className="vsep" />
        <button ref={hBtn} type="button" className="btn text sm" data-tip={t('c_heading')} onClick={headingMenu} tabIndex={show ? 0 : -1}><IcH1 /><IcChevronDownS /></button>
        <F icon={IcBold} tip={t('c_bold')} k="Ctrl+B" run={() => C.runCmd('bold')} /><F icon={IcItalic} tip={t('c_italic')} k="Ctrl+I" run={() => C.runCmd('italic')} />
        <F icon={IcStrike} tip={t('c_strike')} k="Ctrl+Shift+X" run={() => C.runCmd('strike')} /><F icon={IcCode} tip={t('c_code')} k="Ctrl+E" run={() => C.runCmd('code')} />
        <span className="vsep" />
        <F icon={IcLink} tip={t('c_link')} k="Ctrl+K" run={() => C.runCmd('link')} /><F icon={IcImage} tip={t('c_image')} run={() => C.runCmd('image')} />
        <span className="vsep" />
        <F icon={IcUl} tip={t('c_ul')} run={() => C.runCmd('ul')} /><F icon={IcOl} tip={t('c_ol')} run={() => C.runCmd('ol')} />
        <F icon={IcTask} tip={t('c_task')} run={() => C.runCmd('task')} /><F icon={IcQuote} tip={t('c_quote')} run={() => C.runCmd('quote')} />
        <span className="vsep" />
        <F icon={IcCodeBlock} tip={t('c_codeblock')} run={() => C.runCmd('codeblock')} />
        <button ref={iBtn} type="button" className="btn text sm" data-tip={t('c_insert')} onClick={insertMenu} tabIndex={show ? 0 : -1}><IcAdd /><IcChevronDownS /></button>
      </div></div>
    </div>
  );
}

/* ------------------------------------------------------------- status bar */
export function StatusBar() {
  const t = useT();
  const { d, words, chars, cursor } = useApp(useShallow((s) => ({ d: s.docs.find((x) => x.id === s.activeId), words: s.words, chars: s.chars, cursor: s.cursor })));
  const zoom = useSettings((s) => s.zoom);
  return (
    <div className="status">
      {d && <>
        <span className={cx('s-save', d.dirty && 'dirty')}>{d.dirty ? t('unsaved') : d.path ? t('saved_s') : t('new_file')}</span>
        <span>{words.toLocaleString()} {t('words')}</span><span className="hide-md">{chars.toLocaleString()} {t('chars')}</span><span className="hide-md">{Math.max(1, Math.ceil(words / 220))} {t('min')}</span>
      </>}
      <span className="sp" />
      {d && <><span className="hide-md">{cursor}</span><span className="hide-md">{t('encoding')}</span><button type="button" className="s-btn" data-tip={t('eol')} onClick={C.toggleEol}>{d.eol === 'crlf' ? 'CRLF' : 'LF'}</button></>}
      <span className="zoom">
        <IconBtn icon={IcZoomOut} size="xs" tip={t('zoom_out')} sc="Ctrl+-" onClick={() => C.zoomBy(-10)} />
        <button type="button" className="s-btn zl" data-tip={t('zoom_reset')} data-sc="Ctrl+0" onClick={() => C.setZoom(100)}>{zoom}%</button>
        <IconBtn icon={IcZoomIn} size="xs" tip={t('zoom_in')} sc="Ctrl+=" onClick={() => C.zoomBy(10)} />
      </span>
    </div>
  );
}
