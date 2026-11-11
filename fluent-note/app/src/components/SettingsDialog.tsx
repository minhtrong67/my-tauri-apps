import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Settings, Palette, PenLine, AppWindow, Sun, Moon, Monitor, Languages, Type, PanelTop, PanelLeft, WrapText,
  PanelBottom, SpellCheck, History, Save, Check, RotateCcw, Pipette, Move, LineNumbers, Blur, Maximize2, Brush, LayoutPanelTop, CaseSensitive,
  TriangleAlert, FolderOpen, FolderCog, Search, Download, Upload, type IconType,
} from "./ui/icons";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Select } from "./ui/Popover";
import { Segmented, Switch, ScrollArea } from "./ui/Controls";
import { useSettings, sanitize, type Settings as S } from "../store/settings";
import { useUi, confirmDialog, toast, type SettingsTab } from "../store/ui";
import { isTauri, pickFiles, pickFolder, pickSavePath, readTextFile, writeTextFile } from "../lib/tauri";
import { PRESETS, isHex } from "../lib/theme";
import { FONTS } from "../lib/fonts";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";
import { X } from "./ui/icons";

/* ---- search: while a query is typed, every page is shown and only matching cards stay visible ---- */
const SearchCtx = createContext("");
const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
const matches = (q: string, ...texts: (string | undefined)[]) => !q || norm(texts.filter(Boolean).join(" ")).includes(q);

/** A group of controls that appears as a whole when any of its texts matches the search. */
function Section({ texts, children }: { texts: string[]; children: ReactNode }) {
  const q = useContext(SearchCtx);
  return matches(q, ...texts) ? <>{children}</> : null;
}

/** Setting card (Windows 11 Settings style): glyph, title + description, and the control on the right or below. */
function Row({ icon: Icon, title, desc, children, stack }: { icon: IconType; title: string; desc?: string; children: ReactNode; stack?: boolean }) {
  const q = useContext(SearchCtx);
  if (!matches(q, title, desc)) return null;
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
  const [query, setQuery] = useState("");
  const q = norm(query.trim());
  const pages = useRef<HTMLDivElement>(null);
  const [noMatch, setNoMatch] = useState(false);
  useEffect(() => {
    setNoMatch(!!q && pages.current?.children.length === 0);
  });
  const show = (id: SettingsTab) => (q ? id !== "reset" : tab === id);
  const sysAccent = useUi((u) => u.systemAccent);
  const useSystem = st.systemAccent && !!sysAccent;
  const isPreset = useSystem || PRESETS.some((p) => p.hex.toLowerCase() === st.seed.toLowerCase());

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

  const exportSettings = async () => {
    try {
      const path = await pickSavePath("fluent-note-settings.json", [{ name: "JSON", extensions: ["json"] }]);
      if (!path) return;
      const { winState: _w, ...rest } = useSettings.getState();
      void _w;
      const data = Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function"));
      await writeTextFile(path, JSON.stringify(data, null, 2), "lf", "utf-8");
      toast.success(t("msg.exported"));
    } catch (e) {
      toast.error(String(e));
    }
  };

  const importSettings = async () => {
    try {
      const [path] = await pickFiles([{ name: "JSON", extensions: ["json"] }]);
      if (!path) return;
      const raw = JSON.parse((await readTextFile(path)).content) as Record<string, unknown>;
      if (!raw || typeof raw !== "object" || !("theme" in raw || "seed" in raw || "font" in raw)) throw new Error("bad");
      st.set({ ...sanitize(raw), winState: useSettings.getState().winState });
      toast.success(t("msg.imported"));
    } catch {
      toast.error(t("msg.importFail"));
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
        <div className="fl-field mb-1 hidden flex-none sm:flex">
          <Search size={16} className="ml-2.5 flex-none text-fg2" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("settings.search")} aria-label={t("settings.search")} />
        </div>
        {nav.map((n) => {
          const on = n.id === tab && !q;
          return (
            <button
              key={n.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setQuery("");
                useUi.setState({ settingsTab: n.id });
              }}
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

      <ScrollArea resetKey={tab + q} className="px-4 pb-4 sm:pl-2 sm:pr-5">
        <SearchCtx.Provider value={q}>
        <div ref={pages} key={q ? "search" : tab} className="stagger flex flex-col gap-2 pt-1">
          {show("appearance") && (
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
                  {sysAccent && (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={useSystem}
                      aria-label={t("settings.systemColor")}
                      data-tip={t("settings.systemColor")}
                      onClick={() => set({ systemAccent: true })}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded text-white transition-shadow duration-100",
                        useSystem ? "outline outline-2 outline-offset-2 outline-fg" : "hover:shadow-fl4",
                      )}
                      style={{ background: sysAccent }}
                    >
                      {useSystem ? <Check size={16} strokeWidth={2.4} /> : <AppWindow size={16} />}
                    </button>
                  )}
                  {PRESETS.map((p) => {
                    const on = !useSystem && p.hex.toLowerCase() === st.seed.toLowerCase();
                    return (
                      <button
                        key={p.hex}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={t(p.key)}
                        data-tip={t(p.key)}
                        onClick={() => set({ seed: p.hex, systemAccent: false })}
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
                      onChange={(e) => set({ seed: e.target.value, systemAccent: false })}
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

          {show("editor") && (
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

          {show("window") && (
            <>
              <Section texts={[t("settings.windowOnStart"), t("settings.d.windowStart"), t("settings.winRemember"), t("settings.winMax")]}>
              <div className="px-1 pt-1">
                <div className="text-sm font-semibold">{t("settings.windowOnStart")}</div>
                <div className="text-xs text-fg2">{t("settings.d.windowStart")}</div>
              </div>
              <div role="radiogroup" aria-label={t("settings.windowOnStart")} className="flex flex-col gap-2">
                <ChoiceCard on={st.windowMode === "remember"} icon={Move} title={t("settings.winRemember")} desc={t("settings.d.winRemember")} onClick={() => set({ windowMode: "remember" })} />
                <ChoiceCard on={st.windowMode === "maximized"} icon={Maximize2} title={t("settings.winMax")} desc={t("settings.d.winMax")} onClick={() => set({ windowMode: "maximized" })} />
              </div>
              </Section>
              {isTauri && (
                <Row icon={PanelTop} title={t("settings.titleBar")} desc={t("settings.d.titleBar")} stack>
                  <Segmented
                    ariaLabel={t("settings.titleBar")}
                    value={st.titleBar}
                    onChange={(v) => set({ titleBar: v })}
                    options={[
                      { value: "integrated", label: t("titleBar.integrated") },
                      { value: "native", label: t("titleBar.native") },
                    ]}
                  />
                </Row>
              )}
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

          {show("reset") && (
            <>
            {isTauri && (
              <Row icon={Download} title={t("settings.backup")} desc={t("settings.d.backup")}>
                <div className="flex flex-none gap-2">
                  <Button tone="neutral" icon={Upload} small onClick={() => void exportSettings()}>{t("settings.export")}</Button>
                  <Button tone="neutral" icon={Download} small onClick={() => void importSettings()}>{t("settings.import")}</Button>
                </div>
              </Row>
            )}
            <Row icon={RotateCcw} title={t("settings.reset")} desc={t("settings.d.reset")}>
              <Button tone="danger" icon={RotateCcw} small onClick={reset}>{t("reset.confirm")}</Button>
            </Row>
            </>
          )}
        </div>
        {noMatch && <p className="px-2 py-10 text-center text-sm text-fg2">{t("settings.noResults")}</p>}
        </SearchCtx.Provider>
      </ScrollArea>
    </Dialog>
  );
}
