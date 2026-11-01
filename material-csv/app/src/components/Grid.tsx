// Virtualised spreadsheet grid: only the visible rows and columns exist in the DOM.
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, ChevronDown, Filter } from 'lucide-react';
import { app, cur, useApp, visCols, colIsNum, setSel, startEdit, commitEditing, cancelEditing, bindEditorValue, emit, type Doc } from '../lib/store';
import { rect } from '../lib/ops';
import { run } from '../lib/commands';
import { setSort, toggleSort, autoFitColumn, renameCol, viewChanged } from '../lib/actions';
import { openColMenu, openContext } from '../lib/menus';
import { sizeScale } from '../lib/theme';
import { t } from '../lib/i18n';
import { clamp } from '../lib/util';
import { ScrollTopFab, tip, cx } from './ui';

const BASE = { compact: 28, normal: 32, comfy: 42 } as const;
const OVERSCAN = 6;

interface RowProps {
  vi: number; row: string[]; si: number; cols: number[]; lefts: number[]; c0: number; c1: number; rnW: number; rowH: number; total: number;
  numKey: string; fNum: boolean; hits?: number[]; curVc: number; frozenW: number; rnHl: boolean; selFrozen: boolean;
}

const Row = memo(function Row(p: RowProps) {
  const { vi, row, si, cols, lefts, c0, c1, rnW, rowH, total, numKey, fNum, hits, curVc, frozenW, rnHl, selFrozen } = p;
  const cells: React.ReactElement[] = [];
  const start = frozenW ? Math.max(c0, 1) : c0;
  const cell = (i: number, frozen: boolean) => {
    const v = row[cols[i]] ?? '';
    const isNum = frozen ? fNum : numKey[i - c0] === '1';
    const hit = hits?.includes(i);
    const cls = cx('c', isNum && 'n', hit && 'hit', hit && curVc === i && 'cur', frozen && 'frozen', frozen && selFrozen && 'bg-primary-container/60');
    return <div key={i} className={cls} style={frozen ? { width: lefts[1] - lefts[0], left: rnW } : { left: rnW + lefts[i], width: lefts[i + 1] - lefts[i] }}><span>{v}</span></div>;
  };
  if (frozenW) cells.push(cell(0, true));
  for (let i = start; i <= c1; i++) cells.push(cell(i, false));
  return (
    <div className={cx('grow', vi % 2 && 'odd')} style={{ top: vi * rowH, width: total, height: rowH }} data-vi={vi}>
      <div className={cx('rn', rnHl && 'hl')} style={{ width: rnW }}>{si + 1}</div>
      {cells}
    </div>
  );
});

export function Grid() {
  useApp();
  const d = cur()!;
  const s = app.settings;
  const scroller = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ t: 0, l: 0, h: 600, w: 900 });
  const raf = useRef(0);

  /* ---- metrics ---- */
  const z = clamp(s.zoom, 60, 200) / 100 * sizeScale();
  const rowH = Math.round(BASE[s.density] * z), hdrH = Math.round((BASE[s.density] + 6) * z), fltH = Math.round((BASE[s.density] + 2) * z);
  const digits = String(Math.max(d.rows.length, 99)).length;
  const rnW = Math.round((digits * 8 + 30) * z);
  const cols = useMemo(() => visCols(d), [d.head, d.hidden]); // eslint-disable-line
  const lefts = useMemo(() => { const L = [0]; for (const c of cols) L.push(L[L.length - 1] + Math.round((d.widths[c] || 120) * z)); return L; }, [cols, d.widths, z]); // eslint-disable-line
  const total = rnW + lefts[lefts.length - 1];
  const hdrTotal = hdrH + (d.showFilterRow ? fltH : 0);
  const n = d.view.length;
  const frozen = d.freeze && cols.length > 1;
  const frozenW = frozen ? lefts[1] : 0;

  const colAtX = useCallback((x: number) => {
    let lo = 0, hi = lefts.length - 2;
    if (hi < 0) return -1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lefts[mid] <= x) lo = mid; else hi = mid - 1; }
    return lo;
  }, [lefts]);

  /* ---- visible window ---- */
  const vh = vp.h - hdrTotal;
  const first = clamp(Math.floor(vp.t / rowH) - OVERSCAN, 0, Math.max(0, n - 1));
  const last = Math.min(n - 1, Math.ceil((vp.t + vh) / rowH) + OVERSCAN);
  const c0 = cols.length ? clamp(colAtX(vp.l - rnW) - 1, 0, cols.length - 1) : 0;
  const c1 = cols.length ? clamp(colAtX(vp.l + vp.w - rnW) + 1, 0, cols.length - 1) : -1;

  const onScroll = () => {
    const el = scroller.current!;
    d.scroll = { top: el.scrollTop, left: el.scrollLeft };
    if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; setVp(v => (v.t === el.scrollTop && v.l === el.scrollLeft ? v : { ...v, t: el.scrollTop, l: el.scrollLeft })); });
  };
  useLayoutEffect(() => {
    const el = scroller.current!;
    const ro = new ResizeObserver(() => setVp(v => ({ ...v, h: el.clientHeight, w: el.clientWidth })));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // restore the scroll position when switching documents
  useLayoutEffect(() => { const el = scroller.current!; el.scrollTop = d.scroll.top; el.scrollLeft = d.scroll.left; setVp(v => ({ ...v, t: el.scrollTop, l: el.scrollLeft, h: el.clientHeight, w: el.clientWidth })); }, [d.id]); // eslint-disable-line

  /* ---- keep a requested cell in view ---- */
  useLayoutEffect(() => {
    const rq = app.scrollReq, el = scroller.current;
    if (!rq || !el) return;
    app.scrollReq = null;
    if (rq.vr < 0 || rq.vc < 0 || !cols.length) return;
    const top = rq.vr * rowH, bottom = top + rowH, h = el.clientHeight - hdrTotal;
    if (top < el.scrollTop) el.scrollTop = top; else if (bottom > el.scrollTop + h) el.scrollTop = bottom - h;
    const left = lefts[rq.vc], right = lefts[rq.vc + 1] + rnW;
    const fz = frozen && rq.vc > 0 ? frozenW : 0;
    if (left - fz < el.scrollLeft) el.scrollLeft = Math.max(0, left - fz); else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth;
  });

  // give the keyboard back to the grid after dialogs / editing
  useEffect(() => { const el = scroller.current; if (el && !app.editing && !document.querySelector('.scrim')) el.focus({ preventScroll: true }); }, [app.focusGrid, d.id]);

  /* ---- find highlights ---- */
  const f = app.find;
  const hitMap = useMemo(() => {
    const m = new Map<number, number[]>();
    if (!f.open || !f.q || !f.re) return m;
    for (const h of f.matches) { const a = m.get(h.vi); if (a) a.push(h.vc); else m.set(h.vi, [h.vc]); }
    return m;
  }, [f.matches, f.open, f.q, f.re]);
  const curHit = f.cur >= 0 ? f.matches[f.cur] : null;

  const sel = rect(d);
  const numFlags: string[] = [];
  for (let i = c0; i <= c1; i++) numFlags.push(colIsNum(d, cols[i]) ? '1' : '0');
  const numKey = numFlags.join('');

  /* ---- mouse ---- */
  const hit = (e: { clientX: number; clientY: number }) => {
    const el = scroller.current!, rc = el.getBoundingClientRect();
    const x = e.clientX - rc.left, y = e.clientY - rc.top;
    const ry = y - hdrTotal + el.scrollTop, cx0 = x + el.scrollLeft - rnW;
    let vc = cols.length ? clamp(colAtX(cx0), 0, cols.length - 1) : -1;
    if (frozen && x >= rnW && x < rnW + frozenW) vc = 0;
    return { x, y, inRn: x < rnW, inHdr: y < hdrTotal, scrollbar: x >= el.clientWidth || y >= el.clientHeight, vr: n ? clamp(Math.floor(ry / rowH), 0, n - 1) : -1, vc };
  };
  const inSel = (vr: number, vc: number, rowOnly = false) => !!sel && vr >= sel.r1 && vr <= sel.r2 && (rowOnly || (vc >= sel.c1 && vc <= sel.c2));

  const startDrag = (kind: 'cell' | 'row' | 'col') => {
    const el = scroller.current!;
    el.classList.add('dragging');
    let last: MouseEvent | null = null;
    const mv = (ev: MouseEvent) => { last = ev; };
    const tick = () => {
      if (!last) return;
      const rc = el.getBoundingClientRect(), dd = cur()!;
      let dx = 0, dy = 0;
      if (last.clientY > rc.bottom - 24) dy = Math.min(40, (last.clientY - rc.bottom + 24) / 2 + 6);
      else if (last.clientY < rc.top + hdrTotal + 16) dy = -Math.min(40, (rc.top + hdrTotal + 16 - last.clientY) / 2 + 6);
      if (last.clientX > rc.right - 24) dx = 18; else if (last.clientX < rc.left + rnW + 16) dx = -18;
      if (dx || dy) { el.scrollTop += dy; el.scrollLeft += dx; }
      const h = hit(last);
      if (kind === 'cell') { if (h.vr >= 0 && h.vc >= 0) setSel(dd.sel.ar, dd.sel.ac, h.vr, h.vc, { scroll: false }); }
      else if (kind === 'row') { if (h.vr >= 0) setSel(dd.sel.ar, 0, h.vr, cols.length - 1, { scroll: false }); }
      else if (h.vc >= 0) setSel(0, dd.sel.ac, n - 1, h.vc, { scroll: false });
    };
    const timer = setInterval(tick, 40);
    const up = () => { clearInterval(timer); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); el.classList.remove('dragging'); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  };

  const startResize = (e: React.MouseEvent, vi: number) => {
    e.preventDefault(); e.stopPropagation();
    const c = cols[vi], x0 = e.clientX, w0 = d.widths[c] || 120;
    let pending = 0;
    const mv = (ev: MouseEvent) => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; d.widths = d.widths.slice(); d.widths[c] = Math.max(48, Math.round(w0 + (ev.clientX - x0) / z)); emit(); });
    };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const tg = e.target as HTMLElement;
    if (tg.closest('input')) return;
    const h = hit(e);
    if (h.scrollbar) return;
    if (app.editing && tg.tagName !== 'TEXTAREA') commitEditing();
    if (tg.tagName === 'TEXTAREA') return;
    const act = tg.closest('[data-act]') as HTMLElement | null;
    if (act?.dataset.act === 'resize') return startResize(e, +(act.closest('.hcell') as HTMLElement).dataset.v!);
    if (act?.dataset.act === 'sort') { e.preventDefault(); return toggleSort(cols[+(act.closest('.hcell') as HTMLElement).dataset.v!]); }
    if (act?.dataset.act === 'menu') { e.preventDefault(); const vi = +(act.closest('.hcell') as HTMLElement).dataset.v!; if (!(sel && vi >= sel.c1 && vi <= sel.c2 && sel.r1 === 0)) setSel(0, vi, Math.max(0, n - 1), vi); return openColMenu(act); }
    scroller.current!.focus({ preventScroll: true });
    if (h.inHdr) {
      if (act?.dataset.act === 'all' || h.inRn) return run('edit.selectAll');
      if (tg.closest('.frow')) return;
      const vc = h.vc; if (vc < 0) return;
      if (e.button === 2) { if (!(sel && vc >= sel.c1 && vc <= sel.c2 && sel.r1 === 0 && sel.r2 === n - 1)) setSel(0, vc, n - 1, vc); return; }
      setSel(0, e.shiftKey ? d.sel.ac : vc, Math.max(0, n - 1), vc);
      startDrag('col');
      return;
    }
    if (h.vr < 0) return;
    if (h.inRn) {
      if (e.button === 2 && inSel(h.vr, 0, true)) return;
      setSel(e.shiftKey ? d.sel.ar : h.vr, 0, h.vr, cols.length - 1);
      startDrag('row');
      return;
    }
    if (e.button === 2 && inSel(h.vr, h.vc)) return;
    if (e.shiftKey) setSel(d.sel.ar, d.sel.ac, h.vr, h.vc); else setSel(h.vr, h.vc, h.vr, h.vc);
    if (e.button === 0) startDrag('cell');
  };

  const onDblClick = (e: React.MouseEvent) => {
    const tg = e.target as HTMLElement;
    if (tg.closest('input,.hb')) return;
    const h = hit(e);
    if (h.scrollbar) return;
    if (tg.closest('[data-act="resize"]')) return autoFitColumn(+(tg.closest('.hcell') as HTMLElement).dataset.v!);
    if (h.inHdr) { if (!h.inRn && !tg.closest('.frow')) renameCol(cols[h.vc]); return; }
    if (h.inRn || h.vr < 0) return;
    startEdit();
  };

  const onContext = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input')) return;
    e.preventDefault();
    const h = hit(e);
    if (h.scrollbar) return;
    openContext(e, h.inHdr ? 'col' : h.inRn ? 'row' : 'cell');
  };

  /* ---- keyboard ---- */
  const moveActive = (dr: number, dc: number, extend: boolean) => {
    const s0 = d.sel; if (s0.ar < 0) return;
    if (extend) setSel(s0.ar, s0.ac, s0.fr + dr, s0.fc + dc);
    else { const r = clamp(s0.fr + dr, 0, n - 1), c = clamp(s0.fc + dc, 0, cols.length - 1); setSel(r, c, r, c); }
  };
  const jump = (dir: number, axis: 'r' | 'c', extend: boolean) => {
    const s0 = d.sel; if (s0.ar < 0) return;
    const val = (r: number, c: number) => (d.rows[d.view[r]]?.[cols[c]] ?? '') !== '';
    const maxR = n - 1, maxC = cols.length - 1;
    const ok = (r: number, c: number) => r >= 0 && r <= maxR && c >= 0 && c <= maxC;
    const step = (r: number, c: number): [number, number] => (axis === 'r' ? [r + dir, c] : [r, c + dir]);
    let r = s0.fr, c = s0.fc;
    const [nr, nc] = step(r, c);
    if (!ok(nr, nc)) return;
    if (val(r, c) && val(nr, nc)) { for (;;) { const [a, b] = step(r, c); if (!ok(a, b) || !val(a, b)) break; r = a; c = b; } }
    else { r = nr; c = nc; while (!val(r, c)) { const [a, b] = step(r, c); if (!ok(a, b)) break; r = a; c = b; } }
    if (extend) setSel(s0.ar, s0.ac, r, c); else setSel(r, c, r, c);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const tg = e.target as HTMLElement;
    if (tg.tagName === 'TEXTAREA' || tg.closest('input')) return;
    const ctrl = e.ctrlKey || e.metaKey, shift = e.shiftKey;
    const page = Math.max(1, Math.floor(vh / rowH) - 1);
    const arrows: Record<string, ['r' | 'c', number]> = { ArrowUp: ['r', -1], ArrowDown: ['r', 1], ArrowLeft: ['c', -1], ArrowRight: ['c', 1] };
    if (arrows[e.key] && !e.altKey) {
      e.preventDefault();
      const [axis, dir] = arrows[e.key];
      if (ctrl) jump(dir, axis, shift); else moveActive(axis === 'r' ? dir : 0, axis === 'c' ? dir : 0, shift);
      return;
    }
    switch (e.key) {
      case 'Tab': e.preventDefault(); moveActive(0, shift ? -1 : 1, false); return;
      case 'Enter': e.preventDefault(); moveActive(shift ? -1 : 1, 0, false); return;
      case 'F2': e.preventDefault(); startEdit(); return;
      case 'PageDown': e.preventDefault(); moveActive(page, 0, shift); return;
      case 'PageUp': e.preventDefault(); moveActive(-page, 0, shift); return;
      case 'Home': { e.preventDefault(); const r = ctrl ? 0 : d.sel.fr; if (shift) setSel(d.sel.ar, d.sel.ac, r, 0); else setSel(r, 0, r, 0); return; }
      case 'End': { e.preventDefault(); const r = ctrl ? n - 1 : d.sel.fr, c = cols.length - 1; if (shift) setSel(d.sel.ar, d.sel.ac, r, c); else setSel(r, c, r, c); return; }
      case 'Backspace': e.preventDefault(); run('edit.clear'); return;
      case ' ':
        if (ctrl) { e.preventDefault(); setSel(0, d.sel.fc, n - 1, d.sel.fc); return; }
        if (shift) { e.preventDefault(); setSel(d.sel.fr, 0, d.sel.fr, cols.length - 1); return; }
    }
    if (!ctrl && !e.altKey && e.key.length === 1 && d.sel.ar >= 0) { e.preventDefault(); startEdit(e.key); }
  };

  /* ---- selection boxes ---- */
  const box = (r1: number, c1_: number, r2: number, c2: number) => ({ left: rnW + lefts[c1_], width: lefts[c2 + 1] - lefts[c1_], top: r1 * rowH, height: (r2 - r1 + 1) * rowH });
  const sb = sel ? box(sel.r1, sel.c1, sel.r2, sel.c2) : null;
  const ab = sel ? box(d.sel.ar, d.sel.ac, d.sel.ar, d.sel.ac) : null;
  const single = !!sel && sel.r1 === sel.r2 && sel.c1 === sel.c2;

  /* ---- render ---- */
  const hcells: React.ReactElement[] = [];
  const hstart = frozen ? Math.max(c0, 1) : c0;
  const hcell = (i: number, fz: boolean) => {
    const c = cols[i], hl = !!sel && i >= sel.c1 && i <= sel.c2, sorted = d.sc === c;
    return (
      <div key={i} className={cx('hcell', fz && 'frozen', hl && 'hl', sorted && 'sorted')} data-v={i} style={fz ? { width: lefts[1], left: rnW } : { left: rnW + lefts[i], width: lefts[i + 1] - lefts[i] }}>
        <span className="hn" {...tip(d.head[c])}>{d.head[c]}</span>
        <span className="hbs">
          <button className="hb sortb" data-act="sort" tabIndex={-1} {...tip(t('sortToggle'))}>{sorted ? (d.sd > 0 ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />) : <ArrowUpDown size={14} />}</button>
          <button className="hb" data-act="menu" tabIndex={-1} {...tip(t('colMenu'))}><ChevronDown size={15} /></button>
        </span>
        <i className="rz" data-act="resize" />
      </div>);
  };
  if (frozen) hcells.push(hcell(0, true));
  for (let i = hstart; i <= c1; i++) hcells.push(hcell(i, false));

  const rows: React.ReactElement[] = [];
  for (let vi = first; vi <= last && vi < n; vi++) {
    const si = d.view[vi];
    rows.push(<Row key={si + ':' + vi} vi={vi} si={si} row={d.rows[si]} cols={cols} lefts={lefts} c0={c0} c1={c1} rnW={rnW} rowH={rowH} total={total} numKey={numKey} fNum={frozen && colIsNum(d, cols[0])}
      hits={hitMap.get(vi)} curVc={curHit && curHit.vi === vi ? curHit.vc : -1} frozenW={frozenW} rnHl={!!sel && vi >= sel.r1 && vi <= sel.r2}
      selFrozen={!!sel && frozen && vi >= sel.r1 && vi <= sel.r2 && sel.c1 === 0} />);
  }

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[1.5rem] bg-surface shadow-[inset_0_0_0_1px_var(--m-outline-variant)]">
      <div ref={scroller} data-grid data-scroll-main tabIndex={0} className="gscroll size-full" style={{ ['--gfs' as string]: (13 * z).toFixed(2) + 'px' }}
        onScroll={onScroll} onMouseDown={onMouseDown} onDoubleClick={onDblClick} onContextMenu={onContext} onKeyDown={onKeyDown}
        onWheel={e => { if (e.ctrlKey) { e.preventDefault(); run(e.deltaY < 0 ? 'view.zoomIn' : 'view.zoomOut'); } }}>
        <div className="ghdr" style={{ width: total }}>
          <div className="hrow" style={{ width: total, height: hdrH }}>
            <div className="hcell corner" style={{ width: rnW }} data-act="all" {...tip(t('c.edit.selectAll'), 'Ctrl+A')} />
            {hcells}
          </div>
          {d.showFilterRow && (
            <div className="hrow frow" style={{ width: total, height: fltH }}>
              <div className="hcell corner" style={{ width: rnW }}><Filter size={14} /></div>
              {cols.slice(c0, c1 + 1).map((c, k) => { const i = c0 + k; return (
                <div key={c} className="hcell fcell" style={{ left: rnW + lefts[i], width: lefts[i + 1] - lefts[i] }}>
                  <input placeholder={t('filterPh')} value={d.cf[c] || ''} onChange={e => { d.cf = { ...d.cf, [c]: e.target.value }; if (!e.target.value) delete d.cf[c]; viewChanged(); }} />
                </div>); })}
            </div>)}
        </div>
        <div className="gbody" style={{ height: Math.max(n * rowH, 0), width: total }}>
          {rows}
          {sb && <div className={cx('selbox', single && 'single')} style={sb} />}
          {ab && <div className="actbox" style={ab} />}
          {app.editing && <Editor key={app.editing.vr + ':' + app.editing.vc + ':' + d.id} z={z} rowH={rowH} rnW={rnW} lefts={lefts} />}
        </div>
        {!n && <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-on-surface-variant">{d.rows.length ? t('noMatch') : t('noRows')}</div>}
      </div>
      <ScrollTopFab show={vp.t > 400} />
    </div>
  );
}

function Editor({ z, rowH, rnW, lefts }: { z: number; rowH: number; rnW: number; lefts: number[] }) {
  const ed = app.editing!;
  const ta = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ta.current; if (!el) return;
    el.style.height = rowH + 'px';
    if (el.scrollHeight > rowH + 2) el.style.height = Math.min(el.scrollHeight + 2, rowH * 6) + 'px';
    const longest = el.value.split('\n').reduce((a, l) => Math.max(a, l.length), 0);
    el.style.width = clamp(longest * 8 * z + 28, lefts[ed.vc + 1] - lefts[ed.vc], 520) + 'px';
  };
  useLayoutEffect(() => {
    const el = ta.current!;
    el.value = ed.initial ?? ed.orig;
    fit();
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
    bindEditorValue(() => el.value);
    return () => bindEditorValue(null);
  }, []); // eslint-disable-line
  return (
    <textarea ref={ta} className="editor" rows={1} spellCheck={false} style={{ left: rnW + lefts[ed.vc], top: ed.vr * rowH, minWidth: lefts[ed.vc + 1] - lefts[ed.vc], height: rowH }}
      onInput={fit} onBlur={() => { if (app.editing) commitEditing(); }}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.altKey) { e.preventDefault(); commitEditing(false, { dr: e.shiftKey ? -1 : 1, dc: 0 }); }
        else if (e.key === 'Enter' && e.altKey) { e.preventDefault(); const el = e.currentTarget; el.setRangeText('\n', el.selectionStart, el.selectionEnd, 'end'); fit(); }
        else if (e.key === 'Tab') { e.preventDefault(); commitEditing(false, { dr: 0, dc: e.shiftKey ? -1 : 1 }); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelEditing(); }
      }} />
  );
}
void setSort; void (null as unknown as Doc);
