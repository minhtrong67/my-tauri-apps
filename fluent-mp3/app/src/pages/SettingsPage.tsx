import { useEffect, useState, type ReactNode } from "react";
import {
  AlertOn20Regular, Alert20Regular, ArrowCounterclockwise20Regular, ArrowDownload20Regular, ArrowSync20Regular, Checkmark16Filled, ClipboardPaste20Regular, CloudArrowDown20Regular, Collections20Regular,
  Color20Regular, Copy20Regular, Crop20Regular, Folder20Regular, FullScreenMaximize20Regular, Gauge20Regular, Globe20Regular, Layer20Regular, Library20Regular, LocalLanguage20Regular,
  Open20Regular, Person20Regular, Rename20Regular, ScaleFit20Regular, ShieldCheckmark20Regular, Speaker220Regular, TextFont20Regular, TextFontSize20Regular, Video20Regular, WeatherMoon20Regular,
  Window20Regular, WindowConsole20Regular, Wrench20Regular, type FluentIcon,
} from "@fluentui/react-icons";
import { open as pickFolder } from "@tauri-apps/plugin-dialog";
import { toast, useSettings, useTools, type DupPolicy, type NameTpl, type Quality } from "../lib/stores";
import { FONTS, PRESETS, onColor, useDark, type FontSize, type Mode } from "../lib/theme";
import { EFFECTS, DEFAULT_EFFECT, useFx, type Effect } from "../lib/effect";
import { IS_WINDOWS, invoke } from "../lib/tauri";
import { checkYtdlpUpdate, installTools, useToolState, type ToolId } from "../lib/tools";
import { useI18n } from "../lib/i18n";
import { Button } from "../components/ui/Button";
import { PageHeader, Segmented, Switch, Tag, TextField } from "../components/ui/Controls";
import { Select } from "../components/ui/Select";
import { ConfirmDialog } from "../components/ui/Overlay";
import { InfoBar } from "../components/ui/InfoBar";
import { ProgressBar } from "../components/ui/Progress";

/** Nhóm cài đặt: tiêu đề + các thẻ xếp sát nhau (kiểu trang Settings của Windows 11). */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-7 scroll-mt-16">
      <h2 className="mb-2 px-1 text-body font-semibold">{title}</h2>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}
function Row({ icon: Icon, title, desc, children, stacked }: { icon: FluentIcon; title: ReactNode; desc?: ReactNode; children?: ReactNode; stacked?: boolean }) {
  return (
    <div className={`flex gap-4 rounded-ctl border border-card-line bg-card px-4 py-3.5 ${stacked ? "flex-col" : "min-h-[64px] flex-wrap items-center"}`}>
      <div className="flex min-w-[220px] flex-1 items-center gap-4">
        <Icon className="h-5 w-5 flex-none" />
        <div className="min-w-0"><div className="text-body">{title}</div>{desc && <div className="text-cap text-fg-2">{desc}</div>}</div>
      </div>
      {children && <div className={stacked ? "pl-9" : "flex flex-none items-center gap-3"}>{children}</div>}
    </div>
  );
}

function ToolRow({ id, icon, name, hint }: { id: ToolId; icon: FluentIcon; name: ReactNode; hint?: string }) {
  const { t } = useI18n();
  const tools = useTools((s) => s.tools);
  const { installing, progress, outdated } = useToolState();
  const ver = tools ? tools[id] : undefined;
  const ok = tools != null && ver != null;
  const p = progress[id];
  const Icon = ok ? ShieldCheckmark20Regular : icon;
  return (
    <div className="rounded-ctl border border-card-line bg-card px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-4">
        <Icon className={`h-5 w-5 flex-none ${ok ? "text-ok" : ""}`} />
        <div className="min-w-[160px] flex-1"><div className="text-body">{name}</div>
          <div className={`text-cap ${ok ? "text-ok" : "text-fg-2"}`}>{!tools ? t("tool.checking") : ok ? (ver ? t("tool.installed", { v: ver }) : t("tool.installedNoVer")) : (hint ?? t("tool.missing"))}{id === "ytdlp" && outdated ? ` · → ${outdated.latest}` : ""}</div></div>
        {tools && (!ok || id === "ytdlp") && <Button variant={ok ? "standard" : "accent"} icon={ok ? ArrowSync20Regular : ArrowDownload20Regular} disabled={installing} onClick={() => installTools([id])}>{ok ? t("tool.update") : t("tool.install")}</Button>}
      </div>
      {p != null && <div className="mt-3 pl-9"><ProgressBar value={p} indeterminate={p >= 100} /></div>}
    </div>
  );
}

/** Ô xem trước chất liệu: hình nền + cửa sổ giả lập phủ chất liệu tương ứng. */
function FxPreview({ kind, dark }: { kind: Effect; dark: boolean }) {
  const base = {
    mica: dark ? "rgba(32,32,32,.9)" : "rgba(243,243,243,.9)",
    acrylic: dark ? "rgba(44,44,44,.5)" : "rgba(252,252,252,.5)",
    tabbed: dark ? "rgba(14,14,16,.94)" : "rgba(228,231,240,.94)",
  }[kind];
  const layer = dark ? (kind === "tabbed" ? "rgba(255,255,255,.05)" : "rgba(58,58,58,.35)") : "rgba(255,255,255,.65)";
  return (
    <div className="relative h-[72px] overflow-hidden rounded-ctl" style={{ background: "linear-gradient(120deg,#2b6fd6 0%,#8b4fc8 55%,#f08a5d 100%)" }} aria-hidden>
      <span className="absolute -left-3 top-1 h-10 w-14 rounded-full bg-[#ffd166]/80 blur-md" />
      <span className="absolute bottom-0 right-3 h-9 w-16 rounded-full bg-[#06d6a0]/70 blur-md" />
      <div className="absolute inset-1.5 flex overflow-hidden rounded-[5px] ring-1 ring-black/10" style={{ background: base, backdropFilter: kind === "acrylic" ? "blur(10px) saturate(1.4)" : "blur(24px)" }}>
        <div className="flex w-4 flex-col items-center gap-1 pt-2"><span className="h-1 w-2 rounded-full bg-acc" /><span className="h-1 w-2 rounded-full" style={{ background: dark ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.25)" }} /></div>
        <div className="mt-1.5 flex-1 rounded-tl-[4px] border-l border-t p-1.5" style={{ background: layer, borderColor: dark ? "rgba(0,0,0,.25)" : "rgba(0,0,0,.08)" }}>
          <span className="block h-1.5 w-1/2 rounded-full bg-acc" /><span className="mt-1 block h-1 w-3/4 rounded-full" style={{ background: dark ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.15)" }} />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t, tr } = useI18n();
  const { s, set, reset } = useSettings();
  const dark = useDark(s.mode);
  const fx = useFx();
  const checking = useToolState((x) => x.checking);
  const [hex, setHex] = useState(s.seed);
  const [hexBad, setHexBad] = useState(false);
  const [winMode, setWinMode] = useState("remember");
  const [confirmReset, setConfirmReset] = useState(false);
  const [spy, setSpy] = useState("appearance");
  // Scrollspy: tab của mục đang xem được gạch chân
  useEffect(() => {
    const ids = ["appearance", "downloads", "network", "window", "tools"];
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setSpy(v.target.id.replace("sec-", "")); }, { rootMargin: "-70px 0px -60% 0px" });
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
  const NAV: [string, string][] = [["appearance", t("set.appearance")], ["downloads", t("set.downloads")], ["network", t("set.network")], ["window", t("set.window")], ["tools", t("set.tools")]];
  const windowOpts: { v: string; icon: FluentIcon; title: string; desc: string }[] = [
    { v: "remember", icon: ScaleFit20Regular, title: t("win.remember"), desc: t("win.rememberDesc") },
    { v: "maximized", icon: FullScreenMaximize20Regular, title: t("win.maximized"), desc: t("win.maximizedDesc") },
  ];
  const fxName = (e: Effect) => t("fx." + e);

  return (
    <div>
      <PageHeader title={t("set.title")} subtitle={t("set.subtitle")} />
      <nav style={{ background: "linear-gradient(var(--layer),var(--layer)), var(--solid)" }} className="sticky top-0 z-10 -mx-3 mb-4 mt-3 flex gap-1 overflow-x-auto px-3 py-1.5" aria-label={t("set.title")}>
        {NAV.map(([id, label]) => (
          <button key={id} type="button" onClick={() => go(id)} aria-current={spy === id}
            className={`relative h-8 flex-none rounded-ctl px-3 text-body transition-colors hover:bg-hov active:bg-prs ${spy === id ? "font-semibold text-fg" : "text-fg-2"}`}>
            {label}{spy === id && <span className="absolute bottom-0 left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full bg-acc" />}
          </button>))}
      </nav>

      <Section id="sec-appearance" title={t("set.appearance")}>
        <Row icon={WeatherMoon20Regular} title={t("set.mode")} desc={t("set.modeDesc")}>
          <Segmented<Mode> label={t("set.mode")} value={s.mode} onChange={(v) => set({ mode: v })} options={[{ value: "auto", label: t("mode.auto") }, { value: "light", label: t("mode.light") }, { value: "dark", label: t("mode.dark") }]} />
        </Row>

        <Row icon={Layer20Regular} title={t("set.material")} desc={t("set.materialDesc")} stacked>
          <div role="radiogroup" aria-label={t("set.material")} className="grid grid-cols-3 gap-3">
            {EFFECTS.map((e) => { const on = s.effect === e; return (
              <button key={e} type="button" role="radio" aria-checked={on} onClick={() => set({ effect: e })}
                className={`flex flex-col gap-2 rounded-ctl border-2 p-2 text-left transition-colors ${on ? "border-acc bg-acc/10" : "border-transparent bg-ctl hover:bg-ctl-h"}`}>
                <FxPreview kind={e} dark={dark} />
                <span className="flex items-center gap-2 px-1">
                  <span className={`grid h-4 w-4 flex-none place-items-center rounded-full border ${on ? "border-acc" : "border-strong"}`}><span className={`h-2 w-2 rounded-full bg-acc transition-transform duration-150 ${on ? "scale-100" : "scale-0"}`} /></span>
                  <span className="text-body font-semibold">{fxName(e)}</span>
                  {e === DEFAULT_EFFECT && <Tag>{t("fx.default")}</Tag>}
                </span>
                <span className="px-1 pb-0.5 text-cap text-fg-2">{t("fx." + e + "Desc")}</span>
              </button>); })}
          </div>
          <p className="mt-2 text-cap text-fg-3">{t("fx.note")}</p>
          {fx.checked && !fx.active && <InfoBar severity="warning" className="mt-3">{t("fx.unsupported")}</InfoBar>}
        </Row>

        <Row icon={Color20Regular} title={t("set.color")} desc={t("set.colorDesc")} stacked>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("set.color")}>
            {PRESETS.map(([h, key]) => { const on = h.toLowerCase() === s.seed.toLowerCase(); return (
              <button key={h} type="button" role="radio" aria-checked={on} aria-label={t("c." + key)} title={t("c." + key)} onClick={() => set({ seed: h })} style={{ background: h, color: onColor(h) }}
                className={`grid h-8 w-8 place-items-center rounded-ctl transition-transform duration-100 hover:scale-105 active:scale-95 ${on ? "outline outline-2 outline-offset-2 outline-fg" : ""}`}>
                {on && <Checkmark16Filled />}</button>); })}
            <label title={t("set.custom")} style={!matched ? { background: s.seed, color: onColor(s.seed) } : undefined}
              className={`relative grid h-8 w-8 cursor-pointer place-items-center overflow-hidden rounded-ctl transition-transform duration-100 hover:scale-105 ${matched ? "text-white [background:conic-gradient(#e81123,#ffb900,#10893e,#0078d4,#881798,#ea005e,#e81123)]" : "outline outline-2 outline-offset-2 outline-fg"}`}>
              {matched ? <Color20Regular className="drop-shadow" /> : <Checkmark16Filled />}
              <input type="color" value={s.seed.toLowerCase()} onChange={(e) => set({ seed: e.target.value.toUpperCase() })} aria-label={t("set.custom")} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
          </div>
          <TextField header={t("set.hex")} label={t("set.hex")} placeholder="#0078D4" value={hex} onChange={onHex} invalid={hexBad} maxLength={7} mono className="mt-3 max-w-[240px]" />
        </Row>

        <Row icon={TextFont20Regular} title={t("set.font")} desc={t("set.fontDesc")}>
          <Segmented label={t("set.font")} value={s.font} onChange={(v) => set({ font: v })} options={FONTS.map((f) => ({ value: f.id, label: f.id === "system" ? t("font.system") : f.name, font: f.stack }))} />
        </Row>
        <Row icon={TextFontSize20Regular} title={t("set.fontSize")} desc={t("set.fontSizeDesc")}>
          <Segmented<FontSize> label={t("set.fontSize")} value={s.fontSize} onChange={(v) => set({ fontSize: v })} options={[{ value: "small", label: t("fs.small") }, { value: "medium", label: t("fs.medium") }, { value: "large", label: t("fs.large") }]} />
        </Row>
        <Row icon={LocalLanguage20Regular} title={t("set.lang")} desc={t("set.langDesc")}>
          <Segmented label={t("set.lang")} value={s.lang} onChange={(v) => set({ lang: v })} options={[{ value: "auto", label: t("lang.auto") }, { value: "en", label: t("lang.en") }, { value: "vi", label: t("lang.vi") }]} />
        </Row>
      </Section>

      <Section id="sec-downloads" title={t("set.downloads")}>
        <Row icon={Speaker220Regular} title={t("set.quality")} desc={t("set.qualityDesc")} stacked>
          <Segmented<Quality> label={t("set.quality")} value={s.quality} onChange={(v) => set({ quality: v })} options={(["best", "320", "256", "192", "128"] as Quality[]).map((q) => ({ value: q, label: q === "best" ? t("q.best") : q + " kbps" }))} />
        </Row>
        <Row icon={Folder20Regular} title={t("set.folder")} desc={<span className="selectable block max-w-[360px] truncate" dir="rtl" style={{ textAlign: "left" }}>{"\u200E" + s.outDir}</span>}>
          <Button onClick={pickDir}>{t("set.change")}</Button>
          <Button variant="subtle" icon={Open20Regular} onClick={() => invoke("open_folder", { path: s.outDir }).catch((e) => toast.error(tr(e)))}>{t("set.open")}</Button>
        </Row>
        <Row icon={Rename20Regular} title={t("set.naming")} desc={t("set.namingDesc")}>
          <Select<NameTpl> label={t("set.naming")} value={s.nameTpl} onChange={(v) => set({ nameTpl: v })} options={(["artist-title", "title", "title-artist", "artist-album-title"] as NameTpl[]).map((v) => ({ value: v, label: t("tpl." + v) }))} />
        </Row>
        <Row icon={Library20Regular} title={t("set.artistFolder")} desc={t("set.artistFolderDesc")}><Switch showLabel checked={s.artistFolder} onChange={(v) => set({ artistFolder: v })} label={t("set.artistFolder")} /></Row>
        <Row icon={Copy20Regular} title={t("set.dup")}>
          <Select<DupPolicy> label={t("set.dup")} value={s.dup} onChange={(v) => set({ dup: v })} options={(["rename", "skip", "overwrite"] as DupPolicy[]).map((v) => ({ value: v, label: t("dup." + v) }))} />
        </Row>
        <Row icon={Collections20Regular} title={t("set.parallel")} desc={t("set.parallelDesc")}>
          <Select label={t("set.parallel")} value={String(s.parallel)} onChange={(v) => set({ parallel: Number(v) })} options={["1", "2", "3", "4"].map((v) => ({ value: v, label: v }))} className="!min-w-[120px]" />
        </Row>
        <Row icon={Gauge20Regular} title={t("set.speed")}>
          <Select label={t("set.speed")} value={s.speed} onChange={(v) => set({ speed: v })} options={[{ value: "", label: t("speed.none") }, ...["500K", "1M", "2M", "5M"].map((v) => ({ value: v, label: v + "B/s" }))]} />
        </Row>
        <Row icon={Crop20Regular} title={t("set.crop")} desc={t("set.cropDesc")}><Switch showLabel checked={s.crop} onChange={(v) => set({ crop: v })} label={t("set.crop")} /></Row>
        <Row icon={ClipboardPaste20Regular} title={t("set.clipWatch")} desc={t("set.clipWatchDesc")}><Switch showLabel checked={s.clipWatch} onChange={(v) => set({ clipWatch: v })} label={t("set.clipWatch")} /></Row>
        <Row icon={s.notify ? AlertOn20Regular : Alert20Regular} title={t("set.notify")} desc={t("set.notifyDesc")}><Switch showLabel checked={s.notify} onChange={(v) => set({ notify: v })} label={t("set.notify")} /></Row>
      </Section>

      <Section id="sec-network" title={t("set.network")}>
        <Row icon={Person20Regular} title={t("set.cookies")} desc={t("set.cookiesDesc")}>
          <Select label={t("set.cookies")} value={s.cookies} onChange={(v) => set({ cookies: v })} options={[{ value: "", label: t("ck.none") }, ...["chrome", "edge", "firefox", "brave", "opera"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))]} />
        </Row>
        <Row icon={Globe20Regular} title={t("set.proxy")} desc={t("set.proxyDesc")}>
          <TextField label="http://host:port" value={s.proxy} onChange={(v) => set({ proxy: v.trim() })} className="w-[260px]" />
        </Row>
      </Section>

      <Section id="sec-window" title={t("set.window")}>
        <Row icon={Window20Regular} title={t("set.startup")} desc={t("set.startupDesc")} stacked>
          <div role="radiogroup" aria-label={t("set.startup")} className="grid grid-cols-2 gap-3">
            {windowOpts.map((o) => { const on = winMode === o.v; return (
              <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => setWin(o.v)}
                className={`flex items-center gap-3 rounded-ctl border-2 p-3 text-left transition-colors ${on ? "border-acc bg-acc/10" : "border-transparent bg-ctl hover:bg-ctl-h"}`}>
                <o.icon className="h-5 w-5 flex-none" />
                <span className="flex min-w-0 flex-1 flex-col"><span className="text-body font-semibold">{o.title}</span><span className="text-cap text-fg-2">{o.desc}</span></span>
                <span className={`grid h-4 w-4 flex-none place-items-center rounded-full border ${on ? "border-acc" : "border-strong"}`}><span className={`h-2 w-2 rounded-full bg-acc transition-transform duration-150 ${on ? "scale-100" : "scale-0"}`} /></span>
              </button>); })}
          </div>
        </Row>
      </Section>

      <Section id="sec-tools" title={t("set.tools")}>
        <p className="mb-1 px-1 text-cap text-fg-2">{t("set.toolsDesc")}</p>
        <ToolRow id="ytdlp" icon={CloudArrowDown20Regular} name="yt-dlp" />
        <ToolRow id="ffmpeg" icon={Video20Regular} name="ffmpeg" />
        <ToolRow id="deno" icon={WindowConsole20Regular} name={<span className="inline-flex items-center gap-2">Deno <Tag accent>{t("tool.recommended")}</Tag></span>} hint={t(IS_WINDOWS ? "tool.denoHint" : "tool.denoHintOther")} />
        <Row icon={Wrench20Regular} title={t("set.updates")} desc={t("set.updatesDesc")}>
          <Button icon={ArrowSync20Regular} disabled={checking} onClick={() => checkYtdlpUpdate(true)}>{checking ? t("tool.checkingNow") : t("b.check")}</Button>
          <Switch showLabel checked={s.checkUpdates} onChange={(v) => set({ checkUpdates: v })} label={t("set.updates")} />
        </Row>
      </Section>

      <div className="mb-3">
        <Row icon={ArrowCounterclockwise20Regular} title={t("set.reset")} desc={t("set.resetDesc")}><Button onClick={() => setConfirmReset(true)}>{t("b.reset")}</Button></Row>
      </div>
      <p className="px-1 text-cap text-fg-2">{t("set.footnote")}</p>
      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} destructive title={t("cf.reset.t")} body={t("cf.reset.b")} confirmLabel={t("b.reset")}
        onConfirm={() => { reset(); toast.success(t("toast.reset")); }} />
    </div>
  );
}
