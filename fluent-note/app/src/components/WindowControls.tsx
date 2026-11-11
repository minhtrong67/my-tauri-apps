import { useEffect, useState } from "react";
import { X as Dismiss, Minimize, MaximizeBox, RestoreBox } from "./ui/icons";
import { win } from "../lib/tauri";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";

/** Windows 11 caption buttons (minimize, maximize / restore, close) for the integrated title bar. */
export function WindowControls({ className }: { className?: string }) {
  const t = useT();
  const [maximized, setMaximized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const w = win();
    if (!w) return;
    let off: (() => void) | undefined;
    let dead = false;
    const update = () => {
      void w.isMaximized().then(setMaximized, () => {});
      void w.isFullscreen().then(setFullscreen, () => {});
    };
    update();
    void w.onResized(update).then((f) => (dead ? f() : (off = f)));
    return () => {
      dead = true;
      off?.();
    };
  }, []);

  // in full screen Windows hides the caption buttons too
  if (fullscreen) return null;

  const btn = "grid h-full w-[46px] flex-none place-items-center text-fg transition-colors duration-100";
  return (
    <div className={cn("flex flex-none self-stretch", className)}>
      <button type="button" aria-label={t("window.minimize")} className={cn(btn, "hover:bg-sub-hover active:bg-sub-press")} onClick={() => void win()?.minimize()}>
        <Minimize size={16} />
      </button>
      <button
        type="button"
        aria-label={maximized ? t("window.restore") : t("window.maximize")}
        className={cn(btn, "hover:bg-sub-hover active:bg-sub-press")}
        onClick={() => void win()?.toggleMaximize()}
      >
        {maximized ? <RestoreBox size={16} /> : <MaximizeBox size={14} />}
      </button>
      <button
        type="button"
        aria-label={t("window.close")}
        className={cn(btn, "hover:bg-[#c42b1c] hover:text-white active:bg-[#b02518] active:text-white")}
        onClick={() => void win()?.close()}
      >
        <Dismiss size={16} />
      </button>
    </div>
  );
}

/** Slim title bar shown in focus mode (the normal bar is hidden): a place to drag the window and the caption buttons. */
export function ZenTitleBar() {
  return (
    <div data-tauri-drag-region className="flex h-8 flex-none items-stretch">
      <div data-tauri-drag-region className="flex-1" />
      <WindowControls />
    </div>
  );
}
