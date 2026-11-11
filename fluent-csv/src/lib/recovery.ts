// Draft recovery: unsaved tabs are mirrored to IndexedDB so a crash never loses work.
import { app, rebuildView, type Doc } from './store';
import { serialize, docFromText, parseInto } from './io';

const DB = 'fluentcsv', STORE = 'drafts';
interface Draft { id: number; name: string; path: string | null; text: string; delim: string; enc: string; bom: boolean; eol: string; hasHeader: boolean; t: number }

function db(): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
}
const tx = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const d = await db();
  return new Promise((ok, no) => { const r = f(d.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
};

export const listDrafts = () => tx<Draft[]>('readonly', s => s.getAll()).catch(() => [] as Draft[]);
export const clearDrafts = () => tx('readwrite', s => s.clear()).catch(() => undefined);

const lastSaved = new Map<number, number>();
let timer: ReturnType<typeof setInterval> | null = null;

export async function flushDrafts() {
  if (!app.settings.autosave) return;
  try {
    const live = new Set<number>();
    for (const d of app.docs) {
      if (!d.dirty) continue;
      live.add(d.id);
      if (lastSaved.get(d.id) === d.version) continue;
      if (d.rows.length > 400_000) continue; // keep the draft cheap
      lastSaved.set(d.id, d.version);
      await tx('readwrite', s => s.put({ id: d.id, name: d.name, path: d.path, text: serialize(d, { eol: '\n' }), delim: d.delim, enc: d.enc, bom: d.bom, eol: d.eol, hasHeader: d.hasHeader, t: Date.now() } satisfies Draft));
    }
    for (const id of [...lastSaved.keys()]) if (!live.has(id)) { lastSaved.delete(id); await tx('readwrite', s => s.delete(id)); }
  } catch { /* storage unavailable */ }
}

export function startRecovery() {
  if (timer) return;
  timer = setInterval(flushDrafts, 4000);
}

export function draftToDoc(x: Draft): Doc {
  const d = docFromText(x.text, { name: x.name, path: x.path, enc: x.enc, bom: x.bom });
  d.delim = x.delim; d.eol = x.eol; d.hasHeader = x.hasHeader;
  parseInto(d, x.text); rebuildView(d);
  d.dirty = true; d.cleanId = -1;
  return d;
}
