// Editing commands: character / paragraph formatting, styles, lists, insertions, header & footer, table of contents.
import { $, esc, ptToPx, pxToPt } from './util.js';
import { doc, bus, pageDims } from './state.js';
import { settings } from './settings.js';
import { editor, run, exec, applyInline, mapSelectedText, selectedBlocks, getRange, closestBlock, restoreSel, focusEl, anchorEl, sanitizeHtml, tidyPasted, BLOCKS, canUndo, canRedo, undo, redo, settle, markDirty, takePendingInline, clearPendingInline } from './editor.js';
import { layout } from './paginate.js';
import { t } from './i18n.js';

/* ------------------------------------------------------------------ */
/*  Fonts                                                             */
/* ------------------------------------------------------------------ */
export const FONTS = ['Calibri', 'Calibri Light', 'Arial', 'Arial Black', 'Bahnschrift', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel',
  'Courier New', 'Franklin Gothic Medium', 'Garamond', 'Georgia', 'Impact', 'Lucida Console', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
const FALLBACK = {
  Calibri: "Calibri, Carlito, 'Segoe UI', system-ui, sans-serif",
  'Calibri Light': "'Calibri Light', Calibri, Carlito, 'Segoe UI', system-ui, sans-serif",
  Arial: 'Arial, Arimo, Helvetica, sans-serif',
  'Times New Roman': "'Times New Roman', Tinos, Times, serif",
  Cambria: 'Cambria, Caladea, Georgia, serif',
  Consolas: "Consolas, 'Cascadia Mono', 'Courier New', monospace",
  'Courier New': "'Courier New', Cousine, monospace",
  Georgia: 'Georgia, serif',
  'Segoe UI': "'Segoe UI', system-ui, sans-serif",
  Garamond: 'Garamond, Georgia, serif',
  'Palatino Linotype': "'Palatino Linotype', Palatino, Georgia, serif",
};
export const fontStack = (name) => (FALLBACK[name] || `'${String(name).replace(/'/g, '')}', system-ui, sans-serif`);
export const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const firstFamily = (cs) => String(cs || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
const rgbHex = (c) => {
  const m = String(c || '').match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
  if (!m) return null;
  if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
  return '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
};

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */
export const STYLE_LIST = [
  { id: 'normal', tag: 'p', st: '', label: 'style.normal' },
  { id: 'nospace', tag: 'p', st: 'nospace', label: 'style.nospace' },
  { id: 'h1', tag: 'h1', st: '', label: 'style.h1' },
  { id: 'h2', tag: 'h2', st: '', label: 'style.h2' },
  { id: 'h3', tag: 'h3', st: '', label: 'style.h3' },
  { id: 'title', tag: 'p', st: 'title', label: 'style.title' },
  { id: 'subtitle', tag: 'p', st: 'subtitle', label: 'style.subtitle' },
  { id: 'quote', tag: 'blockquote', st: '', label: 'style.quote' },
  { id: 'intense', tag: 'blockquote', st: 'intense', label: 'style.intense' },
  { id: 'caption', tag: 'p', st: 'caption', label: 'style.caption' },
  { id: 'code', tag: 'p', st: 'code', label: 'style.code' },
];
export const styleOfBlock = (b) => {
  if (!b) return 'normal';
  const tag = b.tagName.toLowerCase();
  const st = b.dataset ? b.dataset.st || '' : '';
  const hit = STYLE_LIST.find((s) => s.tag === tag && s.st === st);
  if (hit) return hit.id;
  if (/^h[4-6]$/.test(tag)) return 'h3';
  return 'normal';
};

/* ------------------------------------------------------------------ */
/*  Selection-preserving DOM helpers                                  */
/* ------------------------------------------------------------------ */
function keepSel(fn) {
  const s = getSelection();
  const keep = s.rangeCount ? { a: s.anchorNode, ao: s.anchorOffset, f: s.focusNode, fo: s.focusOffset } : null;
  const map = new Map();
  const out = fn(map);
  if (keep) {
    const fix = (n) => { while (map.has(n)) n = map.get(n); return n; };
    const a = fix(keep.a), f = fix(keep.f);
    try {
      if (a && f && editor.contains(a) && editor.contains(f)) {
        const lim = (n, o) => Math.min(o, n.nodeType === 3 ? n.nodeValue.length : n.childNodes.length);
        s.setBaseAndExtent(a, lim(a, keep.ao), f, lim(f, keep.fo));
      }
    } catch { /* ignore */ }
  }
  return out;
}

function retag(b, tag, map) {
  if (b.tagName.toLowerCase() === tag) return b;
  const n = document.createElement(tag);
  for (const a of b.attributes) n.setAttribute(a.name, a.value);
  while (b.firstChild) n.appendChild(b.firstChild);
  b.replaceWith(n);
  if (map) map.set(b, n);
  return n;
}
/** Table cells with bare text get a paragraph so block formatting has something to attach to. */
function blockify(b, map) {
  if ((b.tagName === 'TD' || b.tagName === 'TH') && !b.querySelector('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre')) {
    const p = document.createElement('p');
    while (b.firstChild) p.appendChild(b.firstChild);
    if (!p.firstChild) p.innerHTML = '<br>';
    b.appendChild(p);
    if (map) map.set(b, p);
    return p;
  }
  return b;
}

/** Applies fn(block) to every paragraph-like block in the selection. */
function eachBlock(fn) {
  return run(() => keepSel((map) => {
    for (let b of selectedBlocks()) {
      b = blockify(b, map);
      fn(b, map);
    }
  }));
}

/* ------------------------------------------------------------------ */
/*  State query (drives the ribbon)                                   */
/* ------------------------------------------------------------------ */
const qs = (c) => { try { return document.queryCommandState(c); } catch { return false; } };
export function queryState() {
  const st = {
    undo: canUndo(), redo: canRedo(), hasSel: false, collapsed: true,
    bold: false, italic: false, underline: false, strike: false, sup: false, sub: false,
    font: settings.font, size: settings.fontSize, color: null, hl: null,
    align: 'left', list: null, style: 'normal', lineH: '', inTable: false, inImg: false, inLink: false, upper: false,
  };
  const r = getRange();
  if (!r) return st;
  st.hasSel = true;
  st.collapsed = r.collapsed;
  const fe = focusEl() || anchorEl();
  if (!fe || !editor.contains(fe)) return st;
  st.bold = qs('bold'); st.italic = qs('italic'); st.underline = qs('underline'); st.strike = qs('strikeThrough');
  st.sup = qs('superscript'); st.sub = qs('subscript');
  const cs = getComputedStyle(fe);
  const fam = firstFamily(cs.fontFamily);
  st.font = FONTS.find((f) => f.toLowerCase() === fam.toLowerCase()) || (fam === 'Carlito' ? 'Calibri' : fam);
  const px = parseFloat(cs.fontSize);
  if (px) st.size = Math.round(pxToPt(px) * 2) / 2;
  st.color = rgbHex(cs.color);
  for (let n = fe; n && n !== editor; n = n.parentElement) {
    const bg = rgbHex(getComputedStyle(n).backgroundColor);
    if (bg && n.matches('span, mark, font')) { st.hl = bg; break; }
    if (n.matches(BLOCKS)) break;
  }
  const b = closestBlock(fe);
  if (b) {
    const bc = getComputedStyle(b);
    const ta = bc.textAlign;
    st.align = ta === 'center' ? 'center' : ta === 'right' || ta === 'end' ? 'right' : ta === 'justify' ? 'justify' : 'left';
    st.style = styleOfBlock(b.tagName === 'LI' ? null : b);
    const lh = parseFloat(bc.lineHeight);
    const fs = parseFloat(bc.fontSize);
    if (lh && fs) st.lineH = String(Math.round((lh / fs) * 100) / 100);
  }
  const li = fe.closest('li');
  if (li && editor.contains(li)) st.list = li.parentElement.tagName === 'OL' ? 'ol' : 'ul';
  st.inTable = !!fe.closest('table');
  st.inLink = !!fe.closest('a');
  const sel = getSelection();
  st.inImg = !!(sel.rangeCount && selImgEl());
  return st;
}
let selImgEl = () => null;
export const setImageGetter = (fn) => { selImgEl = fn; };

/* ------------------------------------------------------------------ */
/*  Character formatting                                              */
/* ------------------------------------------------------------------ */
export const toggle = (cmd) => exec(cmd);
export const setFont = (name) => { if (name) applyInline({ 'font-family': fontStack(name) }); };
export function setSize(pt) {
  const v = parseFloat(String(pt).replace(',', '.'));
  if (!v || v < 1 || v > 1638) return;
  applyInline({ 'font-size': `${v}pt` });
}
export function stepSize(dir) {
  const cur = queryState().size || 11;
  const list = SIZES;
  let next;
  if (dir > 0) next = list.find((s) => s > cur + 0.01) || Math.min(1638, cur + 10);
  else next = [...list].reverse().find((s) => s < cur - 0.01) || Math.max(1, cur - 1);
  setSize(next);
}
export const setColor = (c) => (c ? applyInline({ color: c }) : applyInline({ color: null }));
export const setHighlight = (c) => applyInline({ 'background-color': c || null });

const smallWords = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'to', 'at']);
export function changeCase(mode) {
  const fn = {
    upper: (s) => s.toUpperCase(),
    lower: (s) => s.toLowerCase(),
    title: (s) => s.toLowerCase().replace(/(^|[\s(["'\-–—])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
    sentence: (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
    toggle: (s) => [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
  }[mode];
  void smallWords;
  if (fn) mapSelectedText(fn);
}

export function clearFormatting() {
  run(() => keepSel((map) => {
    document.execCommand('removeFormat');
    for (let b of selectedBlocks()) {
      if (b.tagName === 'LI') { b.removeAttribute('style'); continue; }
      b = blockify(b, map);
      b.removeAttribute('style');
      b.removeAttribute('data-st');
      retag(b, 'p', map);
    }
    for (const sp of editor.querySelectorAll('span[style]')) {
      const r = getRange();
      if (r && r.intersectsNode(sp) && !sp.closest('a')) sp.removeAttribute('style');
    }
  }));
}

/* Format painter */
let painter = null;
export const painterActive = () => !!painter;
export function startPainter() {
  const s = queryState();
  painter = { bold: s.bold, italic: s.italic, underline: s.underline, strike: s.strike, font: s.font, size: s.size, color: s.color, hl: s.hl, align: s.align };
  document.body.classList.add('painting');
  bus.emit('selection');
}
export function cancelPainter() {
  if (!painter) return;
  painter = null;
  document.body.classList.remove('painting');
  bus.emit('selection');
}
export function applyPainter() {
  if (!painter) return;
  const p = painter;
  const r = getRange();
  if (!r || r.collapsed) return;
  painter = null;
  document.body.classList.remove('painting');
  const cur = queryState();
  run(() => {
    if (!!cur.bold !== !!p.bold) document.execCommand('bold');
    if (!!cur.italic !== !!p.italic) document.execCommand('italic');
    if (!!cur.underline !== !!p.underline) document.execCommand('underline');
    if (!!cur.strike !== !!p.strike) document.execCommand('strikeThrough');
  });
  applyInline({ 'font-family': fontStack(p.font), 'font-size': `${p.size}pt`, color: p.color || null, 'background-color': p.hl || null });
  bus.emit('selection');
}

/** Called after typing: applies a style that was chosen with a collapsed caret to the characters typed since. */
export function fixPendingInline() {
  const pend = takePendingInline();
  if (!pend) return;
  const marks = editor.querySelectorAll('font[size="7"], span[style*="xxx-large"]');
  if (!marks.length) return;
  keepSel(() => {
    for (const m of marks) {
      let target = m;
      if (m.tagName === 'FONT') {
        target = document.createElement('span');
        while (m.firstChild) target.appendChild(m.firstChild);
        m.replaceWith(target);
      } else m.style.removeProperty('font-size');
      for (const [k, v] of Object.entries(pend)) {
        if (v === null || v === '') target.style.removeProperty(k); else target.style.setProperty(k, v);
      }
    }
  });
  clearPendingInline();
}

/* ------------------------------------------------------------------ */
/*  Paragraph formatting                                              */
/* ------------------------------------------------------------------ */
export const align = (kind) => exec({ left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' }[kind]);

export function applyStyle(id) {
  const def = STYLE_LIST.find((s) => s.id === id) || STYLE_LIST[0];
  eachBlock((b, map) => {
    if (b.tagName === 'LI') return;
    const n = retag(b, def.tag, map);
    if (def.st) n.dataset.st = def.st; else n.removeAttribute('data-st');
  });
}

const LIST_TYPES = {
  disc: 'ul', circle: 'ul', square: 'ul',
  decimal: 'ol', 'lower-alpha': 'ol', 'upper-alpha': 'ol', 'lower-roman': 'ol', 'upper-roman': 'ol',
};
export function toggleList(kind, type) {
  run(() => keepSel(() => {
    const st = queryState();
    const want = kind === 'ol' ? 'ol' : 'ul';
    if (!st.list || st.list !== want || !type) {
      if (st.list !== want) document.execCommand(want === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
      else if (!type) document.execCommand(want === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
    }
    const r = getRange();
    if (!r) return;
    const lists = new Set();
    for (const li of editor.querySelectorAll('li')) {
      if (r.intersectsNode(li)) { const l = li.parentElement; if (l && (l.tagName === 'UL' || l.tagName === 'OL')) lists.add(l); }
    }
    for (const l of lists) {
      if (type && LIST_TYPES[type] === l.tagName.toLowerCase()) l.style.listStyleType = type;
      else if (!type) l.style.removeProperty('list-style-type');
      if (!l.getAttribute('style')) l.removeAttribute('style');
    }
  }));
}

const INDENT_STEP = 48; // 0.5 inch
export function indent(dir) {
  const st = queryState();
  if (st.list) { exec(dir > 0 ? 'indent' : 'outdent'); return; }
  eachBlock((b) => {
    const cur = parseFloat(b.style.marginLeft) || 0;
    const v = Math.max(0, cur + dir * INDENT_STEP);
    if (v) b.style.marginLeft = v + 'px'; else b.style.removeProperty('margin-left');
    if (!b.getAttribute('style')) b.removeAttribute('style');
  });
}

export function setLineSpacing(v) {
  eachBlock((b) => {
    if (v) b.style.lineHeight = String(v); else b.style.removeProperty('line-height');
    if (!b.getAttribute('style')) b.removeAttribute('style');
  });
}
/** o: {left,right,first,before,after,line,align} (px for lengths, null = leave, '' = reset) */
export function setParagraph(o) {
  eachBlock((b) => {
    const set = (prop, v, unit = 'px') => {
      if (v === undefined || v === null) return;
      if (v === '' || (typeof v === 'number' && Number.isNaN(v))) b.style.removeProperty(prop);
      else b.style.setProperty(prop, typeof v === 'number' ? v + unit : v);
    };
    set('margin-left', o.left);
    set('margin-right', o.right);
    set('text-indent', o.first);
    set('margin-top', o.before);
    set('margin-bottom', o.after);
    if (o.line !== undefined && o.line !== null) set('line-height', o.line, '');
    if (o.align) b.style.textAlign = o.align;
    if (!b.getAttribute('style')) b.removeAttribute('style');
  });
}
export function toggleSpace(which) {
  const b = selectedBlocks()[0];
  if (!b) return;
  const cs = getComputedStyle(b);
  const prop = which === 'before' ? 'marginTop' : 'marginBottom';
  const has = parseFloat(cs[prop]) > 0.5;
  setParagraph({ [which]: has ? 0 : ptToPx(which === 'before' ? 12 : 8) });
}
export function shadeParagraph(c) {
  eachBlock((b) => {
    if (c) b.style.backgroundColor = c; else b.style.removeProperty('background-color');
    if (!b.getAttribute('style')) b.removeAttribute('style');
  });
}
export function paraBorder(kind) {
  const line = '1px solid #444';
  eachBlock((b) => {
    const sides = { bottom: ['bottom'], top: ['top'], left: ['left'], right: ['right'], all: ['top', 'bottom', 'left', 'right'] }[kind] || [];
    if (kind === 'none') { for (const s of ['top', 'bottom', 'left', 'right']) b.style.removeProperty('border-' + s); } else {
      for (const s of sides) b.style.setProperty('border-' + s, line);
      if (b.style.borderLeft || b.style.borderRight) b.style.padding = '2px 6px';
    }
    if (kind === 'none') b.style.removeProperty('padding');
    if (!b.getAttribute('style')) b.removeAttribute('style');
  });
}
export function sortLines() {
  const bs = selectedBlocks();
  if (bs.length < 2) return;
  run(() => {
    const parent = bs[0].parentNode;
    if (!bs.every((b) => b.parentNode === parent)) return;
    const sorted = [...bs].sort((a, b) => a.textContent.localeCompare(b.textContent));
    const ref = bs[bs.length - 1].nextSibling;
    for (const b of sorted) parent.insertBefore(b, ref);
  });
}

/* ------------------------------------------------------------------ */
/*  Insertions                                                        */
/* ------------------------------------------------------------------ */
export function insertHtml(html) {
  return run(() => { document.execCommand('insertHTML', false, html); });
}
export function insertText(txt) {
  return run(() => { document.execCommand('insertText', false, txt); });
}
export function insertHr() { insertHtml('<hr><p><br></p>'); }

export function insertPageBreak() {
  run(() => {
    const b = selectedBlocks()[0];
    const hr = document.createElement('hr');
    hr.className = 'pb';
    const top = b ? topLevel(b) : null;
    if (top) {
      // split the paragraph at the caret when it is a plain paragraph, otherwise insert after the block
      top.after(hr);
      if (!hr.nextElementSibling) hr.after(Object.assign(document.createElement('p'), { innerHTML: '<br>' }));
      const nxt = hr.nextElementSibling;
      const r = document.createRange();
      r.selectNodeContents(nxt);
      r.collapse(true);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
    } else editor.append(hr);
  });
}
function topLevel(n) {
  while (n && n.parentNode !== editor) n = n.parentNode;
  return n;
}

export const SYMBOLS = {
  common: '© ® ™ § ¶ † ‡ • … – — ‘ ’ “ ” « » ¡ ¿ ° ± × ÷ ≠ ≈ ≤ ≥ ∞ µ ‰ ′ ″ ¢ £ ¥ € ¤ ¹ ² ³ ¼ ½ ¾'.split(' '),
  arrows: '← ↑ → ↓ ↔ ↕ ⇐ ⇑ ⇒ ⇓ ⇔ ↩ ↪ ↵ ➜ ➔ ➤ ▲ ▼ ◀ ▶ ◆ ◇ ○ ● □ ■ ☐ ☑ ☒ ★ ☆ ♠ ♣ ♥ ♦ ♪ ♫ ✓ ✔ ✗ ✘ ☎ ✉ ☺ ☹'.split(' '),
  math: '∑ ∏ √ ∫ ∂ ∆ ∇ ∈ ∉ ∩ ∪ ⊂ ⊃ ⊆ ⊇ ∀ ∃ ∧ ∨ ¬ ⇒ ⇔ ∝ ∠ ⊥ ∥ ≡ ≅ ∼ ≪ ≫ α β γ δ ε θ λ μ π ρ σ τ φ ω Γ Δ Θ Λ Π Σ Φ Ψ Ω'.split(' '),
  latin: 'À Á Â Ã Ä Å Æ Ç È É Ê Ë Ì Í Î Ï Ð Ñ Ò Ó Ô Õ Ö Ø Ù Ú Û Ü Ý Þ ß à á â ã ä å æ ç è é ê ë ì í î ï ð ñ ò ó ô õ ö ø ù ú û ü ý þ ÿ Ă ă Đ đ Ơ ơ Ư ư'.split(' '),
};

export function formatDate(fmt, d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const lang = document.documentElement.lang || 'en';
  switch (fmt) {
    case 'iso': return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    case 'short': return d.toLocaleDateString(lang);
    case 'long': return d.toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    case 'time': return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    case 'datetime': return d.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
    default: return d.toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
  }
}

/** Page numbers & headers / footers live in the document model, not in the text flow. */
export function setHeaderFooter(zone, patch) {
  run(() => {
    Object.assign(doc[zone], patch);
    bus.emit('meta');
  });
}
export function setPageNumber(zone, alignment) {
  const other = zone === 'header' ? 'footer' : 'header';
  void other;
  run(() => {
    const cur = doc[zone];
    const hasTok = /\{page\}/.test(cur.text || '');
    doc[zone] = { ...cur, text: hasTok ? cur.text : (cur.text ? cur.text + '   ' : '') + '{page}', align: alignment };
    bus.emit('meta');
  });
}
export function removePageNumbers() {
  run(() => {
    for (const z of ['header', 'footer']) doc[z] = { ...doc[z], text: (doc[z].text || '').replace(/\{page\}( of \{pages\})?/g, '').trim() };
    bus.emit('meta');
  });
}

/* Table of contents */
export function headingList() {
  const out = [];
  for (const h of editor.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    if (h.closest('[data-toc]')) continue;
    const text = h.textContent.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    out.push({ el: h, level: Math.min(3, +h.tagName[1]), text, page: layout.pageOf.get(h) || 1 });
  }
  return out;
}
function tocInner(maxLevel = 3) {
  const hs = headingList().filter((h) => h.level <= maxLevel);
  if (!hs.length) return `<p class="toc-empty">${esc(t('toc.empty'))}</p>`;
  return hs.map((h) => `<p data-lvl="${h.level}"><span class="toc-t">${esc(h.text)}</span><span class="toc-pg">${h.page}</span></p>`).join('');
}
export function tocHtml() {
  return `<div data-toc="1" data-keep-ce="1" contenteditable="false"><p data-toc-title="1">${esc(t('toc.title'))}</p>${tocInner()}</div>`;
}
export function insertToc() {
  run(() => {
    const b = selectedBlocks()[0];
    const top = b ? topLevel(b) : null;
    const tmp = document.createElement('div');
    tmp.innerHTML = tocHtml();
    const node = tmp.firstChild;
    if (top) top.before(node); else editor.prepend(node);
  });
  settle();
  updateToc();
}
export function updateToc() {
  const tocs = editor.querySelectorAll('[data-toc]');
  if (!tocs.length) return;
  const sig = (d) => d.innerHTML;
  let changed = false;
  run(() => {
    for (const d of tocs) {
      const title = d.querySelector('[data-toc-title]');
      const before = sig(d);
      d.innerHTML = '';
      if (title) d.append(title);
      d.insertAdjacentHTML('beforeend', tocInner());
      if (sig(d) !== before) changed = true;
    }
  });
  return changed;
}
export function removeToc() { run(() => { for (const d of editor.querySelectorAll('[data-toc]')) d.remove(); }); }

/* ------------------------------------------------------------------ */
/*  Links                                                             */
/* ------------------------------------------------------------------ */
export function currentLink() {
  const fe = focusEl() || anchorEl();
  return fe ? fe.closest('a') : null;
}
export function setLink(url, text) {
  run(() => {
    restoreSel();
    const a = currentLink();
    if (a) {
      a.setAttribute('href', url);
      if (text != null && text !== a.textContent) a.textContent = text;
      return;
    }
    const r = getRange();
    if (r && !r.collapsed) document.execCommand('createLink', false, url);
    else document.execCommand('insertHTML', false, `<a href="${esc(url)}">${esc(text || url)}</a>&nbsp;`);
  });
}
export function removeLink() {
  run(() => {
    const a = currentLink();
    if (a) { const r = document.createRange(); r.selectNodeContents(a); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    document.execCommand('unlink');
  });
}

/* ------------------------------------------------------------------ */
/*  Clipboard                                                         */
/* ------------------------------------------------------------------ */
export function pasteHtml(html) {
  const clean = tidyPasted(sanitizeHtml(html, { keepData: false }));
  if (clean) insertHtml(clean);
}
export function pasteText(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  if (lines.length === 1) { insertText(lines[0]); return; }
  insertHtml(lines.map((l) => `<p>${l ? esc(l) : '<br>'}</p>`).join(''));
}
export async function pasteFromClipboard(plain) {
  restoreSel();
  try {
    const items = await navigator.clipboard.read();
    for (const it of items) {
      if (!plain && it.types.includes('text/html')) { pasteHtml(await (await it.getType('text/html')).text()); return true; }
      if (it.types.includes('text/plain')) { pasteText(await (await it.getType('text/plain')).text()); return true; }
      const im = it.types.find((x) => x.startsWith('image/'));
      if (im) { bus.emit('paste-image', await it.getType(im)); return true; }
    }
  } catch {
    try { const tx = await navigator.clipboard.readText(); if (tx) { pasteText(tx); return true; } } catch { /* fall through */ }
  }
  return false;
}
export async function copySel(cut) {
  restoreSel();
  const ok = document.execCommand(cut ? 'cut' : 'copy');
  if (!ok) {
    try { await navigator.clipboard.writeText(String(getSelection())); if (cut) run(() => document.execCommand('delete')); } catch { /* ignore */ }
  }
}

export function selectAll() {
  restoreSel();
  const r = document.createRange();
  r.selectNodeContents(editor);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
  bus.emit('selection');
}

export const doUndo = () => { restoreSel(); undo(); };
export const doRedo = () => { restoreSel(); redo(); };
export { $, markDirty, pageDims };
