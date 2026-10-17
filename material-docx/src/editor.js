// Editor core: selection helpers, undo/redo history, the "settle" pipeline (history → pagination → UI), sanitizer.
import { $, $$, esc, debounce } from './util.js';
import { doc, bus, cloneMeta, applyMeta } from './state.js';
import { settings } from './settings.js';
import { unpaginate, paginate, applyPageVars } from './paginate.js';

export const editor = $('#editor');
export const sheet = $('#sheet');
export const workspace = $('#workspace');

const BLOCKS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th';

/* ------------------------------------------------------------------ */
/*  Selection                                                         */
/* ------------------------------------------------------------------ */
let savedRange = null;
export const selInEditor = () => {
  const s = getSelection();
  return !!(s.rangeCount && editor.contains(s.anchorNode));
};
export function saveSel() {
  const s = getSelection();
  if (s.rangeCount && editor.contains(s.anchorNode) && editor.contains(s.focusNode)) savedRange = s.getRangeAt(0).cloneRange();
}
export function restoreSel() {
  if (document.activeElement !== editor) editor.focus({ preventScroll: true });
  if (savedRange && !selInEditor()) {
    try {
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(savedRange);
    } catch { /* ignore */ }
  }
}
export const getRange = () => {
  const s = getSelection();
  if (s.rangeCount && editor.contains(s.anchorNode)) return s.getRangeAt(0);
  return savedRange;
};
export const anchorEl = () => {
  const r = getRange();
  if (!r) return null;
  const n = r.startContainer;
  return n.nodeType === 3 ? n.parentElement : n;
};
export const focusEl = () => {
  const s = getSelection();
  if (!s.rangeCount || !editor.contains(s.focusNode)) return anchorEl();
  const n = s.focusNode;
  return n.nodeType === 3 ? n.parentElement : n;
};

export function closestBlock(node) {
  let n = node && node.nodeType === 3 ? node.parentElement : node;
  while (n && n !== editor) {
    if (n.matches && n.matches(BLOCKS)) {
      if ((n.tagName === 'TD' || n.tagName === 'TH') && n.querySelector('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre')) { n = n.parentElement; continue; }
      return n;
    }
    n = n.parentElement;
  }
  return null;
}

/** Block elements touched by the current selection (paragraphs, headings, list items, bare table cells). */
export function selectedBlocks() {
  const r = getRange();
  if (!r) return [];
  const out = [];
  const common = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentElement : r.commonAncestorContainer;
  if (r.collapsed || (common && common.closest && common.closest(BLOCKS) && !common.querySelector(BLOCKS) && common !== editor)) {
    const b = closestBlock(r.startContainer);
    return b ? [b] : [];
  }
  for (const b of editor.querySelectorAll(BLOCKS)) {
    if (b.classList.contains('pg-sp')) continue;
    if (!r.intersectsNode(b)) continue;
    if ((b.tagName === 'TD' || b.tagName === 'TH') && b.querySelector('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre')) continue;
    if (b.tagName === 'LI' && [...b.children].some((c) => c.tagName === 'P')) continue;
    out.push(b);
  }
  // a selection that ends exactly at the start of a block does not include that block
  if (out.length > 1 && r.endOffset === 0) {
    const last = out[out.length - 1];
    if (last.contains(r.endContainer) && !r.endContainer.textContent.length) out.pop();
    else if (r.endContainer === last || (r.endContainer.nodeType === 3 && last.firstChild === r.endContainer)) out.pop();
  }
  return out;
}

/* Path-based selection (for history). Paths index into the *clean* DOM. */
const pathOf = (node) => {
  const p = [];
  for (let n = node; n && n !== editor; n = n.parentNode) p.unshift([...n.parentNode.childNodes].indexOf(n));
  return p;
};
const nodeAt = (path) => {
  let n = editor;
  for (const i of path) { n = n && n.childNodes[i]; if (!n) return null; }
  return n;
};
function selSnapshot() {
  const s = getSelection();
  if (!s.rangeCount || !editor.contains(s.anchorNode) || !editor.contains(s.focusNode)) return null;
  return { a: pathOf(s.anchorNode), ao: s.anchorOffset, f: pathOf(s.focusNode), fo: s.focusOffset };
}
function selRestore(sn) {
  if (!sn) return false;
  const a = nodeAt(sn.a), f = nodeAt(sn.f);
  if (!a || !f) return false;
  try {
    editor.focus({ preventScroll: true });
    const s = getSelection();
    s.setBaseAndExtent(a, Math.min(sn.ao, a.nodeType === 3 ? a.nodeValue.length : a.childNodes.length), f, Math.min(sn.fo, f.nodeType === 3 ? f.nodeValue.length : f.childNodes.length));
    return true;
  } catch { return false; }
}

/* ------------------------------------------------------------------ */
/*  Image store (keeps history snapshots small: data URIs → tokens)   */
/* ------------------------------------------------------------------ */
const imgByUri = new Map();
const imgById = new Map();
function packImages(html) {
  return html.replace(/src="(data:image\/[^"]+)"/g, (m, uri) => {
    let id = imgByUri.get(uri);
    if (!id) { id = 'img:' + (imgByUri.size + 1); imgByUri.set(uri, id); imgById.set(id, uri); }
    return `src="${id}"`;
  });
}
const unpackImages = (html) => html.replace(/src="(img:\d+)"/g, (m, id) => `src="${imgById.get(id) || ''}"`);

/* ------------------------------------------------------------------ */
/*  Clean HTML (no pagination spacers / transient UI classes)         */
/* ------------------------------------------------------------------ */
export function cleanHtml() {
  unpaginate();
  const tmp = editor.cloneNode(true);
  for (const e of tmp.querySelectorAll('.sel, .sel-cell, .find-hit')) e.classList.remove('sel', 'sel-cell', 'find-hit');
  for (const e of tmp.querySelectorAll('[class=""]')) e.removeAttribute('class');
  for (const e of tmp.querySelectorAll('[contenteditable]')) if (!e.hasAttribute('data-keep-ce')) e.removeAttribute('contenteditable');
  return tmp.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  History                                                           */
/* ------------------------------------------------------------------ */
const hist = { stack: [], i: -1, pending: false, composing: false };
const MAX_HIST = 120;

function snapshot() {
  const html = packImages(cleanHtml());
  return { html, meta: JSON.stringify(cloneMeta()), sel: selSnapshot() };
}
export function historyReset() {
  hist.stack = [snapshot()];
  hist.i = 0;
  hist.pending = false;
  bus.emit('history');
}
/** Records the current state as an undo step (no-op if nothing changed). */
export function historyRecord() {
  hist.pending = false;
  const sn = snapshot();
  const cur = hist.stack[hist.i];
  if (cur && cur.html === sn.html && cur.meta === sn.meta) { cur.sel = sn.sel || cur.sel; return false; }
  hist.stack.length = hist.i + 1;
  hist.stack.push(sn);
  if (hist.stack.length > MAX_HIST) hist.stack.shift();
  hist.i = hist.stack.length - 1;
  bus.emit('history');
  return true;
}
function historyApply(sn) {
  editor.innerHTML = unpackImages(sn.html);
  applyMeta(JSON.parse(sn.meta));
  ensureContent();
  applyPageVars();
  bus.emit('meta');
  if (!selRestore(sn.sel)) placeCaretStart();
  settle({ record: false });
  markDirty();
}
export function undo() {
  if (hist.pending) historyRecord();
  if (hist.i <= 0) return false;
  hist.i--;
  historyApply(hist.stack[hist.i]);
  bus.emit('history');
  return true;
}
export function redo() {
  if (hist.i >= hist.stack.length - 1) return false;
  hist.i++;
  historyApply(hist.stack[hist.i]);
  bus.emit('history');
  return true;
}
export const canUndo = () => hist.i > 0 || hist.pending;
export const canRedo = () => hist.i < hist.stack.length - 1;

function placeCaretStart() {
  const first = editor.firstElementChild;
  if (!first) return;
  const r = document.createRange();
  r.selectNodeContents(first);
  r.collapse(true);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

/* ------------------------------------------------------------------ */
/*  Settling: history → pagination → UI refresh                       */
/* ------------------------------------------------------------------ */
export function ensureContent() {
  for (const e of editor.querySelectorAll('[data-keep-ce]')) if (e.getAttribute('contenteditable') !== 'false') e.setAttribute('contenteditable', 'false');
  if (!editor.innerHTML.trim() || editor.innerHTML === '<br>') editor.innerHTML = '<p><br></p>';
  // there must always be a paragraph after a page break / table / rule so the caret has somewhere to go
  const last = editor.lastElementChild;
  if (last && !last.classList.contains('pg-sp') && (last.tagName === 'TABLE' || last.tagName === 'HR' || last.classList.contains('pb') || last.hasAttribute('data-toc') || last.tagName === 'UL' && false)) {
    editor.appendChild(Object.assign(document.createElement('p'), { innerHTML: '<br>' }));
  }
  const first = editor.firstElementChild;
  if (first && (first.tagName === 'TABLE' || first.classList.contains('pb') || first.hasAttribute('data-toc')) && !first.classList.contains('pg-sp')) {
    editor.insertBefore(Object.assign(document.createElement('p'), { innerHTML: '<br>' }), first);
  }
}

let composing = false;
export const isComposing = () => composing;

export function markDirty() {
  if (!doc.dirty) { doc.dirty = true; bus.emit('dirty'); }
  bus.emit('modified');
}

/** Runs after any content/meta change: records history, repaginates, refreshes the UI. */
export function settle({ record = true } = {}) {
  if (composing) { pendingSettle = true; return; }
  ensureContent();
  unpaginate();
  if (record) historyRecord();
  paginate();
  bus.emit('settled');
}
let pendingSettle = false;
const settleSoon = debounce(() => settle(), 220);
export const scheduleSettle = () => { hist.pending = true; settleSoon(); };
export const flushSettle = () => { settleSoon.cancel(); if (hist.pending) settle(); };

/**
 * Runs an editing command: restores the selection, removes spacers, closes pending typing into its own undo step,
 * executes `fn`, then settles (new undo step + repagination).
 */
export function run(fn, { keepSel = false } = {}) {
  restoreSel();
  settleSoon.cancel();
  unpaginate();
  if (hist.pending) historyRecord();
  const out = fn();
  markDirty();
  settle();
  bus.emit('selection');
  void keepSel;
  return out;
}

/* ------------------------------------------------------------------ */
/*  execCommand helpers                                               */
/* ------------------------------------------------------------------ */
export function exec(cmd, val) {
  return run(() => {
    document.execCommand('styleWithCSS', false, true);
    return document.execCommand(cmd, false, val);
  });
}

/** Applies inline CSS to the selection (uses the font-size marker trick so partial ranges are split correctly). */
export function applyInline(styles) {
  return run(() => {
    document.execCommand('styleWithCSS', false, true);
    const collapsed = getSelection().isCollapsed;
    document.execCommand('fontSize', false, '7');
    const marks = editor.querySelectorAll('font[size="7"], span[style*="xxx-large"]');
    for (const m of marks) {
      let target = m;
      if (m.tagName === 'FONT') {
        target = document.createElement('span');
        while (m.firstChild) target.appendChild(m.firstChild);
        m.replaceWith(target);
      } else m.style.removeProperty('font-size');
      for (const [k, v] of Object.entries(styles)) {
        if (v === null || v === '') target.style.removeProperty(k);
        else target.style.setProperty(k, v);
      }
      if (!target.getAttribute('style')) target.removeAttribute('style');
    }
    if (collapsed) pendingInline = { ...styles };
  });
}
let pendingInline = null;
export const takePendingInline = () => { const p = pendingInline; pendingInline = null; return p; };
export const clearPendingInline = () => { pendingInline = null; };

/** Calls fn(text) for every text node touched by the selection (split at the selection edges) and replaces its text. */
export function mapSelectedText(fn) {
  return run(() => {
    const r = getRange();
    if (!r || r.collapsed) return;
    const nodes = [];
    const w = document.createTreeWalker(r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentNode : r.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (r.intersectsNode(n)) nodes.push(n);
    const s = getSelection();
    let startNode = r.startContainer, startOff = r.startOffset, endNode = r.endContainer, endOff = r.endOffset;
    for (const tn of nodes) {
      const from = tn === startNode && startNode.nodeType === 3 ? startOff : 0;
      const to = tn === endNode && endNode.nodeType === 3 ? endOff : tn.nodeValue.length;
      if (to <= from) continue;
      const v = tn.nodeValue;
      const mid = fn(v.slice(from, to));
      tn.nodeValue = v.slice(0, from) + mid + v.slice(to);
      if (tn === endNode) endOff = from + mid.length + (tn === startNode ? 0 : 0) + (endOff - to) + (to === endOff ? 0 : 0);
      if (tn === endNode && endNode.nodeType === 3) endOff = from + mid.length;
    }
    try { s.setBaseAndExtent(startNode, startOff, endNode, Math.min(endOff, endNode.nodeType === 3 ? endNode.nodeValue.length : endNode.childNodes.length)); } catch { /* ignore */ }
  });
}

/* ------------------------------------------------------------------ */
/*  Sanitizer (paste / HTML import)                                   */
/* ------------------------------------------------------------------ */
const ALLOWED = new Set('P DIV SPAN BR B STRONG I EM U S STRIKE DEL INS SUB SUP A UL OL LI H1 H2 H3 H4 H5 H6 BLOCKQUOTE TABLE THEAD TBODY TFOOT TR TD TH COLGROUP COL IMG HR PRE CODE FONT MARK SMALL CAPTION'.split(' '));
const DROP = new Set('SCRIPT STYLE IFRAME OBJECT EMBED LINK META NOSCRIPT TEMPLATE SVG FORM INPUT BUTTON SELECT TEXTAREA HEAD TITLE CANVAS AUDIO VIDEO'.split(' '));
const STYLE_OK = ['font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-decoration-style', 'color', 'background-color', 'font-size', 'font-family',
  'text-align', 'line-height', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom', 'vertical-align', 'text-indent', 'text-transform', 'letter-spacing', 'font-variant',
  'padding-left', 'list-style-type', 'border-top', 'border-bottom', 'border-left', 'border-right', 'border-color', 'border-style', 'border-width', 'width', 'height', 'float', 'text-shadow', 'display', 'table-layout', 'padding', 'transform', 'margin'];
const DATA_OK = new Set(['data-st', 'data-wrap', 'data-ts', 'data-hdr', 'data-band', 'data-fc', 'data-pb', 'data-toc', 'data-valign', 'data-w', 'data-keep-ce', 'data-lvl', 'data-toc-title', 'data-rot', 'data-flip', 'data-band', 'data-first']);
const SAFE_URL = /^(https?:|mailto:|tel:|#)/i;

/** Near-black / near-white text colours are really "automatic" — dropping them keeps text readable on light and dark pages. */
function isAutoColor(v) {
  const m = String(v).match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i) || null;
  let r, g, b;
  if (m) { let h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&'); [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  else { const n = String(v).match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i); if (!n) return /^(black|white)$/i.test(v); [r, g, b] = [+n[1], +n[2], +n[3]]; }
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (Math.max(r, g, b) - Math.min(r, g, b) > 40) return false; // real colours stay
  return l < 72 || l > 215;
}

export function sanitizeHtml(html, { keepData = true } = {}) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const out = document.createElement('div');
  const walk = (src, dst) => {
    for (const n of src.childNodes) {
      if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toUpperCase();
      if (DROP.has(tag)) continue;
      if (n.classList && n.classList.contains('pg-sp')) continue;
      if (!ALLOWED.has(tag)) { walk(n, dst); continue; }
      const el = document.createElement(tag.toLowerCase());
      if (tag === 'A') {
        const href = n.getAttribute('href') || '';
        if (SAFE_URL.test(href)) el.setAttribute('href', href);
      } else if (tag === 'IMG') {
        const s = n.getAttribute('src') || '';
        if (/^data:image\/(png|jpe?g|gif|webp|bmp)/i.test(s) || /^https?:/i.test(s)) el.setAttribute('src', s);
        else continue;
        for (const a of ['width', 'height', 'alt']) if (n.hasAttribute(a)) el.setAttribute(a, n.getAttribute(a));
      } else if (tag === 'TD' || tag === 'TH') {
        for (const a of ['colspan', 'rowspan']) if (n.hasAttribute(a)) el.setAttribute(a, n.getAttribute(a));
      } else if (tag === 'FONT') {
        for (const a of ['color', 'face']) if (n.hasAttribute(a)) el.setAttribute(a, n.getAttribute(a));
      } else if (tag === 'OL') {
        if (n.hasAttribute('start')) el.setAttribute('start', n.getAttribute('start'));
      }
      if (n.classList && n.classList.contains('pb')) el.className = 'pb';
      if (keepData) for (const a of n.attributes) if (DATA_OK.has(a.name)) el.setAttribute(a.name, a.value);
      if (n.style) {
        for (const p of STYLE_OK) {
          const v = n.style.getPropertyValue(p);
          if (v && !/url\(|expression|javascript:/i.test(v) && !(p === 'color' && isAutoColor(v))) el.style.setProperty(p, v);
        }
      }
      walk(n, el);
      dst.appendChild(el);
    }
  };
  walk(parsed.body, out);
  return out.innerHTML;
}

/** HTML from MS Word / web pages usually wraps everything in <span style=…> — drop ones that carry nothing useful. */
export function tidyPasted(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  for (const sp of d.querySelectorAll('span')) {
    if (!sp.getAttribute('style') && !sp.attributes.length) sp.replaceWith(...sp.childNodes);
  }
  return d.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  Editor events                                                     */
/* ------------------------------------------------------------------ */
export function setContent(html, { meta, resetHistory = true } = {}) {
  editor.innerHTML = html || '<p><br></p>';
  if (meta) applyMeta(meta);
  ensureContent();
  applyPageVars();
  workspace.scrollTop = 0;
  paginate();
  if (resetHistory) historyReset();
  bus.emit('content');
  bus.emit('meta');
  bus.emit('settled');
}

editor.addEventListener('compositionstart', () => { composing = true; });
editor.addEventListener('compositionend', () => {
  composing = false;
  hist.pending = true;
  if (pendingSettle) { pendingSettle = false; }
  settleSoon();
});
editor.addEventListener('input', (e) => {
  if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') return;
  markDirty();
  hist.pending = true;
  if (!composing) settleSoon();
  bus.emit('typing');
});

document.addEventListener('selectionchange', () => {
  if (selInEditor()) { saveSel(); bus.emit('selection'); }
});

/** True if the caret sits right next to a pagination spacer (Backspace/Delete would eat the spacer, not a character). */
function spacerAdjacent(back) {
  const s = getSelection();
  if (!s.rangeCount || !s.isCollapsed || !editor.contains(s.anchorNode)) return false;
  let node = s.anchorNode, off = s.anchorOffset;
  const isSp = (n) => n && n.nodeType === 1 && n.classList.contains('pg-sp');
  const edgeNeighbor = (n) => {
    // climb until there is a sibling in the wanted direction
    for (let cur = n; cur && cur !== editor; cur = cur.parentNode) {
      const sib = back ? cur.previousSibling : cur.nextSibling;
      if (sib) return sib;
    }
    return null;
  };
  if (node.nodeType === 3) {
    const len = node.nodeValue.length;
    if (back ? off > 0 : off < len) return false;
    return isSp(edgeNeighbor(node)) || isSp(descend(edgeNeighbor(node), back));
  }
  const child = node.childNodes[back ? off - 1 : off];
  if (child) return isSp(child) || isSp(descend(child, !back));
  return isSp(edgeNeighbor(node));
}
function descend(n, last) {
  while (n && n.nodeType === 1 && n.firstChild && !n.classList.contains('pg-sp')) n = last ? n.lastChild : n.firstChild;
  return n;
}

editor.addEventListener('keydown', (e) => {
  if (e.isComposing) return;
  if ((e.key === 'Backspace' && spacerAdjacent(true)) || (e.key === 'Delete' && spacerAdjacent(false))) { unpaginate(); }
});
editor.addEventListener('beforeinput', (e) => {
  if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); return; }
  if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); return; }
  if (/^delete/.test(e.inputType) && !composing) {
    // a non-collapsed selection that spans spacers must be cleaned first
    const s = getSelection();
    if (s.rangeCount && !s.isCollapsed) unpaginate();
  }
});

export function initEditorDefaults() {
  document.execCommand('defaultParagraphSeparator', false, 'p');
  document.execCommand('styleWithCSS', false, true);
}

export { BLOCKS };
export { esc, $$ };
