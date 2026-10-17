// Keyboard shortcuts, clipboard / drag & drop, auto-format as you type and the editor's context menu.
import { $, esc, extOf, b64ToBytes, baseName } from './util.js';
import { t } from './i18n.js';
import { bus } from './state.js';
import { settings } from './settings.js';
import { openContextMenu, popupOpen, closePopup, toast } from './popup.js';
import { editor, workspace, run, getRange, anchorEl, selInEditor, restoreSel, closestBlock, flushSettle, exec } from './editor.js';
import * as C from './cmds.js';
import * as D from './dialogs.js';
import * as TB from './tables.js';
import * as IM from './images.js';
import * as V from './view.js';
import { openFind, findOpen, closeFind, go as findGo } from './find.js';
import { newDoc, openDoc, saveDoc, printDoc, loadBytes, confirmDiscard, T, invoke } from './fileio.js';
import { openBackstage, isBackstageOpen } from './backstage.js';

const modalOpen = () => !!document.querySelector('dialog[open]');
const inField = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
const mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
const isCtrl = (e) => (mac ? e.metaKey : e.ctrlKey);

/* ------------------------------ images from disk / clipboard ------------------------------ */
async function insertImages(files) {
  for (const f of files) {
    try { await IM.insertImageBlob(f); } catch { toast(t('toast.badImage')); }
  }
}

/* ------------------------------ keyboard ------------------------------ */
export function initKeyboard({ toggleFullscreen }) {
  document.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const k = e.key;
    const ctrl = isCtrl(e);
    const t0 = e.target;
    const typing = inField(t0);

    if (k === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
    if (k === 'F1' && ctrl) { e.preventDefault(); bus.emit('toggle-ribbon'); return; }
    if (k === 'F5' || (ctrl && k.toLowerCase() === 'r' && !selInEditor())) { if (!selInEditor()) e.preventDefault(); }
    if (modalOpen() || isBackstageOpen()) return;

    if (ctrl && !e.altKey) {
      const low = k.toLowerCase();
      // global (work from anywhere, even inside a text field of the UI)
      if (!typing || ['n', 'o', 's', 'p', ','].includes(low)) {
        if (low === 'n' && !e.shiftKey) { e.preventDefault(); newDoc(''); return; }
        if (low === 'o') { e.preventDefault(); openDoc(); return; }
        if (low === 's') { e.preventDefault(); saveDoc(e.shiftKey); return; }
        if (low === 'p') { e.preventDefault(); printDoc(); return; }
        if (k === ',') { e.preventDefault(); D.openSettings(); return; }
      }
      if (typing) return;
      if (low === 'f') { e.preventDefault(); openFind(); return; }
      if (low === 'h') { e.preventDefault(); openFind({ replace: true }); return; }
      if (low === 'g') { e.preventDefault(); D.openGoto(); return; }
      if (k === '0') { e.preventDefault(); V.setZoom(100); return; }
      if (k === '+' || (k === '=' && !e.shiftKey && !selInEditor())) { e.preventDefault(); V.zoomBy(10); return; }
      if (k === '-' && !selInEditor()) { e.preventDefault(); V.zoomBy(-10); return; }
      if (!selInEditor() && document.activeElement !== editor) return;
      switch (low) {
        case 'z': e.preventDefault(); if (e.shiftKey) C.doRedo(); else C.doUndo(); return;
        case 'y': e.preventDefault(); C.doRedo(); return;
        case 'k': e.preventDefault(); D.openLinkDialog(); return;
        case 'l': e.preventDefault(); if (e.shiftKey) C.toggleList('ul'); else C.align('left'); return;
        case 'e': e.preventDefault(); C.align('center'); return;
        case 'r': e.preventDefault(); C.align('right'); return;
        case 'j': e.preventDefault(); C.align('justify'); return;
        case 'x':
          if (e.shiftKey) { e.preventDefault(); C.toggle('strikeThrough'); }
          return;
        case 'n': if (e.shiftKey) { e.preventDefault(); C.applyStyle('normal'); } return;
        case 'v': if (e.shiftKey) { e.preventDefault(); C.pasteFromClipboard(true); } return;
        case '8': if (e.shiftKey) { e.preventDefault(); V.toggleMarks(); } return;
        case 'enter': e.preventDefault(); C.insertPageBreak(); return;
        default: break;
      }
      if (k === '=' && !e.shiftKey) { e.preventDefault(); C.toggle('subscript'); return; }
      if (k === '+' || (k === '=' && e.shiftKey)) { e.preventDefault(); C.toggle('superscript'); return; }
      if (k === '>' || k === '.') { if (e.shiftKey) { e.preventDefault(); C.stepSize(1); } return; }
      if (k === '<' || k === ',') { if (e.shiftKey) { e.preventDefault(); C.stepSize(-1); } return; }
      return;
    }
    if (ctrl && e.altKey && /^[1-3]$/.test(k)) { e.preventDefault(); C.applyStyle('h' + k); return; }
    if (ctrl && e.altKey && /^Digit[1-3]$/.test(e.code)) { e.preventDefault(); C.applyStyle('h' + e.code.slice(5)); return; }

    if (k === 'F3' && findOpen()) { e.preventDefault(); findGo(e.shiftKey ? -1 : 1); return; }
    if (k === 'Escape') {
      if (popupOpen()) return;
      if (C.painterActive()) { C.cancelPainter(); return; }
      if (findOpen() && !typing) { closeFind(); return; }
    }

    // editor-only keys
    if (typing || !(document.activeElement === editor)) return;
    if (k === 'Tab') {
      e.preventDefault();
      const fe = anchorEl();
      const cell = TB.cellOf(fe);
      const st = C.queryState();
      if (st.list) { C.indent(e.shiftKey ? -1 : 1); return; }
      if (cell) { tableTab(cell, e.shiftKey); return; }
      if (e.shiftKey) { C.indent(-1); return; }
      const r = getRange();
      const b = r && closestBlock(r.startContainer);
      const atStart = r && r.collapsed && b && !(b.textContent.slice(0, offsetIn(b, r))).length && b.textContent.length;
      if (atStart) C.indent(1); else C.insertText('\t');
    }
  }, true);

  bus.on('toggle-ribbon', () => { import('./ribbon.js').then((m) => m.setCollapsed(!settings.ribbonCollapsed)); });
}

function offsetIn(block, r) {
  const pre = document.createRange();
  pre.selectNodeContents(block);
  pre.setEnd(r.startContainer, r.startOffset);
  return pre.toString().length;
}

function tableTab(cell, back) {
  const table = TB.tableOf(cell);
  const g = TB.gridOf(table);
  const cells = [];
  for (const row of g.rows) for (const c of row.cells) cells.push(c);
  const i = cells.indexOf(cell);
  let target = cells[i + (back ? -1 : 1)];
  if (!target && !back) {
    TB.addRow(cell, true);
    const rows = [...table.rows];
    target = rows[rows.length - 1] && rows[rows.length - 1].cells[0];
  }
  if (!target) return;
  const r = document.createRange();
  r.selectNodeContents(target);
  r.collapse(!back ? true : false);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

/* ------------------------------ auto-format as you type ------------------------------ */
const OPEN_BEFORE = /(^|[\s(\[{<—–\-])$/;
function textBeforeCaret() {
  const r = getRange();
  if (!r || !r.collapsed) return null;
  const n = r.startContainer;
  if (n.nodeType !== 3) return { node: null, text: '', off: r.startOffset, container: n };
  return { node: n, text: n.nodeValue.slice(0, r.startOffset), off: r.startOffset };
}
function replaceBefore(info, count, repl) {
  // replaces the `count` characters before the caret with `repl` inside the same text node
  const s = getSelection();
  const r = document.createRange();
  r.setStart(info.node, info.off - count);
  r.setEnd(info.node, info.off);
  s.removeAllRanges();
  s.addRange(r);
  document.execCommand('insertText', false, repl);
}

const AUTO = [
  [/\(c\)$/i, '©'], [/\(r\)$/i, '®'], [/\(tm\)$/i, '™'], [/\.\.\.$/, '…'], [/-->$/, '→'], [/<--$/, '←'], [/==>$/, '⇒'],
];

function listMarker(text) {
  if (/^([-*•])$/.test(text)) return ['ul', 'disc'];
  if (/^(\d{1,3})[.)]$/.test(text)) return ['ol', 'decimal'];
  if (/^([a-z])[.)]$/.test(text)) return ['ol', 'lower-alpha'];
  if (/^([A-Z])[.)]$/.test(text)) return ['ol', 'upper-alpha'];
  return null;
}

export function initAutoFormat() {
  editor.addEventListener('beforeinput', (e) => {
    if (!settings.autocorrect || e.isComposing || e.inputType !== 'insertText' || !e.data) return;
    const ch = e.data;
    const info = textBeforeCaret();
    if (!info) return;
    const block = closestBlock(getRange().startContainer);
    const inCode = block && block.dataset && block.dataset.st === 'code';
    if (inCode) return;
    if (ch === '"' || ch === "'") {
      e.preventDefault();
      const before = info.text;
      const opening = OPEN_BEFORE.test(before) || !before;
      const q = ch === '"' ? (opening ? '“' : '”') : (opening ? '‘' : '’');
      document.execCommand('insertText', false, q);
      return;
    }
    if (ch === ' ' && info.node) {
      // "1. " / "- " at the start of a plain paragraph starts a list
      if (block && block.tagName === 'P' && !closestListItem(block)) {
        const lead = textBeforeCaret();
        const txt = block.textContent.slice(0, offsetIn(block, getRange()));
        const m = listMarker(txt);
        if (m && txt === block.textContent.slice(0, txt.length) && lead.text === txt) {
          e.preventDefault();
          run(() => {
            const r = document.createRange();
            r.setStart(lead.node, 0);
            r.setEnd(lead.node, lead.off);
            r.deleteContents();
          });
          C.toggleList(m[0], m[1]);
          return;
        }
      }
      // "--" → en dash
      if (/(^|[^-])--$/.test(info.text)) { e.preventDefault(); replaceBefore(info, 2, '–'); document.execCommand('insertText', false, ' '); return; }
    }
    if (ch === ')' || ch === '.' || ch === '>' || ch === '-') {
      const probe = info.text + ch;
      for (const [re, repl] of AUTO) {
        const m = probe.match(re);
        if (m) {
          e.preventDefault();
          replaceBefore(info, m[0].length - 1, repl);
          return;
        }
      }
    }
  });
}
const closestListItem = (n) => (n.closest ? n.closest('li') : null);

/* ------------------------------ clipboard / drop ------------------------------ */
export function initClipboard() {
  editor.addEventListener('paste', (e) => {
    const cd = e.clipboardData;
    if (!cd) return;
    e.preventDefault();
    const files = [...(cd.files || [])].filter((f) => f.type.startsWith('image/'));
    const html = cd.getData('text/html');
    const text = cd.getData('text/plain');
    if (files.length && !html) { insertImages(files); return; }
    if (html && !shiftHeld) { C.pasteHtml(html); return; }
    if (text) { C.pasteText(text); return; }
    if (files.length) insertImages(files);
  });
  let shiftHeld = false;
  document.addEventListener('keydown', (e) => { shiftHeld = e.shiftKey; }, true);
  document.addEventListener('keyup', () => { shiftHeld = false; }, true);
  editor.addEventListener('copy', () => { /* native */ });
  bus.on('paste-image', (blob) => insertImages([blob]));

  $('#file-image').addEventListener('change', (e) => { insertImages([...e.target.files]); e.target.value = ''; });

  // dropping files
  const hint = $('#drop-hint');
  const show = (on) => { hint.hidden = !on; hint.classList.toggle('show', on); hint.textContent = t('drop.hint'); };
  const handlePath = async (path) => {
    const ext = extOf(path);
    if (['docx', 'html', 'htm', 'txt', 'md'].includes(ext)) {
      if (await confirmDiscard()) { try { await loadBytes(path, b64ToBytes(await invoke('read_file_b64', { path }))); } catch (err) { toast(t('toast.error', { msg: String(err) }), 6000); } }
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
      try {
        const bytes = b64ToBytes(await invoke('read_file_b64', { path }));
        const f = new File([bytes], baseName(path), { type: 'image/' + (ext === 'jpg' ? 'jpeg' : ext) });
        await insertImages([f]);
      } catch (err) { toast(t('toast.error', { msg: String(err) }), 6000); }
    } else toast(t('toast.unsupported'));
  };
  if (T && T.event) {
    T.event.listen('tauri://drag-enter', () => show(true));
    T.event.listen('tauri://drag-leave', () => show(false));
    T.event.listen('tauri://drag-drop', (ev) => { show(false); const p = ev.payload && ev.payload.paths; if (p && p.length) handlePath(p[0]); });
  } else {
    window.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); show(true); } });
    window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) show(false); });
    window.addEventListener('drop', async (e) => {
      show(false);
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      e.preventDefault();
      if (f.type.startsWith('image/')) { insertImages([f]); return; }
      if (['docx', 'html', 'htm', 'txt', 'md'].includes(extOf(f.name)) && (await confirmDiscard())) await loadBytes(f.name, new Uint8Array(await f.arrayBuffer()));
    });
  }
}

/* ------------------------------ context menu ------------------------------ */
export function initContextMenu() {
  workspace.addEventListener('contextmenu', (e) => {
    if (inField(e.target)) return;
    e.preventDefault();
    if (isBackstageOpen()) return;
    editor.focus({ preventScroll: true });
    // a right click outside the current selection moves the caret
    const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    const s = getSelection();
    if (range && editor.contains(range.startContainer) && (!s.rangeCount || s.isCollapsed || !s.getRangeAt(0).isPointInRange?.(range.startContainer, range.startOffset))) {
      s.removeAllRanges();
      s.addRange(range);
    }
    if (e.target.tagName === 'IMG' && editor.contains(e.target)) IM.selectImage(e.target);
    const st = C.queryState();
    const sel = st.hasSel && !st.collapsed;
    const items = [
      { label: t('rb.cut'), icon: 'cut', kbd: 'Ctrl+X', disabled: !sel, run: () => C.copySel(true) },
      { label: t('rb.copy'), icon: 'copy', kbd: 'Ctrl+C', disabled: !sel, run: () => C.copySel(false) },
      { label: t('rb.paste'), icon: 'paste', kbd: 'Ctrl+V', run: async () => { if (!(await C.pasteFromClipboard(false))) toast(t('toast.pasteHint')); } },
      { label: t('rb.pasteText'), icon: 'pastetext', kbd: 'Ctrl+Shift+V', run: async () => { if (!(await C.pasteFromClipboard(true))) toast(t('toast.pasteHint')); } },
      { sep: true },
      { label: t('ctx.font'), icon: 'textcolor', run: () => D.openFontDialog() },
      { label: t('ctx.paragraph'), icon: 'linesp', run: () => D.openParagraph() },
      { label: t('rb.link'), icon: 'link', kbd: 'Ctrl+K', run: () => D.openLinkDialog() },
    ];
    if (st.inLink) items.push({ label: t('link.open'), icon: 'right', run: () => { const a = C.currentLink(); if (a) openExternal(a.getAttribute('href')); } }, { label: t('link.remove'), icon: 'unlock', run: () => C.removeLink() });
    const cell = TB.cellOf(anchorEl());
    if (cell && TB.tableOf(cell)) {
      items.push({ sep: true }, { label: t('ctx.table'), icon: 'table', sub: [
        { label: t('tbl.rowAbove'), icon: 'rowabove', run: () => TB.addRow(cell, false) },
        { label: t('tbl.rowBelow'), icon: 'rowbelow', run: () => TB.addRow(cell, true) },
        { label: t('tbl.colLeft'), icon: 'colleft', run: () => TB.addCol(cell, false) },
        { label: t('tbl.colRight'), icon: 'colright', run: () => TB.addCol(cell, true) },
        { sep: true },
        { label: t('tbl.merge'), icon: 'merge', run: () => TB.mergeCells() },
        { label: t('tbl.split'), icon: 'split', run: () => D.openSplitCells(cell) },
        { sep: true },
        { label: t('tbl.delRow'), icon: 'delrow', run: () => TB.deleteRow(cell) },
        { label: t('tbl.delCol'), icon: 'delcol', run: () => TB.deleteCol(cell) },
        { label: t('tbl.delTable'), icon: 'trash', danger: true, run: () => TB.deleteTable(cell) },
      ] });
    }
    if (st.inImg) {
      items.push({ sep: true },
        { label: t('img.title'), icon: 'edit', run: () => D.openImageDialog() },
        { label: t('img.wrap'), icon: 'wrapinline', sub: [
          { label: t('wrap.inline'), icon: 'wrapinline', run: () => IM.setWrap('inline') },
          { label: t('wrap.left'), icon: 'wrapleft', run: () => IM.setWrap('left') },
          { label: t('wrap.right'), icon: 'wrapright', run: () => IM.setWrap('right') },
          { label: t('wrap.center'), icon: 'wrapcenter', run: () => IM.setWrap('center') },
        ] },
        { label: t('img.remove'), icon: 'trash', danger: true, run: () => IM.removeImage() });
    }
    openContextMenu(e.clientX, e.clientY, items);
  });
}

export function openExternal(url) {
  if (!url) return;
  if (T && invoke) { invoke('open_external', { url }).catch(() => {}); return; }
  window.open(url, '_blank', 'noopener');
}

/* ctrl+click opens links */
export function initLinks() {
  editor.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && editor.contains(a) && (isCtrl(e) || settings.view === 'read')) { e.preventDefault(); openExternal(a.getAttribute('href')); }
  });
  // plain click shows no navigation (webview would navigate away)
  editor.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (a) e.preventDefault(); });
}

void esc; void run; void exec; void flushSettle; void restoreSel; void openBackstage; void closePopup;
