import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface PickedFile { path: string | null; name: string; bytes: Uint8Array }
export const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;
export const dirName = (p: string) => p.replace(/[\\/][^\\/]*$/, "");
const join = (dir: string, name: string) => dir + (dir.includes("\\") ? "\\" : "/") + name;

export async function readFile(path: string): Promise<Uint8Array> {
  return new Uint8Array(await invoke<ArrayBuffer>("read_file", { path }));
}
export async function writeFile(path: string, bytes: Uint8Array): Promise<void> {
  await invoke("write_file", bytes, { headers: { "x-path": encodeURIComponent(path) } });
}
export const launchFile = () => (isTauri ? invoke<string | null>("launch_file") : Promise.resolve(null));
export const fileSize = (path: string) => invoke<number>("file_size", { path });

function browserPick(accept: string, multiple: boolean): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = accept; input.multiple = multiple;
    input.onchange = async () => {
      const files = [...(input.files ?? [])];
      resolve(await Promise.all(files.map(async (f) => ({ path: null, name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }))));
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

export async function pickFiles(kind: "pdf" | "image", multiple = false): Promise<PickedFile[]> {
  const exts = kind === "pdf" ? ["pdf"] : ["png", "jpg", "jpeg", "webp", "bmp", "gif"];
  if (!isTauri) return browserPick(exts.map((e) => "." + e).join(","), multiple);
  const res = await open({ multiple, directory: false, filters: [{ name: kind === "pdf" ? "PDF" : "Images", extensions: exts }] });
  const paths = res == null ? [] : Array.isArray(res) ? res : [res];
  return Promise.all(paths.map(async (p) => ({ path: p, name: baseName(p), bytes: await readFile(p) })));
}

export async function openPath(path: string): Promise<PickedFile> {
  return { path, name: baseName(path), bytes: await readFile(path) };
}

/** Save with a native dialog. Returns the chosen path (or file name in the browser), null if cancelled. */
export async function saveAs(defaultName: string, bytes: Uint8Array, defaultDir?: string): Promise<string | null> {
  if (!isTauri) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
    a.download = defaultName; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return defaultName;
  }
  const path = await save({ defaultPath: defaultDir ? join(defaultDir, defaultName) : defaultName, filters: [{ name: "PDF", extensions: ["pdf"] }] });
  if (!path) return null;
  await writeFile(path, bytes);
  return path;
}

export async function pickFolder(): Promise<string | null> {
  if (!isTauri) return null;
  const res = await open({ directory: true, multiple: false });
  return typeof res === "string" ? res : null;
}

/** Write several files into a folder (Tauri) or trigger downloads (browser). */
export async function writeMany(folder: string | null, files: { name: string; bytes: Uint8Array; mime?: string }[]) {
  for (const f of files) {
    if (folder) await writeFile(join(folder, f.name), f.bytes);
    else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([f.bytes as BlobPart], { type: f.mime ?? "application/octet-stream" }));
      a.download = f.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
  }
}

/** Opens http(s) / mailto links in the system browser or mail app (anything else is ignored). */
export async function openExternal(url: string) {
  if (!/^(https?:|mailto:)/i.test(url)) return;
  if (isTauri) { const { openUrl } = await import("@tauri-apps/plugin-opener"); await openUrl(url); }
  else window.open(url, "_blank", "noopener");
}
