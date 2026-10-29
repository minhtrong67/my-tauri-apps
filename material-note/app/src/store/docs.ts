import { create } from "zustand";
import { baseName, isWin, readJson, samePath, writeJson } from "../lib/utils";
import { t } from "../lib/i18n";

export type Eol = "crlf" | "lf";
export const DEFAULT_EOL: Eol = isWin ? "crlf" : "lf";

export interface Doc {
  id: number;
  path: string | null;
  eol: Eol;
  encoding: string;
  /** Text the editor element is created with (afterwards the textarea owns the text). */
  initial: string;
  /** Text as last saved to / loaded from disk. */
  saved: string;
  /** A change that is not visible in the text (line ending / encoding) still needs saving. */
  forced: boolean;
  dirty: boolean;
  mtime: number | null;
  /** The file changed on disk while it had unsaved edits. */
  conflict: boolean;
  untitled: number;
}

interface DocsState {
  docs: Doc[];
  activeId: number | null;
  recent: string[];
}

const RECENT_KEY = "material-note.recent";
const MAX_RECENT = 10;

const loadRecent = (): string[] => {
  const r = readJson<unknown>(RECENT_KEY);
  return Array.isArray(r) ? r.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT) : [];
};

export const useDocs = create<DocsState>(() => ({ docs: [], activeId: null, recent: loadRecent() }));

let seq = 0;
let untitledSeq = 0;

export interface NewDoc {
  path?: string | null;
  content?: string;
  saved?: string;
  eol?: Eol;
  encoding?: string;
  mtime?: number | null;
}

export function createDoc(o: NewDoc = {}): Doc {
  const content = o.content ?? "";
  const saved = o.saved ?? content;
  const doc: Doc = {
    id: ++seq,
    path: o.path ?? null,
    eol: o.eol ?? DEFAULT_EOL,
    encoding: o.encoding ?? "utf-8",
    initial: content,
    saved,
    forced: false,
    dirty: saved !== content,
    mtime: o.mtime ?? null,
    conflict: false,
    untitled: o.path ? 0 : ++untitledSeq,
  };
  useDocs.setState((s) => ({ docs: [...s.docs, doc] }));
  return doc;
}

export function removeDoc(id: number) {
  useDocs.setState((s) => ({ docs: s.docs.filter((d) => d.id !== id) }));
}

export function updateDoc(id: number, patch: Partial<Doc>) {
  useDocs.setState((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
}

export function moveDoc(from: number, to: number) {
  useDocs.setState((s) => {
    const list = s.docs.slice();
    const i = list.findIndex((d) => d.id === from);
    const j = list.findIndex((d) => d.id === to);
    if (i < 0 || j < 0 || i === j) return s;
    const [x] = list.splice(i, 1);
    list.splice(j, 0, x);
    return { docs: list };
  });
}

export const setActiveId = (id: number | null) => useDocs.setState({ activeId: id });
export const getDoc = (id: number | null) => (id === null ? undefined : useDocs.getState().docs.find((d) => d.id === id));
export const getActiveDoc = () => getDoc(useDocs.getState().activeId);
export const findByPath = (p: string) => useDocs.getState().docs.find((d) => d.path && samePath(d.path, p));

/** Numbers the remaining unnamed tabs 1, 2, 3 ... again. */
export function renumberUntitled() {
  let n = 0;
  useDocs.setState((s) => ({ docs: s.docs.map((d) => (d.path ? d : { ...d, untitled: ++n })) }));
  untitledSeq = n;
}

export const docName = (d: Doc) => (d.path ? baseName(d.path) : t("untitled") + (d.untitled > 1 ? " " + d.untitled : ""));

/* recent files */
const saveRecent = (list: string[]) => {
  const next = list.slice(0, MAX_RECENT);
  useDocs.setState({ recent: next });
  writeJson(RECENT_KEY, next);
};
export const pushRecent = (p: string) => saveRecent([p, ...useDocs.getState().recent.filter((x) => !samePath(x, p))]);
export const dropRecent = (p: string) => saveRecent(useDocs.getState().recent.filter((x) => !samePath(x, p)));
export const clearRecent = () => saveRecent([]);
