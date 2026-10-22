// A compact JSONPath engine: $ . .. [] [*] [n,m] [a:b:c] ['k'] [?(@.x > 1 && @.y =~ /re/)]
import { formatPath, type PathSeg } from './json';

export interface Match { path: PathSeg[]; value: unknown }
type Seg =
  | { t: 'child'; names: string[] | '*' }
  | { t: 'index'; idx: number[] }
  | { t: 'slice'; a?: number; b?: number; c: number }
  | { t: 'filter'; expr: Expr }
  | { t: 'desc' };

type Expr =
  | { k: 'lit'; v: unknown }
  | { k: 'path'; segs: Seg[]; root?: boolean }
  | { k: 'not'; e: Expr }
  | { k: 'bin'; op: string; l: Expr; r: Expr };

export class PathError extends Error {}

class P {
  i = 0;
  constructor(readonly s: string) {}
  ws() { while (/\s/.test(this.s[this.i] ?? '')) this.i++; }
  peek(n = 1) { return this.s.substr(this.i, n); }
  eat(x: string) { this.ws(); if (this.s.startsWith(x, this.i)) { this.i += x.length; return true; } return false; }
  fail(m: string): never { throw new PathError(`${m} @${this.i}`); }

  segments(stopAtFilter = false): Seg[] {
    const segs: Seg[] = [];
    for (;;) {
      this.ws();
      const c = this.s[this.i];
      if (c === undefined) break;
      if (c === '.') {
        if (this.s[this.i + 1] === '.') { this.i += 2; segs.push({ t: 'desc' }); if (this.s[this.i] === '[') continue; }
        else this.i++;
        if (this.s[this.i] === '*') { this.i++; segs.push({ t: 'child', names: '*' }); continue; }
        if (this.s[this.i] === '[') continue;
        const m = /[^\s.\[\])=!<>&|,()]+/y; m.lastIndex = this.i;
        const r = m.exec(this.s);
        if (!r) this.fail('name expected');
        this.i += r[0].length; segs.push({ t: 'child', names: [r[0]] });
      } else if (c === '[') {
        this.i++; this.ws();
        segs.push(this.bracket());
        this.ws(); if (this.s[this.i] !== ']') this.fail("']' expected"); this.i++;
      } else if (stopAtFilter) break;
      else this.fail(`unexpected '${c}'`);
    }
    return segs;
  }

  bracket(): Seg {
    const c = this.s[this.i];
    if (c === '*') { this.i++; return { t: 'child', names: '*' }; }
    if (c === '?') {
      this.i++; this.ws();
      const paren = this.s[this.i] === '(';
      if (paren) this.i++;
      const expr = this.or();
      this.ws();
      if (paren) { if (this.s[this.i] !== ')') this.fail("')' expected"); this.i++; }
      return { t: 'filter', expr };
    }
    if (c === "'" || c === '"') {
      const names: string[] = [];
      for (;;) {
        names.push(this.str());
        this.ws();
        if (this.s[this.i] === ',') { this.i++; this.ws(); continue; }
        break;
      }
      return { t: 'child', names };
    }
    const m = /-?\d*(?:\s*:\s*-?\d*){0,2}(?:\s*,\s*-?\d+)*/y; m.lastIndex = this.i;
    const r = m.exec(this.s);
    if (!r || !r[0]) this.fail('index expected');
    this.i += r[0].length;
    const txt = r[0];
    if (txt.includes(':')) {
      const [a, b, st] = txt.split(':').map((x) => x.trim());
      return { t: 'slice', a: a === '' ? undefined : +a, b: b === '' || b === undefined ? undefined : +b, c: st ? +st : 1 };
    }
    return { t: 'index', idx: txt.split(',').map((x) => +x.trim()) };
  }

  str(): string {
    const q = this.s[this.i++]; let out = '';
    for (;;) {
      const c = this.s[this.i++];
      if (c === undefined) this.fail('unterminated string');
      if (c === '\\') { out += this.s[this.i++]; continue; }
      if (c === q) return out;
      out += c;
    }
  }

  or(): Expr { let l = this.and(); while (this.eat('||')) l = { k: 'bin', op: '||', l, r: this.and() }; return l; }
  and(): Expr { let l = this.cmp(); while (this.eat('&&')) l = { k: 'bin', op: '&&', l, r: this.cmp() }; return l; }
  cmp(): Expr {
    const l = this.unary();
    this.ws();
    for (const op of ['===', '!==', '==', '!=', '<=', '>=', '=~', '<', '>']) {
      if (this.s.startsWith(op, this.i)) { this.i += op.length; return { k: 'bin', op, l, r: this.unary() }; }
    }
    return l;
  }
  unary(): Expr {
    this.ws();
    if (this.s[this.i] === '!' && this.s[this.i + 1] !== '=') { this.i++; return { k: 'not', e: this.unary() }; }
    if (this.s[this.i] === '(') { this.i++; const e = this.or(); if (!this.eat(')')) this.fail("')' expected"); return e; }
    const c = this.s[this.i];
    if (c === '@' || c === '$') { this.i++; return { k: 'path', segs: this.segments(true), root: c === '$' }; }
    if (c === "'" || c === '"') return { k: 'lit', v: this.str() };
    if (c === '/') {
      this.i++; let src = '';
      while (this.i < this.s.length && this.s[this.i] !== '/') { if (this.s[this.i] === '\\') src += this.s[this.i++]; src += this.s[this.i++]; }
      this.i++;
      const fl = /[gimsuy]*/y; fl.lastIndex = this.i; const f = fl.exec(this.s)![0]; this.i += f.length;
      return { k: 'lit', v: new RegExp(src, f) };
    }
    const m = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/y; m.lastIndex = this.i;
    const r = m.exec(this.s);
    if (!r) this.fail('value expected');
    this.i += r[0].length;
    return { k: 'lit', v: r[0] === 'true' ? true : r[0] === 'false' ? false : r[0] === 'null' ? null : Number(r[0]) };
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const kids = (m: Match): Match[] => Array.isArray(m.value)
  ? m.value.map((v, i) => ({ path: [...m.path, i], value: v }))
  : isObj(m.value) ? Object.keys(m.value).map((k) => ({ path: [...m.path, k], value: (m.value as Record<string, unknown>)[k] })) : [];

function descend(m: Match, out: Match[]) { out.push(m); for (const k of kids(m)) descend(k, out); }

function apply(set: Match[], segs: Seg[], root: Match): Match[] {
  let cur = set;
  for (let n = 0; n < segs.length; n++) {
    const sg = segs[n], next: Match[] = [];
    if (sg.t === 'desc') {
      const all: Match[] = []; for (const m of cur) descend(m, all);
      cur = all; continue;
    }
    for (const m of cur) {
      if (sg.t === 'child') {
        if (sg.names === '*') next.push(...kids(m));
        else for (const nm of sg.names) {
          if (isObj(m.value) && Object.prototype.hasOwnProperty.call(m.value, nm)) next.push({ path: [...m.path, nm], value: m.value[nm] });
          else if (Array.isArray(m.value) && nm === 'length') next.push({ path: [...m.path, nm], value: m.value.length });
        }
      } else if (sg.t === 'index') {
        if (Array.isArray(m.value)) for (let i of sg.idx) { if (i < 0) i += m.value.length; if (i >= 0 && i < m.value.length) next.push({ path: [...m.path, i], value: m.value[i] }); }
      } else if (sg.t === 'slice') {
        if (Array.isArray(m.value)) {
          const len = m.value.length, st = sg.c || 1;
          let a = sg.a ?? (st > 0 ? 0 : len - 1), b = sg.b ?? (st > 0 ? len : -len - 1);
          if (a < 0) a += len; if (b < 0) b += len;
          for (let i = Math.max(a, 0); st > 0 ? i < Math.min(b, len) : i > b && i >= 0; i += st) { if (i < len) next.push({ path: [...m.path, i], value: m.value[i] }); }
        }
      } else if (sg.t === 'filter') {
        for (const k of kids(m)) if (truthy(evalExpr(sg.expr, k, root))) next.push(k);
      }
    }
    cur = next;
  }
  return cur;
}

const truthy = (v: unknown) => v !== undefined && v !== null && v !== false && v !== 0 && v !== '';

function evalExpr(e: Expr, cur: Match, root: Match): unknown {
  switch (e.k) {
    case 'lit': return e.v;
    case 'not': return !truthy(evalExpr(e.e, cur, root));
    case 'path': {
      const r = apply([e.root ? root : cur], e.segs, root);
      return r.length ? r[0].value : undefined;
    }
    case 'bin': {
      if (e.op === '&&') return truthy(evalExpr(e.l, cur, root)) && truthy(evalExpr(e.r, cur, root));
      if (e.op === '||') return truthy(evalExpr(e.l, cur, root)) || truthy(evalExpr(e.r, cur, root));
      const l = evalExpr(e.l, cur, root), r = evalExpr(e.r, cur, root);
      switch (e.op) {
        case '==': case '===': return JSON.stringify(l) === JSON.stringify(r);
        case '!=': case '!==': return JSON.stringify(l) !== JSON.stringify(r);
        case '<': return (l as number) < (r as number);
        case '<=': return (l as number) <= (r as number);
        case '>': return (l as number) > (r as number);
        case '>=': return (l as number) >= (r as number);
        case '=~': return r instanceof RegExp && typeof l === 'string' ? r.test(l) : false;
      }
    }
  }
  return undefined;
}

export function queryPath(data: unknown, query: string): Match[] {
  const q = query.trim();
  if (!q) return [];
  const src = q.startsWith('$') ? q : q.startsWith('[') || q.startsWith('.') ? '$' + q : '$.' + q;
  const p = new P(src.slice(1));
  const segs = p.segments();
  const root: Match = { path: [], value: data };
  return apply([root], segs, root);
}

export { formatPath };
