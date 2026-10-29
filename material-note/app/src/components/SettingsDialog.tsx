import { useRef, type ReactNode } from "react";
import {
  Settings, Palette, PenLine, AppWindow, Sun, Moon, Monitor, Languages, Type, PanelTop, PanelLeft, WrapText,
  PanelBottom, SpellCheck, History, Save, Check, RotateCcw, Pipette, Move, Maximize2, Brush, LayoutPanelTop, CaseSensitive,
  TriangleAlert, FolderOpen, FolderCog, type LucideIcon,
} from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Select } from "./ui/Popover";
import { Segmented, Switch, ScrollArea } from "./ui/Controls";
import { CreditCard } from "./Dialogs";
import { useSettings, type Settings as S } from "../store/settings";
import { useUi, confirmDialog, toast, type SettingsTab } from "../store/ui";
import { pickFolder } from "../lib/tauri";
import { PRESETS, isHex } from "../lib/theme";
import { FONTS } from "../lib/fonts";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";
import { X } from "lucide-react";

function Row({ icon: Icon, title, desc, children, stack }: { icon: LucideIcon; title: string; desc?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={cn("rounded-3xl bg-surface-container p-4", stack ? "flex flex-col gap-3.5" : "flex items-center gap-3.5")}>
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-primary-container text-on-primary-container">
          <Icon size={20} strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <div className="text-[0.9375rem] font-semibold leading-tight">{title}</div>
          {desc && <div className="mt-0.5 text-[0.75rem] leading-snug text-on-surface-variant">{desc}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ChoiceCard({ on, icon: Icon, title, desc, onClick }: { on: boolean; icon: LucideIcon; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "ripple relative flex w-full items-center gap-3.5 p-4 text-left transition-[border-radius,background-color,box-shadow] duration-200 ease-standard active:scale-[0.98]",
        on ? "rounded-[1.25rem] bg-secondary-container text-on-secondary-container ring-2 ring-primary" : "rounded-3xl bg-surface-container",
      )}
    >
      <span className={cn("grid h-11 w-11 flex-none place-items-center rounded-2xl", on ? "bg-primary text-on-primary" : "bg-primary-container text-on-primary-container")}>
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold">{title}</span>
        <span className={cn("mt-0.5 block text-[0.75rem] leading-snug", on ? "opacity-80" : "text-on-surface-variant")}>{desc}</span>
      </span>
      <span className={cn("grid h-6 w-6 flex-none place-items-center rounded-full transition-[transform,opacity] duration-200 ease-standard", on ? "scale-100 bg-primary text-on-primary" : "scale-50 opacity-0")}>
        <Check size={15} strokeWidth={3} />
      </span>
    </button>
  );
}

export function SettingsDialog() {
  const t = useT();
  const open = useUi((s) => s.settingsOpen);
  const tab = useUi((s) => s.settingsTab);
  const st = useSettings();
  const set = (p: Partial<S>) => st.set(p);
  const colorInput = useRef<HTMLInputElement>(null);
  const close = () => useUi.setState({ settingsOpen: false });
  const isPreset = PRESETS.some((p) => p.hex.toLowerCase() === st.seed.toLowerCase());

  const reset = async () => {
    const r = await confirmDialog({
      title: t("reset.title"),
      message: t("reset.msg"),
      icon: TriangleAlert,
      iconTone: "warning",
      actions: [
        { id: "cancel", label: t("common.cancel"), icon: X, tone: "neutral" },
        { id: "reset", label: t("reset.confirm"), icon: RotateCcw, tone: "danger" },
      ],
    });
    if (r === "reset") {
      st.reset();
      toast.success(t("msg.settingsReset"));
    }
  };

  const chooseFolder = async () => {
    try {
      const dir = await pickFolder(st.saveDir);
      if (dir) {
        set({ saveDir: dir });
        toast.success(t("msg.saveDirSet"));
      }
    } catch (e) {
      toast.error(String(e));
    }
  };

  const nav: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
    { id: "appearance", label: t("settings.appearance"), icon: Palette },
    { id: "editor", label: t("settings.editor"), icon: PenLine },
    { id: "window", label: t("settings.window"), icon: AppWindow },
  ];

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t("settings.title")}
      subtitle={t("settings.subtitle")}
      icon={Settings}
      size="xl"
      className="h-[min(44rem,100%)]"
      bodyClassName="flex flex-col sm:flex-row !overflow-hidden"
      footer={
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Button tone="danger" icon={RotateCcw} onClick={reset}>{t("settings.reset")}</Button>
            <Button tone="primary" icon={Check} onClick={close} data-autofocus>{t("settings.done")}</Button>
          </div>
          {/* author credit: always the last element of the settings */}
          <CreditCard />
        </div>
      }
    >
      <nav className="flex flex-none gap-1.5 overflow-x-auto px-4 pb-2 sm:w-52 sm:flex-col sm:overflow-visible sm:px-4 sm:pb-0 sm:pt-1" aria-label={t("settings.title")}>
        {nav.map((n) => {
          const on = n.id === tab;
          return (
            <button
              key={n.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => useUi.setState({ settingsTab: n.id })}
              className={cn(
                "ripple flex h-12 flex-none items-center gap-3 px-4 text-[0.875rem] font-semibold transition-[border-radius,background-color,color] duration-200 ease-standard",
                on ? "rounded-xl bg-secondary-container text-on-secondary-container" : "rounded-full text-on-surface-variant",
              )}
            >
              <n.icon size={20} strokeWidth={2.1} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <ScrollArea resetKey={tab} className="px-4 pb-4 sm:pr-5 sm:pl-1">
        <div key={tab} className="anim-fade-in flex flex-col gap-3 pt-1">
          {tab === "appearance" && (
            <>
              <Row icon={Sun} title={t("settings.theme")} desc={t("settings.d.theme")} stack>
                <Segmented
                  ariaLabel={t("settings.theme")}
                  value={st.theme}
                  onChange={(v) => set({ theme: v })}
                  options={[
                    { value: "light", label: t("settings.light"), icon: Sun },
                    { value: "dark", label: t("settings.dark"), icon: Moon },
                    { value: "system", label: t("settings.system"), icon: Monitor },
                  ]}
                />
              </Row>

              <Row icon={Brush} title={t("settings.color")} desc={t("settings.d.color")} stack>
                <div className="flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label={t("settings.color")}>
                  {PRESETS.map((p) => {
                    const on = p.hex.toLowerCase() === st.seed.toLowerCase();
                    return (
                      <button
                        key={p.hex}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={t(p.key)}
                        data-tip={t(p.key)}
                        onClick={() => set({ seed: p.hex })}
                        className={cn(
                          "grid h-11 w-11 place-items-center text-white shadow-e2 transition-[border-radius,transform,box-shadow] duration-200 ease-standard hover:scale-110 active:scale-90",
                          on ? "rounded-[0.9rem] ring-[3px] ring-on-surface ring-offset-2 ring-offset-surface-container" : "rounded-full",
                        )}
                        style={{ background: p.hex }}
                      >
                        {on && <Check size={20} strokeWidth={3} />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    data-tip={t("settings.custom")}
                    aria-label={t("settings.custom")}
                    onClick={() => colorInput.current?.click()}
                    className={cn(
                      "relative grid h-11 w-11 place-items-center overflow-hidden text-white shadow-e2 transition-[border-radius,transform] duration-200 ease-standard hover:scale-110 active:scale-90",
                      !isPreset ? "rounded-[0.9rem] ring-[3px] ring-on-surface ring-offset-2 ring-offset-surface-container" : "rounded-full",
                    )}
                    style={{ background: isPreset ? "conic-gradient(#f44, #fa0, #ee0, #4c4, #0bf, #64f, #f4a, #f44)" : st.seed }}
                  >
                    {isPreset ? <Pipette size={19} strokeWidth={2.4} className="drop-shadow" /> : <Check size={20} strokeWidth={3} />}
                    <input
                      ref={colorInput}
                      type="color"
                      value={isHex(st.seed) ? st.seed : "#0061ff"}
                      onChange={(e) => set({ seed: e.target.value })}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      tabIndex={-1}
                      aria-hidden
                    />
                  </button>
                </div>
              </Row>

              <Row icon={Languages} title={t("settings.language")} desc={t("settings.d.lang")} stack>
                <Segmented
                  ariaLabel={t("settings.language")}
                  value={st.lang}
                  onChange={(v) => set({ lang: v })}
                  options={[
                    { value: "en", label: "English" },
                    { value: "vi", label: "Tiếng Việt" },
                  ]}
                />
              </Row>

              <Row icon={Type} title={t("settings.font")} desc={t("settings.d.font")} stack>
                <Select
                  ariaLabel={t("settings.font")}
                  value={st.font}
                  onChange={(v) => set({ font: v })}
                  options={FONTS.map((f) => ({ value: f.id, label: f.id === "system" ? t("font.system") : f.name, hint: t(f.kind), fontFamily: f.stack }))}
                />
              </Row>

              <Row icon={CaseSensitive} title={t("settings.textSize")} desc={t("settings.d.size")} stack>
                <Segmented
                  ariaLabel={t("settings.textSize")}
                  value={st.textSize}
                  onChange={(v) => set({ textSize: v })}
                  options={[
                    { value: "small", label: t("size.small"), preview: <span className="text-[0.75rem] font-bold">A</span> },
                    { value: "medium", label: t("size.medium"), preview: <span className="text-[0.95rem] font-bold">A</span> },
                    { value: "large", label: t("size.large"), preview: <span className="text-[1.2rem] font-bold">A</span> },
                  ]}
                />
              </Row>
            </>
          )}

          {tab === "editor" && (
            <>
              <Row icon={LayoutPanelTop} title={t("settings.tabLayout")} desc={t("settings.d.tabLayout")} stack>
                <Segmented
                  ariaLabel={t("settings.tabLayout")}
                  value={st.tabLayout}
                  onChange={(v) => set({ tabLayout: v })}
                  options={[
                    { value: "horizontal", label: t("settings.tabsHorizontal"), icon: PanelTop },
                    { value: "vertical", label: t("settings.tabsVertical"), icon: PanelLeft },
                  ]}
                />
              </Row>
              <Row icon={WrapText} title={t("settings.wrap")} desc={t("settings.d.wrap")}>
                <Switch checked={st.wrap} onChange={(v) => set({ wrap: v })} label={t("settings.wrap")} />
              </Row>
              <Row icon={PanelBottom} title={t("settings.statusBar")} desc={t("settings.d.status")}>
                <Switch checked={st.statusBar} onChange={(v) => set({ statusBar: v })} label={t("settings.statusBar")} />
              </Row>
              <Row icon={SpellCheck} title={t("settings.spellcheck")} desc={t("settings.d.spell")}>
                <Switch checked={st.spellcheck} onChange={(v) => set({ spellcheck: v })} label={t("settings.spellcheck")} />
              </Row>
              <Row icon={History} title={t("settings.restore")} desc={t("settings.d.restore")}>
                <Switch checked={st.restore} onChange={(v) => set({ restore: v })} label={t("settings.restore")} />
              </Row>
              <Row icon={FolderCog} title={t("settings.saveDir")} desc={t("settings.d.saveDir")} stack>
                <div className="flex flex-col gap-2.5">
                  <div
                    className="flex h-11 min-w-0 items-center gap-2.5 rounded-2xl bg-surface-highest px-4 text-[0.8125rem]"
                    data-tip={st.saveDir ?? undefined}
                    data-tip-pos="top"
                  >
                    <FolderOpen size={18} className="flex-none text-on-surface-variant" />
                    <span className={cn("min-w-0 flex-1 truncate", !st.saveDir && "text-on-surface-variant")} dir="rtl" style={{ textAlign: "left" }}>
                      <bdi>{st.saveDir ?? t("settings.saveDirNone")}</bdi>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button tone="tonal" icon={FolderOpen} small onClick={chooseFolder}>{t("settings.chooseFolder")}</Button>
                    <Button tone="neutral" icon={RotateCcw} small disabled={!st.saveDir} onClick={() => set({ saveDir: null })}>{t("settings.clearFolder")}</Button>
                  </div>
                </div>
              </Row>
              <Row icon={Save} title={t("settings.autosave")} desc={t("settings.d.autosave")}>
                <Switch checked={st.autosave} onChange={(v) => set({ autosave: v })} label={t("settings.autosave")} />
              </Row>
            </>
          )}

          {tab === "window" && (
            <>
              <div className="px-1 pt-1">
                <div className="text-[0.9375rem] font-semibold">{t("settings.windowOnStart")}</div>
                <div className="mt-0.5 text-[0.75rem] text-on-surface-variant">{t("settings.d.windowStart")}</div>
              </div>
              <div role="radiogroup" aria-label={t("settings.windowOnStart")} className="flex flex-col gap-2.5">
                <ChoiceCard on={st.windowMode === "remember"} icon={Move} title={t("settings.winRemember")} desc={t("settings.d.winRemember")} onClick={() => set({ windowMode: "remember" })} />
                <ChoiceCard on={st.windowMode === "maximized"} icon={Maximize2} title={t("settings.winMax")} desc={t("settings.d.winMax")} onClick={() => set({ windowMode: "maximized" })} />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </Dialog>
  );
}
