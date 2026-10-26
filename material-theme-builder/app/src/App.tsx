import { useEffect, useState } from "react";
import { BottomBar, Rail, type Page } from "./components/Rail";
import { ScrollTop } from "./components/ScrollTop";
import { TooltipHost } from "./components/Tooltip";
import { BuilderPage } from "./pages/BuilderPage";
import { ComparePage } from "./pages/ComparePage";
import { LibraryPage } from "./pages/LibraryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { applyWindowOnStart, trackWindowSize } from "./lib/tauri";
import { useBuilder } from "./state/builder";
import { useSettings } from "./state/settings";
import { useToast } from "./state/toast";

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.isContentEditable);
}

export default function App() {
  const { settings, set, t } = useSettings();
  const builder = useBuilder();
  const toast = useToast();
  const [page, setPage] = useState<Page>("builder");

  // Restore the window as configured, reveal it, then keep tracking its size.
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void applyWindowOnStart(settings.windowMode, settings.windowSize).then(async () => {
      const un = await trackWindowSize((size) => set({ windowSize: size }));
      if (cancelled) un();
      else stop = un;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = "Material Theme Builder";
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      const PAGES: Page[] = ["builder", "library", "compare", "settings"];
      if (/^[1-4]$/.test(k)) {
        e.preventDefault();
        setPage(PAGES[Number(k) - 1]);
      } else if (k === "b") {
        e.preventDefault();
        set({ railExpanded: !settings.railExpanded });
      } else if (k === "," ) {
        e.preventDefault();
        setPage("settings");
      } else if (!isTyping(e.target) && k === "z") {
        e.preventDefault();
        if (e.shiftKey) builder.redo();
        else builder.undo();
      } else if (!isTyping(e.target) && k === "y") {
        e.preventDefault();
        builder.redo();
      } else if (k === "s") {
        e.preventDefault();
        const name = builder.currentName ?? `${t("builder.untitled")} ${builder.saved.length + 1}`;
        builder.saveCurrent(name);
        toast.success(t("builder.saved", { name }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [builder, t, toast, set, settings.railExpanded]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-surface text-on-surface md:flex-row">
      <div className="aurora" aria-hidden />
      <Rail page={page} onChange={setPage} savedCount={builder.saved.length} />
      <div className="relative z-10 min-h-0 min-w-0 flex-1 select-none">
        <div key={page} className="anim-page h-full">
          {page === "builder" && <BuilderPage />}
          {page === "library" && <LibraryPage onOpen={() => setPage("builder")} />}
          {page === "compare" && <ComparePage onEdit={() => setPage("builder")} />}
          {page === "settings" && <SettingsPage />}
        </div>
      </div>
      <BottomBar page={page} onChange={setPage} savedCount={builder.saved.length} />
      <ScrollTop resetKey={page} />
      <TooltipHost />
    </div>
  );
}
