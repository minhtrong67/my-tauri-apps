import { memo } from "react";
import { FolderOpen, Command, FileText } from "lucide-react";
import { Button } from "./ui/Button";
import { Logo } from "./AppBar";
import { useDocs } from "../store/docs";
import { useCursor, useUi } from "../store/ui";
import { openDialog, openPaths } from "../lib/actions";
import { useT } from "../lib/i18n";
import { baseName } from "../lib/utils";

/** Friendly welcome shown over an empty, unnamed note. It disappears as soon as you type. */
export const EmptyState = memo(function EmptyState() {
  const t = useT();
  const recent = useDocs((s) => s.recent);
  const activeId = useDocs((s) => s.activeId);
  const doc = useDocs((s) => s.docs.find((d) => d.id === s.activeId));
  const chars = useCursor((c) => c.chars);
  const only = useDocs((s) => s.docs.length === 1);
  void activeId;
  if (!doc || doc.path || chars > 0 || !only || doc.dirty) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] grid place-items-center overflow-hidden p-6">
      {/* soft expressive blobs */}
      <div className="absolute -left-16 top-8 h-64 w-64 rounded-[42%_58%_60%_40%] bg-primary-container opacity-50 blur-3xl [animation:drift_14s_ease-in-out_infinite]" />
      <div className="absolute -right-10 bottom-4 h-72 w-72 rounded-[58%_42%_40%_60%] bg-tertiary-container opacity-45 blur-3xl [animation:drift_18s_ease-in-out_infinite_reverse]" />
      <div className="anim-pop-in relative flex max-w-md flex-col items-center text-center">
        <div className="[animation:float_6s_ease-in-out_infinite]">
          <Logo size={96} spin />
        </div>
        <h2 className="mt-5 text-[1.5rem] font-bold tracking-tight">{t("empty.title")}</h2>
        <p className="mt-1.5 text-[0.9375rem] text-on-surface-variant">{t("empty.desc")}</p>
        <div className="pointer-events-auto mt-5 flex flex-wrap justify-center gap-2">
          <Button tone="primary" icon={FolderOpen} onClick={() => void openDialog()}>{t("empty.open")}</Button>
          <Button tone="tonal" icon={Command} onClick={() => useUi.setState({ paletteOpen: true })}>{t("toolbar.palette")}</Button>
        </div>
        {recent.length > 0 && (
          <div className="pointer-events-auto mt-6 w-full">
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">{t("empty.recent")}</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {recent.slice(0, 4).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-tip={p}
                  onClick={() => void openPaths([p])}
                  className="ripple flex h-9 max-w-[12rem] items-center gap-2 rounded-full bg-surface-high px-3.5 text-[0.8125rem] font-medium transition-[border-radius,transform] duration-200 ease-standard hover:rounded-xl active:scale-95"
                >
                  <FileText size={15} className="flex-none text-primary" />
                  <span className="truncate">{baseName(p)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
