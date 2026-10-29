import '@fontsource-variable/roboto/wght.css'
import type { FontId } from './settings'

export const FONTS: { id: FontId; label: string; stack: string }[] = [
  { id: 'roboto', label: 'Roboto', stack: "'Roboto Variable', Roboto, system-ui, 'Segoe UI', sans-serif" },
  { id: 'system', label: 'System UI', stack: "system-ui, -apple-system, 'Segoe UI Variable', 'Segoe UI', sans-serif" },
  { id: 'inter', label: 'Inter', stack: "'Inter Variable', system-ui, 'Segoe UI', sans-serif" },
  { id: 'nunito', label: 'Nunito', stack: "'Nunito Variable', system-ui, 'Segoe UI', sans-serif" },
  { id: 'bevietnam', label: 'Be Vietnam Pro', stack: "'Be Vietnam Pro', system-ui, 'Segoe UI', sans-serif" },
]

const loaders: Partial<Record<FontId, () => Promise<unknown>>> = {
  inter: () => import('@fontsource-variable/inter/wght.css'),
  nunito: () => import('@fontsource-variable/nunito/wght.css'),
  bevietnam: async () => {
    await import('@fontsource/be-vietnam-pro/400.css')
    await import('@fontsource/be-vietnam-pro/500.css')
    await import('@fontsource/be-vietnam-pro/600.css')
    await import('@fontsource/be-vietnam-pro/700.css')
  },
}
const loaded = new Set<FontId>(['roboto', 'system'])

/** Loads a font on demand (other fonts are code-split, so they cost nothing until picked). */
export async function loadFont(id: FontId) {
  if (loaded.has(id)) return
  loaded.add(id)
  try { await loaders[id]?.() } catch { loaded.delete(id) }
}
export const fontStack = (id: FontId) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).stack
