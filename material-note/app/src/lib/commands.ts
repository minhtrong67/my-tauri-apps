import {
  FilePlus2, FolderOpen, Save, SaveAll, RefreshCw, Printer, X, Power, Undo2, Redo2, Scissors, Copy,
  ClipboardPaste, Eraser, Search, ChevronDown, ChevronUp, Replace, ArrowDownToLine, BoxSelect, Clock,
  CopyPlus, Trash2, CaseUpper, CaseLower, ZoomIn, ZoomOut, RotateCcw, WrapText, PanelBottom, PanelLeft,
  Maximize, Focus, Settings, Info, Command as CommandIcon, SunMoon, Sun, Moon, Monitor, Languages,
  ChevronRight, ChevronLeft, type LucideIcon,
} from "lucide-react";
import { useSettings } from "../store/settings";
import { useUi } from "../store/ui";
import { getActiveDoc } from "../store/docs";
import {
  newTab, openDialog, saveActive, reloadActive, closeActive, quit, cycleTab, zoomBy, setZoom, toggleFullscreen,
} from "./actions";
import {
  exec, pasteFromClipboard, insertTimeDate, duplicateLine, deleteLine, transformCase, printActive,
} from "./editorOps";
import { openFind, findStep } from "./find";
import { resolveDark } from "./theme";

export type Group = "file" | "edit" | "view" | "app";

export interface Command {
  id: string;
  label: string;
  icon: LucideIcon;
  group: Group;
  /** shown to the user, e.g. "Ctrl+Shift+S" */
  kbd?: string;
  /** extra accelerators that are matched but not displayed */
  alt?: string[];
  run: () => void;
  checked?: () => boolean;
  enabled?: () => boolean;
  /** keep out of the command palette */
  hidden?: boolean;
}

const s = () => useSettings.getState();
const toggle = (k: "wrap" | "statusBar" | "spellcheck") => s().set({ [k]: !s()[k] });

export const toggleTheme = () => s().set({ theme: resolveDark(s().theme) ? "light" : "dark" });
export const toggleZen = () => useUi.setState((u) => ({ zen: !u.zen }));

export const commands: Command[] = [
  { id: "new", label: "file.new", icon: FilePlus2, group: "file", kbd: "Ctrl+N", run: newTab },
  { id: "open", label: "file.open", icon: FolderOpen, group: "file", kbd: "Ctrl+O", run: () => void openDialog() },
  { id: "save", label: "file.save", icon: Save, group: "file", kbd: "Ctrl+S", run: () => void saveActive(false) },
  { id: "saveAs", label: "file.saveAs", icon: SaveAll, group: "file", kbd: "Ctrl+Shift+S", run: () => void saveActive(true) },
  { id: "reload", label: "file.reload", icon: RefreshCw, group: "file", kbd: "F5", enabled: () => !!getActiveDoc()?.path, run: reloadActive },
  { id: "print", label: "file.print", icon: Printer, group: "file", kbd: "Ctrl+P", run: printActive },
  { id: "close", label: "file.closeTab", icon: X, group: "file", kbd: "Ctrl+W", run: () => void closeActive() },
  { id: "exit", label: "file.exit", icon: Power, group: "file", kbd: "Alt+F4", run: quit, hidden: true },

  { id: "undo", label: "edit.undo", icon: Undo2, group: "edit", kbd: "Ctrl+Z", run: () => exec("undo"), hidden: true },
  { id: "redo", label: "edit.redo", icon: Redo2, group: "edit", kbd: "Ctrl+Y", run: () => exec("redo"), hidden: true },
  { id: "cut", label: "edit.cut", icon: Scissors, group: "edit", kbd: "Ctrl+X", run: () => exec("cut"), hidden: true },
  { id: "copy", label: "edit.copy", icon: Copy, group: "edit", kbd: "Ctrl+C", run: () => exec("copy"), hidden: true },
  { id: "paste", label: "edit.paste", icon: ClipboardPaste, group: "edit", kbd: "Ctrl+V", run: () => void pasteFromClipboard(), hidden: true },
  { id: "delete", label: "edit.delete", icon: Eraser, group: "edit", kbd: "Del", run: () => exec("delete"), hidden: true },
  { id: "selectAll", label: "edit.selectAll", icon: BoxSelect, group: "edit", kbd: "Ctrl+A", run: () => exec("selectAll"), hidden: true },
  { id: "find", label: "edit.find", icon: Search, group: "edit", kbd: "Ctrl+F", run: () => openFind(false) },
  { id: "findNext", label: "edit.findNext", icon: ChevronDown, group: "edit", kbd: "F3", run: () => findStep(1) },
  { id: "findPrev", label: "edit.findPrev", icon: ChevronUp, group: "edit", kbd: "Shift+F3", run: () => findStep(-1) },
  { id: "replace", label: "edit.replace", icon: Replace, group: "edit", kbd: "Ctrl+H", run: () => openFind(true) },
  { id: "goto", label: "edit.goto", icon: ArrowDownToLine, group: "edit", kbd: "Ctrl+G", run: () => useUi.setState({ gotoOpen: true }) },
  { id: "timeDate", label: "edit.timeDate", icon: Clock, group: "edit", kbd: "Ctrl+Shift+T", run: insertTimeDate },
  { id: "dupLine", label: "edit.duplicateLine", icon: CopyPlus, group: "edit", kbd: "Ctrl+Shift+D", run: duplicateLine },
  { id: "delLine", label: "edit.deleteLine", icon: Trash2, group: "edit", kbd: "Ctrl+Shift+K", run: deleteLine },
  { id: "upper", label: "edit.upper", icon: CaseUpper, group: "edit", run: () => transformCase("upper") },
  { id: "lower", label: "edit.lower", icon: CaseLower, group: "edit", run: () => transformCase("lower") },

  { id: "zoomIn", label: "view.zoomIn", icon: ZoomIn, group: "view", kbd: "Ctrl++", alt: ["Ctrl+="], run: () => zoomBy(10) },
  { id: "zoomOut", label: "view.zoomOut", icon: ZoomOut, group: "view", kbd: "Ctrl+-", run: () => zoomBy(-10) },
  { id: "zoomReset", label: "view.zoomReset", icon: RotateCcw, group: "view", kbd: "Ctrl+0", run: () => setZoom(100) },
  { id: "wrap", label: "view.wrap", icon: WrapText, group: "view", kbd: "Alt+Z", checked: () => s().wrap, run: () => toggle("wrap") },
  { id: "statusBar", label: "view.statusBar", icon: PanelBottom, group: "view", checked: () => s().statusBar, run: () => toggle("statusBar") },
  { id: "vTabs", label: "view.verticalTabs", icon: PanelLeft, group: "view", checked: () => s().tabLayout === "vertical", run: () => s().set({ tabLayout: s().tabLayout === "vertical" ? "horizontal" : "vertical" }) },
  { id: "zen", label: "view.zen", icon: Focus, group: "view", kbd: "Ctrl+Shift+Enter", checked: () => useUi.getState().zen, run: toggleZen },
  { id: "fullscreen", label: "view.fullscreen", icon: Maximize, group: "view", kbd: "F11", run: () => void toggleFullscreen() },
  { id: "nextTab", label: "view.nextTab", icon: ChevronRight, group: "view", kbd: "Ctrl+Tab", run: () => cycleTab(1) },
  { id: "prevTab", label: "view.prevTab", icon: ChevronLeft, group: "view", kbd: "Ctrl+Shift+Tab", run: () => cycleTab(-1) },

  { id: "palette", label: "toolbar.palette", icon: CommandIcon, group: "app", kbd: "Ctrl+Shift+P", run: () => useUi.setState({ paletteOpen: true }) },
  { id: "settings", label: "toolbar.settings", icon: Settings, group: "app", kbd: "Ctrl+,", run: () => useUi.getState().openSettings() },
  { id: "about", label: "toolbar.about", icon: Info, group: "app", run: () => useUi.setState({ aboutOpen: true }) },
  { id: "toggleTheme", label: "toolbar.theme", icon: SunMoon, group: "app", run: toggleTheme },
  { id: "themeLight", label: "settings.light", icon: Sun, group: "app", run: () => s().set({ theme: "light" }) },
  { id: "themeDark", label: "settings.dark", icon: Moon, group: "app", run: () => s().set({ theme: "dark" }) },
  { id: "themeSystem", label: "settings.system", icon: Monitor, group: "app", run: () => s().set({ theme: "system" }) },
  { id: "lang", label: "settings.language", icon: Languages, group: "app", run: () => s().set({ lang: s().lang === "vi" ? "en" : "vi" }) },
];

export const byId = (id: string) => commands.find((c) => c.id === id) as Command;

/* ---------- accelerators ---------- */
function eventCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  let k = e.key;
  if (k.length === 1) k = k.toUpperCase();
  else if (k === "Delete") k = "Del";
  else if (k === " ") k = "Space";
  // Shift changes the produced character ("+" instead of "="); match both layouts
  if (e.key === "+" && parts.includes("Shift")) parts.splice(parts.indexOf("Shift"), 1);
  parts.push(k);
  return parts.join("+");
}

const table = new Map<string, Command>();
for (const c of commands) {
  if (c.kbd && !["Ctrl+Z", "Ctrl+Y", "Ctrl+X", "Ctrl+C", "Ctrl+V", "Del", "Ctrl+A", "Alt+F4"].includes(c.kbd)) table.set(c.kbd, c);
  for (const a of c.alt ?? []) table.set(a, c);
}

/** Returns true when the shortcut was handled. Native editing keys are left to the textarea. */
export function handleShortcut(e: KeyboardEvent): boolean {
  const ui = useUi.getState();
  const modal = ui.confirm || ui.settingsOpen || ui.aboutOpen || ui.gotoOpen || ui.paletteOpen;
  const combo = eventCombo(e);
  const cmd = table.get(combo);
  if (!cmd) return false;
  if (modal && cmd.id !== "palette") return false;
  if (cmd.enabled && !cmd.enabled()) return false;
  e.preventDefault();
  cmd.run();
  return true;
}
