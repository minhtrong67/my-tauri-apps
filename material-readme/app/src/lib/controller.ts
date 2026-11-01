// Document logic: tabs, saving, preview sync, find and replace, session restore. UI components only call into this module.
import { create } from 'zustand';
import type { EditorState, Text as CMText } from '@codemirror/state';
import { undoDepth, redoDepth } from '@codemirror/commands';
import { createEditor, type Ed, type Cmd } from './editor';
import { Preview, parseDoc, type Parsed, type Heading } from './markdown';
import { api, isTauri, DOC_RE, readBrowserFile, type RawDoc, type WinMode } from './tauri';
import { t, getLang } from './i18n';
import { getSettings, useSettings } from './settings';
import { changeSettings, currentScheme } from './appearance';
import { store } from './storage';
import { toast, confirmDialog, showOverlay } from './ui';
import { baseName, clamp, debounce, esc, resolvePath, samePath } from './utils';
import { sampleText } from './sample';
import { templateText, type TemplateId } from './templates';
import mdCss from '../styles/markdown.css?inline';
import { Save, Trash2, X } from 'lucide-react';

export type Mode = 'edit' | 'split' | 'preview';
export interface DocMeta { id: number; path: string; n: number; name: string; eol: 'lf' | 'crlf'; dirty: boolean }
export interface Recent { path: string; name: string }
interface Rt { state: EditorState; saved: CMText; savedEol: 'lf' | 'crlf'; mtime: number; size: number; eScroll: number; pScroll: number; extSeen: number; fresh: boolean }

interface App {
  docs: DocMeta[]; activeId: number | null; mode: Mode; modePref: Mode; nav: boolean;
  findOpen: boolean; findRep: boolean; findCount: string; findBad: boolean; findTarget: 'editor' | 'preview';
  words: number; chars: number; cursor: string; canUndo: boolean; canRedo: boolean;
  outline: Heading[]; activeHeading: number; recent: Recent[]; drag: boolean; maximized: boolean; winMode: WinMode; focus: boolean;
  scrolled: boolean; opening: boolean;
}
export const useApp = create<App>(() => ({
  docs: [], activeId: null, mode: 'split', modePref: store.get<Mode>('mode', 'split'), nav: store.get('nav', true),
  findOpen: false, findRep: false, findCount: '', findBad: false, findTarget: 'editor',
  words: 0, chars: 0, cursor: '', canUndo: false, canRedo: false,
  outline: [], activeHeading: -1, recent: store.get<Recent[]>('recent', []), drag: false, maximized: false, winMode: 'remember', focus: false,
  scrolled: false, opening: false,
}));
const set = useApp.setState, get = useApp.getState;

/* ----------------------------------------------------------- module state */
let ed: Ed, preview: Preview, mdEl: HTMLElement, docEl: HTMLElement;
const RT = new Map<number, Rt>();
let uid = 0, untitled = 0;
let driver: 'editor' | 'preview' = 'editor';
let parsed: Parsed | null = null, stale = true;
const F = { q: '', r: '', cs: false, re: false };
let hits: HTMLElement[] = [], hitCur = -1;

const active = () => get().docs.find((d) => d.id === get().activeId) || null;
const rt = (d: DocMeta) => RT.get(d.id)!;
const getText = (d: DocMeta) => (d.id === get().activeId ? ed.getState().doc : rt(d).state.doc);
const isDirty = (d: DocMeta) => !getText(d).eq(rt(d).saved) || d.eol !== rt(d).savedEol;
export const docName = (d: DocMeta) => (d.path ? baseName(d.path) : d.name || `${t('untitled')}-${d.n}.md`);
const toDisk = (d: DocMeta) => { const s = getText(d).toString(); return d.eol === 'crlf' ? s.replace(/\n/g, '\r\n') : s; };
const patch = (id: number, p: Partial<DocMeta>) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, ...p } : d)) }));
const refreshDirty = () => {
  const docs = get().docs.map((d) => { const dirty = isDirty(d); return dirty === d.dirty ? d : { ...d, dirty }; });
  if (docs.some((d, i) => d !== get().docs[i])) set({ docs });
  api.setDirty(docs.some((d) => d.dirty));
};

/* ===================================================================== docs */
function makeDoc(raw: Partial<RawDoc> = {}, name = ''): DocMeta {
  let text = raw.text || '';
  const eol = /\r\n/.test(text) ? 'crlf' : 'lf';
  text = text.replace(/\r\n?/g, '\n');
  const state = ed.makeState(text), path = raw.path || '';
  const d: DocMeta = { id: ++uid, path, n: path || name ? 0 : ++untitled, name, eol, dirty: false };
  RT.set(d.id, { state, saved: state.doc, savedEol: eol, mtime: raw.mtime || 0, size: raw.size || text.length, eScroll: 0, pScroll: 0, extSeen: 0, fresh: true });
  return d;
}
function remember(d: DocMeta) {
  if (!d.path) return;
  const list = get().recent.filter((r) => !samePath(r.path, d.path));
  list.unshift({ path: d.path, name: baseName(d.path) });
  const next = list.slice(0, 8);
  store.set('recent', next); set({ recent: next });
}
function stash(d: DocMeta) {
  const r = RT.get(d.id); if (!r) return;
  r.state = ed.getState(); r.eScroll = ed.view.scrollDOM.scrollTop; r.pScroll = docEl.scrollTop;
}

export async function openDocs(list: RawDoc[], { silent = false } = {}) {
  let first: DocMeta | null = null;
  for (const raw of list) {
    let d = get().docs.find((x) => samePath(x.path, raw.path));
    if (d) {
      if (!d.dirty && raw.mtime && raw.mtime !== rt(d).mtime) reloadFrom(d, raw);
      first = first || d; continue;
    }
    const docs = get().docs;
    const lone = docs.length === 1 && !docs[0].path && !docs[0].dirty && getText(docs[0]).length === 0 ? docs[0] : null;
    d = makeDoc(raw);
    if (lone) { RT.delete(lone.id); set({ docs: [d], activeId: null }); } else set({ docs: [...docs, d] });
    remember(d);
    if (raw.lossy) toast.warning(t('lossy', { n: baseName(raw.path) }), { ms: 5000 });
    first = first || d;
  }
  if (first) activate(first.id);
  else if (!silent) toast.error(t('read_fail'));
}

export function activate(id: number) {
  const d = get().docs.find((x) => x.id === id); if (!d) return;
  const fresh = rt(d).fresh;
  if (get().activeId === id && !fresh) return;
  const prev = active();
  if (prev && prev.id !== id && RT.has(prev.id)) stash(prev);
  set({ activeId: id, findCount: '' });
  ed.setState(rt(d).state);
  rt(d).state = ed.getState();
  stale = true; parsed = null; preview.clear();
  if (fresh) { mdEl.classList.remove('still'); void mdEl.offsetWidth; }
  refresh(true);
  ed.view.scrollDOM.scrollTop = rt(d).eScroll;
  requestAnimationFrame(() => { docEl.scrollTop = rt(d).pScroll; updateToc(); });
  if (fresh) { rt(d).fresh = false; setTimeout(() => mdEl.classList.add('still'), 700); }
  updateChrome(); updateCursor();
  if (get().findOpen) runFind(true);
  if (get().mode !== 'preview') ed.focus();
  saveSession();
}

function showEmpty() {
  set({ activeId: null, outline: [], activeHeading: -1, words: 0, chars: 0, cursor: '' });
  parsed = null; preview.clear(); updateChrome();
}

export function newDoc(text = '', name = '') {
  const d = makeDoc({ text }, name);
  set({ docs: [...get().docs, d] });
  activate(d.id);
  if (text) { rt(d).savedEol = d.eol; }
  return d;
}
export function newFromTemplate(id: TemplateId) {
  const text = templateText(id, getLang());
  const d = newDoc('');
  if (text) { ed.insert(text); ed.view.dispatch({ selection: { anchor: 0 } }); }
  return d;
}
export function openSample() {
  const d = makeDoc({ text: sampleText(getLang()) }, 'sample.md');
  set({ docs: [...get().docs, d] });
  activate(d.id);
}

export async function closeDoc(id: number, { force = false } = {}): Promise<boolean> {
  const d = get().docs.find((x) => x.id === id); if (!d) return true;
  if (!force && isDirty(d)) {
    activate(d.id);
    const r = await confirmDialog({
      title: t('save_q_title'), body: t('save_q', { n: docName(d) }), icon: Save, kind: 'primary',
      actions: [{ id: 'cancel', label: t('cancel'), icon: X, tone: 'tonal' }, { id: 'no', label: t('dont_save'), icon: Trash2, tone: 'error' }, { id: 'yes', label: t('save'), icon: Save, tone: 'filled' }],
    });
    if (r === 'cancel') return false;
    if (r === 'yes' && !(await save(d.id))) return false;
  }
  const docs = get().docs, i = docs.findIndex((x) => x.id === id);
  const wasActive = get().activeId === id;
  const rest = docs.filter((x) => x.id !== id);
  RT.delete(id);
  set({ docs: rest });
  if (wasActive) {
    set({ activeId: null });
    const next = rest[Math.min(i, rest.length - 1)];
    if (next) activate(next.id); else showEmpty();
  }
  refreshDirty(); saveSession();
  return true;
}

function reloadFrom(d: DocMeta, raw: RawDoc) {
  const text = raw.text.replace(/\r\n?/g, '\n'), r = rt(d), wasActive = d.id === get().activeId;
  const es = ed.view.scrollDOM.scrollTop, ps = docEl.scrollTop, eol = /\r\n/.test(raw.text) ? 'crlf' : 'lf';
  r.state = ed.makeState(text); r.saved = r.state.doc; r.savedEol = eol; r.mtime = raw.mtime; r.size = raw.size; r.extSeen = 0;
  patch(d.id, { eol, dirty: false });
  if (wasActive) {
    ed.setState(r.state); r.state = ed.getState(); stale = true; refresh(true);
    ed.view.scrollDOM.scrollTop = es; requestAnimationFrame(() => { docEl.scrollTop = ps; });
    updateChrome(); updateCursor(); if (get().findOpen) runFind(true);
  }
  refreshDirty();
}

/* ===================================================================== save */
function download(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export async function save(id = get().activeId, as = false): Promise<boolean> {
  const d = get().docs.find((x) => x.id === id); if (!d) return false;
  let path = d.path;
  const r = rt(d);
  if (!path || as) {
    if (!isTauri) { download(docName(d), toDisk(d), 'text/markdown'); r.saved = getText(d); r.savedEol = d.eol; refreshDirty(); return true; }
    path = (await api.pickSave(d.path ? baseName(d.path) : docName(d), getSettings().saveDir)) || '';
    if (!path) return false;
    if (!/\.[A-Za-z0-9]+$/.test(baseName(path))) path += '.md';
  }
  const text = toDisk(d), snap = getText(d), eol = d.eol;
  try {
    const res = await api.writeDoc(path, text);
    const renamed = d.path !== path;
    r.mtime = res.mtime; r.size = res.size; r.saved = snap; r.savedEol = eol; r.extSeen = 0;
    patch(d.id, { path });
    if (renamed) remember({ ...d, path });
    refreshDirty(); updateChrome(); saveSession();
    return true;
  } catch { toast.error(t('save_fail')); return false; }
}
const autosave = debounce(() => { const d = active(); if (getSettings().autosave && d && d.path && isDirty(d)) save(d.id); }, 1500);

/* =================================================================== change */
function onChange() {
  const d = active(); if (!d) return;
  rt(d).state = ed.getState();
  const dirty = isDirty(d);
  if (dirty !== d.dirty) { patch(d.id, { dirty }); api.setDirty(get().docs.some((x) => (x.id === d.id ? dirty : x.dirty))); updateChrome(); }
  const wait = clamp(80 + ed.getState().doc.length / 1200, 80, 700);
  clearTimeout((onChange as unknown as { t?: number }).t); (onChange as unknown as { t?: number }).t = window.setTimeout(() => refresh(), wait);
  if (getSettings().autosave) autosave();
  saveSessionSoon();
}
const wantsParse = () => get().mode !== 'edit' || get().nav;
function refresh(immediate = false) {
  const d = active();
  if (!d) { set({ outline: [] }); return; }
  const text = ed.text();
  updateStats(text);
  if (!wantsParse() && !immediate) { stale = true; return; }
  parsed = parseDoc(text);
  set({ outline: parsed.outline });
  if (get().mode !== 'edit') { preview.render(parsed, d.path); stale = false; if (get().findOpen && get().findTarget === 'preview') runFind(false); } else stale = true;
  updateToc();
}
function updateStats(text: string) {
  const w = (text.match(/\S+/g) || []).length;
  set({ words: w, chars: text.length });
}
function updateCursor() {
  const d = active(); if (!d) { set({ cursor: '', canUndo: false, canRedo: false }); return; }
  const st = ed.getState(), m = st.selection.main, ln = st.doc.lineAt(m.head);
  const sel = st.selection.ranges.reduce((a, r) => a + (r.to - r.from), 0);
  set({ cursor: `${t('ln')} ${ln.number}, ${t('col')} ${m.head - ln.from + 1}` + (sel ? ` (${sel.toLocaleString()} ${t('selected')})` : ''), canUndo: undoDepth(st) > 0, canRedo: redoDepth(st) > 0 });
}
function updateChrome() {
  const d = active(), dirty = !!d && d.dirty;
  const title = d ? `${dirty ? '● ' : ''}${docName(d)} — Material Readme` : 'Material Readme';
  document.title = title; api.setTitle(title);
}
export const relocalize = () => { updateChrome(); updateCursor(); };

/* =================================================================== outline */
const currentLine = () => (get().mode === 'preview' ? preview.lineForY(docEl.scrollTop + 90) : ed.topLine() + 0.01);
let tocRaf = 0;
function updateToc() {
  cancelAnimationFrame(tocRaf);
  tocRaf = requestAnimationFrame(() => {
    const o = parsed ? parsed.outline : [];
    if (!o.length || !get().nav) return;
    const line = currentLine(); let a = -1;
    o.forEach((x, i) => { if (x.line <= line + 0.5) a = i; });
    if (a !== get().activeHeading) set({ activeHeading: a });
    const sc = get().mode === 'preview' ? docEl.scrollTop : ed.view.scrollDOM.scrollTop;
    const sc2 = sc > 480;
    if (sc2 !== get().scrolled) set({ scrolled: sc2 });
  });
}
export function gotoHeading(i: number) {
  const h = parsed?.outline[i]; if (!h) return;
  const mode = get().mode;
  if (mode === 'preview') { const el = preview.elForLine(h.line); if (el) docEl.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' }); }
  else {
    driver = 'editor'; ed.goToLine(h.line);
    if (mode === 'split') docEl.scrollTo({ top: Math.max(0, preview.yForLine(h.line) - 12), behavior: 'smooth' });
    ed.focus();
  }
  if (innerWidth <= 860) setNav(false, false);
}
export function setNav(on: boolean, persist = true) {
  set({ nav: on }); if (persist) store.set('nav', on);
  if (on && stale) refresh(true);
}
export function scrollTop() {
  if (get().mode === 'preview') docEl.scrollTo({ top: 0, behavior: 'smooth' });
  else { ed.view.scrollDOM.scrollTo({ top: 0, behavior: 'smooth' }); if (get().mode === 'split') docEl.scrollTo({ top: 0, behavior: 'smooth' }); }
}

/* ================================================================ scroll sync */
let syncRaf = 0;
function onEditorScroll() {
  updateToc();
  if (get().mode !== 'split' || !getSettings().syncScroll || driver !== 'editor') return;
  cancelAnimationFrame(syncRaf);
  syncRaf = requestAnimationFrame(() => { docEl.scrollTop = preview.yForLine(ed.topLine()); });
}
function onPreviewScroll() {
  updateToc();
  if (get().mode !== 'split' || !getSettings().syncScroll || driver !== 'preview') return;
  cancelAnimationFrame(syncRaf);
  syncRaf = requestAnimationFrame(() => ed.scrollToLineFrac(preview.lineForY(docEl.scrollTop)));
}

/* ====================================================================== mode */
export function setMode(m: Mode, persist = true) {
  if (persist) { set({ modePref: m }); store.set('mode', m); }
  const eff: Mode = innerWidth <= 700 && m === 'split' ? 'edit' : m;
  const was = get().mode;
  set({ mode: eff });
  if (active() && was !== eff) {
    if (eff !== 'edit' && (stale || !parsed)) refresh(true);
    requestAnimationFrame(() => {
      if (eff === 'preview' && was !== 'preview') docEl.scrollTop = preview.yForLine(ed.topLine());
      if (eff === 'edit' && was === 'preview') ed.scrollToLineFrac(preview.lineForY(docEl.scrollTop));
      if (eff === 'split') docEl.scrollTop = preview.yForLine(ed.topLine());
      updateToc();
    });
    if (eff !== 'preview') setTimeout(() => ed.focus(), 120);
    if (get().findOpen) runFind(true);
  }
}
export function toggleFocus() { set({ focus: !get().focus }); }

/* ================================================================ find / replace */
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function clearMarks() { mdEl.querySelectorAll('mark.hit').forEach((m) => m.replaceWith(document.createTextNode(m.textContent || ''))); mdEl.normalize(); hits = []; hitCur = -1; }
const setCount = (txt: string, bad = false) => set({ findCount: txt, findBad: bad });
export function runFind(moveSel = true) {
  if (!get().findOpen) return;
  const target = get().mode === 'preview' ? 'preview' : 'editor';
  set({ findTarget: target });
  const q = F.q;
  if (target === 'editor') {
    clearMarks();
    if (!q) { ed.clearQuery(); setCount(''); return; }
    const ok = ed.setQuery({ search: q, caseSensitive: F.cs, regexp: F.re, replace: F.r });
    if (!ok) { setCount(t('bad_regex'), true); return; }
    if (moveSel) ed.next();
    updateCount();
  } else {
    ed.clearQuery(); clearMarks();
    if (!q || !active()) { setCount(''); return; }
    let re: RegExp; try { re = new RegExp(F.re ? q : escRe(q), F.cs ? 'g' : 'gi'); } catch { setCount(t('bad_regex'), true); return; }
    const walker = document.createTreeWalker(mdEl, NodeFilter.SHOW_TEXT, { acceptNode: (n) => ((n.parentElement as HTMLElement).closest('.ch') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes: Text[] = []; let n: Node | null; while ((n = walker.nextNode())) nodes.push(n as unknown as Text);
    for (const node of nodes) {
      const s = node.nodeValue || ''; re.lastIndex = 0; let m: RegExpExecArray | null, last = 0, frag: DocumentFragment | null = null;
      while ((m = re.exec(s))) {
        if (!m[0]) { re.lastIndex++; continue; }
        frag = frag || document.createDocumentFragment(); frag.append(s.slice(last, m.index));
        const k = document.createElement('mark'); k.className = 'hit'; k.textContent = m[0]; frag.append(k); last = m.index + m[0].length;
      }
      if (frag) { frag.append(s.slice(last)); (node as unknown as ChildNode).replaceWith(frag); }
    }
    hits = [...mdEl.querySelectorAll<HTMLElement>('mark.hit')];
    gotoHit(moveSel ? 0 : Math.max(0, hitCur));
  }
}
function gotoHit(i: number) {
  if (!hits.length) { setCount(F.q ? t('no_match') : '', !!F.q); return; }
  hits[hitCur]?.classList.remove('cur'); hitCur = (i + hits.length) % hits.length;
  hits[hitCur].classList.add('cur'); hits[hitCur].scrollIntoView({ block: 'center', behavior: 'smooth' });
  setCount(`${hitCur + 1}/${hits.length}`);
}
function updateCount() {
  const c = ed.count();
  if (!c.valid) { setCount(t('bad_regex'), true); return; }
  setCount(c.total ? `${c.current || '–'}/${c.total}` : F.q ? t('no_match') : '', !c.total && !!F.q);
}
export const findState = F;
export function openFind(rep = false): string {
  if (!active()) return '';
  set({ findOpen: true, findRep: rep || get().findRep });
  const st = ed.getState(), m = st.selection.main;
  const sel = get().mode !== 'preview' ? st.sliceDoc(m.from, m.to) : (getSelection()?.toString() || '');
  if (sel && !sel.includes('\n') && sel.length < 120) F.q = sel;
  runFind(!!F.q && !!sel);
  return F.q;
}
export function closeFind() {
  if (!get().findOpen) return;
  set({ findOpen: false }); ed.clearQuery(); clearMarks(); setCount('');
  if (get().mode !== 'preview') ed.focus();
}
export function setFind(p: Partial<typeof F>) { Object.assign(F, p); if ('r' in p && !('q' in p) && get().findTarget === 'editor' && F.q) ed.setQuery({ search: F.q, caseSensitive: F.cs, regexp: F.re, replace: F.r }); else runFind(true); }
export function findStep(dir: 1 | -1) { if (get().findTarget === 'editor') { dir > 0 ? ed.next() : ed.prev(); updateCount(); } else gotoHit(hitCur + dir); }
export function replaceOne() { ed.replaceOne(); updateCount(); }
export function replaceAllMatches() { const n = ed.count().total; ed.replaceAll(); updateCount(); if (n) toast.success(t('replaced', { n })); }
export function toggleFindRep() { set({ findRep: !get().findRep }); }

export function toggleEol() {
  const d = active(); if (!d) return;
  patch(d.id, { eol: d.eol === 'lf' ? 'crlf' : 'lf' }); refreshDirty(); saveSessionSoon();
}

/* ==================================================================== zoom */
export function setZoom(z: number) { useSettings.getState().set({ zoom: clamp(Math.round(z / 10) * 10, 60, 220) }); requestAnimationFrame(() => ed.view.requestMeasure()); }
export const zoomBy = (d: number) => setZoom(getSettings().zoom + d);

/* ========================================================== editor commands */
export const runCmd = (cmd: Cmd, arg?: number) => { if (active()) ed.run(cmd, arg); };
export function insertText(text: string) { if (active()) ed.insertAtCursor(text); }
export function insertToc() {
  if (!parsed || !parsed.outline.length) return;
  const min = Math.min(...parsed.outline.map((h) => h.level));
  const md = parsed.outline.map((h) => `${'  '.repeat(h.level - min)}- [${h.text}](#${h.slug})`).join('\n') + '\n\n';
  const ln = ed.getState().doc.lineAt(ed.getState().selection.main.from);
  ed.view.dispatch({ changes: { from: ln.from, insert: md }, selection: { anchor: ln.from + md.length } }); ed.focus();
}
export const hasDoc = () => !!active();
export const activeDoc = active;
export const activePath = () => active()?.path || '';
export function undoRedo(kind: 'undo' | 'redo') { ed.run(kind); }

/* ==================================================================== images */
const readB64 = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
function pasteImages(files: File[]): boolean {
  const d = active(); if (!d) return false;
  if (!isTauri) return false;
  if (!d.path) { toast.warning(t('img_need_save')); return true; }
  (async () => {
    try {
      const parts: string[] = [];
      for (const f of files) {
        const ext = (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '') || 'png';
        const base = f.name && f.name !== 'image.png' ? f.name : `image-${Date.now()}.${ext}`;
        const rel = await api.saveImage(d.path, base, await readB64(f));
        parts.push(`![${baseName(rel).replace(/\.\w+$/, '')}](${rel})`);
      }
      ed.insertAtCursor(parts.join('\n\n'));
    } catch { toast.error(t('img_fail')); }
  })();
  return true;
}

/* ===================================================================== export */
export async function exportHtml() {
  const d = active(); if (!d) return;
  refresh(true); if (get().mode === 'edit') preview.render(parsed!, d.path);
  await new Promise((r) => setTimeout(r, 250));
  const clone = mdEl.cloneNode(true) as HTMLElement; clone.classList.add('still');
  clone.querySelectorAll('.cp').forEach((b) => b.remove()); clone.querySelectorAll('mark.hit').forEach((m) => m.replaceWith(m.textContent || ''));
  const s = currentScheme(false);
  const vars = Object.entries(s).map(([k, v]) => `--md-${k}:${v}`).join(';');
  const name = docName(d).replace(/\.\w+$/, '');
  const html = `<!doctype html><html lang="${getLang()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title><style>:root{${vars};--z:1;--mono:ui-monospace,'Cascadia Code',Consolas,monospace}body{margin:0;padding:24px;background:var(--md-surface);color:var(--md-on-surface);font:400 16px/1.6 system-ui,'Segoe UI',sans-serif}.md{max-width:820px;margin:0 auto}${mdCss}.md,.md .blk{animation:none!important}</style></head><body>${clone.outerHTML}</body></html>`;
  if (!isTauri) { download(name + '.html', html, 'text/html'); return; }
  const path = await api.pickSave(name + '.html', getSettings().saveDir, [{ name: 'HTML', extensions: ['html'] }]);
  if (!path) return;
  try { await api.writeDoc(path, html); toast.success(t('exported'), { action: { label: t('show'), run: () => api.reveal(path) } }); } catch { toast.error(t('save_fail')); }
}
export function printDoc() {
  const d = active(); if (!d) return;
  refresh(true); if (get().mode === 'edit') preview.render(parsed!, d.path);
  setTimeout(() => window.print(), 300);
}

/* ============================================================ file operations */
export async function pickAndOpen() {
  try { const docs = await api.pickDocs(getSettings().saveDir); if (docs.length) openDocs(docs); } catch { toast.error(t('read_fail')); }
}
export async function openRecent(r: Recent) {
  try { openDocs([await api.readDoc(r.path)]); } catch {
    toast.error(t('read_fail'));
    const next = get().recent.filter((x) => x.path !== r.path); store.set('recent', next); set({ recent: next });
  }
}
export function clearRecent() { store.set('recent', []); set({ recent: [] }); }
export async function openLinked(href: string) {
  const d = active();
  if (d && d.path) { try { openDocs([await api.readDoc(resolvePath(d.path, href.split('#')[0]))]); } catch { toast.error(t('read_fail')); } }
}
async function checkExternal() {
  const d = active(); if (!d || !d.path || !isTauri || document.hidden) return;
  const r = rt(d);
  try {
    const m = await api.mtime(d.path);
    if (!m || m === r.mtime || m === r.extSeen) return;
    if (!d.dirty) { reloadFrom(d, await api.readDoc(d.path)); toast.info(t('reloaded')); }
    else { r.extSeen = m; toast.warning(t('ext_changed'), { action: { label: t('reload'), run: async () => { try { reloadFrom(d, await api.readDoc(d.path)); } catch { toast.error(t('read_fail')); } } }, ms: 10000 }); }
  } catch { /* file may be gone */ }
}
export async function requestClose() {
  for (const d of [...get().docs]) { if (isDirty(d)) { const ok = await closeDoc(d.id); if (!ok) return; } }
  saveSession(true);
  api.forceClose().catch(() => {});
}

/* ================================================================= session */
interface SessionDoc { path: string; name: string; eol: 'lf' | 'crlf'; text?: string }
function saveSession(final = false) {
  if (!getSettings().restore) { store.del('session'); return; }
  let budget = 3_000_000;
  const docs: SessionDoc[] = get().docs.map((d) => {
    const needText = !d.path || isDirty(d), text = needText ? getText(d).toString() : undefined;
    if (text) { budget -= text.length; }
    return { path: d.path, name: d.name, eol: d.eol, text: text && budget >= 0 ? text : undefined };
  }).filter((x) => x.path || x.text);
  const idx = get().docs.findIndex((d) => d.id === get().activeId);
  store.set('session', { docs, active: Math.max(0, idx) });
  void final;
}
const saveSessionSoon = debounce(() => saveSession(), 900);
async function restoreSession(): Promise<boolean> {
  const s = store.get<{ docs: SessionDoc[]; active: number } | null>('session', null);
  if (!s || !s.docs.length) return false;
  const made: DocMeta[] = [];
  for (const sd of s.docs) {
    try {
      let d: DocMeta;
      if (sd.path) {
        if (!isTauri) continue;
        const raw = await api.readDoc(sd.path);
        d = makeDoc(raw);
        if (sd.text !== undefined) {
          const r = rt(d); r.state = ed.makeState(sd.text.replace(/\r\n?/g, '\n')); d.eol = sd.eol;
        }
      } else {
        d = makeDoc({ text: sd.text || '' }, sd.name); d.eol = sd.eol;
        rt(d).saved = ed.makeState('').doc;
      }
      made.push(d);
    } catch { /* file is gone */ }
  }
  if (!made.length) return false;
  set({ docs: made });
  made.forEach((d) => { d.dirty = isDirty({ ...d, id: d.id } as DocMeta); });
  set({ docs: [...made] });
  activate(made[Math.min(s.active, made.length - 1)].id);
  refreshDirty();
  return true;
}

/* ===================================================================== init */
export function mountEditor(el: HTMLElement) {
  const s = getSettings();
  ed = createEditor(el, {
    change: () => onChange(), cursor: () => updateCursor(), scroll: () => onEditorScroll(),
    wheel: () => { driver = 'editor'; }, key: () => { driver = 'editor'; }, focus: () => { driver = 'editor'; },
    paste: (files) => pasteImages(files),
  }, { wrap: s.wrap, lineNumbers: s.lineNumbers });
  return ed;
}
export function mountPreview(md: HTMLElement, doc: HTMLElement) {
  mdEl = md; docEl = doc; preview = new Preview(md, doc);
  doc.addEventListener('scroll', onPreviewScroll, { passive: true });
  doc.addEventListener('wheel', () => { driver = 'preview'; }, { passive: true });
  doc.addEventListener('pointerenter', () => { driver = 'preview'; });
  return preview;
}
export const editorPointerEnter = () => { driver = 'editor'; };
export const getPreviewEl = () => ({ md: mdEl, doc: docEl });

export function applyEditorOptions() {
  const s = getSettings();
  if (!ed) return;
  ed.opts.wrap = s.wrap; ed.opts.lineNumbers = s.lineNumbers; ed.applyOptions();
}

export async function boot() {
  setMode(get().modePref, false);
  if (innerWidth <= 860) set({ nav: false });
  set({ winMode: await api.getWinMode().catch(() => 'remember' as WinMode) });
  const W = api.win();
  if (W) {
    const sync = () => W.isMaximized().then((m) => set({ maximized: m })).catch(() => {});
    sync(); W.onResized(sync);
  }
  let docs: RawDoc[] = [];
  try { docs = await api.startupDocs(); } catch { /* ignore */ }
  if (docs.length) await openDocs(docs);
  else if (getSettings().restore && (await restoreSession())) toast.info(t('restored'), { ms: 2200 });
  else if (!isTauri && new URLSearchParams(location.search).has('demo')) openSample();
  await api.listenRaw('open-docs', (e) => openDocs((e.payload as RawDoc[]) || []));
  await api.listenRaw('close-requested', () => { requestClose(); });
  if (isTauri) {
    api.listenRaw('tauri://drag-enter', () => set({ drag: true }));
    api.listenRaw('tauri://drag-leave', () => set({ drag: false }));
    api.listenRaw('tauri://drag-drop', async (e) => {
      set({ drag: false });
      const paths = ((e.payload as { paths?: string[] })?.paths || []).filter((p) => DOC_RE.test(p));
      const list = (await Promise.all(paths.map((p) => api.readDoc(p).catch(() => null)))).filter(Boolean) as RawDoc[];
      if (list.length) openDocs(list); else toast.warning(t('drop_bad'));
    });
  } else {
    document.addEventListener('dragover', (e) => { e.preventDefault(); set({ drag: true }); });
    document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) set({ drag: false }); });
    document.addEventListener('drop', async (e) => {
      e.preventDefault(); set({ drag: false });
      const files = [...(e.dataTransfer?.files || [])].filter((f) => DOC_RE.test(f.name));
      if (files.length) openDocs(await Promise.all(files.map(readBrowserFile))); else toast.warning(t('drop_bad'));
    });
    addEventListener('beforeunload', (e) => { if (get().docs.some((d) => d.dirty)) { e.preventDefault(); e.returnValue = ''; } });
  }
  setInterval(checkExternal, 2000);
  addEventListener('focus', checkExternal);
  addEventListener('resize', () => {
    const { modePref, mode } = get();
    const want: Mode = modePref === 'split' && innerWidth > 700 ? 'split' : mode === 'split' && innerWidth <= 700 ? 'edit' : mode;
    if (want !== mode) setMode(modePref, false);
    if (innerWidth <= 860 && get().nav && !(boot as unknown as { n?: boolean }).n) { (boot as unknown as { n?: boolean }).n = true; setNav(false, false); } else if (innerWidth > 860) (boot as unknown as { n?: boolean }).n = false;
  });
  document.fonts?.ready.then(() => ed.view.requestMeasure());
  requestAnimationFrame(() => requestAnimationFrame(() => api.ready()));
  (window as unknown as { __app: unknown }).__app = { openSample, newDoc, setMode, get };
}

export function setWindowMode(m: WinMode) { set({ winMode: m }); return api.setWinMode(m); }
export function resetEverything() {
  useSettings.getState().reset(); changeSettings({}); applyEditorOptions(); api.setWinMode('remember'); set({ winMode: 'remember' });
}
export { showOverlay };
