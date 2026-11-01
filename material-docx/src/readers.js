// Readers for the non-.docx formats Material Docx can open: ODT, RTF, Markdown, CSV/TSV and plain text.
// Every reader returns an HTML string for the editor (it is sanitised by the caller).
import { esc } from './util.js';
import { readZip, decodeText } from './zip.js';

/** Extensions that can be opened (also used by the open dialog, drag & drop and file associations). */
export const OPEN_TYPES = {
  word: ['docx', 'docm', 'dotx', 'dotm'],
  odf: ['odt', 'ott'],
  rtf: ['rtf'],
  web: ['html', 'htm', 'xhtml'],
  md: ['md', 'markdown'],
  data: ['csv', 'tsv'],
  text: ['txt', 'text', 'log'],
};
export const OPEN_EXT = Object.values(OPEN_TYPES).flat();
export const isOpenable = (ext) => OPEN_EXT.includes(ext);
export const kindOf = (ext) => Object.keys(OPEN_TYPES).find((k) => OPEN_TYPES[k].includes(ext)) || null;

const dec = (b) => new TextDecoder().decode(b).replace(/^\uFEFF/, '');
const para = (s) => (s ? `<p>${esc(s)}</p>` : '<p><br></p>');

/* ------------------------------------------------------------------ */
/*  Plain text / CSV / TSV                                            */
/* ------------------------------------------------------------------ */
export const readText = (bytes) => dec(bytes).split(/\r?\n/).map(para).join('') || '<p><br></p>';

function parseDelimited(text, sep) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"' && !cell) q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

export function readDelimited(bytes, ext) {
  const text = dec(bytes);
  const sep = ext === 'tsv' ? '\t' : (text.split('\n')[0].split(';').length > text.split('\n')[0].split(',').length ? ';' : ',');
  const rows = parseDelimited(text, sep);
  if (!rows.length) return '<p><br></p>';
  const cols = Math.max(...rows.map((r) => r.length));
  const body = rows.map((r, i) => {
    const tag = i === 0 ? 'th' : 'td';
    return '<tr>' + Array.from({ length: cols }, (_, c) => `<${tag}>${esc(r[c] || '')}</${tag}>`).join('') + '</tr>';
  }).join('');
  return `<table data-style="grid"><tbody>${body}</tbody></table><p><br></p>`;
}

/* ------------------------------------------------------------------ */
/*  Markdown (headings, emphasis, lists, quotes, code, links, tables)  */
/* ------------------------------------------------------------------ */
function mdInline(s) {
  let h = esc(s);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
  h = h.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<i>$2</i>').replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<i>$2</i>');
  h = h.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  h = h.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (m, a, u) => (/^(https?:|data:image)/i.test(u) ? `<img alt="${a}" src="${u}">` : esc(a)));
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (m, a, u) => (/^(https?:|mailto:)/i.test(u) ? `<a href="${u}">${a}</a>` : a));
  return h;
}

export function readMarkdown(bytes) {
  const lines = dec(bytes).split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    let m;
    if (/^```/.test(ln)) {
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      out.push(`<pre>${esc(code.join('\n'))}</pre>`);
    } else if ((m = /^(#{1,6})\s+(.*?)\s*#*$/.exec(ln))) { out.push(`<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`); i++; }
    else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(ln)) { out.push('<hr>'); i++; }
    else if (/^>\s?/.test(ln)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${mdInline(q.join(' '))}</blockquote>`);
    } else if (/^\s*([-*+]|\d+[.)])\s+/.test(ln)) {
      const ordered = /^\s*\d/.test(ln);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) items.push(`<li>${mdInline(lines[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, ''))}</li>`);
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
    } else if (/^\|.*\|\s*$/.test(ln) && /^\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(ln);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<table data-style="grid"><tbody><tr>${head.map((c) => `<th>${mdInline(c)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${head.map((_, c) => `<td>${mdInline(r[c] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    } else if (!ln.trim()) { i++; }
    else {
      const p = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>\s?|\s*([-*+]|\d+[.)])\s+)/.test(lines[i])) p.push(lines[i++]);
      out.push(`<p>${mdInline(p.join(' '))}</p>`);
    }
  }
  return out.join('') || '<p><br></p>';
}

/* ------------------------------------------------------------------ */
/*  RTF                                                               */
/* ------------------------------------------------------------------ */
const RTF_SKIP = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'header', 'footer', 'headerl', 'headerr', 'footerl', 'footerr', 'listtable', 'listoverridetable', 'rsidtbl', 'generator', 'themedata', 'colorschememapping', 'datastore', 'latentstyles', 'xmlnstbl', 'fldinst', 'bkmkstart', 'bkmkend', 'object', 'shp', 'nonshppict']);

export function readRtf(bytes) {
  const src = new TextDecoder('latin1').decode(bytes);
  // colour table
  const colors = [null];
  const ct = /\{\\colortbl\s*;?([^}]*)\}/.exec(src);
  if (ct) for (const c of ct[1].split(';')) { const m = /\\red(\d+)\\green(\d+)\\blue(\d+)/.exec(c); if (m) colors.push(`rgb(${m[1]},${m[2]},${m[3]})`); }

  let st = { b: 0, i: 0, u: 0, s: 0, fs: 0, cf: 0, skip: false };
  const stack = [];
  let uc = 1, skipChars = 0;
  const blocks = [];
  let cur = { runs: [], align: '', cells: null };
  let run = '';
  let tableRows = null, rowCells = null, cellBlocks = [];
  const style = (s) => {
    const css = [];
    if (s.fs) css.push(`font-size:${s.fs / 2}pt`);
    if (s.cf && colors[s.cf]) css.push(`color:${colors[s.cf]}`);
    return css.join(';');
  };
  const wrap = (txt, s) => {
    let h = esc(txt);
    if (s.b) h = `<b>${h}</b>`;
    if (s.i) h = `<i>${h}</i>`;
    if (s.u) h = `<u>${h}</u>`;
    if (s.s) h = `<s>${h}</s>`;
    const css = style(s);
    return css ? `<span style="${css}">${h}</span>` : h;
  };
  let runState = st;
  const flushRun = () => { if (run) { cur.runs.push(wrap(run, runState)); run = ''; } };
  const text = (ch) => { if (st.skip) return; if (run && runState !== st && JSON.stringify(runState) !== JSON.stringify(st)) flushRun(); if (!run) runState = { ...st }; run += ch; };
  const endPara = () => {
    flushRun();
    const html = cur.runs.join('');
    const al = cur.align ? ` style="text-align:${cur.align}"` : '';
    const p = `<p${al}>${html || '<br>'}</p>`;
    if (rowCells) cellBlocks.push(p); else blocks.push(p);
    cur = { runs: [], align: '', cells: null };
  };

  const re = /\\([a-zA-Z]+)(-?\d+)? ?|\\'([0-9a-fA-F]{2})|\\([\\{}~_\-*\r\n])|([{}])|([^\\{}\r\n]+)|[\r\n]+/g;
  const cpm = /\\ansicpg(\d+)/.exec(src);
  const CPNAME = { 932: 'shift_jis', 936: 'gbk', 949: 'euc-kr', 950: 'big5' };
  let cpDec;
  try { cpDec = new TextDecoder(cpm ? (CPNAME[cpm[1]] || `windows-${cpm[1]}`) : 'windows-1252'); } catch { cpDec = new TextDecoder('windows-1252'); }
  let hexBuf = [];
  const flushHex = () => { if (hexBuf.length) { const s = cpDec.decode(new Uint8Array(hexBuf)); hexBuf = []; text(s); } };
  let m;
  while ((m = re.exec(src))) {
    const [, word, num, hex, sym, brace, plain] = m;
    if (hex === undefined) flushHex();
    if (brace === '{') { stack.push({ ...st, uc }); }
    else if (brace === '}') { flushRun(); const p = stack.pop(); if (p) { uc = p.uc; st = { b: p.b, i: p.i, u: p.u, s: p.s, fs: p.fs, cf: p.cf, skip: p.skip }; } }
    else if (plain !== undefined) {
      let s = plain;
      if (skipChars > 0) { const n = Math.min(skipChars, s.length); s = s.slice(n); skipChars -= n; }
      if (s) text(s);
    } else if (hex !== undefined) {
      if (skipChars > 0) skipChars--; else hexBuf.push(parseInt(hex, 16));
    } else if (sym !== undefined) {
      if (sym === '*') st.skip = true;
      else if (sym === '~') text('\u00a0');
      else if (sym === '_') text('\u2011');
      else if (sym === '-') { /* optional hyphen */ }
      else if (sym === '\\' || sym === '{' || sym === '}') text(sym);
    } else if (word) {
      const n = num === undefined ? null : parseInt(num, 10);
      if (RTF_SKIP.has(word) && stack.length) { st.skip = true; continue; }
      switch (word) {
        case 'b': flushRun(); st.b = n === 0 ? 0 : 1; break;
        case 'i': flushRun(); st.i = n === 0 ? 0 : 1; break;
        case 'ul': case 'uld': case 'uldb': flushRun(); st.u = n === 0 ? 0 : 1; break;
        case 'ulnone': flushRun(); st.u = 0; break;
        case 'strike': flushRun(); st.s = n === 0 ? 0 : 1; break;
        case 'fs': flushRun(); st.fs = n || 0; break;
        case 'cf': flushRun(); st.cf = n || 0; break;
        case 'uc': uc = n ?? 1; break;
        case 'u': { let v = n; if (v < 0) v += 65536; text(String.fromCharCode(v)); skipChars = uc; break; }
        case 'par': case 'sect': if (!st.skip) endPara(); break;
        case 'line': text('\n'); break;
        case 'tab': text('\t'); break;
        case 'emdash': text('—'); break; case 'endash': text('–'); break;
        case 'lquote': text('‘'); break; case 'rquote': text('’'); break;
        case 'ldblquote': text('“'); break; case 'rdblquote': text('”'); break;
        case 'bullet': text('•'); break;
        case 'pard': cur.align = ''; break;
        case 'qc': cur.align = 'center'; break; case 'qr': cur.align = 'right'; break; case 'qj': cur.align = 'justify'; break; case 'ql': cur.align = ''; break;
        case 'trowd': tableRows ||= []; rowCells = []; cellBlocks = []; break;
        case 'cell': if (rowCells) { if (cur.runs.length || run) endPara(); rowCells.push(cellBlocks.join('') || '<p><br></p>'); cellBlocks = []; } break;
        case 'row': if (rowCells) { tableRows.push(rowCells); rowCells = null; cellBlocks = []; } break;
        default: break;
      }
      if (tableRows && !rowCells && !['trowd', 'cell', 'row', 'intbl'].includes(word) && ['par', 'pard'].includes(word) && tableRows.length) {
        blocks.push(`<table data-style="grid"><tbody>${tableRows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
        tableRows = null;
      }
    }
  }
  flushHex();
  if (cur.runs.length || run) endPara();
  if (tableRows && tableRows.length) blocks.push(`<table data-style="grid"><tbody>${tableRows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
  return blocks.join('') || '<p><br></p>';
}

/* ------------------------------------------------------------------ */
/*  OpenDocument text (.odt / .ott)                                    */
/* ------------------------------------------------------------------ */
export async function readOdt(bytes) {
  const zip = readZip(bytes);
  if (!zip.has('content.xml')) throw new Error('content.xml not found');
  const dom = new DOMParser().parseFromString(decodeText(await zip.get('content.xml')()), 'application/xml');
  if (dom.getElementsByTagName('parsererror').length) throw new Error('Invalid ODT XML');
  const A = (e, n) => e.getAttribute(n);
  const kids = (e) => [...e.children];
  const ln = (e) => e.localName;

  // automatic styles → inline css
  const styles = {};
  for (const s of dom.getElementsByTagName('style:style')) {
    const name = A(s, 'style:name');
    const tp = kids(s).find((c) => ln(c) === 'text-properties');
    const pp = kids(s).find((c) => ln(c) === 'paragraph-properties');
    const css = [];
    if (tp) {
      if (A(tp, 'fo:font-weight') === 'bold') css.push('font-weight:700');
      if (A(tp, 'fo:font-style') === 'italic') css.push('font-style:italic');
      const ul = A(tp, 'style:text-underline-style');
      const st = A(tp, 'style:text-line-through-style');
      if ((ul && ul !== 'none') || (st && st !== 'none')) css.push(`text-decoration:${[ul && ul !== 'none' ? 'underline' : '', st && st !== 'none' ? 'line-through' : ''].filter(Boolean).join(' ')}`);
      const col = A(tp, 'fo:color'); if (col && /^#[0-9a-f]{6}$/i.test(col)) css.push(`color:${col}`);
      const bg = A(tp, 'fo:background-color'); if (bg && /^#[0-9a-f]{6}$/i.test(bg)) css.push(`background-color:${bg}`);
      const fs = A(tp, 'fo:font-size'); if (fs && /pt$/.test(fs)) css.push(`font-size:${fs}`);
    }
    if (pp) { const al = A(pp, 'fo:text-align'); if (['center', 'end', 'justify'].includes(al)) css.push(`text-align:${al === 'end' ? 'right' : al}`); }
    styles[name] = css.join(';');
  }
  const imgs = {};
  const imgData = async (href) => {
    if (imgs[href] !== undefined) return imgs[href];
    let out = '';
    if (zip.has(href)) {
      const u8 = await zip.get(href)();
      const ext = href.split('.').pop().toLowerCase();
      let bin = '';
      for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      out = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${btoa(bin)}`;
    }
    return (imgs[href] = out);
  };

  const inline = async (node) => {
    let h = '';
    for (const c of node.childNodes) {
      if (c.nodeType === 3) { h += esc(c.nodeValue); continue; }
      if (c.nodeType !== 1) continue;
      switch (ln(c)) {
        case 'span': { const css = styles[A(c, 'text:style-name')]; const inner = await inline(c); h += css ? `<span style="${css}">${inner}</span>` : inner; break; }
        case 'a': { const href = A(c, 'xlink:href') || ''; const inner = await inline(c); h += /^(https?:|mailto:)/i.test(href) ? `<a href="${esc(href)}">${inner}</a>` : inner; break; }
        case 's': h += '\u00a0'.repeat(parseInt(A(c, 'text:c') || '1', 10)); break;
        case 'tab': h += '\t'; break;
        case 'line-break': h += '<br>'; break;
        case 'frame': { const im = c.getElementsByTagName('draw:image')[0]; if (im) { const d = await imgData(A(im, 'xlink:href') || ''); if (d) h += `<img src="${d}" alt="">`; } break; }
        default: h += await inline(c);
      }
    }
    return h;
  };
  const block = async (e) => {
    switch (ln(e)) {
      case 'h': { const lv = Math.min(6, parseInt(A(e, 'text:outline-level') || '1', 10)); return `<h${lv}>${await inline(e) || '<br>'}</h${lv}>`; }
      case 'p': { const css = styles[A(e, 'text:style-name')]; return `<p${css ? ` style="${css}"` : ''}>${await inline(e) || '<br>'}</p>`; }
      case 'list': {
        let items = '';
        const ordered = /^(N|n|Num)/i.test(A(e, 'text:style-name') || '') || /number/i.test(A(e, 'text:style-name') || '');
        for (const li of kids(e)) if (ln(li) === 'list-item') items += `<li>${(await Promise.all(kids(li).map(block))).join('')}</li>`;
        return `<${ordered ? 'ol' : 'ul'}>${items}</${ordered ? 'ol' : 'ul'}>`;
      }
      case 'table': {
        let rows = '';
        for (const r of e.getElementsByTagName('table:table-row')) {
          let cells = '';
          for (const c of kids(r)) if (ln(c) === 'table-cell') cells += `<td${A(c, 'table:number-columns-spanned') ? ` colspan="${A(c, 'table:number-columns-spanned')}"` : ''}>${(await Promise.all(kids(c).map(block))).join('') || '<p><br></p>'}</td>`;
          rows += `<tr>${cells}</tr>`;
        }
        return `<table data-style="grid"><tbody>${rows}</tbody></table><p><br></p>`;
      }
      case 'section': return (await Promise.all(kids(e).map(block))).join('');
      default: return '';
    }
  };
  const body = dom.getElementsByTagName('office:text')[0];
  if (!body) return '<p><br></p>';
  return (await Promise.all(kids(body).map(block))).join('') || '<p><br></p>';
}
