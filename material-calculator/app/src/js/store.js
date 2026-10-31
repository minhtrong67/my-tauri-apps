// Tiny persistent store (settings, history, memory) backed by localStorage.
const PREFIX = 'mcalc:';

function read(key, fallback) {
  try { const v = localStorage.getItem(PREFIX + key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
const timers = new Map();
function write(key, value) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
  }, 120));
}
export function writeNow(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* ignore */ }
}
export const persist = { read, write };

class Emitter {
  #l = new Map();
  on(evt, fn) { (this.#l.get(evt) || this.#l.set(evt, new Set()).get(evt)).add(fn); return () => this.#l.get(evt)?.delete(fn); }
  emit(evt, ...a) { this.#l.get(evt)?.forEach((fn) => fn(...a)); }
}
export { Emitter };

const DEFAULTS = {
  theme: 'system',          // light | dark | system
  seed: '#6750A4',          // theme colour
  lang: 'system',           // system | en | vi
  fontFamily: 'roboto',   // system | roboto | inter | nunito | opensans
  fontSize: 'md',         // sm | md | lg
  windowMode: 'remember',   // remember | maximize
  alwaysOnTop: false,
  grouping: true,           // digit grouping
  angle: 'deg',             // deg | rad | grad
  motion: 'auto',           // auto | on | off
  panelOpen: true,
  panelTab: 'history',      // history | memory
  mode: 'standard',         // standard | scientific | programmer | converter | date
  bitsOpen: false,
  progBase: 'DEC',
  wordSize: 64,
  convCat: 'length',
};

class Settings extends Emitter {
  data = { ...DEFAULTS, ...read('settings', {}) };
  get(k) { return this.data[k]; }
  reset() { const keep = { mode: this.data.mode }; this.data = { ...DEFAULTS, ...keep }; write('settings', this.data); this.emit('*', '*'); for (const k in DEFAULTS) this.emit(k, this.data[k]); }
  set(k, v) {
    if (this.data[k] === v) return;
    this.data[k] = v;
    write('settings', this.data);
    this.emit(k, v); this.emit('*', k, v);
  }
}
export const settings = new Settings();
