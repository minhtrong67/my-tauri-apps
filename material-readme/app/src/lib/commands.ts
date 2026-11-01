import {
  FilePlus2, FolderOpen, Save, SaveAll, X, Eye, Columns2, PencilLine, Search, Replace, ListTree, Settings, Keyboard, FileCode2, Printer, SunMoon, ZoomIn, ZoomOut, ScanSearch,
  Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered, ListChecks, Link2, Image, Table, Minus, Undo2, Redo2, Heading1, Heading2, Heading3, FileCode, LayoutTemplate, BadgeCheck, TableOfContents, Copy, FolderSearch, Maximize2, ArrowRightLeft, ChevronRight, ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import * as C from './controller';
import { useApp } from './controller';
import { getSettings } from './settings';
import { changeSettings, cycleMode } from './appearance';
import { showOverlay } from './ui';
import { api } from './tauri';
import { toast } from './ui';
import { t, type Key } from './i18n';

export interface Command { id: string; label: Key; icon: LucideIcon; shortcut?: string; run: () => void; needsDoc?: boolean; needsEditor?: boolean }

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
  { id: 'new', label: 'new', icon: FilePlus2, shortcut: 'Ctrl+N', run: newBlank },
  { id: 'templates', label: 'templates', icon: LayoutTemplate, run: () => showOverlay('templates') },
  { id: 'open', label: 'open', icon: FolderOpen, shortcut: 'Ctrl+O', run: () => C.pickAndOpen() },
  { id: 'save', label: 'save', icon: Save, shortcut: 'Ctrl+S', run: () => { C.save(); }, needsDoc: true },
  { id: 'saveas', label: 'save_as', icon: SaveAll, shortcut: 'Ctrl+Shift+S', run: () => { C.save(undefined, true); }, needsDoc: true },
  { id: 'close', label: 'close_tab', icon: X, shortcut: 'Ctrl+W', run: closeActive, needsDoc: true },
  { id: 'nexttab', label: 'next_tab', icon: ChevronRight, shortcut: 'Ctrl+Tab', run: () => cycleTab(1) },
  { id: 'prevtab', label: 'prev_tab', icon: ChevronLeft, shortcut: 'Ctrl+Shift+Tab', run: () => cycleTab(-1) },
  { id: 'edit', label: 'm_edit', icon: PencilLine, shortcut: 'Ctrl+1', run: () => C.setMode('edit') },
  { id: 'split', label: 'm_split', icon: Columns2, shortcut: 'Ctrl+2', run: () => C.setMode('split') },
  { id: 'preview', label: 'm_preview', icon: Eye, shortcut: 'Ctrl+3', run: () => C.setMode('preview') },
  { id: 'find', label: 'find', icon: Search, shortcut: 'Ctrl+F', run: () => C.openFind(false), needsDoc: true },
  { id: 'replace', label: 'find_replace', icon: Replace, shortcut: 'Ctrl+H', run: () => C.openFind(true), needsDoc: true },
  { id: 'outline', label: 'outline', icon: ListTree, shortcut: 'Ctrl+\\', run: toggleNav },
  { id: 'focus', label: 'focus_mode', icon: Maximize2, shortcut: 'F11', run: C.toggleFocus },
  { id: 'settings', label: 'settings', icon: Settings, shortcut: 'Ctrl+,', run: () => showOverlay('settings') },
  { id: 'keys', label: 'shortcuts', icon: Keyboard, shortcut: 'F1', run: () => showOverlay('shortcuts') },
  { id: 'theme', label: 's_theme', icon: SunMoon, run: () => changeSettings({ mode: cycleMode(getSettings().mode) }) },
  { id: 'html', label: 'export_html', icon: FileCode2, run: () => C.exportHtml(), needsDoc: true },
  { id: 'print', label: 'print', icon: Printer, shortcut: 'Ctrl+P', run: () => C.printDoc(), needsDoc: true },
  { id: 'zin', label: 'zoom_in', icon: ZoomIn, shortcut: 'Ctrl+=', run: () => C.zoomBy(10) },
  { id: 'zout', label: 'zoom_out', icon: ZoomOut, shortcut: 'Ctrl+-', run: () => C.zoomBy(-10) },
  { id: 'zreset', label: 'zoom_reset', icon: ScanSearch, shortcut: 'Ctrl+0', run: () => C.setZoom(100) },
  { id: 'copypath', label: 'copy_path', icon: Copy, run: copyPath, needsDoc: true },
  { id: 'reveal', label: 'reveal', icon: FolderSearch, run: () => { const p = C.activePath(); if (p) api.reveal(p); }, needsDoc: true },
  { id: 'eol', label: 'eol', icon: ArrowRightLeft, run: C.toggleEol, needsDoc: true },
  // formatting
  { id: 'undo', label: 'c_undo', icon: Undo2, shortcut: 'Ctrl+Z', run: () => C.runCmd('undo'), needsEditor: true },
  { id: 'redo', label: 'c_redo', icon: Redo2, shortcut: 'Ctrl+Y', run: () => C.runCmd('redo'), needsEditor: true },
  { id: 'bold', label: 'c_bold', icon: Bold, shortcut: 'Ctrl+B', run: () => C.runCmd('bold'), needsEditor: true },
  { id: 'italic', label: 'c_italic', icon: Italic, shortcut: 'Ctrl+I', run: () => C.runCmd('italic'), needsEditor: true },
  { id: 'strike', label: 'c_strike', icon: Strikethrough, shortcut: 'Ctrl+Shift+X', run: () => C.runCmd('strike'), needsEditor: true },
  { id: 'code', label: 'c_code', icon: Code, shortcut: 'Ctrl+E', run: () => C.runCmd('code'), needsEditor: true },
  { id: 'h1', label: 'c_heading', icon: Heading1, run: () => C.runCmd('heading', 1), needsEditor: true },
  { id: 'h2', label: 'c_heading', icon: Heading2, run: () => C.runCmd('heading', 2), needsEditor: true },
  { id: 'h3', label: 'c_heading', icon: Heading3, run: () => C.runCmd('heading', 3), needsEditor: true },
  { id: 'quote', label: 'c_quote', icon: Quote, run: () => C.runCmd('quote'), needsEditor: true },
  { id: 'ul', label: 'c_ul', icon: List, run: () => C.runCmd('ul'), needsEditor: true },
  { id: 'ol', label: 'c_ol', icon: ListOrdered, run: () => C.runCmd('ol'), needsEditor: true },
  { id: 'task', label: 'c_task', icon: ListChecks, run: () => C.runCmd('task'), needsEditor: true },
  { id: 'codeblock', label: 'c_codeblock', icon: FileCode, run: () => C.runCmd('codeblock'), needsEditor: true },
  { id: 'link', label: 'c_link', icon: Link2, shortcut: 'Ctrl+K', run: () => C.runCmd('link'), needsEditor: true },
  { id: 'image', label: 'c_image', icon: Image, run: () => C.runCmd('image'), needsEditor: true },
  { id: 'table', label: 'c_table', icon: Table, run: () => C.runCmd('table'), needsEditor: true },
  { id: 'hr', label: 'c_hr', icon: Minus, run: () => C.runCmd('hr'), needsEditor: true },
  { id: 'toc', label: 'c_toc', icon: TableOfContents, run: C.insertToc, needsEditor: true },
  { id: 'badge', label: 'c_badge', icon: BadgeCheck, run: () => showOverlay('badge'), needsEditor: true },
];
export const cmd = (id: string) => COMMANDS.find((c) => c.id === id)!;
export const sc = (id: string) => cmd(id).shortcut;
export const KEY_ROWS: { label: Key; keys: string }[] = [
  ...(['new', 'open', 'save', 'saveas', 'close', 'nexttab', 'find', 'replace', 'edit', 'split', 'preview', 'outline', 'focus', 'settings', 'palette', 'zin', 'zout', 'zreset', 'bold', 'italic', 'strike', 'code', 'link', 'print'] as const)
    .map((id) => (id === 'palette' ? { label: 'commands' as Key, keys: 'Ctrl+Shift+P' } : { label: cmd(id).label, keys: cmd(id).shortcut || '' })),
];

/** Maps a keyboard event to a command id, or null. */
export function matchKey(e: KeyboardEvent): string | null {
  const mod = e.ctrlKey || e.metaKey, k = e.key;
  if (k === 'F11') return 'focus';
  if (k === 'F1') return 'keys';
  if (k === 'F3') return e.shiftKey ? '_prev' : '_next';
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
