import { useMemo, useState } from 'react';
import { getActiveLang, tr } from '../lib/i18n';
import { Button, Chip, Icon, IconButton, Segmented } from '../components/ui';
import { Collection, PageHeader } from '../components/Collection';
import { Cover } from '../components/Cover';
import { useDerived, useStore } from '../lib/store';
import { ruleTracks } from '../lib/smart';
import { findDuplicateGroups } from '../lib/duplicates';
import { computeStats, type StatsRange } from '../lib/stats';
import { reveal } from '../lib/tauri';
import { fmtLong, fmtSize } from '../lib/utils';

/* ───────────── user-made smart playlist ───────────── */

export function SmartListView({ id }: { id: string }) {
  const list = useStore((s) => s.smartLists.find((l) => l.id === id));
  const byId = useStore((s) => s.byId);
  const plays = useStore((s) => s.plays);
  const liked = useStore((s) => s.liked);
  const { openDialog, deleteSmartList } = useStore.getState();
  const tracks = useMemo(() => (list ? ruleTracks(list.rules, byId, plays, liked) : []), [list, byId, plays, liked]);
  if (!list) return <div className="p-8 text-on-surface-variant">{tr('playlistNotFound')}</div>;
  const actions = (
    <>
      <Button variant="text" icon="edit" onClick={() => openDialog({ type: 'smartEditor', id })}>{tr('edit')}</Button>
      <Button variant="text" danger icon="delete" onClick={() => openDialog({ type: 'confirm', title: tr('deletePlaylistQ'), text: tr('deletePlaylistText2', { name: list.name }), confirmLabel: tr('delete'), danger: true, onConfirm: () => deleteSmartList(id) })}>{tr('delete')}</Button>
    </>
  );
  return <Collection viewKey={`smartlist-${id}`} title={list.name} kind={tr('smartCustomKind')} subtitle={tr('smartHint')} tracks={tracks} icon="wand" actions={actions} emptyText={tr('smartEmpty')} />;
}

/* ───────────── statistics ───────────── */

function StatCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="rounded-3xl bg-surface-container p-5 flex items-center gap-4 min-w-0">
      <span className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0"><Icon name={icon} size={24} /></span>
      <div className="min-w-0">
        <div className="text-headline-sm leading-8 truncate tabular-nums">{value}</div>
        <div className="text-body-md text-on-surface-variant truncate">{label}</div>
      </div>
    </div>
  );
}

export function StatsView() {
  const listens = useStore((s) => s.listens);
  const byId = useStore((s) => s.byId);
  const playTracks = useStore((s) => s.playTracks);
  const [range, setRange] = useState<StatsRange>('week');
  const stats = useMemo(() => computeStats(listens, byId, range), [listens, byId, range]);
  const lang = getActiveLang() === 'vi' ? 'vi-VN' : 'en-US';
  const maxDay = Math.max(1, ...stats.week.map((d) => d.n));
  const maxTrack = stats.tracks[0]?.n ?? 1;
  const maxArtist = stats.artists[0]?.n ?? 1;

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title={tr('navStats')} subtitle={tr('statsSub')}>
        <Segmented value={range} onChange={setRange} options={[{ value: 'week', label: tr('statsWeek'), icon: 'calendar' }, { value: 'month', label: tr('statsMonth') }, { value: 'all', label: tr('statsAll') }]} />
      </PageHeader>
      {!listens.length ? (
        <div className="flex flex-col items-center justify-center text-center px-8 py-24 animate-fade-in">
          <div className="w-24 h-24 rounded-[32px] bg-primary-container text-on-primary-container flex items-center justify-center mb-5"><Icon name="bar_chart" size={48} /></div>
          <h2 className="text-title-lg mb-1">{tr('statsEmptyTitle')}</h2>
          <p className="text-body-lg text-on-surface-variant max-w-md">{tr('statsEmptyText')}</p>
        </div>
      ) : (
        <div className="px-8 pb-10 stagger">
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            <StatCard icon="play_arrow" value={stats.count} label={tr('statsListens')} />
            <StatCard icon="schedule" value={fmtLong(stats.seconds)} label={tr('statsTime')} />
            <StatCard icon="person" value={stats.artists.length ? stats.artists[0].name : '—'} label={tr('statsTopArtist')} />
          </div>

          <section className="mt-6 rounded-3xl bg-surface-container p-5">
            <h2 className="text-title-md mb-4 flex items-center gap-2"><Icon name="activity" size={20} className="text-primary" />{tr('statsLast7')}</h2>
            <div className="flex items-end gap-3 h-40">
              {stats.week.map((d, i) => (
                <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-2 min-w-0">
                  <span className="text-label-md text-on-surface-variant tabular-nums">{d.n || ''}</span>
                  <div className="w-full max-w-[56px] rounded-t-xl rounded-b-md bg-primary transition-[height] duration-700 ease-emphasized" style={{ height: `${Math.max(d.n ? 8 : 3, (d.n / maxDay) * 100)}%`, opacity: d.n ? 1 : 0.25 }} />
                  <span className="text-label-md text-on-surface-variant capitalize">{d.day.toLocaleDateString(lang, { weekday: 'short' })}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6 grid gap-6 grid-cols-1 xl:grid-cols-2">
            <section className="rounded-3xl bg-surface-container p-3">
              <h2 className="text-title-md px-3 pt-2 pb-2 flex items-center gap-2"><Icon name="trophy" size={20} className="text-primary" />{tr('statsTopSongs')}</h2>
              {stats.tracks.length === 0 && <div className="px-3 py-6 text-on-surface-variant text-body-md">{tr('statsNothingYet')}</div>}
              {stats.tracks.map(({ track, n }, i) => (
                <button key={track.id} onClick={() => playTracks(stats.tracks.map((x) => x.track.id), i)} className="ripple w-full h-16 px-3 rounded-2xl flex items-center gap-3 text-left hover:bg-on-surface/[.08]">
                  <span className="w-6 text-center text-label-lg text-on-surface-variant tabular-nums">{i + 1}</span>
                  <Cover track={track} className="w-11 h-11 rounded-xl shrink-0" iconSize={20} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-lg">{track.title}</span>
                    <span className="block h-1.5 mt-1.5 rounded-full bg-surface-container-highest overflow-hidden"><span className="block h-full rounded-full bg-primary transition-[width] duration-700 ease-emphasized" style={{ width: `${(n / maxTrack) * 100}%` }} /></span>
                  </span>
                  <span className="text-label-lg text-on-surface-variant tabular-nums w-16 text-right">{tr('nPlays', { n })}</span>
                </button>
              ))}
            </section>
            <section className="rounded-3xl bg-surface-container p-3">
              <h2 className="text-title-md px-3 pt-2 pb-2 flex items-center gap-2"><Icon name="person" size={20} className="text-primary" />{tr('statsTopArtists')}</h2>
              {stats.artists.length === 0 && <div className="px-3 py-6 text-on-surface-variant text-body-md">{tr('statsNothingYet')}</div>}
              {stats.artists.map((a, i) => (
                <div key={a.name} className="h-14 px-3 flex items-center gap-3">
                  <span className="w-6 text-center text-label-lg text-on-surface-variant tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-lg">{a.name}</span>
                    <span className="block h-1.5 mt-1.5 rounded-full bg-surface-container-highest overflow-hidden"><span className="block h-full rounded-full bg-tertiary transition-[width] duration-700 ease-emphasized" style={{ width: `${(a.n / maxArtist) * 100}%` }} /></span>
                  </span>
                  <span className="text-label-lg text-on-surface-variant tabular-nums w-16 text-right">{tr('nPlays', { n: a.n })}</span>
                </div>
              ))}
            </section>
          </div>
          <p className="mt-5 text-body-sm text-on-surface-variant flex items-center gap-2"><Icon name="info" size={16} />{tr('statsFootnote')}</p>
        </div>
      )}
    </div>
  );
}

/* ───────────── duplicates ───────────── */

export function DuplicatesView() {
  const { all } = useDerived();
  const mergeDuplicates = useStore((s) => s.mergeDuplicates);
  const openDialog = useStore((s) => s.openDialog);
  const showToast = useStore((s) => s.showToast);
  const groups = useMemo(() => findDuplicateGroups(all, [tr('unknownArtist', undefined, 'en'), tr('unknownArtist', undefined, 'vi')]), [all]);
  const extras = groups.reduce((a, g) => a + g.length - 1, 0);

  const keepBest = () =>
    openDialog({
      type: 'confirm', title: tr('dupMergeAllQ'), text: tr('dupMergeAllText', { n: extras }), confirmLabel: tr('dupMergeAll'), danger: true,
      onConfirm: () => { mergeDuplicates(groups.map((g) => g.map((t) => t.id))); showToast(tr('dupMerged', { n: extras }), undefined, undefined, 'success'); },
    });
  const keepOne = (g: string[], keep: string) => {
    mergeDuplicates([[keep, ...g.filter((x) => x !== keep)]]);
    showToast(tr('dupMerged', { n: g.length - 1 }), undefined, undefined, 'success');
  };

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title={tr('dupTitle')} subtitle={groups.length ? tr('dupSummary', { g: groups.length, n: extras }) : undefined}>
        <Button danger icon="merge" disabled={!groups.length} onClick={keepBest}>{tr('dupMergeAll')}</Button>
      </PageHeader>
      <p className="px-8 pb-3 text-body-md text-on-surface-variant flex items-center gap-2"><Icon name="info" size={16} />{tr('dupNote')}</p>
      {!groups.length ? (
        <div className="flex flex-col items-center justify-center text-center px-8 py-24 animate-fade-in">
          <div className="w-24 h-24 rounded-[32px] bg-primary-container text-on-primary-container flex items-center justify-center mb-5"><Icon name="copy_check" size={48} /></div>
          <h2 className="text-title-lg mb-1">{tr('dupNoneTitle')}</h2>
          <p className="text-body-lg text-on-surface-variant max-w-md">{tr('dupNoneText')}</p>
        </div>
      ) : (
        <div className="px-8 pb-10 space-y-4 stagger">
          {groups.map((g) => {
            const ids = g.map((t) => t.id);
            return (
              <section key={ids.join('|')} className="rounded-3xl bg-surface-container overflow-hidden">
                <div className="px-5 pt-4 pb-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-title-md">{g[0].title}</div>
                    <div className="truncate text-body-md text-on-surface-variant">{g[0].artist} • {tr('dupCopies', { n: g.length })}</div>
                  </div>
                </div>
                {g.map((t, i) => (
                  <div key={t.id} className="px-4 py-2 flex items-center gap-3 border-t border-outline-variant/40">
                    <Cover track={t} className="w-11 h-11 rounded-xl shrink-0" iconSize={20} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 h-6 inline-flex items-center rounded-md bg-secondary-container text-on-secondary-container text-label-md uppercase">{t.format}</span>
                        {t.bitrate > 0 && <span className="text-label-md text-on-surface-variant">{t.bitrate} kbps</span>}
                        <span className="text-label-md text-on-surface-variant">{fmtSize(t.size)}</span>
                        {i === 0 && <Chip icon="check" selected>{tr('dupBest')}</Chip>}
                      </div>
                      <div className="text-body-sm text-on-surface-variant break-all line-clamp-1 mt-0.5" title={t.path}>{t.path}</div>
                    </div>
                    <IconButton icon="folder_open" title={tr('showInFolder')} onClick={() => reveal(t.path).catch(() => showToast(tr('openFolderFail'), undefined, undefined, 'error'))} />
                    {i > 0 && <Button variant="tonal" icon="check" onClick={() => keepOne(ids, t.id)}>{tr('dupKeepThis')}</Button>}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
