import { useState } from "react";
import { MAX_COPIES, uid } from "../sites.js";
import Combo from "./Combo.jsx";
import { Cross, Plus } from "./Icons.jsx";

// Danh sách tab: mỗi dòng là một trang web và số tab muốn mở
export default function TabsEditor({ tabs, onChange, sites, onCommit, onForget, t }) {
  const [fresh, setFresh] = useState(null);
  const set = (id, p) => onChange(tabs.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const add = () => {
    const id = uid();
    setFresh(id);
    onChange([...tabs, { id, url: "", count: 1 }]);
  };

  return (
    <div className="editor">
      {tabs.length === 0 && <p className="note">{t("noTabs")}</p>}
      <ul className="trows">
        {tabs.map((e) => (
          <li key={e.id}>
            <Combo
              value={e.url}
              onChange={(url) => set(e.id, { url })}
              onCommit={onCommit}
              sites={sites}
              onForget={onForget}
              t={t}
              autoFocus={e.id === fresh}
            />
            <div className="stepper" role="group" aria-label={t("copies")}>
              <button type="button" aria-label={t("fewer")} disabled={e.count <= 1} onClick={() => set(e.id, { count: e.count - 1 })}>
                −
              </button>
              <span>{e.count}</span>
              <button type="button" aria-label={t("more")} disabled={e.count >= MAX_COPIES} onClick={() => set(e.id, { count: e.count + 1 })}>
                +
              </button>
            </div>
            <button type="button" className="ib err" aria-label={t("removeTab")} title={t("removeTab")} onClick={() => onChange(tabs.filter((x) => x.id !== e.id))}>
              <Cross />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn tonal add" onClick={add}>
        <Plus />
        {t("addTab")}
      </button>
    </div>
  );
}
