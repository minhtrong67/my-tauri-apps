/** Thin wrappers around Tauri so the UI also runs in a plain browser (npm run web). */
import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getCurrentWebview } from '@tauri-apps/api/webview'

export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const invoke = <T,>(cmd: string, args?: Record<string, unknown>, opts?: { headers: Record<string, string> }) =>
  tauriInvoke<T>(cmd, args, opts)

export const appWindow = () => (isTauri() ? getCurrentWindow() : null)

export async function setNativeTheme(mode: 'system' | 'light' | 'dark') {
  try { await appWindow()?.setTheme(mode === 'system' ? null : mode) } catch { /* not critical */ }
}

export async function openExternal(url: string) {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } else window.open(url, '_blank', 'noopener')
}

export async function openFolder(path: string) {
  const { openPath } = await import('@tauri-apps/plugin-opener')
  await openPath(path)
}

export async function onFileDrop(cb: (paths: string[]) => void, onHover: (over: boolean) => void) {
  if (!isTauri()) return () => {}
  const un = await getCurrentWebview().onDragDropEvent((e) => {
    const p = e.payload
    if (p.type === 'enter' || p.type === 'over') onHover(true)
    else if (p.type === 'leave') onHover(false)
    else if (p.type === 'drop') { onHover(false); cb(p.paths) }
  })
  return un
}

export async function pickImages(multiple: boolean): Promise<string[]> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const r = await open({ multiple, filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }] })
  return r == null ? [] : Array.isArray(r) ? r : [r]
}
export async function pickFolder(): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const r = await open({ directory: true, multiple: false })
  return typeof r === 'string' ? r : null
}

export const MIMES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
}

export async function readImageFile(path: string): Promise<Blob> {
  const buf = await invoke<ArrayBuffer>('read_image', { path })
  const ext = path.split('.').pop()?.toLowerCase() ?? 'png'
  return new Blob([buf], { type: MIMES[ext] ?? 'image/png' })
}

/** Saves a blob. Returns the saved path (or null if the user cancelled). */
export async function saveBlob(blob: Blob, name: string, dir: string, ask: boolean): Promise<string | null> {
  if (!isTauri()) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = name; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    return name
  }
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const r = await invoke<string | null>('save_image', bytes as unknown as Record<string, unknown>, {
    headers: { 'x-name': encodeURIComponent(name), 'x-dir': encodeURIComponent(dir), 'x-ask': ask ? '1' : '0' },
  })
  return r
}

/** Captures the screen under the cursor. Returns an ImageBitmap. */
export async function captureScreen(delaySec: number): Promise<ImageBitmap> {
  const buf = await invoke<ArrayBuffer>('capture_screen', { delayMs: delaySec * 1000 })
  const dv = new DataView(buf)
  const w = dv.getUint32(0, true), h = dv.getUint32(4, true)
  const data = new ImageData(new Uint8ClampedArray(buf, 8, w * h * 4), w, h)
  return createImageBitmap(data)
}

export async function registerHotkey(accel: string, handler: () => void) {
  if (!isTauri()) return () => {}
  const gs = await import('@tauri-apps/plugin-global-shortcut')
  try { await gs.unregister(accel) } catch { /* not registered */ }
  await gs.register(accel, (e) => { if (e.state === 'Pressed') handler() })
  return () => { gs.unregister(accel).catch(() => {}) }
}
