import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef } from 'react';
import { IcOutline, IcClose, IcSearchS, IcReplace, IcChevronUp, IcChevronDown, IcCase, IcSwap, IcArrowUp, IcNew, IcOpen, IcBook, IcDocS, IcClock, IcCut, IcCopy, IcPaste, IcSelectAll, IcBold, IcItalic, IcLink, IcSparkle } from '../lib/icons';
import { useApp, mountEditor, mountPreview, editorPointerEnter, docName } from '../lib/controller';
import * as C from '../lib/controller';
import { useT } from '../lib/i18n';
import { cx } from '../lib/utils';
import { showOverlay, openMenu, toast } from '../lib/ui';
import { sc, newBlank } from '../lib/commands';
import { api } from '../lib/tauri';
import { IconBtn, Btn } from './base';

export function Drawer() {
  const t = useT();
  const outline = useApp((s) => s.outline), active = useApp((s) => s.activeHeading), hasDoc = useApp((s) => s.activeId !== null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('.toc-i.on')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [active]);
  const min = outline.length ? Math.min(...outline.map((h) => h.level)) : 1;
  return (
    <aside className="drawer" aria-label={t('outline')}>
      <div className="dr-h"><IcOutline aria-hidden="true" /><h3>{t('outline')}</h3><IconBtn icon={IcClose} size="sm" tip={t('outline_hide')} sc={sc('outline')} onClick={() => C.setNav(false)} /></div>
      <div id="toc" ref={ref}>
        {!hasDoc || !outline.length ? <div className="toc-i toc-none">{t('no_toc')}</div> : outline.map((h, i) => (
          <a key={h.slug + i} className={cx('toc-i', 'l' + (h.level - min + 1), i === active && 'on')} style={{ paddingLeft: `${0.75 + Math.min(h.level - min, 4) * 0.875}rem` }} onClick={() => C.gotoHeading(i)} data-tip={h.text}>{h.text}</a>
        ))}
      </div>
    </aside>
  );
}

const editorMenu = (e: React.MouseEvent, t: ReturnType<typeof useT>) => {
  e.preventDefault();
  const exec = (c: string) => () => { document.execCommand(c); };
  openMenu({ x: e.clientX, y: e.clientY }, [
    { label: t('cut'), icon: IcCut, shortcut: 'Ctrl+X', run: exec('cut') },
    { label: t('copy'), icon: IcCopy, shortcut: 'Ctrl+C', run: exec('copy') },
    { label: t('paste'), icon: IcPaste, shortcut: 'Ctrl+V', run: async () => { try { C.insertText(await navigator.clipboard.readText()); } catch { toast.info(t('paste_fail'), { ms: 1800 }); } } },
    { label: t('select_all'), icon: IcSelectAll, shortcut: 'Ctrl+A', run: exec('selectAll') },
    { sep: true },
    { label: t('c_bold'), icon: IcBold, shortcut: 'Ctrl+B', run: () => C.runCmd('bold') },
    { label: t('c_italic'), icon: IcItalic, shortcut: 'Ctrl+I', run: () => C.runCmd('italic') },
    { label: t('c_link'), icon: IcLink, shortcut: 'Ctrl+K', run: () => C.runCmd('link') },
  ]);
};

export function EditorPane() {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && !ref.current.firstChild) mountEditor(ref.current); }, []);
  return <section className="pane pane-editor" onPointerEnter={editorPointerEnter} onContextMenu={(e) => editorMenu(e, t)}><div id="cm" ref={ref} /></section>;
}

export function PreviewPane() {
  const md = useRef<HTMLElement>(null), doc = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!md.current || !doc.current) return;
    mountPreview(md.current, doc.current);
    const click = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const task = el.closest<HTMLInputElement>('input.task');
      if (task) {
        const blk = task.closest<HTMLElement>('.blk');
        if (blk) C.toggleTask(Number(blk.dataset.line), [...blk.querySelectorAll('input.task')].indexOf(task));
        return;
      }
      const cp = el.closest<HTMLElement>('.cp');
      if (cp) {
        const code = cp.closest('.cb')?.querySelector('code')?.textContent || '';
        api.copy(code).then((ok) => { if (ok) { cp.classList.add('done'); setTimeout(() => cp.classList.remove('done'), 1200); } });
        return;
      }
      const a = el.closest('a'); if (!a) return;
      const href = a.getAttribute('href') || '';
      e.preventDefault();
      if (href.startsWith('#')) {
        const id = decodeURIComponent(href.slice(1));
        const target = [...md.current!.querySelectorAll('[id]')].find((n) => n.id === id) as HTMLElement | undefined;
        if (target) doc.current!.scrollTo({ top: target.offsetTop - 12, behavior: 'smooth' });
      } else if (/^(https?:|mailto:)/i.test(href)) api.openUrl(href);
      else if (/\.(md|markdown|mdown|mkd|txt)([?#].*)?$/i.test(href)) C.openLinked(href);
    };
    md.current.addEventListener('click', click);
    return () => md.current?.removeEventListener('click', click);
  }, []);
  return <section className="pane pane-preview"><div id="doc" ref={doc}><article className="md" ref={md} /></div></section>;
}

/** Drag handle between editor and preview in split view. */
export function Splitter() {
  const t = useT();
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const work = e.currentTarget.parentElement!, box = work.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => C.setSplit((ev.clientX - box.left) / box.width);
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); document.body.classList.remove('resizing'); };
    document.body.classList.add('resizing');
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };
  return <div className="splitter" role="separator" aria-orientation="vertical" data-tip={t('splitter')} onPointerDown={down} onDoubleClick={() => C.setSplit(0.5)} />;
}

export function FindBar() {
  const t = useT();
  const { open, rep, count, bad, hasDoc } = useApp(useShallow((s) => ({ open: s.findOpen, rep: s.findRep, count: s.findCount, bad: s.findBad, hasDoc: s.activeId !== null })));
  const q = useRef<HTMLInputElement>(null), r = useRef<HTMLInputElement>(null);
  const flags = useRef({ cs: false, re: false });
  useEffect(() => {
    if (open) { requestAnimationFrame(() => { const i = q.current; if (i) { i.value = C.findState.q; i.focus(); i.select(); } }); }
  }, [open, rep]);
  const toggle = (k: 'cs' | 're', el: HTMLElement) => { flags.current[k] = !flags.current[k]; el.classList.toggle('on', flags.current[k]); el.setAttribute('aria-pressed', String(flags.current[k])); C.setFind({ [k]: flags.current[k] }); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); C.closeFind(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (e.target === r.current) C.replaceOne(); else C.findStep(e.shiftKey ? -1 : 1); }
  };
  const tab = open ? 0 : -1;
  return (
    <div className={cx('findbar', open && hasDoc && 'open', rep && 'rep')} role="search" onKeyDown={key}>
      <div className="fb-row">
        <IconBtn icon={IcSwap} size="sm" tip={t('find_replace')} sc="Ctrl+H" toggle on={rep} onClick={C.toggleFindRep} tabIndex={tab} />
        <label className="fb-field"><IcSearchS aria-hidden="true" /><input ref={q} placeholder={t('find_ph')} aria-label={t('find_ph')} onInput={(e) => C.setFind({ q: e.currentTarget.value })} tabIndex={tab} /></label>
        <span className={cx('fb-count', bad && 'bad')} aria-live="polite">{count}</span>
        <IconBtn icon={IcCase} size="sm" tip={t('f_case')} toggle onClick={(e) => toggle('cs', e.currentTarget)} tabIndex={tab} />
        <IconBtn icon={IcSparkle} size="sm" tip={t('f_regex')} toggle onClick={(e) => toggle('re', e.currentTarget)} tabIndex={tab} />
        <IconBtn icon={IcChevronUp} size="sm" tip={t('f_prev')} sc="Shift+F3" onClick={() => C.findStep(-1)} tabIndex={tab} />
        <IconBtn icon={IcChevronDown} size="sm" tip={t('f_next')} sc="F3" onClick={() => C.findStep(1)} tabIndex={tab} />
        <IconBtn icon={IcClose} size="sm" tip={t('close')} sc="Esc" onClick={C.closeFind} tabIndex={tab} />
      </div>
      <div className="fb-row fb-rep">
        <label className="fb-field"><IcReplace aria-hidden="true" /><input ref={r} placeholder={t('replace_ph')} aria-label={t('replace_ph')} onInput={(e) => C.setFind({ r: e.currentTarget.value })} tabIndex={rep && open ? 0 : -1} /></label>
        <Btn size="sm" tone="tonal" onClick={C.replaceOne} tabIndex={rep && open ? 0 : -1}>{t('replace_one')}</Btn>
        <Btn size="sm" tone="filled" onClick={C.replaceAllMatches} tabIndex={rep && open ? 0 : -1}>{t('replace_all')}</Btn>
      </div>
    </div>
  );
}

export function EmptyState() {
  const t = useT();
  const recent = useApp((s) => s.recent);
  return (
    <div className="empty">
      <div className="empty-in">
        <img className="hero" src="icon.png" alt="" draggable={false} />
        <h1>{t('empty_t')}</h1>
        <p>{t('empty_h')}</p>
        <div className="row">
          <Btn size="lg" tone="filled" icon={IcNew} onClick={newBlank} sc={sc('new')}>{t('new')}</Btn>
          <Btn size="lg" tone="tonal" icon={IcOpen} onClick={() => C.pickAndOpen()} sc={sc('open')}>{t('open')}</Btn>
          <Btn size="lg" tone="tonal" icon={IcBook} onClick={() => showOverlay('templates')}>{t('templates')}</Btn>
          <Btn size="lg" tone="text" icon={IcDocS} onClick={() => C.openSample()}>{t('sample')}</Btn>
        </div>
        <div className="recent">
          <h4><IcClock aria-hidden="true" />{t('recent')}</h4>
          {recent.length ? recent.slice(0, 5).map((r) => (
            <button key={r.path} type="button" className="item" onClick={() => C.openRecent(r)}>
              <IcDocS aria-hidden="true" /><span className="tx"><b>{r.name}</b><small>{r.path}</small></span>
            </button>
          )) : <p className="recent-none">{t('no_recent_hint')}</p>}
        </div>
      </div>
    </div>
  );
}

export function ScrollTop() {
  const t = useT();
  const on = useApp((s) => s.scrolled && s.activeId !== null);
  return <button type="button" className={cx('fab-top', on && 'on')} data-tip={t('scroll_top')} aria-label={t('scroll_top')} tabIndex={on ? 0 : -1} onClick={C.scrollTop}><IcArrowUp /></button>;
}
export { docName };
