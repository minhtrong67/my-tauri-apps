import { Icon, IconButton, openMenuAt } from './ui';
import { tr } from '../lib/i18n';
import { useStore } from '../lib/store';
import type { View } from '../lib/types';

const getItems = (): { icon: string; label: string; view: View }[] => [
  { icon: 'home', label: tr('navHome'), view: { name: 'home' } },
  { icon: 'explore', label: tr('navDiscover'), view: { name: 'discover' } },
  { icon: 'music_note', label: tr('navSongs'), view: { name: 'songs' } },
  { icon: 'album', label: tr('navAlbums'), view: { name: 'albums' } },
  { icon: 'person', label: tr('navArtists'), view: { name: 'artists' } },
  { icon: 'favorite', label: tr('navLiked'), view: { name: 'liked' } },
  { icon: 'history', label: tr('navRecent'), view: { name: 'recent' } },
  { icon: 'bar_chart', label: tr('navStats'), view: { name: 'stats' } },
];

const activeFor = (v: View, t: View) =>
  v.name === t.name ||
  (t.name === 'albums' && v.name === 'album') ||
  (t.name === 'artists' && v.name === 'artist');

/** NavigationView pane: expanded 260px, compact 48px */
export function NavDrawer() {
  const view = useStore((s) => s.view);
  const collapsed = useStore((s) => s.navCollapsed);
  const playlists = useStore((s) => s.playlists);
  const smartLists = useStore((s) => s.smartLists);
  const nav = useStore((s) => s.nav);
  const toggle = useStore((s) => s.set);
  const st = useStore.getState();

  const item = (icon: string, label: string, active: boolean, onClick: () => void, extra?: React.ReactNode, onContext?: (e: React.MouseEvent) => void) => (
    <button
      key={label + icon} onClick={onClick} onContextMenu={onContext} title={collapsed ? label : undefined} aria-current={active ? 'page' : undefined}
      className={`nav-item h-10 flex items-center gap-3 focus-ring ${collapsed ? 'w-10 justify-center' : 'px-3 w-full'}`}
    >
      <Icon name={icon} size={20} fill={active} className={active ? 'text-primary-container' : ''} />
      {!collapsed && <span className={`truncate text-body-lg flex-1 text-left ${active ? 'font-semibold' : ''}`}>{label}</span>}
      {!collapsed && extra}
    </button>
  );

  return (
    <nav aria-label="Navigation" className={`${collapsed ? 'w-14' : 'w-[260px]'} shrink-0 flex flex-col px-2 pb-2 transition-[width] duration-slow ease-decel`}>
      <div className="mb-1"><IconButton icon="menu" size="md" title={tr('toggleNav')} onClick={() => toggle({ navCollapsed: !collapsed })} /></div>
      <div className="space-y-0.5">{getItems().map((i) => item(i.icon, i.label, activeFor(view, i.view), () => nav(i.view)))}</div>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between pl-3'} mt-3 mb-1`}>
        {!collapsed && <button className="text-body-md font-semibold text-on-surface-variant hover:text-on-surface" onClick={() => nav({ name: 'playlists' })}>{tr('playlists')}</button>}
        <IconButton icon="add" size="sm" title={tr('createPlaylist')} onClick={() => st.openDialog({ type: 'prompt', title: tr('newPlaylist'), label: tr('playlistName'), confirmLabel: tr('create'), onSubmit: (v) => nav({ name: 'playlist', id: st.createPlaylist(v) }) })} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
        {smartLists.map((l) => item('wand', l.name, view.name === 'smartlist' && view.id === l.id, () => nav({ name: 'smartlist', id: l.id })))}
        {playlists.map((p) =>
          item(p.folder ? 'folder' : 'queue_music', p.name, view.name === 'playlist' && view.id === p.id, () => nav({ name: 'playlist', id: p.id }),
            <span className="text-body-sm text-on-surface-variant">{p.trackIds.length}</span>,
            (e) => openMenuAt(e, [
              { label: tr('play'), icon: 'play_arrow', onClick: () => st.playTracks(p.trackIds, 0) },
              { label: tr('rename'), icon: 'edit', onClick: () => st.openDialog({ type: 'prompt', title: tr('renamePlaylist'), label: tr('playlistName'), initial: p.name, confirmLabel: tr('save'), onSubmit: (v) => st.renamePlaylist(p.id, v) }) },
              { label: tr('deletePlaylist'), icon: 'delete', danger: true, onClick: () => st.openDialog({ type: 'confirm', title: tr('deletePlaylistQ'), text: tr('deletePlaylistText', { name: p.name }), confirmLabel: tr('delete'), danger: true, onConfirm: () => st.deletePlaylist(p.id) }) },
            ])),
        )}
      </div>
      <div className="pt-1">{item('settings', tr('navSettings'), view.name === 'settings', () => nav({ name: 'settings' }))}</div>
    </nav>
  );
}
