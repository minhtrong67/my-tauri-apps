import type { ReactNode } from 'react';

/** Illustration drawn with theme colours; `kind` selects the motif. */
export function EmptyState({ kind, title, desc, children }: { kind: 'folder' | 'search' | 'clock' | 'check'; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-6 text-center anim-fade">
      <svg viewBox="0 0 160 130" className="empty-float h-32 w-40" aria-hidden>
        <ellipse cx="80" cy="116" rx="46" ry="7" fill="var(--on-surface)" opacity=".08" />
        <rect x="22" y="34" width="116" height="74" rx="18" fill="var(--primary-container)" />
        <path d="M22 52a18 18 0 0 1 18-18h26l12 12h42a18 18 0 0 1 18 18v6H22z" fill="var(--primary)" opacity=".28" />
        <rect x="34" y="52" width="92" height="56" rx="16" fill="var(--surface-container-highest)" />
        {kind === 'search' && <><circle cx="76" cy="78" r="13" fill="none" stroke="var(--primary)" strokeWidth="6" /><path d="m86 88 12 12" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" /></>}
        {kind === 'folder' && <><rect x="58" y="72" width="44" height="7" rx="3.5" fill="var(--primary)" opacity=".55" /><rect x="66" y="86" width="28" height="7" rx="3.5" fill="var(--primary)" opacity=".3" /></>}
        {kind === 'clock' && <><circle cx="80" cy="80" r="16" fill="none" stroke="var(--primary)" strokeWidth="6" /><path d="M80 70v11l8 5" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" fill="none" /></>}
        {kind === 'check' && <path d="m64 80 11 11 22-24" stroke="var(--primary)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
        <g fill="var(--primary)" opacity=".7"><path d="M140 20l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /><path d="M20 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity=".6" /></g>
      </svg>
      <div className="text-base font-semibold">{title}</div>
      {desc && <div className="max-w-xs text-on-surface-variant">{desc}</div>}
      {children}
    </div>
  );
}
