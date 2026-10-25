import { useCallback, useEffect, useRef, useState } from "react";
import { MousePointerClick } from "lucide-react";
import { TitleBar } from "./layout/TitleBar";
import { NavRail, type Page } from "./layout/NavRail";
import { AboutDialog } from "./components/AboutDialog";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { ToastHost } from "./components/ui/ToastHost";
import { Cookie } from "./components/ui/Progress";
import DownloadPage from "./pages/DownloadPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import { useIntake, useSettings } from "./lib/stores";
import { applyTheme, applyTypography } from "./lib/theme";
import { invoke, listen, urlsIn, type ProgressEvt } from "./lib/tauri";
import { useActiveCount, useOverallPercent, useQueue } from "./lib/queue";
import { autoCheck, checkYtdlpUpdate, refreshTools, useToolState, type ToolId } from "./lib/tools";
import { useI18n } from "./lib/i18n";

const isEditable = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

export default function App() {
  const { s, set } = useSettings();
  const { lang, t } = useI18n();
  const [page, setPage] = useState<Page>("download");
  const [about, setAbout] = useState(false);
  const [help, setHelp] = useState(false);
  const [dragging, setDragging] = useState(false);
  const active = useActiveCount();
  const pct = useOverallPercent();
  const intakeSeq = useIntake((x) => x.seq);
  const drag = useRef(0);

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
  // Tiến độ tổng hiện trên tiêu đề cửa sổ / thanh tác vụ
  useEffect(() => { document.title = active > 0 ? `${pct > 0 ? pct + "% · " : ""}MP3 Downloader` : "MP3 Downloader"; }, [active, pct]);
  // Có link mới từ kéo-thả / dán → chuyển về trang Tải xuống
  useEffect(() => { if (intakeSeq > 0) setPage("download"); }, [intakeSeq]);

  useEffect(() => {
    const un: Promise<() => void>[] = [
      listen<ProgressEvt>("download-progress", (p) => useQueue.getState().onEvent(p)),
      listen<{ tool: ToolId; percent: number }>("tool-progress", (p) => useToolState.getState().setP(p.tool, p.percent)),
    ];
    requestAnimationFrame(() => requestAnimationFrame(() => invoke("show_main").catch(() => {})));
    (async () => {
      try { if (!useSettings.getState().s.outDir) set({ outDir: await invoke<string>("default_output_dir") }); } catch { /* */ }
      await refreshTools();
      if (autoCheck()) checkYtdlpUpdate(false);
    })();
    return () => { un.forEach((p) => p.then((f) => f())); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Phím tắt ── */
  const pasteAnywhere = useCallback(async () => {
    let v = "";
    try { v = await invoke<string>("read_clipboard"); } catch { try { v = await navigator.clipboard.readText(); } catch { /* */ } }
    if (v.trim()) useIntake.getState().push(v.trim());
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const editing = isEditable(e.target);
      const k = e.key.toLowerCase();
      if (mod && k === "1") { e.preventDefault(); setPage("download"); }
      else if (mod && k === "2") { e.preventDefault(); setPage("history"); }
      else if (mod && (k === "3" || k === ",")) { e.preventDefault(); setPage("settings"); }
      else if ((mod && k === "k") || (!mod && !editing && k === "/")) { e.preventDefault(); setPage("download"); useIntake.getState().focusInput(); }
      else if (!mod && !editing && e.key === "?") { e.preventDefault(); setHelp(true); }
      else if (mod && k === "v" && !editing) { e.preventDefault(); pasteAnywhere(); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [pasteAnywhere]);

  /* ── Kéo-thả link / văn bản vào cửa sổ ── */
  useEffect(() => {
    const has = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].some((x) => x === "text/plain" || x === "text/uri-list");
    const enter = (e: DragEvent) => { if (!has(e)) return; e.preventDefault(); drag.current++; setDragging(true); };
    const over = (e: DragEvent) => { if (has(e)) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; } };
    const leave = () => { drag.current = Math.max(0, drag.current - 1); if (!drag.current) setDragging(false); };
    const drop = (e: DragEvent) => {
      drag.current = 0; setDragging(false);
      if (!has(e)) return;
      e.preventDefault();
      const txt = (e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain") || "").trim();
      const urls = urlsIn(txt);
      useIntake.getState().push(urls.length ? urls.join("\n") : txt);
    };
    addEventListener("dragenter", enter); addEventListener("dragover", over); addEventListener("dragleave", leave); addEventListener("drop", drop);
    return () => { removeEventListener("dragenter", enter); removeEventListener("dragover", over); removeEventListener("dragleave", leave); removeEventListener("drop", drop); };
  }, []);

  return (
    <div className="flex h-full flex-col bg-surface transition-colors duration-300">
      <TitleBar />
      <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr] max-sm:grid-cols-1 max-sm:grid-rows-[1fr_auto]">
        <NavRail page={page} onPage={setPage} onAbout={() => setAbout(true)} badge={active} />
        <main id="main" className="relative min-h-0 overflow-y-auto overflow-x-hidden rounded-tl-m3-xl bg-surface-low transition-colors duration-300 max-sm:rounded-none">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true"><div className="absolute -right-24 top-10 h-72 w-72 text-primary/[.06]"><Cookie size={288} style={{ animation: "float 9s ease-in-out infinite" }} /></div></div>
          <div className="relative mx-auto max-w-[820px] px-8 pb-12 pt-8 max-sm:px-4 max-sm:pt-5">
            <div className={page === "download" ? "animate-page" : "hidden"}><DownloadPage /></div>
            {page === "history" && <div className="animate-page"><HistoryPage /></div>}
            {page === "settings" && <div className="animate-page"><SettingsPage /></div>}
          </div>
        </main>
      </div>
      <AboutDialog open={about} onClose={() => setAbout(false)} onShortcuts={() => setHelp(true)} />
      <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
      <ToastHost />
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[250] grid place-items-center bg-primary/10 p-6 backdrop-blur-[2px] animate-pop" aria-hidden="true">
          <div className="flex flex-col items-center gap-3 rounded-m3-2xl border-4 border-dashed border-primary bg-surface-high/90 px-14 py-12 text-center shadow-e3">
            <div className="relative grid h-24 w-24 place-items-center"><Cookie size={96} className="absolute text-primary-container" style={{ animation: "cookie-spin 3s linear infinite" }} /><MousePointerClick className="relative h-9 w-9 text-on-primary-container" /></div>
            <p className="t-headline">{t("dnd.title")}</p><p className="t-body text-on-surface-variant">{t("dnd.sub")}</p>
          </div>
        </div>)}
    </div>
  );
}
