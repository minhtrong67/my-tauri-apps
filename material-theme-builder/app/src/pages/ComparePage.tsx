import { useMemo, useState, type CSSProperties } from "react";
import { ArrowLeftRight, Bookmark, Home, Moon, PencilLine, Plus, Search, Sparkles, Sun } from "lucide-react";
import { labDistance, ratioOfHex } from "../lib/color";
import { CONTRAST_PAIRS, DEFAULT_CONFIG, ROLE_GROUPS, STARTERS, generate, type GeneratedTheme, type Roles, type ThemeConfig } from "../lib/theme";
import { cn, humanize } from "../lib/utils";
import { useBuilder } from "../state/builder";
import { useSettings } from "../state/settings";
import { Button, IconButton, Segmented, Switch } from "../components/ui";
import { Select, type SelectOption } from "../components/overlays";

type Mode = "light" | "dark";
const labDelta = (a: string, b: string): number => (a === b ? 0 : labDistance(a, b));

/** A tiny, themed sample screen so the two themes can be judged by eye. */
function SampleUi({ roles }: { roles: Roles }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-3xl p-3 transition-colors duration-300" style={{ background: roles.surface, color: roles.onSurface }}>
      <div className="flex items-center gap-2 rounded-full px-3 py-2" style={{ background: roles.surfaceContainerHigh, color: roles.onSurfaceVariant }}>
        <Search className="size-4" />
        <span className="flex-1 text-sm">Search</span>
        <span className="grid size-6 place-items-center rounded-full text-xs font-semibold" style={{ background: roles.tertiaryContainer, color: roles.onTertiaryContainer }}>
          M
        </span>
      </div>
      <div className="rounded-3xl p-4" style={{ background: roles.primaryContainer, color: roles.onPrimaryContainer }}>
        <div className="text-lg font-semibold leading-tight">Your theme, alive</div>
        <div className="mb-3 text-xs opacity-80">Every component reacts to the colors you choose.</div>
        <div className="flex items-center gap-2">
          <span className="rounded-full px-4 py-1.5 text-sm font-medium" style={{ background: roles.primary, color: roles.onPrimary }}>
            Open
          </span>
          <span className="rounded-full px-4 py-1.5 text-sm font-medium" style={{ background: roles.secondaryContainer, color: roles.onSecondaryContainer }}>
            Share
          </span>
          <span className="ml-auto grid size-9 place-items-center rounded-2xl" style={{ background: roles.tertiary, color: roles.onTertiary }}>
            <Plus className="size-5" />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-lg border px-3 py-1 text-xs" style={{ borderColor: roles.outline, color: roles.onSurfaceVariant }}>
          Design
        </span>
        <span className="rounded-lg px-3 py-1 text-xs" style={{ background: roles.secondaryContainer, color: roles.onSecondaryContainer }}>
          Code
        </span>
        <span className="rounded-lg px-3 py-1 text-xs" style={{ background: roles.errorContainer, color: roles.onErrorContainer }}>
          Error
        </span>
      </div>
      <div className="mt-1 flex justify-around rounded-full py-1.5" style={{ background: roles.surfaceContainer, color: roles.onSurfaceVariant }}>
        <span className="rounded-full px-4 py-1" style={{ background: roles.secondaryContainer, color: roles.onSecondaryContainer }}>
          <Home className="size-4" />
        </span>
        <Sparkles className="size-4 self-center" />
        <Bookmark className="size-4 self-center" />
      </div>
    </div>
  );
}

function passCount(roles: Roles): number {
  return CONTRAST_PAIRS.filter(([fg, bg, min]) => ratioOfHex(roles[fg], roles[bg]) >= min).length;
}

export function ComparePage({ onEdit }: { onEdit: () => void }) {
  const { t, settings } = useSettings();
  const b = useBuilder();
  const [a, setA] = useState("current");
  const [bb, setBb] = useState(() => (b.saved[0] ? `saved:${b.saved[0].id}` : `starter:${STARTERS[0].id}`));
  const [mode, setMode] = useState<Mode>("light");
  const [onlyDiff, setOnlyDiff] = useState(false);

  const options = useMemo<SelectOption<string>[]>(
    () => [
      { value: "current", label: t("compare.current"), hint: b.config.source },
      ...b.saved.map((s) => ({ value: `saved:${s.id}`, label: s.name, hint: s.config.source })),
      ...STARTERS.map((s) => ({ value: `starter:${s.id}`, label: settings.lang === "vi" ? s.vi : s.en, hint: s.seed })),
    ],
    [b.saved, b.config.source, settings.lang, t],
  );

  const resolve = (key: string): { config: ThemeConfig; name: string; id: string | null } => {
    if (key.startsWith("saved:")) {
      const s = b.saved.find((x) => x.id === key.slice(6));
      if (s) return { config: s.config, name: s.name, id: s.id };
    }
    if (key.startsWith("starter:")) {
      const s = STARTERS.find((x) => x.id === key.slice(8));
      if (s) return { config: { ...DEFAULT_CONFIG, source: s.seed, variant: s.variant }, name: settings.lang === "vi" ? s.vi : s.en, id: null };
    }
    return { config: b.config, name: t("compare.current"), id: b.currentId };
  };

  const A = resolve(a);
  const B = resolve(bb);
  const themeA = useMemo<GeneratedTheme>(() => generate(A.config), [A.config]);
  const themeB = useMemo<GeneratedTheme>(() => generate(B.config), [B.config]);
  const ra = themeA[mode];
  const rb = themeB[mode];

  const rows = useMemo(
    () =>
      ROLE_GROUPS.map((g) => ({
        id: g.id,
        roles: g.roles.map((role) => ({ role, a: ra[role], b: rb[role], d: labDelta(ra[role], rb[role]) })),
      })),
    [ra, rb],
  );
  const flat = rows.flatMap((g) => g.roles);
  const identical = flat.filter((r) => r.d < 0.5).length;
  const avg = flat.reduce((n, r) => n + r.d, 0) / flat.length;

  const kind = (d: number) => (d < 0.5 ? "same" : d < 8 ? "close" : "diff");

  const edit = (side: typeof A) => {
    b.replace(side.config, side.name === t("compare.current") ? b.currentName : side.name, side.id);
    onEdit();
  };

  const slot = (label: string, value: string, set: (v: string) => void, roles: Roles, theme: GeneratedTheme, side: typeof A, openLabel: string, delay: number) => (
    <section className="anim-fade-up min-w-0 rounded-3xl bg-surface-container-low p-4" style={{ "--d": `${delay}ms` } as CSSProperties}>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-on-primary">{label}</span>
        <Select<string> className="min-w-0 flex-1" label={label} value={value} onChange={set} options={options} />
      </div>
      <div className="mb-3 flex items-center gap-2 text-xs text-on-surface-variant">
        <span className="size-3 rounded-full" style={{ background: side.config.source }} />
        <span className="font-mono">{side.config.source}</span>
        <span className="truncate">· {t(`variant.${side.config.variant}` as never)}</span>
        <span className="ml-auto tabular-nums">
          {t("compare.contrast")}: {passCount(roles)}/{CONTRAST_PAIRS.length}
        </span>
      </div>
      <div className="mb-3 flex h-8 overflow-hidden rounded-full ring-1 ring-inset ring-outline-variant">
        {(["primary", "secondary", "tertiary", "error", "surfaceContainerHighest"] as const).map((k) => (
          <span key={k} className="flex-1 transition-colors duration-300" style={{ background: roles[k] }} />
        ))}
      </div>
      <SampleUi roles={roles} />
      <Button className="mt-3" variant="tonal" icon={<PencilLine className="size-4" />} onClick={() => edit(side)}>
        {openLabel}
      </Button>
      <span hidden>{theme.custom.length}</span>
    </section>
  );

  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-4 pb-8 pt-4 min-[900px]:px-8">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <div className="mr-auto min-w-0">
          <h1 className="t-display text-3xl">{t("compare.title")}</h1>
          <p className="text-sm text-on-surface-variant">{t("compare.subtitle")}</p>
        </div>
        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "light", label: t("common.light"), icon: <Sun className="size-4" /> },
            { value: "dark", label: t("common.dark"), icon: <Moon className="size-4" /> },
          ]}
        />
        <IconButton
          label={t("compare.swap")}
          tone="tonal"
          onClick={() => {
            setA(bb);
            setBb(a);
          }}
        >
          <ArrowLeftRight className="size-5" />
        </IconButton>
      </header>

      <div className="grid gap-4 min-[900px]:grid-cols-2">
        {slot("A", a, setA, ra, themeA, A, t("compare.openA"), 0)}
        {slot("B", bb, setBb, rb, themeB, B, t("compare.openB"), 60)}
      </div>

      <section className="anim-fade-up mt-6 rounded-3xl bg-surface-container-low p-4" style={{ "--d": "120ms" } as CSSProperties}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <div className="font-medium">{t("compare.identical", { n: identical, total: flat.length })}</div>
            <div className="text-xs text-on-surface-variant">
              {t("compare.avgDelta")}: ΔE {avg.toFixed(1)}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface-variant">
            {t("compare.onlyDiff")}
            <Switch label={t("compare.onlyDiff")} checked={onlyDiff} onChange={setOnlyDiff} />
          </label>
        </div>
        {onlyDiff && identical === flat.length && <p className="rounded-2xl bg-primary-container p-3 text-sm text-on-primary-container">{t("compare.noDiff")}</p>}
        <div className="space-y-5">
          {rows.map((g) => {
            const list = onlyDiff ? g.roles.filter((r) => r.d >= 0.5) : g.roles;
            if (!list.length) return null;
            return (
              <div key={g.id}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t(`group.${g.id}` as never)}</h3>
                <ul className="grid gap-1.5 min-[1100px]:grid-cols-2">
                  {list.map((r) => {
                    const k = kind(r.d);
                    return (
                      <li key={r.role} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-surface-container">
                        <span className="flex shrink-0 overflow-hidden rounded-xl ring-1 ring-inset ring-black/10">
                          <span className="h-9 w-12 transition-colors duration-300" style={{ background: r.a }} />
                          <span className="h-9 w-12 transition-colors duration-300" style={{ background: r.b }} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{humanize(r.role)}</span>
                          <span className="block truncate font-mono text-[11px] text-on-surface-variant">
                            {r.a} → {r.b}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            k === "same" && "bg-primary-container text-on-primary-container",
                            k === "close" && "bg-tertiary-container text-on-tertiary-container",
                            k === "diff" && "bg-error-container text-on-error-container",
                          )}
                        >
                          {t(`compare.${k}` as never)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
