// .docx export (editor HTML → WordprocessingML) and import (WordprocessingML → editor HTML).
import { createZip, readZip, decodeText, encodeText } from './zip.js';
import { PAPERS } from './state.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
const MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const esc = (s) => String(s)
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function bytesToB64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
const NAMED = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', orange: 'FFA500', purple: '800080', gray: '808080', grey: '808080', cyan: '00FFFF', magenta: 'FF00FF', pink: 'FFC0CB', brown: 'A52A2A', navy: '000080', teal: '008080', lime: '00FF00', maroon: '800000' };
function hexOf(c) {
  if (!c) return null;
  c = String(c).trim().toLowerCase();
  if (['transparent', 'inherit', 'initial', 'currentcolor', 'none'].includes(c)) return null;
  let m = c.match(/^#([0-9a-f]{3})$/);
  if (m) return m[1].split('').map((x) => x + x).join('').toUpperCase();
  m = c.match(/^#([0-9a-f]{6})/);
  if (m) return m[1].toUpperCase();
  m = c.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)/);
  if (m) {
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    return [m[1], m[2], m[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return NAMED[c] || null;
}
function px(v) {
  if (!v) return null;
  const m = String(v).trim().match(/^(-?[\d.]+)\s*(px|pt|em|rem|cm|mm|in)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return { px: n, pt: (n * 96) / 72, em: n * 16, rem: n * 16, cm: (n * 96) / 2.54, mm: (n * 96) / 25.4, in: n * 96 }[m[2] || 'px'] ?? null;
}
const GENERIC = /^(system-ui|-apple-system|ui-sans-serif|sans-serif|serif|monospace|blinkmacsystemfont|inherit)$/i;
function firstFont(v) {
  if (!v) return null;
  for (let f of v.split(',')) { f = f.trim().replace(/^["']|["']$/g, ''); if (f && !GENERIC.test(f)) return f; }
  return null;
}
function dataUri(uri) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(uri || '');
  if (!m) return null;
  const bin = m[2] ? atob(m[3]) : unescape(m[3]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return { mime: m[1].toLowerCase(), bytes: out };
}
async function imgBytes(img) {
  const src = img.getAttribute('src') || '';
  const d = dataUri(src);
  try { await img.decode(); } catch { /* ignore */ }
  if (d && /^image\/(png|jpeg|jpg|gif)$/.test(d.mime)) return d;
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || 300; c.height = img.naturalHeight || 150;
    c.getContext('2d').drawImage(img, 0, 0);
    return dataUri(c.toDataURL('image/png'));
  } catch { return null; }
}

const BLOCK = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'TABLE', 'HR', 'DIV', 'PRE', 'FIGURE', 'SECTION', 'ARTICLE']);
const ST_STYLE = { title: 'Title', subtitle: 'Subtitle', nospace: 'NoSpacing', caption: 'Caption', code: 'Code', intense: 'IntenseQuote' };

// Table styles (id → palette). Mirrors the CSS in style.css so Word shows the same look.
const TS = {
  grid:    { name: 'Grid', line: 'B8B8C0', all: true },
  plain:   { name: 'Plain', line: null },
  lines:   { name: 'Lines', line: 'BFBFBF', h: true },
  blue:    { name: 'Blue', line: '8EAADB', all: true, hf: '2F5496', hc: 'FFFFFF', band: 'D9E2F3' },
  banded:  { name: 'Banded', line: null, hf: '595959', hc: 'FFFFFF', band: 'F0F0F0' },
  dark:    { name: 'Dark', line: '404040', all: true, hf: '262626', hc: 'FFFFFF', band: 'D0CECE' },
  soft:    { name: 'Soft', line: 'BDD7EE', all: true, hf: 'DDEBF7', band: 'F2F8FC' },
  minimal: { name: 'Minimal', line: 'D9D9D9', h: true },
};
const tsId = (k) => 'Mdx' + k[0].toUpperCase() + k.slice(1);

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */
export async function exportDocx(root, o = {}) {
  const page = o.page || {};
  const base = PAPERS[page.size] || PAPERS.A4;
  const land = page.orientation === 'landscape';
  const pw = land ? base.th : base.tw, ph = land ? base.tw : base.th;
  const mg = { top: 96, bottom: 96, left: 96, right: 96, ...(page.margins || {}) };
  const tw = (v) => Math.round(v * 15);
  const contentTw = pw - tw(mg.left) - tw(mg.right);
  const contentPx = contentTw / 15;
  const font = o.font || 'Calibri';
  const fontSz = Math.round((o.fontSize || 11) * 2);

  const rels = [];
  const media = [];
  let relSeq = 10, docPr = 1, numSeq = 20;
  const lists = []; // {id, abs, start}
  const imgData = new Map();
  for (const img of root.querySelectorAll('img')) imgData.set(img, await imgBytes(img));
  const addRel = (type, target, external) => { const id = 'rId' + relSeq++; rels.push({ id, type, target, external }); return id; };

  /* ---- runs ---- */
  const rPr = (s) => {
    let x = '';
    if (s.font) x += `<w:rFonts w:ascii="${esc(s.font)}" w:hAnsi="${esc(s.font)}" w:cs="${esc(s.font)}"/>`;
    if (s.b) x += '<w:b/><w:bCs/>';
    if (s.i) x += '<w:i/><w:iCs/>';
    if (s.s) x += '<w:strike/>';
    if (s.caps) x += '<w:caps/>';
    if (s.color) x += `<w:color w:val="${s.color}"/>`;
    if (s.sz) x += `<w:sz w:val="${s.sz}"/><w:szCs w:val="${s.sz}"/>`;
    if (s.hl) x += `<w:shd w:val="clear" w:color="auto" w:fill="${s.hl}"/>`;
    if (s.u) x += '<w:u w:val="single"/>';
    if (s.va) x += `<w:vertAlign w:val="${s.va}"/>`;
    return x ? `<w:rPr>${x}</w:rPr>` : '';
  };
  const styleFrom = (el, st) => {
    const s = { ...st }, tag = el.tagName;
    if (tag === 'B' || tag === 'STRONG') s.b = true;
    if (tag === 'I' || tag === 'EM' || tag === 'CITE') s.i = true;
    if (tag === 'U' || tag === 'INS') s.u = true;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') s.s = true;
    if (tag === 'SUP') s.va = 'superscript';
    if (tag === 'SUB') s.va = 'subscript';
    if (tag === 'CODE' || tag === 'KBD' || tag === 'PRE') s.font = s.font || 'Consolas';
    if (tag === 'MARK') s.hl = 'FFFF00';
    if (tag === 'FONT') { const c = hexOf(el.getAttribute('color')); if (c) s.color = c; const f = firstFont(el.getAttribute('face')); if (f) s.font = f; }
    const cs = el.style;
    if (cs) {
      const fw = cs.fontWeight;
      if (fw === 'bold' || fw === 'bolder' || parseInt(fw, 10) >= 600) s.b = true;
      else if (fw === 'normal' || (fw && parseInt(fw, 10) < 600)) s.b = false;
      if (cs.fontStyle === 'italic' || cs.fontStyle === 'oblique') s.i = true;
      const td = cs.textDecoration || cs.textDecorationLine || '';
      if (td.includes('underline')) s.u = true;
      if (td.includes('line-through')) s.s = true;
      if (cs.textTransform === 'uppercase') s.caps = true;
      const col = hexOf(cs.color); if (col) s.color = col;
      const bg = hexOf(cs.backgroundColor); if (bg) s.hl = bg;
      const ff = firstFont(cs.fontFamily); if (ff) s.font = ff;
      const p = px(cs.fontSize); if (p) s.sz = Math.max(2, Math.round(p * 1.5));
      if (cs.verticalAlign === 'super') s.va = 'superscript';
      if (cs.verticalAlign === 'sub') s.va = 'subscript';
    }
    return s;
  };

  /* ---- images ---- */
  const imageRun = (img) => {
    const d = imgData.get(img);
    if (!d) return '';
    const ext = d.mime.includes('png') ? 'png' : d.mime.includes('gif') ? 'gif' : 'jpeg';
    const name = `image${media.length + 1}.${ext}`;
    media.push({ name, bytes: d.bytes });
    const rid = addRel('image', `media/${name}`);
    const nw = img.naturalWidth || 200, nh = img.naturalHeight || 150;
    let w = parseFloat(img.getAttribute('width')) || px(img.style.width) || nw;
    let h = parseFloat(img.getAttribute('height')) || px(img.style.height) || (w * nh) / nw;
    if (w > contentPx) { h = (h * contentPx) / w; w = contentPx; }
    const cx = Math.round(w * 9525), cy = Math.round(h * 9525);
    const id = docPr++;
    const tr = img.style.transform || '';
    const rot = img.getAttribute('data-rot') || (tr.match(/rotate\((-?\d+)/) || [])[1] || 0;
    const fl = img.getAttribute('data-flip') || '';
    const xf = `<a:xfrm${rot ? ` rot="${(((+rot % 360) + 360) % 360) * 60000}"` : ''}${fl.includes('h') ? ' flipH="1"' : ''}${fl.includes('v') ? ' flipV="1"' : ''}><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`;
    const graphic =
      `<wp:docPr id="${id}" name="Picture ${id}" descr="${esc(img.getAttribute('alt') || '')}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
      `<a:graphic><a:graphicData uri="${PIC}"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${esc(name)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr>${xf}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
    const wrap = img.getAttribute('data-wrap');
    if (wrap === 'left' || wrap === 'right') {
      return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="0"><wp:simplePos x="0" y="0"/>` +
        `<wp:positionH relativeFrom="margin"><wp:align>${wrap}</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV>` +
        `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/>${graphic}</wp:anchor></w:drawing></w:r>`;
    }
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>${graphic}</wp:inline></w:drawing></w:r>`;
  };

  /* ---- inline ---- */
  const fieldRun = (instr, shown, st) =>
    `<w:fldSimple w:instr=" ${instr} "><w:r>${rPr(st)}<w:t>${esc(shown)}</w:t></w:r></w:fldSimple>`;
  const inline = (node, st) => {
    if (node.nodeType === 3) {
      const text = node.nodeValue.replace(/ /g, ' ');
      if (!text) return '';
      let x = '';
      for (const p of text.split(/(\t|\n)/)) {
        if (p === '\t') x += `<w:r>${rPr(st)}<w:tab/></w:r>`;
        else if (p && p !== '\n') x += `<w:r>${rPr(st)}<w:t xml:space="preserve">${esc(p)}</w:t></w:r>`;
      }
      return x;
    }
    if (node.nodeType !== 1) return '';
    const tag = node.tagName;
    if (tag === 'BR') return '<w:r><w:br/></w:r>';
    if (tag === 'IMG') return imageRun(node);
    if (tag === 'A' && node.getAttribute('href')) {
      const href = node.getAttribute('href');
      const s2 = styleFrom(node, { ...st, u: true, color: st.color || '0563C1' });
      const inner = [...node.childNodes].map((c) => inline(c, s2)).join('');
      if (href[0] === '#') return inner;
      return `<w:hyperlink r:id="${addRel('hyperlink', href, true)}" w:history="1">${inner}</w:hyperlink>`;
    }
    const s2 = styleFrom(node, st);
    return [...node.childNodes].map((c) => inline(c, s2)).join('');
  };

  /* ---- paragraphs ---- */
  const sideBorder = (v) => {
    if (!v) return '';
    const m = String(v).match(/([\d.]+)px\s+(solid|dashed|dotted|double)\s+(.+)/);
    if (!m) return '';
    const sz = Math.max(2, Math.min(96, Math.round(parseFloat(m[1]) * 6)));
    return { s: m[2] === 'solid' ? 'single' : m[2], sz, c: hexOf(m[3]) || 'auto' };
  };
  const pPr = (el, o2 = {}) => {
    let x = '';
    if (o2.style) x += `<w:pStyle w:val="${o2.style}"/>`;
    if (o2.keep) x += '<w:keepNext/>';
    if (o2.num) x += `<w:numPr><w:ilvl w:val="${o2.num.lvl}"/><w:numId w:val="${o2.num.id}"/></w:numPr>`;
    const cs = el && el.style;
    if (o2.rule) x += '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="9A9AA0"/></w:pBdr>';
    else if (cs) {
      let b = '';
      for (const side of ['top', 'left', 'bottom', 'right']) {
        const d = sideBorder(cs.getPropertyValue('border-' + side) || (cs.borderStyle && cs.borderWidth ? `${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor}` : ''));
        if (d) b += `<w:${side} w:val="${d.s}" w:sz="${d.sz}" w:space="4" w:color="${d.c}"/>`;
      }
      if (b) x += `<w:pBdr>${b}</w:pBdr>`;
    }
    const bg = cs && hexOf(cs.backgroundColor);
    if (bg && !o2.num) x += `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>`;
    if (cs) {
      let sp = '';
      const mt = px(cs.marginTop), mb = px(cs.marginBottom);
      if (mt != null) sp += ` w:before="${tw(mt)}"`;
      if (mb != null) sp += ` w:after="${tw(mb)}"`;
      const lh = cs.lineHeight;
      let ratio = null;
      if (/^[\d.]+$/.test(lh)) ratio = parseFloat(lh); else if (/%$/.test(lh)) ratio = parseFloat(lh) / 100;
      if (ratio) sp += ` w:line="${Math.round(ratio * 240)}" w:lineRule="auto"`;
      if (sp) x += `<w:spacing${sp}/>`;
      const left = o2.num ? 0 : (px(cs.marginLeft) || px(cs.paddingLeft) || 0), right = px(cs.marginRight) || 0, first = px(cs.textIndent) || 0;
      if (left || right || first) x += `<w:ind w:left="${tw(left)}" w:right="${tw(right)}"${first > 0 ? ` w:firstLine="${tw(first)}"` : first < 0 ? ` w:hanging="${tw(-first)}"` : ''}/>`;
    }
    let jc = (cs && cs.textAlign) || (el && el.getAttribute && el.getAttribute('align')) || o2.jc || '';
    jc = { left: 'left', start: 'left', center: 'center', right: 'right', end: 'right', justify: 'both' }[jc];
    if (jc) x += `<w:jc w:val="${jc}"/>`;
    return x ? `<w:pPr>${x}</w:pPr>` : '';
  };
  const para = (el, runs, o2) => `<w:p>${pPr(el, o2)}${runs}</w:p>`;

  /* ---- lists ---- */
  const BULLET = { disc: 0, circle: 1, square: 2 };
  const ORDERED = { decimal: 3, 'lower-alpha': 4, 'lower-latin': 4, 'upper-alpha': 5, 'upper-latin': 5, 'lower-roman': 6, 'upper-roman': 7 };
  const listNum = (list) => {
    const ordered = list.tagName === 'OL';
    const type = (list.style.listStyleType || '').toLowerCase();
    if (!ordered) return 1 + (BULLET[type] ?? 0); // numIds 1-3 are bullets
    const abs = ORDERED[type] ?? 3;
    const id = numSeq++;
    lists.push({ id, abs, start: parseInt(list.getAttribute('start') || '1', 10) || 1 });
    return id;
  };
  const listItems = (list, depth, numId) => {
    let x = '';
    for (const li of list.children) {
      if (li.tagName !== 'LI') continue;
      const inl = [], nested = [];
      for (const c of li.childNodes) (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL') ? nested : inl).push(c);
      const hasText = inl.some((c) => c.nodeType === 1 || (c.nodeValue || '').trim());
      if (hasText || !nested.length) x += para(li, inl.map((c) => inline(c, {})).join(''), { style: 'ListParagraph', num: { lvl: Math.min(depth, 8), id: numId } });
      for (const n of nested) x += listItems(n, depth + 1, listNum(n));
    }
    return x;
  };

  /* ---- tables ---- */
  const tableXml = (table) => {
    const rows = [...table.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr')];
    const cols = Math.max(1, ...rows.map((r) => [...r.children].reduce((n, c) => n + (parseInt(c.getAttribute('colspan') || '1', 10) || 1), 0)));
    const colEls = [...table.querySelectorAll(':scope > colgroup > col')];
    let widths = colEls.map((c) => parseFloat(c.style.width) || 0);
    if (widths.length !== cols || widths.some((v) => !v)) widths = Array(cols).fill(100 / cols);
    const sum = widths.reduce((a, b) => a + b, 0);
    const colW = widths.map((v) => Math.max(200, Math.floor((v / sum) * contentTw)));
    const ts = TS[table.getAttribute('data-ts')] ? table.getAttribute('data-ts') : 'grid';
    const hdr = table.hasAttribute('data-hdr'), band = table.hasAttribute('data-band'), fc = table.hasAttribute('data-fc');
    let x = `<w:tbl><w:tblPr><w:tblStyle w:val="${tsId(ts)}"/><w:tblW w:w="${colW.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/>` +
      `<w:tblLook w:val="04A0" w:firstRow="${hdr ? 1 : 0}" w:lastRow="0" w:firstColumn="${fc ? 1 : 0}" w:lastColumn="0" w:noHBand="${band ? 0 : 1}" w:noVBand="1"/></w:tblPr>`;
    x += '<w:tblGrid>' + colW.map((w) => `<w:gridCol w:w="${w}"/>`).join('') + '</w:tblGrid>';
    // vMerge bookkeeping
    const occupied = rows.map(() => ({}));
    rows.forEach((r, ri) => {
      x += `<w:tr>${hdr && ri === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}`;
      let col = 0;
      const emitCell = (c, span, vm) => {
        let tcPr = `<w:tcW w:w="${colW.slice(col, col + span).reduce((a, b) => a + b, 0)}" w:type="dxa"/>`;
        if (span > 1) tcPr += `<w:gridSpan w:val="${span}"/>`;
        if (vm) tcPr += vm === 'restart' ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>';
        const bg = c && hexOf(c.style.backgroundColor);
        if (bg) tcPr += `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>`;
        const va = c && c.getAttribute('data-valign');
        if (va) tcPr += `<w:vAlign w:val="${va === 'middle' ? 'center' : va}"/>`;
        let body = c && vm !== 'continue' ? containerBlocks(c, {}) : '';
        if (!body.endsWith('</w:p>')) body += '<w:p/>';
        x += `<w:tc><w:tcPr>${tcPr}</w:tcPr>${body}</w:tc>`;
      };
      for (const c of r.children) {
        if (c.tagName !== 'TD' && c.tagName !== 'TH') continue;
        while (occupied[ri][col]) { emitCell(null, occupied[ri][col].span, 'continue'); col += occupied[ri][col].span; }
        const span = parseInt(c.getAttribute('colspan') || '1', 10) || 1;
        const rs = parseInt(c.getAttribute('rowspan') || '1', 10) || 1;
        for (let k = 1; k < rs && ri + k < rows.length; k++) occupied[ri + k][col] = { span };
        emitCell(c, span, rs > 1 ? 'restart' : null);
        col += span;
      }
      while (col < cols) { if (occupied[ri][col]) { emitCell(null, occupied[ri][col].span, 'continue'); col += occupied[ri][col].span; } else { emitCell(null, 1, null); col += 1; } }
      x += '</w:tr>';
    });
    const nx = table.nextElementSibling;
    return x + '</w:tbl>' + (nx && nx.tagName !== 'TABLE' ? '' : '<w:p/>');
  };

  /* ---- TOC ---- */
  const tocXml = (div) => {
    let inner = '';
    for (const p of div.children) {
      if (p.hasAttribute('data-toc-title')) inner += `<w:p><w:pPr><w:pStyle w:val="TOCHeading"/></w:pPr><w:r><w:t>${esc(p.textContent)}</w:t></w:r></w:p>`;
      else if (p.querySelector('.toc-t')) {
        const lvl = Math.min(3, parseInt(p.getAttribute('data-lvl') || '1', 10) || 1);
        inner += `<w:p><w:pPr><w:pStyle w:val="TOC${lvl}"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${contentTw}"/></w:tabs></w:pPr><w:r><w:t>${esc(p.querySelector('.toc-t').textContent)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>${esc((p.querySelector('.toc-pg') || {}).textContent || '')}</w:t></w:r></w:p>`;
      }
    }
    return `<w:sdt><w:sdtPr><w:docPartObj><w:docPartGallery w:val="Table of Contents"/><w:docPartUnique/></w:docPartObj></w:sdtPr><w:sdtContent>${inner || '<w:p/>'}</w:sdtContent></w:sdt>`;
  };

  /* ---- blocks ---- */
  const containerBlocks = (el, st = {}) => {
    let out = '', pending = [];
    const flush = () => {
      if (!pending.length) return;
      const runs = pending.map((n) => inline(n, st)).join('');
      pending = [];
      if (runs.trim()) out += `<w:p>${runs}</w:p>`;
    };
    for (const n of el.childNodes) {
      if (n.nodeType === 1 && BLOCK.has(n.tagName)) { flush(); out += blockXml(n, st); } else pending.push(n);
    }
    flush();
    return out;
  };
  const blockXml = (el, st = {}) => {
    const tag = el.tagName;
    if (tag === 'UL' || tag === 'OL') return listItems(el, 0, listNum(el));
    if (tag === 'TABLE') return tableXml(el);
    if (tag === 'HR') return el.classList.contains('pb') ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : para(null, '', { rule: true });
    if (tag === 'DIV' && el.hasAttribute('data-toc')) return tocXml(el);
    if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'FIGURE') {
      if ([...el.childNodes].some((c) => c.nodeType === 1 && BLOCK.has(c.tagName))) return containerBlocks(el, st);
    }
    const dst = el.getAttribute('data-st');
    let style = ST_STYLE[dst] || ({ H1: 'Heading1', H2: 'Heading2', H3: 'Heading3', H4: 'Heading3', H5: 'Heading3', H6: 'Heading3', BLOCKQUOTE: 'Quote', PRE: 'Code' })[tag];
    if (tag === 'BLOCKQUOTE' && dst === 'intense') style = 'IntenseQuote';
    const s2 = styleFrom(el, st);
    const runs = [...el.childNodes].map((c) => inline(c, ['BLOCKQUOTE'].includes(tag) ? st : s2)).join('');
    const only = el.children.length === 1 && el.firstElementChild.tagName === 'IMG' && !el.textContent.trim() ? el.firstElementChild : null;
    return para(el, runs, { style, jc: only && only.getAttribute('data-wrap') === 'center' ? 'center' : '' });
  };

  const bodyXml = containerBlocks(root) || '<w:p/>';

  /* ---- header / footer parts ---- */
  const hfXml = (tag, h) => {
    const text = (h && h.text) || '';
    const parts = text.split(/(\{page\}|\{pages\}|\{date\}|\{title\}|\n)/);
    let runs = '';
    for (const p of parts) {
      if (p === '{page}') runs += fieldRun('PAGE', '1', {});
      else if (p === '{pages}') runs += fieldRun('NUMPAGES', '1', {});
      else if (p === '{date}') runs += fieldRun('DATE \\@ "dd/MM/yyyy"', new Date().toLocaleDateString('en-GB'), {});
      else if (p === '{title}') runs += `<w:r><w:t xml:space="preserve">${esc(o.title || '')}</w:t></w:r>`;
      else if (p === '\n') runs += '<w:r><w:br/></w:r>';
      else if (p) runs += `<w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r>`;
    }
    const jc = { left: 'left', center: 'center', right: 'right' }[(h && h.align) || 'left'] || 'left';
    return `${XML}<w:${tag} xmlns:w="${W}" xmlns:r="${R}"><w:p><w:pPr><w:pStyle w:val="${tag === 'hdr' ? 'Header' : 'Footer'}"/><w:jc w:val="${jc}"/></w:pPr>${runs}</w:p></w:${tag}>`;
  };
  const extra = [];
  let hfRefs = '';
  const hasH = o.header && o.header.text, hasF = o.footer && o.footer.text;
  if (hasH) { extra.push({ name: 'word/header1.xml', data: hfXml('hdr', o.header), ct: 'header' }); hfRefs += `<w:headerReference w:type="default" r:id="${addRel('header', 'header1.xml')}"/>`; }
  if (hasF) { extra.push({ name: 'word/footer1.xml', data: hfXml('ftr', o.footer), ct: 'footer' }); hfRefs += `<w:footerReference w:type="default" r:id="${addRel('footer', 'footer1.xml')}"/>`; }
  if (o.diffFirst && (hasH || hasF)) {
    const empty = (tag) => `${XML}<w:${tag} xmlns:w="${W}"><w:p><w:pPr><w:pStyle w:val="${tag === 'hdr' ? 'Header' : 'Footer'}"/></w:pPr></w:p></w:${tag}>`;
    if (hasH) { extra.push({ name: 'word/header2.xml', data: empty('hdr'), ct: 'header' }); hfRefs += `<w:headerReference w:type="first" r:id="${addRel('header', 'header2.xml')}"/>`; }
    if (hasF) { extra.push({ name: 'word/footer2.xml', data: empty('ftr'), ct: 'footer' }); hfRefs += `<w:footerReference w:type="first" r:id="${addRel('footer', 'footer2.xml')}"/>`; }
  }
  const sect = `<w:sectPr>${hfRefs}<w:pgSz w:w="${pw}" w:h="${ph}"${land ? ' w:orient="landscape"' : ''}/>` +
    `<w:pgMar w:top="${tw(mg.top)}" w:right="${tw(mg.right)}" w:bottom="${tw(mg.bottom)}" w:left="${tw(mg.left)}" w:header="${tw(page.headerDist ?? 48)}" w:footer="${tw(page.footerDist ?? 48)}" w:gutter="0"/>${o.diffFirst && (hasH || hasF) ? '<w:titlePg/>' : ''}</w:sectPr>`;
  const pageBg = hexOf(page.color);
  const documentXml = `${XML}<w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="${WP}" xmlns:a="${A}" xmlns:pic="${PIC}">${pageBg ? `<w:background w:color="${pageBg}"/>` : ''}<w:body>${bodyXml}${sect}</w:body></w:document>`;

  const relsXml = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${R}/numbering" Target="numbering.xml"/><Relationship Id="rId3" Type="${R}/settings" Target="settings.xml"/>` +
    rels.map((r) => `<Relationship Id="${r.id}" Type="${R}/${r.type}" Target="${esc(r.target)}"${r.external ? ' TargetMode="External"' : ''}/>`).join('') + '</Relationships>';
  const ctOv = (p, t) => `<Override PartName="${p}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${t}+xml"/>`;
  const contentTypes = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/>' +
    ctOv('/word/document.xml', 'document.main') + ctOv('/word/styles.xml', 'styles') + ctOv('/word/numbering.xml', 'numbering') + ctOv('/word/settings.xml', 'settings') +
    extra.map((e) => ctOv('/' + e.name, e.ct)).join('') +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
  const rootRels = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/>` +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    `<Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  const iso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const core = `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${esc(o.title || '')}</dc:title><dc:creator>${esc(o.author || 'Material Docx')}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`;
  const app = `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Material Docx</Application></Properties>`;
  const settings = `${XML}<w:settings xmlns:w="${W}">${pageBg ? '<w:displayBackgroundShape/>' : ''}<w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;

  return createZip([
    { name: '[Content_Types].xml', data: contentTypes }, { name: '_rels/.rels', data: rootRels },
    { name: 'word/document.xml', data: documentXml }, { name: 'word/_rels/document.xml.rels', data: relsXml },
    { name: 'word/styles.xml', data: stylesXml(font, fontSz) }, { name: 'word/numbering.xml', data: numberingXml(lists) },
    { name: 'word/settings.xml', data: settings }, { name: 'docProps/core.xml', data: core }, { name: 'docProps/app.xml', data: app },
    ...extra.map((e) => ({ name: e.name, data: e.data })),
    ...media.map((m) => ({ name: 'word/media/' + m.name, data: m.bytes })),
  ]);
}

function stylesXml(font, sz) {
  const ps = (id, name, { ppr = '', rpr = '', based = 'Normal', next = 'Normal', ui = '' } = {}) =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>${based ? `<w:basedOn w:val="${based}"/>` : ''}${next ? `<w:next w:val="${next}"/>` : ''}${ui}<w:qFormat/>` +
    `${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}</w:style>`;
  const light = '<w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light" w:cs="Calibri Light"/>';
  const blue = '<w:color w:val="2F5496"/>';
  const tstyle = (k, d) => {
    const bd = (n, c, sz2 = 4) => `<w:${n} w:val="single" w:sz="${sz2}" w:space="0" w:color="${c}"/>`;
    const nb = (n) => `<w:${n} w:val="nil"/>`;
    let b = '';
    if (d.all) b = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((n) => bd(n, d.line)).join('');
    else if (d.h) b = bd('top', d.line) + nb('left') + bd('bottom', d.line) + nb('right') + bd('insideH', d.line) + nb('insideV');
    let pr = '';
    if (d.hf) pr += `<w:tblStylePr w:type="firstRow"><w:rPr><w:b/>${d.hc ? `<w:color w:val="${d.hc}"/>` : ''}</w:rPr><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${d.hf}"/></w:tcPr></w:tblStylePr>`;
    else pr += '<w:tblStylePr w:type="firstRow"><w:rPr><w:b/></w:rPr></w:tblStylePr>';
    pr += '<w:tblStylePr w:type="firstCol"><w:rPr><w:b/></w:rPr></w:tblStylePr>';
    pr += `<w:tblStylePr w:type="band2Horz"><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${d.band || 'F2F2F2'}"/></w:tcPr></w:tblStylePr>`;
    return `<w:style w:type="table" w:styleId="${tsId(k)}"><w:name w:val="Mdx ${d.name}"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="59"/><w:tblPr><w:tblStyleRowBandSize w:val="1"/>${b ? `<w:tblBorders>${b}</w:tblBorders>` : ''}</w:tblPr>${pr}</w:style>`;
  };
  return `${XML}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${esc(font)}" w:hAnsi="${esc(font)}" w:eastAsia="${esc(font)}" w:cs="${esc(font)}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>` +
    '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    ps('Heading1', 'heading 1', { ppr: '<w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="0"/><w:outlineLvl w:val="0"/>', rpr: `${light}${blue}<w:sz w:val="32"/><w:szCs w:val="32"/>`, ui: '<w:uiPriority w:val="9"/>' }) +
    ps('Heading2', 'heading 2', { ppr: '<w:keepNext/><w:keepLines/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="1"/>', rpr: `${light}${blue}<w:sz w:val="26"/><w:szCs w:val="26"/>`, ui: '<w:uiPriority w:val="9"/>' }) +
    ps('Heading3', 'heading 3', { ppr: '<w:keepNext/><w:keepLines/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="2"/>', rpr: `${light}<w:color w:val="1F3763"/><w:sz w:val="24"/><w:szCs w:val="24"/>`, ui: '<w:uiPriority w:val="9"/>' }) +
    ps('Title', 'Title', { ppr: '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:contextualSpacing/>', rpr: `${light}<w:spacing w:val="-10"/><w:kern w:val="28"/><w:sz w:val="56"/><w:szCs w:val="56"/>` }) +
    ps('Subtitle', 'Subtitle', { ppr: '<w:spacing w:after="160"/>', rpr: '<w:color w:val="5A5A5A"/><w:spacing w:val="15"/>' }) +
    ps('Quote', 'Quote', { ppr: '<w:spacing w:before="200" w:after="160"/><w:ind w:left="864" w:right="864"/><w:jc w:val="center"/>', rpr: '<w:i/><w:iCs/><w:color w:val="404040"/>' }) +
    ps('IntenseQuote', 'Intense Quote', { ppr: '<w:pBdr><w:top w:val="single" w:sz="4" w:space="10" w:color="2F5496"/><w:bottom w:val="single" w:sz="4" w:space="10" w:color="2F5496"/></w:pBdr><w:spacing w:before="360" w:after="360"/><w:ind w:left="864" w:right="864"/><w:jc w:val="center"/>', rpr: '<w:i/><w:iCs/><w:color w:val="2F5496"/>' }) +
    ps('Caption', 'caption', { ppr: '<w:spacing w:after="200" w:line="240" w:lineRule="auto"/>', rpr: '<w:i/><w:iCs/><w:color w:val="44546A"/><w:sz w:val="18"/><w:szCs w:val="18"/>' }) +
    ps('NoSpacing', 'No Spacing', { ppr: '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>' }) +
    ps('Code', 'Code', { ppr: '<w:shd w:val="clear" w:color="auto" w:fill="F1F1F1"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>', rpr: '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/>' }) +
    ps('ListParagraph', 'List Paragraph', { ppr: '<w:spacing w:after="40"/><w:ind w:left="720"/><w:contextualSpacing/>' }) +
    ps('TOCHeading', 'TOC Heading', { ppr: '<w:keepNext/><w:spacing w:before="240" w:after="0"/>', rpr: `${light}${blue}<w:sz w:val="32"/><w:szCs w:val="32"/>` }) +
    ps('TOC1', 'toc 1', { ppr: '<w:spacing w:after="100"/>' }) + ps('TOC2', 'toc 2', { ppr: '<w:spacing w:after="100"/><w:ind w:left="220"/>' }) + ps('TOC3', 'toc 3', { ppr: '<w:spacing w:after="100"/><w:ind w:left="440"/>' }) +
    ps('Header', 'header', { ppr: '<w:tabs><w:tab w:val="center" w:pos="4513"/><w:tab w:val="right" w:pos="9026"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>', rpr: '<w:color w:val="595959"/><w:sz w:val="20"/><w:szCs w:val="20"/>' }) +
    ps('Footer', 'footer', { ppr: '<w:tabs><w:tab w:val="center" w:pos="4513"/><w:tab w:val="right" w:pos="9026"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>', rpr: '<w:color w:val="595959"/><w:sz w:val="20"/><w:szCs w:val="20"/>' }) +
    '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>' +
    '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
    Object.entries(TS).map(([k, d]) => tstyle(k, d)).join('') + '</w:styles>';
}

function numberingXml(lists) {
  const lvl = (i, fmt, text, left, font) =>
    `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${left}" w:hanging="360"/></w:pPr>${font ? `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:hint="default"/></w:rPr>` : ''}</w:lvl>`;
  const bullet = (chars, font) => Array.from({ length: 9 }, (_, i) => lvl(i, 'bullet', chars[i % chars.length], 720 * (i + 1), font)).join('');
  const ord = (fmts) => Array.from({ length: 9 }, (_, i) => lvl(i, fmts[i % fmts.length], `%${i + 1}.`, 720 * (i + 1))).join('');
  const abs = (id, body) => `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="hybridMultilevel"/>${body}</w:abstractNum>`;
  const rot = (a, b, c) => [a, b, c];
  return `${XML}<w:numbering xmlns:w="${W}">` +
    abs(0, bullet(['•', 'o', '▪'].map((c) => c), 'Calibri')) +
    abs(1, bullet(['o', '▪', '•'], 'Calibri')) +
    abs(2, bullet(['▪', '•', 'o'], 'Calibri')) +
    abs(3, ord(rot('decimal', 'lowerLetter', 'lowerRoman'))) + abs(4, ord(rot('lowerLetter', 'lowerRoman', 'decimal'))) +
    abs(5, ord(rot('upperLetter', 'lowerRoman', 'decimal'))) + abs(6, ord(rot('lowerRoman', 'decimal', 'lowerLetter'))) + abs(7, ord(rot('upperRoman', 'decimal', 'lowerLetter'))) +
    '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="3"><w:abstractNumId w:val="2"/></w:num>' +
    lists.map((l) => `<w:num w:numId="${l.id}"><w:abstractNumId w:val="${l.abs}"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="${l.start}"/></w:lvlOverride></w:num>`).join('') +
    '</w:numbering>';
}

/* ------------------------------------------------------------------ */
/*  Import                                                            */
/* ------------------------------------------------------------------ */
const HL = { yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000', darkBlue: '#00008b', darkCyan: '#008b8b', darkGreen: '#006400', darkMagenta: '#8b008b', darkRed: '#8b0000', darkYellow: '#808000', darkGray: '#a9a9a9', lightGray: '#d3d3d3', black: '#000000', white: '#ffffff' };
const hEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const HEX6 = /^[0-9a-fA-F]{6}$/;

/** @returns {Promise<{html:string, meta:object}>} */
export async function importDocx(bytes) {
  const zip = readZip(bytes);
  const read = async (name) => (zip.has(name) ? decodeText(await zip.get(name)()) : null);
  const parse = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const docXml = await read('word/document.xml');
  if (!docXml) throw new Error('word/document.xml not found');
  const dom = parse(docXml);
  if (dom.getElementsByTagName('parsererror').length) throw new Error('Invalid document XML');

  const attr = (el, name) => (el ? (el.getAttributeNS(W, name) ?? el.getAttribute('w:' + name)) : null);
  const kids = (el, name) => (el ? [...el.children].filter((c) => c.localName === name) : []);
  const kid = (el, name) => kids(el, name)[0] || null;
  const onOff = (el) => { if (!el) return false; const v = attr(el, 'val'); return !(v === '0' || v === 'false' || v === 'off' || v === 'none'); };
  const find = (el, ns, name) => el.getElementsByTagNameNS(ns, name);

  /* relationships */
  const rels = {};
  const relsXml = await read('word/_rels/document.xml.rels');
  if (relsXml) for (const r of parse(relsXml).getElementsByTagName('Relationship')) rels[r.getAttribute('Id')] = { target: r.getAttribute('Target'), mode: r.getAttribute('TargetMode'), type: r.getAttribute('Type') };

  /* styles */
  const styles = {};
  let defRpr = null;
  const stylesDom = await read('word/styles.xml');
  if (stylesDom) {
    const sd = parse(stylesDom);
    const dd = sd.getElementsByTagNameNS(W, 'docDefaults')[0];
    defRpr = dd && kid(kid(dd, 'rPrDefault'), 'rPr');
    for (const s of sd.getElementsByTagNameNS(W, 'style')) {
      styles[attr(s, 'styleId')] = { name: attr(kid(s, 'name'), 'val') || attr(s, 'styleId'), basedOn: attr(kid(s, 'basedOn'), 'val'), type: attr(s, 'type'), rPr: kid(s, 'rPr'), pPr: kid(s, 'pPr'), def: attr(s, 'default') === '1' };
    }
  }
  const defSz = attr(kid(defRpr, 'sz'), 'val');
  const chain = (id) => { const out = []; for (let g = 0; id && styles[id] && g < 8; g++) { out.push(styles[id]); id = styles[id].basedOn; } return out; };
  const styleKind = (id) => {
    for (const s of chain(id)) {
      const nm = (s.name || '').toLowerCase().replace(/\s+/g, '');
      const m = nm.match(/^heading([1-9])$/);
      if (m) return { tag: 'h' + Math.min(3, +m[1]) };
      if (nm === 'title') return { tag: 'p', st: 'title' };
      if (nm === 'subtitle') return { tag: 'p', st: 'subtitle' };
      if (nm === 'quote') return { tag: 'blockquote' };
      if (nm === 'intensequote') return { tag: 'blockquote', st: 'intense' };
      if (nm === 'caption') return { tag: 'p', st: 'caption' };
      if (nm === 'nospacing') return { tag: 'p', st: 'nospace' };
      if (nm === 'code' || nm === 'htmlcode' || nm === 'htmlpreformatted' || nm === 'sourcecode') return { tag: 'p', st: 'code' };
    }
    return null;
  };
  const tableKind = (id) => {
    for (const s of chain(id)) { const m = /^Mdx(\w+)$/.exec(s === styles[id] ? id : ''); if (m) return m[1].toLowerCase(); }
    const m = /^Mdx(\w+)$/.exec(id || '');
    return m ? m[1].toLowerCase() : null;
  };

  /* numbering */
  const nums = {}; // numId → {lvl: {fmt, text, start}}
  const numXml = await read('word/numbering.xml');
  if (numXml) {
    const nd = parse(numXml), abs = {};
    for (const a of nd.getElementsByTagNameNS(W, 'abstractNum')) {
      const lv = {};
      for (const l of kids(a, 'lvl')) lv[attr(l, 'ilvl')] = { fmt: attr(kid(l, 'numFmt'), 'val'), text: attr(kid(l, 'lvlText'), 'val') || '', start: parseInt(attr(kid(l, 'start'), 'val') || '1', 10) };
      abs[attr(a, 'abstractNumId')] = lv;
    }
    for (const n of nd.getElementsByTagNameNS(W, 'num')) {
      const lv = JSON.parse(JSON.stringify(abs[attr(kid(n, 'abstractNumId'), 'val')] || {}));
      for (const ov of kids(n, 'lvlOverride')) {
        const so = kid(ov, 'startOverride'), i = attr(ov, 'ilvl');
        if (so && lv[i]) lv[i].start = parseInt(attr(so, 'val'), 10);
      }
      nums[attr(n, 'numId')] = lv;
    }
  }
  const listType = (def) => {
    if (!def) return { ordered: false, css: '' };
    const f = def.fmt;
    if (f === 'bullet' || f === 'none' || !f) return { ordered: false, css: { o: 'circle', '▪': 'square', '': 'square', '■': 'square' }[def.text] || '' };
    return { ordered: true, css: { lowerLetter: 'lower-alpha', upperLetter: 'upper-alpha', lowerRoman: 'lower-roman', upperRoman: 'upper-roman' }[f] || '', start: def.start };
  };

  /* images */
  const imgCache = {};
  const imageHtml = async (drawing) => {
    const blip = find(drawing, A, 'blip')[0];
    if (!blip) return '';
    const rel = rels[blip.getAttributeNS(R, 'embed') || blip.getAttribute('r:embed')];
    if (!rel) return '';
    const path = rel.target.startsWith('/') ? rel.target.slice(1) : 'word/' + rel.target.replace(/^\.\//, '');
    if (!zip.has(path)) return '';
    if (!(path in imgCache)) {
      const ext = path.split('.').pop().toLowerCase();
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp' }[ext];
      imgCache[path] = mime ? `data:${mime};base64,${bytesToB64(await zip.get(path)())}` : null;
    }
    if (!imgCache[path]) return '';
    const ext = find(drawing, WP, 'extent')[0];
    let size = '';
    if (ext) { const cx = +ext.getAttribute('cx'), cy = +ext.getAttribute('cy'); if (cx > 0 && cy > 0) size = ` width="${Math.round(cx / 9525)}" height="${Math.round(cy / 9525)}"`; }
    const dp = find(drawing, WP, 'docPr')[0];
    const alt = dp ? dp.getAttribute('descr') || '' : '';
    let extra = '';
    const xf = find(drawing, A, 'xfrm')[0];
    const tr = [];
    if (xf) {
      const rot = Math.round((+xf.getAttribute('rot') || 0) / 60000) % 360;
      if (rot) { extra += ` data-rot="${rot}"`; tr.push(`rotate(${rot}deg)`); }
      let fl = '';
      if (xf.getAttribute('flipH') === '1') { fl += 'h'; tr.push('scaleX(-1)'); }
      if (xf.getAttribute('flipV') === '1') { fl += 'v'; tr.push('scaleY(-1)'); }
      if (fl) extra += ` data-flip="${fl}"`;
    }
    const anchor = find(drawing, WP, 'anchor')[0];
    if (anchor && find(anchor, WP, 'wrapSquare')[0]) {
      const al = find(anchor, WP, 'align')[0];
      let side = al ? al.textContent : '';
      if (!side) { const off = find(anchor, WP, 'posOffset')[0]; side = off && +off.textContent > 1500000 ? 'right' : 'left'; }
      if (['left', 'right'].includes(side)) extra += ` data-wrap="${side}"`;
      else if (side === 'center') extra += ' data-wrap="center"';
    }
    return `<img src="${imgCache[path]}"${size} alt="${hEsc(alt)}"${extra}${tr.length ? ` style="transform:${tr.join(' ')}"` : ''}>`;
  };

  /* runs */
  const rprCss = (rPr, out) => {
    if (!rPr) return;
    if (kid(rPr, 'b')) out.b = onOff(kid(rPr, 'b'));
    if (kid(rPr, 'i')) out.i = onOff(kid(rPr, 'i'));
    const u = kid(rPr, 'u'); if (u) out.u = attr(u, 'val') !== 'none';
    if (kid(rPr, 'strike') || kid(rPr, 'dstrike')) out.s = onOff(kid(rPr, 'strike')) || onOff(kid(rPr, 'dstrike'));
    const va = attr(kid(rPr, 'vertAlign'), 'val'); if (va) out.va = va;
    const col = attr(kid(rPr, 'color'), 'val'); if (col) out.color = HEX6.test(col) ? '#' + col : null;
    const hl = attr(kid(rPr, 'highlight'), 'val'); const shd = attr(kid(rPr, 'shd'), 'fill');
    if (hl) out.bg = HL[hl] || null; else if (shd) out.bg = HEX6.test(shd) ? '#' + shd : null;
    const rf = kid(rPr, 'rFonts'); const f = rf && (attr(rf, 'ascii') || attr(rf, 'hAnsi')); if (f) out.font = f;
    const sz = attr(kid(rPr, 'sz'), 'val'); if (sz) out.sz = +sz;
    if (kid(rPr, 'caps')) out.caps = onOff(kid(rPr, 'caps'));
  };
  const wrapRun = (f, inner) => {
    let css = '';
    if (f.color) css += `color:${f.color};`;
    if (f.bg) css += `background-color:${f.bg};`;
    if (f.font) css += `font-family:'${f.font.replace(/'/g, '')}';`;
    if (f.sz && String(f.sz) !== String(defSz)) css += `font-size:${f.sz / 2}pt;`;
    if (f.caps) css += 'text-transform:uppercase;';
    if (css) inner = `<span style="${css}">${inner}</span>`;
    if (f.va === 'superscript') inner = `<sup>${inner}</sup>`;
    if (f.va === 'subscript') inner = `<sub>${inner}</sub>`;
    if (f.s) inner = `<s>${inner}</s>`;
    if (f.u) inner = `<u>${inner}</u>`;
    if (f.i) inner = `<i>${inner}</i>`;
    if (f.b) inner = `<b>${inner}</b>`;
    return inner;
  };

  // returns html; page breaks become the marker \u0001PB\u0001 so the paragraph can be split
  const PB = '\u0001PB\u0001';
  const runHtml = async (r, base, tokens) => {
    const f = { ...base };
    const rs = attr(kid(kid(r, 'rPr'), 'rStyle'), 'val');
    if (rs && styles[rs]) for (const s of chain(rs).reverse()) rprCss(s.rPr, f);
    rprCss(kid(r, 'rPr'), f);
    let inner = '';
    for (const c of r.children) {
      switch (c.localName) {
        case 't': inner += hEsc(c.textContent); break;
        case 'tab': inner += '&emsp;'; break;
        case 'br': if (attr(c, 'type') === 'page') inner += PB; else inner += '<br>'; break;
        case 'cr': inner += '<br>'; break;
        case 'noBreakHyphen': inner += '‑'; break;
        case 'sym': { const ch = attr(c, 'char'); if (ch) inner += String.fromCodePoint(parseInt(ch, 16) & 0xf0ff ? parseInt(ch, 16) : 63); break; }
        case 'drawing': inner += await imageHtml(c); break;
        case 'pict': case 'object': break;
        case 'AlternateContent': { const ch = kids(c, 'Choice')[0] || kid(c, 'Fallback'); const dr = ch && find(ch, W, 'drawing')[0]; if (dr) inner += await imageHtml(dr); break; }
        case 'fldChar': tokens && tokens.field(attr(c, 'fldCharType')); break;
        case 'instrText': tokens && tokens.instr(c.textContent); break;
        default: break;
      }
    }
    if (!inner) return '';
    if (tokens && tokens.skipping()) return '';
    return inner.includes(PB) ? inner.split(PB).map((x) => (x ? wrapRun(f, x) : '')).join(PB) : wrapRun(f, inner);
  };
  const FIELD = [[/\bPAGE\b/, '{page}'], [/\bNUMPAGES\b/, '{pages}'], [/\b(DATE|TIME|SAVEDATE|CREATEDATE)\b/, '{date}'], [/\b(TITLE)\b/, '{title}']];
  const mkTokens = () => {
    let depth = 0, instr = '', state = 'none', pending = '';
    return {
      field(t) { if (t === 'begin') { depth++; instr = ''; state = 'instr'; } else if (t === 'separate') { state = 'result'; } else if (t === 'end') { depth = Math.max(0, depth - 1); state = 'none'; const hit = FIELD.find(([re]) => re.test(instr)); if (hit) pending += hit[1]; } },
      instr(s) { instr += s; },
      skipping: () => state !== 'none',
      take() { const p = pending; pending = ''; return p; },
    };
  };

  const inlineHtml = async (parent, base = {}, tokens = null) => {
    let h = '';
    for (const c of parent.children) {
      switch (c.localName) {
        case 'r': {
          h += await runHtml(c, base, tokens);
          if (tokens) h += hEsc(tokens.take());
          break;
        }
        case 'hyperlink': {
          const inner = await inlineHtml(c, base, tokens);
          const rid = c.getAttributeNS(R, 'id') || c.getAttribute('r:id');
          const href = rid && rels[rid] ? rels[rid].target : null;
          h += href && /^(https?:|mailto:|tel:)/i.test(href) ? `<a href="${hEsc(href)}">${inner}</a>` : inner;
          break;
        }
        case 'fldSimple': {
          const ins = attr(c, 'instr') || '';
          const hit = tokens && FIELD.find(([re]) => re.test(ins));
          h += hit ? hEsc(hit[1]) : await inlineHtml(c, base, tokens);
          break;
        }
        case 'ins': case 'smartTag': case 'sdt': case 'sdtContent': case 'bdo': case 'dir':
          h += await inlineHtml(kid(c, 'sdtContent') || c, base, tokens);
          break;
        default: break;
      }
    }
    return h;
  };

  /* paragraph base formatting from style */
  const paraBase = (sid) => {
    const f = {};
    for (const s of chain(sid).reverse()) { if (s.type === 'paragraph') rprCss(s.rPr, f); }
    return f;
  };

  /* blocks */
  const blocksHtml = async (parent) => {
    const out = [];
    const stack = []; // {tag, numId, css}
    const closeTo = (n) => { while (stack.length > n) out.push(`</li></${stack.pop().tag}>`); };
    const listItem = (lvl, numId, inner, st) => {
      const def = (nums[numId] || {})[String(lvl)];
      const lt = listType(def);
      const tag = lt.ordered ? 'ol' : 'ul';
      closeTo(lvl + 1);
      const top = stack[lvl];
      if (top && (top.tag !== tag || top.numId !== numId)) closeTo(lvl);
      if (stack[lvl]) { out.push('</li>'); out.push(`<li${st ? ` style="${st}"` : ''}>${inner}`); return; }
      while (stack.length < lvl) { const d = (nums[numId] || {})[String(stack.length)]; const l2 = listType(d); const t2 = l2.ordered ? 'ol' : 'ul'; out.push(`<${t2}${l2.css ? ` style="list-style-type:${l2.css}"` : ''}><li>`); stack.push({ tag: t2, numId }); }
      out.push(`<${tag}${lt.css ? ` style="list-style-type:${lt.css}"` : ''}${lt.ordered && lt.start > 1 ? ` start="${lt.start}"` : ''}><li${st ? ` style="${st}"` : ''}>${inner}`);
      stack.push({ tag, numId });
    };

    const para = async (p) => {
      const pPr = kid(p, 'pPr');
      const sid = pPr && attr(kid(pPr, 'pStyle'), 'val');
      const kind = styleKind(sid);
      let inner = await inlineHtml(p, kind ? {} : paraBase(sid));
      if (kind && kind.tag !== 'p') { /* heading/quote keeps run formatting only */ }
      let st = '';
      const jc = pPr && attr(kid(pPr, 'jc'), 'val');
      const jcMap = { center: 'center', right: 'right', end: 'right', both: 'justify', distribute: 'justify' };
      if (jcMap[jc]) st += `text-align:${jcMap[jc]};`;
      const sp = pPr && kid(pPr, 'spacing');
      if (sp && !kind) {
        const line = attr(sp, 'line');
        if (line && (attr(sp, 'lineRule') || 'auto') === 'auto') { const ratio = Math.round((+line / 240) * 100) / 100; if (ratio && Math.abs(ratio - 1.15) > 0.02) st += `line-height:${ratio};`; }
        const b = attr(sp, 'before'), a = attr(sp, 'after');
        if (b != null && +b > 0) st += `margin-top:${Math.round(+b / 15)}px;`;
        if (a != null && a !== '160' && +a >= 0) st += `margin-bottom:${Math.round(+a / 15)}px;`;
      }
      const shd = pPr && attr(kid(pPr, 'shd'), 'fill');
      if (shd && HEX6.test(shd) && !kind) st += `background-color:#${shd};`;
      const bdr = pPr && kid(pPr, 'pBdr');
      if (bdr && !kind) for (const side of ['top', 'bottom', 'left', 'right']) { const b = kid(bdr, side); if (b && attr(b, 'val') !== 'nil' && attr(b, 'val') !== 'none') { const c = attr(b, 'color'); st += `border-${side}:${Math.max(1, Math.round((+attr(b, 'sz') || 4) / 6))}px solid ${c && HEX6.test(c) ? '#' + c : '#444'};`; } }
      const ind = pPr && kid(pPr, 'ind');
      const numPr = pPr && kid(pPr, 'numPr');
      const numId = numPr && attr(kid(numPr, 'numId'), 'val');
      if (ind && !(numPr && numId && numId !== '0') && !kind) {
        const left = +(attr(ind, 'left') || attr(ind, 'start') || 0), first = +(attr(ind, 'firstLine') || 0), hang = +(attr(ind, 'hanging') || 0), right = +(attr(ind, 'right') || attr(ind, 'end') || 0);
        if (left > 0) st += `margin-left:${Math.round(left / 15)}px;`;
        if (right > 0) st += `margin-right:${Math.round(right / 15)}px;`;
        if (first > 0) st += `text-indent:${Math.round(first / 15)}px;`;
        else if (hang > 0) st += `text-indent:-${Math.round(hang / 15)}px;`;
      }
      const pbBefore = pPr && onOff(kid(pPr, 'pageBreakBefore')) && kid(pPr, 'pageBreakBefore');
      if (pbBefore) { closeTo(0); out.push('<hr class="pb">'); }
      const plain = inner.replace(/<[^>]*>/g, '').replace(PB, '').trim();
      if (numPr && numId && numId !== '0' && !kind && nums[numId]) {
        const lvl = Math.min(parseInt(attr(kid(numPr, 'ilvl'), 'val') || '0', 10) || 0, 5);
        if (!plain && !inner.includes('<img')) inner = '<br>';
        listItem(lvl, numId, inner.split(PB).join(''), st);
        return;
      }
      closeTo(0);
      const emit = (html) => {
        let h = html;
        if (!h.replace(/<[^>]*>/g, '').trim() && !h.includes('<img')) h = '<br>';
        const tag = kind ? kind.tag : 'p';
        const dst = kind && kind.st ? ` data-st="${kind.st}"` : '';
        out.push(`<${tag}${dst}${st ? ` style="${st}"` : ''}>${h}</${tag}>`);
      };
      if (inner.includes(PB)) {
        const segs = inner.split(PB);
        segs.forEach((seg, i) => { if (i) out.push('<hr class="pb">'); if (seg || i === 0 && segs.length === 1) emit(seg); else if (i === segs.length - 1 && !seg) { /* trailing break: next paragraph continues */ } });
      } else emit(inner);
    };

    const walk = async (node) => {
      for (const c of node.children) {
        switch (c.localName) {
          case 'p': await para(c); break;
          case 'tbl': { closeTo(0); out.push(await tableHtml(c)); const nx = c.nextElementSibling; if (!nx || nx.localName !== 'p') out.push('<p><br></p>'); break; }
          case 'sdt': {
            const pr = kid(c, 'sdtPr');
            const gal = pr && find(pr, W, 'docPartGallery')[0];
            if (gal && /table of contents/i.test(attr(gal, 'val') || '')) { closeTo(0); out.push('<div data-toc="1" data-keep-ce="1" contenteditable="false"><p data-toc-title="1">Contents</p></div>'); break; }
            const content = kid(c, 'sdtContent');
            if (content) await walk(content);
            break;
          }
          case 'AlternateContent': break;
          default: break;
        }
      }
    };
    await walk(parent);
    closeTo(0);
    return out.join('');
  };

  const tableHtml = async (tbl) => {
    const tblPr = kid(tbl, 'tblPr');
    const sid = attr(kid(tblPr, 'tblStyle'), 'val');
    const known = tableKind(sid);
    const look = kid(tblPr, 'tblLook');
    const grid = kids(kid(tbl, 'tblGrid'), 'gridCol').map((g) => +attr(g, 'w') || 0);
    const gsum = grid.reduce((a, b) => a + b, 0);
    const cols = grid.length ? '<colgroup>' + grid.map((w) => `<col style="width:${((w / (gsum || 1)) * 100).toFixed(3)}%">`).join('') + '</colgroup>' : '';
    const bdr = kid(tblPr, 'tblBorders');
    const styleBdr = chain(sid).map((s) => s).length;
    let ts = known || (bdr && ['top', 'bottom', 'left', 'right', 'insideH', 'insideV'].every((n) => { const b = kid(bdr, n); return !b || ['nil', 'none'].includes(attr(b, 'val')); }) ? 'plain' : 'grid');
    if (!known && !bdr && sid && !/grid/i.test(sid) && styleBdr && !/^(TableNormal|a1)$/i.test(sid)) ts = 'grid';
    if (!TS[ts]) ts = 'grid';
    let attrs = ` data-ts="${ts}"`;
    const flag = (n) => look && (attr(look, n) === '1' || attr(look, n) === 'true');
    const firstRow = look ? flag('firstRow') : false;
    if (firstRow || kid(kid(tbl, 'tr'), 'trPr') && kid(kid(kid(tbl, 'tr'), 'trPr'), 'tblHeader')) attrs += ' data-hdr="1"';
    if (look && attr(look, 'noHBand') === '0') attrs += ' data-band="1"';
    if (flag('firstColumn')) attrs += ' data-fc="1"';
    const rows = kids(tbl, 'tr');
    const gridCells = [];
    const recs = [];
    for (let ri = 0; ri < rows.length; ri++) {
      gridCells[ri] = [];
      let col = 0;
      const row = [];
      for (const tc of kids(rows[ri], 'tc')) {
        const tcPr = kid(tc, 'tcPr');
        const span = parseInt(attr(kid(tcPr, 'gridSpan'), 'val') || '1', 10) || 1;
        const vm = kid(tcPr, 'vMerge');
        const vmv = vm ? attr(vm, 'val') || 'continue' : null;
        if (vmv === 'continue' && ri > 0 && gridCells[ri - 1][col]) {
          const above = gridCells[ri - 1][col]; above.rowspan++; gridCells[ri][col] = above; col += span; continue;
        }
        const fill = attr(kid(tcPr, 'shd'), 'fill');
        const va = attr(kid(tcPr, 'vAlign'), 'val');
        const rec = { rowspan: 1, span, bg: fill && HEX6.test(fill) ? '#' + fill : '', va: va === 'center' ? 'middle' : va === 'bottom' ? 'bottom' : '', html: (await blocksHtml(tc)) || '<p><br></p>' };
        gridCells[ri][col] = rec; row.push(rec); col += span;
      }
      recs.push(row);
    }
    let h = `<table${attrs}>${cols}<tbody>`;
    for (const row of recs) {
      h += '<tr>';
      for (const r of row) h += `<td${r.span > 1 ? ` colspan="${r.span}"` : ''}${r.rowspan > 1 ? ` rowspan="${r.rowspan}"` : ''}${r.va ? ` data-valign="${r.va}"` : ''}${r.bg ? ` style="background-color:${r.bg}"` : ''}>${r.html}</td>`;
      h += '</tr>';
    }
    return h + '</tbody></table>';
  };

  /* header / footer */
  const hfPart = async (sect, kind, type) => {
    for (const ref of kids(sect, kind + 'Reference')) {
      if ((attr(ref, 'type') || 'default') !== type) continue;
      const rel = rels[ref.getAttributeNS(R, 'id') || ref.getAttribute('r:id')];
      if (!rel) continue;
      const xml = await read('word/' + rel.target.replace(/^\.\//, ''));
      if (!xml) continue;
      const root = parse(xml).documentElement;
      const lines = [];
      let align = 'left';
      const ps = kids(root, 'p');
      for (const [i, p] of ps.entries()) {
        const tokens = mkTokens();
        const html = await inlineHtml(p, {}, tokens);
        const txt = html.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '').replace(/&emsp;/g, '\t').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\u0001PB\u0001/g, '');
        lines.push(txt);
        const jc = attr(kid(kid(p, 'pPr'), 'jc'), 'val');
        if (i === 0 || (!ps[0] && jc)) align = { center: 'center', right: 'right', end: 'right' }[jc] || 'left';
      }
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      return { text: lines.join('\n').replace(/\t+/g, '  ').trim(), align };
    }
    return null;
  };

  const body = find(dom, W, 'body')[0];
  if (!body) throw new Error('Document body not found');
  const html = await blocksHtml(body);

  /* page setup */
  const meta = { page: {}, diffFirst: false };
  const bgEl = find(dom, W, 'background')[0];
  const bgc = bgEl && attr(bgEl, 'color');
  meta.page.color = bgc && HEX6.test(bgc) ? '#' + bgc.toLowerCase() : '';
  const sect = [...body.children].filter((c) => c.localName === 'sectPr').pop() || find(dom, W, 'sectPr')[0];
  if (sect) {
    const pgSz = kid(sect, 'pgSz');
    if (pgSz) {
      let w = +attr(pgSz, 'w'), h = +attr(pgSz, 'h');
      const land = attr(pgSz, 'orient') === 'landscape' || w > h;
      if (land && w < h) [w, h] = [h, w]; else if (land) [w, h] = [h, w];
      let best = 'A4', bd = Infinity;
      for (const [name, s] of Object.entries(PAPERS)) { const d = Math.abs(s.tw - w) + Math.abs(s.th - h); if (d < bd) { bd = d; best = name; } }
      meta.page.size = best;
      meta.page.orientation = land ? 'landscape' : 'portrait';
    }
    const m = kid(sect, 'pgMar');
    if (m) {
      const g = (n, d) => { const v = +attr(m, n); return Number.isFinite(v) && v >= 0 && attr(m, n) !== null ? Math.round(v / 15) : d; };
      meta.page.margins = { top: g('top', 96), bottom: g('bottom', 96), left: g('left', 96), right: g('right', 96) };
      meta.page.headerDist = g('header', 48);
      meta.page.footerDist = g('footer', 48);
    }
    meta.diffFirst = !!kid(sect, 'titlePg');
    const hd = await hfPart(sect, 'header', 'default');
    const ft = await hfPart(sect, 'footer', 'default');
    meta.header = hd || { text: '', align: 'left' };
    meta.footer = ft || { text: '', align: 'center' };
  }
  const core = await read('docProps/core.xml');
  if (core) { const m = /<dc:creator>([^<]*)<\/dc:creator>/.exec(core); if (m) meta.author = m[1].replace(/&amp;/g, '&'); }
  return { html: html || '<p><br></p>', meta };
}

export { encodeText };
