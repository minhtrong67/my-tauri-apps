import { Clock, Folder, HardDrive, History, Home, Pin, Star, Tag, Trash2, Download, FileText, Image as ImageIcon, Music, Video, Monitor, X } from 'lucide-react';
import { useExplorer, navigate, openRecent, setActivePane } from '../store/explorer';
import { useSettings } from '../store/settings';
import { showMenu } from '../store/ui';
import { useT } from '../lib/i18n';
import { baseName, parentOf, pk } from '../lib/paths';
import { fmtDate, fmtSize } from '../lib/format';
import type { Drive, PaneId } from '../lib/types';
import { FileIcon } from './FileIcon';
import { sidebarMenuItems, TAGS } from '../lib/menus';
import { EmptyState } from './EmptyState';
import { Button } from './ui/Buttons';
import type { LucideIcon } from 'lucide-react';

export const PLACE_ICON: Record<string, LucideIcon> = { home: Home, desktop: Monitor, documents: FileText, downloads: Download, pictures: ImageIcon, music: Music, videos: Video };
export const driveLabel = (d: Drive, t: (k: string) => string) => `${d.name || t('drive.local')} (${d.path.replace(/[\\/]+$/, '')})`;

export function DriveCard({ id, d, i = 0 }: { id: PaneId; d: Drive; i?: number }) {
  const t = useT();
  const used = d.total ? Math.round(((d.total - d.free) / d.total) * 100) : 0;
  const full = used >= 90; const R = 26; const C = 2 * Math.PI * R;
  return (
    <button type="button" data-drop-path={d.path} onClick={() => { setActivePane(id); void navigate(id, d.path); }} onContextMenu={(e) => { e.preventDefault(); showMenu(sidebarMenuItems(id, d.path, d), e.clientX, e.clientY); }} title={d.path}
      className="ripple anim-item card flex items-center gap-4 rounded-[1.75rem] p-4 text-left transition-[transform,border-radius,background-color] duration-500 ease-spring hover:-translate-y-0.5 hover:rounded-3xl hover:bg-surface-container" style={{ animationDelay: i * 50 + 'ms' }}>
      <span className="relative grid size-16 flex-none place-items-center">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90"><circle cx="32" cy="32" r={R} fill="none" stroke="var(--surface-container-highest)" strokeWidth="7" />
          <circle cx="32" cy="32" r={R} fill="none" stroke={full ? 'var(--error)' : 'var(--primary)'} strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * used) / 100} style={{ transition: 'stroke-dashoffset 1s var(--ease-emph)' }} /></svg>
        <HardDrive className={`absolute size-6 ${full ? 'text-error' : 'text-primary'}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{driveLabel(d, t)}</span>
        <span className="block text-xs text-on-surface-variant">{t('drive.free', { free: fmtSize(d.free, true), total: fmtSize(d.total, true) })}</span>
        <span className={`mt-1 inline-block rounded-full px-2 text-xs font-semibold ${full ? 'bg-error/15 text-error' : 'bg-primary/12 text-primary'}`}>{used}%</span>
      </span>
    </button>
  );
}

export function ThisPcPage({ id }: { id: PaneId }) {
  const t = useT(); const drives = useExplorer((s) => s.drives);
  return (
    <div className="h-full overflow-auto p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-primary uppercase"><HardDrive className="size-4" />{t('sidebar.drives')}</h3>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))' }}>{drives.map((d, i) => <DriveCard key={d.path} id={id} d={d} i={i} />)}</div>
    </div>
  );
}

function PlaceCard({ id, path, icon: Icon, label, sub, folder, i }: { id: PaneId; path: string; icon?: LucideIcon; label: string; sub: string; folder?: boolean; i: number }) {
  return (
    <button type="button" title={path} data-drop-path={path} onClick={() => { setActivePane(id); void navigate(id, path); }} onContextMenu={(e) => { e.preventDefault(); showMenu(sidebarMenuItems(id, path), e.clientX, e.clientY); }}
      className="ripple anim-item card flex items-center gap-3 rounded-2xl p-3 text-left transition-[transform,border-radius,background-color] duration-500 ease-spring hover:-translate-y-0.5 hover:rounded-[1.4rem] hover:bg-secondary-container" style={{ animationDelay: i * 25 + 'ms' }}>
      <span className="grid size-11 flex-none place-items-center rounded-xl bg-primary-container text-on-primary-container">{folder || !Icon ? <Folder className="size-5" style={{ color: 'var(--folder)', fill: 'color-mix(in oklab, var(--folder) 80%, transparent)' }} /> : <Icon className="size-5" />}</span>
      <span className="min-w-0"><span className="block truncate font-semibold">{label}</span><span className="block truncate text-xs text-on-surface-variant">{sub}</span></span>
    </button>
  );
}
const H = ({ icon: I, children, extra }: { icon: LucideIcon; children: string; extra?: React.ReactNode }) => (
  <h3 className="mt-6 mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-primary uppercase first:mt-0"><I className="size-4" />{children}<span className="flex-1" />{extra}</h3>
);

export function HomePage({ id }: { id: PaneId }) {
  const t = useT(); const places = useExplorer((s) => s.places); const drives = useExplorer((s) => s.drives);
  const S = useSettings();
  const parentLabel = (p: string) => parentOf(p) || t('place.thispc');
  const shown = new Set([...places.map((p) => pk(p.path)), ...S.pinned.map(pk)]);
  const frequent = Object.keys(S.frequent).filter((p) => !shown.has(pk(p))).sort((a, b) => S.frequent[b] - S.frequent[a]).slice(0, 8);
  const tagged = Object.keys(S.tags).length;
  let k = 0;
  return (
    <div className="h-full overflow-auto p-5">
      <H icon={Star}>{t('home.quick')}</H>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(13.5rem, 1fr))' }}>
        {places.map((p) => <PlaceCard key={p.id} id={id} path={p.path} icon={PLACE_ICON[p.id]} label={p.id === 'home' ? baseName(p.path) : t('place.' + p.id)} sub={p.path} i={k++} />)}
        {S.pinned.map((p) => <PlaceCard key={p} id={id} path={p} icon={Pin} label={baseName(p)} sub={parentLabel(p)} i={k++} />)}
      </div>
      {frequent.length > 0 && <><H icon={History}>{t('home.frequent')}</H>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(13.5rem, 1fr))' }}>{frequent.map((p) => <PlaceCard key={p} id={id} path={p} label={baseName(p)} sub={parentLabel(p)} folder i={k++} />)}</div></>}
      {tagged > 0 && <><H icon={Tag}>{t('home.tags')}</H>
        <div className="flex flex-wrap gap-2">{TAGS.map((tg) => <span key={tg.id} className="flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1.5 text-sm font-medium"><i className="tag-dot !size-3" style={{ background: tg.color }} />{t(tg.key)}<b className="text-on-surface-variant">{Object.values(S.tags).filter((a) => a.includes(tg.id)).length}</b></span>)}</div></>}
      <H icon={Clock} extra={S.recent.length > 0 && <Button tone="text" small icon={Trash2} label={t('home.clear')} onClick={() => S.set({ recent: [] })} />}>{t('home.recent')}</H>
      {S.recent.length ? (
        <div className="card overflow-hidden p-1.5">
          {S.recent.map((r, i) => {
            const e = { name: baseName(r.path), isDir: false };
            return (
              <div key={r.path} className="group/r flex items-center">
                <button type="button" title={r.path} onClick={() => void openRecent(r.path)} className="ripple anim-item grid min-w-0 flex-1 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-4 rounded-xl px-3 py-2 text-left max-[820px]:grid-cols-[minmax(0,1fr)_auto]" style={{ animationDelay: i * 18 + 'ms' }}>
                  <span className="flex min-w-0 items-center gap-2.5"><FileIcon entry={e} size={22} /><span className="truncate">{e.name}</span></span>
                  <span className="truncate text-on-surface-variant max-[820px]:hidden">{parentOf(r.path)}</span>
                  <span className="text-on-surface-variant tabular-nums">{fmtDate(r.t, S.lang)}</span>
                </button>
                <button type="button" aria-label={t('home.remove')} onClick={() => S.set({ recent: S.recent.filter((x) => x.path !== r.path) })} className="ibtn sm ripple mr-1 opacity-0 group-hover/r:opacity-100"><X /></button>
              </div>
            );
          })}
        </div>
      ) : <div className="card"><EmptyState kind="clock" title={t('home.noRecent')} /></div>}
      <H icon={HardDrive}>{t('sidebar.drives')}</H>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))' }}>{drives.map((d, i) => <DriveCard key={d.path} id={id} d={d} i={i} />)}</div>
    </div>
  );
}
