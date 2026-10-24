import { invoke as tauriInvoke, convertFileSrc as tauriConvert } from '@tauri-apps/api/core';
import { listen as tauriListen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import type { DupGroup, Drive, Entry, Place, Props, SearchOpts, SizeItem, Tools } from './types';
import { mockInvoke } from './mock';

export const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (IS_TAURI) return tauriInvoke<T>(cmd, args);
  return mockInvoke(cmd, args) as Promise<T>;
}
export const convertFileSrc = (p: string) => (IS_TAURI ? tauriConvert(p) : p);
export const appWindow = IS_TAURI ? getCurrentWindow() : null;
export async function listen<T>(event: string, cb: (payload: T) => void): Promise<UnlistenFn> {
  if (!IS_TAURI) return () => {};
  return tauriListen<T>(event, (e) => cb(e.payload));
}
export async function onFileDrop(cb: (e: { type: 'enter' | 'over' | 'drop' | 'leave'; paths?: string[]; x?: number; y?: number }) => void): Promise<UnlistenFn> {
  if (!IS_TAURI) return () => {};
  return getCurrentWebview().onDragDropEvent((ev) => {
    const p = ev.payload as { type: string; paths?: string[]; position?: { x: number; y: number } };
    const t = p.type === 'enter' ? 'enter' : p.type === 'over' ? 'over' : p.type === 'drop' ? 'drop' : 'leave';
    const r = window.devicePixelRatio || 1;
    cb({ type: t, paths: p.paths, x: p.position ? p.position.x / r : undefined, y: p.position ? p.position.y / r : undefined });
  });
}

export const api = {
  listDir: (path: string) => call<Entry[]>('list_dir', { path }),
  searchDir: (root: string, query: string, limit: number, opts: SearchOpts) => call<Entry[]>('search_dir', { root, query, limit, opts }),
  getPlaces: () => call<Place[]>('get_places'),
  getDrives: () => call<Drive[]>('get_drives'),
  openItem: (path: string) => call<void>('open_item', { path }),
  createItem: (dir: string, name: string, isDir: boolean) => call<string>('create_item', { dir, name, isDir }),
  renameItem: (path: string, newName: string) => call<string>('rename_item', { path, newName }),
  deleteItems: (paths: string[], permanent: boolean) => call<void>('delete_items', { paths, permanent }),
  pasteItems: (sources: string[], dest: string, mv: boolean, policy: string) => call<string[]>('paste_items', { sources, dest, mv, policy }),
  checkConflicts: (sources: string[], dest: string) => call<string[]>('check_conflicts', { sources, dest }),
  itemProperties: (path: string) => call<Props>('item_properties', { path }),
  toolsAvailable: () => call<Tools>('tools_available'),
  openWith: (tool: string, path: string) => call<void>('open_with', { tool, path }),
  revealItem: (path: string) => call<void>('reveal_item', { path }),
  extractArchive: (path: string, dest: string, toFolder: boolean) => call<string>('extract_archive', { path, dest, toFolder }),
  compressItems: (paths: string[], destDir: string, name: string, kind: string) => call<string>('compress_items', { paths, destDir, name, kind }),
  previewText: (path: string) => call<string>('preview_text', { path }),
  startupPath: () => call<string | null>('startup_path'),
  cancelOp: () => call<void>('cancel_op'),
  newWindow: (path: string | null) => call<void>('new_window', { path }),
  setWallpaper: (path: string) => call<void>('set_wallpaper', { path }),
  watchDir: (id: string, path: string) => call<void>('watch_dir', { id, path }),
  getThumbnail: (path: string, size: number) => call<string>('get_thumbnail', { path, size }),
  clearThumbCache: () => call<number>('clear_thumb_cache'),
  findDuplicates: (root: string, minSize: number) => call<DupGroup[]>('find_duplicates', { root, minSize }),
  folderSizes: (path: string) => call<SizeItem[]>('folder_sizes', { path }),
  setTray: (enabled: boolean, labels: string[]) => call<void>('set_tray', { enabled, labels }),
  setGlobalShortcut: (enabled: boolean) => call<void>('set_global_shortcut', { enabled })
};
