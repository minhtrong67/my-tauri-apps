import { useStore } from './store';

export const inTauri = () => !!(window as any).__TAURI_INTERNALS__;
type Win = import('@tauri-apps/api/window').Window;
let win: Win | null = null;
let Logical: typeof import('@tauri-apps/api/window').LogicalSize | null = null;
let timer = 0;
const MIN = { w: 820, h: 600 };

export async function initWindow() {
  if (!inTauri()) return;
  try {
    const api = await import('@tauri-apps/api/window');
    win = api.getCurrentWindow();
    Logical = api.LogicalSize;
    await applyWindowMode();
    if (useStore.getState().settings.alwaysOnTop) await win.setAlwaysOnTop(true);
    await win.onResized(() => {
      clearTimeout(timer);
      timer = window.setTimeout(saveSize, 400);
    });
  } catch (e) {
    console.warn('window init failed', e);
  } finally {
    try {
      await win?.show();
      await win?.setFocus();
    } catch {
      /* the Rust-side safety net shows the window */
    }
  }
}

async function saveSize() {
  const st = useStore.getState();
  if (!win || st.settings.windowMode !== 'remember') return;
  try {
    if ((await win.isMaximized()) || (await win.isMinimized()) || (await win.isFullscreen())) return;
    const sz = (await win.innerSize()).toLogical(await win.scaleFactor());
    st.saveSize({ w: Math.round(sz.width), h: Math.round(sz.height) });
  } catch {
    /* ignore */
  }
}

/** Applies the "remember size" / "always maximized" option (also when the user switches it). */
export async function applyWindowMode() {
  if (!win || !Logical) return;
  const { settings, size } = useStore.getState();
  try {
    if (settings.windowMode === 'maximized') return void (await win.maximize());
    if (await win.isMaximized()) await win.unmaximize();
    if (size) {
      await win.setSize(new Logical(Math.min(Math.max(size.w, MIN.w), screen.availWidth), Math.min(Math.max(size.h, MIN.h), screen.availHeight)));
      await win.center();
    }
  } catch (e) {
    console.warn('applyWindowMode failed', e);
  }
}
export async function setTitle(title: string) {
  try {
    await win?.setTitle(title);
  } catch {
    /* ignore */
  }
}
export async function setOnTop(v: boolean) {
  try {
    await win?.setAlwaysOnTop(v);
  } catch {
    /* ignore */
  }
}
export async function openExternal(url: string) {
  if (inTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      return await openUrl(url);
    } catch (e) {
      console.warn(e);
    }
  }
  window.open(url, '_blank', 'noopener');
}
