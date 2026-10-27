import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { Files, FolderHeart, Heart, Images, Settings as Gear, Image as ImageIcon, Upload, RefreshCw } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { app, confirmDialog, settings, setSetting, useApp, useSettings, useT, t } from "./lib/store";
import { applyTheme, FONTS } from "./lib/theme";
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
        <h1 className="text-2xl font-extrabold">{t("err.title")}</h1><p className="text-on-surface-variant">{t("err.generic")}</p>
        <code className="block text-xs bg-surface-high rounded-2xl p-3 break-all">{this.state.err}</code>
        <Btn kind="filled" icon={RefreshCw} onClick={() => location.reload()}>{t("err.retry")}</Btn></div></div>
    );
  }
}

function useTheme() {
  const theme = useSettings((s) => s.theme), seed = useSettings((s) => s.seed), size = useSettings((s) => s.fontSize), font = useSettings((s) => s.font);
  const lang = useSettings((s) => s.lang), reduce = useSettings((s) => s.reduceMotion);
  useEffect(() => {
    const run = () => applyTheme(theme, seed, size, (FONTS.find((f) => f.id === font) ?? FONTS[0]).stack);
    run();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", run);
    return () => mq.removeEventListener("change", run);
  }, [theme, seed, size, font]);
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
  const go = useCallback(async (sc: Scope) => { if (await canLeave()) { app.set({ editorDirty: false }); setScope(sc); } }, []);
  const items: { id: string; icon: typeof Images; label: string; on: boolean; run: () => void; desktopOnly?: boolean }[] = [
    { id: "all", icon: Images, label: tt("nav.gallery"), on: view === "gallery" && scope.kind === "all", run: () => go({ kind: "all" }) },
    { id: "fav", icon: Heart, label: tt("nav.favorites"), on: scope.kind === "fav" && view === "gallery", run: () => go({ kind: "fav" }) },
    { id: "alb", icon: FolderHeart, label: tt("nav.albums"), on: (scope.kind === "albums" || scope.kind === "album") && view === "gallery", run: () => go({ kind: "albums" }) },
    ...(current ? [{ id: "view", icon: ImageIcon, label: tt("nav.viewer"), on: false, run: () => app.set({ view: "viewer" }) }] : []),
  ];
  const extra = [
    { id: "dup", icon: Files, label: tt("nav.duplicates"), run: () => app.set({ dupOpen: true }) },
    { id: "set", icon: Gear, label: tt("nav.settings"), run: () => app.set({ settingsOpen: true }) },
  ];
  const Item = ({ it, side }: { it: { id: string; icon: typeof Images; label: string; on?: boolean; run: () => void }; side: "right" | "top" }) => (
    <Tip label={it.label} side={side}>
      <button onClick={it.run} aria-current={it.on} className="group flex flex-col items-center gap-1 w-full py-1 min-w-[4rem]">
        <span className={cx("h-8 grid place-items-center transition-all duration-500 ease-spring", it.on ? "w-16 rounded-full bg-secondary-container text-on-secondary-container" : "w-14 rounded-[14px] text-on-surface-variant group-hover:bg-on-surface/8 group-hover:w-16 group-hover:rounded-full group-active:scale-90")}>
          <it.icon size={22} strokeWidth={it.on ? 2.4 : 2} fill={it.on && it.id === "fav" ? "currentColor" : "none"} />
        </span>
        <span className={cx("text-[.7rem] leading-3 font-semibold truncate max-w-full transition-colors", it.on ? "text-on-surface" : "text-on-surface-variant")}>{it.label}</span>
      </button>
    </Tip>
  );
  return (
    <>
      <nav className="hidden md:flex flex-col items-center gap-2 w-[88px] shrink-0 py-4 px-1.5" aria-label="main">
        <div className="size-12 mb-2 grid place-items-center"><img src="/icon.svg" alt={tt("app")} className="size-11 drop-shadow" draggable={false} /></div>
        <div className="flex flex-col gap-1 w-full">{items.map((it) => <Item key={it.id} it={it} side="right" />)}</div>
        <div className="flex-1" />
        <div className="flex flex-col gap-1 w-full">{extra.map((it) => <Item key={it.id} it={it} side="right" />)}</div>
      </nav>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex justify-around items-start px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] bg-surface-container shadow-e2 rounded-t-[28px]" aria-label="main">
        {[...items.slice(0, 3), extra[1]].map((it) => <div key={it.id} className="flex-1"><Item it={it as never} side="top" /></div>)}
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
    <div className="h-full flex flex-col md:flex-row bg-surface text-on-surface">
      {view === "gallery" && <Nav />}
      <main className={cx("flex-1 min-w-0 min-h-0 relative", view === "gallery" && "pb-[84px] md:pb-0 md:rounded-l-[32px] md:bg-surface-lowest md:my-2 md:mr-2 md:rounded-[32px] overflow-hidden md:shadow-e1")}>
        {view === "gallery" && <div key="g" className="h-full anim-fade"><Gallery /></div>}
        {view === "viewer" && current && <div key="v" className="h-full anim-fade"><Viewer /></div>}
        {view === "editor" && current && <div key="e" className="h-full anim-fade"><Editor /></div>}
      </main>
      {drop && <div className="dropzone"><div className="flex flex-col items-center gap-3 text-primary anim-pop"><Upload size={56} /><div className="text-2xl font-extrabold">{tt("gal.drop")}</div></div></div>}
      <SettingsDialog /><BatchRenameDialog /><DuplicatesDialog /><ConfirmHost /><PromptHost /><MenuHost /><TooltipHost /><ToastHost />
    </div>
  );
}

export default function App() { return <Boundary><Shell /></Boundary>; }
