// Applies theme / accent / language / page appearance from settings.
import { settings, saveSettings } from './settings.js';
import { applyTheme, resolveDark, watchSystemTheme } from './theme.js';
import { setLanguage } from './i18n.js';
import { bus } from './state.js';

const SYS_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export function applyUiFont() {
  const f = settings.uiFont;
  document.documentElement.style.setProperty('--font', !f || f === 'system' ? SYS_FONT : `'${String(f).replace(/['"\\]/g, '')}', ${SYS_FONT}`);
}
const UI_SCALE = { small: 0.92, medium: 1, large: 1.12 };
/** Interface text size: CSS multiplies every UI font-size by --fs (document text is not affected). */
export function applyUiSize() {
  document.documentElement.style.setProperty('--fs', String(UI_SCALE[settings.uiSize] || 1));
  document.documentElement.dataset.uisize = settings.uiSize;
}
export function refreshTheme() {
  applyUiFont();
  applyUiSize();
  applyTheme(settings.theme, settings.seed);
  document.documentElement.classList.toggle('dark-page', !!settings.darkPage && resolveDark(settings.theme));
  document.documentElement.style.setProperty('--doc-font', settings.font ? `'${settings.font}'` : 'Calibri');
  bus.emit('theme');
}
export function setTheme(mode) { settings.theme = mode; saveSettings(); smooth(); refreshTheme(); }
export function setSeed(hex) { settings.seed = hex; saveSettings(); smooth(); refreshTheme(); }
export function refreshLanguage() {
  const l = setLanguage(settings.lang);
  bus.emit('lang', l);
}
let sm;
function smooth() {
  document.documentElement.classList.add('theme-fade');
  clearTimeout(sm);
  sm = setTimeout(() => document.documentElement.classList.remove('theme-fade'), 420);
}
watchSystemTheme(() => { if (settings.theme === 'system') refreshTheme(); });
