import type { ReactNode } from 'react';

/** Flat illustration drawn with theme colours; `kind` selects the motif. */
export function EmptyState({ kind, title, desc, children }: { kind: 'folder' | 'search' | 'clock' | 'check'; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-6 text-center anim-fade">
      <svg viewBox="0 0 160 120" className="h-28 w-36" aria-hidden>
        <ellipse cx="80" cy="108" rx="48" ry="5" fill="var(--on-surface)" opacity=".07" />
        <path d="M24 34a8 8 0 0 1 8-8h30l10 10h56a8 8 0 0 1 8 8v8H24z" fill="var(--folder)" opacity=".85" />
        <rect x="24" y="44" width="112" height="56" rx="8" fill="var(--folder)" />
        <rect x="24" y="52" width="112" height="48" rx="8" fill="var(--surface-container-high)" stroke="var(--outline-variant)" />
        {kind === 'search' && <><circle cx="76" cy="74" r="12" fill="none" stroke="var(--primary)" strokeWidth="4" /><path d="m85 83 11 11" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" /></>}
        {kind === 'folder' && <><rect x="56" y="68" width="48" height="5" rx="2.5" fill="var(--primary)" opacity=".55" /><rect x="64" y="80" width="32" height="5" rx="2.5" fill="var(--primary)" opacity=".3" /></>}
        {kind === 'clock' && <><circle cx="80" cy="76" r="14" fill="none" stroke="var(--primary)" strokeWidth="4" /><path d="M80 67v10l7 4" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" fill="none" /></>}
        {kind === 'check' && <path d="m65 77 10 10 20-22" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
      </svg>
      <div className="text-base font-semibold">{title}</div>
      {desc && <div className="max-w-xs text-on-surface-variant">{desc}</div>}
      {children}
    </div>
  );
}
