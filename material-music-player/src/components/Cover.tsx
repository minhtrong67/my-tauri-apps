import { useEffect, useRef, useState } from 'react';
import { restoreCover, useCover } from '../lib/cover';
import { useStore } from '../lib/store';
import { assetUrl } from '../lib/tauri';
import type { Track } from '../lib/types';
import { Icon } from './ui';

/** Cover art. Loads when it scrolls into view, fades in, and repairs itself if the cached image file is missing. */
export function Cover({ track, className = '', iconSize = 24, round = false, eager = false }: { track?: Track; className?: string; iconSize?: number; round?: boolean; eager?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [override, setOverride] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tried = useRef('');

  useEffect(() => {
    if (eager || !ref.current) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (setVisible(true), io.disconnect()), { rootMargin: '160px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [eager]);

  const url = useCover(track, visible);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setOverride(null);
  }, [url, track?.id]);

  const onError = () => {
    if (!track || tried.current === track.id) return setFailed(true);
    tried.current = track.id;
    // the cached file is gone (cache cleaned / library imported from an older build): extract it again
    void restoreCover(track).then((file) => {
      if (!file) return setFailed(true);
      useStore.getState().setTrackCover(track.id, file);
      setOverride(assetUrl(file));
    });
  };

  const src = override ?? url;
  return (
    <div ref={ref} className={`relative overflow-hidden bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 ${round ? 'rounded-full' : ''} ${className}`}>
      {!(src && !failed) ? (
        <Icon name="music_note" size={iconSize} fill />
      ) : (
        <>
          {!loaded && <div className="absolute inset-0 skeleton" />}
          <img
            key={`${track?.id}-${src}`} src={src} alt="" decoding="async" draggable={false} onLoad={() => setLoaded(true)} onError={onError}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      )}
    </div>
  );
}
