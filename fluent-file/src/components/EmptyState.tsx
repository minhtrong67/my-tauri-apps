import type { ReactNode } from 'react';
import { Search, Clock, CheckmarkCircleFilled } from './emptyIcons';
import { FolderIcon } from './FolderIcon';

/** Empty states: the real Fluent folder icon (or a soft badge for search / history / done) with a short message. */
export function EmptyState({ kind, title, desc, children }: { kind: 'folder' | 'search' | 'clock' | 'check'; title: string; desc?: string; children?: ReactNode }) {
  const Badge = kind === 'search' ? Search : kind === 'clock' ? Clock : CheckmarkCircleFilled;
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-6 text-center anim-fade">
      {kind === 'folder'
        ? <FolderIcon size={104} className="drop-shadow-[0_8px_10px_rgb(0_0_0/.18)]" />
        : <span className="grid size-24 place-items-center rounded-full bg-primary/12 text-primary"><Badge className="size-12" /></span>}
      <div className="text-base font-semibold">{title}</div>
      {desc && <div className="max-w-xs text-on-surface-variant">{desc}</div>}
      {children}
    </div>
  );
}
