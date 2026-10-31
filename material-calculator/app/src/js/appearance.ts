// Applies font family + text size from settings to the document.
import { settings } from './store.js';

export const FONTS: [string, string, string][] = [
  ['system', 'font.system', 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'],
  ['roboto', '', '"Roboto", system-ui, sans-serif'],
  ['inter', '', '"Inter", system-ui, sans-serif'],
  ['nunito', '', '"Nunito", system-ui, sans-serif'],
  ['opensans', '', '"Open Sans", system-ui, sans-serif'],
];
export const FONT_LABEL: Record<string, string> = { roboto: 'Roboto', inter: 'Inter', nunito: 'Nunito', opensans: 'Open Sans' };
const SCALE: Record<string, number> = { sm: 0.9, md: 1, lg: 1.12 };

export function applyAppearance() {
  const f = FONTS.find((x) => x[0] === settings.get('fontFamily')) ?? FONTS[1];
  const root = document.documentElement;
  root.style.setProperty('--font', f[2]);
  root.style.setProperty('--ui-scale', String(SCALE[settings.get('fontSize') as string] ?? 1));
}
export function initAppearance() {
  applyAppearance();
  settings.on('fontFamily', applyAppearance);
  settings.on('fontSize', applyAppearance);
}
