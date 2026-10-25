import { ArrowDownToLine, History, Info, Settings, type LucideIcon } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { ripple } from "../components/ui/ripple";

export type Page = "download" | "history" | "settings";

function Item({ icon: Icon, label, active, onClick, badge }: { icon: LucideIcon; label: string; active?: boolean; onClick: () => void; badge?: number }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className="group flex w-20 flex-col items-center gap-1 text-on-surface-variant max-sm:w-auto max-sm:flex-1">
      <span onPointerDown={ripple} className={`relative grid h-8 place-items-center overflow-hidden transition-all duration-500 ease-spring group-active:scale-90 ${active ? "w-16 rounded-full bg-secondary-container text-on-secondary-container" : "w-8 rounded-m3-sm group-hover:w-14 group-hover:rounded-full group-hover:bg-on-surface/10"}`}>
        <Icon className={`h-6 w-6 transition-transform duration-500 ease-spring ${active ? "scale-110" : ""}`} strokeWidth={active ? 2.4 : 2} />
        {!!badge && <span className="absolute right-1 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">{badge}</span>}
      </span>
      <span className={`t-small font-semibold ${active ? "text-on-surface" : ""}`}>{label}</span>
    </button>
  );
}

export function NavRail({ page, onPage, onAbout, badge }: { page: Page; onPage: (p: Page) => void; onAbout: () => void; badge: number }) {
  const { t } = useI18n();
  return (
    <nav aria-label="Navigation" className="flex flex-none flex-col items-center justify-between bg-surface py-4 transition-colors duration-300 max-sm:order-2 max-sm:flex-row max-sm:justify-around max-sm:bg-surface-container max-sm:px-2 max-sm:py-2 sm:w-20">
      <div className="flex flex-col items-center gap-3 max-sm:flex-1 max-sm:flex-row max-sm:gap-0">
        <Item icon={ArrowDownToLine} label={t("nav.download")} active={page === "download"} onClick={() => onPage("download")} badge={badge} />
        <Item icon={History} label={t("nav.history")} active={page === "history"} onClick={() => onPage("history")} />
        <Item icon={Settings} label={t("nav.settings")} active={page === "settings"} onClick={() => onPage("settings")} />
      </div>
      <Item icon={Info} label={t("nav.about")} onClick={onAbout} />
    </nav>
  );
}
