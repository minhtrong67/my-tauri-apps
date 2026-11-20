import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FolderOpen, Settings as Gear, Search, Sun, Moon, Monitor, Palette, Type, Languages, AppWindow, Library, Eye, Info, Keyboard, RotateCcw, Check, Maximize2, SquareDashed, Heart, Layers, TriangleAlert } from "lucide-react";
import { DEFAULTS, app, settings, setSetting, toast, useApp, useSettings, useT, t } from "../lib/store";
import type { Material } from "../lib/types";
import { ACCENTS, FONTS } from "../lib/theme";
import { api, isTauri, pickFolder } from "../lib/tauri";
import { Modal } from "../components/Overlays";
import { Select } from "../components/Select";
import { Btn, Kbd, Segmented, SliderRow, Switch } from "../components/ui";
import { cx } from "../lib/utils";
import { refresh, loadLibrary } from "../lib/actions";

interface Row { label: string; desc?: string; icon?: typeof Gear; control: ReactNode; stack?: boolean; note?: ReactNode }
interface Sec { id: string; title: string; icon: typeof Gear; rows: Row[] }

export const SHORTCUTS: [string, string[]][] = [
  ["key.nav", ["←", "→"]], ["key.zoom", ["+", "−", "Ctrl + Wheel"]], ["key.fit", ["0", "1"]], ["key.fullscreen", ["F"]], ["key.info", ["I"]], ["key.fav", ["H"]],
  ["key.slideshow", ["S"]], ["key.rotate", ["R", "Shift+R"]], ["key.edit", ["E"]], ["key.copy", ["Ctrl+C"]], ["key.delete", ["Del"]], ["key.select", ["Ctrl+A"]],
  ["key.undo", ["Ctrl+Z", "Ctrl+Y"]], ["key.save", ["Ctrl+S"]], ["key.esc", ["Esc"]],
];

import type { Key } from "../lib/i18n";
const MATERIALS: [Material, Key, Key][] = [
  ["mica", "set.mat.mica", "set.mat.mica.d"], ["mica-alt", "set.mat.micaAlt", "set.mat.micaAlt.d"], ["acrylic", "set.mat.acrylic", "set.mat.acrylic.d"],
  ["acrylic-alt", "set.mat.acrylicAlt", "set.mat.acrylicAlt.d"],
  ["frosted", "set.mat.frosted", "set.mat.frosted.d"], ["liquid", "set.mat.liquid", "set.mat.liquid.d"], ["none", "set.mat.none", "set.mat.none.d"],
];

export function SettingsDialog() {
  const tt = useT();
  const open = useApp((s) => s.settingsOpen);
  const s = useSettings((x) => x);
  const materialOk = useApp((x) => x.materialOk);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("look");
  const [winMode, setWinMode] = useState<"remember" | "maximized">("remember");
  useEffect(() => { if (open && isTauri) api.getWindowMode().then((m) => setWinMode(m === "maximized" ? "maximized" : "remember")).catch(() => {}); if (!open) setQ(""); }, [open]);
  const close = () => app.set({ settingsOpen: false });
  const lang = s.lang;

  const setWin = (m: "remember" | "maximized") => { setWinMode(m); setSetting("windowMode", m); if (isTauri) api.setWindowMode(m).catch(() => {}); };
  const secs: Sec[] = useMemo(() => [
    { id: "look", title: tt("set.appearance"), icon: Palette, rows: [
      { label: tt("set.theme"), icon: Sun, control: <Segmented value={s.theme} onChange={(v) => setSetting("theme", v)}
        options={[{ value: "system", label: tt("set.theme.system"), icon: Monitor }, { value: "light", label: tt("set.theme.light"), icon: Sun }, { value: "dark", label: tt("set.theme.dark"), icon: Moon }]} /> },
      { label: tt("set.material"), desc: tt("set.material.d"), icon: Layers,
        control: <Select className="w-48" value={s.material} onChange={(v) => setSetting("material", v as Material)} options={MATERIALS.map(([v, l]) => ({ value: v, label: tt(l) }))} />,
        note: (<>
          <p>{tt(MATERIALS.find((m) => m[0] === s.material)![2])}</p>
          {!materialOk && s.material !== "none" && <p className="flex items-start gap-2"><TriangleAlert size={14} className="shrink-0 mt-0.5 text-[#9d5d00] dark:text-[#fce100]" />{tt("set.material.unsupported")}</p>}
          {(s.material === "acrylic" || s.material === "acrylic-alt" || s.material === "frosted" || s.material === "liquid") && <p>{tt("set.material.perf")}</p>}
        </>) },
      { label: tt("set.color"), icon: Palette, stack: true, control: (
        <div className="grid grid-cols-8 gap-2 w-full">
          {ACCENTS.map((c) => {
            const on = s.accent.toLowerCase() === c.hex.toLowerCase();
            return <button key={c.id} aria-label={lang === "vi" ? c.vi : c.en} title={lang === "vi" ? c.vi : c.en} onClick={() => setSetting("accent", c.hex)} style={{ background: c.hex }}
              className={cx("h-9 w-full grid place-items-center rounded-md transition-shadow duration-150", on ? "ring-2 ring-offset-2 ring-offset-surface-container ring-on-surface" : "hover:ring-2 hover:ring-on-surface/30")}>{on && <Check size={16} color="#fff" strokeWidth={3} />}</button>;
          })}
          <label className="h-9 w-full rounded-md overflow-hidden relative cursor-pointer ring-1 ring-outline-variant hover:ring-2 hover:ring-on-surface/30" style={{ background: "conic-gradient(red,yellow,lime,aqua,blue,magenta,red)" }} title={tt("set.color.custom")}>
            <input type="color" value={s.accent} onChange={(e) => setSetting("accent", e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={tt("set.color.custom")} />
          </label>
        </div>) },
      { label: tt("set.fontSize"), icon: Type, control: <Segmented value={s.fontSize} onChange={(v) => setSetting("fontSize", v)} options={[{ value: "sm", label: tt("set.size.sm") }, { value: "md", label: tt("set.size.md") }, { value: "lg", label: tt("set.size.lg") }]} /> },
      { label: tt("set.language"), icon: Languages, control: <Segmented value={s.lang} onChange={(v) => setSetting("lang", v)} options={[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "English" }]} /> },
      { label: tt("set.font"), icon: Type, control: <Select className="w-52" value={s.font} onChange={(v) => setSetting("font", v)} options={FONTS.map((f) => ({ value: f.id, label: f.label, style: { fontFamily: f.stack } }))} /> },
      { label: tt("set.animations"), desc: tt("set.animations.d"), icon: Layers, control: <Switch label={tt("set.animations")} on={s.reduceMotion} onChange={(v) => setSetting("reduceMotion", v)} /> },
    ] },
    { id: "win", title: tt("set.window"), icon: AppWindow, rows: [
      { label: tt("set.window.startup"), icon: AppWindow, stack: true, control: (
        <div className="grid sm:grid-cols-2 gap-2" role="radiogroup">
          {([["remember", SquareDashed, "set.window.remember", "set.window.remember.d"], ["maximized", Maximize2, "set.window.max", "set.window.max.d"]] as const).map(([v, Ic, l, d]) => (
            <button key={v} role="radio" aria-checked={winMode === v} onClick={() => setWin(v)}
              className={cx("relative text-left py-3 pl-4 pr-3 border flex gap-3 items-start rounded-md transition-colors", winMode === v ? "border-primary bg-primary-container" : "border-outline-variant bg-surface-high hover:bg-surface-highest")}>
              {winMode === v && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-primary" />}
              <Ic size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" /><span><span className="block text-sm font-semibold">{tt(l)}</span><span className="block text-xs text-on-surface-variant mt-0.5">{tt(d)}</span></span>
            </button>
          ))}
        </div>) },
    ] },
    { id: "lib", title: tt("set.library"), icon: Library, rows: [
      { label: tt("set.libPath"), desc: s.libraryPath || tt("set.libPath.default"), icon: FolderOpen, control: (
        <div className="flex gap-2 shrink-0">
          {isTauri && <Btn kind="tonal" icon={FolderOpen} onClick={async () => { const p = await pickFolder(); if (p) { setSetting("libraryPath", p); loadLibrary(); } }}>{tt("set.libPath.choose")}</Btn>}
          {s.libraryPath && <Btn kind="tonal" icon={RotateCcw} onClick={() => { setSetting("libraryPath", ""); loadLibrary(); }}>{tt("set.libPath.reset")}</Btn>}
        </div>) },
      { label: tt("set.autoLoad"), desc: tt("set.autoLoad.d"), icon: Library, control: <Switch label={tt("set.autoLoad")} on={s.autoLoad} onChange={(v) => setSetting("autoLoad", v)} /> },
    ] },
    { id: "viewer", title: tt("set.viewer"), icon: Eye, rows: [
      { label: tt("set.saveQuality"), icon: Eye, stack: true, control: <SliderRow label={tt("set.saveQuality")} value={s.quality} min={60} max={100} fmt={(v) => `${v}%`} onChange={(v) => setSetting("quality", v)} /> },
      { label: tt("set.keepExif"), icon: Eye, control: <Switch label={tt("set.keepExif")} on={s.keepExif} onChange={(v) => setSetting("keepExif", v)} /> },
      { label: tt("set.confirmDelete"), icon: Eye, control: <Switch label={tt("set.confirmDelete")} on={s.confirmDelete} onChange={(v) => setSetting("confirmDelete", v)} /> },
    ] },
    { id: "keys", title: tt("set.shortcuts"), icon: Keyboard, rows: [
      { label: tt("set.shortcuts"), stack: true, control: (
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0.5">{SHORTCUTS.map(([k, keys]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-1.5 border-b border-outline-variant/60"><span className="text-sm">{tt(k as never)}</span><span className="flex gap-1 shrink-0">{keys.map((x) => <Kbd key={x}>{x}</Kbd>)}</span></div>))}</div>) },
    ] },
  ], [s, winMode, lang, materialOk]); // eslint-disable-line react-hooks/exhaustive-deps

  const ql = q.trim().toLowerCase();
  const shown = ql
    ? secs.map((sec) => ({ ...sec, rows: sec.rows.filter((r) => (r.label + " " + (r.desc ?? "") + " " + sec.title).toLowerCase().includes(ql)) })).filter((x) => x.rows.length)
    : secs.filter((x) => x.id === tab);
  const aboutMatch = ql ? "about giới thiệu minhtrong67 claude fluent photos".includes(ql) : tab === "about";
  const nav = [...secs.map((x) => ({ id: x.id, title: x.title, icon: x.icon })), { id: "about", title: tt("set.about"), icon: Info }];

  const renderRow = (sec: Sec, r: Row) => r.stack ? (
    <div key={r.label} className="scard p-4 space-y-3">
      {sec.id !== "keys" && sec.id !== "viewer" && (
        <div className="flex items-start gap-3">{r.icon && <r.icon size={18} strokeWidth={1.75} className="text-on-surface-variant shrink-0 mt-0.5" />}<div><div className="text-sm font-semibold">{r.label}</div>{r.desc && <div className="text-xs text-on-surface-variant mt-0.5">{r.desc}</div>}</div></div>
      )}
      {r.control}
    </div>
  ) : (
    <div key={r.label} className="scard px-4 py-3 flex items-center gap-x-4 gap-y-2 flex-wrap min-h-[3.5rem]">
      {r.icon && <r.icon size={18} strokeWidth={1.75} className="text-on-surface-variant shrink-0" />}
      <div className="flex-1 min-w-[9rem]"><div className="text-sm">{r.label}</div>{r.desc && <div className="text-xs text-on-surface-variant mt-0.5 break-all line-clamp-2" title={r.desc}>{r.desc}</div>}</div>
      <div className="ml-auto">{r.control}</div>
      {r.note && <div className="basis-full text-xs text-on-surface-variant space-y-1 empty:hidden pl-[34px]">{r.note}</div>}
    </div>
  );

  return (
    <Modal open={open} onClose={close} title={tt("set.title")} icon={Gear} width={900} tall noPad
      actions={<>
        <Btn kind="filled" icon={Check} onClick={close}>{tt("done")}</Btn>
        <Btn kind="tonal" icon={RotateCcw} onClick={() => { Object.entries(DEFAULTS).forEach(([k, v]) => settings.set({ [k]: v } as never)); setWin("remember"); toast("success", t("set.resetDone")); }}>{tt("set.resetAll")}</Btn>
      </>}>
      <div className="h-full flex flex-col sm:flex-row min-h-0">
        <aside className="sm:w-56 shrink-0 p-3 flex flex-col gap-2 sm:border-r border-outline-variant bg-on-surface/[.03] sm:overflow-y-auto">
          <label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input className="field pl-9" placeholder={tt("set.search")} value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <nav className="flex sm:flex-col gap-0.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0" aria-label={tt("set.title")}>
            {nav.map((n) => (
              <button key={n.id} onClick={() => { setTab(n.id); setQ(""); }} aria-current={!ql && tab === n.id} className={cx("nav-item shrink-0 sm:w-full !w-auto sm:!w-full whitespace-nowrap", !ql && tab === n.id && "on")}>
                <n.icon size={16} strokeWidth={1.75} className="shrink-0" /><span className="truncate">{n.title}</span>
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto p-5 pb-6">
          <div key={ql ? "search" : tab} className="space-y-5 max-w-[46rem] anim-float">
            {!ql && <h3 className="text-xl font-semibold leading-7">{nav.find((n) => n.id === tab)?.title}</h3>}
            {shown.map((sec) => (
              <section key={sec.id} className="space-y-0.5">
                {ql && <h4 className="flex items-center gap-2 mb-2 text-sm font-semibold"><sec.icon size={16} strokeWidth={1.75} className="text-accent" />{sec.title}</h4>}
                <div className="flex flex-col gap-0.5">{sec.rows.map((r) => renderRow(sec, r))}</div>
              </section>
            ))}
            {aboutMatch && (
              <section>
                {ql && <h4 className="flex items-center gap-2 mb-2 text-sm font-semibold"><Info size={16} strokeWidth={1.75} className="text-accent" />{tt("set.about")}</h4>}
                <div className="scard p-5 flex gap-4 items-center">
                  <img src="/icon.svg" alt="" className="size-16 shrink-0" />
                  <div className="min-w-0"><div className="font-semibold text-lg">Fluent Photos</div><div className="text-sm text-on-surface-variant">{tt("about.version", { v: "2.0.0" })}</div>
                    <div className="text-sm mt-1.5">{tt("about.author")}: <b className="font-semibold">minhtrong67</b></div>
                    <div className="text-xs mt-1 text-on-surface-variant flex items-center gap-1 flex-wrap"><Heart size={12} fill="currentColor" className="text-[#e74856]" />{tt("about.ai")}</div><div className="text-xs text-on-surface-variant">{tt("about.license")}</div></div>
                </div>
              </section>
            )}
            {!shown.length && !aboutMatch && <p className="text-center text-on-surface-variant py-10">{tt("set.noMatch", { q })}</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
