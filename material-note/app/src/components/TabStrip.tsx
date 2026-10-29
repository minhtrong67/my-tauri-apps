import { memo, useEffect, useRef, useState } from "react";
import { Plus, X, FileText } from "lucide-react";
import { IconButton } from "./ui/Button";
import { useDocs, docName, moveDoc, type Doc } from "../store/docs";
import { useSettings } from "../store/settings";
import { activateDoc, closeDoc, newTab } from "../lib/actions";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";

const Tab = memo(function Tab({ doc, active, vertical, dragOver, onDragStart, onDragOver, onDrop }: {
  doc: Doc; active: boolean; vertical: boolean; dragOver: boolean;
  onDragStart: (id: number) => void; onDragOver: (id: number | null) => void; onDrop: (id: number) => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const name = docName(doc);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [active]);
  return (
    <div
      ref={ref}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      draggable
      data-tip={doc.path ?? name}
      data-tip-pos={vertical ? "bottom" : "bottom"}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/x-tab", String(doc.id));
        onDragStart(doc.id);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("text/x-tab")) {
          e.preventDefault();
          onDragOver(doc.id);
        }
      }}
      onDragLeave={() => onDragOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(doc.id);
      }}
      onPointerDown={(e) => {
        if (e.button === 0 && !(e.target as HTMLElement).closest("button")) activateDoc(doc.id);
      }}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          void closeDoc(doc.id);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") activateDoc(doc.id);
      }}
      className={cn(
        "anim-tab-in ripple group flex flex-none items-center gap-2 overflow-hidden text-[0.8125rem] font-medium transition-[border-radius,background-color,color,box-shadow] duration-300 ease-spring",
        vertical ? "h-10 w-full rounded-2xl pl-3 pr-1.5" : "h-9 max-w-[15rem] rounded-full pl-3.5 pr-1.5",
        active ? "rounded-xl bg-secondary-container text-on-secondary-container" : "text-on-surface-variant hover:text-on-surface",
        dragOver && "ring-2 ring-primary",
      )}
    >
      {vertical && <FileText size={16} className="flex-none opacity-70" />}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="relative grid h-6 w-6 flex-none place-items-center">
        {doc.dirty && (
          <span aria-label="unsaved" className="dirty-dot absolute h-2 w-2 rounded-full bg-primary transition-opacity group-hover:opacity-0" />
        )}
        <button
          type="button"
          aria-label={t("tab.close")}
          data-tip={t("tab.close")}
          data-kbd="Ctrl+W"
          onClick={(e) => {
            e.stopPropagation();
            void closeDoc(doc.id);
          }}
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full transition-all duration-200 hover:bg-on-surface/12 active:scale-90",
            doc.dirty || !active ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100" : "opacity-100",
          )}
        >
          <X size={14} strokeWidth={2.6} />
        </button>
      </span>
    </div>
  );
});

export const TabStrip = memo(function TabStrip() {
  const t = useT();
  const docs = useDocs((s) => s.docs);
  const activeId = useDocs((s) => s.activeId);
  const vertical = useSettings((s) => s.tabLayout === "vertical");
  const [over, setOver] = useState<number | null>(null);
  const drag = useRef<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);

  // mouse wheel scrolls the horizontal strip
  useEffect(() => {
    const el = strip.current;
    if (!el || vertical) return;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [vertical]);

  const tabs = docs.map((d) => (
    <Tab
      key={d.id}
      doc={d}
      active={d.id === activeId}
      vertical={vertical}
      dragOver={over === d.id && drag.current !== d.id}
      onDragStart={(id) => (drag.current = id)}
      onDragOver={setOver}
      onDrop={(id) => {
        if (drag.current !== null) moveDoc(drag.current, id);
        drag.current = null;
        setOver(null);
      }}
    />
  ));

  if (vertical) {
    return (
      <aside role="tablist" aria-orientation="vertical" className="flex w-56 max-[720px]:w-40 flex-none flex-col gap-1 overflow-y-auto px-2 pb-2 pt-1">
        <button
          type="button"
          onClick={newTab}
          className="btn btn-tonal ripple mb-1 w-full flex-none"
          data-tip={t("tab.new")}
          data-kbd="Ctrl+N"
        >
          <Plus size={18} strokeWidth={2.4} />
          <span>{t("tab.new")}</span>
        </button>
        {tabs}
      </aside>
    );
  }
  return (
    <div className="flex flex-none items-center gap-1 px-3 pb-2 pt-0.5">
      <div ref={strip} role="tablist" className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {tabs}
      </div>
      <IconButton icon={Plus} label={t("tab.new")} kbd="Ctrl+N" onClick={newTab} small tonal />
    </div>
  );
});
