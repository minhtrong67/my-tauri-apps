import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef } from 'react';
import { ListTree, X, Search, Replace, ChevronUp, ChevronDown, CaseSensitive, Regex, ChevronsUpDown, ArrowUp, FilePlus2, FolderOpen, LayoutTemplate, BookOpen, FileText, Clock } from 'lucide-react';
import { useApp, mountEditor, mountPreview, editorPointerEnter, docName } from '../lib/controller';
import * as C from '../lib/controller';
import { useT } from '../lib/i18n';
import { cx } from '../lib/shapes';
import { showOverlay } from '../lib/ui';
import { sc, newBlank } from '../lib/commands';
import { api } from '../lib/tauri';
import { IconBtn, Btn } from './base';
import { Logo, Cookie } from './Logo';

export function Drawer() {
  const t = useT();
  const outline = useApp((s) => s.outline), active = useApp((s) => s.activeHeading), hasDoc = useApp((s) => s.activeId !== null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('.toc-i.on')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [active]);
  const min = outline.length ? Math.min(...outline.map((h) => h.level)) : 1;
  return (
    <aside className="drawer" aria-label={t('outline')}>
      <div className="dr-h"><ListTree aria-hidden="true" /><h3>{t('outline')}</h3><IconBtn icon={X} size="sm" tip={t('outline_hide')} sc={sc('outline')} onClick={() => C.setNav(false)} /></div>
      <div id="toc" ref={ref}>
        {!hasDoc || !outline.length ? <div className="toc-i toc-none">{t('no_toc')}</div> : outline.map((h, i) => (
          <a key={h.slug + i} className={cx('toc-i', 'l' + (h.level - min + 1), i === active && 'on')} style={{ paddingLeft: `${0.75 + Math.min(h.level - min, 4) * 0.875}rem` }} onClick={() => C.gotoHeading(i)} data-tip={h.text}>{h.text}</a>
        ))}
      </div>
    </aside>
  );
}

export function EditorPane() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && !ref.current.firstChild) mountEditor(ref.current); }, []);
  return <section className="pane pane-editor" onPointerEnter={editorPointerEnter}><div id="cm" ref={ref} /></section>;
}

export function PreviewPane() {
  const md = useRef<HTMLElement>(null), doc = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!md.current || !doc.current) return;
    mountPreview(md.current, doc.current);
    const click = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
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

export function FindBar() {
  const t = useT();
  const { open, rep, count, bad, hasDoc } = useApp(useShallow((s) => ({ open: s.findOpen, rep: s.findRep, count: s.findCount, bad: s.findBad, hasDoc: s.activeId !== null })));
  const q = useRef<HTMLInputElement>(null), r = useRef<HTMLInputElement>(null);
  const flags = useRef({ cs: false, re: false });
  const [, force] = [0, () => {}];
  void force;
  useEffect(() => {
    if (open) { requestAnimationFrame(() => { const i = q.current; if (i) { i.value = C.findState.q; i.focus(); i.select(); } }); }
  }, [open, rep]);
  const toggle = (k: 'cs' | 're', el: HTMLElement) => { flags.current[k] = !flags.current[k]; el.classList.toggle('on', flags.current[k]); el.setAttribute('aria-pressed', String(flags.current[k])); C.setFind({ [k]: flags.current[k] }); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); C.closeFind(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (e.target === r.current) C.replaceOne(); else C.findStep(e.shiftKey ? -1 : 1); }
  };
  return (
    <div className={cx('findbar', open && hasDoc && 'open', rep && 'rep')} role="search" onKeyDown={key}>
      <div className="fb-row">
        <IconBtn icon={ChevronsUpDown} size="sm" tip={t('find_replace')} sc="Ctrl+H" toggle on={rep} onClick={C.toggleFindRep} tabIndex={open ? 0 : -1} />
        <label className="fb-field"><Search aria-hidden="true" /><input ref={q} placeholder={t('find_ph')} aria-label={t('find_ph')} onInput={(e) => C.setFind({ q: e.currentTarget.value })} tabIndex={open ? 0 : -1} /></label>
        <span className={cx('fb-count', bad && 'bad')} aria-live="polite">{count}</span>
        <IconBtn icon={CaseSensitive} size="sm" tip={t('f_case')} toggle onClick={(e) => toggle('cs', e.currentTarget)} tabIndex={open ? 0 : -1} />
        <IconBtn icon={Regex} size="sm" tip={t('f_regex')} toggle onClick={(e) => toggle('re', e.currentTarget)} tabIndex={open ? 0 : -1} />
        <IconBtn icon={ChevronUp} size="sm" tip={t('f_prev')} sc="Shift+F3" onClick={() => C.findStep(-1)} tabIndex={open ? 0 : -1} />
        <IconBtn icon={ChevronDown} size="sm" tip={t('f_next')} sc="F3" onClick={() => C.findStep(1)} tabIndex={open ? 0 : -1} />
        <IconBtn icon={X} size="sm" tip={t('close')} sc="Esc" onClick={C.closeFind} tabIndex={open ? 0 : -1} />
      </div>
      <div className="fb-row fb-rep">
        <span style={{ width: '2rem' }} />
        <label className="fb-field"><Replace aria-hidden="true" /><input ref={r} placeholder={t('replace_ph')} aria-label={t('replace_ph')} onInput={(e) => C.setFind({ r: e.currentTarget.value })} tabIndex={rep && open ? 0 : -1} /></label>
        <Btn size="sm" tone="tonal" icon={Replace} onClick={C.replaceOne} tabIndex={rep && open ? 0 : -1}>{t('replace_one')}</Btn>
        <Btn size="sm" tone="filled" icon={Replace} onClick={C.replaceAllMatches} tabIndex={rep && open ? 0 : -1}>{t('replace_all')}</Btn>
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
        <div className="hero"><Cookie className="cookie" soft /><Cookie className="cookie b" /><Logo className="logo" /></div>
        <h1>{t('empty_t')}</h1>
        <p>{t('empty_h')}</p>
        <div className="row">
          <Btn size="lg" tone="filled" icon={FilePlus2} onClick={newBlank} sc={sc('new')}>{t('new')}</Btn>
          <Btn size="lg" tone="tonal" icon={FolderOpen} onClick={() => C.pickAndOpen()} sc={sc('open')}>{t('open')}</Btn>
          <Btn size="lg" tone="outlined" icon={LayoutTemplate} onClick={() => showOverlay('templates')}>{t('templates')}</Btn>
          <Btn size="lg" tone="text" icon={BookOpen} onClick={() => C.openSample()}>{t('sample')}</Btn>
        </div>
        {recent.length > 0 && (
          <div className="recent">
            <h4><Clock aria-hidden="true" style={{ display: 'inline', width: '.9rem', height: '.9rem', verticalAlign: '-2px', marginRight: '.35rem' }} />{t('recent')}</h4>
            {recent.slice(0, 4).map((r) => (
              <button key={r.path} type="button" className="item" onClick={() => C.openRecent(r)}>
                <FileText aria-hidden="true" /><span className="tx"><b>{r.name}</b><small>{r.path}</small></span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ScrollTop() {
  const t = useT();
  const on = useApp((s) => s.scrolled && s.activeId !== null);
  return <button type="button" className={cx('fab-top', on && 'on')} data-tip={t('scroll_top')} aria-label={t('scroll_top')} tabIndex={on ? 0 : -1} onClick={C.scrollTop}><ArrowUp /></button>;
}
export { docName };
