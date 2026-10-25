import { useState, type ReactNode } from "react";
import { Download, Info, Menu, MenuSquare, Settings } from "lucide-react";
import { useT } from "../lib/hooks";
import type { TKey } from "../lib/i18n";
import { useDownloads } from "../store/downloads";
import { useUi, type Page } from "../store/ui";
import { cx, IconButton } from "./ui";

const ITEMS: { id: Page; key: TKey; icon: ReactNode }[] = [
  { id: "downloads", key: "navDownloads", icon: <Download size={22} /> },
  { id: "settings", key: "navSettings", icon: <Settings size={22} /> },
  { id: "about", key: "navAbout", icon: <Info size={22} /> },
];

export function Nav() {
  const { t } = useT();
  const { page, setPage } = useUi();
  const active = useDownloads((s) => s.items.filter((d) => d.status === "downloading" || d.status === "merging").length);
  const [open, setOpen] = useState(() => localStorage.getItem("mvd.nav") === "1");
  const toggle = () => {
    localStorage.setItem("mvd.nav", open ? "0" : "1");
    setOpen(!open);
  };

  return (
    <>
      {/* Expandable navigation rail (desktop) */}
      <nav
        className={cx(
          "hidden shrink-0 flex-col gap-1 bg-transparent py-4 transition-[width] duration-500 ease-spring sm:flex",
          open ? "w-60 px-3" : "w-[88px] items-center px-3",
        )}
        aria-label="Main"
      >
        <div className={cx("mb-4 flex w-full items-center", open ? "justify-between pl-1" : "flex-col gap-3")}>
          <IconButton label={open ? t("navCollapse") : t("navExpand")} onClick={toggle}>
            {open ? <MenuSquare size={22} /> : <Menu size={22} />}
          </IconButton>
          <img src="/favicon.png" alt="" className={cx("transition-all duration-500 ease-spring", open ? "mr-1 size-10" : "size-11")} draggable={false} />
        </div>
        {ITEMS.map((item) => {
          const on = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              aria-current={on ? "page" : undefined}
              title={open ? undefined : t(item.key)}
              className={cx(
                "ripple-host group relative flex shrink-0 items-center transition-all duration-500 ease-spring active:scale-[0.97]",
                open ? "h-14 w-full gap-3 rounded-full px-5" : "h-14 w-14 flex-col justify-center rounded-2xl",
                on ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant hover:rounded-full hover:bg-on-surface/8",
                on && !open && "rounded-full",
              )}
            >
              <span className={cx("relative transition-transform duration-500 ease-spring", on && "scale-110")}>
                {item.icon}
                {item.id === "downloads" && active > 0 && (
                  <span className="anim-pop absolute -top-2 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[0.625rem] font-bold text-on-error">{active}</span>
                )}
              </span>
              {open && <span className={cx("text-[0.95rem]", on ? "font-semibold" : "font-medium")}>{t(item.key)}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom bar (narrow windows) */}
      <nav className="flex shrink-0 gap-1 bg-surface-container px-2 pt-2 pb-3 sm:hidden" aria-label="Main">
        {ITEMS.map((item) => {
          const on = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} aria-current={on ? "page" : undefined} className="group flex flex-1 flex-col items-center gap-1 py-1 outline-none">
              <span className={cx("ripple-host relative flex h-8 items-center justify-center rounded-full transition-all duration-500 ease-spring", on ? "w-16 bg-secondary-container text-on-secondary-container" : "w-8 text-on-surface-variant")}>
                {item.icon}
                {item.id === "downloads" && active > 0 && (
                  <span className="absolute -top-1 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[0.625rem] font-bold text-on-error">{active}</span>
                )}
              </span>
              <span className={cx("text-xs", on ? "font-bold text-on-surface" : "text-on-surface-variant")}>{t(item.key)}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
