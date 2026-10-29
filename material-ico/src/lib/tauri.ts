import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'ico', 'avif'];
export const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
export const baseName = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p;
export const isImagePath = (p: string) => IMAGE_EXT.includes(extOf(p));

export interface PickedFile { name: string; bytes: Uint8Array }

export async function readFile(path: string): Promise<Uint8Array> {
  const buf = await invoke<ArrayBuffer>('read_file', { path });
  return new Uint8Array(buf);
}

function browserPick(accept: string): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function pickImage(): Promise<PickedFile | null> {
  if (!isTauri) return browserPick(IMAGE_EXT.map((e) => '.' + e).join(','));
  const path = await open({ multiple: false, filters: [{ name: 'Images', extensions: IMAGE_EXT }] });
  if (typeof path !== 'string') return null;
  return { name: baseName(path), bytes: await readFile(path) };
}

export async function pickIco(): Promise<PickedFile | null> {
  if (!isTauri) return browserPick('.ico');
  const path = await open({ multiple: false, filters: [{ name: 'Icon', extensions: ['ico'] }] });
  if (typeof path !== 'string') return null;
  return { name: baseName(path), bytes: await readFile(path) };
}

export async function pickFolder(): Promise<string | null> {
  if (!isTauri) return null;
  const path = await open({ directory: true, multiple: false });
  return typeof path === 'string' ? path : null;
}

/** Returns the full saved path, or null when cancelled. Honors the user's save-location setting. */
export async function saveIco(bytes: Uint8Array, defaultName: string, opt: { mode: 'ask' | 'folder'; dir: string | null }): Promise<string | null> {
  if (!isTauri) {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/x-icon' }));
    const a = document.createElement('a');
    a.href = url; a.download = defaultName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return defaultName;
  }
  const dir = opt.dir && (await folderExists(opt.dir)) ? opt.dir : null;
  const path = opt.mode === 'folder' && dir
    ? await invoke<string>('unique_path', { dir, name: defaultName })
    : await save({ defaultPath: dir ? `${dir}\\${defaultName}` : defaultName, filters: [{ name: 'Icon', extensions: ['ico'] }] });
  if (!path) return null;
  await invoke('save_file', bytes, { headers: { path: encodeURIComponent(path) } });
  return path;
}

export async function applyFolderIcon(folder: string, bytes: Uint8Array) {
  if (!isTauri) throw new Error('desktop-only');
  return invoke<string>('apply_folder_icon', bytes, { headers: { folder: encodeURIComponent(folder) } });
}
export const removeFolderIcon = (folder: string) => invoke<void>('remove_folder_icon', { folder });
export const folderExists = (path: string) => (isTauri ? invoke<boolean>('path_exists', { path }) : Promise.resolve(true));
export const revealFolder = (path: string) => invoke<void>('reveal_in_explorer', { path });

export async function openLink(url: string) {
  if (isTauri) await openUrl(url);
  else window.open(url, '_blank', 'noopener');
}
