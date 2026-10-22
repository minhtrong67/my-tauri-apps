import { useCallback, useEffect, useRef, useState } from "react";
import { Code2, Eye, FileUp, Info, SlidersHorizontal } from "lucide-react";
import { useApp } from "./lib/store";
import { resolveLang, useT } from "./lib/i18n";
import { applyMaterial, prefersDark } from "./lib/material";
import { applyStartup, saveBlob, watchWindowSize } from "./lib/tauri";
import { fileStamp, renderImage } from "./lib/export";
import { languageFromFile } from "./lib/highlight";
import { AppBar } from "./components/AppBar";
import { EditorPanel } from "./components/EditorPanel";
import { StylePanel } from "./components/StylePanel";
import { Preview } from "./components/Preview";
import { SettingsDialog } from "./components/SettingsDialog";
import { cx } from "./components/ui";

type Tab = "code" | "preview" | "style";

export default function App() {
  const t = useT();
  const { themeMode, seed, fontScale, lang, set } = useApp();
  const design = useApp((s) => s.design);
  const setDesign = useApp((s) => s.setDesign);
  const askBeforeSave = useApp((s) => s.askBeforeSave);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const notify = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  // Theme (Material 3 from seed) + light/dark/system
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyMaterial(seed, themeMode === "system" ? prefersDark() : themeMode === "dark");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [themeMode, seed]);

  useEffect(() => { document.documentElement.dataset.fs = fontScale; }, [fontScale]);
  useEffect(() => { document.documentElement.lang = resolveLang(lang); document.title = "Code Image"; }, [lang]);

  // Window startup option + remembering the size
  useEffect(() => {
    const { windowMode: m, winSize } = useApp.getState();
    applyStartup(m, winSize).catch(() => {});
    let off = () => {};
    watchWindowSize((s) => { if (useApp.getState().windowMode === "remember") set({ winSize: s }); }).then((u) => (off = u));
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stamp = () => (design.fileName.trim().replace(/\.[^.]+$/, "").replace(/[^\w\-]+/g, "-") || "code-image");
  const bgForJpeg = design.bgType === "solid" ? design.solid : design.bgType === "gradient" ? design.g1 : "#ffffff";

  const download = useCallback(async () => {
    if (!canvasRef.current || busy) return;
    setBusy(true);
    try {
      const ext = design.format === "jpeg" ? "jpg" : design.format;
      const blob = await renderImage(canvasRef.current, design.format, design.scale, bgForJpeg);
      const path = await saveBlob(blob, `${stamp()}-${fileStamp()}.${ext}`, askBeforeSave);
      if (path) notify(`${t("savedTo")} ${path}`);
    } catch (e) { console.error(e); notify(t("exportFail")); }
    finally { setBusy(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, design, askBeforeSave, t]);

  const copy = useCallback(async () => {
    if (!canvasRef.current || busy) return;
    setBusy(true);
    try {
      const item = new ClipboardItem({ "image/png": renderImage(canvasRef.current, "png", design.scale, bgForJpeg) });
      await navigator.clipboard.write([item]);
      notify(t("copied"));
    } catch (e) { console.error(e); notify(t("copyFail")); }
    finally { setBusy(false); }
  }, [busy, design.scale, bgForJpeg, notify, t]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "s") { e.preventDefault(); download(); }
      else if (e.shiftKey && e.key.toLowerCase() === "c") { e.preventDefault(); copy(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [download, copy]);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setDesign({ code: await f.text(), fileName: f.name, language: languageFromFile(f.name) ?? "auto" });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "code", label: t("tabCode"), icon: <Code2 size={22} /> },
    { id: "preview", label: t("tabPreview"), icon: <Eye size={22} /> },
    { id: "style", label: t("tabStyle"), icon: <SlidersHorizontal size={22} /> },
  ];

  return (
    <div
      className="flex h-full flex-col bg-surface text-on-surface"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={onDrop}
    >
      <AppBar busy={busy} onDownload={download} onCopy={copy} onSettings={() => setShowSettings(true)} />

      <main className="flex min-h-0 flex-1 gap-3 px-3 pb-3 lg:px-4 lg:pb-4">
        <aside key={`c-${tab === "code"}`} className={cx("min-h-0 w-full flex-col overflow-hidden rounded-m3xl bg-surface-container lg:flex lg:w-[340px] lg:shrink-0 xl:w-[400px] animate-slideIn", tab === "code" ? "flex" : "hidden")}>
          <EditorPanel />
        </aside>
        <section className={cx("min-h-0 min-w-0 flex-1 overflow-hidden rounded-m3xl bg-surface-container lg:flex lg:flex-col", tab === "preview" ? "flex flex-col" : "hidden")}>
          <div className="min-h-0 flex-1"><Preview canvasRef={canvasRef} /></div>
          <div className="hidden shrink-0 pb-3 text-center text-xs text-on-surface-variant lg:block">{t("shortcuts")}</div>
        </section>
        <aside key={`s-${tab === "style"}`} className={cx("min-h-0 w-full overflow-y-auto rounded-m3xl bg-surface-container lg:block lg:w-[320px] lg:shrink-0 xl:w-[360px] animate-slideIn", tab === "style" ? "block" : "hidden")}>
          <StylePanel />
        </aside>
      </main>

      <nav className="grid h-20 shrink-0 grid-cols-3 bg-surface-high lg:hidden">
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)} className="group flex flex-col items-center justify-center gap-1 text-xs text-on-surface-variant">
            <span className={cx("grid h-8 w-16 place-items-center rounded-full transition-all duration-300", tab === x.id ? "bg-secondary-container text-on-secondary-container" : "group-hover:bg-on-surface/8")}>{x.icon}</span>
            <span className={tab === x.id ? "font-medium text-on-surface" : ""}>{x.label}</span>
          </button>
        ))}
      </nav>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 grid animate-fadeIn place-items-center bg-primary/15 backdrop-blur-[2px]">
          <div className="flex animate-rise items-center gap-3 rounded-m3xl bg-primary-container px-6 py-4 text-on-primary-container shadow-e3">
            <FileUp /> {t("dropHint")}
          </div>
        </div>
      )}
      {busy && <div className="sr-only" role="status">{t("exporting")}</div>}
      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 animate-toast items-center gap-3 rounded-m3l bg-surface-highest px-4 py-3 text-sm text-on-surface shadow-e3 ring-1 ring-outline-variant lg:bottom-6">
          <Info size={18} className="shrink-0 text-primary" /><span className="min-w-0 truncate">{toast}</span>
        </div>
      )}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  );
}
