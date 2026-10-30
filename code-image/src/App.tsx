import { useCallback, useEffect, useRef, useState } from "react";
import { Code2, Eye, FileUp, LogOut, Save, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import { flushPersist, useApp } from "./lib/store";
import { resolveLang, useT } from "./lib/i18n";
import { applyMaterial, prefersDark } from "./lib/material";
import { applyStartup, closeApp, isTauri, revealFile, saveBlob, watchCloseRequest, watchWindowSize } from "./lib/tauri";
import { UI_FONTS } from "./lib/constants";
import { toast } from "./lib/toast";
import { fileStamp, renderImage } from "./lib/export";
import { languageFromFile } from "./lib/highlight";
import { AppBar } from "./components/AppBar";
import { EditorPanel } from "./components/EditorPanel";
import { StylePanel } from "./components/StylePanel";
import { Preview } from "./components/Preview";
import { SettingsDialog } from "./components/SettingsDialog";
import { Toaster } from "./components/Toaster";
import { Btn, Modal, ScrollArea, cx } from "./components/ui";
import { MAX_FILE } from "./components/EditorPanel";

type Tab = "code" | "preview" | "style";

export default function App() {
  const t = useT();
  const { themeMode, seed, fontScale, lang, uiFont, saveDir, showLeft, showRight, set } = useApp();
  const design = useApp((s) => s.design);
  const setDesign = useApp((s) => s.setDesign);
  const askBeforeSave = useApp((s) => s.askBeforeSave);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [askClose, setAskClose] = useState(false);
  const dirty = useRef(false); // design changed since the last export / copy

  // Theme (Material 3 from seed) + light/dark/system
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyMaterial(seed, themeMode === "system" ? prefersDark() : themeMode === "dark");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [themeMode, seed]);

  useEffect(() => { document.documentElement.dataset.fs = fontScale; }, [fontScale]);
  useEffect(() => {
    const f = UI_FONTS.find((x) => x.id === uiFont) ?? UI_FONTS[0];
    document.documentElement.style.setProperty("--ui-font", f.family);
  }, [uiFont]);
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

  useEffect(() => useApp.subscribe((st, prev) => { if (st.design !== prev.design) dirty.current = true; }), []);

  const quit = async () => { flushPersist(); await closeApp(); };
  useEffect(() => {
    let off = () => {};
    watchCloseRequest(() => { if (dirty.current) setAskClose(true); else quit(); }).then((u) => (off = u));
    const warn = (e: BeforeUnloadEvent) => { if (!isTauri() && dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { off(); window.removeEventListener("beforeunload", warn); };
  }, []);

  const stamp = () => (design.fileName.trim().replace(/\.[^.]+$/, "").replace(/[^\w\-]+/g, "-") || "code-image");
  const bgForJpeg = design.bgType === "solid" ? design.solid : design.bgType === "gradient" ? design.g1 : "#ffffff";

  const download = useCallback(async (): Promise<boolean> => {
    if (!canvasRef.current || busy) return false;
    setBusy(true);
    let ok = false;
    try {
      const ext = design.format === "jpeg" ? "jpg" : design.format;
      const blob = await renderImage(canvasRef.current, design.format, design.scale, bgForJpeg);
      const path = await saveBlob(blob, `${stamp()}-${fileStamp()}.${ext}`, askBeforeSave, saveDir);
      if (path) ok = true;
      if (path) dirty.current = false;
      if (path) toast.success(`${t("savedTo")} ${path}`, isTauri() ? { action: { label: t("showInFolder"), run: () => revealFile(path).catch(() => {}) } } : undefined);
    } catch (e) { console.error(e); toast.error(t("exportFail")); }
    finally { setBusy(false); }
    return ok;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, design, askBeforeSave, saveDir, t]);

  const copy = useCallback(async () => {
    if (!canvasRef.current || busy) return;
    setBusy(true);
    try {
      const item = new ClipboardItem({ "image/png": renderImage(canvasRef.current, "png", design.scale, bgForJpeg) });
      await navigator.clipboard.write([item]);
      setFlashKey((k) => k + 1);
      dirty.current = false;
      toast.success(t("copied"));
    } catch (e) { console.error(e); toast.error(t("copyFail")); }
    finally { setBusy(false); }
  }, [busy, design.scale, bgForJpeg, t]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === ",") { e.preventDefault(); setShowSettings(true); }
      else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        const st = useApp.getState();
        if (e.altKey) st.set({ showRight: !st.showRight }); else st.set({ showLeft: !st.showLeft });
      }
      else if (e.key.toLowerCase() === "o") { e.preventDefault(); window.dispatchEvent(new Event("ci:open")); }
      else if (e.key.toLowerCase() === "s") { e.preventDefault(); download(); }
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
    if (f.size > MAX_FILE) { toast.warning(t("fileTooLarge")); return; }
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
        <aside key={`c-${tab === "code"}`} className={cx("min-h-0 w-full flex-col overflow-hidden rounded-m3xl bg-surface-container animate-slideIn lg:flex lg:shrink-0 lg:transition-[width,margin,opacity,visibility] lg:duration-500 lg:ease-emph",
          showLeft ? "lg:w-[340px] xl:w-[400px]" : "lg:invisible lg:-mr-3 lg:w-0 lg:opacity-0 xl:w-0", tab === "code" ? "flex" : "hidden")}>
          <div className="min-h-0 w-full flex-1 lg:w-[340px] xl:w-[400px]"><EditorPanel /></div>
        </aside>
        <section className={cx("min-h-0 min-w-0 flex-1 overflow-hidden rounded-m3xl bg-surface-container lg:flex lg:flex-col", tab === "preview" ? "flex flex-col" : "hidden")}>
          <div className="min-h-0 flex-1"><Preview canvasRef={canvasRef} busy={busy} flashKey={flashKey} /></div>
          <div className="hidden shrink-0 pb-3 text-center text-xs text-on-surface-variant lg:block">{t("shortcuts")}</div>
        </section>
        <aside key={`s-${tab === "style"}`} className={cx("min-h-0 w-full overflow-hidden rounded-m3xl bg-surface-container animate-slideIn lg:block lg:shrink-0 lg:transition-[width,margin,opacity,visibility] lg:duration-500 lg:ease-emph",
          showRight ? "lg:w-[320px] xl:w-[360px]" : "lg:invisible lg:-ml-3 lg:w-0 lg:opacity-0 xl:w-0", tab === "style" ? "block" : "hidden")}>
          <div className="h-full w-full lg:w-[320px] xl:w-[360px]"><ScrollArea className="h-full" label={t("scrollTop")}><StylePanel /></ScrollArea></div>
        </aside>
      </main>

      <nav className="grid h-20 shrink-0 grid-cols-3 bg-surface-high lg:hidden">
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)} className="group flex flex-col items-center justify-center gap-1 text-xs text-on-surface-variant">
            <span className={cx("grid h-8 place-items-center rounded-full transition-all duration-500 ease-spring", tab === x.id ? "w-20 ":"w-14 ", tab === x.id ? "bg-secondary-container text-on-secondary-container" : "group-hover:bg-on-surface/8")}>{x.icon}</span>
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
      <Toaster />
      {askClose && (
        <Modal onClose={() => setAskClose(false)} label={t("closeTitle")} className="w-full max-w-lg p-6">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-[40%_60%_55%_45%/55%_45%_60%_40%] bg-warning-container text-on-warning-container"><TriangleAlert size={26} /></div>
          <h2 className="text-xl font-medium text-on-surface">{t("closeTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{t("closeMsg")}</p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Btn variant="tonal" icon={<X size={18} />} onClick={() => setAskClose(false)}>{t("cancel")}</Btn>
            <Btn variant="danger" icon={<LogOut size={18} />} onClick={quit}>{t("dontSave")}</Btn>
            <Btn variant="filled" icon={busy ? <Save size={18} className="animate-pulse" /> : <Save size={18} />} disabled={busy} data-autofocus
              onClick={async () => { if (await download()) quit(); }}>{t("saveClose")}</Btn>
          </div>
        </Modal>
      )}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  );
}
