// Text conversion engine: pure functions, no DOM access.

export type Lang = 'en' | 'vi';
export type ParamValue = string | boolean;
export type Params = Record<string, ParamValue>;
export interface Opts {
  smart: boolean;
  keepAcronyms: boolean;
  lang: Lang;
  p: Params;
}
type Names = readonly [string, string?];

export type ParamDef =
  | { id: string; kind: 'text'; l: readonly [string, string]; ph?: readonly [string, string]; def: string }
  | { id: string; kind: 'toggle'; l: readonly [string, string]; def: boolean }
  | { id: string; kind: 'select'; l: readonly [string, string]; def: string; options: readonly { v: string; l: Names }[] };

export interface CaseDef {
  id: string;
  g: 'text' | 'code' | 'other';
  n: Names;
  f: (s: string, o: Opts) => string;
}
export interface ToolDef {
  id: string;
  g: 'lines' | 'edit' | 'encode' | 'analyze';
  n: Names;
  f: (s: string, o: Opts) => string;
  params?: readonly ParamDef[];
}
export type Item = CaseDef | ToolDef;

/** Thrown by tools when the input cannot be processed; `key` is an i18n key. */
export class ConvertError extends Error {
  constructor(public key: 'badRegex' | 'badBase64' | 'badUrlEnc' | 'badJson') {
    super(key);
  }
}

// A "word" is an acronym (XML), a Capitalized/lowercase word, a run of capitals, digits, or CJK-like letters.
const WORD_RE = /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+|\p{Lu}+|\p{N}+|\p{Lo}+/gu;

// Apostrophes inside a word are dropped first, so "don't" becomes dont, not don + t.
export const words = (s: string) => s.normalize('NFC').replace(/(\p{L})['’](?=\p{L})/gu, '$1').match(WORD_RE) || [];
export const lines = (s: string) => s.split(/\r?\n/);
const perLine = (f: (l: string) => string) => (s: string) => lines(s).map(f).join('\n');
const ident = (join: (w: string[]) => string) => perLine((l) => join(words(l)));

const up = (w: string) => w.toUpperCase();
const low = (w: string) => w.toLowerCase();
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** Removes diacritics, including the Vietnamese letter đ. */
export const deburr = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFC');

const SMALL = new Set('a an and as at but by for if in nor of on or per so the to up via vs yet'.split(' '));

function titleLine(line: string, smart: boolean) {
  const ms = [...line.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}'’]*/gu)];
  let out = '';
  let last = 0;
  ms.forEach((m, i) => {
    const w = m[0].toLowerCase();
    const keep = smart && i > 0 && i < ms.length - 1 && SMALL.has(w);
    const at = m.index ?? 0;
    out += line.slice(last, at) + (keep ? w : w.charAt(0).toUpperCase() + w.slice(1));
    last = at + m[0].length;
  });
  return out + line.slice(last);
}

function sentence(s: string, keepAcronyms: boolean) {
  const lowered = keepAcronyms
    ? s.replace(/\p{L}+/gu, (w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase()))
    : s.toLowerCase();
  return lowered.replace(
    /(^\s*[("'“‘[]*|[.!?…]+["'”’)\]]*\s+|\n\s*[("'“‘[]*)(\p{L})/gu,
    (_, pre: string, ch: string) => pre + ch.toUpperCase(),
  );
}

const capitalizeWords = (s: string) =>
  s.replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (_, pre: string, ch: string) => pre + ch.toUpperCase());

const isLetter = (c: string) => c.toLowerCase() !== c.toUpperCase();

const alternating = (s: string) => {
  let n = 0;
  return [...s].map((c) => (isLetter(c) ? (n++ % 2 ? c.toLowerCase() : c.toUpperCase()) : c)).join('');
};

/** Deterministic "random" mix of upper and lower case (the SpongeBob meme), never three equal in a row. */
const sponge = (s: string) => {
  let n = 0;
  let run = 0;
  let prev = false;
  return [...s]
    .map((c) => {
      if (!isLetter(c)) return c;
      let upper = ((n * 2654435761) >>> 13) % 2 === 0;
      if (run >= 2 && upper === prev) upper = !upper;
      run = upper === prev ? run + 1 : 1;
      prev = upper;
      n++;
      return upper ? c.toUpperCase() : c.toLowerCase();
    })
    .join('');
};

const toggle = (s: string) =>
  [...s].map((c) => (!isLetter(c) ? c : c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('');

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter() : null;
const reverseText = (s: string) => {
  const n = s.normalize('NFC');
  const parts = segmenter ? [...segmenter.segment(n)].map((x) => x.segment) : [...n];
  return parts.reverse().join('');
};

/** Conversion styles. `n` holds [english name, optional vietnamese name]. */
export const CASES: readonly CaseDef[] = [
  { id: 'upper', g: 'text', n: ['UPPERCASE'], f: up },
  { id: 'lower', g: 'text', n: ['lowercase'], f: low },
  { id: 'title', g: 'text', n: ['Title Case'], f: (s, o) => perLine((l) => titleLine(l, o.smart))(s) },
  { id: 'sentence', g: 'text', n: ['Sentence case'], f: (s, o) => sentence(s, o.keepAcronyms) },
  { id: 'cap', g: 'text', n: ['Capitalize Each Word'], f: capitalizeWords },
  { id: 'alt', g: 'text', n: ['aLtErNaTiNg'], f: alternating },
  { id: 'sponge', g: 'text', n: ['sPoNgEcAsE', 'Chữ lộn xộn (meme)'], f: sponge },
  { id: 'inv', g: 'text', n: ['tOGGLE cASE'], f: toggle },
  { id: 'rev', g: 'text', n: ['Reverse text', 'Đảo ngược văn bản'], f: reverseText },

  { id: 'camel', g: 'code', n: ['camelCase'], f: ident((w) => w.map((x, i) => (i ? cap(x) : low(x))).join('')) },
  { id: 'pascal', g: 'code', n: ['PascalCase'], f: ident((w) => w.map(cap).join('')) },
  { id: 'snake', g: 'code', n: ['snake_case'], f: ident((w) => w.map(low).join('_')) },
  { id: 'constant', g: 'code', n: ['CONSTANT_CASE'], f: ident((w) => w.map(up).join('_')) },
  { id: 'kebab', g: 'code', n: ['kebab-case'], f: ident((w) => w.map(low).join('-')) },
  { id: 'train', g: 'code', n: ['Train-Case'], f: ident((w) => w.map(cap).join('-')) },
  { id: 'cobol', g: 'code', n: ['COBOL-CASE'], f: ident((w) => w.map(up).join('-')) },
  { id: 'dot', g: 'code', n: ['dot.case'], f: ident((w) => w.map(low).join('.')) },
  { id: 'path', g: 'code', n: ['path/case'], f: ident((w) => w.map(low).join('/')) },
  { id: 'nocase', g: 'code', n: ['no case', 'chữ thường cách nhau'], f: ident((w) => w.map(low).join(' ')) },

  { id: 'slug', g: 'other', n: ['URL slug', 'Slug cho URL'], f: perLine((l) => words(deburr(l)).map(low).join('-')) },
  { id: 'plain', g: 'other', n: ['Remove diacritics', 'Bỏ dấu tiếng Việt'], f: deburr },
];

export const CASE_GROUPS = ['text', 'code', 'other'] as const;
export const TOOL_GROUPS = ['lines', 'edit', 'encode', 'analyze'] as const;

/** Locale aware natural sort (digits compared as numbers, Vietnamese accents kept distinct). */
function makeCompare(lang: Lang) {
  const coll = new Intl.Collator(lang === 'vi' ? 'vi' : undefined, { numeric: true, sensitivity: 'accent' });
  return (a: string, b: string) => coll.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

const P = (o: Opts, id: string, def: ParamValue): ParamValue => o.p[id] ?? def;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SEPARATORS: Record<string, string> = { comma: ',', semicolon: ';', pipe: '|', tab: '\t', space: ' ' };
const JOINERS: Record<string, string> = { space: ' ', comma: ', ', semicolon: '; ', pipe: ' | ', none: '' };

const toBase64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromBase64 = (s: string) => {
  try {
    const bin = atob(s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    throw new ConvertError('badBase64');
  }
};

function unique(matches: readonly string[] | null) {
  return [...new Set(matches ?? [])].join('\n');
}

const sepOptions = [
  { v: 'comma', l: ['Comma ,', 'Dấu phẩy ,'] },
  { v: 'semicolon', l: ['Semicolon ;', 'Dấu chấm phẩy ;'] },
  { v: 'pipe', l: ['Pipe |', 'Dấu gạch đứng |'] },
  { v: 'tab', l: ['Tab', 'Tab'] },
  { v: 'space', l: ['Space', 'Dấu cách'] },
] as const;

export const TOOLS: readonly ToolDef[] = [
  {
    id: 'dedupe', g: 'lines', n: ['Remove duplicate lines', 'Xóa dòng trùng'],
    params: [
      { id: 'ignoreCase', kind: 'toggle', l: ['Ignore letter case', 'Bỏ qua hoa thường'], def: false },
      { id: 'trimFirst', kind: 'toggle', l: ['Ignore spaces around lines', 'Bỏ qua khoảng trắng đầu cuối'], def: true },
    ],
    f: (s, o) => {
      const ic = P(o, 'ignoreCase', false) === true;
      const tr = P(o, 'trimFirst', true) === true;
      const seen = new Set<string>();
      return lines(s)
        .filter((l) => {
          let k = tr ? l.trim() : l;
          if (ic) k = k.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .join('\n');
    },
  },
  { id: 'sortaz', g: 'lines', n: ['Sort A to Z', 'Sắp xếp A đến Z'], f: (s, o) => lines(s).sort(makeCompare(o.lang)).join('\n') },
  {
    id: 'sortza', g: 'lines', n: ['Sort Z to A', 'Sắp xếp Z đến A'],
    f: (s, o) => {
      const c = makeCompare(o.lang);
      return lines(s).sort((a, b) => c(b, a)).join('\n');
    },
  },
  { id: 'revl', g: 'lines', n: ['Reverse line order', 'Đảo thứ tự dòng'], f: (s) => lines(s).reverse().join('\n') },
  { id: 'empty', g: 'lines', n: ['Remove empty lines', 'Xóa dòng trống'], f: (s) => lines(s).filter((l) => l.trim()).join('\n') },
  { id: 'trim', g: 'lines', n: ['Trim each line', 'Cắt khoảng trắng đầu cuối dòng'], f: perLine((l) => l.trim()) },
  { id: 'spaces', g: 'lines', n: ['Collapse extra spaces', 'Gộp khoảng trắng thừa'], f: perLine((l) => l.replace(/[ \t]+/g, ' ')) },
  {
    id: 'join', g: 'lines', n: ['Join lines into one', 'Nối các dòng thành một'],
    params: [
      {
        id: 'sep', kind: 'select', l: ['Separator', 'Ký tự nối'], def: 'space',
        options: [
          { v: 'space', l: ['Space', 'Dấu cách'] }, { v: 'comma', l: ['Comma , ', 'Dấu phẩy , '] },
          { v: 'semicolon', l: ['Semicolon ; ', 'Dấu chấm phẩy ; '] }, { v: 'pipe', l: ['Pipe | ', 'Dấu gạch đứng | '] },
          { v: 'none', l: ['Nothing', 'Không có'] },
        ],
      },
    ],
    f: (s, o) => lines(s).map((l) => l.trim()).filter(Boolean).join(JOINERS[String(P(o, 'sep', 'space'))] ?? ' '),
  },
  {
    id: 'split', g: 'lines', n: ['Split text into lines', 'Tách văn bản thành các dòng'],
    params: [{ id: 'by', kind: 'select', l: ['Split at', 'Tách tại'], def: 'comma', options: sepOptions }],
    f: (s, o) => s.split(SEPARATORS[String(P(o, 'by', 'comma'))] ?? ',').map((x) => x.trim()).filter(Boolean).join('\n'),
  },
  { id: 'num', g: 'lines', n: ['Number the lines', 'Đánh số dòng'], f: (s) => lines(s).map((l, i) => `${i + 1}. ${l}`).join('\n') },

  {
    id: 'replace', g: 'edit', n: ['Find and replace', 'Tìm và thay thế'],
    params: [
      { id: 'find', kind: 'text', l: ['Find', 'Tìm'], ph: ['Text to find', 'Chữ cần tìm'], def: '' },
      { id: 'repl', kind: 'text', l: ['Replace with', 'Thay bằng'], ph: ['Replacement', 'Chữ thay thế'], def: '' },
      { id: 'regex', kind: 'toggle', l: ['Regular expression', 'Biểu thức chính quy'], def: false },
      { id: 'matchCase', kind: 'toggle', l: ['Match letter case', 'Phân biệt hoa thường'], def: false },
    ],
    f: (s, o) => {
      const find = String(P(o, 'find', ''));
      if (!find) return s;
      const repl = String(P(o, 'repl', ''));
      const flags = 'gu' + (P(o, 'matchCase', false) === true ? '' : 'i');
      if (P(o, 'regex', false) === true) {
        let re: RegExp;
        try {
          re = new RegExp(find, flags);
        } catch {
          throw new ConvertError('badRegex');
        }
        return s.replace(re, repl);
      }
      return s.replace(new RegExp(escapeRe(find), flags), () => repl);
    },
  },
  {
    id: 'affix', g: 'edit', n: ['Add prefix and suffix', 'Thêm tiền tố và hậu tố'],
    params: [
      { id: 'prefix', kind: 'text', l: ['Prefix', 'Tiền tố'], ph: ['Before each line', 'Đầu mỗi dòng'], def: '' },
      { id: 'suffix', kind: 'text', l: ['Suffix', 'Hậu tố'], ph: ['After each line', 'Cuối mỗi dòng'], def: '' },
      { id: 'skipEmpty', kind: 'toggle', l: ['Skip empty lines', 'Bỏ qua dòng trống'], def: true },
    ],
    f: (s, o) => {
      const pre = String(P(o, 'prefix', ''));
      const suf = String(P(o, 'suffix', ''));
      const skip = P(o, 'skipEmpty', true) === true;
      return lines(s).map((l) => (skip && !l.trim() ? l : pre + l + suf)).join('\n');
    },
  },
  {
    id: 'wrap', g: 'edit', n: ['Wrap long lines', 'Ngắt dòng dài'],
    params: [
      {
        id: 'width', kind: 'select', l: ['Line width', 'Độ rộng dòng'], def: '80',
        options: ['40', '60', '72', '80', '100', '120'].map((v) => ({ v, l: [`${v} characters`, `${v} ký tự`] as Names })),
      },
    ],
    f: (s, o) => {
      const width = Number(P(o, 'width', '80')) || 80;
      return lines(s)
        .map((line) => {
          const out: string[] = [];
          let cur = '';
          for (const w of line.split(/\s+/).filter(Boolean)) {
            if (cur && cur.length + 1 + w.length > width) {
              out.push(cur);
              cur = w;
            } else cur = cur ? `${cur} ${w}` : w;
          }
          out.push(cur);
          return out.join('\n');
        })
        .join('\n');
    },
  },

  { id: 'b64e', g: 'encode', n: ['Base64 encode', 'Mã hóa Base64'], f: (s) => toBase64(s) },
  { id: 'b64d', g: 'encode', n: ['Base64 decode', 'Giải mã Base64'], f: (s) => fromBase64(s) },
  { id: 'urle', g: 'encode', n: ['URL encode', 'Mã hóa URL'], f: (s) => encodeURIComponent(s) },
  {
    id: 'urld', g: 'encode', n: ['URL decode', 'Giải mã URL'],
    f: (s) => {
      try {
        return decodeURIComponent(s.replace(/\+/g, ' '));
      } catch {
        throw new ConvertError('badUrlEnc');
      }
    },
  },
  {
    id: 'jsonp', g: 'encode', n: ['JSON prettify', 'Định dạng JSON'],
    f: (s) => {
      try {
        return JSON.stringify(JSON.parse(s), null, 2);
      } catch {
        throw new ConvertError('badJson');
      }
    },
  },
  {
    id: 'jsonm', g: 'encode', n: ['JSON minify', 'Rút gọn JSON'],
    f: (s) => {
      try {
        return JSON.stringify(JSON.parse(s));
      } catch {
        throw new ConvertError('badJson');
      }
    },
  },

  { id: 'emails', g: 'analyze', n: ['Extract emails', 'Trích xuất email'], f: (s) => unique(s.match(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu)) },
  {
    id: 'urls', g: 'analyze', n: ['Extract links', 'Trích xuất liên kết'],
    f: (s) => unique((s.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? []).map((u) => u.replace(/[.,;:!?]+$/, ''))),
  },
  {
    id: 'freq', g: 'analyze', n: ['Word frequency', 'Tần suất từ'],
    f: (s, o) => {
      const counts = new Map<string, number>();
      for (const w of s.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
      const coll = new Intl.Collator(o.lang === 'vi' ? 'vi' : undefined);
      const rows = [...counts].sort((a, b) => b[1] - a[1] || coll.compare(a[0], b[0]));
      const pad = String(rows[0]?.[1] ?? 0).length;
      return rows.map(([w, n]) => `${String(n).padStart(pad, ' ')}  ${w}`).join('\n');
    },
  },
];

export const ALL_ITEMS: readonly Item[] = [...CASES, ...TOOLS];

export const displayName = (item: { n: Names }, lang: Lang) => (lang === 'vi' && item.n[1]) || item.n[0];
export const paramText = (l: readonly [string, string], lang: Lang) => (lang === 'vi' ? l[1] : l[0]);

/** Default values for every parameter of a tool. */
export const defaultParams = (tool: ToolDef): Params => Object.fromEntries((tool.params ?? []).map((p) => [p.id, p.def]));

export function textStats(s: string) {
  const trimmed = s.trim();
  return {
    chars: s ? [...s].length : 0,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    lines: s ? lines(s).length : 0,
  };
}
