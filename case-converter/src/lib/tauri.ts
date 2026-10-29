// Thin wrappers around Tauri APIs. Every function also works in a plain browser (npm run web:dev) with a fallback.

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export type WindowMode = 'remember' | 'maximized';
export type FileError = 'too_large' | 'binary' | 'other';

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function appReady() {
  if (isTauri) await call('app_ready').catch(() => {});
}

export async function getWindowMode(): Promise<WindowMode> {
  if (!isTauri) return 'remember';
  return (await call<string>('get_window_mode').catch(() => 'remember')) === 'maximized' ? 'maximized' : 'remember';
}

export async function setWindowMode(mode: WindowMode) {
  if (isTauri) await call('set_window_mode', { mode });
}

export async function setNativeTheme(theme: 'light' | 'dark' | null) {
  if (!isTauri) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().setTheme(theme).catch(() => {});
}

/** Window buttons for the custom title bar. */
export async function windowControls() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  return {
    minimize: () => win.minimize(),
    toggleMaximize: () => win.toggleMaximize(),
    close: () => win.close(),
    isMaximized: () => win.isMaximized(),
    onResized: (cb: () => void) => win.onResized(cb),
  };
}

/** Listens for text files dropped on the window. Returns an unsubscribe function. */
export async function listenFileDrop(onDrop: (path: string) => void, onHover: (over: boolean) => void) {
  if (!isTauri) return () => {};
  const { getCurrentWebview } = await import('@tauri-apps/api/webview');
  return getCurrentWebview().onDragDropEvent((e) => {
    const p = e.payload;
    if (p.type === 'enter' || p.type === 'over') onHover(true);
    else if (p.type === 'leave') onHover(false);
    else if (p.type === 'drop') {
      onHover(false);
      if (p.paths[0]) onDrop(p.paths[0]);
    }
  });
}

function toFileError(e: unknown): FileError {
  const m = String(e);
  return m.includes('too_large') ? 'too_large' : m.includes('binary') ? 'binary' : 'other';
}

export class FileOpenError extends Error {
  constructor(public kind: FileError) {
    super(kind);
  }
}

export async function readTextFile(path: string): Promise<string> {
  try {
    return await call<string>('read_text', { path });
  } catch (e) {
    throw new FileOpenError(toFileError(e));
  }
}

/** Opens a native file picker (or an <input type="file"> in a browser) and returns the text, or null if cancelled. */
export async function pickTextFile(): Promise<string | null> {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const picked = await open({
      multiple: false,
      filters: [{ name: 'Text', extensions: ['txt', 'md', 'csv', 'json', 'log', 'xml', 'html', 'css', 'js', 'ts', 'yaml', 'yml', 'ini', 'srt'] }],
    });
    return typeof picked === 'string' ? readTextFile(picked) : null;
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.csv,.json,.log,.xml,.html,.css,.js,.ts,.yaml,.yml,.ini,.srt,text/*';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      if (f.size > 10 * 1024 * 1024) return reject(new FileOpenError('too_large'));
      resolve(await f.text());
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Saves text with a native save dialog (or a download in a browser). Returns false if cancelled. */
export async function saveTextFile(name: string, text: string): Promise<boolean> {
  if (isTauri) return call<boolean>('save_text', { name, text });
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function readClipboard(): Promise<string> {
  if (isTauri) {
    const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
    return (await readText()) ?? '';
  }
  return navigator.clipboard.readText();
}

export async function writeClipboard(text: string) {
  if (isTauri) {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('copy failed');
  }
}
