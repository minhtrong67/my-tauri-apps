import { Cover } from './Cover';
import { tr } from '../lib/i18n';
import { Icon } from './ui';
import type { Track } from '../lib/types';
import type { MouseEvent, ReactNode } from 'react';

export function MediaCard({ track, title, subtitle, onOpen, onPlay, round, onContextMenu, onMore, fallbackIcon, fluid, active }: {
  track?: Track; title: string; subtitle?: string; onOpen: () => void; onPlay?: () => void; round?: boolean;
  onContextMenu?: (e: MouseEvent) => void; onMore?: (e: MouseEvent<HTMLElement>) => void; fallbackIcon?: ReactNode;
  /** true = chiếm hết chiều rộng ô lưới; false = cố định 168px (hàng cuộn ngang) */
  fluid?: boolean; active?: boolean;
}) {
  return (
    <div
      className={`group cursor-default rounded-2xl p-2.5 border border-transparent hover:bg-card-hover hover:border-card-stroke active:bg-subtle-2 transition-colors duration-normal animate-card-in ${fluid ? 'w-full' : 'w-[176px] shrink-0'} ${active ? 'bg-subtle border-card-stroke' : ''}`}
      onClick={onOpen} onContextMenu={onContextMenu}
    >
      <div className="relative">
        {track ? (
          <div className={`overflow-hidden ${round ? 'rounded-full' : 'rounded-lg'}`}><div className=""><Cover track={track} className="w-full aspect-square" round={round} iconSize={48} /></div></div>
        ) : (
          <div className={`w-full aspect-square bg-secondary-container text-on-secondary-container flex items-center justify-center ${round ? 'rounded-full' : 'rounded-lg'}`}>{fallbackIcon ?? <Icon name="queue_music" size={48} fill />}</div>
        )}
        {onPlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }} aria-label={tr('play')}
            className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-normal ease-decel hover:bg-primary/90 focus-visible:opacity-100"
          >
            <Icon name="play_arrow" fill size={20} />
          </button>
        )}
        {onMore && (
          <button
            onClick={(e) => { e.stopPropagation(); onMore(e); }} aria-label={tr('options')}
            className="absolute right-2 top-2 w-8 h-8 rounded-lg fl-flyout !shadow-none text-on-surface flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100"
          >
            <Icon name="more_vert" size={16} />
          </button>
        )}
      </div>
      <div className="mt-2 px-1">
        <div className={`truncate text-title-sm ${active ? 'text-on-primary-container' : 'text-on-surface'}`}>{title}</div>
        <div className="truncate text-body-sm text-on-surface-variant h-4">{subtitle}</div>
      </div>
    </div>
  );
}
