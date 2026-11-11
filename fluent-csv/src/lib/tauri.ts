// Thin wrapper over the Tauri 2 JS API. Every call is guarded so the UI also runs in a plain browser (dev, screenshots).
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { listen } from '@tauri-apps/api/event';
import { open as openDlg, save as saveDlg } from '@tauri-apps/plugin-dialog';

export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const win = inTauri ? getCurrentWindow() : null;

export const inv = <T,>(cmd: string, args?: Record<string, unknown>) => invoke<T>(cmd, args);
export const pickOpen = (filters: { name: string; extensions: string[] }[]) => openDlg({ multiple: true, filters });
export const pickSave = (defaultPath: string, filters: { name: string; extensions: string[] }[]) => saveDlg({ defaultPath, filters });
export const onFiles = (cb: (paths: string[]) => void) => (inTauri ? listen<string[]>('open-files', e => cb(e.payload)) : Promise.resolve(() => {}));
export const onDragDrop = (cb: (ev: { type: string; paths?: string[] }) => void) => (inTauri ? getCurrentWebview().onDragDropEvent(e => cb(e.payload as { type: string; paths?: string[] })) : Promise.resolve(() => {}));
export const defaultSize = () => new LogicalSize(1280, 800);
