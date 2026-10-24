import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { fitWebview } from './tauri';

export const win = () => getCurrentWindow();

/**
 * Fullscreen for a frameless window on Windows. The drop shadow is what leaves a black strip with a white edge at the bottom,
 * so only the shadow is switched off (no un-maximize / re-maximize, which made the window jump).
 */
export async function setFullscreen(on: boolean) {
  const w = win();
  if (on) {
    await w.setShadow(false).catch(() => undefined);
    await w.setFullscreen(true);
  } else {
    await w.setFullscreen(false);
    window.setTimeout(() => void w.setShadow(true).catch(() => undefined), 250);
  }
  // the web view can keep the previous size (black strip at the bottom): ask the backend to fit it, once now and once after the animation
  window.setTimeout(() => void fitWebview(), 80);
  window.setTimeout(() => void fitWebview(), 400);
}

let saved: { w: number; h: number } | null = null;

export async function enterMini() {
  const win = getCurrentWindow();
  if (await win.isMaximized()) await win.unmaximize();
  const f = await win.scaleFactor();
  const s = (await win.innerSize()).toLogical(f);
  saved = { w: s.width, h: s.height };
  await win.setMinSize(new LogicalSize(340, 160));
  await win.setSize(new LogicalSize(380, 196));
  await win.setResizable(false);
  await win.setAlwaysOnTop(true);
}

export async function exitMini(alwaysOnTop: boolean) {
  const win = getCurrentWindow();
  await win.setResizable(true);
  await win.setSize(new LogicalSize(saved?.w ?? 1240, saved?.h ?? 800));
  await win.setMinSize(new LogicalSize(900, 600));
  await win.setAlwaysOnTop(alwaysOnTop);
}
