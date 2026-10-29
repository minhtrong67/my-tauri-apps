import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize, PhysicalPosition, availableMonitors } from '@tauri-apps/api/window';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { settings, update } from './settings';
import { basename } from './ui';
import { debounce } from './bus';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Resolve with the promise's value, or `fallback` if it rejects or takes longer than `ms` (a stalled native call must never freeze the UI). */
export function guard<T>(p: Promise<T> | T, ms = 1500, fallback?: T): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    Promise.resolve(p).then((v) => { clearTimeout(timer); resolve(v); }, () => { clearTimeout(timer); resolve(fallback); });
  });
}

export interface LoadedFile { path: string | null; name: string; text: string }

const FILTERS = [
  { name: 'JSON', extensions: ['json', 'jsonc', 'json5', 'geojson', 'webmanifest', 'har'] },
  { name: 'All files', extensions: ['*'] },
];

export async function readPath(path: string): Promise<LoadedFile> {
  const text = await invoke<string>('read_text_file', { path });
  return { path, name: basename(path), text };
}

/** Show the native open dialog (or a browser file picker) and read the chosen files. */
export async function pickFiles(): Promise<LoadedFile[]> {
  if (isTauri) {
    const sel = await openDialog({ multiple: true, filters: FILTERS });
    const paths = sel == null ? [] : Array.isArray(sel) ? sel : [sel];
    return Promise.all(paths.map(readPath));
  }
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = '.json,.jsonc,.json5,.geojson,application/json,text/*';
    inp.onchange = async () => resolve(await Promise.all(Array.from(inp.files ?? []).map(fromFile)));
    inp.oncancel = () => resolve([]);
    inp.click();
  });
}

export async function fromFile(f: File): Promise<LoadedFile> {
  return { path: null, name: f.name, text: (await f.text()).replace(/^\uFEFF/, '') };
}

/** Save text. Returns the final path (or name in browser mode), or null when cancelled. */
export async function saveText(opts: { text: string; path?: string | null; name: string; filters?: { name: string; extensions: string[] }[] }): Promise<string | null> {
  if (isTauri) {
    let path = opts.path ?? null;
    if (!path) {
      path = await saveDialog({ defaultPath: opts.name, filters: opts.filters ?? [{ name: 'JSON', extensions: ['json'] }, { name: 'All files', extensions: ['*'] }] });
      if (!path) return null;
    }
    await invoke('write_text_file', { path, content: opts.text });
    return path;
  }
  const url = URL.createObjectURL(new Blob([opts.text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: opts.name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return opts.name;
}

export async function saveTextAs(opts: { text: string; name: string; filters?: { name: string; extensions: string[] }[] }) {
  return saveText({ ...opts, path: null });
}

export async function launchFiles(): Promise<string[]> {
  if (!isTauri) return [];
  try { return await invoke<string[]>('launch_files'); } catch { return []; }
}

export function onOpenFiles(cb: (paths: string[]) => void) {
  if (isTauri) void guard(listen<string[]>('open-files', (e) => cb(e.payload ?? [])), 3000);
}

/** Files dropped on the window (native in Tauri, HTML5 in the browser). */
export function onFilesDropped(cb: (files: LoadedFile[]) => void, hover: (on: boolean) => void) {
  if (isTauri) {
    void guard(getCurrentWebview().onDragDropEvent(async (e) => {
      const p = e.payload;
      if (p.type === 'over' || p.type === 'enter') hover(true);
      else if (p.type === 'leave') hover(false);
      else if (p.type === 'drop') {
        hover(false);
        const files: LoadedFile[] = [];
        for (const path of p.paths) { try { files.push(await readPath(path)); } catch { /* skip unreadable */ } }
        if (files.length) cb(files);
      }
    }), 3000);
    return;
  }
  let depth = 0;
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types.includes('Files')) { depth++; hover(true); } });
  window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) hover(false); });
  window.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', async (e) => {
    if (!e.dataTransfer?.files.length) return;
    e.preventDefault(); depth = 0; hover(false);
    cb(await Promise.all(Array.from(e.dataTransfer.files).map(fromFile)));
  });
}

/* ───────────────────────────── window ───────────────────────────── */

export async function setWindowTitle(title: string) {
  if (isTauri) void guard(getCurrentWindow().setTitle(title), 1500);
  document.title = title;
}

async function onScreen(x: number, y: number): Promise<boolean> {
  try {
    const mons = await availableMonitors();
    return mons.some((m) => x >= m.position.x - 40 && x < m.position.x + m.size.width - 80 && y >= m.position.y - 10 && y < m.position.y + m.size.height - 80);
  } catch { return true; }
}

/** Apply the window start-up behaviour chosen in Settings, then reveal the window. Every native call is time-boxed. */
export async function initWindow() {
  if (!isTauri) return;
  const win = getCurrentWindow();
  try {
    if (settings.windowMode === 'maximized') await guard(win.maximize());
    else if (settings.window) {
      const s = settings.window;
      await guard(win.setSize(new LogicalSize(Math.max(480, s.w), Math.max(520, s.h))));
      if (s.x !== undefined && s.y !== undefined && (await guard(onScreen(s.x, s.y), 1000, true))) await guard(win.setPosition(new PhysicalPosition(s.x, s.y)));
      else await guard(win.center());
      if (s.maximized) await guard(win.maximize());
    }
  } catch (e) { console.warn('window init', e); }
  await guard(win.show());
  await guard(win.setFocus());

  const save = debounce(async () => {
    if (settings.windowMode !== 'remember') return;
    try {
      if (await win.isMinimized()) return;
      if (await win.isMaximized()) { update({ window: { ...(settings.window ?? { w: 1180, h: 760 }), maximized: true } }); return; }
      const [size, pos, f] = await Promise.all([win.innerSize(), win.outerPosition(), win.scaleFactor()]);
      if (pos.x < -10000) return;
      update({ window: { w: Math.round(size.width / f), h: Math.round(size.height / f), x: pos.x, y: pos.y, maximized: false } });
    } catch { /* ignore */ }
  }, 450);
  void guard(win.onResized(save), 3000);
  void guard(win.onMoved(save), 3000);
}

/** Persist the current window geometry immediately (used when the user switches to "remember"). */
export async function captureWindow() {
  if (!isTauri) return;
  const win = getCurrentWindow();
  try {
    if (await win.isMaximized()) { update({ window: { ...(settings.window ?? { w: 1180, h: 760 }), maximized: true } }); return; }
    const [size, pos, f] = await Promise.all([win.innerSize(), win.outerPosition(), win.scaleFactor()]);
    update({ window: { w: Math.round(size.width / f), h: Math.round(size.height / f), x: pos.x, y: pos.y, maximized: false } });
  } catch { /* ignore */ }
}

export function onCloseRequested(handler: () => Promise<boolean>) {
  if (isTauri) {
    const win = getCurrentWindow();
    void guard(win.onCloseRequested(async (e) => {
      e.preventDefault();
      let ok = true;
      try { ok = await handler(); } catch (err) { console.error(err); }
      if (ok) await win.destroy();
    }), 3000);
  }
}
