import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
type Sz = { w: number; h: number };
type Cfg = { windowMode: string; winSize: Sz | null };
const isTauri = () => '__TAURI_INTERNALS__' in window;

export async function initWindow(get: () => Cfg, onSize: (s: Sz) => void) {
  if (!isTauri()) return;
  const w = getCurrentWindow(), s = get();
  try {
    if (s.windowMode === 'maximized') await w.maximize();
    else if (s.winSize) await w.setSize(new LogicalSize(s.winSize.w, s.winSize.h));
  } catch (e) { console.warn(e); }
  await w.show();
  let timer: number;
  await w.onResized(() => { clearTimeout(timer); timer = window.setTimeout(() => { if (get().windowMode === 'remember') captureSize(onSize); }, 350); });
}
export async function captureSize(onSize: (s: Sz) => void) {
  if (!isTauri()) return;
  try {
    const w = getCurrentWindow();
    if ((await w.isMaximized()) || (await w.isMinimized())) return;
    const sz = await w.innerSize(), f = await w.scaleFactor();
    onSize({ w: Math.round(sz.width / f), h: Math.round(sz.height / f) });
  } catch (e) { console.warn(e); }
}
