// Programmer calculator: BigInt arithmetic with selectable word size and base.
export const RADIX = { HEX: 16, DEC: 10, OCT: 8, BIN: 2 };
const DIGITS = '0123456789ABCDEF';
const LEVELS = [['or', 'nor'], ['xor'], ['and', 'nand'], ['shl', 'shr'], ['+', '-'], ['*', '/', 'mod']];
const OP_TEXT = { '+': '+', '-': '\u2212', '*': '\u00D7', '/': '\u00F7', mod: 'mod', and: 'AND', or: 'OR', xor: 'XOR', nand: 'NAND', nor: 'NOR', shl: '<<', shr: '>>' };

export class ProgError extends Error { constructor(code) { super(code); this.code = code; } }

export class Prog {
  base = 'DEC';
  size = 64;
  tokens = [];      // {t:'n', v} | {t:'op', v} | {t:'('} | {t:')'}
  entry = '';
  result = null;    // BigInt
  lastExpr = '';
  final = false;
  error = null;

  wrap(v) { return BigInt.asIntN(this.size, v); }
  uns(v) { return BigInt.asUintN(this.size, v); }
  get radix() { return RADIX[this.base]; }
  get max() { return (1n << BigInt(this.size - 1)) - 1n; }
  get min() { return -(1n << BigInt(this.size - 1)); }

  str(v, base = this.base) {
    return base === 'DEC' ? this.wrap(v).toString(10) : this.uns(v).toString(RADIX[base]).toUpperCase();
  }
  parse(s, base = this.base) {
    if (s === '' || s === '-') return 0n;
    const r = BigInt(RADIX[base]);
    let neg = false, v = 0n;
    for (const ch of s) { if (ch === '-') { neg = true; continue; } v = v * r + BigInt(DIGITS.indexOf(ch)); }
    return this.wrap(neg ? -v : v);
  }
  fits(s) {
    if (this.base === 'DEC') { const neg = s.startsWith('-'); let v = 0n; for (const c of s.replace('-', '')) v = v * 10n + BigInt(c); return neg ? -v >= this.min : v <= this.max; }
    let v = 0n; const r = BigInt(this.radix);
    for (const c of s) v = v * r + BigInt(DIGITS.indexOf(c));
    return v < (1n << BigInt(this.size));
  }

  /** The value shown in the base rows and bit grid. */
  cur() {
    if (this.entry !== '') return this.parse(this.entry);
    if (this.tokens.length) { const p = this.preview(); if (p !== null) return p; }
    return this.result ?? 0n;
  }

  #commit() {
    if (this.entry !== '') { this.tokens.push({ t: 'n', v: this.parse(this.entry) }); this.entry = ''; }
  }
  #reset() { this.tokens = []; this.entry = ''; this.final = false; }
  #fresh() { if (this.final) { this.#reset(); } }

  press(key) {
    this.error = null;
    if (/^[0-9A-F]$/.test(key)) return this.#digit(key);
    if (key.startsWith('op:')) return this.#op(key.slice(3));
    switch (key) {
      case '(': return this.#open();
      case ')': return this.#close();
      case '=': return this.#equals();
      case 'bs': return this.#backspace();
      case 'ac': this.#reset(); this.result = null; this.lastExpr = ''; return;
      case 'neg': return this.#unary((v) => -v);
      case 'not': return this.#unary((v) => ~v);
    }
  }

  #digit(d) {
    if (DIGITS.indexOf(d) >= this.radix) return;
    this.#fresh();
    const next = this.entry === '0' ? d : this.entry === '-0' ? '-' + d : this.entry + d;
    if (!this.fits(next)) return;
    this.entry = next;
  }
  #op(name) {
    if (this.final) { this.tokens = [{ t: 'n', v: this.result }]; this.final = false; }
    this.#commit();
    const last = this.tokens[this.tokens.length - 1];
    if (!last || last.t === '(') { if (name === '-') { this.tokens.push({ t: 'op', v: '-' }); return; } this.tokens.push({ t: 'n', v: this.result ?? 0n }); }
    else if (last.t === 'op') { this.tokens[this.tokens.length - 1] = { t: 'op', v: name }; return; }
    this.tokens.push({ t: 'op', v: name });
  }
  #open() {
    this.#fresh();
    if (this.entry !== '') return;
    const last = this.tokens[this.tokens.length - 1];
    if (last && (last.t === 'n' || last.t === ')')) return;
    this.tokens.push({ t: '(' });
  }
  #close() {
    const open = this.tokens.filter((t) => t.t === '(').length - this.tokens.filter((t) => t.t === ')').length;
    if (open <= 0) return;
    this.#commit();
    const last = this.tokens[this.tokens.length - 1];
    if (last && (last.t === 'n' || last.t === ')')) this.tokens.push({ t: ')' });
  }
  #unary(fn) {
    const base = this.final ? this.result : this.cur();
    if (this.final) this.#reset();
    this.entry = this.str(this.wrap(fn(base)));
    if (this.base !== 'DEC' && this.entry === '') this.entry = '0';
  }
  #backspace() {
    if (this.final) { this.entry = this.str(this.result); this.tokens = []; this.final = false; }
    if (this.entry !== '') { this.entry = this.entry.slice(0, -1); if (this.entry === '-') this.entry = ''; return; }
    const last = this.tokens.pop();
    if (last && last.t === 'n') this.entry = this.str(last.v);
  }
  #equals() {
    if (this.final) return;
    this.#commit();
    if (!this.tokens.length) return;
    try {
      const toks = this.#closed();
      const expr = this.text(toks);
      const v = this.#eval(toks);
      this.lastExpr = expr;
      this.result = v;
      this.#reset();
      this.final = true;
      return { expr, result: v.toString(10), base: this.base, hex: this.str(v, 'HEX') };
    } catch (e) { this.error = e.code || 'SYNTAX'; }
  }
  /** Tokens with dangling operators removed and parentheses closed. */
  #closed(extra = []) {
    const toks = [...this.tokens, ...extra];
    while (toks.length && (toks[toks.length - 1].t === 'op' || toks[toks.length - 1].t === '(')) toks.pop();
    let open = 0;
    for (const t of toks) { if (t.t === '(') open++; else if (t.t === ')') open--; }
    while (open-- > 0) toks.push({ t: ')' });
    return toks;
  }
  preview() {
    const extra = this.entry !== '' ? [{ t: 'n', v: this.parse(this.entry) }] : [];
    const toks = this.#closed(extra);
    if (toks.length < 2 || !toks.some((t) => t.t === 'op')) return null;
    try { return this.#eval(toks); } catch { return null; }
  }

  #apply(op, a, b) {
    const size = BigInt(this.size);
    switch (op) {
      case '+': return this.wrap(a + b);
      case '-': return this.wrap(a - b);
      case '*': return this.wrap(a * b);
      case '/': if (b === 0n) throw new ProgError('DIV0'); return this.wrap(a / b);
      case 'mod': if (b === 0n) throw new ProgError('DIV0'); return this.wrap(a % b);
      case 'and': return this.wrap(a & b);
      case 'or': return this.wrap(a | b);
      case 'xor': return this.wrap(a ^ b);
      case 'nand': return this.wrap(~(a & b));
      case 'nor': return this.wrap(~(a | b));
      case 'shl': return b < 0n || b >= size ? 0n : this.wrap(a << b);
      case 'shr': return b < 0n ? 0n : this.wrap(a >> (b >= size ? size : b));
      default: throw new ProgError('SYNTAX');
    }
  }
  #eval(toks) {
    let p = 0;
    const peek = () => toks[p];
    const unary = () => {
      const tk = toks[p++];
      if (!tk) throw new ProgError('SYNTAX');
      if (tk.t === 'n') return tk.v;
      if (tk.t === '(') { const v = level(0); if (peek()?.t === ')') p++; return v; }
      if (tk.t === 'op' && tk.v === '-') return this.wrap(-unary());
      throw new ProgError('SYNTAX');
    };
    const level = (i) => {
      if (i === LEVELS.length) return unary();
      let left = level(i + 1);
      while (peek()?.t === 'op' && LEVELS[i].includes(peek().v)) {
        const op = toks[p++].v;
        left = this.#apply(op, left, level(i + 1));
      }
      return left;
    };
    const v = level(0);
    if (p < toks.length) throw new ProgError('SYNTAX');
    return v;
  }

  text(toks = this.tokens, withEntry = false) {
    const parts = [];
    for (const t of toks) {
      if (t.t === 'n') parts.push(this.str(t.v));
      else if (t.t === 'op') parts.push(OP_TEXT[t.v]);
      else parts.push(t.t);
    }
    if (withEntry && this.entry !== '') parts.push(this.entry.replace('-', '\u2212'));
    return parts.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
  }

  setBase(b) {
    if (b === this.base) return;
    const hadEntry = this.entry !== '';
    const v = hadEntry ? this.parse(this.entry) : null;
    this.base = b;
    if (hadEntry) this.entry = this.str(v);
  }
  setSize(n) {
    if (n === this.size) return;
    const hadEntry = this.entry !== '';
    const v = hadEntry ? this.parse(this.entry) : null;
    this.size = n;
    this.tokens = this.tokens.map((t) => (t.t === 'n' ? { t: 'n', v: this.wrap(t.v) } : t));
    if (this.result !== null) this.result = this.wrap(this.result);
    if (hadEntry) this.entry = this.str(this.wrap(v));
  }
  loadValue(v) {
    this.#reset();
    this.entry = this.str(BigInt(v));
    if (this.entry === '0') this.entry = '0';
  }
  toggleBit(i) {
    const v = this.uns(this.final ? this.result : this.cur());
    if (this.final) this.#reset();
    this.entry = this.str(this.wrap(v ^ (1n << BigInt(i))));
  }
  /** Bits of the current value, most significant first. */
  bits() {
    const v = this.uns(this.cur());
    const out = [];
    for (let i = this.size - 1; i >= 0; i--) out.push(Number((v >> BigInt(i)) & 1n));
    return out;
  }
}

export function group(s, base) {
  if (!s) return s;
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const n = base === 'DEC' ? 3 : base === 'OCT' ? 3 : 4;
  const sep = base === 'DEC' ? ',' : ' ';
  const re = new RegExp(`\\B(?=(\\w{${n}})+(?!\\w))`, 'g');
  return (neg ? '-' : '') + body.replace(re, sep);
}
