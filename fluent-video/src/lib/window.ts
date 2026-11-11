import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import type { Backdrop, ThemeMode } from './types';

let saved: { w: number; h: number; maximized: boolean } | null = null;

export const win = () => getCurrentWindow();

export async function setFullscreen(on: boolean) {
  await win().setFullscreen(on);
}

export async function enterMini() {
  const w = win();
  if (await w.isFullscreen()) await w.setFullscreen(false);
  const maximized = await w.isMaximized();
  if (maximized) await w.unmaximize();
  const f = await w.scaleFactor();
  const s = (await w.innerSize()).toLogical(f);
  saved = { w: s.width, h: s.height, maximized };
  await w.setMinSize(new LogicalSize(320, 180));
  await w.setSize(new LogicalSize(480, 270));
  await w.setAlwaysOnTop(true);
}

export async function exitMini(alwaysOnTop: boolean) {
  const w = win();
  await w.setSize(new LogicalSize(saved?.w ?? 1280, saved?.h ?? 780));
  await w.setMinSize(new LogicalSize(800, 500));
  await w.setAlwaysOnTop(alwaysOnTop);
  if (saved?.maximized) await w.maximize(); // back to the state the window had before the mini player
}

/**
 * Window material (Windows 11 backdrop). The backend falls back Mica Alt -> Mica -> Acrylic when the OS lacks a material
 * and reports what was really applied; 'none' means no material is available, so the UI switches to opaque layers.
 */
export type AppliedBackdrop = Backdrop | 'none';

export async function applyBackdrop(kind: Backdrop, dark: boolean, mode: ThemeMode): Promise<AppliedBackdrop> {
  const root = document.documentElement;
  try {
    // keep the Windows window theme in step with the app theme so the material is tinted light / dark correctly
    await win().setTheme(mode === 'system' ? null : mode);
  } catch { /* ignore */ }
  try {
    const applied = await invoke<string>('set_backdrop', { kind, dark });
    root.dataset.solid = 'false';
    root.dataset.backdrop = applied;
    return applied as Backdrop;
  } catch {
    root.dataset.solid = 'true';
    root.dataset.backdrop = 'none';
    return 'none';
  }
}
