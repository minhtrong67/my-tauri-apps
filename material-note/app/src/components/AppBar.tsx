import { memo, useCallback, useRef, useState } from "react";
import { Search, Command, Sun, Moon, Settings, Info, FileText } from "lucide-react";
import { IconButton } from "./ui/Button";
import { Popover, MenuList, type MenuEntry } from "./ui/Popover";
import { useT } from "../lib/i18n";
import { byId, toggleTheme } from "../lib/commands";
import { useSettings } from "../store/settings";
import { useDocs, clearRecent } from "../store/docs";
import { useUi } from "../store/ui";
import { openPaths } from "../lib/actions";
import { openFind } from "../lib/find";
import { baseName, cn } from "../lib/utils";
import { resolveDark } from "../lib/theme";

/** Expressive "cookie" app mark: a scalloped shape holding a note page. Draws in the live theme colours. */
const COOKIE = (() => {
  const pts: string[] = [];
  const lobes = 10;
  for (let i = 0; i <= 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    const r = 46 + 3.6 * Math.cos(lobes * a);
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return "M" + pts.join("L") + "Z";
})();

export function Logo({ size = 32, spin }: { size?: number; spin?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={spin ? "animate-[spin-slow_24s_linear_infinite]" : undefined}>
      <path d={COOKIE} fill="var(--md-primary)" />
      <g className={spin ? "origin-center animate-[spin-slow_24s_linear_infinite_reverse]" : undefined}>
        <path d="M33 27h22l12 12v32a5 5 0 0 1-5 5H33a5 5 0 0 1-5-5V32a5 5 0 0 1 5-5z" fill="var(--md-on-primary)" />
        <path d="M55 27l12 12H59a4 4 0 0 1-4-4z" fill="var(--md-tertiary-container)" />
        <rect x="36" y="48" width="24" height="4.6" rx="2.3" fill="var(--md-primary)" />
        <rect x="36" y="58" width="24" height="4.6" rx="2.3" fill="var(--md-primary)" />
        <rect x="36" y="68" width="14" height="4.6" rx="2.3" fill="var(--md-primary)" />
      </g>
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
      cmd("wrap"), cmd("statusBar"), cmd("vTabs"), div,
      cmd("zen"), cmd("fullscreen"), div, cmd("nextTab"), cmd("prevTab"),
    ],
  };
  const labels = { file: t("menu.file"), edit: t("menu.edit"), view: t("menu.view") };

  return (
    <nav className="flex items-center gap-0.5" aria-label="Menu">
      {(["file", "edit", "view"] as const).map((k) => (
        <div key={k}>
          <button
            ref={refs[k]}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open === k}
            onClick={() => setOpen(open === k ? null : k)}
            onPointerEnter={() => open && setOpen(k)}
            className={cn(
              "ripple h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold text-on-surface transition-[border-radius,background-color] duration-300 ease-spring",
              open === k && "rounded-xl bg-secondary-container text-on-secondary-container",
            )}
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
  const themeBtn = useRef<HTMLButtonElement>(null);

  const switchTheme = () => {
    const btn = themeBtn.current;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!btn || !doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      toggleTheme();
      return;
    }
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    // appearance.ts applies the colours synchronously, so the new snapshot already has them
    const vt = doc.startViewTransition(toggleTheme);
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 620, easing: "cubic-bezier(0.2, 0, 0, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    }).catch(() => {});
  };

  return (
    <header className="flex h-14 flex-none items-center gap-2 px-3 pt-1">
      <div className="flex items-center gap-2.5 pl-1 pr-2">
        <Logo size={32} />
        <span className="hidden text-[0.9375rem] font-bold tracking-tight text-on-surface sm:block">{t("app.name")}</span>
      </div>
      <MenuBar />
      <div className="flex-1" />
      <IconButton icon={Search} label={t("edit.find")} kbd="Ctrl+F" onClick={() => openFind(false)} />
      <IconButton icon={Command} label={t("toolbar.palette")} kbd="Ctrl+Shift+P" onClick={() => useUi.setState({ paletteOpen: true })} />
      <IconButton ref={themeBtn} icon={dark ? Sun : Moon} label={t("toolbar.theme")} onClick={switchTheme} />
      <IconButton icon={Settings} label={t("toolbar.settings")} kbd="Ctrl+," onClick={() => openSettings()} tonal />
      <IconButton icon={Info} label={t("toolbar.about")} onClick={() => useUi.setState({ aboutOpen: true })} />
    </header>
  );
});
