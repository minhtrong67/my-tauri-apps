import { Trash2, Pencil } from "lucide-react";
import { api, isTauri, onEvent, pickFolder, src } from "./tauri";
import { app, settings, t, toast, userData, confirmDialog, promptDialog } from "./store";
import type { Entry, Opened, Scope } from "./types";
import { baseName, dirName, debounce, stem, uid } from "./utils";

let libraryDir = "";
let isLibrary = false;

function apply(o: Opened, library: boolean) {
  isLibrary = library;
  libraryDir = o.dir;
  app.set({ dir: o.dir, entries: o.entries, loading: false, loaded: true, selection: [], selecting: false, folder: "", format: "", search: "" });
  if (settings.get().watch && isTauri) api.watch([o.dir], library).catch(() => {});
  else if (isTauri) api.unwatch().catch(() => {});
}

export async function loadLibrary() {
  app.set({ loading: true });
  try {
    apply(await api.library(), true);
  } catch (e) { app.set({ loading: false, loaded: true }); toast("error", t("toast.error", { msg: String(e) })); }
}

/** Opens a folder or a picture. A picture opens straight in the viewer. */
export async function openPath(path: string) {
  app.set({ loading: true });
  try {
    const o = await api.openTarget(path);
    if (!o.entries.length) { app.set({ loading: false }); toast("warning", t("toast.noImages")); return; }
    apply(o, false);
    app.set({ scope: { kind: "all" } });
    if (o.current) openViewer(o.current, sortList(o.entries).map((e) => e.path));
    else { app.set({ view: "gallery" }); toast("info", t("toast.opened", { n: o.entries.length })); }
  } catch (e) { app.set({ loading: false }); toast("error", t("toast.error", { msg: String(e) })); }
}

export async function chooseFolder() {
  const p = await pickFolder();
  if (p) await openPath(p);
}

export async function refresh(quiet = false) {
  const { dir } = app.get();
  if (!dir) return;
  try {
    const o = isLibrary ? await api.library() : await api.openTarget(dir);
    app.set({ entries: o.entries, dir: o.dir });
    await loadScopeEntries();
    if (!quiet) toast("success", t("toast.refreshed"));
  } catch (e) { toast("error", t("toast.error", { msg: String(e) })); }
}

export function sortList(list: Entry[]): Entry[] {
  const k = settings.get().sort;
  const a = list.slice();
  const nm = (x: Entry, y: Entry) => x.name.localeCompare(y.name, undefined, { numeric: true, sensitivity: "base" });
  a.sort(k === "date-desc" ? (x, y) => y.mtime - x.mtime : k === "date-asc" ? (x, y) => x.mtime - y.mtime : k === "name-asc" ? nm : k === "name-desc" ? (x, y) => nm(y, x) : k === "size-desc" ? (x, y) => y.size - x.size : (x, y) => x.size - y.size);
  return a;
}

export function findEntry(path: string): Entry | undefined {
  const s = app.get();
  return s.entries.find((e) => e.path === path) ?? s.scopeEntries.find((e) => e.path === path);
}

/* ---------------- Navigation ---------------- */
export function openViewer(path: string, ctx: string[]) { app.set({ view: "viewer", current: path, ctx, selecting: false, selection: [] }); }
export function goGallery() { app.set({ view: "gallery" }); }
export function openEditor() { if (app.get().current) app.set({ view: "editor" }); }
export function setScope(scope: Scope) { app.set({ scope, view: "gallery", selection: [], selecting: false }); loadScopeEntries(); }

export async function loadScopeEntries() {
  const { scope } = app.get();
  let paths: string[] = [];
  if (scope.kind === "fav") paths = userData.get().favs;
  else if (scope.kind === "album") paths = userData.get().albums.find((a) => a.id === scope.id)?.paths ?? [];
  else if (scope.kind === "albums") paths = userData.get().albums.flatMap((a) => a.paths.slice(0, 4));
  else { app.set({ scopeEntries: [] }); return; }
  if (!isTauri) return;
  try { app.set({ scopeEntries: await api.statPaths(Array.from(new Set(paths))) }); } catch { /* ignore */ }
}

/* ---------------- Favourites and albums ---------------- */
export const isFav = (path: string) => userData.get().favs.includes(path);
export function toggleFav(path: string) {
  const favs = userData.get().favs;
  userData.set({ favs: favs.includes(path) ? favs.filter((p) => p !== path) : [path, ...favs] });
  if (app.get().scope.kind === "fav") loadScopeEntries();
}
export function setFavs(paths: string[], on: boolean) {
  const cur = new Set(userData.get().favs);
  paths.forEach((p) => (on ? cur.add(p) : cur.delete(p)));
  userData.set({ favs: [...cur] });
}
export async function createAlbum(paths: string[] = []) {
  const name = await promptDialog({ title: t("alb.new"), label: t("alb.name"), confirm: t("create"), icon: Pencil });
  if (!name) return null;
  const a = { id: uid(), name, paths };
  userData.set((s) => ({ albums: [...s.albums, a] }));
  if (paths.length) toast("success", t("alb.added", { name }));
  return a;
}
export function addToAlbum(id: string, paths: string[]) {
  const al = userData.get().albums.find((a) => a.id === id);
  if (!al) return;
  userData.set((s) => ({ albums: s.albums.map((a) => (a.id === id ? { ...a, paths: [...new Set([...a.paths, ...paths])] } : a)) }));
  toast("success", t("alb.added", { name: al.name }));
}
export function removeFromAlbum(id: string, paths: string[]) {
  userData.set((s) => ({ albums: s.albums.map((a) => (a.id === id ? { ...a, paths: a.paths.filter((p) => !paths.includes(p)) } : a)) }));
  loadScopeEntries();
}
export async function renameAlbum(id: string) {
  const al = userData.get().albums.find((a) => a.id === id);
  if (!al) return;
  const name = await promptDialog({ title: t("alb.rename"), label: t("alb.name"), value: al.name, confirm: t("rename"), icon: Pencil, select: true });
  if (name) userData.set((s) => ({ albums: s.albums.map((a) => (a.id === id ? { ...a, name } : a)) }));
}
export async function deleteAlbum(id: string) {
  const al = userData.get().albums.find((a) => a.id === id);
  if (!al) return;
  if (await confirmDialog({ title: t("alb.delete"), desc: t("alb.deleteQ", { name: al.name }), confirm: t("delete"), kind: "danger", icon: Trash2 })) {
    userData.set((s) => ({ albums: s.albums.filter((a) => a.id !== id) }));
    const sc = app.get().scope;
    if (sc.kind === "album" && sc.id === id) setScope({ kind: "albums" });
  }
}
/** Keeps favourites and albums pointing at the right file after a rename or a move. */
function repath(from: string, to: string) {
  userData.set((s) => ({
    favs: s.favs.map((p) => (p === from ? to : p)),
    albums: s.albums.map((a) => ({ ...a, paths: a.paths.map((p) => (p === from ? to : p)) })),
  }));
}

/* ---------------- File operations ---------------- */
function dropFromState(paths: string[]) {
  const set = new Set(paths);
  const s = app.get();
  app.set({
    entries: s.entries.filter((e) => !set.has(e.path)), scopeEntries: s.scopeEntries.filter((e) => !set.has(e.path)),
    selection: s.selection.filter((p) => !set.has(p)), ctx: s.ctx.filter((p) => !set.has(p)),
  });
}

/** Moves pictures to the Recycle Bin (after confirming, when the setting is on) and offers an Undo. Resolves true when deleted. */
export async function deleteFiles(paths: string[]): Promise<boolean> {
  if (!paths.length) return false;
  if (settings.get().confirmDelete) {
    const one = paths.length === 1;
    const ok = await confirmDialog({
      title: one ? t("del.title") : t("del.title.n", { n: paths.length }),
      desc: one ? t("del.desc", { name: baseName(paths[0]) }) : t("del.desc.n"),
      confirm: t("del.confirm"), kind: "danger", icon: Trash2,
    });
    if (!ok) return false;
  }
  const done: string[] = [];
  for (const p of paths) { try { await api.remove(p); done.push(p); } catch (e) { toast("error", t("toast.error", { msg: String(e) })); } }
  if (!done.length) return false;
  dropFromState(done);
  userData.set((s) => ({ favs: s.favs.filter((p) => !done.includes(p)) }));
  toast("success", done.length === 1 ? t("toast.deleted") : t("toast.deleted.n", { n: done.length }), {
    action: {
      label: t("undo"),
      run: async () => {
        for (const p of done) { try { await api.restore(p); } catch (e) { toast("error", t("toast.error", { msg: String(e) })); return; } }
        await refresh(true);
        toast("info", t("toast.restored"));
      },
    },
  });
  return true;
}

export async function refreshEntry(path: string) {
  try {
    const [e] = await api.statPaths([path]);
    if (!e) return;
    const s = app.get();
    app.set({ entries: s.entries.map((x) => (x.path === path ? e : x)), scopeEntries: s.scopeEntries.map((x) => (x.path === path ? e : x)), version: s.version + 1 });
  } catch { /* ignore */ }
}

export async function rotateFile(path: string, deg: number) {
  try { await api.rotate(path, deg); await refreshEntry(path); toast("success", t("toast.rotated")); }
  catch (e) { toast(String(e).includes("unsupported") ? "warning" : "error", String(e).includes("unsupported") ? t("toast.unsupported") : t("toast.error", { msg: String(e) })); }
}

export async function renameOne(path: string, newName: string): Promise<string | null> {
  try {
    const np = await api.rename(path, newName);
    repath(path, np);
    const s = app.get();
    app.set({ current: s.current === path ? np : s.current, ctx: s.ctx.map((p) => (p === path ? np : p)) });
    await refresh(true);
    toast("success", t("toast.renamed"));
    return np;
  } catch { toast("error", t("toast.renameFail")); return null; }
}

export async function renameDialog(path: string) {
  const name = await promptDialog({ title: t("rename.title"), label: t("rename.label"), value: baseName(path), confirm: t("rename"), icon: Pencil, select: true });
  if (name && name !== baseName(path)) return renameOne(path, name);
  return null;
}

export async function transferTo(paths: string[], mv: boolean) {
  const dest = await pickFolder();
  if (!dest) return;
  try {
    const n = await api.transfer(paths, dest, mv);
    toast("success", t("toast.transferred", { n, verb: t(mv ? "xfer.move" : "xfer.copy") }));
    if (mv) { dropFromState(paths); await refresh(true); }
  } catch (e) { toast("error", t("toast.error", { msg: String(e) })); }
}

export async function batchRename(paths: string[], pattern: string, start: number, digits: number) {
  let n = 0;
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    const ext = baseName(p).includes(".") ? "." + baseName(p).split(".").pop() : "";
    const name = buildName(pattern, baseName(p), start + i, digits) + ext;
    if (name === baseName(p)) continue;
    try { repath(p, await api.rename(p, name)); n++; } catch { /* skip names that already exist */ }
  }
  await refresh(true);
  toast("success", t("br.done", { n }));
}
export const buildName = (pattern: string, original: string, i: number, digits: number) =>
  pattern.split("{n}").join(String(i).padStart(digits, "0")).split("{name}").join(stem(original));

/* ---------------- Clipboard / system ---------------- */
export async function imageBlob(path: string, mime?: string): Promise<Blob> {
  const blob = await (await fetch(src(path, app.get().version))).blob();
  if (!mime || blob.type === mime) return blob;
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), mime, 0.95));
}
export async function copyImage(path: string) {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": imageBlob(path, "image/png") })]);
    toast("success", t("toast.copied"));
  } catch { toast("error", t("toast.copyFail")); }
}
export async function copyText(text: string, msg: "toast.pathCopied" = "toast.pathCopied") {
  try { await navigator.clipboard.writeText(text); toast("success", t(msg)); } catch { toast("error", t("toast.copyFail")); }
}
export async function setWallpaper(path: string) {
  try { await api.wallpaper(path); toast("success", t("toast.wallpaper")); } catch (e) { toast("error", t("toast.error", { msg: String(e) })); }
}
export function printImage(path: string) {
  const old = document.getElementById("print-root"); old?.remove();
  const root = document.createElement("div"); root.id = "print-root";
  const img = new Image(); img.src = src(path, app.get().version);
  root.appendChild(img); document.body.appendChild(root);
  const go = () => { window.print(); setTimeout(() => root.remove(), 1500); };
  if (img.complete) go(); else img.onload = go;
}

/* ---------------- Boot ---------------- */
export async function boot() {
  if (!isTauri) { app.set({ loaded: true }); return; }
  const refreshSoon = debounce(() => { if (app.get().view !== "editor") refresh(true); }, 400);
  onEvent("fs-changed", () => refreshSoon());
  onEvent<string>("open-path", (p) => openPath(p));
  const start = await api.startupPath().catch(() => null);
  if (start) await openPath(start);
  else if (settings.get().autoLoad) await loadLibrary();
  else app.set({ loaded: true });
}
export const currentLibraryDir = () => libraryDir;
export const parentOf = dirName;
