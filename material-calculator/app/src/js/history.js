import { Emitter, persist } from './store.js';

const LIMIT = 150;
class History extends Emitter {
  items = persist.read('history', []);
  add(entry) {
    this.items.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), ...entry });
    if (this.items.length > LIMIT) this.items.length = LIMIT;
    this.#changed();
  }
  remove(id) { this.items = this.items.filter((i) => i.id !== id); this.#changed(); }
  clear() { this.items = []; this.#changed(); }
  #changed() { persist.write('history', this.items); this.emit('change'); }
}
export const history = new History();

class Memory extends Emitter {
  items = persist.read('memory', []);   // array of numbers, newest first
  get has() { return this.items.length > 0; }
  store(v) { this.items.unshift(v); this.#changed(); }
  add(v, i = 0) { if (!this.items.length) this.items.unshift(v); else this.items[i] += v; this.#changed(); }
  sub(v, i = 0) { if (!this.items.length) this.items.unshift(-v); else this.items[i] -= v; this.#changed(); }
  recall() { return this.items[0]; }
  remove(i) { this.items.splice(i, 1); this.#changed(); }
  clear() { this.items = []; this.#changed(); }
  #changed() { persist.write('memory', this.items); this.emit('change'); }
}
export const memory = new Memory();
