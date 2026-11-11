// File input / output: open, save, export, recent files. Works inside Tauri and (for development) in a plain browser.
import { app, cur, newDoc, markClean, autoWidths, rebuildView, visCols, saveSettings, emit, type Doc } from './store';
import { detectDelimiter, detectEol, parseCSV, stringifyCSV, normalize } from './csv';
import { newTable } from './ops';
import { toast } from './overlay';
import { t } from './i18n';
import { baseName, stripExt, extOf } from './util';
import { inTauri, inv, pickOpen, pickSave } from './tauri';
import { confirmDialog, pickDialog } from '../components/Dialogs';

export { inTauri };
const TEXT_EXT = ['csv', 'tsv', 'txt', 'tab'], SHEET_EXT = ['xlsx', 'xlsm', 'xls', 'ods'];
export const ENCODINGS: [string, string][] = [
  ['UTF-8', 'UTF-8'], ['UTF-16LE', 'UTF-16 LE'], ['UTF-16BE', 'UTF-16 BE'], ['windows-1252', 'Western (Windows-1252)'],
  ['windows-1258', 'Vietnamese (Windows-1258)'], ['windows-1250', 'Central European (Windows-1250)'],
  ['windows-1251', 'Cyrillic (Windows-1251)'], ['GBK', 'Chinese (GBK)'], ['Shift_JIS', 'Japanese (Shift_JIS)'], ['EUC-KR', 'Korean (EUC-KR)'],
];
const KEEP_RAW_LIMIT = 24_000_000;
export const LARGE_ROWS = 200_000;

interface Opened { path: string; name: string; size: number; kind: 'text' | 'sheet'; text: string; data: string; encoding: string; bom: boolean; guessed: boolean }

/* ------------------------------- document building ------------------------------- */

/** Fills doc.head / doc.rows from delimited text using doc.delim and doc.hasHeader. */
export function parseInto(d: Doc, text: string) {
  const R = parseCSV(text, d.delim);
  const w = normalize(R);
  if (!R.length) { const n = newTable(0, 4); d.head = n.head; d.rows = []; d.widths = n.widths; return; }
  if (d.hasHeader) {
    d.head = R[0].map((h, i) => (h === '' ? t('colN', { n: i + 1 }) : h));
    d.rows = R.slice(1);
  } else {
    d.head = Array.from({ length: w }, (_, i) => t('colN', { n: i + 1 }));
    d.rows = R;
  }
  d.widths = autoWidths(d.head, d.rows);
}

export function docFromText(text: string, { name, path = null, size = 0, enc = 'UTF-8', bom = false }: { name: string; path?: string | null; size?: number; enc?: string; bom?: boolean }): Doc {
  text = text.replace(/^﻿/, '');
  const d = newDoc({ name, path, size, enc, bom });
  d.delim = /\.tsv$|\.tab$/i.test(name) ? '\t' : detectDelimiter(text);
  d.eol = detectEol(text);
  d.raw = text.length <= KEEP_RAW_LIMIT ? text : null;
  parseInto(d, text);
  rebuildView(d);
  return d;
}

export function blankDoc(): Doc {
  const n = newTable(30, 6);
  const d = newDoc({ name: t('untitled'), head: n.head, rows: n.rows, widths: n.widths, blank: true });
  d.eol = app.settings.newEol === 'lf' ? '\n' : '\r\n';
  d.bom = app.settings.newBom;
  rebuildView(d);
  return d;
}

export function sampleDoc(): Doc {
  const names = ['Nguyễn An', 'Trần Bình', 'Lê Chi', 'Phạm Dũng', 'Hoàng Em', 'Vũ Phong'];
  const cities = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Huế'];
  const dept = ['Engineering', 'Design', 'Sales', 'Support'];
  const rows: string[][] = [];
  for (let i = 1; i <= 240; i++) rows.push([String(i), names[i % 6], cities[i % 5], dept[i % 4], String(22 + ((i * 7) % 30)), String(10 + ((i * 13) % 50) + 0.5), i % 4 ? 'Active' : 'On leave']);
  const text = stringifyCSV([t('sHead1'), t('sHead2'), t('sHead3'), t('sHead4'), t('sHead5'), t('sHead6'), t('sHead7')], rows);
  return docFromText(text, { name: t('sampleName'), size: text.length, bom: true });
}

/* ------------------------------- opening ------------------------------- */

type XlsxLib = { read: (d: Uint8Array, o: object) => { SheetNames: string[]; Sheets: Record<string, unknown> }; utils: any; write: (wb: unknown, o: object) => ArrayBuffer };
let sheetLib: Promise<XlsxLib> | null = null;
function loadSheetLib(): Promise<XlsxLib> {
  const w = window as unknown as { XLSX?: XlsxLib };
  if (w.XLSX) return Promise.resolve(w.XLSX);
  sheetLib ||= new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = '/vendor/xlsx.mini.min.js';
    s.onload = () => ok(w.XLSX!); s.onerror = () => no(new Error('xlsx'));
    document.head.append(s);
  });
  return sheetLib;
}

async function docFromSheet(bytes: Uint8Array, name: string, size: number): Promise<Doc | null> {
  const X = await loadSheetLib();
  const wb = X.read(bytes, { type: 'array' });
  let idx = 0;
  if (wb.SheetNames.length > 1) { idx = await pickDialog({ title: t('chooseSheet'), items: wb.SheetNames }); if (idx < 0) return null; }
  const aoa: string[][] = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[idx]], { header: 1, raw: false, defval: '' })
    .map((r: unknown[]) => r.map(v => (v == null ? '' : String(v))));
  const text = stringifyCSV(aoa[0] || [], aoa.slice(1));
  const d = docFromText(aoa.length ? text : '', { name: stripExt(name) + '.csv', size, bom: true });
  d.imported = true; d.dirty = true; d.cleanId = -1;
  d.sourceName = name;
  return d;
}

/** Adds a document as a tab (reusing an untouched blank tab) and activates it. */
export function addDoc(d: Doc) {
  const a = app.doc;
  if (a && a.blank && !a.dirty && !a.undo.length && !a.path) app.docs[app.docs.indexOf(a)] = d;
  else app.docs.push(d);
  app.doc = d;
  if (d.rows.length >= LARGE_ROWS) toast(t('warn.large', { n: d.rows.length.toLocaleString() }), 'warning', 4500);
  emit();
}

export async function openPaths(paths: string[], encoding?: string) {
  for (const p of paths) {
    const dup = app.docs.find(x => x.path && x.path.toLowerCase() === p.toLowerCase());
    if (dup && !encoding) { app.doc = dup; emit(); continue; }
    try {
      const o = await inv<Opened>('open_file', { path: p, encoding: encoding || null });
      if (o.kind === 'sheet') {
        const bin = Uint8Array.from(atob(o.data), c => c.charCodeAt(0));
        const d = await docFromSheet(bin, o.name, o.size);
        if (d) { addDoc(d); pushRecent(p); }
      } else {
        addDoc(docFromText(o.text, { name: o.name, path: p, size: o.size, enc: o.encoding, bom: o.bom }));
        pushRecent(p);
        if (o.guessed && o.encoding !== 'UTF-8') toast(t('warn.enc', { enc: o.encoding }), 'warning', 5200);
      }
    } catch (e) {
      toast(t('openFailed') + ' ' + baseName(p), 'error');
    }
  }
}

export async function openFileObjects(files: File[]) {
  for (const f of files) {
    try {
      if (SHEET_EXT.includes(extOf(f.name))) {
        const d = await docFromSheet(new Uint8Array(await f.arrayBuffer()), f.name, f.size);
        if (d) addDoc(d);
      } else {
        const buf = await f.arrayBuffer();
        let text: string, enc = 'UTF-8';
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
        catch { text = new TextDecoder('windows-1252').decode(buf); enc = 'windows-1252'; }
        addDoc(docFromText(text, { name: f.name, size: f.size, enc, bom: false }));
      }
    } catch { toast(t('openFailed') + ' ' + f.name, 'error'); }
  }
}

const FILTERS = [
  { name: 'CSV / TSV / Excel', extensions: [...TEXT_EXT, ...SHEET_EXT] },
  { name: 'CSV', extensions: ['csv', 'txt'] }, { name: 'TSV', extensions: ['tsv', 'tab'] },
  { name: 'Excel', extensions: SHEET_EXT }, { name: '*', extensions: ['*'] },
];

export async function openDialogFiles() {
  if (inTauri) {
    const r = await pickOpen(FILTERS);
    if (r) await openPaths(Array.isArray(r) ? r : [r]);
  } else {
    (document.querySelector('#fileInput') as HTMLInputElement | null)?.click();
  }
}

/** Re-reads the active file with another encoding (only for untouched documents). */
export async function reopenWithEncoding(enc: string) {
  const d = cur();
  if (!d?.path || d.dirty) return false;
  try {
    const o = await inv<Opened>('open_file', { path: d.path, encoding: enc });
    const nd = docFromText(o.text, { name: o.name, path: d.path, size: o.size, enc: o.encoding, bom: o.bom });
    app.docs[app.docs.indexOf(d)] = nd;
    app.doc = nd; emit();
    return true;
  } catch { toast(t('openFailed'), 'error'); return false; }
}

/* ------------------------------- recent files ------------------------------- */

export function pushRecent(path: string) {
  const r = app.settings.recent.filter(p => p.toLowerCase() !== path.toLowerCase());
  r.unshift(path);
  app.settings.recent = r.slice(0, 8);
  saveSettings();
}

/* ------------------------------- saving ------------------------------- */

export function serialize(d: Doc, over: object = {}) {
  return stringifyCSV(d.head, d.rows, { delim: d.delim, eol: d.eol, quoteAll: app.settings.quoteAll, header: d.hasHeader, ...over });
}

function download(name: string, data: BlobPart, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function pickSavePath(defaultName: string, filters: { name: string; extensions: string[] }[]) {
  if (!inTauri) return defaultName;
  return pickSave(defaultName, filters);
}

const SAVE_FILTERS = [{ name: 'CSV', extensions: ['csv'] }, { name: 'TSV', extensions: ['tsv'] }, { name: 'Text', extensions: ['txt'] }];

async function writeText(path: string, text: string, enc: string, bom: boolean): Promise<boolean | { switchTo: string }> {
  try { await inv('write_text', { path, text, encoding: enc, bom }); return true; }
  catch (e) {
    if (String(e) === 'unmappable') {
      const r = await confirmDialog({
        title: t('encFailTitle'), body: t('encFailBody', { enc }), tone: 'warning',
        buttons: [{ id: 'utf8', label: t('saveUtf8'), icon: 'save', variant: 'primary' }, { id: 'cancel', label: t('cancel'), icon: 'x', variant: 'tonal' }],
      });
      if (r === 'utf8') return { switchTo: 'UTF-8' };
      return false;
    }
    toast(t('saveFailed'), 'error');
    return false;
  }
}

/** Saves a document. asNew forces the Save As dialog. Returns true when the file was written. */
export async function saveDoc(d: Doc | null, asNew = false): Promise<boolean> {
  if (!d) return false;
  let path = d.path;
  if (!path || asNew || d.imported) {
    const nm = d.imported || !d.path ? d.name.replace(/\.[^.]+$/, '') + (d.delim === '\t' ? '.tsv' : '.csv') : d.name;
    path = await pickSavePath(nm, SAVE_FILTERS);
    if (!path) return false;
    if (/\.tsv$/i.test(path) && d.delim === ',') d.delim = '\t';
  }
  const text = serialize(d);
  if (!inTauri) download(baseName(path), (d.bom ? '﻿' : '') + text, 'text/csv');
  else {
    let r = await writeText(path, text, d.enc, d.bom);
    if (r && typeof r === 'object') { d.enc = r.switchTo; r = await writeText(path, text, d.enc, d.bom); }
    if (!r) return false;
  }
  d.path = inTauri ? path : null;
  d.name = baseName(path);
  d.raw = text.length <= KEEP_RAW_LIMIT ? text : null; d.imported = false; d.blank = false;
  d.size = text.length;
  markClean(d);
  if (inTauri) pushRecent(path);
  toast(t('saved', { name: d.name }), 'success');
  emit();
  return true;
}

/* ------------------------------- exporting ------------------------------- */

export function viewData(d: Doc) {
  const cols = visCols(d);
  return { head: cols.map(c => d.head[c]), rows: d.view.map(i => cols.map(c => d.rows[i][c] ?? '')) };
}

const mdCell = (v: string) => String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const htmlEsc = (v: string) => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export const EXPORTS: Record<string, { ext: string; label: string; mime: string }> = {
  csv: { ext: 'csv', label: 'CSV (.csv)', mime: 'text/csv' },
  tsv: { ext: 'tsv', label: 'TSV (.tsv)', mime: 'text/tab-separated-values' },
  json: { ext: 'json', label: 'JSON (.json)', mime: 'application/json' },
  xlsx: { ext: 'xlsx', label: 'Excel (.xlsx)', mime: 'application/octet-stream' },
  md: { ext: 'md', label: 'Markdown (.md)', mime: 'text/markdown' },
  html: { ext: 'html', label: 'HTML table (.html)', mime: 'text/html' },
};

export async function exportAs(fmt: string) {
  const d = cur();
  if (!d) return;
  const { head, rows } = viewData(d), x = EXPORTS[fmt];
  const defName = stripExt(d.name) + '-export.' + x.ext;
  const opts = { quoteAll: app.settings.quoteAll };
  let data: string | Uint8Array;
  try {
    if (fmt === 'csv') data = (d.bom ? '﻿' : '') + stringifyCSV(head, rows, { ...opts, delim: ',', eol: d.eol });
    else if (fmt === 'tsv') data = stringifyCSV(head, rows, { delim: '\t', eol: d.eol });
    else if (fmt === 'json') data = JSON.stringify(rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]]))), null, 2);
    else if (fmt === 'md') {
      data = ['| ' + head.map(mdCell).join(' | ') + ' |', '| ' + head.map(() => '---').join(' | ') + ' |', ...rows.map(r => '| ' + r.map(mdCell).join(' | ') + ' |')].join('\n') + '\n';
    } else if (fmt === 'html') {
      data = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>${htmlEsc(d.name)}</title>\n<style>body{font-family:system-ui,sans-serif;margin:24px}table{border-collapse:collapse}th,td{border:1px solid #d1d1d1;padding:6px 12px;text-align:left}th{background:#f3f3f3}tr:nth-child(even) td{background:#fafafa}</style></head>\n<body><table>\n<thead><tr>${head.map(h => `<th>${htmlEsc(h)}</th>`).join('')}</tr></thead>\n<tbody>\n${rows.map(r => `<tr>${r.map(v => `<td>${htmlEsc(v)}</td>`).join('')}</tr>`).join('\n')}\n</tbody></table></body></html>\n`;
    } else {
      const X = await loadSheetLib();
      const wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([head, ...rows]), 'Sheet1');
      data = new Uint8Array(X.write(wb, { type: 'array', bookType: 'xlsx' }));
    }
  } catch { toast(t('exportFailed'), 'error'); return; }

  const path = await pickSavePath(defName, [{ name: x.label, extensions: [x.ext] }]);
  if (!path) return;
  try {
    if (!inTauri) download(baseName(path), data as BlobPart, x.mime);
    else if (typeof data === 'string') await inv('write_text', { path, text: data.replace(/^﻿/, ''), encoding: 'UTF-8', bom: fmt === 'csv' && d.bom });
    else {
      let b = ''; for (let i = 0; i < data.length; i += 8192) b += String.fromCharCode.apply(null, data.subarray(i, i + 8192) as unknown as number[]);
      await inv('write_bytes', { path, data: btoa(b) });
    }
    toast(t('exported', { n: rows.length }), 'success');
  } catch { toast(t('exportFailed'), 'error'); }
}

export async function reveal(d: Doc | null = cur()) {
  if (d?.path && inTauri) inv('reveal', { path: d.path });
}

export async function startupFiles(): Promise<string[]> {
  if (!inTauri) return [];
  try { return await inv<string[]>('startup_files'); } catch { return []; }
}
