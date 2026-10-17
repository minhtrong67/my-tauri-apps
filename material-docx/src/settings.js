// Persistent user settings (localStorage) — theme, language, window behaviour, editor defaults.
const KEY = 'material-docx.settings.v2';

export const DEFAULTS = {
  theme: 'system',        // light | dark | system
  seed: '#2B579A',        // accent colour (default: the classic word-processor blue)
  lang: 'auto',           // auto | en | vi
  start: 'remember',      // window on launch: remember | maximized
  units: 'auto',          // auto | cm | in
  zoom: 100,
  spell: false,
  autocorrect: true,
  ruler: false,
  marks: false,
  nav: false,
  view: 'print',          // print | web | read
  ribbonCollapsed: false,
  darkPage: false,
  author: '',
  uiFont: 'system',       // interface font: system | any installed family
  font: 'Calibri',
  fontSize: 11,
  autosave: true,
  size: 'A4', orientation: 'portrait',
  margins: { top: 96, bottom: 96, left: 96, right: 96 },
  recent: [],
};

export const settings = JSON.parse(JSON.stringify(DEFAULTS));
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* ignore */ }
if (settings.start !== 'maximized') settings.start = 'remember';
if (!settings.migrated2) { settings.spell = false; settings.migrated2 = 1; } // squiggles on non-English text were noisy

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

export const units = () => {
  if (settings.units !== 'auto') return settings.units;
  const l = (navigator.language || 'en').toLowerCase();
  return l.startsWith('en-us') || l === 'en' ? 'in' : 'cm';
};
