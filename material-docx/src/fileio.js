// File operations: new / open / save / export / print, recent documents, draft recovery.
import { $, baseName, stripExt, extOf, b64ToBytes, esc } from './util.js';
import { doc, bus, applyMeta, pageDims, MARGIN_PRESETS } from './state.js';
import { settings, saveSettings } from './settings.js';
import { editor, setContent, cleanHtml, sanitizeHtml, historyReset, settle, markDirty } from './editor.js';
import { exportDocx, importDocx, bytesToB64 } from './docx.js';
import { t, lang } from './i18n.js';
import { toast, askConfirm } from './popup.js';
import { paginate, unpaginate, layout } from './paginate.js';
import { headingList } from './cmds.js';

const T = window.__TAURI__ || null;
export const inTauri = !!T;
const invoke = T ? T.core.invoke : null;
const nameInput = $('#doc-name');

export const docName = () => nameInput.value.trim() || t('doc.untitled');
export function setDocName(n) { nameInput.value = n || ''; doc.title = n || ''; updateTitle(); }

export function updateTitle() {
  const n = docName();
  document.title = `${doc.dirty ? '● ' : ''}${n} — Material Docx`;
  if (T) { try { T.window.getCurrentWindow().setTitle(document.title); } catch { /* ignore */ } }
  bus.emit('title');
}
bus.on('dirty', () => { updateTitle(); scheduleDraft(); });
bus.on('modified', () => scheduleDraft());

/* ------------------------------ recent ------------------------------ */
export function addRecent(path) {
  if (!path) return;
  const list = (settings.recent || []).filter((r) => r.path !== path);
  list.unshift({ path, name: baseName(path), time: Date.now() });
  settings.recent = list.slice(0, 12);
  saveSettings();
}
export async function pruneRecent() {
  if (!T || !settings.recent || !settings.recent.length) return;
  try {
    const ok = new Set(await invoke('existing_files', { paths: settings.recent.map((r) => r.path) }));
    settings.recent = settings.recent.filter((r) => ok.has(r.path));
    saveSettings();
  } catch { /* ignore */ }
}

/* ------------------------------ drafts ------------------------------ */
let draftTimer = 0;
function scheduleDraft() {
  if (!settings.autosave) return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(writeDraft, 2500);
}
async function writeDraft() {
  if (!doc.dirty) return;
  const data = JSON.stringify({ html: cleanHtml(), meta: { page: doc.page, header: doc.header, footer: doc.footer, diffFirst: doc.diffFirst }, name: nameInput.value, path: doc.path, time: Date.now() });
  try {
    if (T) await invoke('draft_write', { data });
    else localStorage.setItem('material-docx.draft.v2', data);
  } catch { /* ignore */ }
}
export async function clearDraft() {
  clearTimeout(draftTimer);
  try {
    if (T) await invoke('draft_clear');
    else localStorage.removeItem('material-docx.draft.v2');
  } catch { /* ignore */ }
}
export async function readDraft() {
  try {
    const raw = T ? await invoke('draft_read') : localStorage.getItem('material-docx.draft.v2');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
window.addEventListener('beforeunload', () => { if (doc.dirty && settings.autosave) { try { if (!T) localStorage.setItem('material-docx.draft.v2', JSON.stringify({ html: cleanHtml(), meta: { page: doc.page, header: doc.header, footer: doc.footer, diffFirst: doc.diffFirst }, name: nameInput.value, path: doc.path })); } catch { /* ignore */ } } });

/* ------------------------------ dialogs / IO ------------------------------ */
const filters = {
  open: () => [{ name: t('filter.docs'), extensions: ['docx', 'html', 'htm', 'txt', 'md'] }],
  save: () => [{ name: t('filter.docx'), extensions: ['docx'] }, { name: t('filter.html'), extensions: ['html'] }, { name: t('filter.txt'), extensions: ['txt'] }],
  one: (ext) => [{ name: { docx: t('filter.docx'), html: t('filter.html'), txt: t('filter.txt') }[ext], extensions: [ext] }],
};

async function pickOpen() {
  if (T) {
    const path = await T.dialog.open({ multiple: false, directory: false, title: t('dlg.open'), filters: filters.open() });
    if (!path) return null;
    return { path: String(path), bytes: b64ToBytes(await invoke('read_file_b64', { path: String(path) })) };
  }
  return new Promise((resolve) => {
    const inp = $('#file-open');
    inp.value = '';
    inp.onchange = async () => {
      const f = inp.files[0];
      resolve(f ? { path: f.name, bytes: new Uint8Array(await f.arrayBuffer()) } : null);
    };
    inp.click();
  });
}
async function writeBytes(path, bytes) {
  if (T) { await invoke('write_file_b64', { path, data: bytesToB64(bytes) }); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes]));
  a.download = baseName(path);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const errMsg = (e) => (e && e.message ? e.message : String(e));

/* ------------------------------ lifecycle ------------------------------ */
export function resetDocModel() {
  doc.page = { size: settings.size, orientation: settings.orientation, margins: { ...settings.margins }, headerDist: 48, footerDist: 48, color: '' };
  doc.header = { text: '', align: 'left' };
  doc.footer = { text: '', align: 'center' };
  doc.diffFirst = false;
}

export async function confirmDiscard() {
  if (!doc.dirty) return true;
  const r = await askConfirm({ title: t('confirm.title'), msg: t('confirm.msg', { name: docName() }), yes: t('confirm.save'), no: t('confirm.discard') });
  if (r === 'cancel') return false;
  if (r === 'yes') return saveDoc(false);
  await clearDraft();
  return true;
}

function afterLoad(path, name) {
  doc.path = path;
  doc.dirty = false;
  doc.created = Date.now();
  nameInput.value = name || '';
  doc.title = name || '';
  clearDraft();
  updateTitle();
  bus.emit('saved');
}

export async function newDoc(html = '', { force = false } = {}) {
  if (!force && !(await confirmDiscard())) return false;
  resetDocModel();
  setContent(html || '<p><br></p>');
  afterLoad(null, '');
  editor.focus();
  settle({ record: false });
  for (const d of editor.querySelectorAll('[data-toc]')) void d;
  bus.emit('toc-update');
  return true;
}

export async function loadBytes(path, bytes) {
  const ext = extOf(path);
  const dec = new TextDecoder();
  resetDocModel();
  let html;
  let meta = null;
  if (ext === 'docx') {
    const r = await importDocx(bytes);
    html = sanitizeHtml(r.html);
    meta = r.meta;
  } else if (ext === 'html' || ext === 'htm') {
    html = sanitizeHtml(dec.decode(bytes)) || '<p><br></p>';
  } else if (['txt', 'md', 'markdown', 'log', 'csv'].includes(ext)) {
    const lines = dec.decode(bytes).replace(/^﻿/, '').split(/\r?\n/);
    html = lines.map((l) => (l ? `<p>${esc(l)}</p>` : '<p><br></p>')).join('');
  } else { toast(t('toast.unsupported')); return false; }
  setContent(html, { meta });
  afterLoad(path, stripExt(baseName(path)));
  addRecent(path);
  settle({ record: false });
  toast(t('toast.opened', { name: baseName(path) }));
  return true;
}

export async function openDoc(pathArg) {
  if (!(await confirmDiscard())) return;
  try {
    const res = pathArg ? { path: pathArg, bytes: b64ToBytes(await invoke('read_file_b64', { path: pathArg })) } : await pickOpen();
    if (res) await loadBytes(res.path, res.bytes);
  } catch (err) { toast(t('toast.error', { msg: errMsg(err) }), 6000); }
}

/* ------------------------------ export / save ------------------------------ */
const EXPORT_CSS = `body{font-family:Calibri,Carlito,'Segoe UI',system-ui,sans-serif;font-size:11pt;line-height:1.15;max-width:820px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}
p{margin:0 0 8pt}h1,h2,h3{font-family:'Calibri Light',Calibri,Carlito,sans-serif;color:#2f5496;font-weight:400}h1{font-size:16pt;margin:12pt 0 0}h2{font-size:13pt;margin:8pt 0 0}h3{font-size:12pt;margin:6pt 0 0}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 8px;vertical-align:top}blockquote{margin:10pt 40px;font-style:italic;color:#404040}img{max-width:100%}
hr.pb{border:0;page-break-after:always}[data-st=title]{font-family:'Calibri Light',Calibri,sans-serif;font-size:28pt;margin:0}[data-st=subtitle]{color:#5a5a5a;letter-spacing:.75pt}`;

function buildBytes(ext) {
  if (ext === 'docx') { bus.emit('before-output'); const root = document.createElement('div'); root.innerHTML = cleanHtml(); paginate(); return exportDocx(root, { page: doc.page, header: doc.header, footer: doc.footer, diffFirst: doc.diffFirst, title: nameInput.value.trim(), author: settings.author || doc.author, font: settings.font, fontSize: settings.fontSize }); }
  if (ext === 'html' || ext === 'htm') {
    const html = `<!doctype html>\n<html lang="${lang()}"><head><meta charset="utf-8"><title>${esc(docName())}</title><style>${EXPORT_CSS}</style></head>\n<body>${cleanHtml()}</body></html>`;
    return Promise.resolve(new TextEncoder().encode(html));
  }
  unpaginate();
  const txt = editor.innerText.replace(/ /g, ' ');
  paginate();
  return Promise.resolve(new TextEncoder().encode(txt));
}

export async function saveDoc(forceAs = false, forceExt) {
  try {
    let path = doc.path;
    if (forceExt && path) path = path.replace(/\.[^.\\/]+$/, '') + '.' + forceExt;
    if (!path || forceAs) {
      const ext = forceExt || extOf(doc.path || '') || 'docx';
      const def = (stripExt(docName()) || 'Document') + '.' + (['docx', 'html', 'txt'].includes(ext) ? ext : 'docx');
      path = T ? await T.dialog.save({ defaultPath: def, title: t('dlg.save'), filters: forceExt ? filters.one(forceExt) : filters.save() }) : def;
      if (!path) return false;
      path = String(path);
      if (!extOf(path)) path += '.' + (forceExt || 'docx');
    }
    const ext = extOf(path);
    const bytes = await buildBytes(ext);
    await writeBytes(path, bytes);
    const asCopy = !!forceExt && ext !== 'docx' && ext !== extOf(doc.path || '');
    if (!asCopy) {
      doc.path = path;
      nameInput.value = stripExt(baseName(path));
      doc.title = nameInput.value;
      doc.dirty = false;
      clearDraft();
      addRecent(path);
      updateTitle();
      bus.emit('saved');
    }
    toast(t('toast.saved', { name: baseName(path) }));
    return true;
  } catch (err) {
    toast(t('toast.error', { msg: errMsg(err) }), 6000);
    return false;
  }
}

/* ------------------------------ print ------------------------------ */
const cssStr = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ') + '"';
function hfContent(h) {
  const parts = String(h.text || '').split(/(\{page\}|\{pages\}|\{date\}|\{title\})/);
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    if (p === '{page}') out.push('counter(page)');
    else if (p === '{pages}') out.push('counter(pages)');
    else if (p === '{date}') out.push(cssStr(new Date().toLocaleDateString(lang())));
    else if (p === '{title}') out.push(cssStr(docName()));
    else out.push(cssStr(p));
  }
  return out.join(' ') || 'none';
}
export function printCss() {
  const d = pageDims();
  const m = doc.page.margins;
  const box = (h, zone) => {
    const pos = { left: 'left', center: 'center', right: 'right' }[h.align] || 'left';
    return `@${zone}-${pos} { content: ${hfContent(h)}; font: 9pt Calibri, Carlito, system-ui, sans-serif; color: #444; }`;
  };
  const pageBg = doc.page.color ? `html, body { background: ${doc.page.color} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }` : '';
  return `@page { size: ${d.w}px ${d.h}px; margin: ${m.top}px ${m.right}px ${m.bottom}px ${m.left}px; ${box(doc.header, 'top')} ${box(doc.footer, 'bottom')} }
${doc.diffFirst ? '@page :first { @top-left{content:none} @top-center{content:none} @top-right{content:none} @bottom-left{content:none} @bottom-center{content:none} @bottom-right{content:none} }' : ''}
${pageBg}`;
}
export async function printDoc() {
  toast(t('toast.printHint'), 4200);
  unpaginate();
  $('#print-style').textContent = printCss();
  document.body.classList.add('printing');
  await new Promise((r) => setTimeout(r, 350));
  const done = () => {
    document.body.classList.remove('printing');
    $('#print-style').textContent = '';
    paginate();
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
  // some webviews never fire afterprint
  setTimeout(() => { if (document.body.classList.contains('printing')) done(); }, 60000);
}

export async function exitApp() {
  if (!(await confirmDiscard())) return;
  if (T) await T.window.getCurrentWindow().destroy();
  else window.close();
}
export { invoke, T, markDirty, historyReset, headingList, applyMeta, MARGIN_PRESETS, layout };
