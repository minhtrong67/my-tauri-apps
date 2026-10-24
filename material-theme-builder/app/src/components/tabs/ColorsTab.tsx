import { useState, type CSSProperties } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { readableOn } from "../../lib/color";
import { ON_ROLE, ROLE_GROUPS, type CustomRoles, type GeneratedTheme, type Roles } from "../../lib/theme";
import { cn, humanize } from "../../lib/utils";
import { useSettings } from "../../state/settings";
import { useToast } from "../../state/toast";
import { Segmented } from "../ui";

type View = "light" | "dark" | "both";

function ColorTile({ label, bg, fg, delay }: { label: string; bg: string; fg: string; delay: number }) {
  const toast = useToast();
  return (
    <button
      type="button"
      data-ripple
      onClick={() => toast.copy(bg, bg)}
      data-tip={bg}
      style={{ background: bg, color: fg, "--d": `${delay}ms` } as CSSProperties}
      className="anim-fade-up flex min-h-[68px] flex-col justify-between rounded-xl p-3 text-left ring-1 ring-inset ring-black/5 transition-[background-color,color,transform] duration-300 hover:scale-[1.02] active:scale-[0.98]"
    >
      <span className="text-xs font-medium leading-tight">{label}</span>
      <span className="font-mono text-[11px] opacity-80">{bg}</span>
    </button>
  );
}

function SchemeColumn({ roles, custom, mode, wide }: { roles: Roles; custom: CustomRoles[]; mode: "light" | "dark"; wide: boolean }) {
  const { t } = useSettings();
  let n = 0;
  return (
    <div className="min-w-0 space-y-5">
      {ROLE_GROUPS.map((g) => (
        <section key={g.id}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t(`group.${g.id}` as never)}</h4>
          <div className={cn("grid gap-2", wide ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4")}>
            {g.roles.map((role) => {
              const on = ON_ROLE[role];
              return <ColorTile key={role} label={humanize(role)} bg={roles[role]} fg={on ? roles[on] : readableOn(roles[role])} delay={Math.min(n++ * 14, 400)} />;
            })}
          </div>
        </section>
      ))}
      {custom.map((c) => {
        const s = c[mode];
        return (
          <section key={c.id}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{c.name}</h4>
            <div className={cn("grid gap-2", wide ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
              <ColorTile label={c.name} bg={s.color} fg={s.onColor} delay={0} />
              <ColorTile label={`On ${c.name}`} bg={s.onColor} fg={s.color} delay={20} />
              <ColorTile label={`${c.name} container`} bg={s.colorContainer} fg={s.onColorContainer} delay={40} />
              <ColorTile label={`On ${c.name} container`} bg={s.onColorContainer} fg={s.colorContainer} delay={60} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ColorsTab({ theme }: { theme: GeneratedTheme }) {
  const { t } = useSettings();
  const [view, setView] = useState<View>("both");
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">{t("colors.hint")}</p>
        <Segmented<View>
          className="w-72 shrink-0"
          value={view}
          onChange={setView}
          options={[
            { value: "light", label: t("common.light"), icon: <Sun className="size-4" /> },
            { value: "dark", label: t("common.dark"), icon: <Moon className="size-4" /> },
            { value: "both", label: t("common.both"), icon: <SunMoon className="size-4" /> },
          ]}
        />
      </div>
      <div className={cn("grid gap-6", view === "both" ? "min-[1180px]:grid-cols-2" : "grid-cols-1")}>
        {view !== "dark" && (
          <div className="rounded-3xl bg-surface-container-low p-4">
            <h3 className="mb-4 flex items-center gap-2 text-base font-medium">
              <Sun className="size-4 text-primary" /> {t("common.light")}
            </h3>
            <SchemeColumn roles={theme.light} custom={theme.custom} mode="light" wide={view === "both"} />
          </div>
        )}
        {view !== "light" && (
          <div className="rounded-3xl bg-surface-container-low p-4">
            <h3 className="mb-4 flex items-center gap-2 text-base font-medium">
              <Moon className="size-4 text-primary" /> {t("common.dark")}
            </h3>
            <SchemeColumn roles={theme.dark} custom={theme.custom} mode="dark" wide={view === "both"} />
          </div>
        )}
      </div>
    </div>
  );
}
