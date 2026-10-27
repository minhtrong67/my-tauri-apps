import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Settings as Gear, Search, Sun, Moon, Monitor, Palette, Type, Languages, AppWindow, Library, Eye, Info, Keyboard, RotateCcw, Check, X, Maximize2, SquareDashed, Heart } from "lucide-react";
import { DEFAULTS, app, settings, setSetting, toast, useApp, useSettings, useT, t } from "../lib/store";
import { SEEDS, FONTS } from "../lib/theme";
import { api, isTauri } from "../lib/tauri";
import { Modal } from "../components/Overlays";
import { Select } from "../components/Select";
import { Btn, Kbd, Segmented, SliderRow, Switch } from "../components/ui";
import { cx } from "../lib/utils";
import { refresh } from "../lib/actions";

interface Row { label: string; desc?: string; icon?: typeof Gear; control: ReactNode; stack?: boolean }
interface Sec { id: string; title: string; icon: typeof Gear; rows: Row[] }

export const SHORTCUTS: [string, string[]][] = [
  ["key.nav", ["←", "→"]], ["key.zoom", ["+", "−", "Ctrl + Wheel"]], ["key.fit", ["0", "1"]], ["key.fullscreen", ["F"]], ["key.info", ["I"]], ["key.fav", ["H"]],
  ["key.slideshow", ["S"]], ["key.rotate", ["R", "Shift+R"]], ["key.edit", ["E"]], ["key.copy", ["Ctrl+C"]], ["key.delete", ["Del"]], ["key.select", ["Ctrl+A"]],
  ["key.undo", ["Ctrl+Z", "Ctrl+Y"]], ["key.save", ["Ctrl+S"]], ["key.esc", ["Esc"]],
];

export function SettingsDialog() {
  const tt = useT();
  const open = useApp((s) => s.settingsOpen);
  const s = useSettings((x) => x);
  const [q, setQ] = useState("");
  const [winMode, setWinMode] = useState<"remember" | "maximized">("remember");
  useEffect(() => { if (open && isTauri) api.getWindowMode().then((m) => setWinMode(m === "maximized" ? "maximized" : "remember")).catch(() => {}); if (!open) setQ(""); }, [open]);
  const close = () => app.set({ settingsOpen: false });
  const lang = s.lang;

  const setWin = (m: "remember" | "maximized") => { setWinMode(m); setSetting("windowMode", m); if (isTauri) api.setWindowMode(m).catch(() => {}); };
  const secs: Sec[] = useMemo(() => [
    { id: "look", title: tt("set.appearance"), icon: Palette, rows: [
      { label: tt("set.theme"), icon: Sun, stack: true, control: <Segmented className="w-full" value={s.theme} onChange={(v) => setSetting("theme", v)}
        options={[{ value: "system", label: tt("set.theme.system"), icon: Monitor }, { value: "light", label: tt("set.theme.light"), icon: Sun }, { value: "dark", label: tt("set.theme.dark"), icon: Moon }]} /> },
      { label: tt("set.color"), icon: Palette, stack: true, control: (
        <div className="flex flex-wrap gap-2.5">
          {SEEDS.map((c) => {
            const on = s.seed.toLowerCase() === c.hex.toLowerCase();
            return <button key={c.id} aria-label={lang === "vi" ? c.vi : c.en} title={lang === "vi" ? c.vi : c.en} onClick={() => setSetting("seed", c.hex)} style={{ background: c.hex }}
              className={cx("size-9 grid place-items-center transition-all duration-400 ease-spring", on ? "rounded-[14px] scale-110 ring-2 ring-offset-2 ring-offset-surface-container ring-on-surface" : "rounded-full hover:scale-110 hover:rounded-[14px]")}>{on && <Check size={18} color="#fff" strokeWidth={3} />}</button>;
          })}
          <label className="size-9 rounded-full overflow-hidden relative cursor-pointer ring-1 ring-outline-variant hover:scale-110 transition-transform" style={{ background: "conic-gradient(red,yellow,lime,aqua,blue,magenta,red)" }} title={tt("set.color.custom")}>
            <input type="color" value={s.seed} onChange={(e) => setSetting("seed", e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={tt("set.color.custom")} />
          </label>
        </div>) },
      { label: tt("set.fontSize"), icon: Type, stack: true, control: <Segmented className="w-full" value={s.fontSize} onChange={(v) => setSetting("fontSize", v)} options={[{ value: "sm", label: tt("set.size.sm") }, { value: "md", label: tt("set.size.md") }, { value: "lg", label: tt("set.size.lg") }]} /> },
      { label: tt("set.language"), icon: Languages, stack: true, control: <Segmented className="w-full" value={s.lang} onChange={(v) => setSetting("lang", v)} options={[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "English" }]} /> },
      { label: tt("set.font"), icon: Type, control: <Select className="w-52" value={s.font} onChange={(v) => setSetting("font", v)} options={FONTS.map((f) => ({ value: f.id, label: f.label, style: { fontFamily: f.stack } }))} /> },
      { label: tt("set.animations"), desc: tt("set.animations.d"), control: <Switch label={tt("set.animations")} on={s.reduceMotion} onChange={(v) => setSetting("reduceMotion", v)} /> },
    ] },
    { id: "win", title: tt("set.window"), icon: AppWindow, rows: [
      { label: tt("set.window.startup"), icon: AppWindow, stack: true, control: (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {([["remember", SquareDashed, "set.window.remember", "set.window.remember.d"], ["maximized", Maximize2, "set.window.max", "set.window.max.d"]] as const).map(([v, Ic, l, d]) => (
            <button key={v} role="radio" aria-checked={winMode === v} onClick={() => setWin(v)}
              className={cx("text-left p-4 border-2 flex gap-3 items-start transition-all duration-400 ease-spring", winMode === v ? "border-primary bg-primary-container text-on-primary-container rounded-[24px]" : "border-outline-variant hover:bg-on-surface/5 rounded-[16px]")}>
              <Ic size={22} className="shrink-0 mt-0.5" /><span><span className="block font-bold text-sm">{tt(l)}</span><span className="block text-xs opacity-80 mt-0.5">{tt(d)}</span></span>
              {winMode === v && <Check size={18} className="ml-auto shrink-0 anim-pop" />}
            </button>
          ))}
        </div>) },
    ] },
    { id: "lib", title: tt("set.library"), icon: Library, rows: [
      { label: tt("set.autoLoad"), desc: tt("set.autoLoad.d"), control: <Switch label={tt("set.autoLoad")} on={s.autoLoad} onChange={(v) => setSetting("autoLoad", v)} /> },
      { label: tt("set.watch"), desc: tt("set.watch.d"), control: <Switch label={tt("set.watch")} on={s.watch} onChange={(v) => { setSetting("watch", v); setTimeout(() => refresh(true), 50); }} /> },
    ] },
    { id: "viewer", title: tt("set.viewer"), icon: Eye, rows: [
      { label: tt("set.saveQuality"), stack: true, control: <SliderRow label={tt("set.saveQuality")} value={s.quality} min={60} max={100} fmt={(v) => `${v}%`} onChange={(v) => setSetting("quality", v)} /> },
      { label: tt("set.keepExif"), control: <Switch label={tt("set.keepExif")} on={s.keepExif} onChange={(v) => setSetting("keepExif", v)} /> },
      { label: tt("set.confirmDelete"), control: <Switch label={tt("set.confirmDelete")} on={s.confirmDelete} onChange={(v) => setSetting("confirmDelete", v)} /> },
    ] },
    { id: "keys", title: tt("set.shortcuts"), icon: Keyboard, rows: [
      { label: tt("set.shortcuts"), stack: true, control: (
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">{SHORTCUTS.map(([k, keys]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-1"><span className="text-sm">{tt(k as never)}</span><span className="flex gap-1 shrink-0">{keys.map((x) => <Kbd key={x}>{x}</Kbd>)}</span></div>))}</div>) },
    ] },
  ], [s, winMode, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const ql = q.trim().toLowerCase();
  const shown = secs.map((sec) => ({ ...sec, rows: ql ? sec.rows.filter((r) => (r.label + " " + (r.desc ?? "") + " " + sec.title).toLowerCase().includes(ql)) : sec.rows })).filter((x) => x.rows.length);
  const showAbout = !ql || "about giới thiệu minhtrong67 claude".includes(ql);

  return (
    <Modal open={open} onClose={close} title={tt("set.title")} icon={Gear} width={720} tall noPad
      actions={<>
        <Btn kind="tonal" icon={RotateCcw} onClick={() => { Object.entries(DEFAULTS).forEach(([k, v]) => settings.set({ [k]: v } as never)); setWin("remember"); toast("success", t("set.resetDone")); }}>{tt("set.resetAll")}</Btn>
        <Btn kind="filled" icon={Check} onClick={close}>{tt("done")}</Btn>
      </>}>
      <div className="px-6 pb-2 sticky top-0 z-10 bg-surface-container pt-1">
        <label className="relative block"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input className="field !rounded-full pl-11" placeholder={tt("set.search")} value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      <div className="px-6 pb-6 space-y-6 stagger">
        {shown.map((sec, i) => (
          <section key={sec.id} style={{ ["--i" as string]: i }}>
            <h3 className="flex items-center gap-2 mb-2.5 text-[.8rem] font-extrabold tracking-wide text-primary uppercase"><sec.icon size={16} />{sec.title}</h3>
            <div className="rounded-[28px] bg-surface-low border border-outline-variant/40 divide-y divide-outline-variant/40 overflow-hidden">
              {sec.rows.map((r) => r.stack ? (
                <div key={r.label} className="p-4 space-y-3">{sec.id !== "viewer" && sec.id !== "keys" && <div className="font-semibold text-sm">{r.label}</div>}{r.control}</div>
              ) : (
                <div key={r.label} className="p-4 flex items-center gap-4 min-h-[4rem]"><div className="flex-1 min-w-0"><div className="font-semibold text-sm">{r.label}</div>{r.desc && <div className="text-xs text-on-surface-variant mt-0.5">{r.desc}</div>}</div>{r.control}</div>
              ))}
            </div>
          </section>
        ))}
        {showAbout && (
          <section>
            <h3 className="flex items-center gap-2 mb-2.5 text-[.8rem] font-extrabold tracking-wide text-primary uppercase"><Info size={16} />{tt("set.about")}</h3>
            <div className="rounded-[28px] bg-primary-container text-on-primary-container p-5 flex gap-4 items-center">
              <img src="/icon.svg" alt="" className="size-16 shrink-0 anim-breathe" />
              <div className="min-w-0"><div className="font-extrabold text-lg">Material Photo</div><div className="text-sm opacity-85">{tt("about.version", { v: "1.1.0" })}</div>
                <div className="text-sm mt-1.5">{tt("about.author")}: <b>minhtrong67</b></div>
                <div className="text-xs mt-1 opacity-85 flex items-center gap-1 flex-wrap"><Heart size={12} fill="currentColor" />{tt("about.ai")}</div><div className="text-xs opacity-80">{tt("about.license")}</div></div>
            </div>
          </section>
        )}
        {!shown.length && !showAbout && <p className="text-center text-on-surface-variant py-10">{tt("set.noMatch", { q })}</p>}
      </div>
    </Modal>
  );
}
