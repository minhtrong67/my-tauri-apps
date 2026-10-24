import type { CSSProperties, ReactNode } from "react";
import { AppWindow, Check, Languages, Maximize2, Monitor, Moon, Palette, Settings as SettingsIcon, Sun, Type } from "lucide-react";
import { AppLogo } from "../components/AppLogo";
import { cn } from "../lib/utils";
import { ACCENTS, FONTS, useSettings, type FontId, type FontSize, type Lang, type ThemeMode } from "../state/settings";
import { isTauri, type WindowMode } from "../lib/tauri";

function Group({ icon, title, desc, children, delay }: { icon: ReactNode; title: string; desc: string; children: ReactNode; delay: number }) {
  return (
    <section className="anim-fade-up rounded-[28px] bg-surface-container-low p-5" style={{ "--d": `${delay}ms` } as CSSProperties}>
      <header className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-secondary-container text-on-secondary-container">{icon}</span>
        <div>
          <h2 className="text-base font-medium leading-tight">{title}</h2>
          <p className="text-xs text-on-surface-variant">{desc}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Option({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-ripple
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl border-2 p-3.5 text-left transition-[background-color,border-color,transform] duration-200 active:scale-[0.98]",
        selected ? "border-primary bg-primary-container/40" : "border-outline-variant hover:bg-surface-container-high",
        className,
      )}
    >
      {selected && (
        <span className="anim-pop absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-primary text-on-primary">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

const MODE_PREVIEW: Record<ThemeMode, string> = {
  light: "#FEF7FF",
  dark: "#141218",
  system: "linear-gradient(135deg, #FEF7FF 50%, #141218 50%)",
};

export function SettingsPage() {
  const { t, settings, set, dark } = useSettings();
  const accent = ACCENTS.find((a) => a.hex.toLowerCase() === settings.accent.toLowerCase());
  const lang = settings.lang;

  const modes: { id: ThemeMode; icon: ReactNode; label: string }[] = [
    { id: "light", icon: <Sun className="size-4" />, label: t("common.light") },
    { id: "dark", icon: <Moon className="size-4" />, label: t("common.dark") },
    { id: "system", icon: <Monitor className="size-4" />, label: t("settings.system") },
  ];
  const sizes: { id: FontSize; label: string; px: number }[] = [
    { id: "small", label: t("settings.small"), px: 13 },
    { id: "medium", label: t("settings.medium"), px: 17 },
    { id: "large", label: t("settings.large"), px: 22 },
  ];
  const langs: { id: Lang; label: string; badge: string }[] = [
    { id: "en", label: "English", badge: "EN" },
    { id: "vi", label: "Tiếng Việt", badge: "VI" },
  ];
  const windows: { id: WindowMode; icon: ReactNode; title: string; desc: string }[] = [
    { id: "remember", icon: <AppWindow className="size-6 text-primary" />, title: t("settings.winRemember"), desc: t("settings.winRememberDesc") },
    { id: "maximized", icon: <Maximize2 className="size-6 text-primary" />, title: t("settings.winMax"), desc: t("settings.winMaxDesc") },
  ];

  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-4 pb-8 pt-4 min-[900px]:px-8">
      <header className="anim-fade-up mb-6 flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-[20px] bg-primary-container text-on-primary-container">
          <SettingsIcon className="anim-spin-slow size-7" />
        </span>
        <div>
          <h1 className="t-display text-3xl">{t("settings.title")}</h1>
          <p className="text-sm text-on-surface-variant">{t("settings.subtitle")}</p>
        </div>
      </header>

      <div className="grid items-start gap-4 min-[1000px]:grid-cols-2">
        <div className="grid gap-4">
          <Group icon={<Palette className="size-5" />} title={t("settings.appearance")} desc={t("settings.appearanceDesc")} delay={40}>
            <div role="radiogroup" aria-label={t("settings.mode")} className="grid grid-cols-3 gap-2">
              {modes.map((m) => (
                <Option key={m.id} selected={settings.mode === m.id} onClick={() => set({ mode: m.id })}>
                  <span className="h-12 w-full rounded-lg border border-outline-variant p-1.5" style={{ background: MODE_PREVIEW[m.id] }}>
                    <span className="block h-2 w-1/2 rounded-full" style={{ background: m.id === "dark" ? "#D0BCFF" : "#6750A4" }} />
                    <span className="mt-1 block h-1.5 w-3/4 rounded-full opacity-60" style={{ background: m.id === "dark" ? "#CCC2DC" : "#625B71" }} />
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {m.icon}
                    {m.label}
                  </span>
                </Option>
              ))}
            </div>

            <div className="mb-2 mt-5 flex items-baseline justify-between">
              <h3 className="text-sm font-medium">{t("settings.accent")}</h3>
              <span key={settings.accent} className="anim-fade-up text-xs text-on-surface-variant">
                {accent ? (lang === "vi" ? accent.vi : accent.en) : settings.accent}
              </span>
            </div>
            <div role="radiogroup" aria-label={t("settings.accent")} className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-2.5">
              {ACCENTS.map((a, i) => {
                const selected = a.hex.toLowerCase() === settings.accent.toLowerCase();
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={lang === "vi" ? a.vi : a.en}
                    data-tip={lang === "vi" ? a.vi : a.en}
                    onClick={() => set({ accent: a.hex })}
                    style={{ background: a.hex, "--d": `${i * 18}ms` } as CSSProperties}
                    className={cn(
                      "anim-pop relative grid aspect-square place-items-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95",
                      selected && "ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low",
                    )}
                  >
                    {selected && <Check className="anim-pop size-4 text-white mix-blend-difference" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </Group>

          <Group icon={<AppWindow className="size-5" />} title={t("settings.window")} desc={t("settings.windowDesc")} delay={160}>
            <div role="radiogroup" aria-label={t("settings.window")} className="grid gap-2 sm:grid-cols-2">
              {windows.map((w) => (
                <Option key={w.id} selected={settings.windowMode === w.id} onClick={() => set({ windowMode: w.id })}>
                  {w.icon}
                  <span className="text-sm font-medium">{w.title}</span>
                  <span className="text-xs text-on-surface-variant">{w.desc}</span>
                </Option>
              ))}
            </div>
            {settings.windowMode === "remember" && settings.windowSize && (
              <p className="mt-3 text-xs text-on-surface-variant">{t("settings.winSaved", { w: settings.windowSize.w, h: settings.windowSize.h })}</p>
            )}
            {!isTauri() && <p className="mt-3 text-xs text-on-surface-variant">{t("settings.winDesktopOnly")}</p>}
          </Group>
        </div>

        <div className="grid gap-4">
          <Group icon={<Type className="size-5" />} title={t("settings.typography")} desc={t("settings.typographyDesc")} delay={100}>
            <h3 className="mb-2 text-sm font-medium">{t("settings.fontSize")}</h3>
            <div role="radiogroup" aria-label={t("settings.fontSize")} className="grid grid-cols-3 gap-2">
              {sizes.map((s) => (
                <Option key={s.id} selected={settings.fontSize === s.id} onClick={() => set({ fontSize: s.id })} className="items-center">
                  <span className="leading-none" style={{ fontSize: s.px }}>
                    Aa
                  </span>
                  <span className="text-xs font-medium">{s.label}</span>
                </Option>
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-sm font-medium">{t("settings.font")}</h3>
            <div role="radiogroup" aria-label={t("settings.font")} className="grid gap-2 sm:grid-cols-2">
              {FONTS.map((f) => (
                <Option key={f.id} selected={settings.font === f.id} onClick={() => set({ font: f.id as FontId })}>
                  <span className="text-2xl leading-none" style={{ fontFamily: f.stack }}>
                    Aa
                  </span>
                  <span className="text-sm font-medium" style={{ fontFamily: f.stack }}>
                    {f.id === "system" ? t("settings.fontSystem") : f.label}
                  </span>
                  <span className="truncate text-xs text-on-surface-variant" style={{ fontFamily: f.stack }}>
                    Quá khôn ngoan · 0123456789
                  </span>
                </Option>
              ))}
            </div>
          </Group>

          <Group icon={<Languages className="size-5" />} title={t("settings.language")} desc={t("settings.languageDesc")} delay={140}>
            <div role="radiogroup" aria-label={t("settings.language")} className="grid grid-cols-2 gap-2">
              {langs.map((l) => (
                <Option key={l.id} selected={settings.lang === l.id} onClick={() => set({ lang: l.id })} className="flex-row items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-tertiary-container text-xs font-bold text-on-tertiary-container">{l.badge}</span>
                  <span className="text-sm font-medium">{l.label}</span>
                </Option>
              ))}
            </div>
          </Group>

          <section className="anim-fade-up flex items-center gap-4 rounded-[28px] bg-surface-container-low p-5" style={{ "--d": "200ms" } as CSSProperties}>
            <AppLogo size={56} />
            <div className="min-w-0 text-sm">
              <div className="text-base font-medium">Material Theme Builder</div>
              <div className="text-on-surface-variant">
                {t("settings.version")} 1.0.0 · MIT · {dark ? t("common.dark") : t("common.light")}
              </div>
              <div className="mt-1 text-on-surface-variant">
                {t("settings.author")}: <span className="font-medium text-on-surface">minhtrong67</span> · {t("settings.builtWith")}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
