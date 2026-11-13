import { Cover } from './Cover';
import { tr } from '../lib/i18n';
import { IconButton, Slider } from './ui';
import { SeekBar, TransportControls, useLoadingStatus } from './PlayerControls';
import { ProgressRing } from './Fluent';
import { useCurrent, useStore } from '../lib/store';

/** loads the (lazy) full-screen view ahead of time so it opens with no delay */
const preloadNowPlaying = () => void import('./NowPlaying');

export function PlayerBar() {
  const t = useCurrent();
  const volume = useStore((s) => s.settings.volume);
  const muted = useStore((s) => s.settings.muted);
  const liked = useStore((s) => (t ? !!s.liked[t.id] : false));
  const showQueue = useStore((s) => s.showQueue);
  const sleeping = useStore((s) => s.sleepAt !== null || s.sleepEndOfTrack);
  const st = useStore.getState();
  const volIcon = muted || volume === 0 ? 'volume_off' : volume < 0.4 ? 'volume_down' : 'volume_up';

  const status = useLoadingStatus(t?.remoteId);
  const loading = status.loading;
  return (
    <div data-player-bar className="win-bar h-[84px] shrink-0 flex items-center px-4 gap-4 relative">
      {loading && <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden" aria-hidden><div className="indet-bar h-full w-1/3 rounded-full bg-primary" /></div>}
      <div className="w-[28%] min-w-0 flex items-center gap-3">
        <button data-np-thumb className="shrink-0 group relative focus-ring rounded-xl" onPointerEnter={preloadNowPlaying} onClick={() => t && st.set({ showNowPlaying: true })} aria-label={tr('openNowPlaying')} disabled={!t}>
          <Cover track={t} eager className="w-14 h-14 rounded-xl" iconSize={28} />
          {loading && <span className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center animate-fade-in"><ProgressRing size={26} color="#fff" /></span>}
        </button>
        <div key={t?.id} className="min-w-0 title-in">
          <div className="truncate text-title-sm text-on-surface">{t?.title ?? tr('nothingPlaying')}</div>
          {loading
            ? <div className="truncate text-body-sm text-primary animate-fade-in" aria-live="polite">{status.text}{status.sec >= 2 ? ` · ${status.sec}s` : ''}</div>
            : <div className="truncate text-body-sm text-on-surface-variant">{t ? `${t.artist} • ${t.album}` : tr('pickSong')}</div>}
        </div>
        {t && <IconButton icon="favorite" title={`${tr('favorite')} (L)`} active={liked} fill={liked} pop onClick={() => st.toggleLike(t.id)} />}
      </div>

      <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
        <TransportControls />
        <SeekBar size="sm" className="max-w-2xl -mt-0.5" />
      </div>

      <div className="w-[28%] flex items-center justify-end gap-1">
        <IconButton icon="bedtime" title={tr('sleepTimer')} active={sleeping} onClick={() => st.openDialog({ type: 'sleep' })} />
        <IconButton icon="tune" title={tr('audioEq')} onClick={() => st.openDialog({ type: 'audio' })} />
        <IconButton icon="queue_music" title={`${tr('queue')} (Q)`} active={showQueue} onClick={() => st.set({ showQueue: !showQueue })} />
        <IconButton icon={volIcon} title={`${tr('muteToggle')} (M)`} onClick={st.toggleMute} />
        <div className="w-28"><Slider size="sm" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={st.setVolume} label={tr('volume')} format={(v) => `${Math.round(v * 100)}%`} /></div>
        <IconButton icon="open_in_full" title={`${tr('nowPlayingTip')} (N)`} disabled={!t} onClick={() => { preloadNowPlaying(); st.set({ showNowPlaying: true }); }} />
      </div>
    </div>
  );
}
