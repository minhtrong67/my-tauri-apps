import { memo, useId } from 'react';
import { useSettings } from '../store/settings';
import { pk } from '../lib/paths';
import { BRAND_MAP, EMOJI_FONT, GLYPH_MAP, onColor } from '../lib/folderStyle';

/** Windows 11 style folder: back panel + tab, a sheet of paper, lit front panel. Colour and glyph can be customised per folder. */
export const FolderIcon = memo(function FolderIcon({ path, size = 20, color, glyph, tone, className = '' }: { path?: string; size?: number; color?: string; glyph?: string; tone?: 'light' | 'dark'; className?: string }) {
  const style = useSettings((s) => (path ? s.folderStyles[pk(path)] : undefined));
  const base = color ?? style?.color; const g = glyph ?? style?.icon;
  const id = useId().replace(/:/g, '');
  const c = base || 'var(--folder)';
  const tn = tone ?? style?.tone;
  const auto = base && /^#[0-9a-f]{6}$/i.test(base) ? onColor(base) : 'rgba(60,40,0,.78)';
  const gc = tn === 'light' ? 'rgba(255,255,255,.96)' : tn === 'dark' ? 'rgba(30,22,0,.82)' : auto;
  const kind = !g ? '' : g.startsWith('e:') ? 'emoji' : g.startsWith('b:') ? 'brand' : 'glyph';
  const Glyph = kind === 'glyph' ? GLYPH_MAP[g!] : undefined;
  const brand = kind === 'brand' ? BRAND_MAP[g!.slice(2)] : undefined;
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
      {size >= 26 && Glyph && <span className="pointer-events-none absolute inset-x-0 grid place-items-center" style={{ top: '42%', height: '40%', color: gc }}><Glyph style={{ width: '46%', height: '100%' }} /></span>}
      {size >= 26 && kind === 'emoji' && <span className="pointer-events-none absolute inset-x-0 grid place-items-center leading-none" style={{ top: '42%', height: '40%', fontSize: size * 0.34, fontFamily: EMOJI_FONT }}>{g!.slice(2)}</span>}
      {size >= 26 && brand && <span className="pointer-events-none absolute inset-x-0 grid place-items-center" style={{ top: '40%', height: '44%' }}><span className="grid place-items-center rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/.3)]" style={{ width: size * 0.4, height: size * 0.4 }}><svg viewBox="0 0 24 24" width="62%" height="62%" aria-label={brand.title}><path d={brand.path} fill={brand.hex} /></svg></span></span>}
    </span>
  );
});
