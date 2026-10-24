import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronUp } from 'lucide-react';
import { useExplorer, getView, selectIndex, selectGroup, clearSelection, setSelection, openEntry, newTab, setLayout, commitRename, cancelRename, setActivePane, runPaste } from '../store/explorer';
import { useSettings, type ColId } from '../store/settings';
import { showMenu } from '../store/ui';
import { layoutOf, shownName, typeLabel, type GroupInfo } from '../lib/view';
import { fmtDate, fmtSize } from '../lib/format';
import { uiScale } from '../lib/theme';
import { useT } from '../lib/i18n';
import type { Entry, PaneId, TagId } from '../lib/types';
import { FileIcon, Thumb } from './FileIcon';
import { beginDrag, isDragging } from '../lib/dnd';
import { backgroundMenuItems, columnMenuItems, itemMenuItems, COL_ORDER, TAGS } from '../lib/menus';
import { parentOf, pk, isVirtual } from '../lib/paths';
import { EmptyState } from './EmptyState';

export const gridInfo: Record<PaneId, { cols: number }> = { a: { cols: 1 }, b: { cols: 1 } };
const TILE = { large: { w: 156, h: 178, thumb: 116, icon: 52 }, grid: { w: 124, h: 140, thumb: 84, icon: 38 }, small: { w: 100, h: 110, thumb: 58, icon: 28 } } as const;
const GAP = 6, PAD = 12;

interface Pos { i: number; x: number; y: number; w: number; h: number }
interface GroupPos extends GroupInfo { y: number; h: number }

const tagColor = (id: TagId) => TAGS.find((x) => x.id === id)?.color || '#999';
const TagDots = memo(function TagDots({ tags, className = '' }: { tags: TagId[]; className?: string }) {
  return <span className={`flex flex-none items-center gap-0.5 ${className}`}>{tags.map((tg) => <i key={tg} className="tag-dot" style={{ background: tagColor(tg) }} />)}</span>;
});

interface ItemProps { e: Entry; i: number; pos: Pos; sel: boolean; focus: boolean; cut: boolean; renaming: boolean; checks: boolean; showExt: boolean; tags: TagId[] | undefined; cols: ColId[]; lang: string; search: boolean; delay: number; tipSig: string; id: PaneId }

function RenameInput({ id, e }: { id: PaneId; e: Entry }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.focus(); const dot = !e.isDir && e.name.lastIndexOf('.') > 0 ? e.name.lastIndexOf('.') : e.name.length; el.setSelectionRange(0, dot);
  }, [e]);
  const finish = (commit: boolean) => { if (done.current) return; done.current = true; if (commit) void commitRename(id, e.path, ref.current?.value.trim() || ''); else cancelRename(id); };
  return <input ref={ref} defaultValue={e.name} spellCheck={false} aria-label="Rename" data-rename
    className="h-7 min-w-0 flex-1 rounded-lg bg-surface px-2 text-[inherit] ring-2 ring-primary outline-none"
    onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); finish(true); } else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); } }}
    onBlur={() => finish(true)} onPointerDown={(ev) => ev.stopPropagation()} onDoubleClick={(ev) => ev.stopPropagation()} />;
}

const Check_ = ({ on }: { on: boolean }) => (
  <span data-chk className={`grid size-5 flex-none place-items-center rounded-md border-2 transition-all duration-200 ${on ? 'border-primary bg-primary text-on-primary' : 'border-outline opacity-0 group-hover/row:opacity-100'}`}>{on && <Check className="size-3.5" strokeWidth={3.5} />}</span>
);

const Row = memo(function Row({ e, i, pos, sel, focus, cut, renaming, checks, showExt, tags, cols, lang, search, delay, tipSig, id }: ItemProps) {
  const tip = tipSig;
  return (
    <div role="option" aria-selected={sel} data-i={i} data-drop-path={e.isDir ? e.path : undefined} title={tip}
      className={`row-item group/row absolute grid items-center rounded-xl px-3 ${sel ? 'sel' : ''} ${focus ? 'focus' : ''} ${cut ? 'cut' : ''} ${e.hidden ? 'opacity-60' : ''} ${delay >= 0 ? 'anim-item' : ''}`}
      style={{ top: pos.y, height: pos.h, left: 6, right: 6, gridTemplateColumns: 'var(--cols)', animationDelay: delay > 0 ? delay + 'ms' : undefined }}>
      <div className="flex min-w-0 items-center gap-2.5 pr-3">
        {checks && <Check_ on={sel} />}
        <FileIcon entry={e} size={22} />
        {renaming ? <RenameInput id={id} e={e} /> : <span className="truncate" data-nm>{shownName(e, showExt)}</span>}
        {tags && <TagDots tags={tags} />}
      </div>
      {cols.map((c) => c === 'size' ? <div key={c} className="pr-4 text-right text-on-surface-variant tabular-nums">{e.isDir ? '' : fmtSize(e.size)}</div>
        : c === 'type' && search ? <div key={c} className="truncate pr-3 text-on-surface-variant" title={parentOf(e.path) || ''}>{parentOf(e.path) || ''}</div>
        : <div key={c} className="truncate pr-3 text-on-surface-variant">{c === 'modified' ? fmtDate(e.modified, lang) : c === 'created' ? fmtDate(e.created, lang) : typeLabel(e, lang)}</div>)}
    </div>
  );
});

const Tile = memo(function Tile({ e, i, pos, sel, focus, cut, renaming, checks, showExt, tags, delay, tipSig, id, mode, thumbs }: ItemProps & { mode: keyof typeof TILE; thumbs: boolean }) {
  const T = TILE[mode];
  return (
    <div role="option" aria-selected={sel} data-i={i} data-drop-path={e.isDir ? e.path : undefined} title={tipSig}
      className={`row-item tile group/row absolute flex flex-col items-center rounded-2xl px-1.5 pt-2 ${sel ? 'sel' : ''} ${focus ? 'focus' : ''} ${cut ? 'cut' : ''} ${e.hidden ? 'opacity-60' : ''} ${delay >= 0 ? 'anim-item' : ''}`}
      style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h, animationDelay: delay > 0 ? delay + 'ms' : undefined }}>
      {checks && <span className="absolute top-2 left-2 z-10"><Check_ on={sel} /></span>}
      <div className="tile-thumb relative grid flex-none place-items-center overflow-hidden" style={{ width: T.thumb, height: T.thumb * 0.86 }}>
        {e.isDir ? <FileIcon entry={e} size={T.icon * 1.15} /> : <Thumb entry={e} size={mode === 'large' ? 256 : 160} iconSize={T.icon} big={mode === 'large'} enabled={thumbs} />}
        {tags && <TagDots tags={tags} className="absolute right-1.5 bottom-1.5" />}
      </div>
      <div className="mt-1.5 w-full px-0.5 text-center">
        {renaming ? <RenameInput id={id} e={e} /> : <span className="line-clamp-2 break-words text-[0.8125rem] leading-[1.15rem]" data-nm>{shownName(e, showExt)}</span>}
      </div>
    </div>
  );
});

export function FileList({ id }: { id: PaneId }) {
  const t = useT();
  const path = useExplorer((s) => s.panes[id].path);
  const entries = useExplorer((s) => s.panes[id].entries);
  const filter = useExplorer((s) => s.panes[id].filter);
  const kind = useExplorer((s) => s.panes[id].kind);
  const selected = useExplorer((s) => s.panes[id].selected);
  const focusPath = useExplorer((s) => s.panes[id].focus);
  const renaming = useExplorer((s) => s.panes[id].renaming);
  const search = useExplorer((s) => s.panes[id].search);
  const reveal = useExplorer((s) => s.panes[id].reveal);
  const loading = useExplorer((s) => s.panes[id].loading);
  const clip = useExplorer((s) => s.clip);
  const S = useSettings();
  const L = layoutOf(S, path);
  const view = useMemo(() => getView(id), [id, entries, filter, kind, S.showHidden, L.sortKey, L.sortDir, L.groupBy, S.lang, S.tags]); // eslint-disable-line react-hooks/exhaustive-deps
  const scale = uiScale(S.fontSize);
  const isGrid = L.view !== 'details';
  const mode = (L.view === 'details' ? 'grid' : L.view) as keyof typeof TILE;

  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ top: 0, h: 600, w: 800 });
  useLayoutEffect(() => {
    const el = scroller.current; if (!el) return;
    const upd = () => setVp((v) => (v.h === el.clientHeight && v.w === el.clientWidth ? v : { ...v, h: el.clientHeight, w: el.clientWidth }));
    upd(); const ro = new ResizeObserver(upd); ro.observe(el); return () => ro.disconnect();
  }, []);
  const raf = useRef(0);
  const onScroll = () => { if (raf.current) return; raf.current = requestAnimationFrame(() => { raf.current = 0; const el = scroller.current; if (el) setVp((v) => (v.top === el.scrollTop ? v : { ...v, top: el.scrollTop })); }); };

  const cols = useMemo(() => COL_ORDER.filter((c) => S.cols.includes(c)), [S.cols]);
  const colsTemplate = useMemo(() => ['minmax(220px, 1fr)', ...cols.map((c) => S.colW[c] + 'px')].join(' '), [cols, S.colW]);
  const minWidth = 220 + cols.reduce((n, c) => n + S.colW[c], 0) + 24;
  const headH = Math.round(40 * scale);

  /* geometry of every item, so rendering can be virtualised and the marquee can hit-test */
  const geo = useMemo(() => {
    const items: Pos[] = new Array(view.list.length);
    const groups: GroupPos[] = [];
    let y = 4;
    if (!isGrid) {
      const rowH = Math.round((S.density === 'compact' ? 32 : 40) * scale); const gh = Math.round(36 * scale);
      view.list.forEach((_, i) => {
        const g = view.groups.get(i); if (g) { groups.push({ ...g, y, h: gh }); y += gh; }
        items[i] = { i, x: 0, y, w: 0, h: rowH }; y += rowH;
      });
      return { items, groups, total: y + 8, cols: 1 };
    }
    const T = TILE[mode]; const tw = Math.round(T.w * scale), th = Math.round(T.h * scale), gh = Math.round(40 * scale);
    const avail = Math.max(tw, vp.w - PAD * 2);
    const nc = Math.max(1, Math.floor((avail + GAP) / (tw + GAP)));
    let col = 0;
    view.list.forEach((_, i) => {
      const g = view.groups.get(i);
      if (g) { if (col !== 0) { y += th + GAP; col = 0; } groups.push({ ...g, y, h: gh }); y += gh; }
      items[i] = { i, x: PAD + col * (tw + GAP), y, w: tw, h: th };
      col++; if (col === nc) { col = 0; y += th + GAP; }
    });
    if (col !== 0) y += th + GAP;
    return { items, groups, total: y + 8, cols: nc };
  }, [view, isGrid, mode, scale, S.density, vp.w]);
  gridInfo[id].cols = geo.cols;

  /* visible window */
  const over = 320;
  const lo = vp.top - over, hi = vp.top + vp.h + over;
  const first = useMemo(() => { let a = 0, b = geo.items.length; while (a < b) { const m = (a + b) >> 1; if (geo.items[m].y + geo.items[m].h < lo) a = m + 1; else b = m; } return a; }, [geo, lo]);
  const visible: Pos[] = [];
  for (let k = first; k < geo.items.length && geo.items[k].y <= hi; k++) visible.push(geo.items[k]);
  const visGroups = geo.groups.filter((g) => g.y + g.h >= lo && g.y <= hi);

  /* keep the revealed item in view */
  useEffect(() => {
    if (!reveal) return;
    const i = view.index.get(reveal.path); const el = scroller.current; if (i === undefined || !el) return;
    const p = geo.items[i]; const top = p.y + headH, bottom = p.y + p.h + headH;
    if (top - headH < el.scrollTop) el.scrollTop = Math.max(0, top - headH - 8);
    else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight + 8;
  }, [reveal]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [path]);

  const cutSet = useMemo(() => new Set(clip?.cut ? clip.paths : []), [clip]);
  const tipOf = (e: Entry) => [e.name, typeLabel(e, S.lang), e.isDir ? '' : fmtSize(e.size, true), fmtDate(e.modified, S.lang)].filter(Boolean).join('\n');

  /* ------------------------------------------------------------- interaction */
  const pending = useRef<number | null>(null);
  const indexOf = (el: EventTarget | null) => { const n = (el as HTMLElement | null)?.closest<HTMLElement>('[data-i]'); return n ? +(n.dataset.i as string) : -1; };
  const onPointerDown = (ev: React.PointerEvent) => {
    setActivePane(id);
    if (ev.button !== 0) return;
    const tgt = ev.target as HTMLElement;
    if (tgt.closest('[data-rename]')) return;
    const i = indexOf(tgt);
    const mod = ev.ctrlKey || ev.metaKey;
    if (i >= 0) {
      const e = view.list[i];
      if (tgt.closest('[data-chk]')) { selectIndex(id, i, { ctrl: true }); return; }
      const wasSel = useExplorer.getState().panes[id].selected.has(e.path);
      pending.current = null;
      if (mod || ev.shiftKey) selectIndex(id, i, { ctrl: mod, shift: ev.shiftKey });
      else if (!wasSel) selectIndex(id, i);
      else { pending.current = i; useExplorer.setState((s) => ({ panes: { ...s.panes, [id]: { ...s.panes[id], focus: e.path } } })); }
      const paths = [...useExplorer.getState().panes[id].selected];
      if (!mod && !ev.shiftKey && !paths.includes(e.path)) paths.push(e.path);
      beginDrag(ev, paths, (target, copy) => { pending.current = null; void runPaste(paths, target, !copy); });
      return;
    }
    // blank area: rubber-band selection
    if (isVirtual(path) || !view.list.length) return;
    const sc = scroller.current!; const rect = sc.getBoundingClientRect();
    if (ev.clientX > rect.right - 14 || ev.clientY > rect.bottom - 14 || ev.clientY < rect.top + headH && !isGrid) return;
    startMarquee(ev, mod);
  };
  const onPointerUp = (ev: React.PointerEvent) => {
    if (pending.current !== null && !isDragging()) { const i = pending.current; pending.current = null; if (!ev.ctrlKey && !ev.shiftKey) selectIndex(id, i); }
    pending.current = null;
  };
  const marquee = useRef<HTMLDivElement>(null);
  const justMarquee = useRef(false);
  const startMarquee = (ev: React.PointerEvent, additive: boolean) => {
    const sc = scroller.current!; const bodyEl = body.current!;
    const base = additive ? new Set(useExplorer.getState().panes[id].selected) : new Set<string>();
    const br = bodyEl.getBoundingClientRect(); const x0 = ev.clientX - br.left, y0 = ev.clientY - br.top;
    let started = false; let cx = ev.clientX, cy = ev.clientY; let rafId = 0;
    const apply = () => {
      rafId = 0;
      const b = bodyEl.getBoundingClientRect(); const x1 = cx - b.left, y1 = cy - b.top;
      const l = Math.min(x0, x1), tp = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
      const m = marquee.current; if (m) Object.assign(m.style, { display: 'block', left: l + 'px', top: tp + 'px', width: w + 'px', height: h + 'px' });
      const next = new Set(base); const bw = bodyEl.clientWidth;
      for (const p of geo.items) {
        if (p.y > tp + h) break;
        const px = isGrid ? p.x : 6, pw = isGrid ? p.w : bw - 12;
        if (p.y + p.h > tp && px < l + w && px + pw > l) next.add(view.list[p.i].path);
      }
      setSelection(id, next, null);
      const r = sc.getBoundingClientRect();
      if (cy < r.top + headH + 24) sc.scrollTop -= 14; else if (cy > r.bottom - 24) sc.scrollTop += 14;
    };
    const move = (e: PointerEvent) => {
      cx = e.clientX; cy = e.clientY;
      if (!started) { if (Math.hypot(cx - ev.clientX, cy - ev.clientY) < 5) return; started = true; sc.focus({ preventScroll: true }); }
      if (!rafId) rafId = requestAnimationFrame(apply);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      if (rafId) cancelAnimationFrame(rafId);
      if (marquee.current) marquee.current.style.display = 'none';
      if (started) { justMarquee.current = true; window.setTimeout(() => { justMarquee.current = false; }, 0); }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const onClick = (ev: React.MouseEvent) => {
    if (justMarquee.current) { justMarquee.current = false; return; }
    const tgt = ev.target as HTMLElement;
    if (tgt.closest('[data-i], [data-g], [data-head], [data-rename]')) return;
    if (!ev.ctrlKey && !ev.metaKey) clearSelection(id);
  };
  const onDouble = (ev: React.MouseEvent) => { const i = indexOf(ev.target); if (i >= 0) void openEntry(view.list[i], id); };
  const onAux = (ev: React.MouseEvent) => { if (ev.button !== 1) return; const i = indexOf(ev.target); const e = i >= 0 ? view.list[i] : null; if (e?.isDir) { ev.preventDefault(); void newTab(id, e.path); } };
  const onContext = (ev: React.MouseEvent) => {
    ev.preventDefault(); setActivePane(id);
    if ((ev.target as HTMLElement).closest('[data-head]')) { showMenu(columnMenuItems(), ev.clientX, ev.clientY); return; }
    const i = indexOf(ev.target);
    if (i >= 0) { if (!selected.has(view.list[i].path)) selectIndex(id, i); showMenu(itemMenuItems(id), ev.clientX, ev.clientY); }
    else if (path !== null) showMenu(backgroundMenuItems(id), ev.clientX, ev.clientY);
  };

  const sortBy = (k: string) => {
    const same = L.sortKey === k;
    setLayout(path, { sortKey: k as never, sortDir: same && L.sortDir === 'asc' ? 'desc' : 'asc' });
  };
  const resize = (ev: React.PointerEvent, col: ColId) => {
    ev.preventDefault(); ev.stopPropagation();
    const startX = ev.clientX, start = S.colW[col]; const el = ev.currentTarget as HTMLElement; el.setPointerCapture(ev.pointerId);
    const move = (e: PointerEvent) => S.set({ colW: { ...useSettings.getState().colW, [col]: Math.max(70, Math.min(600, Math.round(start + e.clientX - startX))) } });
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  };

  const colLabel = (c: ColId) => (c === 'type' && search ? t('col.location') : t('col.' + c));
  const headCell = (cid: 'name' | ColId) => {
    const sorted = L.sortKey === cid;
    return (
      <button key={cid} type="button" data-head onClick={() => sortBy(cid)} className={`group/h relative flex h-full min-w-0 items-center gap-1 px-1 text-left font-semibold text-on-surface-variant transition-colors hover:text-on-surface ${cid === 'size' ? 'justify-end pr-5' : ''} ${sorted ? '!text-primary' : ''}`}>
        <span className="truncate">{cid === 'name' ? t('col.name') : colLabel(cid)}</span>
        <ChevronUp className={`size-4 flex-none transition-transform duration-300 ${sorted ? 'opacity-100' : 'opacity-0'} ${sorted && L.sortDir === 'desc' ? 'rotate-180' : ''}`} />
        {cid !== 'name' && <i onPointerDown={(e) => resize(e, cid)} onClick={(e) => e.stopPropagation()} className="absolute top-1.5 right-0 bottom-1.5 w-2 cursor-col-resize after:absolute after:inset-y-0 after:left-1 after:w-px after:bg-outline-variant hover:after:w-0.5 hover:after:bg-primary" />}
      </button>
    );
  };

  const empty = view.list.length === 0;
  const dropPath = path && !isVirtual(path) ? path : undefined;
  return (
    <div ref={scroller} tabIndex={0} role="listbox" aria-multiselectable aria-label={t('list.aria')} data-list={id} data-drop-path={dropPath}
      className="relative h-full overflow-auto outline-none" onScroll={onScroll}
      onPointerDown={onPointerDown} onPointerUp={onPointerUp} onClick={onClick} onDoubleClick={onDouble} onAuxClick={onAux} onContextMenu={onContext}
      style={{ ['--cols' as string]: colsTemplate }}>
      {!isGrid && (
        <div className="sticky top-0 z-20 grid items-center border-b border-outline-variant/60 bg-surface px-[18px]" style={{ height: headH, gridTemplateColumns: 'var(--cols)', minWidth }}>
          {headCell('name')}{cols.map(headCell)}
        </div>
      )}
      <div ref={body} className="relative" style={{ height: empty ? 'auto' : geo.total, minWidth: isGrid ? undefined : minWidth }}>
        {visGroups.map((g) => (
          <button key={'g' + g.start} type="button" data-g onClick={(e) => selectGroup(id, g.start, g.count, e.ctrlKey || e.metaKey)}
            className="absolute flex items-center gap-2 rounded-xl px-4 font-semibold text-primary transition-colors hover:bg-primary/10" style={{ top: g.y, height: g.h, left: isGrid ? PAD : 6, right: isGrid ? PAD : 6 }}>
            {g.label}<span className="rounded-full bg-primary/15 px-2 text-xs">{g.count}</span>
          </button>
        ))}
        {visible.map((p) => {
          const e = view.list[p.i];
          const props: ItemProps = {
            e, i: p.i, pos: p, sel: selected.has(e.path), focus: focusPath === e.path, cut: cutSet.has(e.path), renaming: renaming === e.path,
            checks: S.showChecks, showExt: S.showExt, tags: S.tags[pk(e.path)], cols, lang: S.lang, search: !!search, delay: p.i < 18 ? p.i * 12 : -1, tipSig: tipOf(e), id
          };
          return isGrid ? <Tile key={e.path} {...props} mode={mode} thumbs={S.thumbnails} /> : <Row key={e.path} {...props} />;
        })}
        <div ref={marquee} className="marquee" style={{ display: 'none' }} />
      </div>
      {empty && (loading || (!path && !entries.length)) && (
        <div className="absolute inset-x-0 top-12 space-y-2 px-4" aria-hidden>{Array.from({ length: 9 }, (_, k) => <div key={k} className="skeleton h-9" style={{ opacity: 1 - k * 0.09, animationDelay: k * 60 + 'ms' }} />)}</div>
      )}
      {empty && !loading && path !== null && (
        <div className="absolute inset-0 top-10"><EmptyState kind={search || filter || kind !== 'all' ? 'search' : 'folder'} title={search || filter || kind !== 'all' ? t('empty.search') : t('empty.folder')} desc={search || filter || kind !== 'all' ? t('empty.searchHint') : t('empty.folderHint')} /></div>
      )}
    </div>
  );
}
