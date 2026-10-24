import { Bookmark, LibraryBig, Palette, Settings, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { useSettings } from "../state/settings";
import { AppLogo } from "./AppLogo";

export type Page = "builder" | "library" | "settings";

function useItems() {
  const { t } = useSettings();
  return [
    { id: "builder" as const, icon: Palette as LucideIcon, label: t("nav.builder") },
    { id: "library" as const, icon: LibraryBig as LucideIcon, label: t("nav.library") },
    { id: "settings" as const, icon: Settings as LucideIcon, label: t("nav.settings") },
  ];
}

function NavButton({ active, icon: Icon, label, onClick, badge }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void; badge?: number }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className="group flex w-full flex-col items-center gap-1 py-1 text-xs font-medium">
      <span data-ripple className="relative grid h-8 w-14 place-items-center rounded-full">
        <span
          aria-hidden
          className={cn("absolute inset-0 -z-10 origin-center rounded-full bg-secondary-container transition-[transform,opacity] duration-300 ease-emphasized", active ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0")}
        />
        <Icon className={cn("size-6 transition-[transform,color] duration-300 ease-emphasized", active ? "scale-105 text-on-secondary-container" : "text-on-surface-variant group-hover:text-on-surface", label && active && Icon === Settings && "rotate-45")} />
        {!!badge && <span className="absolute -right-0.5 top-0 grid min-w-4 place-items-center rounded-full bg-error px-1 text-[10px] text-on-error">{badge}</span>}
      </span>
      <span className={cn("transition-colors", active ? "text-on-surface" : "text-on-surface-variant")}>{label}</span>
    </button>
  );
}

export function Rail({ page, onChange, savedCount }: { page: Page; onChange: (p: Page) => void; savedCount: number }) {
  const items = useItems();
  return (
    <nav className="relative z-10 hidden w-20 shrink-0 flex-col items-center gap-3 bg-surface-container-low/80 py-5 backdrop-blur-md md:flex" aria-label="Primary">
      <AppLogo size={44} className="mb-3 drop-shadow-sm transition-transform duration-500 hover:rotate-[8deg] hover:scale-110" />
      {items
        .filter((i) => i.id !== "settings")
        .map((i) => (
          <NavButton key={i.id} active={page === i.id} icon={i.icon} label={i.label} badge={i.id === "library" ? savedCount : undefined} onClick={() => onChange(i.id)} />
        ))}
      <div className="mt-auto w-full">
        {items
          .filter((i) => i.id === "settings")
          .map((i) => (
            <NavButton key={i.id} active={page === i.id} icon={i.icon} label={i.label} onClick={() => onChange(i.id)} />
          ))}
      </div>
    </nav>
  );
}

export function BottomBar({ page, onChange }: { page: Page; onChange: (p: Page) => void }) {
  const items = useItems();
  return (
    <nav className="relative z-10 flex shrink-0 items-stretch justify-around bg-surface-container px-2 pb-2 pt-1 md:hidden" aria-label="Primary">
      {items.map((i) => (
        <NavButton key={i.id} active={page === i.id} icon={i.icon} label={i.label} onClick={() => onChange(i.id)} />
      ))}
    </nav>
  );
}

export { Bookmark };
