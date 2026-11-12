import { ArrowDownload20Filled, ArrowDownload20Regular, History20Filled, History20Regular, Info20Regular, Navigation20Regular, Settings20Filled, Settings20Regular, type FluentIcon } from "@fluentui/react-icons";
import { useI18n } from "../lib/i18n";
import { Tooltip } from "../components/ui/Tooltip";

export type Page = "download" | "history" | "settings";

interface ItemProps { icon: FluentIcon; activeIcon?: FluentIcon; label: string; active?: boolean; onClick: () => void; badge?: number; open: boolean }
function Item({ icon, activeIcon, label, active, onClick, badge, open }: ItemProps) {
  const Icon = active && activeIcon ? activeIcon : icon;
  return (
    <Tooltip label={label} disabled={open}>
      <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} aria-label={label}
        className={`relative flex h-10 w-full items-center gap-3 rounded-ctl px-[13px] text-left text-body text-fg transition-colors duration-100 hover:bg-hov active:bg-prs ${active ? "bg-hov" : ""}`}>
        {active && <span className="animate-indicator absolute left-0 top-1/2 h-4 w-[3px] rounded-full bg-acc" />}
        <span className="relative flex-none">
          <Icon className={`h-5 w-5 ${active ? "text-acc-text" : ""}`} />
          {!!badge && !open && <span className="absolute -right-1.5 -top-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-acc px-1 text-[9px] font-semibold leading-none text-on-acc">{badge}</span>}
        </span>
        <span className={`min-w-0 flex-1 truncate transition-opacity duration-150 ${open ? "opacity-100" : "opacity-0"}`}>{label}</span>
        {!!badge && open && <span className="grid h-5 min-w-5 flex-none place-items-center rounded-full bg-acc px-1.5 text-cap font-semibold text-on-acc">{badge}</span>}
      </button>
    </Tooltip>
  );
}

/** NavigationView (pane bên trái) của Fluent: mở rộng 240px hoặc thu gọn 52px; mục đang chọn có vạch nhấn. */
export function NavPane({ page, onPage, onAbout, badge, open, onToggle, forcedCompact }: {
  page: Page; onPage: (p: Page) => void; onAbout: () => void; badge: number; open: boolean; onToggle: () => void; forcedCompact: boolean;
}) {
  const { t } = useI18n();
  return (
    <nav aria-label="Navigation" className={`flex flex-none flex-col px-1.5 pb-2 transition-[width] duration-200 ease-out ${open ? "w-[240px]" : "w-[52px]"}`}>
      <Tooltip label={t("nav.toggle")} disabled={open}>
        <button type="button" onClick={onToggle} disabled={forcedCompact} aria-label={t("nav.toggle")} aria-expanded={open}
          className="mb-1 grid h-10 w-10 flex-none place-items-center rounded-ctl text-fg hover:bg-hov active:bg-prs disabled:pointer-events-none disabled:opacity-50"><Navigation20Regular /></button>
      </Tooltip>
      <div className="flex flex-col gap-0.5">
        <Item open={open} icon={ArrowDownload20Regular} activeIcon={ArrowDownload20Filled} label={t("nav.download")} active={page === "download"} onClick={() => onPage("download")} badge={badge} />
        <Item open={open} icon={History20Regular} activeIcon={History20Filled} label={t("nav.history")} active={page === "history"} onClick={() => onPage("history")} />
      </div>
      <div className="mt-auto flex flex-col gap-0.5">
        <Item open={open} icon={Info20Regular} label={t("nav.about")} onClick={onAbout} />
        <Item open={open} icon={Settings20Regular} activeIcon={Settings20Filled} label={t("nav.settings")} active={page === "settings"} onClick={() => onPage("settings")} />
      </div>
    </nav>
  );
}
