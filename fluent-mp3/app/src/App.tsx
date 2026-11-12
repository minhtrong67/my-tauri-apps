import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownload24Regular } from "@fluentui/react-icons";
import { getCurrentWindow, ProgressBarStatus } from "@tauri-apps/api/window";
import { TitleBar } from "./layout/TitleBar";
import { NavPane, type Page } from "./layout/NavPane";
import { AboutDialog } from "./components/AboutDialog";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { ToastHost } from "./components/ui/ToastHost";
import DownloadPage from "./pages/DownloadPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import { useIntake, useSettings } from "./lib/stores";
import { applyTheme, applyTypography, useDark, useNarrow } from "./lib/theme";
import { applyEffect } from "./lib/effect";
import { inTauri, invoke, listen, urlsIn, type ProgressEvt } from "./lib/tauri";
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

  const dark = useDark(s.mode);
  const narrow = useNarrow(900);
  const shown = useRef(false);
  useEffect(() => { applyTheme(s.seed, dark); }, [s.seed, dark]);
  // Chất liệu cửa sổ (Mica / Acrylic / Mica Alt). Cửa sổ chỉ hiện sau khi hiệu ứng đã áp dụng để không bị nháy.
  useEffect(() => {
    (async () => {
      await applyEffect(s.effect, dark, s.mode === "auto");
      if (!shown.current) {
        shown.current = true;
        requestAnimationFrame(() => requestAnimationFrame(() => invoke("show_main").catch(() => {})));
      }
    })();
  }, [s.effect, s.mode, dark]);
  useEffect(() => { applyTypography(s.font, s.fontSize); }, [s.font, s.fontSize]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  // Tiến độ tổng hiện trên tiêu đề cửa sổ / thanh tác vụ
  useEffect(() => { document.title = active > 0 ? `${pct > 0 ? pct + "% · " : ""}Fluent MP3` : "Fluent MP3"; }, [active, pct]);
  // Tiến độ tổng hiện trên biểu tượng ở thanh tác vụ Windows
  useEffect(() => {
    if (!inTauri) return;
    const w = getCurrentWindow();
    (active > 0
      ? w.setProgressBar(pct > 0 ? { status: ProgressBarStatus.Normal, progress: pct } : { status: ProgressBarStatus.Indeterminate })
      : w.setProgressBar({ status: ProgressBarStatus.None })
    ).catch(() => {});
  }, [active, pct]);
  // Có link mới từ kéo-thả / dán → chuyển về trang Tải xuống
  useEffect(() => { if (intakeSeq > 0) setPage("download"); }, [intakeSeq]);

  useEffect(() => {
    const un: Promise<() => void>[] = [
      listen<ProgressEvt>("download-progress", (p) => useQueue.getState().onEvent(p)),
      listen<{ tool: ToolId; percent: number }>("tool-progress", (p) => useToolState.getState().setP(p.tool, p.percent)),
    ];
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

  const navOpen = s.navOpen && !narrow;
  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <NavPane page={page} onPage={setPage} onAbout={() => setAbout(true)} badge={active} open={navOpen} onToggle={() => set({ navOpen: !s.navOpen })} forcedCompact={narrow} />
        <main id="main" className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-tl-ovl border-l border-t border-card-line bg-layer">
          <div className="mx-auto max-w-[900px] px-8 pb-10 pt-7">
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
        <div className="animate-fade pointer-events-none fixed inset-x-0 bottom-0 top-8 z-[250] grid place-items-center bg-smoke p-6" aria-hidden="true">
          <div className="animate-pop flex flex-col items-center gap-3 rounded-ovl border-2 border-dashed border-acc bg-flyout px-14 py-10 text-center shadow-dlg">
            <ArrowDownload24Regular className="h-10 w-10 text-acc-text" />
            <p className="text-subtitle font-semibold">{t("dnd.title")}</p><p className="text-body text-fg-2">{t("dnd.sub")}</p>
          </div>
        </div>)}
    </div>
  );
}
