// Thin wrapper around the Tauri window API. Everything degrades gracefully in a plain browser.
import { settings, persist, writeNow } from './store.js';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
let win = null, api = null;

async function load() {
  if (!isTauri) return false;
  if (!win) {
    api = await import('@tauri-apps/api/window');
    win = api.getCurrentWindow();
  }
  return true;
}

const MIN_W = 420, MIN_H = 620;

/** Applies the saved window preference, then shows the window (it starts hidden to avoid flicker). */
export async function startWindow() {
  if (!(await load())) return;
  try {
    const mode = settings.get('windowMode');
    if (mode === 'maximize') {
      await win.maximize();
    } else {
      const saved = persist.read('window', null);
      if (saved && saved.width >= MIN_W && saved.height >= MIN_H) {
        await win.setSize(new api.LogicalSize(saved.width, saved.height));
        await win.center();
        if (saved.maximized) await win.maximize();
      }
    }
    if (settings.get('alwaysOnTop')) await win.setAlwaysOnTop(true);
    await syncNativeTheme();
  } catch (e) { console.warn('window setup failed', e); }
  finally { try { await win.show(); await win.setFocus(); } catch { /* ignore */ } }
  trackResize();
}

let resizeTimer;
async function saveSize() {
  if (settings.get('windowMode') !== 'remember') return;
  try {
    if (await win.isMinimized()) return;
    const prev = persist.read('window', {}) || {};
    if (await win.isMaximized()) { writeNow('window', { ...prev, maximized: true }); return; }
    const scale = await win.scaleFactor();
    const size = (await win.innerSize()).toLogical(scale);
    if (size.width < MIN_W || size.height < MIN_H) return;
    writeNow('window', { width: Math.round(size.width), height: Math.round(size.height), maximized: false });
  } catch { /* ignore */ }
}
function trackResize() {
  win.onResized(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(saveSize, 400); });
  settings.on('windowMode', (m) => { if (m === 'remember') saveSize(); });
}

export async function setAlwaysOnTop(on) { if (await load()) try { await win.setAlwaysOnTop(on); } catch { /* ignore */ } }
export async function syncNativeTheme() {
  if (!(await load())) return;
  const m = settings.get('theme');
  try { await win.setTheme(m === 'system' ? null : m); } catch { /* ignore */ }
}
