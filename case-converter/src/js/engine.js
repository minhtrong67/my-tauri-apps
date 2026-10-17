// Text conversion engine: pure functions, no DOM access.

// A "word" is an acronym (XML), a Capitalized/lowercase word, a run of capitals, digits, or CJK-like letters.
const WORD_RE = /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+|\p{Lu}+|\p{N}+|\p{Lo}+/gu;

export const words = (s) => s.normalize('NFC').match(WORD_RE) || [];
export const lines = (s) => s.split(/\r?\n/);
const perLine = (f) => (s) => lines(s).map(f).join('\n');
const ident = (join) => perLine((l) => join(words(l)));

const up = (w) => w.toUpperCase();
const low = (w) => w.toLowerCase();
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** Removes diacritics, including the Vietnamese letter đ. */
export const deburr = (s) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFC');

const SMALL = new Set('a an and as at but by for if in nor of on or per so the to up via vs yet'.split(' '));

function titleLine(line, smart) {
  const ms = [...line.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}'’]*/gu)];
  let out = '';
  let last = 0;
  ms.forEach((m, i) => {
    const w = m[0].toLowerCase();
    const keep = smart && i > 0 && i < ms.length - 1 && SMALL.has(w);
    out += line.slice(last, m.index) + (keep ? w : w.charAt(0).toUpperCase() + w.slice(1));
    last = m.index + m[0].length;
  });
  return out + line.slice(last);
}

const sentence = (s) =>
  s
    .toLowerCase()
    .replace(
      /(^\s*[("'“‘[]*|[.!?…]+["'”’)\]]*\s+|\n\s*[("'“‘[]*)(\p{L})/gu,
      (_, pre, ch) => pre + ch.toUpperCase(),
    );

const capitalizeWords = (s) =>
  s.replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (_, pre, ch) => pre + ch.toUpperCase());

const isLetter = (c) => c.toLowerCase() !== c.toUpperCase();

const alternating = (s) => {
  let n = 0;
  return [...s].map((c) => (isLetter(c) ? (n++ % 2 ? c.toLowerCase() : c.toUpperCase()) : c)).join('');
};

const toggle = (s) =>
  [...s].map((c) => (!isLetter(c) ? c : c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('');

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter() : null;
const reverseText = (s) => {
  const n = s.normalize('NFC');
  const parts = segmenter ? [...segmenter.segment(n)].map((x) => x.segment) : [...n];
  return parts.reverse().join('');
};

/** Conversion styles. `n` holds [english name, optional vietnamese name]. */
export const CASES = [
  { id: 'upper', g: 'text', n: ['UPPERCASE'], f: up },
  { id: 'lower', g: 'text', n: ['lowercase'], f: low },
  { id: 'title', g: 'text', n: ['Title Case'], f: (s, o = {}) => perLine((l) => titleLine(l, !!o.smart))(s) },
  { id: 'sentence', g: 'text', n: ['Sentence case'], f: sentence },
  { id: 'cap', g: 'text', n: ['Capitalize Each Word'], f: capitalizeWords },
  { id: 'alt', g: 'text', n: ['aLtErNaTiNg'], f: alternating },
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

  { id: 'slug', g: 'other', n: ['URL slug', 'Slug cho URL'], f: perLine((l) => words(deburr(l)).map(low).join('-')) },
  { id: 'plain', g: 'other', n: ['Remove diacritics', 'Bỏ dấu tiếng Việt'], f: deburr },
];

export const CASE_GROUPS = ['text', 'code', 'other'];

/** Locale aware natural sort (digits compared as numbers, Vietnamese accents kept distinct). */
function makeCompare(lang) {
  const coll = new Intl.Collator(lang === 'vi' ? 'vi' : undefined, { numeric: true, sensitivity: 'accent' });
  return (a, b) => coll.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

export const TOOLS = [
  { id: 'dedupe', n: ['Remove duplicate lines', 'Xóa dòng trùng'], f: (s) => [...new Set(lines(s))].join('\n') },
  { id: 'sortaz', n: ['Sort A to Z', 'Sắp xếp A đến Z'], f: (s, o = {}) => lines(s).sort(makeCompare(o.lang)).join('\n') },
  {
    id: 'sortza',
    n: ['Sort Z to A', 'Sắp xếp Z đến A'],
    f: (s, o = {}) => {
      const c = makeCompare(o.lang);
      return lines(s).sort((a, b) => c(b, a)).join('\n');
    },
  },
  { id: 'revl', n: ['Reverse line order', 'Đảo thứ tự dòng'], f: (s) => lines(s).reverse().join('\n') },
  { id: 'empty', n: ['Remove empty lines', 'Xóa dòng trống'], f: (s) => lines(s).filter((l) => l.trim()).join('\n') },
  { id: 'trim', n: ['Trim each line', 'Cắt khoảng trắng đầu cuối dòng'], f: perLine((l) => l.trim()) },
  { id: 'spaces', n: ['Collapse extra spaces', 'Gộp khoảng trắng thừa'], f: perLine((l) => l.replace(/[ \t]+/g, ' ')) },
  {
    id: 'join',
    n: ['Join lines into one', 'Nối các dòng thành một'],
    f: (s) => lines(s).map((l) => l.trim()).filter(Boolean).join(' '),
  },
  { id: 'num', n: ['Number the lines', 'Đánh số dòng'], f: (s) => lines(s).map((l, i) => `${i + 1}. ${l}`).join('\n') },
];

export const displayName = (item, lang) => (lang === 'vi' && item.n[1]) || item.n[0];

export function textStats(s) {
  const trimmed = s.trim();
  return {
    chars: s ? [...s].length : 0,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    lines: s ? lines(s).length : 0,
  };
}
