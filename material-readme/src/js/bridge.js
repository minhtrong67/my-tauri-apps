// Thin wrapper over the Tauri APIs, with browser fallbacks so the UI can also be opened in a plain browser.
import { baseName } from './util.js';

const TA = window.__TAURI__;
export const isTauri = !!TA;
const inv = (cmd, args) => TA.core.invoke(cmd, args);
const FILTERS = [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'] }];
export const DOC_RE = /\.(md|markdown|mdown|mkd|txt)$/i;

export const api = {
  readDoc: (path) => inv('read_doc', { path }),
  writeDoc: (path, text) => inv('write_doc', { path, text }),
  mtime: (path) => inv('file_mtime', { path }),
  asset: (base, rel) => inv('read_asset', { base, rel }),
  startupDocs: () => (isTauri ? inv('startup_docs') : Promise.resolve([])),
  setDirty: (dirty) => { if (isTauri) inv('set_dirty', { dirty }).catch(() => {}); },
  ready: () => { if (isTauri) inv('app_ready').catch(() => {}); },
  forceClose: () => inv('force_close'),
  getWinMode: () => (isTauri ? inv('get_window_mode') : Promise.resolve('remember')),
  setWinMode: (mode) => (isTauri ? inv('set_window_mode', { mode }) : Promise.resolve()),

  /** Opens the file picker; resolves with an array of documents. */
  async pickDocs() {
    if (!isTauri) return pickBrowser();
    const p = await TA.dialog.open({ multiple: true, filters: FILTERS });
    const list = !p ? [] : Array.isArray(p) ? p : [p];
    return (await Promise.all(list.map((x) => api.readDoc(typeof x === 'string' ? x : x.path).catch(() => null)))).filter(Boolean);
  },
  /** Opens the save dialog; resolves with a path or null. */
  async pickSave(defaultName, filters = FILTERS) {
    if (!isTauri) return null;
    return (await TA.dialog.save({ defaultPath: defaultName, filters })) || null;
  },
  openUrl(url) { if (isTauri && TA.opener) return TA.opener.openUrl(url).catch(() => {}); window.open(url, '_blank'); },
  reveal(path) { if (isTauri && TA.opener) return TA.opener.revealItemInDir(path).catch(() => {}); },
  async copy(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } },
  win() { return isTauri ? TA.window.getCurrentWindow() : null; },
  listen(ev, cb) { return isTauri ? TA.event.listen(ev, cb) : Promise.resolve(() => {}); },
  setTitle(s) { try { api.win()?.setTitle(s); } catch { /* ignore */ } },
  setTheme(mode) { try { api.win()?.setTheme(mode === 'system' ? null : mode); } catch { /* ignore */ } },
};

function pickBrowser() {
  return new Promise((res) => {
    const inp = document.getElementById('fileIn');
    inp.onchange = async () => {
      const files = [...inp.files]; inp.value = '';
      res(await Promise.all(files.map(readBrowserFile)));
    };
    inp.click();
  });
}
export async function readBrowserFile(f) {
  const text = await f.text();
  return { path: '', name: f.name, size: f.size, mtime: 0, text, lossy: false };
}
export { baseName };
