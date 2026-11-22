/** Per-folder look (stored in settings.folderStyles). Everything needed to draw it is kept inline, so listing a folder never
 *  needs the big icon libraries - they are only loaded while the Customize dialog is open. */
export type FolderStyleId = 'win11' | 'win10' | 'classic' | 'flat' | 'minimal' | 'outline' | 'glass' | 'neon';
export type FillMode = 'solid' | 'linear' | 'radial';
export interface Vec { p: string; w: number; h: number; hex?: string }
export interface FolderDesign {
  style?: FolderStyleId;
  color?: string; color2?: string; fill?: FillMode; angle?: number;
  /** icon id as shown in the picker: "mdi:mdiStar", "fa:star", "brand:siGithub" or "emoji:😀" (legacy ids without ":" are ignored) */
  icon?: string; vec?: Vec; emoji?: string;
  /** "auto" (contrast), "brand" (logo colour) or a #hex */
  iconColor?: string;
  badge?: 'none' | 'circle' | 'rounded'; badgeColor?: string;
  size?: number; x?: number; y?: number; opacity?: number;
}

export const DEFAULT_C1 = '#FFE9A6', DEFAULT_C2 = '#FFC83D';

function rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.padEnd(6, '0').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** amt -1..1: negative mixes with black, positive with white */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = rgb(hex); const t = amt < 0 ? 0 : 255; const p = Math.abs(amt);
  const f = (c: number) => Math.round(c + (t - c) * p);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
/** like shade() but returns #hex (for colour inputs) */
export function shadeHex(hex: string, amt: number): string {
  const [r, g, b] = rgb(hex); const tt = amt < 0 ? 0 : 255; const p = Math.abs(amt);
  const f = (c: number) => Math.round(c + (tt - c) * p).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}
export const luminance = (hex: string) => { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
export const onColor = (hex: string) => (luminance(hex) > 0.62 ? 'rgba(40,28,0,.8)' : 'rgba(255,255,255,.96)');
export const validHex6 = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);

export const STYLES: { id: FolderStyleId; en: string; vi: string }[] = [
  { id: 'win11', en: 'Windows 11', vi: 'Windows 11' }, { id: 'win10', en: 'Windows 10', vi: 'Windows 10' }, { id: 'classic', en: 'Classic', vi: 'Cổ điển' },
  { id: 'flat', en: 'Flat', vi: 'Phẳng' }, { id: 'minimal', en: 'Minimal', vi: 'Tối giản' }, { id: 'outline', en: 'Outline', vi: 'Viền' },
  { id: 'glass', en: 'Glass', vi: 'Kính' }, { id: 'neon', en: 'Neon', vi: 'Neon' }
];

export const SOLID_COLORS = ['#FFC83D', '#FFB224', '#F76B15', '#E5484D', '#CE2C4B', '#E93D82', '#D6409F', '#AB4ABA', '#8E4EC6', '#5B5BD6', '#3E63DD', '#0090FF', '#05A2C2', '#12A594', '#30A46C', '#99D52A', '#A18072', '#8B8D98', '#5E6A78', '#33363D', '#D0D4DA', '#F4F4F5'];
export const GRADIENTS: { name: string; c1: string; c2: string }[] = [
  { name: 'Windows', c1: '#FFE9A6', c2: '#FFC83D' }, { name: 'Sunset', c1: '#FF512F', c2: '#F09819' }, { name: 'Flare', c1: '#F12711', c2: '#F5AF19' }, { name: 'Gold', c1: '#FFD200', c2: '#F7971E' },
  { name: 'Cherry', c1: '#EB3349', c2: '#F45C43' }, { name: 'Peach', c1: '#ED4264', c2: '#FFB88C' }, { name: 'Instagram', c1: '#FD1D1D', c2: '#833AB4' }, { name: 'Purple Love', c1: '#CC2B5E', c2: '#753A88' },
  { name: 'Grape', c1: '#8E2DE2', c2: '#4A00E0' }, { name: 'Aqua', c1: '#00C6FF', c2: '#0072FF' }, { name: 'Ocean', c1: '#6DD5ED', c2: '#2193B0' }, { name: 'Sky', c1: '#56CCF2', c2: '#2F80ED' },
  { name: 'Mint', c1: '#96C93D', c2: '#00B09B' }, { name: 'Mojito', c1: '#93F9B9', c2: '#1D976C' }, { name: 'Lush', c1: '#A8E063', c2: '#56AB2F' }, { name: 'Royal', c1: '#536976', c2: '#292E49' },
  { name: 'Midnight', c1: '#414345', c2: '#232526' }, { name: 'Rose', c1: '#FF9A9E', c2: '#FF5C8D' }
];

/** A ready-made look; the full list lives in presets.generated.ts (made by tools/gen-presets.mjs) with icon paths inlined. */
export interface Preset { id: string; en: string; vi: string; design: FolderDesign }
