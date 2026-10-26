import { useEffect, useState } from "react";
import { Bookmark, Columns2, LibraryBig, Menu, Palette, PanelLeftClose, Settings, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { useSettings } from "../state/settings";
import { AppLogo } from "./AppLogo";
import { IconButton } from "./ui";

export type Page = "builder" | "library" | "compare" | "settings";

function useItems() {
  const { t } = useSettings();
  return [
    { id: "builder" as const, icon: Palette as LucideIcon, label: t("nav.builder") },
    { id: "library" as const, icon: LibraryBig as LucideIcon, label: t("nav.library") },
    { id: "compare" as const, icon: Columns2 as LucideIcon, label: t("nav.compare") },
    { id: "settings" as const, icon: Settings as LucideIcon, label: t("nav.settings") },
  ];
}

function NavButton({ active, icon: Icon, label, onClick, badge, expanded }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void; badge?: number; expanded?: boolean }) {
  const icon = (
    <Icon className={cn("size-6 shrink-0 transition-[transform,color] duration-(--spring-spatial-d) ease-emphasized", active ? "scale-105 text-on-secondary-container" : "text-on-surface-variant group-hover:text-on-surface", active && Icon === Settings && "rotate-45")} />
  );
  const shown = badge && badge > 99 ? "99+" : badge;
  const count = !!badge && (
    <span
      aria-label={String(badge)}
      className={cn(
        "grid h-[18px] min-w-[18px] place-items-center rounded-full bg-error px-1 text-[11px] font-medium leading-none text-on-error",
        expanded ? "ml-auto" : "pointer-events-none absolute right-1 -top-1.5 ring-2 ring-surface-container-low",
      )}
    >
      {shown}
    </span>
  );
  const pill = (
    <span
      aria-hidden
      className={cn("absolute inset-0 -z-10 origin-center rounded-full bg-secondary-container transition-[transform,opacity] duration-(--spring-spatial-d) ease-emphasized", active ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0")}
    />
  );
  if (expanded) {
    return (
      <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className="group w-full text-sm font-medium">
        <span data-ripple className="relative flex h-14 items-center gap-3 rounded-full px-5">
          {pill}
          {icon}
          <span className={cn("truncate transition-colors", active ? "text-on-secondary-container" : "text-on-surface-variant group-hover:text-on-surface")}>{label}</span>
          {count}
        </span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className="group flex w-full flex-col items-center gap-1 py-1 text-xs font-medium">
      {/* The badge sits outside the ripple layer: [data-ripple] clips overflow and would cut it in half. */}
      <span className="relative">
        <span data-ripple className="relative grid h-8 w-14 place-items-center rounded-full">
          {pill}
          {icon}
        </span>
        {count}
      </span>
      <span className={cn("transition-colors", active ? "text-on-surface" : "text-on-surface-variant")}>{label}</span>
    </button>
  );
}

/** The expanded rail only fits when the window is wide enough for the builder layout. */
const WIDE = "(min-width: 1440px)";
function useWide() {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export function Rail({ page, onChange, savedCount }: { page: Page; onChange: (p: Page) => void; savedCount: number }) {
  const items = useItems();
  const { settings, set, t } = useSettings();
  const wide = useWide();
  const expanded = settings.railExpanded && wide;
  const toggle = expanded ? t("nav.collapse") : t("nav.expand");
  return (
    <nav
      className={cn(
        "relative z-10 hidden shrink-0 flex-col gap-3 overflow-hidden bg-surface-container-low/80 py-5 backdrop-blur-md transition-[width,padding] duration-(--spring-spatial-d) ease-emphasized md:flex",
        expanded ? "w-60 items-stretch px-3" : "w-20 items-center",
      )}
      aria-label="Primary"
      onKeyDown={(e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        const btns = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
        const i = btns.indexOf(document.activeElement as HTMLButtonElement);
        if (i < 0) return;
        e.preventDefault();
        btns[(i + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length].focus();
      }}
    >
      <div className={cn("mb-3 flex items-center gap-2", expanded ? "justify-between pl-2" : "flex-col")}>
        <AppLogo size={44} className="shrink-0 drop-shadow-sm transition-transform duration-500 hover:rotate-[8deg] hover:scale-110" />
        {wide && (
          <IconButton label={toggle} aria-expanded={expanded} onClick={() => set({ railExpanded: !expanded })}>
            {expanded ? <PanelLeftClose className="size-5" /> : <Menu className="size-5" />}
          </IconButton>
        )}
      </div>
      {items
        .filter((i) => i.id !== "settings")
        .map((i) => (
          <NavButton key={i.id} expanded={expanded} active={page === i.id} icon={i.icon} label={i.label} badge={i.id === "library" ? savedCount : undefined} onClick={() => onChange(i.id)} />
        ))}
      <div className="mt-auto w-full">
        {items
          .filter((i) => i.id === "settings")
          .map((i) => (
            <NavButton key={i.id} expanded={expanded} active={page === i.id} icon={i.icon} label={i.label} onClick={() => onChange(i.id)} />
          ))}
      </div>
    </nav>
  );
}

export function BottomBar({ page, onChange, savedCount = 0 }: { page: Page; onChange: (p: Page) => void; savedCount?: number }) {
  const items = useItems();
  return (
    <nav className="relative z-10 flex shrink-0 items-stretch justify-around bg-surface-container px-2 pb-2 pt-1 md:hidden" aria-label="Primary">
      {items.map((i) => (
        <NavButton key={i.id} active={page === i.id} icon={i.icon} label={i.label} badge={i.id === "library" ? savedCount : undefined} onClick={() => onChange(i.id)} />
      ))}
    </nav>
  );
}

export { Bookmark };
