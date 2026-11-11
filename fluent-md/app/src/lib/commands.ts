import {
  IcNew, IcOpen, IcSave, IcSaveAll, IcClose, IcEye, IcSplit, IcEdit, IcSearch, IcReplace, IcOutline, IcSettings, IcKeyboard, IcDocText, IcPrint, IcSystem, IcZoomIn, IcZoomOut,
  IcBold, IcItalic, IcStrike, IcCode, IcQuote, IcUl, IcOl, IcTask, IcLink, IcImage, IcTable, IcHr, IcUndo, IcRedo, IcH1, IcH2, IcH3, IcCodeBlock, IcBook, IcBadge, IcAlign,
  IcCopy, IcDocCopy, IcReveal, IcFocus, IcSwap, IcChevronRight, IcChevronLeft, IcReset, IcPaint, IcRecent,
  type FluentIcon,
} from './icons';
import * as C from './controller';
import { useApp } from './controller';
import { getSettings } from './settings';
import { changeSettings, cycleMode } from './appearance';
import { showOverlay } from './ui';
import { api } from './tauri';
import { toast } from './ui';
import { t, type Key } from './i18n';

export interface Command { id: string; label: Key; icon: FluentIcon; shortcut?: string; run: () => void; needsDoc?: boolean; needsEditor?: boolean }

export function cycleTab(dir: 1 | -1) {
  const { docs, activeId } = useApp.getState(); if (docs.length < 2) return;
  const i = docs.findIndex((d) => d.id === activeId);
  C.activate(docs[(i + dir + docs.length) % docs.length].id);
}
export const closeActive = () => { const id = useApp.getState().activeId; if (id !== null) C.closeDoc(id); };
export const toggleNav = () => C.setNav(!useApp.getState().nav);
export const newBlank = () => { C.newDoc(); };
export const copyPath = async () => { const p = C.activePath(); if (p && (await api.copy(p))) toast.success(t('copied'), { ms: 1600 }); };

export const COMMANDS: Command[] = [
  { id: 'new', label: 'new', icon: IcNew, shortcut: 'Ctrl+N', run: newBlank },
  { id: 'templates', label: 'templates', icon: IcBook, run: () => showOverlay('templates') },
  { id: 'open', label: 'open', icon: IcOpen, shortcut: 'Ctrl+O', run: () => C.pickAndOpen() },
  { id: 'save', label: 'save', icon: IcSave, shortcut: 'Ctrl+S', run: () => { C.save(); }, needsDoc: true },
  { id: 'saveall', label: 'save_all', icon: IcSaveAll, shortcut: 'Ctrl+Alt+S', run: () => { C.saveAll(); }, needsDoc: true },
  { id: 'saveas', label: 'save_as', icon: IcDocCopy, shortcut: 'Ctrl+Shift+S', run: () => { C.save(undefined, true); }, needsDoc: true },
  { id: 'close', label: 'close_tab', icon: IcClose, shortcut: 'Ctrl+W', run: closeActive, needsDoc: true },
  { id: 'nexttab', label: 'next_tab', icon: IcChevronRight, shortcut: 'Ctrl+Tab', run: () => cycleTab(1) },
  { id: 'prevtab', label: 'prev_tab', icon: IcChevronLeft, shortcut: 'Ctrl+Shift+Tab', run: () => cycleTab(-1) },
  { id: 'edit', label: 'm_edit', icon: IcEdit, shortcut: 'Ctrl+1', run: () => C.setMode('edit') },
  { id: 'split', label: 'm_split', icon: IcSplit, shortcut: 'Ctrl+2', run: () => C.setMode('split') },
  { id: 'preview', label: 'm_preview', icon: IcEye, shortcut: 'Ctrl+3', run: () => C.setMode('preview') },
  { id: 'find', label: 'find', icon: IcSearch, shortcut: 'Ctrl+F', run: () => C.openFind(false), needsDoc: true },
  { id: 'replace', label: 'find_replace', icon: IcReplace, shortcut: 'Ctrl+H', run: () => C.openFind(true), needsDoc: true },
  { id: 'outline', label: 'outline', icon: IcOutline, shortcut: 'Ctrl+\\', run: toggleNav },
  { id: 'focus', label: 'focus_mode', icon: IcFocus, shortcut: 'F11', run: C.toggleFocus },
  { id: 'settings', label: 'settings', icon: IcSettings, shortcut: 'Ctrl+,', run: () => showOverlay('settings') },
  { id: 'keys', label: 'shortcuts', icon: IcKeyboard, shortcut: 'F1', run: () => showOverlay('shortcuts') },
  { id: 'theme', label: 's_theme', icon: IcSystem, run: () => changeSettings({ mode: cycleMode(getSettings().mode) }) },
  { id: 'html', label: 'export_html', icon: IcDocText, run: () => C.exportHtml(), needsDoc: true },
  { id: 'print', label: 'print', icon: IcPrint, shortcut: 'Ctrl+P', run: () => C.printDoc(), needsDoc: true },
  { id: 'zin', label: 'zoom_in', icon: IcZoomIn, shortcut: 'Ctrl+=', run: () => C.zoomBy(10) },
  { id: 'zout', label: 'zoom_out', icon: IcZoomOut, shortcut: 'Ctrl+-', run: () => C.zoomBy(-10) },
  { id: 'zreset', label: 'zoom_reset', icon: IcReset, shortcut: 'Ctrl+0', run: () => C.setZoom(100) },
  { id: 'copypath', label: 'copy_path', icon: IcCopy, run: copyPath, needsDoc: true },
  { id: 'reveal', label: 'reveal', icon: IcReveal, run: () => { const p = C.activePath(); if (p) api.reveal(p); }, needsDoc: true },
  { id: 'eol', label: 'eol', icon: IcSwap, run: C.toggleEol, needsDoc: true },
  // formatting
  { id: 'undo', label: 'c_undo', icon: IcUndo, shortcut: 'Ctrl+Z', run: () => C.runCmd('undo'), needsEditor: true },
  { id: 'redo', label: 'c_redo', icon: IcRedo, shortcut: 'Ctrl+Y', run: () => C.runCmd('redo'), needsEditor: true },
  { id: 'bold', label: 'c_bold', icon: IcBold, shortcut: 'Ctrl+B', run: () => C.runCmd('bold'), needsEditor: true },
  { id: 'italic', label: 'c_italic', icon: IcItalic, shortcut: 'Ctrl+I', run: () => C.runCmd('italic'), needsEditor: true },
  { id: 'strike', label: 'c_strike', icon: IcStrike, shortcut: 'Ctrl+Shift+X', run: () => C.runCmd('strike'), needsEditor: true },
  { id: 'code', label: 'c_code', icon: IcCode, shortcut: 'Ctrl+E', run: () => C.runCmd('code'), needsEditor: true },
  { id: 'h1', label: 'c_heading', icon: IcH1, run: () => C.runCmd('heading', 1), needsEditor: true },
  { id: 'h2', label: 'c_heading', icon: IcH2, run: () => C.runCmd('heading', 2), needsEditor: true },
  { id: 'h3', label: 'c_heading', icon: IcH3, run: () => C.runCmd('heading', 3), needsEditor: true },
  { id: 'quote', label: 'c_quote', icon: IcQuote, run: () => C.runCmd('quote'), needsEditor: true },
  { id: 'ul', label: 'c_ul', icon: IcUl, run: () => C.runCmd('ul'), needsEditor: true },
  { id: 'ol', label: 'c_ol', icon: IcOl, run: () => C.runCmd('ol'), needsEditor: true },
  { id: 'task', label: 'c_task', icon: IcTask, run: () => C.runCmd('task'), needsEditor: true },
  { id: 'codeblock', label: 'c_codeblock', icon: IcCodeBlock, run: () => C.runCmd('codeblock'), needsEditor: true },
  { id: 'link', label: 'c_link', icon: IcLink, shortcut: 'Ctrl+K', run: () => C.runCmd('link'), needsEditor: true },
  { id: 'image', label: 'c_image', icon: IcImage, run: () => C.runCmd('image'), needsEditor: true },
  { id: 'table', label: 'c_table', icon: IcTable, run: () => C.runCmd('table'), needsEditor: true },
  { id: 'hr', label: 'c_hr', icon: IcHr, run: () => C.runCmd('hr'), needsEditor: true },
  { id: 'toc', label: 'c_toc', icon: IcAlign, run: C.insertToc, needsEditor: true },
  { id: 'badge', label: 'c_badge', icon: IcBadge, run: () => showOverlay('badge'), needsEditor: true },
];
export const cmd = (id: string) => COMMANDS.find((c) => c.id === id)!;
export const sc = (id: string) => cmd(id).shortcut;
export const KEY_ROWS: { label: Key; keys: string }[] = [
  ...(['new', 'open', 'save', 'saveall', 'saveas', 'close', 'nexttab', 'find', 'replace', 'edit', 'split', 'preview', 'outline', 'focus', 'settings', 'palette', 'zin', 'zout', 'zreset', 'bold', 'italic', 'strike', 'code', 'link', 'print'] as const)
    .map((id) => (id === 'palette' ? { label: 'commands' as Key, keys: 'Ctrl+Shift+P' } : { label: cmd(id).label, keys: cmd(id).shortcut || '' })),
];

/** Maps a keyboard event to a command id, or null. */
export function matchKey(e: KeyboardEvent): string | null {
  const mod = e.ctrlKey || e.metaKey, k = e.key;
  if (k === 'F11') return 'focus';
  if (k === 'F1') return 'keys';
  if (k === 'F3') return e.shiftKey ? '_prev' : '_next';
  if (mod && e.altKey && !e.shiftKey && k.toLowerCase() === 's') return 'saveall';
  if (!mod || e.altKey) return null;
  const lk = k.toLowerCase();
  if (e.shiftKey) {
    if (lk === 's') return 'saveas'; if (lk === 'p') return 'palette'; if (k === 'Tab') return 'prevtab'; return null;
  }
  switch (lk) {
    case 'n': return 'new'; case 'o': return 'open'; case 's': return 'save'; case 'w': return 'close'; case 'f': return 'find'; case 'h': return 'replace'; case 'p': return 'print';
    case '1': return 'edit'; case '2': return 'split'; case '3': return 'preview'; case ',': return 'settings'; case '\\': return 'outline';
    case '=': case '+': return 'zin'; case '-': return 'zout'; case '0': return 'zreset'; case 'tab': return 'nexttab';
  }
  return null;
}
