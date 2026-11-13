import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { tr } from '../lib/i18n';
import { IconButton } from './ui';
import { SeekSlider } from './Fluent';
import { useStore } from '../lib/store';
import { fmtTime } from '../lib/utils';

export function SeekBar({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const playing = useStore((s) => s.isPlaying);
  const position = useStore((s) => s.position);
  const duration = useStore((s) => s.duration);
  const seek = useStore((s) => s.seek);
  const [scrub, setScrub] = useState<number | null>(null);
  const val = scrub ?? position;
  return (
    <div className={`flex items-center gap-3 w-full ${className}`}>
      <span className="w-10 text-right text-body-sm text-on-surface-variant tabular-nums">{fmtTime(val)}</span>
      <SeekSlider max={Math.max(duration, 1)} value={Math.min(val, duration || 1)} playing={playing} size={size} label={tr('seekBar')} onChange={setScrub} onCommit={(v) => { seek(v); setScrub(null); }} />
      <span className="w-10 text-body-sm text-on-surface-variant tabular-nums">{fmtTime(duration)}</span>
    </div>
  );
}

export function TransportControls({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const isPlaying = useStore((s) => s.isPlaying);
  const shuffle = useStore((s) => s.shuffle);
  const repeat = useStore((s) => s.repeat);
  const loading = useStore((s) => s.loadingTrack);
  const st = useStore.getState();
  return (
    <div className="flex items-center gap-1">
      <IconButton icon="shuffle" title={`${tr('shuffle')} (S)`} active={shuffle} onClick={st.toggleShuffle} />
      <IconButton icon="skip_previous" title={`${tr('previous')} (Ctrl+←)`} fill size={size === 'lg' ? 'lg' : 'md'} onClick={st.prev} />
      <IconButton icon={isPlaying ? 'pause' : 'play_arrow'} title={`${isPlaying ? tr('pause') : tr('play')} (Space)`} variant="filled" fill pop busy={loading} size={size === 'lg' ? 'xl' : 'lg'} onClick={st.togglePlay} />
      <IconButton icon="skip_next" title={`${tr('next')} (Ctrl+→)`} fill size={size === 'lg' ? 'lg' : 'md'} onClick={() => st.next(false)} />
      <IconButton icon={repeat === 'one' ? 'repeat_one' : 'repeat'} title={`${tr('repeat')} (R)`} active={repeat !== 'off'} onClick={st.cycleRepeat} />
    </div>
  );
}

/** While an online song is being fetched: seconds waited, the stage the backend reports, and a message that fits */
export function useLoadingStatus(remoteId?: string) {
  const loading = useStore((s) => s.loadingTrack);
  const [sec, setSec] = useState(0);
  const [stage, setStage] = useState<{ stage: string; bytes: number } | null>(null);
  useEffect(() => {
    if (!loading) { setSec(0); setStage(null); return; }
    const t0 = Date.now();
    const i = window.setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(i);
  }, [loading]);
  useEffect(() => {
    const un = listen<{ id: string; stage: string; bytes: number }>('online-load', (e) => {
      if (remoteId && e.payload.id === remoteId) setStage({ stage: e.payload.stage, bytes: e.payload.bytes });
    });
    return () => { void un.then((f) => f()).catch(() => undefined); };
  }, [remoteId]);
  let text = '';
  if (loading) {
    if (stage?.stage === 'downloading') text = tr('loadingDownload', { mb: (stage.bytes / 1048576).toFixed(1) });
    else if (stage?.stage === 'resolving' || sec < 4) text = tr('loadingResolve');
    else text = sec < 15 ? tr('loadingSongSlow') : tr('loadingSongSlower');
  }
  return { loading, sec, text };
}
