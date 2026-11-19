import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { Files, FolderHeart, Heart, Images, Settings as Gear, Image as ImageIcon, Upload, RefreshCw, PanelLeft } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { app, confirmDialog, settings, setSetting, useApp, useSettings, useT, t } from "./lib/store";
import { applyMaterial, applyTheme, FONTS } from "./lib/theme";
import { api, isTauri } from "./lib/tauri";
import { boot, openPath, setScope } from "./lib/actions";
import { cx } from "./lib/utils";
import { Gallery } from "./features/Gallery";
import { Viewer } from "./features/Viewer";
import { Editor } from "./features/Editor";
import { SettingsDialog } from "./features/SettingsDialog";
import { BatchRenameDialog, DuplicatesDialog } from "./features/Dialogs";
import { ConfirmHost, MenuHost, PromptHost, ToastHost, TooltipHost } from "./components/Overlays";
import { Btn, Tip } from "./components/ui";
import type { Scope } from "./lib/types";

class Boundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: Error) { return { err: e.message }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="h-full grid place-items-center p-8 text-center bg-surface text-on-surface"><div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">{t("err.title")}</h1><p className="text-on-surface-variant">{t("err.generic")}</p>
        <code className="block text-xs bg-surface-high rounded-lg p-3 break-all">{this.state.err}</code>
        <Btn kind="filled" icon={RefreshCw} onClick={() => location.reload()}>{t("err.retry")}</Btn></div></div>
    );
  }
}

function useTheme() {
  const theme = useSettings((s) => s.theme), accent = useSettings((s) => s.accent), size = useSettings((s) => s.fontSize), font = useSettings((s) => s.font);
  const lang = useSettings((s) => s.lang), reduce = useSettings((s) => s.reduceMotion), material = useSettings((s) => s.material);
  useEffect(() => {
    const run = () => {
      const dark = applyTheme(theme, accent, size, (FONTS.find((f) => f.id === font) ?? FONTS[0]).stack);
      applyMaterial(theme, material, dark).then((ok) => app.set({ materialOk: ok }));
    };
    run();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", run);
    return () => mq.removeEventListener("change", run);
  }, [theme, accent, size, font, material]);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.classList.toggle("reduce-motion", reduce); }, [lang, reduce]);
}

/** Asks before leaving the editor with unsaved changes. */
async function canLeave() {
  if (!app.get().editorDirty) return true;
  return confirmDialog({ title: t("ed.discardTitle"), desc: t("ed.discardDesc"), confirm: t("ed.discard"), kind: "danger" });
}

function Nav() {
  const tt = useT();
  const scope = useApp((s) => s.scope);
  const view = useApp((s) => s.view);
  const current = useApp((s) => s.current);
  const pref = useSettings((s) => s.navCompact);
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => { const f = () => setW(window.innerWidth); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const compact = pref || w < 960;
  const go = useCallback(async (sc: Scope) => { if (await canLeave()) { app.set({ editorDirty: false }); setScope(sc); } }, []);
  const items: { id: string; icon: typeof Images; label: string; on: boolean; run: () => void }[] = [
    { id: "all", icon: Images, label: tt("nav.gallery"), on: view === "gallery" && scope.kind === "all", run: () => go({ kind: "all" }) },
    { id: "fav", icon: Heart, label: tt("nav.favorites"), on: scope.kind === "fav" && view === "gallery", run: () => go({ kind: "fav" }) },
    { id: "alb", icon: FolderHeart, label: tt("nav.albums"), on: (scope.kind === "albums" || scope.kind === "album") && view === "gallery", run: () => go({ kind: "albums" }) },
    ...(current ? [{ id: "view", icon: ImageIcon, label: tt("nav.viewer"), on: false, run: () => app.set({ view: "viewer" }) }] : []),
  ];
  const extra = [
    { id: "dup", icon: Files, label: tt("nav.duplicates"), on: false, run: () => app.set({ dupOpen: true }) },
    { id: "set", icon: Gear, label: tt("nav.settings"), on: false, run: () => app.set({ settingsOpen: true }) },
  ];
  type It = (typeof items)[number];
  const Item = ({ it, row }: { it: It; row: boolean }) => (
    <Tip label={it.label} side={row ? "right" : "top"} disabled={row && !compact}>
      <button onClick={it.run} aria-current={it.on} aria-label={it.label}
        className={row ? cx("nav-item", it.on && "on", compact && "!px-0 justify-center") : cx("flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-md", it.on ? "text-primary" : "text-on-surface-variant")}>
        <it.icon size={row ? 18 : 20} strokeWidth={1.75} fill={it.on && it.id === "fav" ? "currentColor" : "none"} className="shrink-0" />
        {row ? !compact && <span className="truncate">{it.label}</span> : <span className="text-[.7rem] leading-3 truncate max-w-full">{it.label}</span>}
      </button>
    </Tip>
  );
  return (
    <>
      <nav className="hidden md:flex flex-col shrink-0 px-1 pb-2 pt-1 gap-0.5 transition-[width] duration-200 ease-fluent" style={{ width: compact ? "var(--nav-w-compact)" : "var(--nav-w)", paddingInline: compact ? 3 : 4 }} aria-label="main">
        <div className={cx("flex items-center h-10 mb-1", compact ? "justify-center" : "gap-1 pl-1")}>
          <Tip label={tt("nav.toggle")} side="right"><button onClick={() => setSetting("navCompact", !pref)} aria-label={tt("nav.toggle")} disabled={w < 960} className="btn btn-icon shrink-0"><PanelLeft size={18} strokeWidth={1.75} /></button></Tip>
          {!compact && <><img src="/icon.svg" alt="" className="size-5 ml-1 shrink-0" draggable={false} /><span className="font-semibold truncate">{tt("app")}</span></>}
        </div>
        <div className="flex flex-col gap-0.5">{items.map((it) => <Item key={it.id} it={it} row />)}</div>
        <div className="flex-1" />
        <div className="flex flex-col gap-0.5">{extra.map((it) => <Item key={it.id} it={it} row />)}</div>
      </nav>
      <nav className="md:hidden shrink-0 order-last flex justify-around items-stretch px-2 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] bg-layer border-t border-outline-variant" aria-label="main">
        {[...items.slice(0, 3), extra[1]].map((it) => <Item key={it.id} it={it} row={false} />)}
      </nav>
    </>
  );
}

function Shell() {
  useTheme();
  const tt = useT();
  const view = useApp((s) => s.view);
  const current = useApp((s) => s.current);
  const [drop, setDrop] = useState(false);

  useEffect(() => {
    boot();
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => { if (isTauri) api.showWindow().catch(() => {}); }));
    const noCtx = (e: MouseEvent) => { const el = e.target as HTMLElement; if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") e.preventDefault(); };
    window.addEventListener("contextmenu", noCtx);
    let un: (() => void) | undefined;
    if (isTauri) getCurrentWebview().onDragDropEvent((e) => {
      const p = e.payload;
      if (p.type === "enter" || p.type === "over") setDrop(true);
      else if (p.type === "leave") setDrop(false);
      else if (p.type === "drop") { setDrop(false); if (p.paths[0]) openPath(p.paths[0]); }
    }).then((f) => (un = f));
    return () => { cancelAnimationFrame(raf); window.removeEventListener("contextmenu", noCtx); un?.(); };
  }, []);

  useEffect(() => { document.title = view === "gallery" || !current ? tt("app") : `${current.split(/[\\/]/).pop()} - ${tt("app")}`; }, [view, current, tt]);
  void setSetting; void settings;

  return (
    <div className="h-full flex flex-col md:flex-row bg-app text-on-surface" style={{ ["--toast-bottom" as string]: view === "viewer" ? "10px" : "24px" }}>
      {view === "gallery" && <Nav />}
      <main className={cx("flex-1 min-w-0 min-h-0 relative", view === "gallery" ? "overflow-hidden bg-layer border-t border-outline-variant md:border-l md:rounded-tl-lg" : "")}>
        {view === "gallery" && <div key="g" className="h-full anim-fade"><Gallery /></div>}
        {view === "viewer" && current && <div key="v" className="h-full anim-fade"><Viewer /></div>}
        {view === "editor" && current && <div key="e" className="h-full anim-fade"><Editor /></div>}
      </main>
      {drop && <div className="dropzone"><div className="flex flex-col items-center gap-3 text-primary anim-pop"><Upload size={48} strokeWidth={1.5} /><div className="text-2xl font-semibold">{tt("gal.drop")}</div></div></div>}
      <SettingsDialog /><BatchRenameDialog /><DuplicatesDialog /><ConfirmHost /><PromptHost /><MenuHost /><TooltipHost /><ToastHost />
    </div>
  );
}

export default function App() { return <Boundary><Shell /></Boundary>; }
