import { memo, useCallback, useId, useRef, useState } from "react";
import { Search, Command, Sun, Moon, Settings, Info, FileText } from "./ui/icons";
import { IconButton } from "./ui/Button";
import { Popover, MenuList, type MenuEntry } from "./ui/Popover";
import { useT } from "../lib/i18n";
import { byId, toggleTheme } from "../lib/commands";
import { useSettings } from "../store/settings";
import { useDocs, clearRecent } from "../store/docs";
import { useUi } from "../store/ui";
import { openPaths } from "../lib/actions";
import { openFind } from "../lib/find";
import { baseName } from "../lib/utils";
import { resolveDark } from "../lib/theme";

/** App mark (same design as the app icon): accent squircle, soft top light, note page with a folded corner. */
export function Logo({ size = 32 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id={id + "b"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "color-mix(in srgb, var(--fl-primary) 72%, #fff)" }} />
          <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--fl-primary) 86%, #000)" }} />
        </linearGradient>
        <linearGradient id={id + "g"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".7" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id + "p"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--fl-primary) 10%, #fff)" }} />
        </linearGradient>
        <filter id={id + "s"} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2.4" stdDeviation="2.2" floodColor="#001a3d" floodOpacity=".38" />
        </filter>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="22" fill={`url(#${id}b)`} />
      <rect x="2" y="2" width="96" height="96" rx="22" fill={`url(#${id}g)`} />
      <path filter={`url(#${id}s)`} d="M33 27h22l12 12v32a5 5 0 0 1-5 5H33a5 5 0 0 1-5-5V32a5 5 0 0 1 5-5z" fill={`url(#${id}p)`} />
      <path d="M55 27l12 12H59a4 4 0 0 1-4-4z" style={{ fill: "color-mix(in srgb, var(--fl-primary) 22%, #fff)" }} />
      <rect x="36" y="48" width="24" height="4.6" rx="2.3" fill="var(--fl-primary)" />
      <rect x="36" y="58" width="24" height="4.6" rx="2.3" fill="var(--fl-primary)" />
      <rect x="36" y="68" width="14" height="4.6" rx="2.3" fill="var(--fl-primary)" />
    </svg>
  );
}

const MenuBar = memo(function MenuBar() {
  const t = useT();
  const recent = useDocs((s) => s.recent);
  const [open, setOpen] = useState<"file" | "edit" | "view" | null>(null);
  const refs = {
    file: useRef<HTMLButtonElement>(null),
    edit: useRef<HTMLButtonElement>(null),
    view: useRef<HTMLButtonElement>(null),
  };
  const close = useCallback(() => setOpen(null), []);
  // checked states depend on settings: subscribe so the menu re-renders
  useSettings((s) => s.wrap);
  useSettings((s) => s.statusBar);
  useSettings((s) => s.lineNumbers);
  useSettings((s) => s.tabLayout);
  useUi((s) => s.zen);

  const cmd = (id: string): MenuEntry => {
    const c = byId(id);
    return {
      label: t(c.label),
      icon: c.icon,
      kbd: c.kbd,
      checked: c.checked ? c.checked() : undefined,
      disabled: c.enabled ? !c.enabled() : false,
      onClick: c.run,
    };
  };
  const div: MenuEntry = { type: "divider" };

  const menus: Record<"file" | "edit" | "view", MenuEntry[]> = {
    file: [
      cmd("new"), cmd("open"), div, cmd("save"), cmd("saveAs"), cmd("reload"), div,
      { type: "header", label: t("file.recent") },
      ...(recent.length
        ? recent.slice(0, 6).map<MenuEntry>((p) => ({ label: baseName(p), icon: FileText, onClick: () => void openPaths([p]) }))
        : [{ label: t("file.recentEmpty"), disabled: true, onClick: () => {} } as MenuEntry]),
      ...(recent.length ? [{ label: t("file.clearRecent"), onClick: clearRecent } as MenuEntry] : []),
      div, cmd("print"), cmd("close"), cmd("exit"),
    ],
    edit: [
      cmd("undo"), cmd("redo"), div, cmd("cut"), cmd("copy"), cmd("paste"), cmd("delete"), div,
      cmd("find"), cmd("findNext"), cmd("findPrev"), cmd("replace"), cmd("goto"), div,
      cmd("selectAll"), cmd("timeDate"), cmd("dupLine"), cmd("delLine"), cmd("upper"), cmd("lower"),
    ],
    view: [
      cmd("zoomIn"), cmd("zoomOut"), cmd("zoomReset"), div,
      cmd("wrap"), cmd("lineNumbers"), cmd("statusBar"), cmd("vTabs"), div,
      cmd("zen"), cmd("fullscreen"), div, cmd("nextTab"), cmd("prevTab"),
    ],
  };
  const labels = { file: t("menu.file"), edit: t("menu.edit"), view: t("menu.view") };

  return (
    <nav className="flex items-center" aria-label="Menu">
      {(["file", "edit", "view"] as const).map((k) => (
        <div key={k}>
          <button
            ref={refs[k]}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open === k}
            onClick={() => setOpen(open === k ? null : k)}
            onPointerEnter={() => open && setOpen(k)}
            className="fl-subtle h-8 rounded px-3 text-sm"
          >
            {labels[k]}
          </button>
          <Popover anchor={refs[k].current} open={open === k} onClose={close} maxHeight={560}>
            <MenuList entries={menus[k]} onDone={close} />
          </Popover>
        </div>
      ))}
    </nav>
  );
});

export const AppBar = memo(function AppBar() {
  const t = useT();
  const theme = useSettings((s) => s.theme);
  const dark = resolveDark(theme);
  const openSettings = useUi((s) => s.openSettings);

  const switchTheme = () => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    // appearance.ts applies the colours synchronously, so the new snapshot already has them; CSS cross-fades the two
    if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) toggleTheme();
    else doc.startViewTransition(toggleTheme);
  };

  return (
    <header className="flex h-11 flex-none items-center gap-1 px-2">
      <div className="flex items-center gap-2 pl-1.5 pr-3">
        <Logo size={20} />
        <span className="hidden text-xs sm:block">{t("app.name")}</span>
      </div>
      <MenuBar />
      <div className="flex-1" />
      <IconButton icon={Search} label={t("edit.find")} kbd="Ctrl+F" onClick={() => openFind(false)} />
      <IconButton icon={Command} label={t("toolbar.palette")} kbd="Ctrl+Shift+P" onClick={() => useUi.setState({ paletteOpen: true })} />
      <IconButton icon={dark ? Sun : Moon} label={t("toolbar.theme")} onClick={switchTheme} />
      <IconButton icon={Settings} label={t("toolbar.settings")} kbd="Ctrl+," onClick={() => openSettings()} />
      <IconButton icon={Info} label={t("toolbar.about")} onClick={() => useUi.setState({ aboutOpen: true })} />
    </header>
  );
});
