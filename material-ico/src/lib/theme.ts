import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities';
import preset from '../theme/material-theme.json';

export const DEFAULT_SEED = '#769CDF';

/** Material color families offered in Settings (first one = the built-in Material Theme Builder export). */
export const PALETTE = [
  { id: 'default', hex: '#769CDF' }, { id: 'red', hex: '#F44336' }, { id: 'pink', hex: '#E91E63' },
  { id: 'purple', hex: '#9C27B0' }, { id: 'deepPurple', hex: '#673AB7' }, { id: 'indigo', hex: '#3F51B5' },
  { id: 'blue', hex: '#2196F3' }, { id: 'cyan', hex: '#00BCD4' }, { id: 'teal', hex: '#009688' },
  { id: 'green', hex: '#4CAF50' }, { id: 'lime', hex: '#CDDC39' }, { id: 'amber', hex: '#FFC107' },
  { id: 'orange', hex: '#FF9800' }, { id: 'deepOrange', hex: '#FF5722' }, { id: 'brown', hex: '#795548' },
  { id: 'blueGrey', hex: '#607D8B' },
] as const;

const KEYS = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant', 'outline', 'outlineVariant',
  'inverseSurface', 'inverseOnSurface', 'inversePrimary', 'scrim',
  'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest',
] as const;

const STATUS = {
  light: {
    success: '#1B7F3B', onSuccess: '#FFFFFF', successContainer: '#C9F2D3', onSuccessContainer: '#00210C',
    warning: '#8A5A00', onWarning: '#FFFFFF', warningContainer: '#FFE2A8', onWarningContainer: '#2B1900',
  },
  dark: {
    success: '#78DC95', onSuccess: '#00391A', successContainer: '#005228', onSuccessContainer: '#C9F2D3',
    warning: '#FFBA3B', onWarning: '#472B00', warningContainer: '#664000', onWarningContainer: '#FFE2A8',
  },
};

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const triplet = (hex: string) => {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
};

type Tokens = Record<string, string>;

function generate(seed: string, dark: boolean): Tokens {
  const theme = themeFromSourceColor(argbFromHex(seed));
  const scheme = (dark ? theme.schemes.dark : theme.schemes.light).toJSON() as unknown as Record<string, number>;
  const n = theme.palettes.neutral;
  const tones = dark ? [4, 10, 12, 17, 22] : [100, 96, 94, 92, 90];
  const out: Tokens = {};
  for (const k of KEYS) if (scheme[k] !== undefined) out[k] = hexFromArgb(scheme[k]);
  [out.surfaceContainerLowest, out.surfaceContainerLow, out.surfaceContainer, out.surfaceContainerHigh, out.surfaceContainerHighest] =
    tones.map((t) => hexFromArgb(n.tone(t)));
  return out;
}

export function buildTokens(seed: string, dark: boolean): Tokens {
  const t: Tokens = seed.toLowerCase() === DEFAULT_SEED.toLowerCase()
    ? { ...((preset.schemes as unknown as Record<string, Tokens>)[dark ? 'dark' : 'light']) }
    : generate(seed, dark);
  t.panel = t.surfaceContainerLow;
  t.card = dark ? t.surfaceContainerHigh : t.surfaceContainerLowest;
  return { ...t, ...STATUS[dark ? 'dark' : 'light'] };
}

export function applyTheme(seed: string, dark: boolean) {
  const root = document.documentElement;
  const tokens = buildTokens(seed, dark);
  for (const [k, v] of Object.entries(tokens)) {
    if (typeof v === 'string' && v.startsWith('#')) root.style.setProperty(`--md-${kebab(k)}`, triplet(v));
  }
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.theme = dark ? 'dark' : 'light';
}
