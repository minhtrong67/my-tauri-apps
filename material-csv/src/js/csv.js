// Pure CSV helpers: delimiter detection, parsing, serialising, number sniffing.

export const DELIMS = [',', ';', '\t', '|'];

/** Picks the delimiter that splits the first lines most consistently. */
export function detectDelimiter(text) {
  const lines = text.slice(0, 40000).split(/\r\n|\n|\r/).filter(l => l !== '').slice(0, 12);
  if (!lines.length) return ',';
  let best = ',', bestScore = -1;
  for (const d of DELIMS) {
    const counts = lines.map(l => countOutsideQuotes(l, d));
    if (!counts[0]) continue;
    const consistent = counts.every(c => c === counts[0]);
    const score = consistent ? 1000 + counts[0] : counts.reduce((a, b) => a + b, 0) / counts.length;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

function countOutsideQuotes(line, d) {
  let n = 0, q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    else if (!q && c === d) n++;
  }
  return n;
}

export function detectEol(text) {
  const i = text.search(/\r|\n/);
  if (i < 0) return '\r\n';
  return text[i] === '\r' && text[i + 1] === '\n' ? '\r\n' : text[i] === '\r' ? '\r' : '\n';
}

/** RFC 4180 parser with lenient handling of stray quotes. Blank lines are skipped unless keepBlank. */
export function parseCSV(text, delim = ',', { keepBlank = false } = {}) {
  const rows = [];
  let row = [];
  const n = text.length;
  const dc = delim.charCodeAt(0);
  let i = 0;
  const endRow = () => {
    if (keepBlank || !(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };
  while (i < n) {
    let val;
    if (text.charCodeAt(i) === 34) {
      let j = i + 1;
      val = '';
      for (;;) {
        const k = text.indexOf('"', j);
        if (k === -1) { val += text.slice(j); i = n; break; }
        val += text.slice(j, k);
        if (text.charCodeAt(k + 1) === 34) { val += '"'; j = k + 2; }
        else { i = k + 1; break; }
      }
      while (i < n) {
        const c = text.charCodeAt(i);
        if (c === dc || c === 10 || c === 13) break;
        val += text[i++];
      }
    } else {
      let j = i;
      while (j < n) {
        const c = text.charCodeAt(j);
        if (c === dc || c === 10 || c === 13) break;
        j++;
      }
      val = text.slice(i, j);
      i = j;
    }
    row.push(val);
    if (i >= n) { endRow(); break; }
    const c = text.charCodeAt(i);
    if (c === dc) {
      i++;
      if (i >= n) { row.push(''); endRow(); break; }
    } else {
      if (c === 13 && text.charCodeAt(i + 1) === 10) i++;
      i++;
      endRow();
    }
  }
  return rows;
}

export function stringifyCSV(head, rows, { delim = ',', eol = '\r\n', quoteAll = false, header = true } = {}) {
  const single = (header ? head.length : (rows[0] || head).length) === 1;
  const q = v => {
    v = v == null ? '' : String(v);
    if (quoteAll || v.includes(delim) || v.includes('"') || v.includes('\n') || v.includes('\r') || (single && v === ''))
      return '"' + v.replace(/"/g, '""') + '"';
    return v;
  };
  const out = [];
  if (header) out.push(head.map(q).join(delim));
  for (let i = 0; i < rows.length; i++) out.push(rows[i].map(q).join(delim));
  return out.join(eol) + (out.length ? eol : '');
}

/** Pads every row to the widest row. Returns the width. */
export function normalize(rows) {
  let w = 0;
  for (const r of rows) if (r.length > w) w = r.length;
  for (const r of rows) while (r.length < w) r.push('');
  return w;
}

const NUM = /^[-+]?(\d+([.,]\d+)?|[.,]\d+)(e[-+]?\d+)?$/i;
export const isNumeric = v => v !== '' && NUM.test(v.trim());
export const toNumber = v => parseFloat(String(v).trim().replace(',', '.'));

export function colName(i) {
  let s = '';
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

/** Natural comparison used by sorting: numbers numerically, text with locale rules, blanks last. */
export function cmpValues(a, b) {
  const ea = a === '' || a == null, eb = b === '' || b == null;
  if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1;
  if (isNumeric(a) && isNumeric(b)) return toNumber(a) - toNumber(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}
