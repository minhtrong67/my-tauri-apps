import type { MouseEvent as ReactMouseEvent } from "react";
import type { MenuEntry } from "../components/ui/Popover";
import { byId } from "./commands";
import { t } from "./i18n";
import { activeEditor } from "./editors";
import { closeDoc } from "./actions";
import { getDoc, togglePin, useDocs } from "../store/docs";
import { toast, useUi } from "../store/ui";
import { isTauri, revealInExplorer } from "./tauri";
import { Plus, Copy, FolderOpen, Pin, PinOff, X } from "../components/ui/icons";

const div: MenuEntry = { type: "divider" };

/** Opens a right-click menu at the pointer. */
export function openContextMenu(e: ReactMouseEvent | MouseEvent, entries: MenuEntry[]) {
  e.preventDefault();
  useUi.setState({ contextMenu: { x: e.clientX, y: e.clientY, entries } });
}

const cmd = (id: string, disabled = false): MenuEntry => {
  const c = byId(id);
  return { label: t(c.label), icon: c.icon, kbd: c.kbd, disabled, onClick: c.run };
};

/** Cut / Copy / Paste ... for the text area. */
export function editorMenu(): MenuEntry[] {
  const ta = activeEditor();
  const hasSelection = !!ta && ta.selectionStart !== ta.selectionEnd;
  return [
    cmd("undo"), cmd("redo"), div,
    cmd("cut", !hasSelection), cmd("copy", !hasSelection), cmd("paste"), cmd("delete", !hasSelection), div,
    cmd("selectAll"), div,
    cmd("find"), cmd("replace"), cmd("goto"),
  ];
}

/** Right-click menu of a tab. */
export function tabMenu(id: number): MenuEntry[] {
  const d = getDoc(id);
  if (!d) return [];
  const docs = useDocs.getState().docs;
  const idx = docs.findIndex((x) => x.id === id);
  const closeMany = async (ids: number[]) => {
    for (const x of ids) if (!(await closeDoc(x))) break; // stop when the user cancels a "save changes?" prompt
  };
  const entries: MenuEntry[] = [
    { label: t("tab.close"), icon: X, kbd: "Ctrl+W", onClick: () => void closeDoc(id) },
    { label: t("tab.closeOthers"), disabled: docs.filter((x) => x.id !== id && !x.pinned).length === 0, onClick: () => void closeMany(docs.filter((x) => x.id !== id && !x.pinned).map((x) => x.id)) },
    { label: t("tab.closeRight"), disabled: docs.slice(idx + 1).filter((x) => !x.pinned).length === 0, onClick: () => void closeMany(docs.slice(idx + 1).filter((x) => !x.pinned).map((x) => x.id)) },
    div,
    { label: d.pinned ? t("tab.unpin") : t("tab.pin"), icon: d.pinned ? PinOff : Pin, onClick: () => togglePin(id) },
  ];
  if (d.path) {
    const path = d.path;
    entries.push(div, {
      label: t("tab.copyPath"),
      icon: Copy,
      onClick: () => void navigator.clipboard.writeText(path).then(() => toast.success(t("msg.pathCopied")), () => {}),
    });
    if (isTauri) entries.push({ label: t("tab.reveal"), icon: FolderOpen, onClick: () => void revealInExplorer(path).catch(() => {}) });
  }
  entries.push(div, { label: t("tab.new"), icon: Plus, kbd: "Ctrl+N", onClick: () => byId("new").run() });
  return entries;
}
