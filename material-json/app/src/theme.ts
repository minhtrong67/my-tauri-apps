import { Blend, Hct, MaterialDynamicColors as M, SchemeTonalSpot, argbFromHex, hexFromArgb } from '@material/material-color-utilities';
import type { DynamicColor } from '@material/material-color-utilities';
import { settings } from './settings';

const ROLES: Record<string, DynamicColor> = {
  primary: M.primary, onPrimary: M.onPrimary, primaryContainer: M.primaryContainer, onPrimaryContainer: M.onPrimaryContainer,
  secondary: M.secondary, onSecondary: M.onSecondary, secondaryContainer: M.secondaryContainer, onSecondaryContainer: M.onSecondaryContainer,
  tertiary: M.tertiary, onTertiary: M.onTertiary, tertiaryContainer: M.tertiaryContainer, onTertiaryContainer: M.onTertiaryContainer,
  error: M.error, onError: M.onError, errorContainer: M.errorContainer, onErrorContainer: M.onErrorContainer,
  background: M.background, onBackground: M.onBackground, surface: M.surface, onSurface: M.onSurface,
  surfaceVariant: M.surfaceVariant, onSurfaceVariant: M.onSurfaceVariant, outline: M.outline, outlineVariant: M.outlineVariant,
  inverseSurface: M.inverseSurface, inverseOnSurface: M.inverseOnSurface, inversePrimary: M.inversePrimary,
  surfaceDim: M.surfaceDim, surfaceBright: M.surfaceBright, surfaceContainerLowest: M.surfaceContainerLowest,
  surfaceContainerLow: M.surfaceContainerLow, surfaceContainer: M.surfaceContainer, surfaceContainerHigh: M.surfaceContainerHigh,
  surfaceContainerHighest: M.surfaceContainerHighest, shadow: M.shadow, scrim: M.scrim,
};

// Semantic syntax colours, harmonised towards the seed colour (Material "custom colors").
const SYNTAX: Record<string, string> = { string: '#2E7D32', number: '#1565C0', bool: '#8E24AA', null: '#C62828' };

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const mq = window.matchMedia('(prefers-color-scheme: dark)');

export const isDark = () => settings.theme === 'dark' || (settings.theme === 'system' && mq.matches);

function paint() {
  const dark = isDark();
  const seed = argbFromHex(settings.color);
  const scheme = new SchemeTonalSpot(Hct.fromInt(seed), dark, 0);
  const root = document.documentElement;
  for (const [name, role] of Object.entries(ROLES)) root.style.setProperty(`--md-${kebab(name)}`, hexFromArgb(role.getArgb(scheme)));
  for (const [name, hex] of Object.entries(SYNTAX)) {
    const h = Hct.fromInt(Blend.harmonize(argbFromHex(hex), seed));
    root.style.setProperty(`--json-${name}`, hexFromArgb(Hct.from(h.hue, Math.max(h.chroma, 36), dark ? 78 : 36).toInt()));
  }
  root.style.setProperty('--json-key', 'var(--md-primary)');
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.fs = settings.fontSize;
  root.dataset.motion = settings.motion ? 'on' : 'off';
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
        { duration: 620, easing: 'cubic-bezier(.2,0,0,1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => undefined);
  } else run();
}

mq.addEventListener('change', () => { if (settings.theme === 'system') applyTheme(); });
