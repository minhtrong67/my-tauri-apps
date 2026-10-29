import {
  argbFromHex, hexFromArgb, Hct, MaterialDynamicColors as M, SchemeTonalSpot, SchemeVibrant, type DynamicColor,
} from '@material/material-color-utilities'
import type { Settings } from './settings'

const ROLES: Record<string, DynamicColor> = {
  primary: M.primary, 'on-primary': M.onPrimary, 'primary-container': M.primaryContainer, 'on-primary-container': M.onPrimaryContainer,
  secondary: M.secondary, 'on-secondary': M.onSecondary, 'secondary-container': M.secondaryContainer, 'on-secondary-container': M.onSecondaryContainer,
  tertiary: M.tertiary, 'on-tertiary': M.onTertiary, 'tertiary-container': M.tertiaryContainer, 'on-tertiary-container': M.onTertiaryContainer,
  error: M.error, 'on-error': M.onError, 'error-container': M.errorContainer, 'on-error-container': M.onErrorContainer,
  surface: M.surface, 'surface-dim': M.surfaceDim, 'surface-bright': M.surfaceBright, 'on-surface': M.onSurface, 'on-surface-variant': M.onSurfaceVariant,
  'surface-container-lowest': M.surfaceContainerLowest, 'surface-container-low': M.surfaceContainerLow, 'surface-container': M.surfaceContainer,
  'surface-container-high': M.surfaceContainerHigh, 'surface-container-highest': M.surfaceContainerHighest,
  outline: M.outline, 'outline-variant': M.outlineVariant, 'inverse-surface': M.inverseSurface, 'inverse-on-surface': M.inverseOnSurface,
  'inverse-primary': M.inversePrimary, scrim: M.scrim, shadow: M.shadow,
}

/** Applies the Material 3 colour scheme as CSS variables on <html>. */
export function applyTheme(s: Pick<Settings, 'theme' | 'seed' | 'variant' | 'contrast'>, prefersDark: boolean) {
  const dark = s.theme === 'dark' || (s.theme === 'system' && prefersDark)
  const Scheme = s.variant === 'vibrant' ? SchemeVibrant : SchemeTonalSpot
  let argb = 0xff2196f3
  try { argb = argbFromHex(s.seed) } catch { /* keep fallback */ }
  const scheme = new Scheme(Hct.fromInt(argb), dark, s.contrast)
  const root = document.documentElement
  for (const [name, role] of Object.entries(ROLES)) root.style.setProperty(`--md-${name}`, hexFromArgb(role.getArgb(scheme)))
  root.dataset.scheme = dark ? 'dark' : 'light'
  root.style.colorScheme = dark ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', hexFromArgb(M.surface.getArgb(scheme)))
  return dark
}
