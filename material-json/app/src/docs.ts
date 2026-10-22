import type { EditorState } from '@codemirror/state';
import { bus, debounce } from './bus';
import { ed, makeState } from './editor';
import { t } from './i18n';
import { analyze } from './json';
import { basename, dialog, toast } from './ui';
import { readPath, saveText, type LoadedFile } from './tauri';
import { settings } from './settings';

export interface Doc {
  id: string;
  name: string | null;
  untitled: number;
  path: string | null;
  saved: string;
  state: EditorState;
  dirty: boolean;
}

export const docs: Doc[] = [];
let activeId = '';
let seq = 0;
let untitledSeq = 0;

export const active = (): Doc => docs.find((d) => d.id === activeId) ?? docs[0];
export const textOf = (d: Doc) => (d.id === activeId ? ed.text() : d.state.doc.toString());
export const displayName = (d: Doc) => (d.path ? basename(d.path) : d.name ?? `${t('tab.untitled')}-${d.untitled}.json`);

const recheckDirty = debounce(() => {
  const d = active();
  if (!d) return;
  const dirty = ed.text() !== d.saved;
  if (dirty !== d.dirty) { d.dirty = dirty; bus.emit('docs'); }
}, 160);

const emitContent = debounce(() => bus.emit('content'), 220);

export function onEditorChange() {
  const d = active();
  if (d && !d.dirty) { d.dirty = true; bus.emit('docs'); }
  recheckDirty();
  emitContent();
  sessionDirty();
}

export function create(text = '', opts: { path?: string | null; name?: string | null; saved?: string; activate?: boolean } = {}): Doc {
  const d: Doc = {
    id: 'd' + ++seq, name: opts.name ?? null, untitled: opts.path || opts.name ? 0 : ++untitledSeq,
    path: opts.path ?? null, saved: opts.saved ?? (opts.path ? text : ''), state: makeState(text), dirty: false,
  };
  d.dirty = text !== d.saved;
  docs.push(d);
  if (opts.activate !== false) switchTo(d.id); else bus.emit('docs');
  return d;
}

export function switchTo(id: string) {
  if (id === activeId) return;
  const cur = docs.find((d) => d.id === activeId);
  if (cur) cur.state = ed.state;
  const next = docs.find((d) => d.id === id);
  if (!next) return;
  activeId = id;
  ed.setState(next.state);
  bus.emit('docs'); bus.emit('active'); bus.emit('content');
  sessionDirty();
}

/** Open loaded files, re-using tabs already showing the same path, and replacing a pristine empty tab. */
export function openLoaded(files: LoadedFile[]) {
  let n = 0;
  for (const f of files) {
    const dupe = f.path && docs.find((d) => d.path === f.path);
    if (dupe) { switchTo(dupe.id); toast(t('toast.alreadyOpen')); continue; }
    const cur = active();
    if (cur && !cur.path && !cur.dirty && !textOf(cur).trim() && docs.length === 1) {
      cur.path = f.path; cur.name = f.path ? null : f.name; cur.untitled = 0; cur.saved = f.text;
      cur.state = makeState(f.text); activeId = ''; switchTo(cur.id);
    } else create(f.text, { path: f.path, name: f.path ? null : f.name, saved: f.text });
    if (f.path) pushRecent(f.path);
    n++;
  }
  if (n) toast(t('toast.opened', { n }), 'success');
}

export async function openPaths(paths: string[]) {
  const out: LoadedFile[] = [];
  for (const p of paths) { try { out.push(await readPath(p)); } catch { toast(t('toast.readError'), 'error'); } }
  openLoaded(out);
}

export async function save(d: Doc = active(), forceAs = false): Promise<boolean> {
  const text = textOf(d);
  try {
    const path = await saveText({ text, path: forceAs ? null : d.path, name: displayName(d) });
    if (!path) return false;
    const isPath = /[\\/]/.test(path);
    if (isPath) { d.path = path; d.name = null; d.untitled = 0; pushRecent(path); } else if (!d.path) d.name = path;
    d.saved = text; d.dirty = false;
    bus.emit('docs');
    toast(t('toast.saved', { name: displayName(d) }), 'success');
    sessionDirty();
    return true;
  } catch { toast(t('toast.writeError'), 'error'); return false; }
}

export async function close(id: string): Promise<boolean> {
  const d = docs.find((x) => x.id === id);
  if (!d) return true;
  if (d.id === activeId) d.dirty = ed.text() !== d.saved; else d.dirty = d.state.doc.toString() !== d.saved;
  if (d.dirty) {
    switchTo(d.id);
    const r = await dialog({
      title: t('dlg.unsavedTitle'), body: t('dlg.unsavedBody', { name: displayName(d) }), icon: 'save',
      actions: [{ id: 'cancel', label: t('dlg.cancel') }, { id: 'no', label: t('dlg.dontSave') }, { id: 'yes', label: t('dlg.save'), primary: true }],
    });
    if (r === 'cancel') return false;
    if (r === 'yes' && !(await save(d))) return false;
  }
  const i = docs.indexOf(d);
  docs.splice(i, 1);
  if (!docs.length) { activeId = ''; create(''); return true; }
  if (d.id === activeId) { activeId = ''; switchTo(docs[Math.min(i, docs.length - 1)].id); } else bus.emit('docs');
  sessionDirty();
  return true;
}

export const unsavedCount = () => docs.filter((d) => (d.id === activeId ? ed.text() !== d.saved : d.state.doc.toString() !== d.saved)).length;

export function next(dir = 1) {
  if (docs.length < 2) return;
  const i = docs.findIndex((d) => d.id === activeId);
  switchTo(docs[(i + dir + docs.length) % docs.length].id);
}

/* ─────────────── recent files ─────────────── */
const RK = 'material-json:recent';
export const recent = (): string[] => { try { return JSON.parse(localStorage.getItem(RK) || '[]'); } catch { return []; } };
export function pushRecent(p: string) {
  const l = [p, ...recent().filter((x) => x !== p)].slice(0, 10);
  try { localStorage.setItem(RK, JSON.stringify(l)); } catch { /* ignore */ }
}
export function clearRecent() { try { localStorage.removeItem(RK); } catch { /* ignore */ } }

/* ─────────────── session restore ─────────────── */
const SK = 'material-json:session';
interface SavedDoc { path: string | null; name: string | null; untitled: number; text?: string; saved?: string }

function persistSession() {
  if (!settings.restore) return;
  try {
    let budget = 3_000_000;
    const list: SavedDoc[] = docs.map((d) => {
      const txt = textOf(d);
      const keep = (d.path === null || txt !== d.saved) && txt.length < 1_500_000 && budget - txt.length > 0;
      if (keep) budget -= txt.length;
      return { path: d.path, name: d.name, untitled: d.untitled, text: keep ? txt : undefined, saved: d.path && keep ? d.saved : undefined };
    });
    localStorage.setItem(SK, JSON.stringify({ active: docs.findIndex((d) => d.id === activeId), list }));
  } catch { /* quota */ }
}
const sessionDirty = debounce(persistSession, 700);

export async function restoreSession(): Promise<boolean> {
  if (!settings.restore) return false;
  try {
    const raw = JSON.parse(localStorage.getItem(SK) || 'null') as { active: number; list: SavedDoc[] } | null;
    if (!raw?.list?.length) return false;
    const made: Doc[] = [];
    for (const s of raw.list) {
      let text = s.text, saved = s.saved;
      if (s.path && text === undefined) { try { text = (await readPath(s.path)).text; saved = text; } catch { continue; } }
      else if (s.path && saved === undefined) { try { saved = (await readPath(s.path)).text; } catch { saved = ''; } }
      untitledSeq = Math.max(untitledSeq, s.untitled);
      made.push(create(text ?? '', { path: s.path, name: s.name, saved: saved ?? '', activate: false }));
      if (!s.path && !s.name) made[made.length - 1].untitled = s.untitled;
    }
    if (!made.length) return false;
    switchTo(made[Math.max(0, Math.min(raw.active, made.length - 1))].id);
    return true;
  } catch { return false; }
}

window.addEventListener('beforeunload', persistSession);
export { analyze };
