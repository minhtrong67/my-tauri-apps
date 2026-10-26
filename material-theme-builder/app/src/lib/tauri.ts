/* Thin wrappers around Tauri APIs. Everything degrades gracefully in a plain browser. */

export const isTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface WindowSize {
  w: number;
  h: number;
}

export type WindowMode = "remember" | "maximized";

const MIN_W = 860;
const MIN_H = 600;

/** Restores the window according to the user's preference, then reveals it (it starts hidden). */
export async function applyWindowOnStart(mode: WindowMode, saved: WindowSize | null): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow, LogicalSize } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  try {
    if (mode === "maximized") {
      await win.maximize();
    } else if (saved && saved.w >= MIN_W && saved.h >= MIN_H) {
      await win.setSize(new LogicalSize(saved.w, saved.h));
      await win.center();
    }
  } catch (err) {
    console.warn("Could not restore window state", err);
  } finally {
    await win.show();
  }
}

export async function maximizeWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().maximize();
}

/** Reports the (non-maximized) logical size after the user resizes the window. */
export async function trackWindowSize(onSize: (s: WindowSize) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  let timer: number | undefined;
  const unlisten = await win.onResized(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      try {
        if ((await win.isMaximized()) || (await win.isMinimized())) return;
        const [size, factor] = await Promise.all([win.innerSize(), win.scaleFactor()]);
        const logical = size.toLogical(factor);
        onSize({ w: Math.round(logical.width), h: Math.round(logical.height) });
      } catch {
        /* ignore */
      }
    }, 400);
  });
  return () => {
    window.clearTimeout(timer);
    unlisten();
  };
}

/** Saves a text file: native "Save as" dialog in the desktop app, a download in the browser. */
export async function saveTextFile(defaultName: string, content: string, ext: string): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
    if (!path) return false;
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(path, content);
    return true;
  }
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Saves binary data (e.g. a .zip): native "Save as" dialog in the desktop app, a download in the browser. */
export async function saveBinaryFile(defaultName: string, data: Uint8Array, ext: string, mime = "application/octet-stream"): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
    if (!path) return false;
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(path, data);
    return true;
  }
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/** Opens an http(s) URL in the system browser (falls back to a new tab on the web). */
export async function openExternal(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
