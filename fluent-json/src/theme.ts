import { settings } from './settings';
import { isTauri, setWindowMaterial, systemAccent } from './tauri';

/* ───────────── colour helpers ───────────── */
type RGB = [number, number, number];
const hexToRgb = (hex: string): RGB => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = ([r, g, b]: RGB) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
const css = (c: RGB, a = 1) => (a === 1 ? `rgb(${c[0]} ${c[1]} ${c[2]})` : `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`);

/** Accent colour used for text, icons and links: nudged until it reads well (4.5:1) on the theme's surface. */
function accentText(seed: RGB, dark: boolean): RGB {
  const bg: RGB = dark ? [32, 32, 32] : [249, 249, 249];
  const target: RGB = dark ? [255, 255, 255] : [0, 0, 0];
  let c = seed;
  for (let i = 0; i < 20 && contrast(c, bg) < 4.5; i++) c = mix(c, target, 0.1);
  return c;
}

const mq = window.matchMedia('(prefers-color-scheme: dark)');
export const isDark = () => settings.theme === 'dark' || (settings.theme === 'system' && mq.matches);

let sysAccent: string | null = null;
let appliedMaterial = '';
let native = false;
export const hasNativeMaterial = () => native;
export const systemAccentHex = () => sysAccent;
const accentHex = () => (settings.systemAccent && sysAccent ? sysAccent : settings.color);

function paint() {
  const dark = isDark();
  const seed = hexToRgb(accentHex());
  const root = document.documentElement;
  const onAccent: RGB = lum(seed) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set('--accent', css(seed));
  set('--accent-hover', css(seed, 0.9));
  set('--accent-press', css(seed, 0.8));
  set('--accent-sub', css(seed, dark ? 0.22 : 0.14));
  set('--accent-text', css(accentText(seed, dark)));
  set('--on-accent', css(onAccent));
  set('--json-key', 'var(--accent-text)');
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.fs = settings.fontSize;
  root.dataset.font = settings.font;
  root.dataset.codeFont = settings.codeFont;
  root.dataset.motion = settings.motion ? 'on' : 'off';
  root.dataset.material = settings.material;
  root.dataset.native = native ? '1' : '0';
}

/** Apply the window backdrop material (Tauri desktop only). Safe to call often: it only talks to the shell when something changed. */
export async function syncMaterial(force = false): Promise<boolean> {
  if (!isTauri) return false;
  const theme = settings.theme === 'system' ? null : settings.theme;
  const key = `${settings.material}|${theme ?? 'system'}|${isDark()}`;
  if (!force && key === appliedMaterial) return native;
  appliedMaterial = key;
  native = await setWindowMaterial(settings.material, theme);
  paint();
  onApplied?.();
  return native;
}

/** Read Windows' accent colour once at start-up. */
export async function loadSystemAccent() {
  sysAccent = await systemAccent();
  paint();
}

let onApplied: (() => void) | null = null;
export function onThemeApplied(f: () => void) { onApplied = f; }

/** Apply theme variables; with an origin, reveal the change as a circular wipe (View Transitions API). */
export function applyTheme(origin?: { x: number; y: number }) {
  const run = () => { paint(); onApplied?.(); };
  const vt = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }).startViewTransition;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (origin && vt && settings.motion && !reduce) {
    const { x, y } = origin;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const tr = vt.call(document, run);
    tr.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 450, easing: 'cubic-bezier(.1, .9, .2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => undefined);
  } else run();
  void syncMaterial();
}

mq.addEventListener('change', () => { if (settings.theme === 'system') applyTheme(); });
