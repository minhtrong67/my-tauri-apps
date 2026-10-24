import type { FontId, FontSize } from './types';

const SYSTEM = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif";
const tail = ', system-ui, -apple-system, "Segoe UI", sans-serif';

export interface FontDef {
  id: FontId;
  label: string;
  stack: string;
  load?: () => Promise<unknown>;
}
// Bundled with the app (works offline). Only the latin + vietnamese subsets are included.
export const FONTS: FontDef[] = [
  { id: 'system', label: 'System UI', stack: SYSTEM },
  {
    id: 'roboto', label: 'Roboto', stack: `'Roboto'${tail}`,
    load: () => Promise.all([import('@fontsource/roboto/latin-400.css'), import('@fontsource/roboto/latin-500.css'), import('@fontsource/roboto/latin-700.css'), import('@fontsource/roboto/vietnamese-400.css'), import('@fontsource/roboto/vietnamese-500.css'), import('@fontsource/roboto/vietnamese-700.css')]),
  },
  {
    id: 'inter', label: 'Inter', stack: `'Inter'${tail}`,
    load: () => Promise.all([import('@fontsource/inter/latin-400.css'), import('@fontsource/inter/latin-500.css'), import('@fontsource/inter/latin-700.css'), import('@fontsource/inter/vietnamese-400.css'), import('@fontsource/inter/vietnamese-500.css'), import('@fontsource/inter/vietnamese-700.css')]),
  },
  {
    id: 'open-sans', label: 'Open Sans', stack: `'Open Sans'${tail}`,
    load: () => Promise.all([import('@fontsource/open-sans/latin-400.css'), import('@fontsource/open-sans/latin-500.css'), import('@fontsource/open-sans/latin-700.css'), import('@fontsource/open-sans/vietnamese-400.css'), import('@fontsource/open-sans/vietnamese-500.css'), import('@fontsource/open-sans/vietnamese-700.css')]),
  },
  {
    id: 'be-vietnam-pro', label: 'Be Vietnam Pro', stack: `'Be Vietnam Pro'${tail}`,
    load: () => Promise.all([import('@fontsource/be-vietnam-pro/latin-400.css'), import('@fontsource/be-vietnam-pro/latin-500.css'), import('@fontsource/be-vietnam-pro/latin-700.css'), import('@fontsource/be-vietnam-pro/vietnamese-400.css'), import('@fontsource/be-vietnam-pro/vietnamese-500.css'), import('@fontsource/be-vietnam-pro/vietnamese-700.css')]),
  },
];
const byId = (id: FontId) => FONTS.find((f) => f.id === id) ?? FONTS[0];
const loaded = new Set<FontId>();

export async function loadFont(id: FontId) {
  const f = byId(id);
  if (!f.load || loaded.has(id)) return;
  try {
    await f.load();
    loaded.add(id);
  } catch (e) {
    console.warn('font load failed', e);
  }
}
export async function applyFont(id: FontId) {
  await loadFont(id);
  document.documentElement.style.setProperty('--app-font', byId(id).stack);
}
export const preloadAllFonts = () => Promise.all(FONTS.map((f) => loadFont(f.id)));

export function applyFontSize(size: FontSize) {
  document.documentElement.dataset.fs = size; // see index.css (14 / 16 / 18 px root)
}
