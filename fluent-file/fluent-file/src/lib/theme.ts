/* Microsoft Fluent Design theming. Surfaces are neutral greys (Windows 11 light / dark); only the accent
   colour follows the user's choice. The accent is derived from a seed colour in OKLCH: it is darkened in the
   light theme and lightened in the dark theme so text on it stays readable, like the Windows accent. */
export interface SwatchDef { hex: string; en: string; vi: string }
/** Windows 11 accent colours */
export const PALETTE: SwatchDef[] = [
  { hex: '#0078D4', en: 'Blue', vi: 'Xanh dương' }, { hex: '#0063B1', en: 'Navy', vi: 'Xanh đậm' },
  { hex: '#8E8CD8', en: 'Iris', vi: 'Tím nhạt' }, { hex: '#6B69D6', en: 'Periwinkle', vi: 'Tím xanh' },
  { hex: '#8764B8', en: 'Lavender', vi: 'Oải hương' }, { hex: '#744DA9', en: 'Violet', vi: 'Tím' },
  { hex: '#B146C2', en: 'Orchid', vi: 'Phong lan' }, { hex: '#C239B3', en: 'Magenta', vi: 'Đỏ tươi' },
  { hex: '#E3008C', en: 'Plum', vi: 'Mận' }, { hex: '#EA005E', en: 'Rose', vi: 'Hồng' },
  { hex: '#E74856', en: 'Red', vi: 'Đỏ' }, { hex: '#D13438', en: 'Brick', vi: 'Đỏ gạch' },
  { hex: '#F7630C', en: 'Orange', vi: 'Cam' }, { hex: '#FF8C00', en: 'Gold', vi: 'Vàng cam' },
  { hex: '#FFB900', en: 'Yellow', vi: 'Vàng' }, { hex: '#498205', en: 'Green', vi: 'Xanh lá' },
  { hex: '#10893E', en: 'Emerald', vi: 'Xanh ngọc' }, { hex: '#00B294', en: 'Mint', vi: 'Xanh bạc hà' },
  { hex: '#038387', en: 'Teal', vi: 'Xanh mòng két' }, { hex: '#00B7C3', en: 'Cyan', vi: 'Xanh lơ' },
  { hex: '#7A7574', en: 'Stone', vi: 'Xám đá' }, { hex: '#515C6B', en: 'Slate', vi: 'Xám xanh' }
];
export const DEFAULT_SEED = '#0078D4';
export const LIGHT_SWATCH = new Set(['#ffb900', '#ff8c00', '#00b7c3', '#00b294', '#8e8cd8']);

export interface FontDef { id: string; label: string | null; stack: string }
/** The default is the operating-system UI font (Segoe UI Variable on Windows 11); the others are fonts installed with the OS. */
export const FONTS: FontDef[] = [
  { id: 'system', label: null, stack: 'system-ui, "Segoe UI Variable Text", "Segoe UI", -apple-system, "Helvetica Neue", Arial, "Noto Sans", sans-serif' },
  { id: 'segoe', label: 'Segoe UI', stack: '"Segoe UI", system-ui, sans-serif' },
  { id: 'arial', label: 'Arial', stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { id: 'tahoma', label: 'Tahoma', stack: 'Tahoma, Geneva, sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet MS', stack: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: 'calibri', label: 'Calibri', stack: 'Calibri, "Segoe UI", sans-serif' },
  { id: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
  { id: 'consolas', label: 'Consolas', stack: 'Consolas, "Cascadia Mono", "SF Mono", monospace' }
];
export const fontById = (id: string) => FONTS.find((f) => f.id === id) || FONTS[0];

/** root font-size (px) per text-size option; every rem-based size in the UI follows it */
export const FONT_SIZES = { sm: 14.5, md: 16, lg: 17.5 } as const;
export type FontSize = keyof typeof FONT_SIZES;

/** The Windows 11 default blue uses the exact system accent values. */
const EXACT: Record<string, { light: [string, string]; dark: [string, string] }> = {
  '#0078d4': { light: ['#0067C0', '#FFFFFF'], dark: ['#60CDFF', '#000000'] }
};

export function hexToOklch(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = lin(((n >> 16) & 255) / 255), g = lin(((n >> 8) & 255) / 255), b = lin((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(a, bb), h: (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360 };
}

export const validHex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
export const systemDark = () => !!mq?.matches;
export const onSystemSchemeChange = (cb: () => void) => { mq?.addEventListener('change', cb); return () => mq?.removeEventListener('change', cb); };
export const isDark = (mode: string) => mode === 'dark' || (mode === 'system' && systemDark());

export function accentFor(seed: string, dark: boolean): { primary: string; on: string } {
  const exact = EXACT[seed.toLowerCase()];
  if (exact) { const [p, o] = exact[dark ? 'dark' : 'light']; return { primary: p, on: o }; }
  const { l, c, h } = hexToOklch(seed);
  const L = dark ? Math.min(0.82, Math.max(0.7, l + 0.14)) : Math.min(0.56, Math.max(0.44, l));
  return { primary: `oklch(${L.toFixed(3)} ${Math.min(0.2, c).toFixed(3)} ${h.toFixed(1)})`, on: dark ? '#000000' : '#FFFFFF' };
}

export interface ThemeInput { theme: string; seed: string; font: string; fontSize: string; density: string }

/** Applies mode, accent colour, font, text size and density to <html>. Returns true when dark. */
export function applyTheme(s: ThemeInput): boolean {
  const root = document.documentElement;
  const seed = validHex(s.seed) ? s.seed : DEFAULT_SEED;
  const dark = isDark(s.theme);
  root.dataset.scheme = dark ? 'dark' : 'light';
  const a = accentFor(seed, dark);
  root.style.setProperty('--primary', a.primary);
  root.style.setProperty('--on-primary', a.on);
  root.style.setProperty('--font', fontById(s.font).stack);
  root.style.fontSize = (FONT_SIZES[s.fontSize as FontSize] || 16) + 'px';
  root.dataset.density = s.density;
  return dark;
}
export const uiScale = (fontSize: string) => (FONT_SIZES[fontSize as FontSize] || 16) / 16;
