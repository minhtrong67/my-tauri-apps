import { FolderOpen, FolderPlus, Trash2, X } from "lucide-react";
import type { Item } from "../lib/api";
import { Checkbox, useT } from "./ui";

interface Props {
  items: Item[];
  setItems: (f: (p: Item[]) => Item[]) => void;
  dragging: boolean;
}

export default function FolderSidebar({ items, setItems, dragging }: Props) {
  const t = useT();
  const allSelected = items.length > 0 && items.every((i) => i.sel);
  const toggle = (path: string) => setItems((p) => p.map((x) => (x.path === path ? { ...x, sel: !x.sel } : x)));

  return (
    <aside className="card enter-left relative flex h-full w-[280px] flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <h2 className="m-0 text-[13px] font-semibold">{t("folders")} <span style={{ color: "var(--text2)" }}>({items.length})</span></h2>
        {items.length > 0 && (
          <div className="flex items-center gap-1">
            <button className="btn btn-subtle btn-sm" onClick={() => setItems((p) => p.map((i) => ({ ...i, sel: !allSelected })))}>{t("selectAll")}</button>
            <button className="btn btn-subtle btn-icon btn-sm" title={t("clearList")} onClick={() => setItems(() => [])}><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-2">
        {items.length === 0 && (
          <div className="m-auto flex max-w-[210px] flex-col items-center gap-2 py-10 text-center" style={{ color: "var(--text2)" }}>
            <FolderOpen size={36} strokeWidth={1.4} />
            <b style={{ color: "var(--text)" }}>{t("noFolders")}</b>
            <span className="text-[12.5px]">{t("noFoldersHint")}</span>
          </div>
        )}
        {items.map((i) => (
          <div key={i.path} className="anim-row group flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[var(--ctrl-hover)]" onClick={() => toggle(i.path)}>
            <Checkbox checked={i.sel} onChange={() => toggle(i.path)} />
            <div className="min-w-0 flex-1" title={i.path}>
              <div className="truncate font-medium">{i.name}</div>
              <div className="truncate text-[11.5px]" style={{ color: i.customized ? "var(--accent)" : "var(--text2)" }}>
                {i.customized && <b>{t("customIcon")} · </b>}<span style={{ color: "var(--text2)" }}>{i.path}</span>
              </div>
            </div>
            <button className="btn btn-subtle btn-icon btn-sm opacity-0 group-hover:opacity-100" title={t("removeFromList")} onClick={(e) => { e.stopPropagation(); setItems((p) => p.filter((x) => x.path !== i.path)); }}><X size={14} /></button>
          </div>
        ))}
      </div>

      {dragging && (
        <div className="absolute inset-0 grid place-items-center rounded-lg" style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)", border: "2px dashed var(--accent)" }}>
          <FolderPlus size={40} />
        </div>
      )}
    </aside>
  );
}
