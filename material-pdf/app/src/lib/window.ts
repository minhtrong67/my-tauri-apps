import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "./native";

const KEY = "mpdf.window";
interface WinState { w: number; h: number; x: number; y: number; max: boolean }
type Startup = "remember" | "maximize";

let startup: Startup = "remember";
let timer: number | undefined;

async function snapshot() {
  if (!isTauri || startup !== "remember") return;
  const win = getCurrentWindow();
  const max = await win.isMaximized();
  const prev: WinState | null = JSON.parse(localStorage.getItem(KEY) ?? "null");
  if (max && prev) return localStorage.setItem(KEY, JSON.stringify({ ...prev, max: true }));
  const [s, p] = await Promise.all([win.innerSize(), win.outerPosition()]);
  localStorage.setItem(KEY, JSON.stringify({ w: s.width, h: s.height, x: p.x, y: p.y, max } satisfies WinState));
}
const schedule = () => { clearTimeout(timer); timer = window.setTimeout(snapshot, 350); };

/** Applies the startup behaviour, then shows the (initially hidden) window. */
export async function initWindow(mode: Startup) {
  startup = mode;
  if (!isTauri) return;
  const win = getCurrentWindow();
  try {
    if (mode === "maximize") await win.maximize();
    else {
      const st: WinState | null = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (st) {
        if (st.max) await win.maximize();
        else {
          await win.setSize(new PhysicalSize(st.w, st.h));
          await win.setPosition(new PhysicalPosition(Math.max(0, st.x), Math.max(0, st.y)));
        }
      }
    }
  } finally {
    await win.show();
  }
  win.onResized(schedule);
  win.onMoved(schedule);
}

export function setStartupMode(mode: Startup) {
  startup = mode;
  if (mode === "remember") snapshot();
}

export async function setFullscreen(on: boolean) {
  if (isTauri) await getCurrentWindow().setFullscreen(on);
  else if (on) await document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) await document.exitFullscreen();
}

export async function setWindowTitle(title: string) {
  document.title = title;
  if (isTauri) await getCurrentWindow().setTitle(title);
}

export async function onCloseRequest(handler: () => boolean | Promise<boolean>) {
  if (!isTauri) return;
  const win = getCurrentWindow();
  await win.onCloseRequested(async (e) => { if (await handler()) e.preventDefault(); });
}
export const destroyWindow = () => (isTauri ? getCurrentWindow().destroy() : Promise.resolve());
