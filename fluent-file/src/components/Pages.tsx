import { FolderIcon } from './FolderIcon';
import { Clock, Command, FolderOpen, HardDrive, History, Home, Pin, Star, Tag, Trash2, Download, FileText, Image as ImageIcon, Music, Video, Monitor, X } from 'lucide-react';
import { useExplorer, navigate, openRecent, setActivePane } from '../store/explorer';
import { useSettings } from '../store/settings';
import { openModal, showMenu } from '../store/ui';
import { useT } from '../lib/i18n';
import { baseName, parentOf, pk } from '../lib/paths';
import { fmtDate, fmtSize } from '../lib/format';

/** Accent colour per well-known place (reuses the adaptive file-type colours, so it works in light and dark). */
const PLACE_ACCENT: Record<string, string> = { home: 'var(--primary)', desktop: 'var(--k-doc)', documents: 'var(--k-slide)', downloads: 'var(--k-sheet)', pictures: 'var(--k-image)', music: 'var(--k-audio)', videos: 'var(--k-video)' };
import type { Drive, PaneId } from '../lib/types';
import { FileIcon } from './FileIcon';
import { sidebarMenuItems, tagLabel, TAGS } from '../lib/menus';
import { EmptyState } from './EmptyState';
import { Button, IconButton } from './ui/Buttons';
import type { LucideIcon } from 'lucide-react';

export const PLACE_ICON: Record<string, LucideIcon> = { home: Home, desktop: Monitor, documents: FileText, downloads: Download, pictures: ImageIcon, music: Music, videos: Video };
export const driveLabel = (d: Drive, t: (k: string) => string) => `${d.name || t('drive.local')} (${d.path.replace(/[\\/]+$/, '')})`;

export function DriveCard({ id, d, i = 0 }: { id: PaneId; d: Drive; i?: number }) {
  const t = useT();
  const used = d.total ? Math.round(((d.total - d.free) / d.total) * 100) : 0;
  const full = used >= 90;
  return (
    <button type="button" data-drop-path={d.path} onClick={() => { setActivePane(id); void navigate(id, d.path); }} onContextMenu={(e) => { e.preventDefault(); showMenu(sidebarMenuItems(id, d.path, d), e.clientX, e.clientY); }} title={d.path}
      className="ripple anim-item card flex items-center gap-4 p-4 text-left transition-colors duration-100 hover:bg-surface-container-low" style={{ animationDelay: i * 30 + 'ms' }}>
      <HardDrive className="size-9 flex-none text-primary" strokeWidth={1.25} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{driveLabel(d, t)}</span>
        <span className="my-1.5 block h-1.5 overflow-hidden rounded-full bg-on-surface/15"><span className={`block h-full rounded-full transition-[width] duration-500 ease-fast ${full ? 'bg-error' : 'bg-primary'}`} style={{ width: used + '%' }} /></span>
        <span className="block text-xs text-on-surface-variant">{t('drive.free', { free: fmtSize(d.free, true), total: fmtSize(d.total, true) })}</span>
      </span>
    </button>
  );
}

export function ThisPcPage({ id }: { id: PaneId }) {
  const t = useT(); const drives = useExplorer((s) => s.drives);
  return (
    <div className="h-full overflow-auto p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><HardDrive className="size-4 text-primary" strokeWidth={1.75} />{t('sidebar.drives')}</h3>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))' }}>{drives.map((d, i) => <DriveCard key={d.path} id={id} d={d} i={i} />)}</div>
    </div>
  );
}

function PlaceCard({ id, path, icon: Icon, label, sub, folder, accent = 'var(--primary)', i }: { id: PaneId; path: string; icon?: LucideIcon; label: string; sub: string; folder?: boolean; accent?: string; i: number }) {
  return (
    <button type="button" title={path} data-drop-path={path} onClick={() => { setActivePane(id); void navigate(id, path); }} onContextMenu={(e) => { e.preventDefault(); showMenu(sidebarMenuItems(id, path), e.clientX, e.clientY); }}
      className="ripple anim-item card group/p flex items-center gap-3 p-3 text-left transition-colors duration-100 hover:bg-surface-container-low" style={{ animationDelay: Math.min(i, 14) * 25 + 'ms' }}>
      {folder || !Icon ? <span className="grid size-10 flex-none place-items-center"><FolderIcon path={path} size={38} /></span>
        : <span className="grid size-10 flex-none place-items-center rounded-md" style={{ background: `color-mix(in oklab, ${accent} 14%, var(--surface-container))`, color: accent }}><Icon className="size-5" strokeWidth={1.6} /></span>}
      <span className="min-w-0"><span className="block truncate">{label}</span><span className="block truncate text-xs text-on-surface-variant">{sub}</span></span>
    </button>
  );
}
const H = ({ icon: I, children, extra, count }: { icon: LucideIcon; children: string; extra?: React.ReactNode; count?: number }) => (
  <h3 className="mt-7 mb-3 flex items-center gap-2 text-sm font-semibold first:mt-0"><I className="size-4 text-primary" strokeWidth={1.75} />{children}{!!count && <span className="rounded-full bg-on-surface/8 px-2 text-xs font-normal text-on-surface-variant tabular-nums">{count}</span>}<span className="flex-1" />{extra}</h3>
);

export function HomePage({ id }: { id: PaneId }) {
  const t = useT(); const places = useExplorer((s) => s.places); const drives = useExplorer((s) => s.drives);
  const S = useSettings();
  const parentLabel = (p: string) => parentOf(p) || t('place.thispc');
  const shown = new Set([...places.map((p) => pk(p.path)), ...S.pinned.map(pk)]);
  const frequent = Object.keys(S.frequent).filter((p) => !shown.has(pk(p))).sort((a, b) => S.frequent[b] - S.frequent[a]).slice(0, 8);
  const tagged = Object.keys(S.tags).length;
  const hour = new Date().getHours();
  const greet = t(hour < 5 || hour >= 18 ? 'home.greetEvening' : hour < 12 ? 'home.greetMorning' : 'home.greetAfternoon');
  const homePath = places.find((p) => p.id === 'home')?.path; const who = homePath ? baseName(homePath) : '';
  const date = new Date().toLocaleDateString(S.lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const free = drives.reduce((a, d) => a + (d.free || 0), 0);
  let k = 0;
  return (
    <div className="h-full overflow-auto p-5">
      <section className="anim-item relative mb-7 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low p-6 max-[620px]:p-5" style={{ backgroundImage: 'linear-gradient(120deg, color-mix(in oklab, var(--primary) 14%, transparent), transparent 60%)' }}>
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-sm text-on-surface-variant capitalize">{date}</p>
            <h2 className="mt-0.5 truncate text-[1.75rem] leading-9 font-semibold">{greet}{who ? `, ${who}` : ''}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {drives.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant bg-surface px-2.5 py-1 text-xs"><HardDrive className="size-3.5 text-primary" strokeWidth={1.75} />{t('home.drivesFree', { n: drives.length, free: fmtSize(free, true) })}</span>}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant bg-surface px-2.5 py-1 text-xs"><Clock className="size-3.5 text-primary" strokeWidth={1.75} />{t('home.recentCount', { n: S.recent.length })}</span>
            </div>
          </div>
          <button type="button" onClick={() => openModal('palette')} className="btn btn-filled"><Command />{t('home.palette')}<kbd className="ml-1 rounded bg-on-primary/20 px-1.5 py-0.5 !text-on-primary">Ctrl+K</kbd></button>
        </div>
      </section>
      <H icon={Star} count={places.length + S.pinned.length}>{t('home.quick')}</H>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(13.5rem, 1fr))' }}>
        {places.map((p) => <PlaceCard key={p.id} id={id} path={p.path} icon={PLACE_ICON[p.id]} accent={PLACE_ACCENT[p.id]} label={p.id === 'home' ? baseName(p.path) : t('place.' + p.id)} sub={p.path} i={k++} />)}
        {S.pinned.map((p) => <PlaceCard key={p} id={id} path={p} icon={Pin} label={baseName(p)} sub={parentLabel(p)} i={k++} />)}
      </div>
      {frequent.length > 0 && <><H icon={History} count={frequent.length}>{t('home.frequent')}</H>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(13.5rem, 1fr))' }}>{frequent.map((p) => <PlaceCard key={p} id={id} path={p} label={baseName(p)} sub={parentLabel(p)} folder accent="var(--folder)" i={k++} />)}</div></>}
      {tagged > 0 && <><H icon={Tag}>{t('home.tags')}</H>
        <div className="flex flex-wrap gap-2">{TAGS.map((tg) => <span key={tg.id} className="flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-low px-3 py-1.5 text-sm"><i className="tag-dot !size-3" style={{ background: tg.color }} />{tagLabel(tg.id)}<b className="text-on-surface-variant">{Object.values(S.tags).filter((a) => a.includes(tg.id)).length}</b></span>)}</div></>}
      <H icon={Clock} count={S.recent.length} extra={S.recent.length > 0 && <Button tone="text" small icon={Trash2} label={t('home.clear')} onClick={() => S.set({ recent: [] })} />}>{t('home.recent')}</H>
      {S.recent.length ? (
        <div className="card overflow-hidden p-1">
          {S.recent.map((r, i) => {
            const e = { name: baseName(r.path), isDir: false };
            return (
              <div key={r.path} className="group/r flex items-center rounded-md transition-colors hover:bg-on-surface/5">
                <button type="button" title={r.path} onClick={() => void openRecent(r.path)} className="ripple anim-item grid min-w-0 flex-1 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-4 rounded-md px-3 py-2 text-left max-[820px]:grid-cols-[minmax(0,1fr)_auto]" style={{ animationDelay: Math.min(i, 14) * 18 + 'ms' }}>
                  <span className="flex min-w-0 items-center gap-2.5"><FileIcon entry={e} size={20} /><span className="truncate">{e.name}</span></span>
                  <span className="truncate text-on-surface-variant max-[820px]:hidden">{parentOf(r.path)}</span>
                  <span className="text-on-surface-variant tabular-nums">{fmtDate(r.t, S.lang)}</span>
                </button>
                <IconButton icon={FolderOpen} label={t('home.openFolder')} small onClick={() => { setActivePane(id); const par = parentOf(r.path); if (par !== null) void navigate(id, par); }} className="opacity-0 transition-opacity group-hover/r:opacity-100 focus-visible:opacity-100" />
                <IconButton icon={X} label={t('home.remove')} small onClick={() => S.set({ recent: S.recent.filter((x) => x.path !== r.path) })} className="mr-1 opacity-0 transition-opacity group-hover/r:opacity-100 focus-visible:opacity-100" />
              </div>
            );
          })}
        </div>
      ) : <div className="card"><EmptyState kind="clock" title={t('home.noRecent')} /></div>}
      <H icon={HardDrive} count={drives.length}>{t('sidebar.drives')}</H>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))' }}>{drives.map((d, i) => <DriveCard key={d.path} id={id} d={d} i={i} />)}</div>
    </div>
  );
}
