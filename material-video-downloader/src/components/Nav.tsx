import { Download, Info, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "../lib/hooks";
import type { TKey } from "../lib/i18n";
import { useDownloads } from "../store/downloads";
import { useUi, type Page } from "../store/ui";
import { cx } from "./ui";

const ITEMS: { id: Page; key: TKey; icon: ReactNode }[] = [
  { id: "downloads", key: "navDownloads", icon: <Download size={22} /> },
  { id: "settings", key: "navSettings", icon: <Settings size={22} /> },
  { id: "about", key: "navAbout", icon: <Info size={22} /> },
];

export function Nav() {
  const { t } = useT();
  const { page, setPage } = useUi();
  const active = useDownloads((s) => s.items.filter((d) => d.status === "downloading" || d.status === "merging").length);

  const button = (item: (typeof ITEMS)[number], horizontal: boolean) => {
    const on = page === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setPage(item.id)}
        aria-current={on ? "page" : undefined}
        className={cx("group relative flex items-center justify-center gap-1 outline-none", horizontal ? "flex-1 flex-col py-2" : "w-full flex-col py-1")}
      >
        <span
          className={cx(
            "ripple-host relative flex h-8 items-center justify-center rounded-full transition-all duration-300 ease-emphasized",
            on ? "w-16 bg-secondary-container text-on-secondary-container" : "w-8 text-on-surface-variant group-hover:w-16 group-hover:bg-on-surface/8",
          )}
        >
          <span className={cx("transition-transform duration-300 ease-spring", on && "scale-110")}>{item.icon}</span>
          {item.id === "downloads" && active > 0 && (
            <span className="anim-pop absolute -top-1 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[0.625rem] font-semibold text-on-error">{active}</span>
          )}
        </span>
        <span className={cx("text-xs transition-colors", on ? "font-semibold text-on-surface" : "text-on-surface-variant")}>{t(item.key)}</span>
      </button>
    );
  };

  return (
    <>
      <nav className="hidden w-20 shrink-0 flex-col items-center gap-3 border-r border-outline-variant/40 bg-surface py-5 sm:flex" aria-label="Main">
        <img src="/favicon.png" alt="" className="mb-3 size-10" draggable={false} />
        {ITEMS.map((i) => button(i, false))}
      </nav>
      <nav className="flex shrink-0 border-t border-outline-variant/40 bg-surface-container sm:hidden" aria-label="Main">
        {ITEMS.map((i) => button(i, true))}
      </nav>
    </>
  );
}
