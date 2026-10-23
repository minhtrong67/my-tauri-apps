import { FileText, Plus, X } from "lucide-react";
import { closeDoc, openPicker } from "../lib/actions";
import { useStore, useT } from "../lib/store";
import { IconButton } from "./ui";

export function Tabs() {
  const t = useT();
  const { docs, activeId, setActive } = useStore();
  if (!docs.length) return null;
  return (
    <div className="tabs" role="tablist">
      {docs.map((d) => (
        <div key={d.id} role="tab" aria-selected={d.id === activeId} className={`tab ripple ${d.id === activeId ? "on" : ""}`} onClick={() => setActive(d.id)}
          onAuxClick={(e) => e.button === 1 && closeDoc(d.id)} title={d.path ?? d.name}>
          <FileText size={16} />
          <span className="tab-name">{d.name}</span>
          {d.dirty && <i className="dot" />}
          <button className="tab-x" aria-label={t("closeTab")} onClick={(e) => { e.stopPropagation(); closeDoc(d.id); }}><X size={14} /></button>
        </div>
      ))}
      <IconButton icon={<Plus size={18} />} label={t("newTab")} onClick={openPicker} size="sm" />
    </div>
  );
}
