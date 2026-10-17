// Font choices. The default is the operating system UI font; the others are popular fonts.
// Only fonts that are really installed on this device (plus the bundled Roboto) are offered.
export const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const F = (name, fallback = 'sans-serif', bundled = false) => ({ id: name, name, stack: `"${name}", ${fallback}`, bundled });

const CATALOG = [
  F('Roboto', 'sans-serif', true),
  F('Segoe UI'), F('Inter'), F('Open Sans'), F('Noto Sans'), F('Be Vietnam Pro'),
  F('Arial'), F('Calibri'), F('Verdana'), F('Tahoma'), F('Trebuchet MS'), F('Comic Sans MS'),
  F('Georgia', 'serif'), F('Times New Roman', 'serif'), F('Cambria', 'serif'),
  F('Consolas', 'monospace'), F('Cascadia Code', 'monospace'), F('Courier New', 'monospace'),
];

let ctx;
/** True when a font is installed: its text measures differently from every generic fallback. */
function installed(name) {
  ctx = ctx || document.createElement('canvas').getContext('2d');
  const sample = 'mmmmmmmmmmlli Đạ 0123456789';
  const width = (f) => { ctx.font = `64px ${f}`; return ctx.measureText(sample).width; };
  return ['monospace', 'serif', 'sans-serif'].some((b) => width(`"${name}", ${b}`) !== width(b));
}

let cache;
/** [{ id: 'system', ... }, ...installed fonts] */
export function availableFonts() {
  if (!cache) cache = [{ id: 'system', name: '', stack: SYSTEM_STACK }, ...CATALOG.filter((f) => f.bundled || installed(f.name))];
  return cache;
}

export const findFont = (id) => availableFonts().find((f) => f.id === id) || availableFonts()[0];

export function applyFont(id) {
  const f = findFont(id);
  const root = document.documentElement;
  if (f.id === 'system') root.style.removeProperty('--font');
  else root.style.setProperty('--font', f.stack);
  return f.id;
}
