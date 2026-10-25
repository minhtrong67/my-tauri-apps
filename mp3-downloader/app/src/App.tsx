import { useEffect, useState } from "react";
import { TitleBar } from "./layout/TitleBar";
import { NavRail, type Page } from "./layout/NavRail";
import { AboutDialog } from "./components/AboutDialog";
import { ToastHost } from "./components/ui/ToastHost";
import DownloadPage from "./pages/DownloadPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import { useSettings } from "./lib/stores";
import { applyTheme, applyTypography, prefersDark } from "./lib/theme";
import { invoke, listen, type ProgressEvt } from "./lib/tauri";
import { ACTIVE, useQueue } from "./lib/queue";
import { autoCheck, checkYtdlpUpdate, refreshTools, useToolState, type ToolId } from "./lib/tools";
import { useI18n } from "./lib/i18n";

export default function App() {
  const { s, set } = useSettings();
  const { lang } = useI18n();
  const [page, setPage] = useState<Page>("download");
  const [about, setAbout] = useState(false);
  const active = useQueue((q) => q.items.filter((i) => ACTIVE.includes(i.stage) || i.stage === "queued").length);

  useEffect(() => { applyTheme(s.seed, s.mode); }, [s.seed, s.mode]);
  useEffect(() => {
    if (s.mode !== "auto") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyTheme(s.seed, "auto");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [s.mode, s.seed]);
  useEffect(() => { applyTypography(s.font, s.fontSize); }, [s.font, s.fontSize]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    const un: Promise<() => void>[] = [
      listen<ProgressEvt>("download-progress", (p) => useQueue.getState().onEvent(p)),
      listen<{ tool: ToolId; percent: number }>("tool-progress", (p) => useToolState.getState().setP(p.tool, p.percent)),
    ];
    // Hiện cửa sổ sau khi đã vẽ xong (tránh nháy trắng); backend có bộ đếm dự phòng.
    requestAnimationFrame(() => requestAnimationFrame(() => invoke("show_main").catch(() => {})));
    (async () => {
      try { if (!useSettings.getState().s.outDir) set({ outDir: await invoke<string>("default_output_dir") }); } catch { /* */ }
      await refreshTools();
      if (autoCheck()) checkYtdlpUpdate(false);
    })();
    return () => { un.forEach((p) => p.then((f) => f())); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  void prefersDark;
  return (
    <div className="flex h-full flex-col bg-surface transition-colors duration-300">
      <TitleBar />
      <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr] max-sm:grid-cols-1 max-sm:grid-rows-[1fr_auto]">
        <NavRail page={page} onPage={setPage} onAbout={() => setAbout(true)} badge={active} />
        <main id="main" className="min-h-0 overflow-y-auto rounded-tl-m3-xl bg-surface-low transition-colors duration-300 max-sm:rounded-none">
          <div className="mx-auto max-w-[820px] px-8 pb-12 pt-8 max-sm:px-4 max-sm:pt-5">
            <div className={page === "download" ? "animate-page" : "hidden"}><DownloadPage /></div>
            {page === "history" && <div className="animate-page"><HistoryPage /></div>}
            {page === "settings" && <div className="animate-page"><SettingsPage /></div>}
          </div>
        </main>
      </div>
      <AboutDialog open={about} onClose={() => setAbout(false)} />
      <ToastHost />
    </div>
  );
}
