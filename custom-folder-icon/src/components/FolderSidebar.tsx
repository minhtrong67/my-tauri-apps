import { useMemo, useState } from "react";
import { FolderOpen, FolderPlus, LayoutGrid, List, Search, Trash2, X } from "lucide-react";
import type { Item } from "../lib/api";
import { Checkbox, useT } from "./ui";

export type View = "list" | "grid";

interface Props {
  items: Item[];
  setItems: (f: (p: Item[]) => Item[]) => void;
  dragging: boolean;
  icons: Record<string, string>;
  fallback: string;
  view: View;
  onView: (v: View) => void;
  activePath: string | null;
  onOpen: (i: Item) => void;
}

export default function FolderSidebar({ items, setItems, dragging, icons, fallback, view, onView, activePath, onOpen }: Props) {
  const t = useT();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => (i.name + " " + i.path).toLowerCase().includes(s)) : items;
  }, [items, q]);
  const allSelected = shown.length > 0 && shown.every((i) => i.sel);
  const toggle = (path: string) => setItems((p) => p.map((x) => (x.path === path ? { ...x, sel: !x.sel } : x)));
  const remove = (path: string) => setItems((p) => p.filter((x) => x.path !== path));
  const src = (i: Item) => (i.customized && icons[i.path]) || fallback;

  return (
    <aside className="card enter-left relative flex h-full w-[300px] flex-col">
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <h2 className="m-0 text-[13px] font-semibold">{t("folders")} <span style={{ color: "var(--text2)" }}>({items.length})</span></h2>
        {items.length > 0 && (
          <div className="flex items-center gap-1">
            <button className="btn btn-subtle btn-sm" onClick={() => { const ids = new Set(shown.map((i) => i.path)); setItems((p) => p.map((i) => (ids.has(i.path) ? { ...i, sel: !allSelected } : i))); }}>{t("selectAll")}</button>
            <button className="btn btn-subtle btn-icon btn-sm" data-tip={t("clearList")} onClick={() => setItems(() => [])}><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-[9px] opacity-60" />
          <input className="input !h-8 !pl-8" placeholder={t("searchFolders")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg !w-[68px] flex-none" style={{ "--n": 2, "--i": view === "list" ? 0 : 1 } as React.CSSProperties}>
          <span className="seg-thumb" />
          <button data-on={view === "list"} data-tip={t("viewList")} onClick={() => onView("list")}><List size={15} className="mx-auto" /></button>
          <button data-on={view === "grid"} data-tip={t("viewGrid")} onClick={() => onView("grid")}><LayoutGrid size={15} className="mx-auto" /></button>
        </div>
      </div>

      <div className={view === "grid" ? "grid grid-cols-2 content-start gap-2 overflow-y-auto px-2.5 pb-3" : "flex flex-col gap-0.5 overflow-y-auto px-1.5 pb-2"} style={{ flex: 1, minHeight: 0 }}>
        {items.length === 0 && (
          <div className="col-span-2 m-auto flex max-w-[210px] flex-col items-center gap-2 py-10 text-center" style={{ color: "var(--text2)" }}>
            <FolderOpen size={36} strokeWidth={1.4} />
            <b style={{ color: "var(--text)" }}>{t("noFolders")}</b>
            <span className="text-[12.5px]">{t("noFoldersHint")}</span>
          </div>
        )}
        {items.length > 0 && shown.length === 0 && <div className="col-span-2 py-8 text-center text-[13px]" style={{ color: "var(--text2)" }}>{t("noResults")}</div>}

        {view === "list" && shown.map((i) => (
          <div key={i.path} className="frow anim-row group" data-on={activePath === i.path} onClick={() => onOpen(i)} data-tip={i.path}>
            <Checkbox checked={i.sel} onChange={() => toggle(i.path)} />
            <img src={src(i)} alt="" width={40} height={40} draggable={false} className="flex-none" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{i.name}</div>
              <div className="truncate text-[11.5px]" style={{ color: "var(--text2)" }}>
                {i.customized ? <b style={{ color: "var(--accent-text)" }}>{t("customIcon")}</b> : t("defaultIcon")}
              </div>
            </div>
            <button className="btn btn-subtle btn-icon btn-sm opacity-0 group-hover:opacity-100" data-tip={t("removeFromList")} onClick={(e) => { e.stopPropagation(); remove(i.path); }}><X size={14} /></button>
          </div>
        ))}

        {view === "grid" && shown.map((i) => (
          <div key={i.path} className="gcard anim-row group" data-on={activePath === i.path} data-sel={i.sel} onClick={() => onOpen(i)} data-tip={i.path}>
            <div className="absolute left-2 top-2"><Checkbox checked={i.sel} onChange={() => toggle(i.path)} /></div>
            <button className="btn btn-subtle btn-icon btn-sm absolute right-1 top-1 opacity-0 group-hover:opacity-100" data-tip={t("removeFromList")} onClick={(e) => { e.stopPropagation(); remove(i.path); }}><X size={14} /></button>
            <img src={src(i)} alt="" width={72} height={72} draggable={false} />
            <div className="w-full truncate text-center font-medium">{i.name}</div>
            <div className="w-full truncate text-center text-[11px]" style={{ color: i.customized ? "var(--accent-text)" : "var(--text2)" }}>{i.customized ? t("customIcon") : t("defaultIcon")}</div>
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
