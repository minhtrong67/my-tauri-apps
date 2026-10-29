import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { isTauri } from './tauri';

const SIZE_KEY = 'mico.windowSize';
type Mode = 'remember' | 'maximized';

export async function setNativeTheme(theme: 'light' | 'dark' | null) {
  if (!isTauri) return;
  try { await getCurrentWindow().setTheme(theme); } catch { /* not critical */ }
}

/** Applies the chosen launch behaviour, then reveals the window (it starts hidden to avoid flicker). */
export async function initWindow(mode: Mode) {
  if (!isTauri) return;
  const win = getCurrentWindow();
  try {
    if (mode === 'maximized') {
      await win.maximize();
    } else {
      const saved = JSON.parse(localStorage.getItem(SIZE_KEY) || 'null') as { w: number; h: number } | null;
      if (saved && saved.w >= 760 && saved.h >= 560) {
        await win.setSize(new LogicalSize(saved.w, saved.h));
        await win.center();
      }
    }
  } catch { /* fall through and just show the window */ }
  await win.show();
}

export async function saveWindowSize() {
  if (!isTauri) return;
  try {
    const win = getCurrentWindow();
    if (await win.isMaximized()) return;
    const [inner, scale] = await Promise.all([win.innerSize(), win.scaleFactor()]);
    localStorage.setItem(SIZE_KEY, JSON.stringify({ w: Math.round(inner.width / scale), h: Math.round(inner.height / scale) }));
  } catch { /* ignore */ }
}

/** Keeps the saved size up to date while the user resizes the window. */
export function trackWindowSize(getMode: () => Mode) {
  if (!isTauri) return () => {};
  let timer: number | undefined;
  let un: (() => void) | undefined;
  getCurrentWindow()
    .onResized(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { if (getMode() === 'remember') void saveWindowSize(); }, 400);
    })
    .then((f) => (un = f))
    .catch(() => {});
  return () => { window.clearTimeout(timer); un?.(); };
}
