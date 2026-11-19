import { memo, useId } from 'react';
import { useSettings } from '../store/settings';
import { pk } from '../lib/paths';
import { FOLDER_GLYPHS, onColor } from '../lib/folderStyle';

/** Windows 11 style folder: back panel + tab, a sheet of paper, lit front panel. Colour and glyph can be customised per folder. */
export const FolderIcon = memo(function FolderIcon({ path, size = 20, color, glyph, className = '' }: { path?: string; size?: number; color?: string; glyph?: string; className?: string }) {
  const style = useSettings((s) => (path ? s.folderStyles[pk(path)] : undefined));
  const base = color ?? style?.color; const g = glyph ?? style?.icon;
  const id = useId().replace(/:/g, '');
  const c = base || 'var(--folder)';
  const Glyph = g ? FOLDER_GLYPHS[g] : undefined;
  const gc = base && /^#[0-9a-f]{6}$/i.test(base) ? onColor(base) : 'rgba(60,40,0,.78)';
  return (
    <span className={`relative inline-block flex-none ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden style={{ display: 'block', ['--fc' as string]: c }}>
        <defs>
          <linearGradient id={id + 'b'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'color-mix(in oklab, var(--fc) 86%, black)' }} /><stop offset="1" style={{ stopColor: 'color-mix(in oklab, var(--fc) 70%, black)' }} /></linearGradient>
          <linearGradient id={id + 'f'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'color-mix(in oklab, var(--fc) 72%, white)' }} /><stop offset="1" style={{ stopColor: 'var(--fc)' }} /></linearGradient>
        </defs>
        <path d="M5 13a4 4 0 0 1 4-4h14.5a4 4 0 0 1 2.9 1.2L30 14h25a4 4 0 0 1 4 4v28H5z" fill={`url(#${id}b)`} />
        <rect x="9" y="16" width="46" height="26" rx="2.5" fill="#fff" opacity=".92" />
        <rect x="9" y="16" width="46" height="26" rx="2.5" fill="none" stroke="#000" strokeOpacity=".08" />
        <path d="M3 24a4 4 0 0 1 4-4h50a4 4 0 0 1 4 4v27a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" fill={`url(#${id}f)`} />
        <path d="M7.4 20.5h49.2a3.6 3.6 0 0 1 3.4 2.6" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
      </svg>
      {Glyph && size >= 26 && <span className="pointer-events-none absolute inset-x-0 grid place-items-center" style={{ top: '42%', height: '40%', color: gc }}><Glyph style={{ width: '46%', height: '100%' }} strokeWidth={2.2} /></span>}
    </span>
  );
});
