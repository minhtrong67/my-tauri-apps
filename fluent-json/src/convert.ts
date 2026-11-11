import yaml from 'js-yaml';

/* ───────────────────────────── JSON → X ───────────────────────────── */

export function toYaml(v: unknown): string {
  return yaml.dump(v, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function flatten(v: unknown, prefix: string, out: Record<string, unknown>) {
  if (isObj(v)) {
    const keys = Object.keys(v);
    if (!keys.length && prefix) out[prefix] = '{}';
    for (const k of keys) flatten(v[k], prefix ? `${prefix}.${k}` : k, out);
  } else out[prefix || 'value'] = v;
}

export function toCsv(v: unknown, delimiter = ','): string {
  const rows = Array.isArray(v) ? v : [v];
  const flat: Record<string, unknown>[] = rows.map((r) => { const o: Record<string, unknown> = {}; flatten(r, '', o); return o; });
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const r of flat) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); cols.push(k); }
  const cell = (x: unknown) => {
    if (x === null || x === undefined) return '';
    const s = typeof x === 'object' ? JSON.stringify(x) : String(x);
    return s.includes(delimiter) || /["\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.map(cell).join(delimiter), ...flat.map((r) => cols.map((c) => cell(r[c])).join(delimiter))].join('\n');
}

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attrEsc = (s: string) => xmlEsc(s).replace(/"/g, '&quot;');
const xmlName = (k: string) => { let n = k.replace(/[^\w.\-:]/g, '_'); if (!/^[A-Za-z_]/.test(n)) n = '_' + n; return n; };

export function toXml(v: unknown, root = 'root'): string {
  const el = (name: string, val: unknown, lvl: number): string => {
    const pad = '  '.repeat(lvl), n = xmlName(name);
    if (Array.isArray(val)) return val.length ? val.map((x) => el(n, x, lvl)).join('\n') : `${pad}<${n}/>`;
    if (isObj(val)) {
      let attrs = '', text = '';
      const kids: string[] = [];
      for (const [k, x] of Object.entries(val)) {
        if (k.startsWith('@')) attrs += ` ${xmlName(k.slice(1))}="${attrEsc(String(x))}"`;
        else if (k === '#text') text = xmlEsc(String(x));
        else kids.push(el(k, x, lvl + 1));
      }
      if (!kids.length) return text ? `${pad}<${n}${attrs}>${text}</${n}>` : `${pad}<${n}${attrs}/>`;
      return `${pad}<${n}${attrs}>${text}\n${kids.join('\n')}\n${pad}</${n}>`;
    }
    if (val === null || val === undefined) return `${pad}<${n}/>`;
    return `${pad}<${n}>${xmlEsc(String(val))}</${n}>`;
  };
  const body = Array.isArray(v) ? `<${root}>\n${v.map((x) => el('item', x, 1)).join('\n')}\n</${root}>` : el(root, v, 0);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`;
}

/* ───────────── type inference → TypeScript / JSON Schema ───────────── */

type T =
  | { k: 'prim'; n: 'string' | 'number' | 'integer' | 'boolean' | 'null' }
  | { k: 'arr'; item: T | null }
  | { k: 'obj'; props: Map<string, { t: T; opt: boolean }> }
  | { k: 'union'; of: T[] };

function infer(v: unknown): T {
  if (v === null || v === undefined) return { k: 'prim', n: 'null' };
  if (typeof v === 'string') return { k: 'prim', n: 'string' };
  if (typeof v === 'number') return { k: 'prim', n: Number.isInteger(v) ? 'integer' : 'number' };
  if (typeof v === 'boolean') return { k: 'prim', n: 'boolean' };
  if (Array.isArray(v)) return { k: 'arr', item: v.length ? v.map(infer).reduce(merge) : null };
  const props = new Map<string, { t: T; opt: boolean }>();
  for (const [k, x] of Object.entries(v as object)) props.set(k, { t: infer(x), opt: false });
  return { k: 'obj', props };
}

function merge(a: T, b: T): T {
  if (a.k === 'prim' && b.k === 'prim') {
    if (a.n === b.n) return a;
    if ((a.n === 'integer' && b.n === 'number') || (a.n === 'number' && b.n === 'integer')) return { k: 'prim', n: 'number' };
  }
  if (a.k === 'arr' && b.k === 'arr') return { k: 'arr', item: a.item && b.item ? merge(a.item, b.item) : a.item ?? b.item };
  if (a.k === 'obj' && b.k === 'obj') {
    const props = new Map<string, { t: T; opt: boolean }>();
    for (const [k, p] of a.props) { const q = b.props.get(k); props.set(k, q ? { t: merge(p.t, q.t), opt: p.opt || q.opt } : { t: p.t, opt: true }); }
    for (const [k, q] of b.props) if (!a.props.has(k)) props.set(k, { t: q.t, opt: true });
    return { k: 'obj', props };
  }
  const list: T[] = [];
  for (const x of [a, b]) for (const y of x.k === 'union' ? x.of : [x]) {
    const i = list.findIndex((z) => z.k === y.k && (z.k !== 'prim' || (y.k === 'prim' && (z.n === y.n))));
    if (i >= 0 && (list[i].k !== 'prim')) list[i] = merge(list[i], y);
    else if (i < 0) list.push(y);
  }
  return list.length === 1 ? list[0] : { k: 'union', of: list };
}

const pascal = (s: string) => {
  const r = s.replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase());
  return /^[A-Za-z_]/.test(r) ? r : '_' + r;
};
const singular = (s: string) => (s.length > 3 && s.endsWith('ies') ? s.slice(0, -3) + 'y' : s.length > 2 && s.endsWith('s') && !s.endsWith('ss') ? s.slice(0, -1) : s);

export function toTypeScript(v: unknown, rootName = 'Root'): string {
  const decls: string[] = [];
  const used = new Set<string>();
  const unique = (n: string) => { let x = n, i = 2; while (used.has(x)) x = n + i++; used.add(x); return x; };
  const render = (t: T, hint: string, lvl: number): string => {
    switch (t.k) {
      case 'prim': return t.n === 'integer' ? 'number' : t.n;
      case 'arr': { if (!t.item) return 'unknown[]'; const s = render(t.item, singular(hint), lvl); return /[|]/.test(s) ? `(${s})[]` : `${s}[]`; }
      case 'union': return [...new Set(t.of.map((x) => render(x, hint, lvl)))].join(' | ');
      case 'obj': {
        if (!t.props.size) return 'Record<string, unknown>';
        const name = unique(pascal(hint));
        const body = [...t.props].map(([k, p]) => {
          const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
          return `  ${key}${p.opt ? '?' : ''}: ${render(p.t, k, lvl + 1)};`;
        }).join('\n');
        decls.push(`export interface ${name} {\n${body}\n}`);
        return name;
      }
    }
  };
  const t = infer(v);
  const top = render(t, rootName, 0);
  if (!decls.length || top !== pascal(rootName)) decls.push(`export type ${pascal(rootName)} = ${top};`);
  return decls.reverse().join('\n\n') + '\n';
}

export function toJsonSchema(v: unknown, title = 'Root'): string {
  const gen = (t: T): Record<string, unknown> => {
    switch (t.k) {
      case 'prim': return { type: t.n };
      case 'arr': return t.item ? { type: 'array', items: gen(t.item) } : { type: 'array' };
      case 'union': return { anyOf: t.of.map(gen) };
      case 'obj': {
        const properties: Record<string, unknown> = {};
        const required: string[] = [];
        for (const [k, p] of t.props) { properties[k] = gen(p.t); if (!p.opt) required.push(k); }
        const o: Record<string, unknown> = { type: 'object', properties };
        if (required.length) o.required = required;
        return o;
      }
    }
  };
  return JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', title, ...gen(infer(v)) }, null, 2) + '\n';
}

/* ───────────────────────────── X → JSON ───────────────────────────── */

export function fromYaml(text: string): unknown {
  const docs = yaml.loadAll(text);
  return docs.length <= 1 ? docs[0] ?? null : docs;
}

export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/, 5).join('\n');
  let best = ',', n = -1;
  for (const d of [',', ';', '\t', '|']) { const c = head.split(d).length; if (c > n) { n = c; best = d; } }
  return best;
}

export function parseCsvRows(text: string, d: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === d) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = ''; rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export function fromCsv(text: string, opts: { delimiter?: string; infer?: boolean } = {}): unknown {
  const d = opts.delimiter && opts.delimiter !== 'auto' ? opts.delimiter : detectDelimiter(text);
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''), d);
  if (!rows.length) return [];
  const [head, ...rest] = rows;
  const conv = (s: string): unknown => {
    if (!opts.infer) return s;
    if (s === '') return null;
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(s) && String(Number(s)) === s) return Number(s);
    return s;
  };
  return rest.map((r) => { const o: Record<string, unknown> = {}; head.forEach((h, i) => { o[h || `column${i + 1}`] = conv(r[i] ?? ''); }); return o; });
}

export function fromXml(text: string): unknown {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error((err.textContent || 'XML error').split('\n')[0].trim());
  const conv = (el: Element): unknown => {
    const o: Record<string, unknown> = {};
    for (const a of Array.from(el.attributes)) o['@' + a.name] = a.value;
    const kids = Array.from(el.children);
    for (const k of kids) {
      const v = conv(k);
      if (k.nodeName in o) { const cur = o[k.nodeName]; o[k.nodeName] = Array.isArray(cur) ? [...cur, v] : [cur, v]; }
      else o[k.nodeName] = v;
    }
    const txt = Array.from(el.childNodes).filter((n) => n.nodeType === 3 || n.nodeType === 4).map((n) => n.textContent ?? '').join('').trim();
    if (!kids.length && !el.attributes.length) return txt;
    if (txt) o['#text'] = txt;
    return o;
  };
  const root = doc.documentElement;
  return { [root.nodeName]: conv(root) };
}
