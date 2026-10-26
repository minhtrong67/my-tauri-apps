import { Moon, ShieldCheck, Sun, TriangleAlert, TrendingUp } from "lucide-react";
import { useState } from "react";
import { apcaLc, apcaLevel, ratioOfHex } from "../../lib/color";
import { CONTRAST_PAIRS, type GeneratedTheme, type Roles } from "../../lib/theme";
import { cn, humanize } from "../../lib/utils";
import type { Key } from "../../lib/i18n";
import { useBuilder } from "../../state/builder";
import { useSettings } from "../../state/settings";
import { Button, Segmented } from "../ui";

type Method = "wcag" | "apca";

function level(ratio: number): "AAA" | "AA" | "UI" | "fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "UI";
  return "fail";
}

function SchemeReport({ roles, mode, method }: { roles: Roles; mode: "light" | "dark"; method: Method }) {
  const { t } = useSettings();
  const rows = CONTRAST_PAIRS.map(([fg, bg, min]) => {
    const ratio = ratioOfHex(roles[fg], roles[bg]);
    const lc = apcaLc(roles[fg], roles[bg]);
    const lcMin = min >= 4.5 ? 60 : 45;
    return { fg, bg, min, ratio, lc, lcMin, pass: method === "wcag" ? ratio >= min : Math.abs(lc) >= lcMin };
  });
  const passed = rows.filter((r) => r.pass).length;
  const pct = Math.round((passed / rows.length) * 100);

  return (
    <section className="rounded-3xl bg-surface-container-low p-4">
      <div className="mb-3 flex items-center gap-2">
        {mode === "light" ? <Sun className="size-4 text-primary" /> : <Moon className="size-4 text-primary" />}
        <h3 className="flex-1 text-base font-medium">{t(mode === "light" ? "common.light" : "common.dark")}</h3>
        <span className="text-sm tabular-nums text-on-surface-variant">
          {passed}/{rows.length}
        </span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-container-highest">
        <div className={cn("h-full rounded-full transition-[width] duration-700 ease-emphasized", pct === 100 ? "bg-primary" : "bg-tertiary")} style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const lv = level(r.ratio);
          return (
            <li key={`${r.fg}-${r.bg}`} className="flex items-center gap-3 rounded-2xl px-1 py-1">
              <span
                className="grid h-10 w-14 shrink-0 place-items-center rounded-xl text-base font-semibold ring-1 ring-inset ring-black/5 transition-colors duration-300"
                style={{ background: roles[r.bg], color: roles[r.fg] }}
              >
                Aa
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate">
                  {humanize(r.fg)} <span className="text-on-surface-variant">/ {humanize(r.bg)}</span>
                </span>
                <span className="block text-xs text-on-surface-variant">
                  {method === "wcag" ? t("access.min", { value: r.min }) : t("access.lcMin", { value: r.lcMin })}
                </span>
              </span>
              <span className="font-mono text-sm tabular-nums">{method === "wcag" ? r.ratio.toFixed(2) : `Lc ${Math.abs(r.lc).toFixed(0)}`}</span>
              <span
                className={cn(
                  "w-12 rounded-full py-0.5 text-center text-[11px] font-semibold",
                  r.pass ? "bg-primary-container text-on-primary-container" : "bg-error-container text-on-error-container",
                )}
              >
                {method === "wcag" ? (lv === "fail" ? t("access.fail") : lv === "UI" ? "UI" : lv) : apcaLevel(r.lc) === "fail" ? t("access.fail") : t(`access.apca.${apcaLevel(r.lc)}` as Key)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AccessibilityTab({ theme }: { theme: GeneratedTheme }) {
  const { t } = useSettings();
  const { config, update } = useBuilder();
  const [method, setMethod] = useState<Method>("wcag");
  const failing = [theme.light, theme.dark].some((roles) =>
    CONTRAST_PAIRS.some(([fg, bg, min]) => (method === "wcag" ? ratioOfHex(roles[fg], roles[bg]) < min : Math.abs(apcaLc(roles[fg], roles[bg])) < (min >= 4.5 ? 60 : 45))),
  );

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-wrap items-center gap-3 rounded-3xl p-4", failing ? "bg-tertiary-container text-on-tertiary-container" : "bg-primary-container text-on-primary-container")}>
        {failing ? <TriangleAlert className="size-6" /> : <ShieldCheck className="size-6" />}
        <div className="min-w-0 flex-1">
          <div className="font-medium">{failing ? t("access.someFail") : t("access.allPass")}</div>
          <div className="text-sm opacity-80">{t("access.hint")}</div>
        </div>
        {failing && config.contrast < 1 && (
          <Button variant="filled" icon={<TrendingUp className="size-4" />} onClick={() => update({ contrast: Math.min(1, Math.round((config.contrast + 0.5) * 10) / 10) })}>
            {t("access.boost")}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<Method>
          value={method}
          onChange={setMethod}
          options={[
            { value: "wcag", label: "WCAG 2.x", title: t("access.wcagTip") },
            { value: "apca", label: "APCA", title: t("access.apcaTip") },
          ]}
        />
        <p className="min-w-0 flex-1 text-sm text-on-surface-variant">{method === "wcag" ? t("access.wcagTip") : t("access.apcaTip")}</p>
      </div>
      <div className="grid gap-4 min-[1180px]:grid-cols-2">
        <SchemeReport roles={theme.light} mode="light" method={method} />
        <SchemeReport roles={theme.dark} mode="dark" method={method} />
      </div>
    </div>
  );
}
