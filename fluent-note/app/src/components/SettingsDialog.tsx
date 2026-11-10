import { useRef, type ReactNode } from "react";
import {
  Settings, Palette, PenLine, AppWindow, Sun, Moon, Monitor, Languages, Type, PanelTop, PanelLeft, WrapText,
  PanelBottom, SpellCheck, History, Save, Check, RotateCcw, Pipette, Move, LineNumbers, Blur, Maximize2, Brush, LayoutPanelTop, CaseSensitive,
  TriangleAlert, FolderOpen, FolderCog, type IconType,
} from "./ui/icons";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Select } from "./ui/Popover";
import { Segmented, Switch, ScrollArea } from "./ui/Controls";
import { useSettings, type Settings as S } from "../store/settings";
import { useUi, confirmDialog, toast, type SettingsTab } from "../store/ui";
import { isTauri, pickFolder } from "../lib/tauri";
import { PRESETS, isHex } from "../lib/theme";
import { FONTS } from "../lib/fonts";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";
import { X } from "./ui/icons";

/** Setting card (Windows 11 Settings style): glyph, title + description, and the control on the right or below. */
function Row({ icon: Icon, title, desc, children, stack }: { icon: IconType; title: string; desc?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={cn("fl-card p-4", stack ? "flex flex-col gap-3" : "flex items-center gap-4")}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Icon size={20} strokeWidth={1.5} className="flex-none text-fg" aria-hidden />
        <div className="min-w-0">
          <div className="text-sm leading-5">{title}</div>
          {desc && <div className="text-xs leading-4 text-fg2">{desc}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Selectable card with a Fluent radio indicator. */
function ChoiceCard({ on, icon: Icon, title, desc, onClick }: { on: boolean; icon: IconType; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-4 rounded border p-4 text-left transition-colors duration-100",
        on ? "border-brand bg-brand-tint" : "border-stroke bg-card hover:bg-sub-hover",
      )}
    >
      <Icon size={20} strokeWidth={1.5} className={cn("flex-none", on ? "text-on-brand-tint" : "text-fg")} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5">{title}</span>
        <span className="block text-xs leading-4 text-fg2">{desc}</span>
      </span>
      <span className={cn("grid h-5 w-5 flex-none place-items-center rounded-full border", on ? "border-brand bg-brand" : "border-fg2")}>
        {on && <span className="h-2 w-2 rounded-full bg-on-brand" />}
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

  const nav: { id: SettingsTab; label: string; icon: IconType }[] = [
    { id: "appearance", label: t("settings.appearance"), icon: Palette },
    { id: "editor", label: t("settings.editor"), icon: PenLine },
    { id: "window", label: t("settings.window"), icon: AppWindow },
    { id: "reset", label: t("settings.resetTab"), icon: RotateCcw },
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
      footer={<Button tone="primary" icon={Check} onClick={close} data-autofocus>{t("settings.done")}</Button>}
    >
      <nav className="flex flex-none gap-1 overflow-x-auto px-4 pb-2 sm:w-52 sm:flex-col sm:overflow-visible sm:px-3 sm:pb-0" aria-label={t("settings.title")}>
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
                "flex h-10 flex-none items-center gap-3 rounded px-3 text-sm transition-colors duration-100",
                on ? "fl-selected" : "text-fg hover:bg-sub-hover active:bg-sub-press",
              )}
            >
              <n.icon size={18} strokeWidth={1.5} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <ScrollArea resetKey={tab} className="px-4 pb-4 sm:pl-2 sm:pr-5">
        <div key={tab} className="stagger flex flex-col gap-2 pt-1">
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
                <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("settings.color")}>
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
                          "grid h-8 w-8 place-items-center rounded text-white transition-shadow duration-100",
                          on ? "outline outline-2 outline-offset-2 outline-fg" : "hover:shadow-fl4",
                        )}
                        style={{ background: p.hex }}
                      >
                        {on && <Check size={16} strokeWidth={2.4} />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    data-tip={t("settings.custom")}
                    aria-label={t("settings.custom")}
                    onClick={() => colorInput.current?.click()}
                    className={cn(
                      "relative grid h-8 w-8 place-items-center overflow-hidden rounded text-white transition-shadow duration-100",
                      !isPreset ? "outline outline-2 outline-offset-2 outline-fg" : "hover:shadow-fl4",
                    )}
                    style={{ background: isPreset ? "conic-gradient(#f44, #fa0, #ee0, #4c4, #0bf, #64f, #f4a, #f44)" : st.seed }}
                  >
                    {isPreset ? <Pipette size={16} strokeWidth={2} className="drop-shadow" /> : <Check size={16} strokeWidth={2.4} />}
                    <input
                      ref={colorInput}
                      type="color"
                      value={isHex(st.seed) ? st.seed : "#0078d4"}
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
                    { value: "small", label: t("size.small"), preview: <span className="text-xs font-semibold">A</span> },
                    { value: "medium", label: t("size.medium"), preview: <span className="text-base font-semibold">A</span> },
                    { value: "large", label: t("size.large"), preview: <span className="text-xl font-semibold">A</span> },
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
              <Row icon={LineNumbers} title={t("settings.lineNumbers")} desc={t("settings.d.lineNumbers")}>
                <Switch checked={st.lineNumbers} onChange={(v) => set({ lineNumbers: v })} label={t("settings.lineNumbers")} />
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
                <div className="flex flex-col gap-2">
                  <div
                    className="flex h-8 min-w-0 items-center gap-2.5 rounded border border-stroke bg-recess px-3 text-sm"
                    data-tip={st.saveDir ?? undefined}
                    data-tip-pos="top"
                  >
                    <FolderOpen size={16} strokeWidth={1.6} className="flex-none text-fg2" />
                    <span className={cn("min-w-0 flex-1 truncate", !st.saveDir && "text-fg2")} dir="rtl" style={{ textAlign: "left" }}>
                      <bdi>{st.saveDir ?? t("settings.saveDirNone")}</bdi>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button tone="neutral" icon={FolderOpen} small onClick={chooseFolder}>{t("settings.chooseFolder")}</Button>
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
                <div className="text-sm font-semibold">{t("settings.windowOnStart")}</div>
                <div className="text-xs text-fg2">{t("settings.d.windowStart")}</div>
              </div>
              <div role="radiogroup" aria-label={t("settings.windowOnStart")} className="flex flex-col gap-2">
                <ChoiceCard on={st.windowMode === "remember"} icon={Move} title={t("settings.winRemember")} desc={t("settings.d.winRemember")} onClick={() => set({ windowMode: "remember" })} />
                <ChoiceCard on={st.windowMode === "maximized"} icon={Maximize2} title={t("settings.winMax")} desc={t("settings.d.winMax")} onClick={() => set({ windowMode: "maximized" })} />
              </div>
              {isTauri && (
                <Row icon={Blur} title={t("settings.effect")} desc={t("settings.d.effect")} stack>
                  <Segmented
                    ariaLabel={t("settings.effect")}
                    value={st.windowEffect}
                    onChange={(v) => set({ windowEffect: v })}
                    options={[
                      { value: "mica", label: t("effect.mica") },
                      { value: "acrylic", label: t("effect.acrylic") },
                      { value: "micaAlt", label: t("effect.micaAlt") },
                    ]}
                  />
                </Row>
              )}
            </>
          )}

          {tab === "reset" && (
            <Row icon={RotateCcw} title={t("settings.reset")} desc={t("settings.d.reset")}>
              <Button tone="danger" icon={RotateCcw} small onClick={reset}>{t("reset.confirm")}</Button>
            </Row>
          )}
        </div>
      </ScrollArea>
    </Dialog>
  );
}
