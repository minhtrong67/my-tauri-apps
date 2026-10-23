import { useEffect } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { FolderOpen, X } from "lucide-react";
import { activeDoc, closeDoc, gotoPage, openBytes, openPicker, printDoc, redoAnnot, saveDoc, setZoom, undoAnnot } from "./lib/actions";
import { launchFile, openPath, isTauri } from "./lib/native";
import { stepHit } from "./lib/search";
import { useDoc, useLang, useStore, useT } from "./lib/store";
import { fontStack } from "./lib/fonts";
import { applyScheme, resolveDark, watchSystemTheme } from "./lib/theme";
import { initWindow, onCloseRequest, setFullscreen, setWindowTitle } from "./lib/window";
import { AnnotBar, Toolbar, startPresent } from "./components/Toolbar";
import { Tabs } from "./components/Tabs";
import { Sidebar } from "./components/Sidebar";
import { Viewer } from "./components/Viewer";
import { Welcome } from "./components/Welcome";
import { DialogHost } from "./components/Dialogs";
import { TooltipHost } from "./components/Tooltip";

const FONT_PX = { small: 14, medium: 16, large: 18 } as const;

export default function App() {
  const t = useT();
  const lang = useLang();
  const doc = useDoc();
  const { settings, present, toast, dragging } = useStore();

  // theme + font size + language + animations
  useEffect(() => {
    const apply = () => applyScheme(settings.seed, resolveDark(settings.themeMode));
    apply();
    return settings.themeMode === "system" ? watchSystemTheme(apply) : undefined;
  }, [settings.themeMode, settings.seed]);
  useEffect(() => { document.documentElement.style.fontSize = FONT_PX[settings.fontSize] + "px"; }, [settings.fontSize]);
  useEffect(() => { document.documentElement.style.setProperty("--font", fontStack(settings.font)); }, [settings.font]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { document.documentElement.dataset.anim = settings.animations ? "on" : "off"; }, [settings.animations]);
  useEffect(() => { setWindowTitle(doc ? `${doc.dirty ? "• " : ""}${doc.name} — Material PDF` : "Material PDF"); }, [doc?.name, doc?.dirty]);

  // window startup behaviour, launch file, drag & drop, close guard
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    (async () => {
      await initWindow(useStore.getState().settings.startup);
      const f = await launchFile();
      if (f) await openBytes(await openPath(f));
      if (isTauri) {
        unsubs.push(await getCurrentWebview().onDragDropEvent(async (e) => {
          const p = e.payload;
          if (p.type === "enter" || p.type === "over") useStore.getState().setDragging(true);
          else if (p.type === "leave") useStore.getState().setDragging(false);
          else if (p.type === "drop") {
            useStore.getState().setDragging(false);
            for (const path of p.paths.filter((x) => /\.pdf$/i.test(x))) await openBytes(await openPath(path));
          }
        }));
      }
      await onCloseRequest(() => {
        if (!useStore.getState().docs.some((d) => d.dirty)) return false;
        useStore.getState().openDialog("quit"); return true;
      });
    })();
    // browser fallback drag & drop
    const over = (e: DragEvent) => { e.preventDefault(); useStore.getState().setDragging(true); };
    const leave = (e: DragEvent) => { if (!e.relatedTarget) useStore.getState().setDragging(false); };
    const drop = async (e: DragEvent) => {
      e.preventDefault(); useStore.getState().setDragging(false);
      for (const f of [...(e.dataTransfer?.files ?? [])].filter((x) => /\.pdf$/i.test(x.name)))
        await openBytes({ path: null, name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
    };
    if (!isTauri) { addEventListener("dragover", over); addEventListener("dragleave", leave); addEventListener("drop", drop); }
    return () => { unsubs.forEach((u) => u()); removeEventListener("dragover", over); removeEventListener("dragleave", leave); removeEventListener("drop", drop); };
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const s = useStore.getState(), d = activeDoc(), mod = e.ctrlKey || e.metaKey;
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName);
      if (s.dialog) return;
      if (mod && e.key.toLowerCase() === "o") { e.preventDefault(); openPicker(); return; }
      if (!d) return;
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); saveDoc(d, e.shiftKey); }
      else if (mod && e.key.toLowerCase() === "p") { e.preventDefault(); printDoc(d); }
      else if (mod && e.key.toLowerCase() === "f") { e.preventDefault(); s.setSidebar(true, "search"); }
      else if (mod && e.key.toLowerCase() === "w") { e.preventDefault(); closeDoc(d.id); }
      else if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); setZoom(d.scale * 1.2); }
      else if (mod && e.key === "-") { e.preventDefault(); setZoom(d.scale / 1.2); }
      else if (mod && e.key === "0") { e.preventDefault(); s.patchDoc(d.id, { fit: "width" }); }
      else if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); e.shiftKey ? redoAnnot() : undoAnnot(); }
      else if (mod && e.key.toLowerCase() === "y" && !typing) { e.preventDefault(); redoAnnot(); }
      else if (e.key === "F3") { e.preventDefault(); stepHit(e.shiftKey ? -1 : 1); }
      else if (e.key === "F5") { e.preventDefault(); startPresent(); }
      else if (e.key === "Escape" && s.present) { s.setPresent(false); setFullscreen(false); }
      else if (e.key === "Escape" && s.tool !== "none") s.setTool("none");
      else if (!typing && !mod && (e.key === "ArrowRight" || (e.key === "PageDown" && s.settings.layout === "single") || e.key === "n")) gotoPage(d.page + 1);
      else if (!typing && !mod && (e.key === "ArrowLeft" || (e.key === "PageUp" && s.settings.layout === "single") || e.key === "p")) gotoPage(d.page - 1);
      else if (!typing && e.key === "Home" && !mod) gotoPage(0);
      else if (!typing && e.key === "End" && !mod) gotoPage(d.numPages - 1);
    };
    addEventListener("keydown", key);
    const fs = () => { if (!document.fullscreenElement && !isTauri) useStore.getState().setPresent(false); };
    document.addEventListener("fullscreenchange", fs);
    return () => { removeEventListener("keydown", key); document.removeEventListener("fullscreenchange", fs); };
  }, []);

  return (
    <div className={`app ${present ? "present" : ""}`}>
      {!present && <Toolbar doc={doc} />}
      {!present && doc && <AnnotBar doc={doc} />}
      {!present && <Tabs />}
      <div className="body">
        {doc ? (
          <>
            {!present && <Sidebar doc={doc} />}
            <Viewer key={doc.id} doc={doc} />
            {present && <div className="present-hint">{t("exitPresent")}</div>}
          </>
        ) : <Welcome />}
      </div>
      <DialogHost />
      <TooltipHost />
      {toast && <div className="snackbar" key={toast.id} role="status"><span>{toast.msg}</span><button aria-label={t("close")} onClick={() => useStore.setState({ toast: null })}><X size={16} /></button></div>}
      {dragging && <div className="drop-overlay"><div><FolderOpen size={48} /><b>{t("drop")}</b></div></div>}
    </div>
  );
}
