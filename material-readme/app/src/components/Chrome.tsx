import { useShallow } from 'zustand/react/shallow';
import { useRef } from 'react';
import {
  FolderOpen, FilePlus2, Save, History, EllipsisVertical, Search, ListTree, Settings, Command, Sun, Moon, SunMoon, Minus, Square, Copy as CopyIcon, X, FileText, Plus,
  Undo2, Redo2, Bold, Italic, Strikethrough, Code, Link2, Image, List, ListOrdered, ListChecks, Quote, FileCode, Table, Minus as Hr, Heading, ChevronDown, ZoomIn, ZoomOut, SquarePlus,
  PencilLine, Columns2, Eye, LayoutTemplate, SaveAll, FileCode2, Printer, Keyboard, Maximize2, FolderSearch, TableOfContents, BadgeCheck, Trash2, Clock,
} from 'lucide-react';
import { useApp, docName } from '../lib/controller';
import * as C from '../lib/controller';
import { useT } from '../lib/i18n';
import { useSettings } from '../lib/settings';
import { changeSettings, cycleMode } from '../lib/appearance';
import { openMenu, showOverlay, type MenuItem } from '../lib/ui';
import { api } from '../lib/tauri';
import { cx } from '../lib/shapes';
import { sc, closeActive, copyPath, newBlank } from '../lib/commands';
import { baseName } from '../lib/utils';
import { IconBtn, Btn, Seg } from './base';
import { Logo } from './Logo';

export function TitleBar() {
  const t = useT();
  const maximized = useApp((s) => s.maximized);
  const doc = useApp((s) => s.docs.find((d) => d.id === s.activeId));
  const w = api.win();
  return (
    <div className="titlebar" data-tauri-drag-region>
      <Logo className="logo" />
      <div className="tb-title" data-tauri-drag-region><b>Material Readme</b>{doc && <span>{(doc.dirty ? '● ' : '') + docName(doc)}</span>}</div>
      <div className="wc">
        <button type="button" className="wbtn" data-tip={t('w_min')} aria-label={t('w_min')} onClick={() => w?.minimize()}><Minus /></button>
        <button type="button" className="wbtn" data-tip={maximized ? t('w_restore') : t('w_max')} aria-label={maximized ? t('w_restore') : t('w_max')} onClick={() => w?.toggleMaximize().then(() => w.isMaximized().then((m) => useApp.setState({ maximized: m })))}>{maximized ? <CopyIcon /> : <Square />}</button>
        <button type="button" className="wbtn close" data-tip={t('w_close')} aria-label={t('w_close')} onClick={() => w?.close()}><X /></button>
      </div>
    </div>
  );
}

export function AppBar() {
  const t = useT();
  const { mode, nav, hasDoc, dirty, findOpen } = useApp(useShallow((s) => { const d = s.docs.find((x) => x.id === s.activeId); return { mode: s.mode, nav: s.nav, hasDoc: !!d, dirty: !!d?.dirty, findOpen: s.findOpen }; }));
  const modeSetting = useSettings((s) => s.mode);
  const recentBtn = useRef<HTMLButtonElement>(null), moreBtn = useRef<HTMLButtonElement>(null);
  const ThemeIcon = modeSetting === 'light' ? Sun : modeSetting === 'dark' ? Moon : SunMoon;

  const recentMenu = () => {
    const r = useApp.getState().recent;
    const items: MenuItem[] = r.length ? [...r.map((x): MenuItem => ({ label: x.name, sub: x.path, icon: FileText, run: () => C.openRecent(x) })), { sep: true }, { label: t('clear_recent'), icon: Trash2, run: C.clearRecent }]
      : [{ label: t('no_recent'), icon: Clock, disabled: true }];
    openMenu(recentBtn.current!, items);
  };
  const moreMenu = () => openMenu(moreBtn.current!, [
    { label: t('templates'), icon: LayoutTemplate, run: () => showOverlay('templates') },
    { label: t('save_as'), icon: SaveAll, shortcut: sc('saveas'), run: () => { C.save(undefined, true); }, disabled: !hasDoc },
    { sep: true },
    { label: t('export_html'), icon: FileCode2, run: () => C.exportHtml(), disabled: !hasDoc },
    { label: t('print'), icon: Printer, shortcut: sc('print'), run: () => C.printDoc(), disabled: !hasDoc },
    { sep: true },
    { label: t('copy_path'), icon: CopyIcon, run: copyPath, disabled: !hasDoc || !C.activePath() },
    { label: t('reveal'), icon: FolderSearch, run: () => api.reveal(C.activePath()), disabled: !hasDoc || !C.activePath() },
    { sep: true },
    { label: t('focus_mode'), icon: Maximize2, shortcut: 'F11', run: C.toggleFocus },
    { label: t('shortcuts'), icon: Keyboard, shortcut: 'F1', run: () => showOverlay('shortcuts') },
  ], { alignRight: false });

  return (
    <div className="appbar">
      <div className="grp start">
        <Btn icon={FolderOpen} tone="tonal" onClick={() => C.pickAndOpen()} tip={t('open')} sc={sc('open')}><span className="hide-md">{t('open')}</span></Btn>
        <IconBtn icon={FilePlus2} tip={t('new')} sc={sc('new')} onClick={newBlank} />
        <IconBtn icon={Save} tip={t('save')} sc={sc('save')} disabled={!hasDoc} on={dirty} toggle onClick={() => { C.save(); }} />
        <button ref={recentBtn} type="button" className="ibtn" data-tip={t('recent')} aria-label={t('recent')} aria-haspopup="menu" onClick={recentMenu}><History /></button>
        <button ref={moreBtn} type="button" className="ibtn" data-tip={t('more')} aria-label={t('more')} aria-haspopup="menu" onClick={moreMenu}><EllipsisVertical /></button>
      </div>
      <Seg value={mode} onChange={(v) => C.setMode(v)} label="View" items={[
        { value: 'edit', label: t('m_edit'), icon: PencilLine, sc: sc('edit') },
        { value: 'split', label: t('m_split'), icon: Columns2, sc: sc('split') },
        { value: 'preview', label: t('m_preview'), icon: Eye, sc: sc('preview') },
      ]} />
      <div className="grp end">
        <IconBtn icon={Search} tip={t('find')} sc={sc('find')} toggle on={findOpen} disabled={!hasDoc} onClick={() => (findOpen ? C.closeFind() : C.openFind(false))} />
        <IconBtn icon={ListTree} tip={nav ? t('outline_hide') : t('outline_show')} sc={sc('outline')} toggle on={nav} onClick={() => C.setNav(!nav)} />
        <IconBtn icon={ThemeIcon} tip={t('s_theme')} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); changeSettings({ mode: cycleMode(modeSetting) }, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); }} />
        <IconBtn icon={Command} tip={t('commands')} sc="Ctrl+Shift+P" onClick={() => showOverlay('palette')} />
        <IconBtn icon={Settings} tip={t('settings')} sc={sc('settings')} onClick={() => showOverlay('settings')} />
      </div>
    </div>
  );
}

export function Tabs() {
  const t = useT();
  const docs = useApp((s) => s.docs), activeId = useApp((s) => s.activeId);
  return (
    <div className={cx('tabs', !docs.length && 'none')} role="tablist">
      {docs.map((d) => (
        <div key={d.id} role="tab" tabIndex={0} aria-selected={d.id === activeId} className={cx('tab', d.id === activeId && 'on', d.dirty && 'dirty')} data-tip={d.path || docName(d)}
          onClick={() => C.activate(d.id)} onAuxClick={(e) => { if (e.button === 1) C.closeDoc(d.id); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') C.activate(d.id); }}>
          <FileText aria-hidden="true" /><span className="tn">{docName(d)}</span><span className="dot" />
          <button type="button" className="x" data-tip={t('close_tab')} aria-label={t('close_tab')} onClick={(e) => { e.stopPropagation(); C.closeDoc(d.id); }}><X /></button>
        </div>
      ))}
      <IconBtn icon={Plus} size="sm" tip={t('new')} sc={sc('new')} onClick={newBlank} />
    </div>
  );
}

export function FormatBar() {
  const t = useT();
  const { show, canUndo, canRedo } = useApp(useShallow((s) => ({ show: s.activeId !== null && s.mode !== 'preview', canUndo: s.canUndo, canRedo: s.canRedo })));
  const hBtn = useRef<HTMLButtonElement>(null), iBtn = useRef<HTMLButtonElement>(null);
  const F = ({ icon, tip, run, k }: { icon: typeof Bold; tip: string; run: () => void; k?: string }) => <IconBtn icon={icon} size="sm" tip={tip} sc={k} onClick={run} tabIndex={show ? 0 : -1} />;
  const headingMenu = () => openMenu(hBtn.current!, [
    { label: t('h_para'), icon: Heading, run: () => C.runCmd('heading', 0) },
    ...[1, 2, 3, 4, 5, 6].map((n): MenuItem => ({ label: `${t('h_n')} ${n}`, icon: Heading, sub: '#'.repeat(n), run: () => C.runCmd('heading', n) })),
  ]);
  const insertMenu = () => openMenu(iBtn.current!, [
    { label: t('c_table'), icon: Table, run: () => C.runCmd('table') }, { label: t('c_hr'), icon: Hr, run: () => C.runCmd('hr') },
    { label: t('c_toc'), icon: TableOfContents, run: C.insertToc }, { label: t('c_badge'), icon: BadgeCheck, run: () => showOverlay('badge') },
    { label: t('templates'), icon: LayoutTemplate, run: () => showOverlay('templates') },
  ]);
  return (
    <div className={cx('fmt-wrap', !show && 'off')} aria-hidden={!show}>
      <div><div className="fmt" role="toolbar">
        <F icon={Undo2} tip={t('c_undo')} k="Ctrl+Z" run={() => C.runCmd('undo')} /><F icon={Redo2} tip={t('c_redo')} k="Ctrl+Y" run={() => C.runCmd('redo')} />
        <span className="vsep" />
        <button ref={hBtn} type="button" className="btn text sm" style={{ paddingInline: '.625rem' }} data-tip={t('c_heading')} onClick={headingMenu} tabIndex={show ? 0 : -1}><Heading /><ChevronDown style={{ width: '.875rem', height: '.875rem' }} /></button>
        <F icon={Bold} tip={t('c_bold')} k="Ctrl+B" run={() => C.runCmd('bold')} /><F icon={Italic} tip={t('c_italic')} k="Ctrl+I" run={() => C.runCmd('italic')} />
        <F icon={Strikethrough} tip={t('c_strike')} k="Ctrl+Shift+X" run={() => C.runCmd('strike')} /><F icon={Code} tip={t('c_code')} k="Ctrl+E" run={() => C.runCmd('code')} />
        <span className="vsep" />
        <F icon={Link2} tip={t('c_link')} k="Ctrl+K" run={() => C.runCmd('link')} /><F icon={Image} tip={t('c_image')} run={() => C.runCmd('image')} />
        <span className="vsep" />
        <F icon={List} tip={t('c_ul')} run={() => C.runCmd('ul')} /><F icon={ListOrdered} tip={t('c_ol')} run={() => C.runCmd('ol')} />
        <F icon={ListChecks} tip={t('c_task')} run={() => C.runCmd('task')} /><F icon={Quote} tip={t('c_quote')} run={() => C.runCmd('quote')} />
        <span className="vsep" />
        <F icon={FileCode} tip={t('c_codeblock')} run={() => C.runCmd('codeblock')} />
        <button ref={iBtn} type="button" className="btn text sm" style={{ paddingInline: '.625rem' }} data-tip={t('c_insert')} onClick={insertMenu} tabIndex={show ? 0 : -1}><SquarePlus /><ChevronDown style={{ width: '.875rem', height: '.875rem' }} /></button>
        <span hidden>{canUndo && canRedo}</span>
      </div></div>
    </div>
  );
}

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
      {d && <><span className="hide-md">{cursor}</span><button type="button" className="s-btn" data-tip={t('eol')} onClick={C.toggleEol}>{d.eol === 'crlf' ? 'CRLF' : 'LF'}</button></>}
      <span className="zoom">
        <IconBtn icon={ZoomOut} size="xs" tip={t('zoom_out')} sc="Ctrl+-" onClick={() => C.zoomBy(-10)} />
        <button type="button" className="s-btn" style={{ minWidth: '3rem' }} data-tip={t("zoom_reset")} data-sc="Ctrl+0" onClick={() => C.setZoom(100)}>{zoom}%</button>
        <IconBtn icon={ZoomIn} size="xs" tip={t('zoom_in')} sc="Ctrl+=" onClick={() => C.zoomBy(10)} />
      </span>
    </div>
  );
}
export { baseName, closeActive };
