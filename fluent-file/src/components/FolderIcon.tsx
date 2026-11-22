import { memo, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useSettings } from '../store/settings';
import { pk } from '../lib/paths';
import { DEFAULT_C1, DEFAULT_C2, onColor, shade, type FolderDesign } from '../lib/folderDesign';

const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
interface Box { x: number; y: number; w: number; h: number; r: number }
const BACK: Box = { x: 14, y: 38, w: 228, h: 184, r: 16 };
const TAB: Box = { x: 14, y: 30, w: 100, h: 34, r: 10 };
const FRONT: Box = { x: 14, y: 70, w: 228, h: 152, r: 16 };

/* Every distinct look is rendered once to an SVG string and shown through <img>: identical folders share one decoded bitmap, which
   keeps hundreds of folder icons cheap in DOM nodes, paint work and memory. */
const uriCache = new Map<string, string>();
const MAX_URIS = 400;

/** Draws a folder design on a 256 grid. `compact` (small sizes) enlarges the glyph so a logo stays recognisable at 20px. */
function buildSvg(d: FolderDesign, glyphOn: boolean, compact: boolean): string {
  const id = 'f';
  const c1 = d.color || DEFAULT_C1;
  const c2 = d.color2 || (d.color ? shade(d.color, -0.12) : DEFAULT_C2);
  const light = d.color && !d.color2 ? shade(d.color, 0.38) : c1; // a single chosen colour becomes a soft top-to-bottom gradient
  const fill: string = d.color2 || !d.color ? d.fill || 'linear' : 'linear';
  const solid = d.fill === 'solid' && !!d.color2;
  const a1 = d.color2 || !d.color ? c1 : light, a2 = d.color2 || !d.color ? c2 : d.color!;
  const angle = d.angle ?? 90;
  const style = d.style ?? 'win11';

  const defs: JSX.Element[] = [];
  const paint = (key: string, b: { x: number; y: number; w: number; h: number }, amt = 0): string => {
    if (solid) return shade(a1, amt);
    const gid = `${id}${key}`;
    if (fill === 'radial') defs.push(<radialGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" cx={b.x + b.w / 2} cy={b.y + b.h * 0.4} r={Math.max(b.w, b.h) * 0.65}><stop offset="0" stopColor={shade(a1, amt)} /><stop offset="1" stopColor={shade(a2, amt)} /></radialGradient>);
    else {
      const a = (angle * Math.PI) / 180, cx = b.x + b.w / 2, cy = b.y + b.h / 2, dx = (Math.cos(a) * b.w) / 2, dy = (Math.sin(a) * b.h) / 2;
      defs.push(<linearGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy}><stop offset="0" stopColor={shade(a1, amt)} /><stop offset="1" stopColor={shade(a2, amt)} /></linearGradient>);
    }
    return `url(#${gid})`;
  };
  const R = (b: Box, props: Record<string, unknown>) => <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r} {...props} />;
  const gloss = (b: Box, top: number, key: string) => { defs.push(<linearGradient key={id + key} id={id + key} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={top} /><stop offset=".55" stopColor="#fff" stopOpacity="0" /></linearGradient>); return R(b, { fill: `url(#${id}${key})` }); };

  let body: JSX.Element;
  let frontBox = FRONT;
  if (style === 'outline') {
    const s = paint('s', BACK);
    body = <g fill="none" stroke={s} strokeWidth="11" strokeLinejoin="round" strokeLinecap="round"><rect x="20" y="44" width="216" height="172" rx="16" /><rect x="20" y="36" width="100" height="30" rx="9" /><path d="M22 80H234" /></g>;
  } else if (style === 'neon') {
    defs.push(<filter key={id + 'n'} id={id + 'n'} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>);
    body = <g filter={`url(#${id}n)`} stroke={c1} strokeWidth="6" strokeLinejoin="round">{R(BACK, { fill: '#14142a' })}{R(TAB, { fill: '#14142a' })}{R(FRONT, { fill: '#1b1b38' })}</g>;
  } else if (style === 'win10') {
    const b: Box = { x: 14, y: 44, w: 228, h: 176, r: 6 }, t: Box = { x: 14, y: 30, w: 92, h: 30, r: 6 }, f: Box = { x: 14, y: 82, w: 228, h: 138, r: 6 };
    frontBox = f;
    body = <>{R(b, { fill: shade(a1, -0.18) })}{R(t, { fill: shade(a1, -0.18) })}{R(f, { fill: paint('f', f) })}<rect x={f.x} y={f.y} width={f.w} height="3" fill="#fff" fillOpacity=".35" /></>;
  } else if (style === 'minimal') {
    const body0: Box = { x: 14, y: 52, w: 228, h: 170, r: 22 }, tab: Box = { x: 14, y: 32, w: 100, h: 38, r: 12 };
    frontBox = body0;
    body = <>{R(tab, { fill: paint('t', body0) })}{R(body0, { fill: paint('f', body0) })}{gloss(body0, 0.28, 'g')}</>;
  } else if (style === 'flat') {
    body = <>{R(BACK, { fill: paint('b', BACK, -0.22) })}{R(TAB, { fill: paint('b', BACK, -0.22) })}{R(FRONT, { fill: paint('f', FRONT) })}</>;
  } else if (style === 'glass') {
    body = <>
      <g opacity=".65">{R(BACK, { fill: paint('b', BACK, -0.22) })}{R(TAB, { fill: paint('b', BACK, -0.22) })}</g>
      <g opacity=".6">{R(FRONT, { fill: paint('f', FRONT) })}</g>{gloss(FRONT, 0.45, 'g')}{R(FRONT, { fill: 'none', stroke: '#fff', strokeOpacity: '.75', strokeWidth: 3 })}
    </>;
  } else if (style === 'classic') {
    body = <>{R(BACK, { fill: paint('b', BACK, -0.22) })}{R(TAB, { fill: paint('b', BACK, -0.22) })}<rect x="32" y="52" width="192" height="64" rx="6" fill="#fdfdfd" />{R(FRONT, { fill: paint('f', FRONT) })}{gloss(FRONT, 0.28, 'g')}</>;
  } else { // win11
    const back = solid ? shade(a1, -0.16) : shade(a2, -0.08);
    body = <>{R(BACK, { fill: back })}{R(TAB, { fill: back })}<rect x="30" y="52" width="196" height="64" rx="6" fill="#fff" fillOpacity=".92" />{R(FRONT, { fill: paint('f', FRONT) })}<path d="M32 71.5H224" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" /></>;
  }

  /* glyph: vector icon / logo / emoji, optional backdrop */
  const sc = ((d.size ?? 100) / 100) * (compact ? 1.3 : 1);
  const box = 92 * sc;
  const cx = frontBox.x + frontBox.w / 2 + (d.x ?? 0), cy = frontBox.y + frontBox.h / 2 + (d.y ?? 0) + (style === 'win11' || style === 'classic' ? 4 : 0);
  const refHex = d.color || DEFAULT_C2;
  const ink = !d.iconColor || d.iconColor === 'auto' ? (style === 'neon' || style === 'outline' ? c1 : onColor(style === 'glass' ? refHex : solid ? a1 : a2)) : d.iconColor === 'brand' ? d.vec?.hex || '#fff' : d.iconColor;
  let glyph: JSX.Element | null = null;
  if (glyphOn) {
    const op = d.opacity ?? 1;
    if (d.vec) glyph = <svg x={cx - box / 2} y={cy - box / 2} width={box} height={box} viewBox={`0 0 ${d.vec.w} ${d.vec.h}`} opacity={op}><path d={d.vec.p} fill={ink} /></svg>;
    else if (d.emoji) glyph = <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={box * 0.86} fontFamily={EMOJI_FONT} opacity={op}>{d.emoji}</text>;
    if (glyph && d.badge && d.badge !== 'none') {
      const bc = d.badgeColor || '#ffffff', br = box * 0.72;
      glyph = <>{d.badge === 'circle' ? <circle cx={cx} cy={cy} r={br / 1.35} fill={bc} /> : <rect x={cx - br / 1.45} y={cy - br / 1.45} width={br * 1.38} height={br * 1.38} rx={br * 0.34} fill={bc} />}{glyph}</>;
    }
  }
  return renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 22 236 206">
      {defs.length > 0 && <defs>{defs}</defs>}
      {body}{glyph}
    </svg>
  );
}

function uriFor(d: FolderDesign, size: number): string {
  const hasGlyph = !!(d.vec || d.emoji);
  const glyphOn = hasGlyph && size >= 14;
  const compact = glyphOn && size < 32;
  const key = (Object.keys(d).length ? JSON.stringify(d) : 'default') + (glyphOn ? (compact ? '|c' : '|g') : '|n');
  let u = uriCache.get(key);
  if (u === undefined) {
    u = 'data:image/svg+xml,' + encodeURIComponent(buildSvg(d, glyphOn, compact));
    if (uriCache.size >= MAX_URIS) uriCache.delete(uriCache.keys().next().value as string);
    uriCache.set(key, u);
  } else { uriCache.delete(key); uriCache.set(key, u); }
  return u;
}

/** Folder icon. Looks (style, fill, gradient, logo / icon / emoji, backdrop) come from the folder's saved design. */
export const FolderIcon = memo(function FolderIcon({ path, size = 20, design, className = '' }: { path?: string; size?: number; design?: FolderDesign; className?: string }) {
  const styles = useSettings((s) => s.folderStyles); // one identity check per store update; the lookup only runs when it changes
  const d = design ?? (path ? styles[pk(path)] : undefined);
  const src = useMemo(() => uriFor(d ?? {}, size), [d, size]);
  return <img src={src} width={size} height={size} alt="" draggable={false} decoding="async" className={`inline-block flex-none ${className}`} style={size >= 64 ? { filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / .2))' } : undefined} />;
});
