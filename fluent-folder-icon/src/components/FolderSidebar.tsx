import { FolderOpen, FolderPlus, History, Trash2, X } from "lucide-react";
import type { Item } from "../lib/api";
import { Checkbox, Segmented, useT } from "./ui";

export type SideTab = "list" | "history";
type SetItems = (f: (p: Item[]) => Item[]) => void;

interface Props {
  tab: SideTab;
  onTab: (t: SideTab) => void;
  items: Item[];
  hist: Item[];
  setItems: SetItems;
  setHist: SetItems;
  dragging: boolean;
  onAddToList: () => void;
}

export default function FolderSidebar({ tab, onTab, items, hist, setItems, setHist, dragging, onAddToList }: Props) {
  const t = useT();
  const list = tab === "list" ? items : hist;
  const setList = tab === "list" ? setItems : setHist;
  const allSelected = list.length > 0 && list.every((i) => i.sel);
  const toggle = (path: string) => setList((p) => p.map((x) => (x.path === path ? { ...x, sel: !x.sel } : x)));
  const anySel = list.some((i) => i.sel);

  return (
    <aside className="card enter-left relative flex h-full w-[280px] flex-col">
      <div className="px-3 pt-3">
        <Segmented
          value={tab}
          onChange={onTab}
          options={[
            { value: "list", label: `${t("listTab")} · ${items.length}` },
            { value: "history", label: `${t("customizedTab")} · ${hist.length}` },
          ]}
        />
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <button className="btn btn-subtle btn-sm" disabled={!list.length} onClick={() => setList((p) => p.map((i) => ({ ...i, sel: !allSelected })))}>{t("selectAll")}</button>
        {tab === "list" && items.length > 0 && (
          <button className="btn btn-subtle btn-icon btn-sm" title={t("clearList")} onClick={() => setItems(() => [])}><Trash2 size={14} /></button>
        )}
      </div>

      <div key={tab} className="anim-fade flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-2">
        {list.length === 0 && (
          <div className="m-auto flex max-w-[210px] flex-col items-center gap-2 py-10 text-center" style={{ color: "var(--text2)" }}>
            {tab === "list" ? <FolderOpen size={36} strokeWidth={1.4} /> : <History size={36} strokeWidth={1.4} />}
            <b style={{ color: "var(--text)" }}>{tab === "list" ? t("noFolders") : t("noCustomized")}</b>
            <span className="text-[12.5px]">{tab === "list" ? t("noFoldersHint") : t("noCustomizedHint")}</span>
          </div>
        )}
        {list.map((i) => (
          <div key={i.path} className="anim-row group flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[var(--ctrl-hover)]" onClick={() => toggle(i.path)}>
            <Checkbox checked={i.sel} onChange={() => toggle(i.path)} />
            <div className="min-w-0 flex-1" title={i.path}>
              <div className="truncate font-medium">{i.name}</div>
              <div className="truncate text-[11.5px]" style={{ color: "var(--text2)" }}>{tab === "list" && i.customized ? t("customIcon") + " · " : ""}{i.path}</div>
            </div>
            <button className="btn btn-subtle btn-icon btn-sm opacity-0 group-hover:opacity-100" title={t("removeFromList")} onClick={(e) => { e.stopPropagation(); setList((p) => p.filter((x) => x.path !== i.path)); }}><X size={14} /></button>
          </div>
        ))}
      </div>

      {tab === "history" && hist.length > 0 && (
        <div className="p-2.5" style={{ borderTop: "1px solid var(--stroke)" }}>
          <button className="btn w-full" disabled={!anySel} onClick={onAddToList}><FolderPlus size={16} />{t("addToList")}</button>
        </div>
      )}

      {dragging && (
        <div className="absolute inset-0 grid place-items-center rounded-lg" style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)", border: "2px dashed var(--accent)" }}>
          <FolderPlus size={40} />
        </div>
      )}
    </aside>
  );
}
