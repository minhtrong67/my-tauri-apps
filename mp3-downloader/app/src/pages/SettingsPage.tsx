import { useEffect, useState, type ReactNode } from "react";
import { AppWindow, AudioWaveform, Bell, BellRing, CloudDownload, Cookie as CookieIcon, Crop, Download, FileText, Film, FolderOpen, FolderPen, Gauge, Globe, Languages, Layers, Maximize, Monitor, Moon, MoveDiagonal2, Palette, PanelTop, RefreshCw, RotateCcw, Settings as Gear, ShieldCheck, Sun, SunMoon, Terminal, Type, Wrench, ALargeSmall, Copy, SquareArrowOutUpRight, Check, ClipboardPaste, type LucideIcon } from "lucide-react";
import { open as pickFolder } from "@tauri-apps/plugin-dialog";
import { toast, useSettings, useTools, type DupPolicy, type NameTpl, type Quality } from "../lib/stores";
import { FONTS, PRESETS, onColor, type FontSize, type Mode } from "../lib/theme";
import { IS_WINDOWS, invoke } from "../lib/tauri";
import { checkYtdlpUpdate, installTools, useToolState, type ToolId } from "../lib/tools";
import { useI18n } from "../lib/i18n";
import { Button } from "../components/ui/Button";
import { ChoiceChips, Segmented, Switch, TextField } from "../components/ui/Controls";
import { Select } from "../components/ui/Select";
import { ConfirmDialog } from "../components/ui/Overlay";
import { WavyProgress } from "../components/ui/Progress";
import { ripple } from "../components/ui/ripple";

function Section({ id, icon: Icon, title, children }: { id: string; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-6 scroll-mt-20 animate-rise">
      <h2 className="mb-2 ml-3 flex items-center gap-2 text-sm font-bold text-primary"><Icon className="h-[18px] w-[18px]" />{title}</h2>
      <div className="overflow-hidden rounded-m3-xl bg-surface-container">{children}</div>
    </section>
  );
}
function Row({ icon: Icon, title, desc, children, stacked, onClick }: { icon: LucideIcon; title: ReactNode; desc?: ReactNode; children?: ReactNode; stacked?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`flex gap-4 border-t border-outline-variant/50 px-5 py-4 first:border-t-0 ${stacked ? "flex-col" : "flex-wrap items-center"}`}>
      <div className="flex min-w-[200px] flex-1 items-center gap-4">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-m3-md bg-secondary-container text-on-secondary-container"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0"><div className="t-title">{title}</div>{desc && <div className="t-small text-on-surface-variant">{desc}</div>}</div>
      </div>
      {children && <div className={stacked ? "sm:pl-[60px]" : "flex flex-none items-center gap-2"}>{children}</div>}
    </div>
  );
}

function ToolRow({ id, icon, name, hint }: { id: ToolId; icon: LucideIcon; name: ReactNode; hint?: string }) {
  const { t } = useI18n();
  const tools = useTools((s) => s.tools);
  const { installing, progress, outdated } = useToolState();
  const ver = tools ? tools[id] : undefined;
  const ok = tools != null && ver != null;
  const p = progress[id];
  return (
    <div className="border-t border-outline-variant/50 px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-4">
        <span className={`grid h-11 w-11 flex-none place-items-center rounded-m3-md transition-colors ${ok ? "bg-primary-container text-on-primary-container" : "bg-secondary-container text-on-secondary-container"}`}>{(() => { const I = ok ? ShieldCheck : icon; return <I className="h-5 w-5" />; })()}</span>
        <div className="min-w-[160px] flex-1"><div className="t-title">{name}</div>
          <div className={`t-small ${ok ? "text-primary" : "text-on-surface-variant"}`}>{!tools ? t("tool.checking") : ok ? (ver ? t("tool.installed", { v: ver }) : t("tool.installedNoVer")) : (hint ?? t("tool.missing"))}{id === "ytdlp" && outdated ? ` · → ${outdated.latest}` : ""}</div></div>
        {tools && (!ok || id === "ytdlp") && <Button variant="tonal" icon={ok ? RefreshCw : Download} disabled={installing} onClick={() => installTools([id])}>{ok ? t("tool.update") : t("tool.install")}</Button>}
      </div>
      {p != null && <div className="mt-3 sm:pl-[60px]"><WavyProgress value={p} indeterminate={p >= 100} /></div>}
    </div>
  );
}

export default function SettingsPage() {
  const { t, tr } = useI18n();
  const { s, set, reset } = useSettings();
  const checking = useToolState((x) => x.checking);
  const [hex, setHex] = useState(s.seed);
  const [hexBad, setHexBad] = useState(false);
  const [winMode, setWinMode] = useState("remember");
  const [confirmReset, setConfirmReset] = useState(false);
  const [spy, setSpy] = useState("appearance");
  // Scrollspy: chip của mục đang xem được tô sáng
  useEffect(() => {
    const ids = ["appearance", "downloads", "network", "window", "tools"];
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setSpy(v.target.id.replace("sec-", "")); }, { rootMargin: "-90px 0px -60% 0px" });
    ids.forEach((id) => { const el = document.getElementById("sec-" + id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  useEffect(() => { invoke<string>("get_window_mode").then(setWinMode).catch(() => {}); }, []);
  useEffect(() => { setHex(s.seed); }, [s.seed]);

  const onHex = (v: string) => {
    setHex(v);
    let x = v.trim(); if (x && !x.startsWith("#")) x = "#" + x;
    const ok = /^#[0-9a-f]{6}$/i.test(x);
    setHexBad(!!v && !ok);
    if (ok) set({ seed: x.toUpperCase() });
  };
  const pickDir = async () => {
    try { const d = await pickFolder({ directory: true, multiple: false, defaultPath: s.outDir || undefined }); if (typeof d === "string") set({ outDir: d }); }
    catch (e) { toast.error(tr(e)); }
  };
  const setWin = async (v: string) => { const prev = winMode; setWinMode(v); try { await invoke("set_window_mode", { mode: v }); } catch (e) { setWinMode(prev); toast.error(tr(e)); } };
  const matched = PRESETS.some(([h]) => h.toLowerCase() === s.seed.toLowerCase());
  const go = (id: string) => document.getElementById("sec-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const NAV: [string, string, LucideIcon][] = [["appearance", t("set.appearance"), Palette], ["downloads", t("set.downloads"), Download], ["network", t("set.network"), Globe], ["window", t("set.window"), AppWindow], ["tools", t("set.tools"), Wrench]];

  const windowOpts: { v: string; icon: LucideIcon; title: string; desc: string }[] = [
    { v: "remember", icon: MoveDiagonal2, title: t("win.remember"), desc: t("win.rememberDesc") },
    { v: "maximized", icon: Maximize, title: t("win.maximized"), desc: t("win.maximizedDesc") },
  ];

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="t-display flex items-center gap-3"><Gear className="h-9 w-9 text-primary" strokeWidth={2.2} />{t("set.title")}</h1><p className="t-body mt-1 text-on-surface-variant">{t("set.subtitle")}</p></div>
      </header>
      <nav className="sticky top-0 z-10 -mx-2 mb-4 flex gap-2 overflow-x-auto bg-surface-low/85 px-2 py-2 backdrop-blur-md" aria-label={t("set.title")}>
        {NAV.map(([id, label, I]) => (
          <button key={id} type="button" onClick={() => go(id)} onPointerDown={ripple} className={`state-layer inline-flex h-9 flex-none items-center gap-1.5 px-3.5 text-sm font-semibold transition-all duration-300 ease-spring hover:rounded-full active:scale-95 ${spy === id ? "rounded-full bg-primary text-on-primary" : "rounded-m3-sm bg-surface-container text-on-surface-variant"}`}><I className="h-4 w-4" />{label}</button>))}
      </nav>

      
      <Section id="sec-appearance" icon={Palette} title={t("set.appearance")}>
        <Row icon={SunMoon} title={t("set.mode")} desc={t("set.modeDesc")}>
          <Segmented<Mode> label={t("set.mode")} value={s.mode} onChange={(v) => set({ mode: v })} options={[{ value: "auto", label: t("mode.auto"), icon: Monitor }, { value: "light", label: t("mode.light"), icon: Sun }, { value: "dark", label: t("mode.dark"), icon: Moon }]} />
        </Row>
        <Row icon={Palette} title={t("set.color")} desc={t("set.colorDesc")} stacked>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t("set.color")}>
            {PRESETS.map(([h, key]) => { const on = h.toLowerCase() === s.seed.toLowerCase(); return (
              <button key={h} type="button" role="radio" aria-checked={on} aria-label={t("c." + key)} title={t("c." + key)} onClick={() => set({ seed: h })} style={{ background: h, color: onColor(h) }}
                className={`grid h-10 w-10 place-items-center transition-all duration-300 ease-spring hover:scale-110 active:scale-90 ${on ? "rounded-m3-sm shadow-[0_0_0_3px_rgb(var(--c-surface-container)),0_0_0_5px_rgb(var(--c-primary))]" : "rounded-full"}`}>
                <Check className={`h-5 w-5 transition-all duration-300 ease-spring ${on ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} strokeWidth={3} /></button>); })}
            <label title={t("set.custom")} style={!matched ? { background: s.seed, color: onColor(s.seed) } : undefined}
              className={`relative grid h-10 w-10 cursor-pointer place-items-center overflow-hidden transition-all duration-300 ease-spring hover:scale-110 ${matched ? "rounded-full text-white [background:conic-gradient(#f44336,#ffc107,#4caf50,#03a9f4,#9c27b0,#e91e63,#f44336)]" : "rounded-m3-sm shadow-[0_0_0_3px_rgb(var(--c-surface-container)),0_0_0_5px_rgb(var(--c-primary))]"}`}>
              {matched ? <Palette className="h-5 w-5 drop-shadow" /> : <Check className="h-5 w-5" strokeWidth={3} />}
              <input type="color" value={s.seed.toLowerCase()} onChange={(e) => set({ seed: e.target.value.toUpperCase() })} aria-label={t("set.custom")} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
          </div>
          <TextField label={t("set.hex")} value={hex} onChange={onHex} invalid={hexBad} maxLength={7} mono className="mt-3 max-w-[240px]" />
        </Row>
        <Row icon={Type} title={t("set.font")} desc={t("set.fontDesc")} stacked>
          <ChoiceChips label={t("set.font")} value={s.font} onChange={(v) => set({ font: v })} options={FONTS.map((f) => ({ value: f.id, label: f.id === "system" ? t("font.system") : f.name, font: f.stack }))} />
        </Row>
        <Row icon={ALargeSmall} title={t("set.fontSize")} desc={t("set.fontSizeDesc")}>
          <Segmented<FontSize> label={t("set.fontSize")} value={s.fontSize} onChange={(v) => set({ fontSize: v })} options={[{ value: "small", label: t("fs.small") }, { value: "medium", label: t("fs.medium") }, { value: "large", label: t("fs.large") }]} />
        </Row>
        <Row icon={Languages} title={t("set.lang")} desc={t("set.langDesc")}>
          <Segmented label={t("set.lang")} value={s.lang} onChange={(v) => set({ lang: v })} options={[{ value: "auto", label: t("lang.auto") }, { value: "en", label: t("lang.en") }, { value: "vi", label: t("lang.vi") }]} />
        </Row>
      </Section>

      <Section id="sec-downloads" icon={Download} title={t("set.downloads")}>
        <Row icon={AudioWaveform} title={t("set.quality")} desc={t("set.qualityDesc")} stacked>
          <ChoiceChips<Quality> label={t("set.quality")} value={s.quality} onChange={(v) => set({ quality: v })} options={(["best", "320", "256", "192", "128"] as Quality[]).map((q) => ({ value: q, label: q === "best" ? t("q.best") : q + " kbps" }))} />
        </Row>
        <Row icon={FolderOpen} title={t("set.folder")} desc={<span className="selectable block max-w-[360px] truncate" dir="rtl" style={{ textAlign: "left" }}>{"\u200E" + s.outDir}</span>}>
          <Button variant="tonal" icon={FolderPen} onClick={pickDir}>{t("set.change")}</Button>
          <Button variant="text" icon={SquareArrowOutUpRight} onClick={() => invoke("open_folder", { path: s.outDir }).catch((e) => toast.error(tr(e)))}>{t("set.open")}</Button>
        </Row>
        <Row icon={FileText} title={t("set.naming")} desc={t("set.namingDesc")}>
          <Select<NameTpl> label={t("set.naming")} value={s.nameTpl} onChange={(v) => set({ nameTpl: v })} options={(["artist-title", "title", "title-artist", "artist-album-title"] as NameTpl[]).map((v) => ({ value: v, label: t("tpl." + v) }))} />
        </Row>
        <Row icon={Layers} title={t("set.artistFolder")} desc={t("set.artistFolderDesc")}><Switch checked={s.artistFolder} onChange={(v) => set({ artistFolder: v })} label={t("set.artistFolder")} /></Row>
        <Row icon={Copy} title={t("set.dup")}>
          <Select<DupPolicy> label={t("set.dup")} value={s.dup} onChange={(v) => set({ dup: v })} options={(["rename", "skip", "overwrite"] as DupPolicy[]).map((v) => ({ value: v, label: t("dup." + v) }))} />
        </Row>
        <Row icon={Layers} title={t("set.parallel")} desc={t("set.parallelDesc")}>
          <Select label={t("set.parallel")} value={String(s.parallel)} onChange={(v) => set({ parallel: Number(v) })} options={["1", "2", "3", "4"].map((v) => ({ value: v, label: v }))} className="!min-w-[120px]" />
        </Row>
        <Row icon={Gauge} title={t("set.speed")}>
          <Select label={t("set.speed")} value={s.speed} onChange={(v) => set({ speed: v })} options={[{ value: "", label: t("speed.none") }, ...["500K", "1M", "2M", "5M"].map((v) => ({ value: v, label: v + "B/s" }))]} />
        </Row>
        <Row icon={Crop} title={t("set.crop")} desc={t("set.cropDesc")}><Switch checked={s.crop} onChange={(v) => set({ crop: v })} label={t("set.crop")} /></Row>
        <Row icon={ClipboardPaste} title={t("set.clipWatch")} desc={t("set.clipWatchDesc")}><Switch checked={s.clipWatch} onChange={(v) => set({ clipWatch: v })} label={t("set.clipWatch")} /></Row>
        <Row icon={s.notify ? BellRing : Bell} title={t("set.notify")} desc={t("set.notifyDesc")}><Switch checked={s.notify} onChange={(v) => set({ notify: v })} label={t("set.notify")} /></Row>
      </Section>

      <Section id="sec-network" icon={Globe} title={t("set.network")}>
        <Row icon={CookieIcon} title={t("set.cookies")} desc={t("set.cookiesDesc")}>
          <Select label={t("set.cookies")} value={s.cookies} onChange={(v) => set({ cookies: v })} options={[{ value: "", label: t("ck.none") }, ...["chrome", "edge", "firefox", "brave", "opera"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))]} />
        </Row>
        <Row icon={Globe} title={t("set.proxy")} desc={t("set.proxyDesc")}>
          <TextField label="http://host:port" value={s.proxy} onChange={(v) => set({ proxy: v.trim() })} className="w-[260px] max-sm:w-full" />
        </Row>
      </Section>

      <Section id="sec-window" icon={AppWindow} title={t("set.window")}>
        <Row icon={PanelTop} title={t("set.startup")} desc={t("set.startupDesc")} stacked>
          <div role="radiogroup" aria-label={t("set.startup")} className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {windowOpts.map((o) => { const on = winMode === o.v; return (
              <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => setWin(o.v)} onPointerDown={ripple}
                className={`state-layer flex items-center gap-3 border p-4 text-left transition-all duration-300 ease-spring active:scale-[.98] ${on ? "rounded-m3-lg border-primary bg-primary/10" : "rounded-m3-md border-outline-variant"}`}>
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-secondary-container text-on-secondary-container"><o.icon className="h-5 w-5" /></span>
                <span className="flex min-w-0 flex-1 flex-col"><span className="t-title">{o.title}</span><span className="t-small text-on-surface-variant">{o.desc}</span></span>
                <span className={`grid h-5 w-5 flex-none place-items-center rounded-full border-2 transition-colors ${on ? "border-primary" : "border-outline"}`}><span className={`h-2.5 w-2.5 rounded-full bg-primary transition-transform duration-300 ease-spring ${on ? "scale-100" : "scale-0"}`} /></span>
              </button>); })}
          </div>
        </Row>
      </Section>

      <Section id="sec-tools" icon={Wrench} title={t("set.tools")}>
        <p className="t-small px-5 pt-4 text-on-surface-variant">{t("set.toolsDesc")}</p>
        <ToolRow id="ytdlp" icon={CloudDownload} name="yt-dlp" />
        <ToolRow id="ffmpeg" icon={Film} name="ffmpeg" />
        <ToolRow id="deno" icon={Terminal} name={<>Deno <span className="ml-1 rounded-m3-sm bg-tertiary-container px-2 py-0.5 align-middle text-[11px] font-bold text-on-tertiary-container">{t("tool.recommended")}</span></>} hint={t(IS_WINDOWS ? "tool.denoHint" : "tool.denoHintOther")} />
        <Row icon={RefreshCw} title={t("set.updates")} desc={t("set.updatesDesc")}>
          <Button variant="tonal" icon={RefreshCw} disabled={checking} onClick={() => checkYtdlpUpdate(true)}>{checking ? t("tool.checkingNow") : t("b.check")}</Button>
          <Switch checked={s.checkUpdates} onChange={(v) => set({ checkUpdates: v })} label={t("set.updates")} />
        </Row>
      </Section>

      <div className="mb-3 overflow-hidden rounded-m3-xl bg-surface-container">
        <Row icon={RotateCcw} title={t("set.reset")} desc={t("set.resetDesc")}><Button variant="errorTonal" icon={RotateCcw} onClick={() => setConfirmReset(true)}>{t("b.reset")}</Button></Row>
      </div>
      <p className="t-small px-3 text-on-surface-variant">{t("set.footnote")}</p>
      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} destructive icon={RotateCcw} title={t("cf.reset.t")} body={t("cf.reset.b")} confirmLabel={t("b.reset")} confirmIcon={RotateCcw}
        onConfirm={() => { reset(); toast.success(t("toast.reset")); }} />
      
    </div>
  );
}
