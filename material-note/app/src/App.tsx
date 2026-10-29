import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { AppBar } from "./components/AppBar";
import { TabStrip } from "./components/TabStrip";
import { Editor } from "./components/Editor";
import { StatusBar } from "./components/StatusBar";
import { SettingsDialog } from "./components/SettingsDialog";
import { AboutDialog, CommandPalette, ConfirmDialog, GotoDialog } from "./components/Dialogs";
import { ToastHost } from "./components/ui/Controls";
import { TooltipHost } from "./components/ui/Tooltip";
import { useRipple } from "./components/ui/Button";
import { useDocs, docName } from "./store/docs";
import { useSettings, getSettings } from "./store/settings";
import { useFind, useUi, toast } from "./store/ui";
import { handleShortcut } from "./lib/commands";
import { checkExternalChanges, confirmAllClosed, newTab, openPaths } from "./lib/actions";
import { markSessionReady, persistSession, restoreSession } from "./lib/session";
import { scheduleStatus } from "./lib/editorOps";
import { PhysicalSize, getCurrentWebview, isTauri, listen, startupFiles, win } from "./lib/tauri";
import { useT, t } from "./lib/i18n";
import { cn, debounce } from "./lib/utils";

async function setupWindow() {
  const w = win();
  if (!w) return;
  const { windowMode, winState } = getSettings();
  try {
    if (windowMode === "maximized") await w.maximize();
    else if (winState) {
      if (winState.maximized) await w.maximize();
      else {
        const maxW = Math.round(window.screen.availWidth * window.devicePixelRatio);
        const maxH = Math.round(window.screen.availHeight * window.devicePixelRatio);
        await w.setSize(new PhysicalSize(Math.min(winState.w, maxW), Math.min(winState.h, maxH)));
        await w.center();
      }
    }
  } catch {
    /* the window keeps its default size */
  }
  // two frames: the first paint is done, so the window never flashes an empty frame
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await w.show();
  await w.setFocus();
}

function useWindowEvents() {
  useEffect(() => {
    const w = win();
    if (!w) return;
    const offs: Promise<() => void>[] = [];

    // remember the window size when the user resizes it
    const saveSize = debounce(async () => {
      if (getSettings().windowMode !== "remember") return;
      const [max, full, min] = await Promise.all([w.isMaximized(), w.isFullscreen(), w.isMinimized()]);
      if (full || min) return;
      const prev = getSettings().winState;
      if (max) {
        if (prev) useSettings.getState().set({ winState: { ...prev, maximized: true } });
        else useSettings.getState().set({ winState: { w: 1100, h: 720, maximized: true } });
      } else {
        const size = await w.innerSize();
        useSettings.getState().set({ winState: { w: size.width, h: size.height, maximized: false } });
      }
    }, 350);
    offs.push(w.onResized(saveSize));

    offs.push(
      w.onCloseRequested(async (e) => {
        e.preventDefault();
        if (await confirmAllClosed()) await w.destroy();
      }),
    );
    offs.push(w.onFocusChanged(({ payload }) => payload && void checkExternalChanges()));
    offs.push(
      listen<string[]>("open-files", async (e) => {
        const files = Array.isArray(e.payload) ? e.payload : [];
        if (files.length) await openPaths(files);
        await w.unminimize();
        await w.setFocus();
      }),
    );
    return () => offs.forEach((p) => p.then((f) => f()).catch(() => {}));
  }, []);
}

function useDragDrop(setDragging: (v: boolean) => void) {
  useEffect(() => {
    if (!isTauri) return;
    const off = getCurrentWebview().onDragDropEvent((e) => {
      const p = e.payload;
      if (p.type === "enter" || p.type === "over") setDragging(true);
      else if (p.type === "leave") setDragging(false);
      else if (p.type === "drop") {
        setDragging(false);
        if (p.paths.length) void openPaths(p.paths);
      }
    });
    return () => void off.then((f) => f());
  }, [setDragging]);
}

export default function App() {
  const tr = useT();
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const statusBar = useSettings((s) => s.statusBar);
  const vertical = useSettings((s) => s.tabLayout === "vertical");
  const zen = useUi((s) => s.zen);
  const activeName = useDocs((s) => {
    const d = s.docs.find((x) => x.id === s.activeId);
    return d ? (d.dirty ? "● " : "") + docName(d) : "";
  });
  const lang = useSettings((s) => s.lang);

  useRipple();
  useWindowEvents();
  useDragDrop(setDragging);

  // startup: restore tabs, open files passed on the command line, then reveal the window
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let files: string[] = [];
      if (isTauri) files = await startupFiles().catch(() => []);
      await restoreSession();
      if (files.length) await openPaths(files);
      const { docs, activeId } = useDocs.getState();
      if (!docs.length) newTab();
      else if (activeId === null) useDocs.setState({ activeId: docs[0].id });
      markSessionReady();
      if (cancelled) return;
      setReady(true);
      scheduleStatus();
      await setupWindow();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // window title
  useEffect(() => {
    const title = activeName ? `${activeName} - Material Note` : "Material Note";
    document.title = title;
    void win()?.setTitle(title);
  }, [activeName, lang]);

  // keyboard
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (handleShortcut(e)) return;
      const ui = useUi.getState();
      if (e.key === "Escape" && ui.zen && !ui.confirm && !ui.settingsOpen && !ui.aboutOpen && !ui.gotoOpen && !ui.paletteOpen && !useFind.getState().open) {
        useUi.setState({ zen: false });
      }
    };
    document.addEventListener("keydown", key, true);
    // never let the webview show its own context menu / reload / zoom
    const ctx = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) e.preventDefault();
    };
    document.addEventListener("contextmenu", ctx);
    return () => {
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("contextmenu", ctx);
    };
  }, []);

  // keep drafts safe when the window is hidden or closed abruptly
  useEffect(() => {
    const flush = () => persistSession();
    const hidden = () => document.hidden && flush();
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  useEffect(() => {
    if (zen) toast.info(t("zen.hint"), { duration: 2600 });
  }, [zen]);

  return (
    <div className={cn("flex h-full flex-col bg-surface-low transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")}>
      {!zen && <AppBar />}
      <div className={cn("flex min-h-0 flex-1", vertical && !zen ? "flex-row" : "flex-col")}>
        {!zen && <TabStrip />}
        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface ring-1 ring-outline-variant/40 transition-[margin,border-radius] duration-500 ease-emphasized",
            zen ? "m-0 rounded-none" : cn("rounded-[1.75rem] shadow-e2", vertical ? "mb-1 mr-2" : "mx-2 mb-1"),
          )}
        >
          <Editor />
        </main>
      </div>
      {statusBar && !zen && <StatusBar />}
      {!statusBar && !zen && <div className="h-2 flex-none" />}

      <SettingsDialog />
      <AboutDialog />
      <GotoDialog />
      <CommandPalette />
      <ConfirmDialog />
      <ToastHost />
      <TooltipHost />

      {dragging && (
        <div className="anim-fade-in fixed inset-0 z-[160] grid place-items-center bg-primary/25 backdrop-blur-[2px]">
          <div className="anim-pop-in flex flex-col items-center gap-3 rounded-[2rem] border-2 border-dashed border-primary bg-surface-high px-12 py-9 shadow-e5">
            <span className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-primary text-on-primary [animation:float_2s_ease-in-out_infinite]">
              <FileDown size={32} />
            </span>
            <p className="text-[1.0625rem] font-semibold">{tr("drop.hint")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
