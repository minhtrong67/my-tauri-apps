import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { PhysicalSize } from "@tauri-apps/api/dpi";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface FileData {
  content: string;
  eol: "crlf" | "lf";
  encoding: string;
  mtime: number;
}

export const win = () => (isTauri ? getCurrentWindow() : null);

export function readTextFile(path: string, encoding?: string): Promise<FileData> {
  return invoke<FileData>("read_text_file", { path, encoding: encoding ?? null });
}

/** Resolves with the file's new modification time (ms since epoch). */
export function writeTextFile(path: string, content: string, eol: string, encoding: string): Promise<number> {
  return invoke<number>("write_text_file", { path, content, eol, encoding });
}

export async function fileMtime(path: string): Promise<number | null> {
  try {
    return await invoke<number | null>("file_mtime", { path });
  } catch {
    return null;
  }
}

export const openUrl = (url: string) => (isTauri ? invoke("open_url", { url }) : Promise.resolve(void window.open(url, "_blank")));
export const startupFiles = () => invoke<string[]>("startup_files");
export const revealCursor = () => (isTauri ? invoke("reveal_cursor").catch(() => {}) : Promise.resolve());

export interface Filter {
  name: string;
  extensions: string[];
}

export async function pickFiles(filters: Filter[]): Promise<string[]> {
  const sel = await openDialog({ multiple: true, filters });
  if (!sel) return [];
  return Array.isArray(sel) ? sel : [sel];
}

export async function pickFolder(defaultPath?: string | null): Promise<string | null> {
  const sel = await openDialog({ directory: true, multiple: false, defaultPath: defaultPath ?? undefined });
  return typeof sel === "string" ? sel : null;
}

export const pickSavePath = (defaultPath: string, filters: Filter[]) => saveDialog({ defaultPath, filters });

export { PhysicalSize, listen, getCurrentWebview };
