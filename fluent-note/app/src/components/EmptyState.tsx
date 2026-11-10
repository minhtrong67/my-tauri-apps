import { memo } from "react";
import { FolderOpen, Command, FileText } from "./ui/icons";
import { Button } from "./ui/Button";
import { Logo } from "./AppBar";
import { useDocs } from "../store/docs";
import { useCursor, useUi } from "../store/ui";
import { openDialog, openPaths } from "../lib/actions";
import { useT } from "../lib/i18n";
import { baseName } from "../lib/utils";

/** Welcome shown over an empty, unnamed note. It disappears as soon as you type. */
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
      <div className="anim-page-in relative flex max-w-md flex-col items-center text-center">
        <Logo size={64} />
        <h2 className="mt-5 text-xl font-semibold leading-7">{t("empty.title")}</h2>
        <p className="mt-1 text-sm text-fg2">{t("empty.desc")}</p>
        <div className="pointer-events-auto mt-5 flex flex-wrap justify-center gap-2">
          <Button tone="primary" icon={FolderOpen} onClick={() => void openDialog()}>{t("empty.open")}</Button>
          <Button tone="neutral" icon={Command} onClick={() => useUi.setState({ paletteOpen: true })}>{t("toolbar.palette")}</Button>
        </div>
        {recent.length > 0 && (
          <div className="pointer-events-auto mt-7 w-full">
            <p className="mb-1.5 text-xs font-semibold text-fg2">{t("empty.recent")}</p>
            <div className="flex flex-wrap justify-center gap-1">
              {recent.slice(0, 4).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-tip={p}
                  onClick={() => void openPaths([p])}
                  className="fl-subtle flex h-8 max-w-[12rem] items-center gap-2 rounded px-2.5 text-sm"
                >
                  <FileText size={15} strokeWidth={1.6} className="flex-none text-brand" />
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
