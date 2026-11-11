// Core JSON engine: tolerant parser with positions, serializer, utilities.
// Written from scratch so we can report exact error positions on every engine
// (WebView2 / WebKit report different messages), keep big numbers intact and
// map tree nodes back to editor offsets.

export type JNode = JObject | JArray | JString | JNumber | JBool | JNull;
interface Base { start: number; end: number }
export interface JProp { key: string; keyRaw?: string; keyStart: number; keyEnd: number; value: JNode }
export interface JObject extends Base { type: 'object'; props: JProp[] }
export interface JArray extends Base { type: 'array'; items: JNode[] }
export interface JString extends Base { type: 'string'; value: string; raw?: string }
export interface JNumber extends Base { type: 'number'; raw: string }
export interface JBool extends Base { type: 'boolean'; value: boolean }
export interface JNull extends Base { type: 'null' }

export class JsonError extends Error {
  constructor(public code: string, public pos: number, public arg?: string) { super(code); }
}

export type PathSeg = string | number;

const STRICT_NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const LOOSE_NUM = /[+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y;
const IDENT = /[A-Za-z_$][\w$-]*/y;
const ESC: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

class Parser {
  i = 0;
  constructor(readonly s: string, readonly lenient: boolean) {}

  ws() {
    const s = this.s;
    for (;;) {
      const c = s.charCodeAt(this.i);
      if (c === 32 || c === 9 || c === 10 || c === 13 || c === 0xfeff) this.i++;
      else if (this.lenient && c === 47) {
        const n = s.charCodeAt(this.i + 1);
        if (n === 47) { while (this.i < s.length && s.charCodeAt(this.i) !== 10) this.i++; }
        else if (n === 42) {
          const e = s.indexOf('*/', this.i + 2);
          if (e < 0) throw new JsonError('unterminatedComment', this.i);
          this.i = e + 2;
        } else break;
      } else break;
    }
  }

  fail(code: string, pos = this.i, arg?: string): never {
    if (pos >= this.s.length && code !== 'unterminatedString') throw new JsonError('unexpectedEnd', this.s.length);
    throw new JsonError(code, pos, arg ?? this.s[pos]);
  }

  value(depth: number): JNode {
    if (depth > 4000) throw new JsonError('tooDeep', this.i);
    this.ws();
    const s = this.s, start = this.i, c = s[start];
    if (c === undefined) throw new JsonError('unexpectedEnd', s.length);
    if (c === '{') return this.object(depth);
    if (c === '[') return this.array(depth);
    if (c === '"' || (this.lenient && c === "'")) {
      const r = this.string(c);
      return { type: 'string', value: r.value, raw: r.raw, start, end: this.i };
    }
    if (c === '-' || (c >= '0' && c <= '9') || (this.lenient && (c === '+' || c === '.'))) return this.number();
    IDENT.lastIndex = start;
    const m = IDENT.exec(s);
    if (m) {
      const w = m[0];
      const lit = (n: JNode) => { this.i = start + w.length; return n; };
      if (w === 'true') return lit({ type: 'boolean', value: true, start, end: start + 4 });
      if (w === 'false') return lit({ type: 'boolean', value: false, start, end: start + 5 });
      if (w === 'null') return lit({ type: 'null', start, end: start + 4 });
      if (this.lenient) {
        if (w === 'True') return lit({ type: 'boolean', value: true, start, end: start + 4 });
        if (w === 'False') return lit({ type: 'boolean', value: false, start, end: start + 5 });
        if (w === 'None' || w === 'undefined' || w === 'NaN' || w === 'Infinity') return lit({ type: 'null', start, end: start + w.length });
      }
    }
    return this.fail('unexpectedChar', start);
  }

  number(): JNumber {
    const s = this.s, start = this.i;
    const re = this.lenient ? LOOSE_NUM : STRICT_NUM;
    re.lastIndex = start;
    const m = re.exec(s);
    if (!m) return this.fail('badNumber', start);
    const end = start + m[0].length;
    const nx = s.charCodeAt(end);
    if ((nx >= 48 && nx <= 57) || nx === 46 || nx === 101 || nx === 69 || nx === 95 || (nx >= 65 && nx <= 90) || (nx >= 97 && nx <= 122)) {
      return this.fail('badNumber', end);
    }
    this.i = end;
    let raw = m[0];
    if (this.lenient) { STRICT_NUM.lastIndex = 0; if (!(STRICT_NUM.exec(raw)?.[0] === raw)) raw = String(Number(raw)); }
    return { type: 'number', raw, start, end };
  }

  string(q: string): { value: string; raw?: string } {
    const s = this.s, start = this.i, qc = q.charCodeAt(0);
    this.i++;
    let out = '', seg = this.i, simple = q === '"';
    for (;;) {
      if (this.i >= s.length) throw new JsonError('unterminatedString', start);
      const c = s.charCodeAt(this.i);
      if (c === qc) {
        out += s.slice(seg, this.i);
        this.i++;
        return { value: out, raw: simple ? s.slice(start, this.i) : undefined };
      }
      if (c === 92) {
        out += s.slice(seg, this.i);
        const e = s[this.i + 1];
        if (e === 'u') {
          const hex = s.slice(this.i + 2, this.i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('badEscape', this.i + 1, 'u');
          out += String.fromCharCode(parseInt(hex, 16));
          this.i += 6;
        } else if (e !== undefined && ESC[e] !== undefined) {
          out += ESC[e]; this.i += 2;
        } else if (this.lenient && e !== undefined) {
          out += e; this.i += 2; simple = false;
        } else this.fail('badEscape', this.i + 1, e);
        seg = this.i;
        continue;
      }
      if (c < 32 && !this.lenient) this.fail('controlChar', this.i, c === 10 ? '\\n' : c === 13 ? '\\r' : c === 9 ? '\\t' : '\\u' + c.toString(16).padStart(4, '0'));
      this.i++;
    }
  }

  key(): { key: string; raw?: string; start: number; end: number } {
    const s = this.s, start = this.i, c = s[start];
    if (c === '"' || (this.lenient && c === "'")) {
      const r = this.string(c);
      return { key: r.value, raw: r.raw, start, end: this.i };
    }
    if (this.lenient) {
      IDENT.lastIndex = start;
      const m = IDENT.exec(s);
      if (m) { this.i = start + m[0].length; return { key: m[0], start, end: this.i }; }
      const n = /\d+/y; n.lastIndex = start;
      const nm = n.exec(s);
      if (nm) { this.i = start + nm[0].length; return { key: nm[0], start, end: this.i }; }
    }
    return this.fail('expectedKey', start);
  }

  object(depth: number): JObject {
    const s = this.s, start = this.i;
    this.i++;
    const props: JProp[] = [];
    this.ws();
    if (s[this.i] === '}') { this.i++; return { type: 'object', props, start, end: this.i }; }
    for (;;) {
      this.ws();
      if (this.lenient && s[this.i] === '}' && props.length) { this.i++; break; }
      const k = this.key();
      this.ws();
      if (s[this.i] !== ':') this.fail('expectedColon');
      this.i++;
      const value = this.value(depth + 1);
      props.push({ key: k.key, keyRaw: k.raw, keyStart: k.start, keyEnd: k.end, value });
      this.ws();
      const c = s[this.i];
      if (c === ',') {
        const commaAt = this.i;
        this.i++;
        this.ws();
        if (s[this.i] === '}') {
          if (!this.lenient) throw new JsonError('trailingComma', commaAt, ',');
          this.i++; break;
        }
        continue;
      }
      if (c === '}') { this.i++; break; }
      this.fail('expectedCommaOrBrace');
    }
    return { type: 'object', props, start, end: this.i };
  }

  array(depth: number): JArray {
    const s = this.s, start = this.i;
    this.i++;
    const items: JNode[] = [];
    this.ws();
    if (s[this.i] === ']') { this.i++; return { type: 'array', items, start, end: this.i }; }
    for (;;) {
      this.ws();
      if (this.lenient && s[this.i] === ']' && items.length) { this.i++; break; }
      items.push(this.value(depth + 1));
      this.ws();
      const c = s[this.i];
      if (c === ',') {
        const commaAt = this.i;
        this.i++;
        this.ws();
        if (s[this.i] === ']') {
          if (!this.lenient) throw new JsonError('trailingComma', commaAt, ',');
          this.i++; break;
        }
        continue;
      }
      if (c === ']') { this.i++; break; }
      this.fail('expectedCommaOrBracket');
    }
    return { type: 'array', items, start, end: this.i };
  }
}

/** Parse JSON text into a positioned AST. Throws JsonError. */
export function parseJson(text: string, opts: { lenient?: boolean } = {}): JNode {
  const p = new Parser(text, !!opts.lenient);
  try {
    const v = p.value(0);
    p.ws();
    if (p.i < text.length) throw new JsonError('trailingContent', p.i, text[p.i]);
    return v;
  } catch (e) {
    if (e instanceof RangeError) throw new JsonError('tooDeep', p.i);
    throw e;
  }
}

export interface ParseResult {
  ok: boolean;
  empty: boolean;
  node?: JNode;
  error?: { code: string; pos: number; arg?: string; line: number; col: number };
  repairable?: boolean;
}

const CACHE = new Map<string, ParseResult>();

export function lineCol(text: string, pos: number) {
  let line = 1, last = -1;
  for (let i = text.indexOf('\n'); i !== -1 && i < pos; i = text.indexOf('\n', i + 1)) { line++; last = i; }
  return { line, col: pos - last };
}

/** Parse with memoisation of the last text (editor, tree and status bar share it). */
export function analyze(text: string): ParseResult {
  const hit = CACHE.get(text);
  if (hit) { CACHE.delete(text); CACHE.set(text, hit); return hit; }
  let r: ParseResult;
  if (!text.trim()) r = { ok: false, empty: true };
  else {
    try { r = { ok: true, empty: false, node: parseJson(text) }; }
    catch (e) {
      if (!(e instanceof JsonError)) throw e;
      const { line, col } = lineCol(text, e.pos);
      let repairable = false;
      try { parseJson(text, { lenient: true }); repairable = true; } catch { /* not repairable */ }
      r = { ok: false, empty: false, error: { code: e.code, pos: e.pos, arg: e.arg, line, col }, repairable };
    }
  }
  if (text.length < 4_000_000) {
    CACHE.set(text, r);
    if (CACHE.size > 6) CACHE.delete(CACHE.keys().next().value as string);
  }
  return r;
}

/** Path of the innermost value (or key) that contains the given offset. */
export function pathAt(root: JNode, pos: number): PathSeg[] {
  const path: PathSeg[] = [];
  let n: JNode = root;
  for (;;) {
    if (n.type === 'object') {
      const p = n.props.find((x) => pos >= x.keyStart && pos <= Math.max(x.value.end, x.keyEnd));
      if (!p) break;
      path.push(p.key);
      if (pos < p.value.start) break;
      n = p.value;
    } else if (n.type === 'array') {
      const i = n.items.findIndex((x) => pos >= x.start && pos <= x.end);
      if (i < 0) break;
      path.push(i); n = n.items[i];
    } else break;
  }
  return path;
}

/* ───────────────────────────── conversion ───────────────────────────── */

export function setProp(o: Record<string, unknown>, k: string, v: unknown) {
  if (k === '__proto__') Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
  else o[k] = v;
}

export function toValue(n: JNode): unknown {
  switch (n.type) {
    case 'object': { const o: Record<string, unknown> = {}; for (const p of n.props) setProp(o, p.key, toValue(p.value)); return o; }
    case 'array': return n.items.map(toValue);
    case 'string': return n.value;
    case 'number': return Number(n.raw);
    case 'boolean': return n.value;
    default: return null;
  }
}

/** Build an AST node from a JS value (used by tree editing & conversions). */
export function fromValue(v: unknown): JNode {
  const z = { start: 0, end: 0 };
  if (v === null || v === undefined) return { type: 'null', ...z };
  if (typeof v === 'string') return { type: 'string', value: v, ...z };
  if (typeof v === 'number') return { type: 'number', raw: Number.isFinite(v) ? String(v) : 'null', ...z };
  if (typeof v === 'boolean') return { type: 'boolean', value: v, ...z };
  if (Array.isArray(v)) return { type: 'array', items: v.map(fromValue), ...z };
  return { type: 'object', props: Object.entries(v as object).map(([key, value]) => ({ key, keyStart: 0, keyEnd: 0, value: fromValue(value) })), ...z };
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export interface StringifyOptions { indent?: string; sort?: 'asc' | 'desc' | false }

export function stringifyNode(n: JNode, o: StringifyOptions = {}): string {
  const ind = o.indent ?? '';
  const pretty = ind !== '';
  const sort = o.sort;
  const str = (v: string, raw?: string) => raw ?? JSON.stringify(v);
  const go = (n: JNode, lvl: number): string => {
    switch (n.type) {
      case 'string': return str(n.value, n.raw);
      case 'number': return n.raw;
      case 'boolean': return n.value ? 'true' : 'false';
      case 'null': return 'null';
      case 'array': {
        if (!n.items.length) return '[]';
        const parts = n.items.map((x) => go(x, lvl + 1));
        if (!pretty) return '[' + parts.join(',') + ']';
        const pad = ind.repeat(lvl + 1);
        return '[\n' + pad + parts.join(',\n' + pad) + '\n' + ind.repeat(lvl) + ']';
      }
      case 'object': {
        if (!n.props.length) return '{}';
        let props = n.props;
        if (sort) {
          props = [...props].sort((a, b) => collator.compare(a.key, b.key));
          if (sort === 'desc') props.reverse();
        }
        const parts = props.map((p) => str(p.key, p.keyRaw) + (pretty ? ': ' : ':') + go(p.value, lvl + 1));
        if (!pretty) return '{' + parts.join(',') + '}';
        const pad = ind.repeat(lvl + 1);
        return '{\n' + pad + parts.join(',\n' + pad) + '\n' + ind.repeat(lvl) + '}';
      }
    }
  };
  return go(n, 0);
}

export function indentString(i: 2 | 4 | 'tab' | number): string {
  return i === 'tab' ? '\t' : ' '.repeat(Number(i));
}

/** Find the AST node addressed by a path of keys / indexes. */
export function nodeAtPath(root: JNode, path: PathSeg[]): { node: JNode; prop?: JProp } | null {
  let cur = root, prop: JProp | undefined;
  for (const seg of path) {
    if (cur.type === 'object') { const p = cur.props.find((x) => x.key === String(seg)); if (!p) return null; prop = p; cur = p.value; }
    else if (cur.type === 'array') { const x = cur.items[Number(seg)]; if (!x) return null; prop = undefined; cur = x; }
    else return null;
  }
  return { node: cur, prop };
}

export function formatPath(path: PathSeg[]): string {
  let out = '$';
  for (const s of path) out += typeof s === 'number' ? `[${s}]` : /^[A-Za-z_$][\w$]*$/.test(s) ? `.${s}` : `['${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}']`;
  return out;
}

/** Immutable-ish edit helpers used by the tree editor. */
export function replaceAtPath(root: JNode, path: PathSeg[], next: JNode | null): JNode {
  if (!path.length) return next ?? root;
  const [h, ...rest] = path;
  if (root.type === 'object') {
    const props: JProp[] = [];
    for (const p of root.props) {
      if (p.key !== String(h)) { props.push(p); continue; }
      if (!rest.length && next === null) continue;
      props.push({ ...p, keyRaw: undefined, value: rest.length ? replaceAtPath(p.value, rest, next) : (next as JNode) });
    }
    return { ...root, props };
  }
  if (root.type === 'array') {
    const items: JNode[] = [];
    root.items.forEach((x, i) => {
      if (i !== Number(h)) { items.push(x); return; }
      if (!rest.length && next === null) return;
      items.push(rest.length ? replaceAtPath(x, rest, next) : (next as JNode));
    });
    return { ...root, items };
  }
  return root;
}

export function depthOf(n: JNode): number {
  let max = 0;
  const go = (n: JNode, d: number) => {
    if (d > max) max = d;
    if (n.type === 'object') for (const p of n.props) go(p.value, d + 1);
    else if (n.type === 'array') for (const x of n.items) go(x, d + 1);
  };
  go(n, 1);
  return max;
}

export interface Stats { depth: number; objects: number; arrays: number; strings: number; numbers: number; booleans: number; nulls: number; keys: number; values: number }
export function statsOf(n: JNode): Stats {
  const s: Stats = { depth: 0, objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0, keys: 0, values: 0 };
  const go = (n: JNode, d: number) => {
    s.values++; if (d > s.depth) s.depth = d;
    switch (n.type) {
      case 'object': s.objects++; s.keys += n.props.length; for (const p of n.props) go(p.value, d + 1); break;
      case 'array': s.arrays++; for (const x of n.items) go(x, d + 1); break;
      case 'string': s.strings++; break;
      case 'number': s.numbers++; break;
      case 'boolean': s.booleans++; break;
      default: s.nulls++;
    }
  };
  go(n, 1);
  return s;
}

export function byteLength(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/* ───────────────────────── escape / unescape ───────────────────────── */

export function escapeText(s: string): string { return JSON.stringify(s); }
export function unescapeText(s: string): string {
  const t = s.trim();
  try { const v = JSON.parse(t); if (typeof v === 'string') return v; } catch { /* fallthrough */ }
  try { const v = JSON.parse('"' + t.replace(/^"|"$/g, '') + '"'); if (typeof v === 'string') return v; } catch { /* fallthrough */ }
  throw new Error('unescape');
}
