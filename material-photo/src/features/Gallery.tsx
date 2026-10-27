import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowLeft, Check, CheckSquare, Copy, FolderInput, FolderOpen, FolderPlus, Heart, Images, Layers, Library, ListChecks, Pencil, RefreshCw, Search, Trash2, X, ImagePlus,
  Eye, FolderSearch, FilePenLine, MoveRight, Files, FolderHeart, SquareStack, ArrowUpDown, FileType, Folder, Rows3,
} from "lucide-react";
import { app, settings, setSetting, showMenu, t, useApp, userData, useSettings, useT, type MenuItem } from "../lib/store";
import { api, isTauri, pickImages, reveal, src } from "../lib/tauri";
import {
  addToAlbum, chooseFolder, copyImage, copyText, createAlbum, deleteAlbum, deleteFiles, loadLibrary, loadScopeEntries, openEditor, openPath, openViewer, refresh,
  removeFromAlbum, renameAlbum, renameDialog, setFavs, setScope, sortList, toggleFav, transferTo, isFav,
} from "../lib/actions";
import type { Entry, SortKey } from "../lib/types";
import { clamp, cx, extOf, fmtSize } from "../lib/utils";
import { Btn, Chip, EmptyState, IconBtn, Spinner, Tip } from "../components/ui";
import { Select } from "../components/Select";

/* ---------------- thumbnails: small queue so scrolling never floods the backend ---------------- */
const cache = new Map<string, string>();
const queue: (() => void)[] = [];
let running = 0;
const pump = () => {
  while (running < 5 && queue.length) { running++; const job = queue.pop()!; job(); }
};
function useThumb(e: Entry, size: number) {
  const key = `${e.path}|${e.mtime}|${size}`;
  const [url, setUrl] = useState<string | null>(cache.get(key) ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (cache.has(key)) { setUrl(cache.get(key)!); return; }
    setUrl(null);
    let alive = true;
    const job = () => {
      api.thumb(e.path, size)
        .then((p) => { const u = src(p); cache.set(key, u); if (cache.size > 4000) cache.delete(cache.keys().next().value as string); if (alive) setUrl(u); })
        .catch(() => { if (alive) setFailed(true); })
        .finally(() => { running--; pump(); });
    };
    if (!alive) return;
    queue.push(job); pump();
    return () => { alive = false; const i = queue.indexOf(job); if (i >= 0) queue.splice(i, 1); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return { url: url ?? (failed ? src(e.path, e.mtime) : null), failed };
}

const Tile = memo(function Tile({ e, size, sel, fav, onClick, onCtx, onToggle, onFav, w, h, i }: {
  e: Entry; size: number; sel: boolean; fav: boolean; w: number; h: number; i: number;
  onClick: (e: Entry, ev: React.MouseEvent) => void; onCtx: (e: Entry, ev: React.MouseEvent) => void; onToggle: (e: Entry, shift: boolean) => void; onFav: (e: Entry) => void;
}) {
  const { url } = useThumb(e, size);
  const tt = useT();
  return (
    <div className={cx("tile", sel && "sel")} style={{ width: w, height: h, animationDelay: `${(i % 24) * 18}ms` }}
      onClick={(ev) => onClick(e, ev)} onContextMenu={(ev) => onCtx(e, ev)} role="button" tabIndex={0}
      onKeyDown={(ev) => { if (ev.key === "Enter") onClick(e, ev as unknown as React.MouseEvent); if (ev.key === " ") { ev.preventDefault(); onToggle(e, ev.shiftKey); } }}>
      {url ? <img src={url} alt={e.name} loading="lazy" draggable={false} onLoad={(ev) => (ev.currentTarget.style.opacity = "1")} style={{ opacity: 0 }} /> : <div className="skeleton absolute inset-0" />}
      <button className="check" aria-label="select" onClick={(ev) => { ev.stopPropagation(); onToggle(e, ev.shiftKey); }}><Check size={16} strokeWidth={3} /></button>
      <button className={cx("fav", fav && "on")} aria-label={tt(fav ? "fav.remove" : "fav.add")} onClick={(ev) => { ev.stopPropagation(); onFav(e); }}><Heart size={16} fill={fav ? "currentColor" : "none"} /></button>
      <div className="cap">{e.name}</div>
    </div>
  );
});

/* ---------------- date grouping ---------------- */
function groupLabel(ms: number, lang: string): string {
  const d = new Date(ms), now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  if (diff <= 0) return t("date.today");
  if (diff === 1) return t("date.yesterday");
  if (diff < 7) return t("date.week");
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return t("date.month");
  return d.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { month: "long", year: "numeric" });
}

type Row = { kind: "head"; label: string; count: number; key: string } | { kind: "row"; items: Entry[]; key: string; start: number };

export function Gallery() {
  const tt = useT();
  const lang = useSettings((s) => s.lang);
  const tile = useSettings((s) => s.tile);
  const sort = useSettings((s) => s.sort);
  const group = useSettings((s) => s.group);
  const scope = useApp((s) => s.scope);
  const entries = useApp((s) => s.entries);
  const scopeEntries = useApp((s) => s.scopeEntries);
  const loading = useApp((s) => s.loading);
  const loaded = useApp((s) => s.loaded);
  const selection = useApp((s) => s.selection);
  const selecting = useApp((s) => s.selecting);
  const search = useApp((s) => s.search);
  const folder = useApp((s) => s.folder);
  const format = useApp((s) => s.format);
  const dir = useApp((s) => s.dir);
  const favs = userData.use((s) => s.favs);
  const albums = userData.use((s) => s.albums);

  useEffect(() => { loadScopeEntries(); }, [scope, favs.length, albums]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = scope.kind === "all" ? entries : scopeEntries;
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let l = base;
    if (q) l = l.filter((e) => e.name.toLowerCase().includes(q));
    if (folder) l = l.filter((e) => e.folder === folder);
    if (format) l = l.filter((e) => extOf(e.name) === format);
    if (scope.kind === "album") {
      const al = albums.find((a) => a.id === scope.id);
      l = l.filter((e) => al?.paths.includes(e.path));
    } else if (scope.kind === "fav") l = l.filter((e) => favs.includes(e.path));
    return sortList(l);
  }, [base, search, folder, format, sort, scope, favs, albums]); // eslint-disable-line react-hooks/exhaustive-deps

  const folders = useMemo(() => [...new Set(base.map((e) => e.folder))].sort(), [base]);
  const formats = useMemo(() => [...new Set(base.map((e) => extOf(e.name)))].sort(), [base]);
  const selSet = useMemo(() => new Set(selection), [selection]);
  const favSet = useMemo(() => new Set(favs), [favs]);

  /* layout */
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [height, setHeight] = useState(600);
  const [top, setTop] = useState(0);
  useEffect(() => {
    const el = scroller.current; if (!el) return;
    const ro = new ResizeObserver(() => { setWidth(el.clientWidth); setHeight(el.clientHeight); });
    ro.observe(el); setWidth(el.clientWidth); setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, [loaded, list.length === 0]);

  const gap = 10, pad = 16;
  const cols = Math.max(width < 640 ? 2 : 1, Math.floor((width - pad * 2 + gap) / (tile + gap)));
  const cell = Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);
  const rowH = cell + gap, headH = 52;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const push = (items: Entry[], start: number, key: string) => {
      for (let i = 0; i < items.length; i += cols) out.push({ kind: "row", items: items.slice(i, i + cols), key: `${key}-${i}`, start: start + i });
    };
    if (!group || !sort.startsWith("date")) { push(list, 0, "all"); return out; }
    let cur = "", bucket: Entry[] = [], start = 0;
    const flush = () => { if (bucket.length) { out.push({ kind: "head", label: cur, count: bucket.length, key: `h-${cur}-${start}` }); push(bucket, start, `r-${cur}-${start}`); } };
    list.forEach((e, i) => {
      const l = groupLabel(e.mtime, lang);
      if (l !== cur) { flush(); cur = l; bucket = []; start = i; }
      bucket.push(e);
    });
    flush();
    return out;
  }, [list, cols, group, sort, lang]);

  const offsets = useMemo(() => {
    const o: number[] = []; let y = pad;
    for (const r of rows) { o.push(y); y += r.kind === "head" ? headH : rowH; }
    return { o, total: y + pad };
  }, [rows, rowH]);

  const visible = useMemo(() => {
    const from = top - 400, to = top + height + 400;
    const out: { r: Row; y: number }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const y = offsets.o[i], h = rows[i].kind === "head" ? headH : rowH;
      if (y + h < from) continue;
      if (y > to) break;
      out.push({ r: rows[i], y });
    }
    return out;
  }, [rows, offsets, top, height, rowH]);

  /* selection */
  const lastSel = useRef<number>(-1);
  const toggle = useCallback((e: Entry, shift: boolean) => {
    const idx = list.findIndex((x) => x.path === e.path);
    let next: string[];
    if (shift && lastSel.current >= 0) {
      const [a, b] = [Math.min(lastSel.current, idx), Math.max(lastSel.current, idx)];
      next = [...new Set([...app.get().selection, ...list.slice(a, b + 1).map((x) => x.path)])];
    } else {
      const s = app.get().selection;
      next = s.includes(e.path) ? s.filter((p) => p !== e.path) : [...s, e.path];
    }
    lastSel.current = idx;
    app.set({ selection: next, selecting: next.length > 0 });
  }, [list]);

  const open = useCallback((e: Entry, ev: React.MouseEvent) => {
    if (ev.ctrlKey || ev.metaKey || ev.shiftKey || app.get().selecting) { toggle(e, ev.shiftKey); return; }
    openViewer(e.path, list.map((x) => x.path));
  }, [list, toggle]);

  const ctxMenu = useCallback((e: Entry, ev: React.MouseEvent) => {
    ev.preventDefault();
    const s = app.get();
    const targets = s.selection.includes(e.path) && s.selection.length > 1 ? s.selection : [e.path];
    const multi = targets.length > 1;
    const items: MenuItem[] = [
      { label: t("act.open"), icon: Eye, run: () => openViewer(e.path, list.map((x) => x.path)), disabled: multi },
      { label: t("act.edit"), icon: FilePenLine, run: () => { openViewer(e.path, list.map((x) => x.path)); openEditor(); }, disabled: multi },
      { divider: true },
      { label: isFav(e.path) && !multi ? t("fav.remove") : t("fav.add"), icon: Heart, run: () => (multi ? setFavs(targets, true) : toggleFav(e.path)) },
      { label: t("alb.addTo"), icon: FolderHeart, run: () => pickAlbum(targets) },
      { divider: true },
      { label: t("act.copyImage"), icon: Copy, run: () => copyImage(e.path), disabled: multi },
      { label: t("act.copyPath"), icon: Files, run: () => copyText(e.path), disabled: multi },
      { label: t("act.copyTo"), icon: FolderInput, run: () => transferTo(targets, false) },
      { label: t("act.moveTo"), icon: MoveRight, run: () => transferTo(targets, true) },
      { label: t("act.reveal"), icon: FolderSearch, run: () => reveal(e.path), disabled: multi },
      { label: t("rename"), icon: Pencil, run: () => renameDialog(e.path), disabled: multi },
      { divider: true },
      ...(s.scope.kind === "album" ? [{ label: t("alb.removeFrom"), icon: X, run: () => removeFromAlbum((s.scope as { id: string }).id, targets) } as MenuItem] : []),
      { label: t("delete"), icon: Trash2, danger: true, run: () => deleteFiles(targets) },
    ];
    showMenu(items, { x: ev.clientX, y: ev.clientY });
  }, [list]);

  /* keyboard */
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
      if (ev.ctrlKey && ev.key.toLowerCase() === "a") { ev.preventDefault(); app.set({ selection: list.map((e) => e.path), selecting: true }); }
      else if (ev.key === "Escape" && app.get().selection.length) app.set({ selection: [], selecting: false });
      else if (ev.key === "Delete" && app.get().selection.length) deleteFiles(app.get().selection);
      else if (ev.key === "F5") { ev.preventDefault(); refresh(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [list]);

  const onFav = useCallback((e: Entry) => toggleFav(e.path), []);
  const scrollToTop = () => scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
  const title = scope.kind === "fav" ? tt("nav.favorites") : scope.kind === "album" ? albums.find((a) => a.id === scope.id)?.name ?? "" : dir ? dir.split(/[\\/]/).filter(Boolean).pop() ?? tt("gal.title") : tt("gal.title");

  if (scope.kind === "albums") return <AlbumsPage />;

  const sortOpts = (["date-desc", "date-asc", "name-asc", "name-desc", "size-desc", "size-asc"] as SortKey[]).map((v) => ({ value: v, label: tt(`sort.${v}` as never) }));
  const filtered = search || folder || format;

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* top bar */}
      <header className="shrink-0 px-4 pt-3 pb-2 flex flex-col gap-2.5">
        {selecting ? (
          <div className="flex items-center gap-2 h-14 px-3 rounded-[28px] bg-secondary-container text-on-secondary-container anim-pop">
            <IconBtn icon={X} label={tt("gal.clearSel")} kbd="Esc" onClick={() => app.set({ selection: [], selecting: false })} />
            <span className="font-bold text-lg flex-1 truncate">{tt("selected.n", { n: selection.length })}</span>
            <div className="flex items-center gap-0.5 overflow-x-auto">
              <IconBtn icon={CheckSquare} label={tt("gal.selectAll")} kbd="Ctrl+A" onClick={() => app.set({ selection: list.map((e) => e.path) })} />
              <IconBtn icon={Heart} label={tt("fav.add")} onClick={() => setFavs(selection, true)} />
              <IconBtn icon={FolderHeart} label={tt("alb.addTo")} onClick={() => pickAlbum(selection)} />
              <IconBtn icon={FolderInput} label={tt("act.copyTo")} onClick={() => transferTo(selection, false)} />
              <IconBtn icon={MoveRight} label={tt("act.moveTo")} onClick={() => transferTo(selection, true)} />
              <IconBtn icon={Rows3} label={tt("act.batchRename")} onClick={() => import("./Dialogs").then((m) => m.openBatchRename(selection))} />
              <IconBtn icon={Trash2} label={tt("delete")} kbd="Del" onClick={() => deleteFiles(selection)} className="!text-error" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-h-14">
            {scope.kind !== "all" && <IconBtn icon={ArrowLeft} label={tt("back")} onClick={() => setScope(scope.kind === "album" ? { kind: "albums" } : { kind: "all" })} />}
            <div className="min-w-0 mr-1">
              <h1 className="text-[1.65rem] leading-8 font-extrabold tracking-tight truncate">{title}</h1>
              <p className="text-xs text-on-surface-variant font-medium">{list.length === 1 ? tt("photo.1") : tt("photos.n", { n: list.length.toLocaleString() })}{filtered ? ` / ${base.length.toLocaleString()}` : ""}</p>
            </div>
            <label className="relative flex-1 max-w-md ml-auto min-w-[8rem]">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              <input className="field !h-11 !rounded-full pl-10 pr-9" value={search} placeholder={tt("gal.search")} onChange={(e) => app.set({ search: e.target.value })} />
              {search && <button aria-label={tt("close")} className="absolute right-2 top-1/2 -translate-y-1/2 size-7 grid place-items-center rounded-full hover:bg-on-surface/10" onClick={() => app.set({ search: "" })}><X size={16} /></button>}
            </label>
            <div className="hidden md:flex items-center gap-0.5">
              <IconBtn icon={ListChecks} label={tt("gal.selectMode")} onClick={() => app.set({ selecting: true })} />
              {isTauri && <IconBtn icon={RefreshCw} label={tt("gal.refresh")} kbd="F5" onClick={() => refresh()} />}
              <IconBtn icon={FolderOpen} label={tt("gal.openFolder")} onClick={chooseFolder} />
              <IconBtn icon={ImagePlus} label={tt("gal.openFiles")} onClick={async () => { const f = await pickImages(); if (f.length) openPath(f[0]); }} />
            </div>
          </div>
        )}
        {/* filter row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <Select value={sort} onChange={(v) => setSetting("sort", v)} options={sortOpts} className="w-52 shrink-0 !h-9 !text-[.8rem]" label={tt("gal.sort")} icon={<ArrowUpDown size={15} className="text-on-surface-variant" />} />
          <Select value={folder} onChange={(v) => app.set({ folder: v })} className="w-52 shrink-0 !h-9 !text-[.8rem]" label={tt("gal.folder")} icon={<Folder size={15} className="text-on-surface-variant" />}
            options={[{ value: "", label: tt("gal.allFolders") }, ...folders.map((f) => ({ value: f, label: f.split(/[\\/]/).filter(Boolean).pop() || f, hint: String(base.filter((e) => e.folder === f).length) }))]} />
          <Select value={format} onChange={(v) => app.set({ format: v })} className="w-44 shrink-0 !h-9 !text-[.8rem]" label={tt("gal.format")} icon={<FileType size={15} className="text-on-surface-variant" />}
            options={[{ value: "", label: tt("gal.allFormats") }, ...formats.map((f) => ({ value: f, label: f.toUpperCase() }))]} />
          <Chip icon={Layers} on={group && sort.startsWith("date")} onClick={() => setSetting("group", !group)}>{tt("gal.group")}</Chip>
          <div className="hidden sm:flex items-center gap-2 ml-auto pl-2 shrink-0">
            <Tip label={tt("gal.size")}><SquareStack size={16} className="text-on-surface-variant" /></Tip>
            <input type="range" min={120} max={340} step={10} value={tile} onChange={(e) => setSetting("tile", +e.target.value)} className="!w-28" style={{ "--p": `${((tile - 120) / 220) * 100}%` } as React.CSSProperties} aria-label={tt("gal.size")} />
          </div>
        </div>
      </header>

      {/* body */}
      <div ref={scroller} onScroll={(e) => setTop(e.currentTarget.scrollTop)} className={cx("flex-1 min-h-0 overflow-y-auto relative", selecting && "selecting")} style={{ scrollbarGutter: "stable" }}>
        {!loaded || (loading && !entries.length) ? (
          <div className="h-full grid place-items-center"><div className="flex flex-col items-center gap-3 text-on-surface-variant"><Spinner size={36} /><span className="text-sm font-medium">{tt("gal.scanning")}</span></div></div>
        ) : list.length === 0 ? (
          filtered ? <EmptyState icon={Search} title={tt("gal.noResults")}><Btn kind="tonal" icon={X} onClick={() => app.set({ search: "", folder: "", format: "" })}>{tt("reset")}</Btn></EmptyState>
          : scope.kind === "fav" ? <EmptyState icon={Heart} title={tt("fav.empty")} desc={tt("fav.empty.desc")} />
          : scope.kind === "album" ? <EmptyState icon={FolderHeart} title={tt("alb.emptyAlbum")} />
          : <EmptyState icon={Images} title={tt("gal.empty.title")} desc={tt("gal.empty.desc")}>
              <Btn kind="filled" icon={FolderOpen} onClick={chooseFolder}>{tt("gal.openFolder")}</Btn>
              <Btn kind="tonal" icon={Library} onClick={loadLibrary}>{tt("gal.library")}</Btn>
            </EmptyState>
        ) : (
          <div ref={box} className="relative" style={{ height: offsets.total }}>
            {visible.map(({ r, y }) => r.kind === "head" ? (
              <div key={r.key} className="absolute left-0 right-0 flex items-end gap-3 px-5 pb-2" style={{ top: y, height: headH }}>
                <h2 className="text-lg font-bold leading-6">{r.label}</h2><span className="text-xs text-on-surface-variant font-semibold pb-0.5">{r.count}</span>
              </div>
            ) : (
              <div key={r.key} className="absolute left-0 right-0 flex" style={{ top: y, height: rowH, paddingLeft: pad, gap }}>
                {r.items.map((e, i) => (
                  <Tile key={e.path} e={e} size={tile > 220 ? 480 : 320} w={cell} h={cell} i={r.start + i} sel={selSet.has(e.path)} fav={favSet.has(e.path)} onClick={open} onCtx={ctxMenu} onToggle={toggle} onFav={onFav} />
                ))}
              </div>
            ))}
          </div>
        )}
        {top > 600 && (
          <div className="sticky bottom-5 float-right mr-5 z-10 anim-pop"><IconBtn icon={ArrowLeft} label={tt("ui.scrollTop")} tone="tonal" className="!rotate-90 shadow-e3" onClick={scrollToTop} /></div>
        )}
      </div>
    </div>
  );
}

export function pickAlbum(paths: string[]) {
  const { albums } = userData.get();
  const show = (): void => {
    showMenu([
      ...albums.map((a) => ({ label: a.name, icon: FolderHeart, run: () => addToAlbum(a.id, paths) } as MenuItem)),
      ...(albums.length ? [{ divider: true } as MenuItem] : []),
      { label: t("alb.new"), icon: FolderPlus, run: async () => { const a = await createAlbum(paths); if (a) loadScopeEntries(); } },
    ], { x: innerWidth / 2 - 100, y: innerHeight / 2 - 120 });
  };
  show();
}

/* ---------------- Albums page ---------------- */
function AlbumsPage() {
  const tt = useT();
  const albums = userData.use((s) => s.albums);
  const scopeEntries = useApp((s) => s.scopeEntries);
  const byPath = useMemo(() => new Map(scopeEntries.map((e) => [e.path, e])), [scopeEntries]);
  return (
    <div className="h-full overflow-y-auto p-4 pb-8">
      <div className="flex items-center gap-3 min-h-14 mb-3">
        <h1 className="text-[1.65rem] font-extrabold tracking-tight flex-1">{tt("nav.albums")}</h1>
        <Btn kind="filled" icon={FolderPlus} onClick={() => createAlbum()}>{tt("alb.new")}</Btn>
      </div>
      {albums.length === 0 ? <EmptyState icon={FolderHeart} title={tt("alb.empty")} desc={tt("alb.empty.desc")}><Btn kind="filled" icon={FolderPlus} onClick={() => createAlbum()}>{tt("alb.new")}</Btn></EmptyState> : (
        <div className="grid gap-4 stagger" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
          {albums.map((a, i) => {
            const covers = a.paths.map((p) => byPath.get(p)).filter(Boolean).slice(0, 4) as Entry[];
            return (
              <div key={a.id} style={{ ["--i" as string]: i }} className="group relative text-left">
                <button onClick={() => setScope({ kind: "album", id: a.id })} className="block w-full text-left">
                  <div className="aspect-square rounded-[28px] overflow-hidden bg-surface-high grid grid-cols-2 grid-rows-2 gap-0.5 transition-all duration-500 ease-spring group-hover:rounded-[40px] group-hover:scale-[1.02] group-hover:shadow-e3">
                    {[0, 1, 2, 3].map((k) => covers[k] ? <CoverImg key={k} e={covers[k]} /> : <div key={k} className="bg-surface-highest grid place-items-center">{k === 0 && !covers.length && <FolderHeart className="text-on-surface-variant/50" size={34} />}</div>)}
                  </div>
                  <div className="mt-2 px-1"><div className="font-bold truncate">{a.name}</div><div className="text-xs text-on-surface-variant">{a.paths.length === 1 ? tt("photo.1") : tt("photos.n", { n: a.paths.length })}</div></div>
                </button>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconBtn sm icon={Pencil} label={tt("alb.rename")} tone="tonal" onClick={() => renameAlbum(a.id)} />
                  <IconBtn sm icon={Trash2} label={tt("alb.delete")} tone="tonal" onClick={() => deleteAlbum(a.id)} className="!text-error" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function CoverImg({ e }: { e: Entry }) {
  const { url } = useThumb(e, 320);
  return url ? <img src={url} className="size-full object-cover" alt="" /> : <div className="skeleton" />;
}
