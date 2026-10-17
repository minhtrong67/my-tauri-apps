// Font list for the toolbar: bundled fonts (always available) + common system fonts that are really installed.
export const BUNDLED = ["Be Vietnam Pro", "Inter", "Lora", "Noto Sans", "Noto Serif", "Open Sans", "Roboto", "Roboto Mono"];
const CANDIDATES = [
  "Arial", "Arial Black", "Arial Narrow", "Bahnschrift", "Book Antiqua", "Calibri", "Cambria", "Candara", "Cascadia Code", "Century Gothic", "Comic Sans MS", "Consolas", "Constantia", "Corbel",
  "Courier New", "DejaVu Sans", "Franklin Gothic Medium", "Garamond", "Georgia", "Gill Sans MT", "Helvetica", "Helvetica Neue", "Impact", "Liberation Sans", "Lucida Console", "Lucida Sans Unicode",
  "Menlo", "Microsoft Sans Serif", "Monaco", "Palatino Linotype", "Segoe Print", "Segoe Script", "Segoe UI", "Sitka Text", "SF Pro Text", "Tahoma", "Times New Roman", "Trebuchet MS", "Ubuntu", "Verdana",
];
let cache = null;
function installed(names) {
  try {
    const c = document.createElement("canvas").getContext("2d"), sample = "mmmmmmmmmmlliWW@#あ", base = ["monospace", "serif", "sans-serif"];
    const w = (f) => { c.font = `72px ${f}`; return c.measureText(sample).width; };
    const ref = base.map((b) => w(b));
    return names.filter((n) => base.some((b, i) => w(`"${n}", ${b}`) !== ref[i]));
  } catch { return names; }
}
/** sorted, de-duplicated font names */
export function availableFonts() {
  if (!cache) cache = [...new Set([...BUNDLED, ...installed(CANDIDATES)])].sort((a, b) => a.localeCompare(b));
  return cache;
}
