import { useRef, useState } from "react";
import { AppWindow, Check, Code2, ExternalLink, Folder, FolderOpen, Maximize, Monitor, Moon, Palette, RotateCcw, ScanLine, Settings, Sparkles, Sun, Undo2, UserRound, X, Save } from "lucide-react";
import { useApp } from "../lib/store";
import { useT } from "../lib/i18n";
import { M3_SEEDS, UI_FONTS } from "../lib/constants";
import { openLink, pickFolder } from "../lib/tauri";
import { cookiePath } from "./AppBar";
import { Btn, ColorField, ConfirmDialog, Field, IconBtn, Modal, ScrollArea, Segmented, SelectBox, Switch, cx } from "./ui";

const REPO = "https://github.com/minhtrong67/my-tauri-apps";
const BLOB = cookiePath(50, 48, 0.07, 8);

function Group({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section id={`set-${id}`} className="scroll-mt-4 space-y-4 rounded-m3xl bg-surface-low p-5">
      <h3 className="flex items-center gap-3 text-base font-medium text-on-surface">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-container text-on-primary-container">{icon}</span>{title}
      </h3>
      {children}
    </section>
  );
}

function Choice({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button onClick={onClick} role="radio" aria-checked={active}
      className={cx("flex w-full items-center gap-3 rounded-m3l border-2 p-3 text-left transition-all duration-300 ease-spring active:scale-[.99]",
        active ? "border-primary bg-primary-container/50" : "border-outline-variant hover:bg-on-surface/5")}>
      <span className={cx("grid h-10 w-10 shrink-0 place-items-center transition-all duration-300 ease-spring", active ? "rounded-xl bg-primary text-on-primary" : "rounded-full bg-surface-highest text-on-surface-variant")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-on-surface">{title}</span>
        <span className="block text-xs text-on-surface-variant">{desc}</span>
      </span>
      {active && <Check size={18} className="animate-pop text-primary" />}
    </button>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const s = useApp();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("appearance");
  const [askReset, setAskReset] = useState(false);

  const nav = [
    { id: "appearance", label: t("navAppearance"), icon: <Palette size={18} /> },
    { id: "window", label: t("navWindow"), icon: <AppWindow size={18} /> },
    { id: "editor", label: t("navEditor"), icon: <Code2 size={18} /> },
    { id: "saving", label: t("navSaving"), icon: <Save size={18} /> },
    { id: "about", label: t("navAbout"), icon: <UserRound size={18} /> },
  ];
  const go = (id: string) => {
    const el = scroller.current, sec = el?.querySelector<HTMLElement>(`#set-${id}`);
    if (el && sec) el.scrollTo({ top: sec.offsetTop - 12, behavior: "smooth" });
  };
  const spy = (el: HTMLDivElement) => {
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) return setActive("about");
    let cur = nav[0].id;
    for (const n of nav) { const sec = el.querySelector<HTMLElement>(`#set-${n.id}`); if (sec && sec.offsetTop - 80 <= el.scrollTop) cur = n.id; }
    setActive(cur);
  };
  const choose = async () => { const p = await pickFolder(); if (p) s.set({ saveDir: p }); };

  return (
    <Modal onClose={onClose} label={t("settings")} className="flex h-[min(720px,calc(100vh-24px))] w-full max-w-3xl flex-col">
      <header className="flex items-center gap-3 px-6 pb-2 pt-5">
        <span className="grid h-11 w-11 place-items-center rounded-[40%_60%_55%_45%/55%_45%_60%_40%] bg-primary text-on-primary"><Settings size={22} /></span>
        <h2 className="flex-1 text-2xl font-medium text-on-surface">{t("settings")}</h2>
        <IconBtn label={t("close")} hint="Esc" onClick={onClose}><X size={22} /></IconBtn>
      </header>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto px-4 py-2 sm:w-52 sm:flex-col sm:overflow-visible sm:px-3" aria-label={t("settings")}>
          {nav.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} aria-current={active === n.id}
              className={cx("flex h-11 shrink-0 items-center gap-3 rounded-full px-4 text-sm font-medium transition-all duration-300 ease-spring",
                active === n.id ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant hover:bg-on-surface/8")}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>

        <ScrollArea className="min-w-0 flex-1" innerClassName="relative space-y-4 px-4 pb-4 pt-2 sm:pl-1 sm:pr-5" label={t("scrollTop")} scrollRef={scroller} onScroll={spy}>
          <Group id="appearance" icon={<Palette size={18} />} title={t("appearance")}>
            <Field label={t("themeMode")}>
              <Segmented value={s.themeMode} onChange={(v) => s.set({ themeMode: v })} options={[
                { value: "light", label: t("light"), icon: <Sun size={14} /> },
                { value: "dark", label: t("dark"), icon: <Moon size={14} /> },
                { value: "system", label: t("system"), icon: <Monitor size={14} /> },
              ]} />
            </Field>
            <Field label={t("themeColor")}>
              <div className="grid grid-cols-6 gap-2.5 sm:grid-cols-9">
                {M3_SEEDS.map((c) => {
                  const on = s.seed.toLowerCase() === c.toLowerCase();
                  return (
                    <button key={c} aria-label={c} aria-pressed={on} onClick={() => s.set({ seed: c })}
                      className={cx("relative aspect-square transition-all duration-300 ease-spring hover:scale-110 active:scale-90", on ? "rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-surface-low" : "rounded-full")}
                      style={{ background: c }}>
                      {on && <Check size={16} strokeWidth={3} className="absolute inset-0 m-auto animate-pop text-white mix-blend-difference" />}
                    </button>
                  );
                })}
              </div>
              <ColorField label={t("customColor")} value={s.seed} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && s.set({ seed: v })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("uiFont")}>
                <SelectBox label={t("uiFont")} value={s.uiFont} onChange={(v) => s.set({ uiFont: v })}
                  options={UI_FONTS.map((f) => ({ value: f.id, label: f.label, family: f.family }))} />
              </Field>
              <Field label={t("fontScale")}>
                <Segmented value={s.fontScale} onChange={(v) => s.set({ fontScale: v })} options={[
                  { value: "small", label: t("small") }, { value: "medium", label: t("medium") }, { value: "large", label: t("large") },
                ]} />
              </Field>
            </div>
            <Field label={t("uiLanguage")}>
              <Segmented value={s.lang} onChange={(v) => s.set({ lang: v })} options={[
                { value: "system", label: t("system") }, { value: "en", label: "English" }, { value: "vi", label: "Tiếng Việt" },
              ]} />
            </Field>
          </Group>

          <Group id="window" icon={<AppWindow size={18} />} title={t("startup")}>
            <div role="radiogroup" className="space-y-2">
              <Choice active={s.windowMode === "remember"} onClick={() => s.set({ windowMode: "remember" })} icon={<ScanLine size={20} />} title={t("rememberSize")} desc={t("rememberDesc")} />
              <Choice active={s.windowMode === "maximized"} onClick={() => s.set({ windowMode: "maximized" })} icon={<Maximize size={20} />} title={t("alwaysMax")} desc={t("maxDesc")} />
            </div>
          </Group>

          <Group id="editor" icon={<Code2 size={18} />} title={t("editorGroup")}>
            <Field label={t("formatOnPaste")} hint={t("formatOnPasteDesc")} right={<Switch label={t("formatOnPaste")} checked={s.formatOnPaste} onChange={(v) => s.set({ formatOnPaste: v })} />} />
          </Group>

          <Group id="saving" icon={<Save size={18} />} title={t("saving")}>
            <Field label={t("askSave")} hint={t("askSaveDesc")} right={<Switch label={t("askSave")} checked={s.askBeforeSave} onChange={(v) => s.set({ askBeforeSave: v })} />} />
            <Field label={t("saveFolder")} hint={t("saveFolderDesc")}>
              <div className="flex items-center gap-2">
                <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-highest px-3 text-sm text-on-surface">
                  <Folder size={16} className="shrink-0 text-on-surface-variant" />
                  <span className="truncate" dir="rtl"><bdi>{s.saveDir ?? t("defaultFolder")}</bdi></span>
                </div>
                {s.saveDir && <IconBtn label={t("useDefault")} onClick={() => s.set({ saveDir: null })}><Undo2 size={20} /></IconBtn>}
                <Btn variant="tonal" className="!px-4" icon={<FolderOpen size={18} />} onClick={choose}>{t("chooseFolder")}</Btn>
              </div>
            </Field>
          </Group>

          <Group id="about" icon={<UserRound size={18} />} title={t("about")}>
            <div className="relative overflow-hidden rounded-m3xl bg-gradient-to-br from-primary to-tertiary p-5 text-on-primary shadow-e2">
              <svg viewBox="0 0 100 100" className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 animate-float opacity-20" aria-hidden><path d={BLOB} fill="currentColor" /></svg>
              <div className="relative flex items-center gap-4">
                <svg viewBox="0 0 100 100" className="h-16 w-16 shrink-0" aria-hidden>
                  <path d={BLOB} fill="rgb(var(--md-on-primary))" />
                  <text x="50" y="66" textAnchor="middle" fontSize="48" fontWeight="700" fill="rgb(var(--md-primary))" style={{ fontFamily: "var(--ui-font)" }}>M</text>
                </svg>
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-widest opacity-80">{t("createdBy")}</div>
                  <div className="truncate text-2xl font-bold tracking-tight">minhtrong67</div>
                </div>
              </div>
              <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-on-primary/20 px-3 py-1.5"><Sparkles size={14} />{t("builtWith")}</span>
                <span className="rounded-full bg-on-primary/20 px-3 py-1.5">{t("version")} {__APP_VERSION__}</span>
                <span className="rounded-full bg-on-primary/20 px-3 py-1.5">MIT · {t("openSource")}</span>
              </div>
              <button onClick={() => openLink(REPO)}
                className="relative mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-on-primary px-5 text-sm font-medium text-primary transition-all duration-300 ease-spring hover:scale-[1.03] active:scale-95 active:rounded-2xl">
                {t("viewRepo")} <ExternalLink size={16} />
              </button>
            </div>
          </Group>
        </ScrollArea>
      </div>

      <footer className="flex items-center justify-between gap-2 px-6 pb-5 pt-3">
        <Btn variant="outlined" className="!border-error !text-error hover:!bg-error/10" icon={<RotateCcw size={18} />} onClick={() => setAskReset(true)}>{t("resetSettings")}</Btn>
        <Btn variant="filled" icon={<Check size={18} />} onClick={onClose}>{t("done")}</Btn>
      </footer>

      {askReset && (
        <ConfirmDialog
          title={t("resetSettingsTitle")} message={t("resetSettingsMsg")} icon={<RotateCcw size={26} />}
          confirmLabel={t("reset")} cancelLabel={t("cancel")} confirmIcon={<RotateCcw size={18} />}
          onCancel={() => setAskReset(false)} onConfirm={() => { s.resetSettings(); setAskReset(false); }}
        />
      )}
    </Modal>
  );
}
