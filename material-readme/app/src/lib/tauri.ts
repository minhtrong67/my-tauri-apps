// Thin wrapper over the Tauri APIs, with browser fallbacks so the UI can also run in a plain browser (npm run web:dev).
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import { baseName } from './utils';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const DOC_RE = /\.(md|markdown|mdown|mkd|txt)$/i;
const FILTERS = [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'] }];

export interface RawDoc { path: string; name: string; size: number; mtime: number; text: string; lossy: boolean }
export type WinMode = 'remember' | 'maximized';

export async function readBrowserFile(f: File): Promise<RawDoc> {
  return { path: '', name: f.name, size: f.size, mtime: 0, text: await f.text(), lossy: false };
}
function pickBrowser(): Promise<RawDoc[]> {
  return new Promise((res) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = '.md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain';
    inp.onchange = async () => res(await Promise.all([...(inp.files || [])].map(readBrowserFile)));
    inp.click();
  });
}

export const api = {
  readDoc: (path: string) => invoke<RawDoc>('read_doc', { path }),
  writeDoc: (path: string, text: string) => invoke<{ mtime: number; size: number }>('write_doc', { path, text }),
  mtime: (path: string) => invoke<number>('file_mtime', { path }),
  asset: (base: string, rel: string) => invoke<[string, string]>('read_asset', { base, rel }),
  saveImage: (base: string, name: string, data: string) => invoke<string>('save_image', { base, name, data }),
  startupDocs: () => (isTauri ? invoke<RawDoc[]>('startup_docs') : Promise.resolve([] as RawDoc[])),
  setDirty: (dirty: boolean) => { if (isTauri) invoke('set_dirty', { dirty }).catch(() => {}); },
  ready: () => { if (isTauri) invoke('app_ready').catch(() => {}); },
  forceClose: () => invoke('force_close'),
  getWinMode: () => (isTauri ? invoke<WinMode>('get_window_mode') : Promise.resolve('remember' as WinMode)),
  setWinMode: (mode: WinMode) => (isTauri ? invoke('set_window_mode', { mode }) : Promise.resolve()),

  async pickDocs(defaultPath?: string): Promise<RawDoc[]> {
    if (!isTauri) return pickBrowser();
    const p = await openDialog({ multiple: true, filters: FILTERS, defaultPath: defaultPath || undefined });
    const list = !p ? [] : Array.isArray(p) ? p : [p];
    const docs = await Promise.all(list.map((x) => api.readDoc(typeof x === 'string' ? x : (x as { path: string }).path).catch(() => null)));
    return docs.filter(Boolean) as RawDoc[];
  },
  async pickSave(name: string, dir = '', filters = FILTERS): Promise<string | null> {
    if (!isTauri) return null;
    const sep = dir.includes('\\') ? '\\' : '/';
    return (await saveDialog({ defaultPath: dir ? dir.replace(/[\\/]$/, '') + sep + name : name, filters })) || null;
  },
  async pickDir(current = ''): Promise<string | null> {
    if (!isTauri) return null;
    const p = await openDialog({ directory: true, multiple: false, defaultPath: current || undefined });
    return typeof p === 'string' ? p : null;
  },
  openUrl(url: string) { if (isTauri) return openUrl(url).catch(() => {}); window.open(url, '_blank'); },
  reveal(path: string) { if (isTauri) return revealItemInDir(path).catch(() => {}); },
  async copy(text: string) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } },
  win() { return isTauri ? getCurrentWindow() : null; },
  listen<T>(ev: string, cb: (payload: T) => void): Promise<UnlistenFn> {
    return isTauri ? listen<T>(ev, (e) => cb(e.payload)) : Promise.resolve(() => {});
  },
  listenRaw(ev: string, cb: (e: { payload: unknown }) => void): Promise<UnlistenFn> {
    return isTauri ? listen(ev, cb) : Promise.resolve(() => {});
  },
  setTitle(s: string) { try { api.win()?.setTitle(s); } catch { /* ignore */ } },
  setTheme(mode: 'system' | 'light' | 'dark') { try { api.win()?.setTheme(mode === 'system' ? null : mode); } catch { /* ignore */ } },
};
export { baseName };
