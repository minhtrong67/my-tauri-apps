import { FileWarning, RefreshCw, Save, Trash2, X, CircleAlert } from "lucide-react";
import {
  useDocs, createDoc, removeDoc, updateDoc, setActiveId, getDoc, getActiveDoc, findByPath,
  renumberUntitled, docName, pushRecent, dropRecent, type Doc,
} from "../store/docs";
import { useSettings } from "../store/settings";
import { useUi, useFind, confirmDialog, toast } from "../store/ui";
import { editors, viewState, getText, rememberView } from "./editors";
import { scheduleStatus } from "./editorOps";
import { refreshFind } from "./find";
import { persistSession, queuePersist, clearSession } from "./session";
import {
  fileMtime, pickFiles, pickSavePath, readTextFile, revealCursor, writeTextFile, win, type Filter,
} from "./tauri";
import { t } from "./i18n";
import { baseName, clamp } from "./utils";

const filters = (): Filter[] => [
  { name: t("filter.text"), extensions: ["txt", "md", "log", "json", "csv", "xml", "ini", "yml", "yaml", "toml"] },
  { name: t("filter.all"), extensions: ["*"] },
];

const errText = (e: unknown) => (typeof e === "string" ? e : e instanceof Error ? e.message : "");

/** Native dialogs steal focus; make sure the caret comes back afterwards. */
async function nativeDialog<T>(fn: () => Promise<T>): Promise<T> {
  (document.activeElement as HTMLElement | null)?.blur();
  try {
    return await fn();
  } finally {
    setTimeout(() => {
      revealCursor();
      const id = useDocs.getState().activeId;
      if (id !== null) editors.get(id)?.focus();
    }, 80);
  }
}

/* ---------- tabs ---------- */
export function newTab() {
  const doc = createDoc();
  setActiveId(doc.id);
  queuePersist();
  return doc;
}

export function activateDoc(id: number) {
  const cur = useDocs.getState().activeId;
  if (cur === id) return;
  if (cur !== null) rememberView(cur);
  setActiveId(id);
  scheduleStatus();
  if (useFind.getState().open) queueMicrotask(refreshFind);
  queuePersist();
}

export function cycleTab(dir: 1 | -1) {
  const { docs, activeId } = useDocs.getState();
  if (docs.length < 2) return;
  const i = docs.findIndex((d) => d.id === activeId);
  activateDoc(docs[(i + dir + docs.length) % docs.length].id);
}

const isPristine = (d: Doc) => !d.path && !d.dirty && getText(d.id) === "";

/* ---------- open ---------- */
export async function openPaths(paths: string[]) {
  let last: number | null = null;
  for (const p of paths) {
    const existing = findByPath(p);
    if (existing) {
      last = existing.id;
      continue;
    }
    try {
      const data = await readTextFile(p);
      const doc = createDoc({ path: p, content: data.content, eol: data.eol, encoding: data.encoding, mtime: data.mtime });
      pushRecent(p);
      last = doc.id;
    } catch (e) {
      dropRecent(p);
      toast.error(`${t("err.open")}: ${baseName(p)}${errText(e) ? " (" + errText(e) + ")" : ""}`);
    }
  }
  if (last === null) return;
  // an empty untitled tab is replaced by the opened file
  for (const d of useDocs.getState().docs) if (d.id !== last && isPristine(d) && useDocs.getState().docs.length > 1) removeDoc(d.id);
  renumberUntitled();
  activateDoc(last);
  setActiveId(last);
  queuePersist();
}

export async function openDialog() {
  try {
    const paths = await nativeDialog(() => pickFiles(filters()));
    if (paths.length) await openPaths(paths);
  } catch (e) {
    toast.error(`${t("err.open")} ${errText(e)}`);
  }
}

/* ---------- save ---------- */
export async function saveDoc(id: number, o: { as?: boolean; silent?: boolean } = {}): Promise<boolean> {
  const doc = getDoc(id);
  if (!doc) return false;
  const text = getText(id);
  let path = doc.path;
  if (!path || o.as) {
    const fileName = docName(doc).replace(/[\\/:*?"<>|]/g, "") + ".txt";
    const dir = useSettings.getState().saveDir;
    // an already named file keeps its own location; new notes start in the folder chosen in Settings
    const suggested = doc.path ?? (dir ? dir.replace(/[\\/]+$/, "") + (dir.includes("\\") ? "\\" : "/") + fileName : fileName);
    let sel: string | null = null;
    try {
      sel = await nativeDialog(() => pickSavePath(suggested, filters()));
    } catch (e) {
      toast.error(`${t("err.save")}${errText(e) ? ": " + errText(e) : ""}`);
      return false;
    }
    if (!sel) return false;
    path = sel;
  } else {
    const disk = await fileMtime(path);
    if (disk !== null && ((doc.mtime !== null && disk !== doc.mtime) || doc.conflict)) {
      const r = await confirmDialog({
        title: t("overwrite.title"),
        message: t("overwrite.msg", { name: docName(doc) }),
        icon: FileWarning,
        iconTone: "warning",
        actions: [
          { id: "reload", label: t("overwrite.reload"), icon: RefreshCw, tone: "tonal" },
          { id: "cancel", label: t("common.cancel"), icon: X, tone: "neutral" },
          { id: "overwrite", label: t("overwrite.confirm"), icon: Save, tone: "danger" },
        ],
      });
      if (r === "reload") {
        await reloadDoc(id);
        return false;
      }
      if (r !== "overwrite") return false;
    }
  }
  try {
    const mtime = await writeTextFile(path, text, doc.eol, doc.encoding);
    const stillDirty = getText(id) !== text;
    updateDoc(id, { path, saved: text, forced: false, dirty: stillDirty, mtime, conflict: false, untitled: 0 });
    renumberUntitled();
    pushRecent(path);
    if (!o.silent) toast.success(`${t("msg.saved")}: ${baseName(path)}`, { duration: 2000 });
    queuePersist();
    return true;
  } catch (e) {
    toast.error(`${t("err.save")}${errText(e) ? ": " + errText(e) : ""}`);
    return false;
  }
}

export const saveActive = (as = false) => {
  const d = getActiveDoc();
  return d ? saveDoc(d.id, { as }) : Promise.resolve(false);
};

/* ---------- reload / encoding / line endings ---------- */
export async function reloadDoc(id: number, encoding?: string) {
  const d = getDoc(id);
  if (!d?.path) return;
  try {
    const data = await readTextFile(d.path, encoding);
    const ta = editors.get(id);
    if (ta) ta.value = data.content;
    updateDoc(id, {
      initial: data.content, saved: data.content, eol: data.eol, encoding: data.encoding,
      mtime: data.mtime, forced: false, dirty: false, conflict: false,
    });
    scheduleStatus();
    if (useFind.getState().open) refreshFind();
    queuePersist();
  } catch (e) {
    toast.error(`${t("err.open")}: ${baseName(d.path)}${errText(e) ? " (" + errText(e) + ")" : ""}`);
  }
}

export const reloadActive = () => {
  const d = getActiveDoc();
  if (d?.path) void reloadDoc(d.id);
};

export async function changeEncoding(id: number, enc: string) {
  const d = getDoc(id);
  if (!d || d.encoding === enc) return;
  if (d.path && !d.dirty) {
    await reloadDoc(id, enc);
    toast.info(t("msg.encReopened", { enc: encLabel(enc) }));
  } else {
    updateDoc(id, { encoding: enc, forced: true, dirty: true });
    toast.info(t("msg.encSave", { enc: encLabel(enc) }));
    queuePersist();
  }
}

export const ENCODINGS: { id: string; label: string }[] = [
  { id: "utf-8", label: "UTF-8" },
  { id: "utf-8-bom", label: "UTF-8 with BOM" },
  { id: "utf-16le", label: "UTF-16 LE" },
  { id: "utf-16be", label: "UTF-16 BE" },
  { id: "windows-1252", label: "Windows-1252 (Western)" },
  { id: "windows-1258", label: "Windows-1258 (Vietnamese)" },
  { id: "windows-1251", label: "Windows-1251 (Cyrillic)" },
  { id: "windows-1250", label: "Windows-1250 (Central European)" },
  { id: "iso-8859-15", label: "ISO-8859-15" },
  { id: "shift_jis", label: "Shift JIS (Japanese)" },
  { id: "euc-kr", label: "EUC-KR (Korean)" },
  { id: "gbk", label: "GBK (Simplified Chinese)" },
  { id: "big5", label: "Big5 (Traditional Chinese)" },
];
export const encLabel = (id: string) => ENCODINGS.find((e) => e.id === id)?.label.split(" (")[0] ?? id.toUpperCase();

export function toggleEol() {
  const d = getActiveDoc();
  if (!d) return;
  updateDoc(d.id, { eol: d.eol === "crlf" ? "lf" : "crlf", forced: true, dirty: true });
  queuePersist();
}

/* ---------- editing events ---------- */
const autosaveTimers = new Map<number, number>();

export function onEdit(id: number) {
  const d = getDoc(id);
  if (!d) return;
  const dirty = getText(id) !== d.saved || d.forced;
  if (dirty !== d.dirty) updateDoc(id, { dirty });
  scheduleStatus();
  if (useFind.getState().open) scheduleFindRefresh();
  queuePersist();
  clearTimeout(autosaveTimers.get(id));
  if (dirty && d.path && useSettings.getState().autosave) {
    autosaveTimers.set(
      id,
      window.setTimeout(() => {
        const cur = getDoc(id);
        if (cur?.path && cur.dirty && useSettings.getState().autosave) void saveDoc(id, { silent: true });
      }, 1500),
    );
  }
}

let findTimer = 0;
function scheduleFindRefresh() {
  clearTimeout(findTimer);
  findTimer = window.setTimeout(() => {
    useUi.setState((s) => ({ editRev: s.editRev + 1 }));
    refreshFind();
  }, 120);
}

/* ---------- closing ---------- */
async function askSave(d: Doc): Promise<boolean> {
  const r = await confirmDialog({
    title: t("unsaved.title"),
    message: t("unsaved.msg", { name: docName(d) }),
    icon: CircleAlert,
    iconTone: "warning",
    actions: [
      { id: "dont", label: t("common.dontSave"), icon: Trash2, tone: "danger" },
      { id: "cancel", label: t("common.cancel"), icon: X, tone: "neutral" },
      { id: "save", label: t("common.save"), icon: Save, tone: "primary" },
    ],
  });
  if (r === "save") return saveDoc(d.id);
  return r === "dont";
}

export async function closeDoc(id: number, force = false): Promise<boolean> {
  const d = getDoc(id);
  if (!d) return true;
  if (d.dirty && !force) {
    activateDoc(id);
    if (!(await askSave(d))) return false;
  }
  const { docs, activeId } = useDocs.getState();
  const idx = docs.findIndex((x) => x.id === id);
  if (docs.length === 1) {
    const fresh = createDoc();
    setActiveId(fresh.id);
  } else if (activeId === id) {
    setActiveId((docs[idx + 1] ?? docs[idx - 1]).id);
  }
  removeDoc(id);
  editors.delete(id);
  viewState.delete(id);
  clearTimeout(autosaveTimers.get(id));
  renumberUntitled();
  scheduleStatus();
  if (useFind.getState().open) queueMicrotask(refreshFind);
  queuePersist();
  return true;
}

export const closeActive = () => {
  const d = getActiveDoc();
  return d ? closeDoc(d.id) : Promise.resolve(true);
};

/** Called when the window is about to close. Resolves true when it is fine to quit. */
export async function confirmAllClosed(): Promise<boolean> {
  const { restore } = useSettings.getState();
  const dirty = useDocs.getState().docs.filter((d) => d.dirty);
  const chars = dirty.reduce((n, d) => n + getText(d.id).length, 0);
  if (restore && chars <= 3_000_000) {
    persistSession();
    return true;
  }
  for (const d of dirty) {
    activateDoc(d.id);
    if (!(await askSave(d))) return false;
  }
  if (!restore) clearSession();
  else persistSession();
  return true;
}

/* ---------- external changes ---------- */
let checking = false;
export async function checkExternalChanges() {
  if (checking) return;
  checking = true;
  try {
    for (const d of useDocs.getState().docs) {
      if (!d.path || d.mtime === null) continue;
      const m = await fileMtime(d.path);
      if (m === null || m === d.mtime) continue;
      const cur = getDoc(d.id);
      if (!cur) continue;
      if (!cur.dirty) {
        await reloadDoc(cur.id);
        toast.info(t("msg.reloaded", { name: docName(cur) }));
      } else if (!cur.conflict) {
        updateDoc(cur.id, { conflict: true });
        toast.warning(t("msg.external", { name: docName(cur) }), { duration: 7000 });
      }
    }
  } finally {
    checking = false;
  }
}

/* ---------- misc ---------- */
export const setZoom = (z: number) => useSettings.getState().set({ zoom: clamp(Math.round(z), 25, 500) });
export const zoomBy = (d: number) => setZoom(useSettings.getState().zoom + d);

export async function toggleFullscreen() {
  const w = win();
  if (w) await w.setFullscreen(!(await w.isFullscreen()));
}

export const quit = () => {
  void win()?.close();
};
