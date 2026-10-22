import { useEffect } from "react";
import { Check, ExternalLink, Maximize, Monitor, Moon, ScanLine, Sun, X } from "lucide-react";
import { useApp } from "../lib/store";
import { useT } from "../lib/i18n";
import { M3_SEEDS } from "../lib/constants";
import { openLink } from "../lib/tauri";
import { ColorField, Field, IconBtn, Segmented, Switch, cx } from "./ui";

const REPO = "https://github.com/minhtrong67/code-image";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-primary">{title}</h3>
      {children}
    </section>
  );
}

function Choice({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={cx("flex w-full items-center gap-3 rounded-m3l border-2 p-3 text-left transition-all duration-200 active:scale-[.99]",
      active ? "border-primary bg-primary-container/50" : "border-outline-variant hover:bg-on-surface/5")}>
      <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full", active ? "bg-primary text-on-primary" : "bg-surface-highest text-on-surface-variant")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-on-surface">{title}</span>
        <span className="block text-xs text-on-surface-variant">{desc}</span>
      </span>
      {active && <Check size={18} className="animate-fadeIn text-primary" />}
    </button>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const s = useApp();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid animate-fadeIn place-items-center bg-black/40 p-3 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t("settings")} onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-lg animate-rise flex-col overflow-hidden rounded-m3xl bg-surface-container shadow-e3">
        <header className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="text-2xl text-on-surface">{t("settings")}</h2>
          <IconBtn label={t("close")} onClick={onClose}><X size={22} /></IconBtn>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-4">
          <Group title={t("appearance")}>
            <Field label={t("themeMode")}>
              <Segmented value={s.themeMode} onChange={(v) => s.set({ themeMode: v })} options={[
                { value: "light", label: t("light"), icon: <Sun size={14} /> },
                { value: "dark", label: t("dark"), icon: <Moon size={14} /> },
                { value: "system", label: t("system"), icon: <Monitor size={14} /> },
              ]} />
            </Field>
            <Field label={t("themeColor")}>
              <div className="grid grid-cols-9 gap-2">
                {M3_SEEDS.map((c) => (
                  <button key={c} aria-label={c} onClick={() => s.set({ seed: c })}
                    className="relative aspect-square rounded-full transition-transform duration-200 hover:scale-110 active:scale-90" style={{ background: c }}>
                    {s.seed.toLowerCase() === c.toLowerCase() && <Check size={14} strokeWidth={3} className="absolute inset-0 m-auto animate-fadeIn text-white mix-blend-difference" />}
                  </button>
                ))}
              </div>
              <ColorField label={t("customColor")} value={s.seed} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && s.set({ seed: v })} />
            </Field>
            <Field label={t("fontScale")}>
              <Segmented value={s.fontScale} onChange={(v) => s.set({ fontScale: v })} options={[
                { value: "small", label: t("small") }, { value: "medium", label: t("medium") }, { value: "large", label: t("large") },
              ]} />
            </Field>
            <Field label={t("uiLanguage")}>
              <Segmented value={s.lang} onChange={(v) => s.set({ lang: v })} options={[
                { value: "system", label: t("system") }, { value: "en", label: "English" }, { value: "vi", label: "Tiếng Việt" },
              ]} />
            </Field>
          </Group>

          <Group title={t("startup")}>
            <Choice active={s.windowMode === "remember"} onClick={() => s.set({ windowMode: "remember" })} icon={<ScanLine size={20} />} title={t("rememberSize")} desc={t("rememberDesc")} />
            <Choice active={s.windowMode === "maximized"} onClick={() => s.set({ windowMode: "maximized" })} icon={<Maximize size={20} />} title={t("alwaysMax")} desc={t("maxDesc")} />
          </Group>

          <Group title={t("saving")}>
            <Field label={t("askSave")} hint={t("askSaveDesc")} right={<Switch label={t("askSave")} checked={s.askBeforeSave} onChange={(v) => s.set({ askBeforeSave: v })} />} />
          </Group>

          <Group title={t("about")}>
            <div className="space-y-1 rounded-m3l bg-surface-low p-4 text-center">
              <div className="text-lg font-medium text-on-surface">Code Image</div>
              <div className="text-xs text-on-surface-variant">{t("version")} 1.0.0 · MIT · {t("openSource")}</div>
              <div className="pt-2 text-sm text-on-surface">{t("author")}: <b>minhtrong67</b></div>
              <div className="text-sm text-primary">{t("madeWith")}</div>
              {/* <button onClick={() => openLink(REPO)} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                github.com/minhtrong67/code-image <ExternalLink size={12} />
              </button> */}
            </div>
          </Group>
        </div>
      </div>
    </div>
  );
}
