import { argbFromHex, Hct, MaterialDynamicColors, SchemeTonalSpot } from '@material/material-color-utilities'

export type ThemeMode = 'system' | 'light' | 'dark'

export const SEEDS: { id: string; hex: string; en: string; vi: string }[] = [
  { id: 'blue', hex: '#769CDF', en: 'Blue', vi: 'Xanh dương' },
  { id: 'indigo', hex: '#5B6EE1', en: 'Indigo', vi: 'Chàm' },
  { id: 'purple', hex: '#8E6BD8', en: 'Purple', vi: 'Tím' },
  { id: 'pink', hex: '#E0679A', en: 'Pink', vi: 'Hồng' },
  { id: 'red', hex: '#E05757', en: 'Red', vi: 'Đỏ' },
  { id: 'orange', hex: '#F28A3C', en: 'Orange', vi: 'Cam' },
  { id: 'amber', hex: '#E5B020', en: 'Amber', vi: 'Hổ phách' },
  { id: 'green', hex: '#4FA860', en: 'Green', vi: 'Xanh lá' },
  { id: 'teal', hex: '#22A39A', en: 'Teal', vi: 'Xanh mòng két' },
  { id: 'cyan', hex: '#1FA9D0', en: 'Cyan', vi: 'Xanh lơ' },
  { id: 'brown', hex: '#9A7260', en: 'Brown', vi: 'Nâu' },
  { id: 'slate', hex: '#6B7F94', en: 'Slate', vi: 'Xám xanh' },
]

const TOKENS = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground', 'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'outline', 'outlineVariant', 'inverseSurface', 'inverseOnSurface', 'inversePrimary',
  'surfaceDim', 'surfaceBright', 'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
  'surfaceContainerHigh', 'surfaceContainerHighest', 'scrim', 'shadow',
] as const

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
const rgb = (argb: number) => `${(argb >> 16) & 255} ${(argb >> 8) & 255} ${argb & 255}`
const hexToRgb = (h: string) => rgb(argbFromHex(h))

const SEMANTIC = {
  light: {
    success: '#1B6D2F', onSuccess: '#FFFFFF', successContainer: '#A8F4AE', onSuccessContainer: '#002107',
    warning: '#7A5900', onWarning: '#FFFFFF', warningContainer: '#FFDFA0', onWarningContainer: '#261900',
  },
  dark: {
    success: '#8DD895', onSuccess: '#00391A', successContainer: '#0F5224', onSuccessContainer: '#A8F4AE',
    warning: '#F3BF4A', onWarning: '#412D00', warningContainer: '#5D4200', onWarningContainer: '#FFDFA0',
  },
}

const cache = new Map<string, Record<string, string>>()

export function buildTokens(seedHex: string, dark: boolean): Record<string, string> {
  const key = seedHex + dark
  const hit = cache.get(key)
  if (hit) return hit
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seedHex)), dark, 0)
  const mdc = new MaterialDynamicColors() as unknown as Record<string, () => { getArgb(s: unknown): number }>
  const out: Record<string, string> = {}
  for (const t of TOKENS) out[kebab(t)] = rgb(mdc[t]().getArgb(scheme))
  for (const [k, v] of Object.entries(SEMANTIC[dark ? 'dark' : 'light'])) out[kebab(k)] = hexToRgb(v)
  cache.set(key, out)
  return out
}

export function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(mode: ThemeMode, seed: string) {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark())
  const tokens = buildTokens(seed, dark)
  const root = document.documentElement
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--c-${k}`, v)
  root.style.colorScheme = dark ? 'dark' : 'light'
  root.dataset.theme = dark ? 'dark' : 'light'
  return dark
}

export const FONTS: Record<string, { label: string; stack: string }> = {
  system: { label: 'System', stack: '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif' },
  'google-sans-flex': { label: 'Google Sans Flex', stack: '"Google Sans Flex Variable", "Segoe UI", system-ui, sans-serif' },
  'roboto-flex': { label: 'Roboto Flex', stack: '"Roboto Flex Variable", "Segoe UI", system-ui, sans-serif' },
  roboto: { label: 'Roboto', stack: '"Roboto", "Segoe UI", system-ui, sans-serif' },
  arial: { label: 'Arial', stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  inter: { label: 'Inter', stack: '"Inter Variable", "Segoe UI", system-ui, sans-serif' },
  'be-vietnam-pro': { label: 'Be Vietnam Pro', stack: '"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif' },
}

export const FONT_SIZES = { sm: '14px', md: '15.5px', lg: '17px' } as const
export type FontSize = keyof typeof FONT_SIZES
