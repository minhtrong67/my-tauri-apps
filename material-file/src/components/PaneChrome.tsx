import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ChevronRight, Copy, Filter, History, FolderClosed, HardDrive, Home, LayoutGrid, List, Monitor, PanelRight, Columns2, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useExplorer, moveTab, activeTab, goBack, goForward, goUp, refresh, navigate, newTab, closeTab, switchTab, setFilter, deepSearch, clearSearch, copyText, getView, setLayout, setActivePane } from '../store/explorer';
import { useSettings } from '../store/settings';
import { openModal, showMenu } from '../store/ui';
import { useT } from '../lib/i18n';
import { api } from '../lib/api';
import { baseName, crumbsOf, HOME, isVirtual, parentOf, samePath } from '../lib/paths';
import { IconButton } from './ui/Buttons';
import { historyItems, toggleDual } from '../lib/menus';
import { layoutOf } from '../lib/view';
import { fmtSize } from '../lib/format';
import { PLACE_ICON, driveLabel } from './Pages';
import type { MenuItem } from '../store/ui';
import type { PaneId } from '../lib/types';

/* ------------------------------------------------------------------ tabs */
export function TabsBar({ id }: { id: PaneId }) {
  const t = useT();
  const tabs = useExplorer((s) => s.panes[id].tabs); const active = useExplorer((s) => s.panes[id].active); const places = useExplorer((s) => s.places);
  const title = (p: string | null) => (p === HOME ? t('place.home') : p === null || p === '' ? t('place.thispc') : baseName(p));
  const icon = (p: string | null) => {
    if (p === HOME) return <Home className="size-4" />;
    if (p === null || p === '') return <Monitor className="size-4" />;
    if (parentOf(p) === '') return <HardDrive className="size-4" />;
    const pl = places.find((x) => samePath(x.path, p)); const I = pl ? PLACE_ICON[pl.id] : null;
    return I ? <I className="size-4" /> : <FolderClosed className="size-4" style={{ color: 'var(--folder)' }} />;
  };
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  /** Press and drag a tab sideways to reorder; the tab being dragged lifts and the others slide aside. */
  const startDrag = (e: React.PointerEvent, from: number) => {
    if (e.button !== 0 || tabs.length < 2 || (e.target as HTMLElement).closest('button')) return;
    const sx = e.clientX; let cur = from; let on = false;
    const move = (ev: PointerEvent) => {
      if (!on) { if (Math.abs(ev.clientX - sx) < 6) return; on = true; setDragging(cur); document.body.style.cursor = 'grabbing'; }
      const kids = [...(ref.current?.children || [])] as HTMLElement[];
      let to = cur;
      kids.forEach((k, i) => { const r = k.getBoundingClientRect(); if (ev.clientX > r.left && ev.clientX < r.right) to = i; });
      if (to !== cur) { moveTab(id, cur, to); cur = to; setDragging(to); }
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.cursor = ''; setDragging(null); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  useEffect(() => { ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }, [active, tabs.length]);
  return (
    <div className="flex h-11 flex-none items-end gap-1 px-2 pt-1.5">
      <div ref={ref} role="tablist" className="flex min-w-0 items-end gap-1 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((tb, i) => (
          <div key={tb.id} role="tab" aria-selected={i === active} title={tb.path || t('place.thispc')} onPointerDown={(e) => { startDrag(e, i); if (e.button === 0) { setActivePane(id); void switchTab(id, i); } if (e.button === 1) { e.preventDefault(); void closeTab(id, i); } }}
            className={`group/tab relative flex h-9 min-w-[6.5rem] max-w-[15rem] shrink grow-0 basis-44 items-center gap-2 rounded-t-2xl px-3 transition-[background-color,border-radius] duration-300 ${tb.isNew ? 'animate-[tab-in_.4s_var(--spring)]' : ''} ${dragging === i ? 'z-10 scale-[1.04] bg-primary-container shadow-[var(--shadow-2)]' : ''} transition-transform ${i === active ? 'bg-surface-container font-semibold text-on-surface' : 'text-on-surface-variant hover:bg-on-surface/8'}`}>
            <span className={i === active ? 'text-primary' : ''}>{icon(tb.path)}</span>
            <span className="min-w-0 flex-1 truncate">{title(tb.path)}</span>
            {tabs.length > 1 && <button type="button" tabIndex={-1} aria-label={t('tab.close')} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); void closeTab(id, i); }} className={`ibtn sm !size-6 flex-none ${i === active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100"}`}><X className="!size-3.5" /></button>}
          </div>
        ))}
      </div>
      <IconButton icon={Plus} label={t('tab.new')} kbd="Ctrl+T" small onClick={() => void newTab(id)} className="mb-0.5" />
    </div>
  );
}

/* --------------------------------------------------------------- nav + address */
export function NavBar({ id }: { id: PaneId }) {
  const t = useT();
  const path = useExplorer((s) => s.panes[id].path); const tab = useExplorer((s) => activeTab(s.panes[id])); const drives = useExplorer((s) => s.drives);
  const search = useExplorer((s) => s.panes[id].search); const filter = useExplorer((s) => s.panes[id].filter);
  const [editing, setEditing] = useState(false); const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const history = useSettings((s) => s.searchHistory);
  const crumbsRef = useRef<HTMLDivElement>(null); const timer = useRef(0);
  useEffect(() => { if (!filter && !search) setQ(''); }, [filter, search, path]);
  useEffect(() => { const c = crumbsRef.current; if (c) c.scrollLeft = c.scrollWidth; }, [path, editing]);
  const real = path !== null && !isVirtual(path);
  const crumbs = real ? crumbsOf(path, (p) => drives.find((d) => samePath(d.path, p))?.name) : [];
  const beginEdit = () => { setText(real ? (path as string) : ''); setEditing(true); };
  const submit = async () => {
    const v = text.trim().replace(/^"|"$/g, ''); setEditing(false);
    if (v === '') await navigate(id, HOME); else if (['this pc', 'máy tính này'].includes(v.toLowerCase())) await navigate(id, ''); else await navigate(id, v);
    document.querySelector<HTMLElement>(`[data-list="${id}"]`)?.focus();
  };
  const subMenu = async (ev: React.MouseEvent<HTMLElement>, p: string) => {
    const el = ev.currentTarget; let items: MenuItem[] = [];
    try {
      if (p === '') items = drives.map((d) => ({ label: driveLabel(d, t), icon: HardDrive, run: () => navigate(id, d.path) }));
      else {
        const hidden = useSettings.getState().showHidden;
        const list = await api.listDir(p);
        items = list.filter((e) => e.isDir && (hidden || !e.hidden)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).slice(0, 300).map((e) => ({ label: e.name, icon: FolderClosed, run: () => navigate(id, e.path) }));
      }
    } catch { return; }
    if (items.length) { const r = el.getBoundingClientRect(); showMenu(items, r.left, r.bottom + 4, r.right); }
  };
  const onSearch = (v: string) => { setQ(v); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setFilter(id, v.trim()), 90); };
  return (
    <div className="flex flex-none items-center gap-1 bg-surface-container px-2 pb-2">
      <IconButton icon={ArrowLeft} label={t('nav.back')} kbd="Alt+←" disabled={!tab.back.length} onClick={() => void goBack(id)} onContextMenu={(e) => { e.preventDefault(); const it = historyItems(id, 'back'); if (it.length) { const r = e.currentTarget.getBoundingClientRect(); showMenu(it, r.left, r.bottom + 4, r.right); } }} />
      <IconButton icon={ArrowRight} label={t('nav.forward')} kbd="Alt+→" disabled={!tab.fwd.length} onClick={() => void goForward(id)} onContextMenu={(e) => { e.preventDefault(); const it = historyItems(id, 'fwd'); if (it.length) { const r = e.currentTarget.getBoundingClientRect(); showMenu(it, r.left, r.bottom + 4, r.right); } }} />
      <IconButton icon={ArrowUp} label={t('nav.up')} kbd="Alt+↑" disabled={!path || path === '' || path === HOME} onClick={() => goUp(id)} />
      <IconButton icon={RefreshCw} label={t('nav.refresh')} kbd="F5" onClick={() => void refresh(id)} />
      <div className="relative mx-1 flex h-10 min-w-0 flex-1 items-center rounded-[1.25rem] bg-surface-highest pr-1 pl-3 transition-[border-radius,box-shadow] duration-300 focus-within:rounded-2xl focus-within:ring-2 focus-within:ring-primary" onClick={(e) => { if (!(e.target as HTMLElement).closest('button') && !editing) beginEdit(); }}>
        {editing ? (
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} placeholder={t('address.placeholder')} aria-label={t('address.placeholder')}
            className="h-full min-w-0 flex-1 bg-transparent outline-none" onFocus={(e) => e.currentTarget.select()} onBlur={() => setEditing(false)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); void submit(); } else if (e.key === 'Escape') { setEditing(false); document.querySelector<HTMLElement>(`[data-list="${id}"]`)?.focus(); } }} />
        ) : (
          <div ref={crumbsRef} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
            <button type="button" data-drop-path="" onClick={() => void navigate(id, '')} className="ibtn sm !size-7 flex-none" aria-label={t('place.thispc')}><Monitor /></button>
            {path === HOME ? <span className="px-2 font-semibold">{t('place.home')}</span> : path === '' ? <span className="px-2 font-semibold">{t('place.thispc')}</span> :
              crumbs.map((c, i) => (
                <span key={c.path} className="flex items-center">
                  <button type="button" aria-label="Subfolders" onClick={(e) => void subMenu(e, i === 0 ? '' : crumbs[i - 1].path)} className="ibtn sm !size-6"><ChevronRight className="!size-4" /></button>
                  <button type="button" data-drop-path={c.path} onClick={() => void navigate(id, c.path)} className="ripple rounded-[0.875rem] px-2 py-0.5 font-medium transition-[border-radius] duration-300 hover:rounded-lg">{c.label}</button>
                </span>
              ))}
          </div>
        )}
        {real && !editing && <IconButton icon={Copy} label={t('cmd.copyPathBtn')} small onClick={() => void copyText(path as string)} />}
      </div>
      <div className="relative flex h-10 w-[min(17rem,28%)] min-w-[9rem] items-center rounded-[1.25rem] bg-surface-highest pr-1 pl-3 transition-[border-radius,box-shadow,width] duration-300 focus-within:rounded-2xl focus-within:ring-2 focus-within:ring-primary">
        <Search className="mr-2 size-[1.125rem] flex-none text-on-surface-variant" />
        <input data-search={id} value={q} disabled={!real} onChange={(e) => onSearch(e.target.value)} spellCheck={false}
          placeholder={real ? t('search.in', { folder: baseName(path as string) }) : t('search.placeholder')} aria-label={t('search.placeholder')}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-on-surface-variant/80" onFocus={() => setFocus(true)} onBlur={() => window.setTimeout(() => setFocus(false), 120)}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); window.clearTimeout(timer.current); void deepSearch(id, q.trim()); } else if (e.key === 'Escape') { e.preventDefault(); setQ(''); clearSearch(id); (e.currentTarget.closest('[data-pane]')?.querySelector('[data-list]') as HTMLElement | null)?.focus(); } }} />
        {focus && !q && history.length > 0 && (
          <div className="anim-menu absolute top-12 right-0 left-0 z-40 rounded-2xl bg-surface-container-high p-1.5 shadow-[var(--shadow-3)] ring-1 ring-outline-variant/60" onPointerDown={(e) => e.preventDefault()}>
            <div className="flex items-center justify-between px-3 py-1 text-xs font-bold tracking-wide text-primary uppercase">{t('search.recent')}<button type="button" className="rounded-full px-2 normal-case hover:bg-primary/10" onClick={() => useSettings.getState().set({ searchHistory: [] })}>{t('search.clearHistory')}</button></div>
            {history.slice(0, 8).map((h) => <button key={h} type="button" className="ripple flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left hover:bg-on-surface/8" onClick={() => { setQ(h); void deepSearch(id, h); setFocus(false); }}><History className="size-4 text-on-surface-variant" /><span className="truncate">{h}</span></button>)}
          </div>
        )}
        {q && <IconButton icon={X} label={t('search.clear')} small onClick={() => { setQ(''); clearSearch(id); }} />}
        <IconButton icon={Filter} label={t('cmd.advSearch')} kbd="Ctrl+Shift+F" small disabled={!real} onClick={() => openModal('search')} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- status */
export function StatusBar({ id }: { id: PaneId }) {
  const t = useT();
  const entries = useExplorer((s) => s.panes[id].entries); const selected = useExplorer((s) => s.panes[id].selected); const path = useExplorer((s) => s.panes[id].path);
  const search = useExplorer((s) => s.panes[id].search); const filter = useExplorer((s) => s.panes[id].filter); const kind = useExplorer((s) => s.panes[id].kind);
  const S = useSettings(); const L = layoutOf(S, path);
  const n = getView(id).list.length; // recomputed on every render of the status bar (cheap: memoised)
  void entries; void filter; void kind;
  const list = getView(id).list; let bytes = 0; let count = 0;
  if (selected.size) for (const e of list) if (selected.has(e.path)) { count++; if (!e.isDir) bytes += e.size; }
  const real = path !== null && !isVirtual(path);
  const drives = useExplorer((s) => s.drives);
  const drive = real ? drives.filter((d) => samePath(path as string, d.path) || (path as string).toLowerCase().startsWith(d.path.toLowerCase())).sort((a, b) => b.path.length - a.path.length)[0] : undefined;
  return (
    <div className="flex h-9 flex-none items-center gap-3 border-t border-outline-variant/50 bg-surface-container px-4 text-xs text-on-surface-variant">
      <span className="truncate">{search ? t('status.results', { n: n.toLocaleString() }) : real ? (n === 1 ? t('status.item') : t('status.items', { n: n.toLocaleString() })) : path === HOME ? t('status.hint') : ''}</span>
      {count > 0 && <span className="truncate font-medium text-primary">{t('status.selected', { n: count.toLocaleString() })}{bytes ? ' · ' + fmtSize(bytes, true) : ''}</span>}
      <span className="flex-1" />
      {drive && <span className="mr-1 flex items-center gap-1.5 max-[900px]:hidden" title={drive.path}><HardDrive className="size-3.5" />{t('status.free', { free: fmtSize(drive.free, true) })}</span>}
      {real && <>
        <IconButton icon={List} label={t('view.details')} kbd="Ctrl+1" small on={L.view === 'details'} side="top" onClick={() => setLayout(path, { view: 'details' })} />
        <IconButton icon={LayoutGrid} label={t('view.medium')} kbd="Ctrl+2" small on={L.view !== 'details'} side="top" onClick={() => setLayout(path, { view: L.view === 'details' ? 'grid' : L.view })} />
      </>}
      <IconButton icon={Columns2} label={t('view.dual')} kbd="F9" small on={S.dualPane} side="top" onClick={() => void toggleDual()} />
      <IconButton icon={PanelRight} label={t('view.detailsPane')} kbd="Alt+P" small on={S.showDetails} side="top" onClick={() => S.set({ showDetails: !S.showDetails })} />
    </div>
  );
}
