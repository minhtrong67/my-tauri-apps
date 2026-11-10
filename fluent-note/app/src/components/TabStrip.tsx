import { memo, useEffect, useRef, useState } from "react";
import { Plus, X, FileText } from "./ui/icons";
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
  // keep the active tab visible by scrolling only the strip itself (scrollIntoView could scroll the whole window)
  useEffect(() => {
    const el = ref.current;
    const strip = el?.parentElement;
    if (!active || !el || !strip) return;
    const e = el.getBoundingClientRect();
    const r = strip.getBoundingClientRect();
    if (vertical) {
      if (e.top < r.top) strip.scrollBy({ top: e.top - r.top - 8, behavior: "smooth" });
      else if (e.bottom > r.bottom) strip.scrollBy({ top: e.bottom - r.bottom + 8, behavior: "smooth" });
    } else if (e.left < r.left) strip.scrollBy({ left: e.left - r.left - 8, behavior: "smooth" });
    else if (e.right > r.right) strip.scrollBy({ left: e.right - r.right + 8, behavior: "smooth" });
  }, [active, vertical]);
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
        "anim-tab-in group relative flex flex-none items-center gap-2 text-sm transition-colors duration-100",
        vertical
          ? cn("h-9 w-full rounded pl-3 pr-1.5", active ? "fl-selected text-fg" : "text-fg2 hover:bg-sub-hover active:bg-sub-press")
          : cn(
              "h-9 min-w-[7rem] max-w-[15rem] rounded-t-lg border border-b-0 pl-3 pr-1.5",
              active ? "z-10 border-stroke bg-layer text-fg" : "border-transparent text-fg2 hover:bg-sub-hover active:bg-sub-press",
            ),
        dragOver && "ring-2 ring-inset ring-brand",
      )}
    >
      {vertical && <FileText size={16} strokeWidth={1.6} className="flex-none text-fg2" />}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="relative grid h-6 w-6 flex-none place-items-center">
        {doc.dirty && (
          <span aria-label="unsaved" className="absolute h-2 w-2 rounded-full bg-brand transition-opacity group-hover:opacity-0" />
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
            "grid h-6 w-6 place-items-center rounded transition-[opacity,background-color] duration-100 hover:bg-sub-hover active:bg-sub-press",
            doc.dirty || !active ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100" : "opacity-100",
          )}
        >
          <X size={13} strokeWidth={1.8} />
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
      <aside role="tablist" aria-orientation="vertical" className="strip-y flex w-56 flex-none flex-col gap-0.5 px-2 pb-2 pt-1 max-[720px]:w-40">
        <button
          type="button"
          onClick={newTab}
          className="btn btn-tonal mb-1.5 w-full flex-none"
          data-tip={t("tab.new")}
          data-kbd="Ctrl+N"
        >
          <Plus size={16} strokeWidth={1.8} />
          <span>{t("tab.new")}</span>
        </button>
        {tabs}
      </aside>
    );
  }
  return (
    <div className="relative z-10 flex flex-none items-end gap-1 px-2 pt-1 after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-stroke">
      <div ref={strip} role="tablist" className="strip-x flex min-w-0 items-end gap-0.5">
        {tabs}
      </div>
      <IconButton icon={Plus} label={t("tab.new")} kbd="Ctrl+N" onClick={newTab} small className="mb-1" />
    </div>
  );
});
