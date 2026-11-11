import { useMemo, useState, type MouseEvent } from 'react';
import { useStore } from '../lib/store';
import { tr as tr_ } from '../lib/i18n';
import { openWithDefault, reveal } from '../lib/tauri';
import { useLang, useT } from '../lib/useT';
import { basename, fmtSize, fmtTime, natural, norm, pathKey } from '../lib/utils';
import { AuthorCredit, Button, Icon, IconButton, Logo, openMenuAt, openMenuBelow } from '../components/ui';
import { NavView } from '../components/NavView';
import { Poster } from '../components/Poster';
import { ViewToggle } from '../components/ViewToggle';
import type { LibrarySort, MenuItem, Recent, VideoFile } from '../lib/types';

function useTimeAgo() {
  const lang = useLang();
  const t = useT();
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  return (at: number) => {
    const s = Math.round((at - Date.now()) / 1000);
    const abs = Math.abs(s);
    if (abs < 60) return t('justNow');
    if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
    return rtf.format(Math.round(s / (86400 * 30)), 'month');
  };
}

function useProgressPct(path: string) {
  const prog = useStore((s) => s.progress[pathKey(path)]);
  return { prog, pct: prog && prog.dur ? Math.min(100, (prog.pos / prog.dur) * 100) : 0 };
}

const cardCls = 'group relative w-full cursor-pointer rounded-lg p-2 transition-colors duration-150 ease-fluent hover:bg-subtle active:bg-subtle-press animate-card-in';
const delay = (i: number) => ({ animationDelay: `${Math.min(i, 14) * 28}ms` });

function fileMenu(f: { path: string }, play: () => void, extra: MenuItem[] = []): MenuItem[] {
  const st = useStore.getState();
  return [
    { label: tr_('play'), icon: 'play_arrow', onClick: play },
    { label: tr_('showInFolder'), icon: 'folder_open', onClick: () => void reveal(f.path) },
    { label: tr_('copyPath'), icon: 'content_copy', onClick: () => void navigator.clipboard.writeText(f.path).then(() => st.showToast(tr_('pathCopied'))).catch(() => st.showToast(tr_('copyFailed'))) },
    { label: tr_('openDefaultApp'), icon: 'open_in_new', onClick: () => void openWithDefault(f.path) },
    ...extra,
  ];
}
/* ---------- recent / continue-watching card ---------- */
function VideoCard({ r, i }: { r: Recent; i: number }) {
  const t = useT();
  const ago = useTimeAgo();
  const { prog, pct } = useProgressPct(r.path);
  const st = useStore.getState();
  const play = () => void st.openPaths([r.path]);
  const items = () => fileMenu(r, play, [{ divider: true }, { label: t('removeFromHistory'), icon: 'delete', danger: true, onClick: () => st.removeRecent(r.path) }]);
  return (
    <div className={cardCls} style={delay(i)} onClick={play} onContextMenu={(e: MouseEvent) => openMenuAt(e, items())}>
      <Poster path={r.path} size={r.size} fallbackDur={r.dur} pct={pct} />
      <div className="mt-2 px-1">
        <div className="truncate text-body-strong text-fg" title={r.name}>{r.name}</div>
        <div className="truncate text-caption text-fg-2">{pct > 0 ? `${fmtTime(prog!.pos)} · ` : ''}{ago(r.at)}</div>
      </div>
      <IconButton icon="more_vert" size="sm" title={t('more')} className="!absolute right-3 top-3 !bg-black/55 hover:!bg-black/75 !text-white opacity-0 group-hover:opacity-100" onClick={(e) => openMenuBelow(e, items(), true)} />
    </div>
  );
}

/* ---------- library: grid card + list row ---------- */
function LibraryCard({ f, i, onPlay }: { f: VideoFile; i: number; onPlay: () => void }) {
  const t = useT();
  const { pct } = useProgressPct(f.path);
  const items = () => fileMenu(f, onPlay);
  return (
    <div className={cardCls} style={delay(i)} onClick={onPlay} onContextMenu={(e: MouseEvent) => openMenuAt(e, items())}>
      <Poster path={f.path} size={f.size} pct={pct} />
      <div className="mt-2 px-1">
        <div className="truncate text-body-strong text-fg" title={f.name}>{f.name}</div>
        <div className="truncate text-caption text-fg-2">{basename(f.folder)} · {fmtSize(f.size)}</div>
      </div>
      <IconButton icon="more_vert" size="sm" title={t('more')} className="!absolute right-3 top-3 !bg-black/55 hover:!bg-black/75 !text-white opacity-0 group-hover:opacity-100" onClick={(e) => openMenuBelow(e, items(), true)} />
    </div>
  );
}

function LibraryRow({ f, i, onPlay }: { f: VideoFile; i: number; onPlay: () => void }) {
  const t = useT();
  const lang = useLang();
  const { pct } = useProgressPct(f.path);
  const items = () => fileMenu(f, onPlay);
  return (
    <div
      className="group relative mx-6 px-2 py-2 rounded-lg flex items-center gap-4 cursor-pointer animate-rise transition-colors duration-150 ease-fluent hover:bg-subtle active:bg-subtle-press"
      style={delay(i)} onClick={onPlay} onContextMenu={(e: MouseEvent) => openMenuAt(e, items())}
    >
      <Poster path={f.path} size={f.size} pct={pct} compact className="w-36 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-body-strong text-fg" title={f.name}>{f.name}</div>
        <div className="truncate text-caption text-fg-2">{basename(f.folder)}</div>
      </div>
      <div className="hidden md:block w-24 text-right text-body text-fg-2 tabular-nums">{fmtSize(f.size)}</div>
      <div className="hidden lg:block w-32 text-right text-body text-fg-2">{new Date(f.modified * 1000).toLocaleDateString(lang)}</div>
      <IconButton icon="play_arrow" fill variant="tonal" size="sm" title={t('play')} className="opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onPlay(); }} />
      <IconButton icon="more_vert" size="sm" title={t('more')} onClick={(e) => openMenuBelow(e, items(), true)} />
    </div>
  );
}

const GRID = 'grid gap-1 px-6 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]';
/** Every toolbar button shares the same height and width so rows line up */
const BTN = 'w-[148px] justify-center';

function LibraryTab() {
  const t = useT();
  const library = useStore((s) => s.library);
  const sort = useStore((s) => s.settings.librarySort);
  const view = useStore((s) => s.settings.libraryView);
  const syncing = useStore((s) => s.syncing);
  const st = useStore.getState();
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const n = norm(q.trim());
    const list = n ? library.filter((f) => norm(`${f.name} ${basename(f.folder)}`).includes(n)) : [...library];
    if (sort === 'name') list.sort((a, b) => natural(a.name, b.name));
    else if (sort === 'size') list.sort((a, b) => b.size - a.size);
    else list.sort((a, b) => b.modified - a.modified);
    return list;
  }, [library, q, sort]);

  const total = library.reduce((a, f) => a + f.size, 0);
  const sorts: { key: LibrarySort; label: string }[] = [{ key: 'date', label: t('sortDate') }, { key: 'name', label: t('sortName') }, { key: 'size', label: t('sortSize') }];

  return (
    <div className="h-full flex flex-col">
      {/* toolbar: count on the left, controls evenly spaced on the right */}
      <div className="px-8 pb-3 flex flex-wrap items-center gap-x-2 gap-y-3">
        <div className="mr-auto min-w-[120px] text-caption text-fg-2">{t('nVideos', { n: library.length })} · {fmtSize(total)}</div>
        <div className="relative w-64">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-2 pointer-events-none" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchLibrary')}
            className="fluent-input w-full pl-9 pr-8 text-body"
          />
          {q && <button className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded hover:bg-subtle active:bg-subtle-press transition-colors flex items-center justify-center animate-pop" aria-label={t('clear')} onClick={() => setQ('')}><Icon name="close" size={12} /></button>}
        </div>
        <Button variant="tonal" icon="swap_vert" className={BTN} onClick={(e) => openMenuBelow(e, sorts.map((s) => ({ label: s.label, checked: s.key === sort, onClick: () => st.updateSettings({ librarySort: s.key }) })), true)}>{sorts.find((s) => s.key === sort)!.label}</Button>
        <ViewToggle value={view} onChange={(v) => st.updateSettings({ libraryView: v })} />
        <Button variant="tonal" icon="create_new_folder" className={BTN} onClick={st.addLibraryFolder}>{t('addFolder')}</Button>
        <Button variant="tonal" icon="refresh" className={BTN} disabled={syncing} onClick={() => void st.syncLibrary(false, true)}>{syncing ? t('scanning') : t('refresh')}</Button>
      </div>

      {!library.length ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3 animate-fade-in">
          <div className="w-24 h-24 rounded-lg bg-card border border-stroke-card text-accent-text flex items-center justify-center"><Icon name={syncing ? 'sync' : 'video_library'} size={48} fill className={syncing ? 'animate-spin' : ''} /></div>
          <div className="text-subtitle">{syncing ? t('scanning') : t('libraryEmpty')}</div>
          <p className="text-body text-fg-2 max-w-md">{t('libraryEmptyDesc')}</p>
        </div>
      ) : !items.length ? (
        <div className="flex-1 flex items-center justify-center text-fg-2 animate-fade-in">{t('noResults')}</div>
      ) : (
        <div key={view} className="flex-1 overflow-y-auto pb-8 scroll-smooth animate-fade-in">
          {view === 'grid' ? (
            <div className={GRID}>{items.map((f, i) => <LibraryCard key={f.path} f={f} i={i} onPlay={() => st.playFiles(items, i)} />)}</div>
          ) : (
            <div className="flex flex-col gap-0.5">{items.map((f, i) => <LibraryRow key={f.path} f={f} i={i} onPlay={() => st.playFiles(items, i)} />)}</div>
          )}
        </div>
      )}
    </div>
  );
}

function RecentTab() {
  const t = useT();
  const recents = useStore((s) => s.recents);
  const progress = useStore((s) => s.progress);
  const st = useStore.getState();

  if (!recents.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8 animate-fade-in">
        <div className="animate-pop"><Logo size={96} /></div>
        <h1 className="text-title mt-6 animate-rise" style={{ animationDelay: '80ms' }}>Fluent Video</h1>
        <p className="text-body-large text-fg-2 max-w-md mt-1 mb-8 animate-rise" style={{ animationDelay: '140ms' }}>{t('homeTagline')}</p>
        <div className="flex items-center gap-2 text-body text-fg-2 border border-dashed border-stroke-strong bg-card rounded-lg px-6 py-4 animate-rise" style={{ animationDelay: '200ms' }}><Icon name="drag_pan" />{t('dropHint')}</div>
        <div className="mt-8 animate-rise" style={{ animationDelay: '280ms' }}><AuthorCredit center /></div>
      </div>
    );
  }

  const resume = recents.filter((r) => {
    const p = progress[pathKey(r.path)];
    return p && p.dur > 0 && p.pos / p.dur > 0.02 && p.pos / p.dur < 0.95;
  }).slice(0, 8);

  return (
    <div className="h-full overflow-y-auto pb-8 scroll-smooth animate-fade-in">
      {resume.length > 0 && (
        <section className="mb-6">
          <h2 className="text-body-strong px-8 mb-2">{t('continueWatching')}</h2>
          <div className={GRID}>{resume.map((r, i) => <VideoCard key={r.path} r={r} i={i} />)}</div>
        </section>
      )}
      <section>
        <div className="flex items-center justify-between px-8 mb-2">
          <h2 className="text-body-strong">{t('recent')}</h2>
          <Button variant="text" icon="delete_sweep" onClick={() => st.openDialog({ type: 'confirm', title: t('clearHistory'), text: t('clearHistoryText'), confirmLabel: t('clear'), danger: true, onConfirm: st.clearHistory })}>{t('clearHistory')}</Button>
        </div>
        <div className={GRID}>{recents.map((r, i) => <VideoCard key={r.path} r={r} i={i} />)}</div>
      </section>
    </div>
  );
}

export function HomeView() {
  const t = useT();
  const recentsCount = useStore((s) => s.recents.length);
  const libCount = useStore((s) => s.library.length);
  const homeTab = useStore((s) => s.homeTab);
  const syncing = useStore((s) => s.syncing);
  const st = useStore.getState();
  const tab = homeTab ?? (recentsCount || !libCount ? 'home' : 'library');

  return (
    <NavView
      selected={tab}
      onSelect={(v) => st.set({ homeTab: v })}
      items={[
        { id: 'home' as const, icon: 'home', label: t('home') },
        { id: 'library' as const, icon: 'video_library', label: t('library'), badge: libCount ? String(libCount) : undefined },
      ]}
      footer={[{ id: 'settings', icon: 'settings', label: t('settings') }]}
      onFooter={() => st.go('settings')}
    >
      <div className="h-full flex flex-col">
        <div className="px-8 pt-6 pb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-title mr-auto">{tab === 'library' ? t('library') : t('home')}</h1>
          {syncing && <span className="flex items-center gap-2 text-caption text-fg-2 animate-fade-in mr-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />{t('scanning')}</span>}
          <IconButton icon="refresh" title={`${t('refreshLibrary')} (F5)`} disabled={syncing} onClick={() => void st.syncLibrary(false, true)} />
          <Button icon="video_file" className={BTN} onClick={st.openFiles}>{t('openFiles')}</Button>
          <Button icon="folder_open" variant="tonal" className={BTN} onClick={st.openFolder}>{t('openFolder')}</Button>
        </div>
        <div key={tab} className="flex-1 min-h-0 animate-rise">{tab === 'library' ? <LibraryTab /> : <RecentTab />}</div>
      </div>
    </NavView>
  );
}
