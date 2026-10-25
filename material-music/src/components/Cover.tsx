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
  const [override, setOverride] = useState<{ id: string; url: string } | null>(null);
  // state is keyed by the image URL, so a cached image that finishes loading early can never be "reset" back to the skeleton
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const tried = useRef('');

  useEffect(() => {
    if (eager || !ref.current) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (setVisible(true), io.disconnect()), { rootMargin: '160px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [eager]);

  const url = useCover(track, visible);
  const src = override && override.id === track?.id ? override.url : url;
  const failed = !!src && failedSrc === src;
  const loaded = !!src && loadedSrc === src;

  const onError = () => {
    if (!track || tried.current === track.id) return setFailedSrc(src);
    tried.current = track.id;
    // the cached file is gone (cache cleaned / library imported from an older build): extract it again
    void restoreCover(track).then((file) => {
      if (!file) return setFailedSrc(src);
      useStore.getState().setTrackCover(track.id, file);
      setOverride({ id: track.id, url: assetUrl(file) });
    });
  };

  return (
    <div ref={ref} className={`relative overflow-hidden bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 ${round ? 'rounded-full' : ''} ${className}`}>
      {!(src && !failed) ? (
        <Icon name="music_note" size={iconSize} fill />
      ) : (
        <>
          {!loaded && <div className="absolute inset-0 skeleton" />}
          <img
            key={`${track?.id}-${src}`} src={src} alt="" decoding="async" draggable={false} ref={(el) => { if (el && el.complete && el.naturalWidth > 0) setLoadedSrc(src); }}
            onLoad={() => setLoadedSrc(src)} onError={onError}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      )}
    </div>
  );
}
