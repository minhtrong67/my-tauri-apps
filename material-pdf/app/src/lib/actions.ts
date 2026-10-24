import { baseName, dirName, fileSize, openPath, pickFiles, pickFolder, saveAs, writeFile, writeMany, type PickedFile } from "./native";
import { canvasBlob, loadPdf, PasswordError, readSizes, renderToCanvas, uid } from "./pdf";
import { extractManaged, isManaged, rawToAnnots, writeAnnots, type VpOf } from "./annots";
import { tr, toast, useStore, type Doc } from "./store";
import { isTauri } from "./native";

const st = () => useStore.getState();
export const activeDoc = () => st().docs.find((d) => d.id === st().activeId) ?? null;

function initialFit(): { fit: Doc["fit"]; scale: number } {
  const f = st().settings.defaultFit;
  return f === "100" ? { fit: "custom", scale: 1 } : { fit: f, scale: 1 };
}

const vpOf = (pdf: Doc["pdf"]): VpOf => async (i) => (await pdf.getPage(i + 1)).getViewport({ scale: 1 }) as any;

/** Loads a PDF; annotations written by Material PDF earlier come back as editable ones (and are hidden from the canvas). */
async function loadManaged(bytes: Uint8Array, password?: string) {
  const pdf = await loadPdf(bytes, password);
  if (password || !(await isManaged(pdf))) return { pdf, base: bytes, annots: [] as Annot[] };
  try {
    const ex = await extractManaged(bytes);
    if (ex) {
      const p2 = await loadPdf(ex.base);
      const annots = await rawToAnnots(ex.raws, vpOf(p2));
      pdf.destroy();
      return { pdf: p2, base: ex.base, annots };
    }
  } catch (e) { console.warn("managed annotations", e); }
  return { pdf, base: bytes, annots: [] as Annot[] };
}

const LAZY_PAGES = 150;
/**
 * Page sizes. Big documents open immediately with the first page's size as an estimate; the exact sizes are read
 * in the background and swapped in (only if that same pdf is still the one being shown).
 */
async function quickSizes(id: string, pdf: Doc["pdf"]) {
  if (pdf.numPages <= LAZY_PAGES) return readSizes(pdf);
  const v = (await pdf.getPage(1)).getViewport({ scale: 1 });
  readSizes(pdf).then((sizes) => {
    const d = st().docs.find((x) => x.id === id);
    if (d && d.pdf === pdf) st().patchDoc(id, { sizes });
  }).catch(() => {});
  return Array.from({ length: pdf.numPages }, () => ({ w: v.width, h: v.height }));
}

/** Opens bytes as a new tab. Asks for a password when needed. */
export async function openBytes(file: PickedFile, password?: string): Promise<boolean> {
  try {
    const { pdf, base, annots } = await loadManaged(file.bytes, password);
    const id = uid();
    const sizes = await quickSizes(id, pdf);
    const doc: Doc = {
      id, name: file.name, path: file.path, bytes: file.bytes, base, pdf, password, numPages: pdf.numPages, sizes,
      page: 0, ...initialFit(), dirty: false, annots, past: [], future: [], rev: 0, forms: {},
    };
    st().addDoc(doc);
    if (file.path) st().addRecent({ path: file.path, name: file.name, time: Date.now() });
    return true;
  } catch (e) {
    if (e instanceof PasswordError) {
      st().openDialog("password", { file, wrong: e.wrong });
      return false;
    }
    console.error(e);
    toast("openFailed");
    return false;
  }
}

export async function openPicker() {
  const files = await pickFiles("pdf", true);
  for (const f of files) await openBytes(f);
}
export async function openRecent(path: string) {
  try { await openBytes(await openPath(path)); }
  catch { st().removeRecent(path); toast("openFailed"); }
}

/** Replace the document bytes (after a structural edit) and reload the viewer. */
export async function replaceBytes(doc: Doc, bytes: Uint8Array, keepPage = true) {
  const { pdf, base, annots } = await loadManaged(bytes, doc.password);
  const sizes = await quickSizes(doc.id, pdf);
  const old = doc.pdf;
  st().patchDoc(doc.id, {
    bytes, base, pdf, sizes, numPages: pdf.numPages, annots, forms: {}, past: [], future: [], dirty: true, rev: doc.rev + 1,
    page: keepPage ? Math.min(doc.page, pdf.numPages - 1) : 0,
  });
  setTimeout(() => old.destroy(), 500);
}

const hasEdits = (d: Doc) => d.annots.length > 0 || Object.keys(d.forms).length > 0;
export async function currentBytes(doc: Doc) {
  return writeAnnots(doc.base, vpOf(doc.pdf), doc.annots, doc.forms);
}

export async function saveDoc(doc: Doc, forceDialog = false): Promise<boolean> {
  try {
    const bytes = await currentBytes(doc);
    let path = doc.path;
    if (!path || forceDialog) {
      const res = await saveAs(doc.name, bytes, doc.path ? dirName(doc.path) : undefined);
      if (!res) return false;
      path = isTauri ? res : null;
      if (path) st().patchDoc(doc.id, { path, name: baseName(path) });
    } else await writeFile(path, bytes);
    // annotations stay editable: the viewer keeps showing `base` + the annotation model, only the on-disk bytes change
    st().patchDoc(doc.id, { bytes, dirty: false });
    if (path) st().addRecent({ path, name: baseName(path), time: Date.now() });
    toast("saved", { name: path ? baseName(path) : doc.name });
    return true;
  } catch (e) {
    console.error(e);
    toast("saveFailed");
    return false;
  }
}

export function closeDoc(id: string) {
  const d = st().docs.find((x) => x.id === id);
  if (d?.dirty) st().openDialog("unsaved", { id });
  else st().removeDoc(id);
}

export async function exportImages(doc: Doc) {
  try {
    const folder = isTauri ? await pickFolder() : null;
    if (isTauri && !folder) return;
    toast("working");
    const base = doc.name.replace(/\.pdf$/i, "");
    const src = hasEdits(doc) ? await loadPdf(await currentBytes(doc), doc.password) : doc.pdf;
    const files: { name: string; bytes: Uint8Array; mime: string }[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const c = await renderToCanvas(src, i, 2);
      files.push({ name: `${base}-${String(i).padStart(3, "0")}.png`, bytes: new Uint8Array(await (await canvasBlob(c)).arrayBuffer()), mime: "image/png" });
    }
    if (src !== doc.pdf) src.destroy();
    await writeMany(folder, files);
    toast("exported", { n: files.length });
  } catch (e) { console.error(e); toast("saveFailed"); }
}

export async function printDoc(doc: Doc) {
  toast("printPrep");
  const root = document.getElementById("print-root")!;
  root.innerHTML = "";
  const src = hasEdits(doc) ? await loadPdf(await currentBytes(doc), doc.password) : doc.pdf;
  const urls: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await renderToCanvas(src, i, 2);
    const url = URL.createObjectURL(await canvasBlob(c, "image/jpeg", 0.92));
    urls.push(url);
    const img = new Image(); img.src = url; root.appendChild(img);
    await img.decode().catch(() => {});
  }
  if (src !== doc.pdf) src.destroy();
  const cleanup = () => { root.innerHTML = ""; urls.forEach(URL.revokeObjectURL); window.removeEventListener("afterprint", cleanup); };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

// ---------- annotations ----------
import type { Annot } from "./store";
const commit = (d: Doc, annots: Annot[], extra: Partial<Doc> = {}) =>
  st().patchDoc(d.id, { annots, past: [...d.past, d.annots].slice(-100), future: [], dirty: true, ...extra });
export function addAnnots(list: Annot[]) { const d = activeDoc(); if (d && list.length) commit(d, [...d.annots, ...list]); }
export function removeAnnot(id: string) { const d = activeDoc(); if (d) commit(d, d.annots.filter((a) => a.id !== id)); }
export function undoAnnot() {
  const d = activeDoc(); if (!d || !d.past.length) return;
  st().patchDoc(d.id, { annots: d.past[d.past.length - 1], past: d.past.slice(0, -1), future: [d.annots, ...d.future], dirty: true });
}
export function redoAnnot() {
  const d = activeDoc(); if (!d || !d.future.length) return;
  st().patchDoc(d.id, { annots: d.future[0], future: d.future.slice(1), past: [...d.past, d.annots], dirty: true });
}
export function setFormValue(name: string, value: string | boolean) {
  const d = activeDoc(); if (d) st().patchDoc(d.id, { forms: { ...d.forms, [name]: value }, dirty: true });
}
export function gotoPage(i: number) {
  const d = activeDoc(); if (d) st().patchDoc(d.id, { page: Math.max(0, Math.min(d.numPages - 1, i)) });
}
export function setZoom(scale: number) {
  const d = activeDoc(); if (d) st().patchDoc(d.id, { scale: Math.max(0.1, Math.min(6, scale)), fit: "custom" });
}
