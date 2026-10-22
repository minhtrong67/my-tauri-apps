import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { downloadDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { WindowMode } from "./store";
import { LANGUAGES } from "./constants";

export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Apply the startup window option, then reveal the window (it is created hidden: no white flash). */
export async function applyStartup(mode: WindowMode, size: { w: number; h: number } | null) {
  if (!isTauri()) return;
  const w = getCurrentWindow();
  try {
    if (mode === "maximized") await w.maximize();
    else if (size && size.w >= 640 && size.h >= 480) {
      await w.setSize(new LogicalSize(size.w, size.h));
      await w.center();
    }
  } finally {
    await w.show();
    await w.setFocus();
  }
}

/** Reports the logical size whenever the user resizes the window (ignores maximized / minimized states). */
export async function watchWindowSize(cb: (s: { w: number; h: number }) => void) {
  if (!isTauri()) return () => {};
  const w = getCurrentWindow();
  let timer: number | undefined;
  const un = await w.onResized(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      if ((await w.isMaximized()) || (await w.isMinimized()) || (await w.isFullscreen())) return;
      const [size, f] = await Promise.all([w.innerSize(), w.scaleFactor()]);
      cb({ w: Math.round(size.width / f), h: Math.round(size.height / f) });
    }, 400);
  });
  return () => { window.clearTimeout(timer); un(); };
}

export async function saveBlob(blob: Blob, name: string, ask: boolean): Promise<string | null> {
  if (!isTauri()) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return name;
  }
  const ext = name.split(".").pop() ?? "png";
  const base = await downloadDir();
  let path: string | null;
  if (ask) {
    path = await save({ defaultPath: await join(base, name), filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
    if (!path) return null;
  } else {
    path = await join(base, name);
  }
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
  return path;
}

export async function pickCodeFile(): Promise<{ name: string; text: string } | null> {
  if (!isTauri()) return null;
  const path = await open({
    multiple: false,
    filters: [
      { name: "Code", extensions: LANGUAGES.flatMap((l) => l.exts) },
      { name: "All", extensions: ["*"] },
    ],
  });
  if (!path || Array.isArray(path)) return null;
  const text = await readTextFile(path);
  return { name: path.split(/[\\/]/).pop() ?? "code.txt", text };
}

export async function openLink(url: string) {
  if (isTauri()) await openUrl(url);
  else window.open(url, "_blank", "noopener");
}
