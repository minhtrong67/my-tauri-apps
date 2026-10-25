// Thin wrapper around the Tauri global API, with browser fallbacks so the UI also runs in a plain browser.

import { OPEN_EXT, OOXML, TEXT, ACCEPT } from "./formats.js";

const T = window.__TAURI__;
export const isTauri = !!T;
export const basename = (p) => String(p).split(/[\\/]/).pop();

// Binary IPC: no base64 round-trip, so large workbooks open and save faster.
export async function readFile(path) { return new Uint8Array(await T.core.invoke("read_file", { path })); }
export async function writeFile(path, bytes) { await T.core.invoke("write_file", bytes, { headers: { "x-path": encodeURIComponent(path) } }); }

// Crash-recovery draft (desktop only)
export async function saveDraft(bytes, meta) { if (T) await T.core.invoke("save_draft", bytes, { headers: { "x-meta": encodeURIComponent(JSON.stringify(meta)) } }); }
export async function draftInfo() { if (!T) return null; try { const s = await T.core.invoke("draft_info"); return s ? JSON.parse(s) : null; } catch { return null; } }
export async function readDraft() { return new Uint8Array(await T.core.invoke("read_draft")); }
export async function clearDraft() { if (T) { try { await T.core.invoke("clear_draft"); } catch { /* ignore */ } } }

export const XLSX_FILTER = [{ name: "Excel Workbook", extensions: ["xlsx"] }];
export const OPEN_FILTER = [
  { name: "All supported files", extensions: OPEN_EXT },
  { name: "Excel workbook / template", extensions: OOXML },
  { name: "CSV / TSV / text", extensions: TEXT },
  { name: "JSON", extensions: ["json"] },
];
export const TSV_FILTER = [{ name: "TSV", extensions: ["tsv"] }];
export const JSON_FILTER = [{ name: "JSON", extensions: ["json"] }];
export const CSV_FILTER = [{ name: "CSV", extensions: ["csv"] }];

let fileInput = null;
function browserPick(accept) {
  return new Promise((resolve) => {
    if (!fileInput) { fileInput = document.createElement("input"); fileInput.type = "file"; fileInput.style.display = "none"; document.body.appendChild(fileInput); }
    fileInput.accept = accept; fileInput.value = "";
    fileInput.onchange = async () => { const f = fileInput.files[0]; resolve(f ? { path: null, name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) } : null); };
    fileInput.click();
  });
}

// Returns {path, name, bytes} or null
export async function openFileDialog() {
  if (!T) return browserPick(ACCEPT);
  const path = await T.dialog.open({ multiple: false, filters: OPEN_FILTER });
  if (!path) return null;
  return { path, name: basename(path), bytes: await readFile(path) };
}
export async function openPath(path) { return { path, name: basename(path), bytes: await readFile(path) }; }

// Returns {path, name} or null (cancelled)
export async function saveFileDialog(defaultName, bytes, filters, existingPath = null) {
  if (!T) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([bytes])); a.download = defaultName; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return { path: null, name: defaultName };
  }
  let p = existingPath;
  if (!p) { p = await T.dialog.save({ defaultPath: defaultName, filters }); if (!p) return null; }
  await writeFile(p, bytes);
  return { path: p, name: basename(p) };
}

export async function clipboardRead() {
  if (T) { try { return await T.core.invoke("read_clipboard"); } catch { /* fall through */ } }
  try { return await navigator.clipboard.readText(); } catch { return ""; }
}
export async function clipboardWrite(text) {
  if (T) { try { await T.core.invoke("write_clipboard", { text }); return; } catch { /* fall through */ } }
  try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
}

export function currentWindow() { return T && T.window ? T.window.getCurrentWindow() : null; }
export async function setWindowTitle(title) { const w = currentWindow(); if (w) { try { await w.setTitle(title); } catch { /* permission */ } } }
export async function appVersion() { try { return await T.app.getVersion(); } catch { return "1.2.0"; } }
export async function launchFile() { if (!T) return null; try { return await T.core.invoke("get_launch_file"); } catch { return null; } }
export function listen(ev, cb) { return T && T.event ? T.event.listen(ev, cb) : Promise.resolve(() => {}); }
export async function revealPath(path) { if (T) { try { await T.core.invoke("reveal_file", { path }); } catch { /* ignore */ } } }
export async function setFullscreen(on) { const w = currentWindow(); if (w) { try { await w.setFullscreen(on); } catch { /* permission */ } } else if (on) { try { await document.documentElement.requestFullscreen(); } catch { /* ignore */ } } else if (document.fullscreenElement) document.exitFullscreen(); }
export async function isFullscreen() { const w = currentWindow(); if (w) { try { return await w.isFullscreen(); } catch { return false; } } return !!document.fullscreenElement; }
export async function showWindow() { const w = currentWindow(); if (w) { try { await w.show(); } catch { /* already visible */ } } }
export async function openUrl(url) {
  if (T && T.opener && T.opener.openUrl) return T.opener.openUrl(url);
  window.open(url, "_blank", "noopener");
}
export async function maximizeWindow() { const w = currentWindow(); if (w) { try { await w.maximize(); } catch { /* permission */ } } }
/** "remember": the window-state plugin restores the last size; "maximized": always start maximised */
export async function setWindowMode(mode) { if (mode === "maximized") await maximizeWindow(); }
