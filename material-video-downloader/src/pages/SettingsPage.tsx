import { useEffect, useState, type ReactNode } from "react";
import {
  Check, ClipboardList, Copy, Download, FolderOpen, Globe, Languages, Loader2, Maximize2, Monitor, Moon, MonitorSmartphone, Palette, Plug, RefreshCw, Settings as Gear, Sun, Wrench, PictureInPicture2,
} from "lucide-react";
import { Button, cx, Segmented, Select, ShapeBadge, Slider, Switch } from "../components/ui";
import { api } from "../lib/api";
import { useT } from "../lib/hooks";
import type { TKey } from "../lib/i18n";
import type { EngineStatus } from "../lib/types";
import { SWATCHES } from "../lib/theme";
import { useSettings } from "../store/settings";
import { useUi } from "../store/ui";

type Section = "appearance" | "language" | "window" | "downloads" | "engine" | "extension";

const SECTIONS: { id: Section; key: TKey; icon: ReactNode }[] = [
  { id: "appearance", key: "setAppearance", icon: <Palette size={20} /> },
  { id: "language", key: "setLanguage", icon: <Languages size={20} /> },
  { id: "window", key: "setWindow", icon: <PictureInPicture2 size={20} /> },
  { id: "downloads", key: "setDownloads", icon: <Download size={20} /> },
  { id: "engine", key: "setEngine", icon: <Wrench size={20} /> },
  { id: "extension", key: "setExtension", icon: <Plug size={20} /> },
];

export function SettingsPage() {
  const { t } = useT();
  const [section, setSection] = useState<Section>("appearance");

  return (
    <div className="anim-page flex h-full min-h-0 flex-col md:flex-row">
      <aside className="shrink-0 border-b border-outline-variant/50 md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center gap-3 px-5 pt-5 pb-2 md:pb-4">
          <ShapeBadge shape="cookie" size={48}>
            <Gear size={22} />
          </ShapeBadge>
          <h1 className="text-[1.75rem] font-semibold tracking-tight">{t("settingsTitle")}</h1>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0" aria-label={t("settingsTitle")}>
          {SECTIONS.map((s) => {
            const active = s.id === section;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "ripple-host flex h-14 shrink-0 items-center gap-3 px-5 text-sm font-semibold transition-all duration-500 ease-spring active:scale-[0.97]",
                  active ? "rounded-full bg-secondary-container text-on-secondary-container" : "rounded-2xl text-on-surface-variant hover:rounded-full hover:bg-on-surface/6",
                )}
              >
                {s.icon}
                <span className="whitespace-nowrap">{t(s.key)}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div key={section} className="anim-page mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5 sm:px-8 sm:py-8">
          {section === "appearance" && <Appearance />}
          {section === "language" && <Language />}
          {section === "window" && <WindowSection />}
          {section === "downloads" && <Downloads />}
          {section === "engine" && <Engine />}
          {section === "extension" && <Extension />}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- building blocks */

function Card({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-[32px] bg-surface-low p-6 transition-[border-radius] duration-500 ease-spring hover:rounded-[40px]">
      {title && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-on-surface">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-on-surface-variant">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function Row({ title, hint, children, stack }: { title: string; hint?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={cx("flex gap-4 py-3 first:pt-0 last:pb-0", stack ? "flex-col" : "items-center justify-between")}>
      <div className="min-w-0 flex-1">
        <p className="text-[0.95rem] text-on-surface">{title}</p>
        {hint && <p className="mt-0.5 text-sm text-on-surface-variant">{hint}</p>}
      </div>
      <div className={cx("shrink-0", stack && "w-full")}>{children}</div>
    </div>
  );
}

const Divider = () => <div className="h-px bg-outline-variant/50" />;

/* --------------------------------------------------------------------- sections */

function Appearance() {
  const { t, lang } = useT();
  const { ui, setUi } = useSettings();
  const isCustom = !SWATCHES.some((s) => s.hex.toLowerCase() === ui.seed.toLowerCase());

  return (
    <>
      <Card title={t("themeMode")}>
        <Segmented
          className="w-full"
          value={ui.themeMode}
          onChange={(v, e) => setUi({ themeMode: v }, { x: e.clientX, y: e.clientY })}
          options={[
            { value: "system", label: t("themeSystem"), icon: <MonitorSmartphone size={16} /> },
            { value: "light", label: t("themeLight"), icon: <Sun size={16} /> },
            { value: "dark", label: t("themeDark"), icon: <Moon size={16} /> },
          ]}
        />
      </Card>

      <Card title={t("themeColor")} hint={t("themeColorHint")}>
        <div className="grid grid-cols-6 gap-3 sm:grid-cols-9">
          {SWATCHES.map((s) => {
            const active = s.hex.toLowerCase() === ui.seed.toLowerCase();
            return (
              <button
                key={s.id}
                onClick={() => setUi({ seed: s.hex })}
                title={s.name[lang]}
                aria-label={s.name[lang]}
                aria-pressed={active}
                className={cx(
                  "relative flex aspect-square items-center justify-center rounded-full transition-all duration-300 ease-spring hover:scale-110 active:scale-95",
                  active && "scale-105 ring-2 ring-offset-2 ring-offset-surface-low",
                )}
                style={{ background: s.hex, ["--tw-ring-color" as string]: s.hex }}
              >
                {active && <Check size={18} strokeWidth={3} className="anim-pop text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" />}
              </button>
            );
          })}
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-container px-4 py-3">
          <span
            className={cx("relative size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-outline-variant", isCustom && "ring-2 ring-primary")}
            style={{ background: isCustom ? ui.seed : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
          >
            <input type="color" value={ui.seed} onChange={(e) => setUi({ seed: e.target.value })} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={t("themeCustom")} />
          </span>
          <span className="flex-1 text-sm text-on-surface">{t("themeCustom")}</span>
          <span className="font-mono text-xs text-on-surface-variant uppercase">{ui.seed}</span>
        </label>
      </Card>

      <Card title={t("fontSize")}>
        <Segmented
          className="w-full"
          value={ui.fontSize}
          onChange={(v) => setUi({ fontSize: v })}
          options={[
            { value: "sm", label: t("fontSm") },
            { value: "md", label: t("fontMd") },
            { value: "lg", label: t("fontLg") },
          ]}
        />
        <p className="mt-4 rounded-2xl bg-surface-container px-4 py-3 text-on-surface-variant">{t("fontPreview")}</p>
      </Card>
    </>
  );
}

function Language() {
  const { t } = useT();
  const { ui, setUi } = useSettings();
  return (
    <Card title={t("languageLabel")}>
      <Segmented
        className="w-full"
        value={ui.language}
        onChange={(v) => setUi({ language: v })}
        options={[
          { value: "system", label: t("langSystem"), icon: <Globe size={16} /> },
          { value: "en", label: t("langEn") },
          { value: "vi", label: t("langVi") },
        ]}
      />
    </Card>
  );
}

function WindowSection() {
  const { t } = useT();
  const { core, setCore } = useSettings();
  const options: { value: "remember" | "maximized"; title: TKey; hint: TKey; icon: ReactNode }[] = [
    { value: "remember", title: "windowRemember", hint: "windowRememberHint", icon: <Monitor size={22} /> },
    { value: "maximized", title: "windowMaximized", hint: "windowMaximizedHint", icon: <Maximize2 size={22} /> },
  ];
  return (
    <Card title={t("windowStartup")} hint={t("windowNote")}>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
        {options.map((o) => {
          const active = core.windowMode === o.value;
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={active}
              onClick={() => setCore({ windowMode: o.value })}
              className={cx(
                "ripple-host relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ease-emphasized active:scale-[0.98]",
                active ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant hover:bg-on-surface/6",
              )}
            >
              <span className={cx("flex size-10 items-center justify-center rounded-full", active ? "bg-primary text-on-primary" : "bg-surface-highest text-on-surface-variant")}>{o.icon}</span>
              <span>
                <span className="block text-[0.95rem] font-medium">{t(o.title)}</span>
                <span className={cx("mt-0.5 block text-sm", active ? "opacity-80" : "text-on-surface-variant")}>{t(o.hint)}</span>
              </span>
              {active && <Check size={18} className="anim-pop absolute top-4 right-4" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Downloads() {
  const { t } = useT();
  const { core, setCore, defaultDir } = useSettings();
  const folder = core.downloadDir || defaultDir;
  const browsers = ["none", "chrome", "edge", "firefox", "brave", "opera", "vivaldi", "safari"];

  const pick = async () => {
    const picked = await api.pickFolder();
    if (picked) setCore({ downloadDir: picked });
  };

  return (
    <>
      <Card>
        <Row title={t("dlFolder")} hint={folder} stack>
          <div className="flex flex-wrap gap-2">
            <Button variant="tonal" icon={<FolderOpen size={18} />} onClick={pick}>{t("dlFolderBrowse")}</Button>
            <Button variant="text" onClick={() => api.openFolder(core.downloadDir || undefined)}>{t("dlFolderOpen")}</Button>
            {core.downloadDir && <Button variant="text" onClick={() => setCore({ downloadDir: "" })}>{t("dlFolderDefault")}</Button>}
          </div>
        </Row>
      </Card>

      <Card>
        <Row title={t("dlConcurrent")} stack>
          <div className="flex items-center gap-4">
            <Slider label={t("dlConcurrent")} min={1} max={10} value={core.maxConcurrent} onChange={(v) => setCore({ maxConcurrent: v })} />
            <span className="w-8 text-right text-sm font-medium tabular-nums">{core.maxConcurrent}</span>
          </div>
        </Row>
        <Divider />
        <Row title={t("dlConnections")} hint={t("dlConnectionsHint")} stack>
          <div className="flex items-center gap-4">
            <Slider label={t("dlConnections")} min={1} max={16} value={core.connections} onChange={(v) => setCore({ connections: v })} />
            <span className="w-8 text-right text-sm font-medium tabular-nums">{core.connections}</span>
          </div>
        </Row>
        <Divider />
        <Row title={t("dlSpeedLimit")} stack>
          <div className="flex items-center gap-4">
            <Slider label={t("dlSpeedLimit")} min={0} max={100} step={1} value={core.speedLimitKb === 0 ? 0 : Math.round(core.speedLimitKb / 512)} onChange={(v) => setCore({ speedLimitKb: v === 0 ? 0 : v * 512 })} />
            <span className="w-24 text-right text-sm font-medium tabular-nums">
              {core.speedLimitKb === 0 ? t("dlSpeedUnlimited") : `${(core.speedLimitKb / 1024).toFixed(1)} MB/s`}
            </span>
          </div>
        </Row>
      </Card>

      <Card>
        <Row title={t("dlAutoStart")}>
          <Switch label={t("dlAutoStart")} checked={core.autoStart} onChange={(v) => setCore({ autoStart: v })} />
        </Row>
        <Divider />
        <Row title={t("dlAskQuality")} hint={t("dlAskQualityHint")}>
          <Switch label={t("dlAskQuality")} checked={core.askQuality} onChange={(v) => setCore({ askQuality: v })} />
        </Row>
        <Divider />
        <Row title={t("dlClipboard")} hint={t("dlClipboardHint")}>
          <Switch label={t("dlClipboard")} checked={core.clipboardWatch} onChange={(v) => setCore({ clipboardWatch: v })} />
        </Row>
        <Divider />
        <Row title={t("dlNotify")} hint={t("dlNotifyHint")}>
          <Switch label={t("dlNotify")} checked={core.notifications} onChange={(v) => setCore({ notifications: v })} />
        </Row>
      </Card>

      <Card>
        <Row title={t("dlCookies")} hint={t("dlCookiesHint")}>
          <Select
            label={t("dlCookies")}
            value={core.cookiesBrowser}
            onChange={(v) => setCore({ cookiesBrowser: v })}
            options={browsers.map((b) => ({ value: b, label: b === "none" ? t("cookiesNone") : b[0].toUpperCase() + b.slice(1) }))}
          />
        </Row>
      </Card>
    </>
  );
}

function Engine() {
  const { t } = useT();
  const toast = useUi((s) => s.toast);
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [busy, setBusy] = useState<"yt-dlp" | "ffmpeg" | null>(null);
  const [pct, setPct] = useState(0);

  const refresh = () => api.engineStatus().then(setStatus).catch(() => undefined);
  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    let off: (() => void) | undefined;
    void api.onEngineProgress((p) => setPct(p.total ? Math.round((p.downloaded / p.total) * 100) : 0)).then((u) => (off = u));
    return () => off?.();
  }, []);

  const install = async (name: "yt-dlp" | "ffmpeg") => {
    setBusy(name);
    setPct(0);
    try {
      setStatus(name === "yt-dlp" ? await api.installYtdlp() : await api.installFfmpeg());
      toast(name === "yt-dlp" ? t("engineInstalled") : t("engineFound"));
    } catch (e) {
      toast(String(e), { tone: "error", ms: 8000 });
    } finally {
      setBusy(null);
    }
  };

  const tool = (
    name: "yt-dlp" | "ffmpeg",
    title: string,
    hint: string,
    info: EngineStatus["ytdlp"] | undefined,
    canInstall: boolean,
    manualHint?: string,
  ) => (
    <div className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <ShapeBadge shape={info?.found ? "cookie" : "gem"} size={52} tone={info?.found ? "primary" : "secondary"}>
        <Wrench size={20} />
      </ShapeBadge>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.95rem] font-medium">{title}</p>
          <span className={cx("rounded-md px-2 py-0.5 text-xs font-medium", info?.found ? "bg-primary-container text-on-primary-container" : "bg-error-container text-on-error-container")}>
            {info?.found ? t("engineFound") : t("engineNotFound")}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-on-surface-variant">{info?.found && info.version ? t("engineVersion", { v: info.version }) : hint}</p>
        {!canInstall && !info?.found && manualHint && <p className="mt-0.5 text-xs text-on-surface-variant">{manualHint}</p>}
      </div>
      {canInstall && (
        <Button
          variant={info?.found ? "text" : "tonal"}
          disabled={busy !== null}
          icon={busy === name ? <Loader2 size={17} className="animate-spin" /> : undefined}
          onClick={() => install(name)}
        >
          {busy === name ? t("engineDownloading", { pct }) : info?.found ? t("engineUpdate") : t("engineInstallBtn")}
        </Button>
      )}
    </div>
  );

  return (
    <Card>
      {tool("yt-dlp", t("engineYtdlp"), t("engineYtdlpHint"), status?.ytdlp, true)}
      <Divider />
      {tool("ffmpeg", t("engineFfmpeg"), t("engineFfmpegHint"), status?.ffmpeg, !!status?.canInstallFfmpeg, t("engineFfmpegManual"))}
      <div className="mt-4">
        <Button variant="text" icon={<RefreshCw size={17} />} onClick={refresh}>{t("engineRefresh")}</Button>
      </div>
    </Card>
  );
}

function Extension() {
  const { t } = useT();
  const toast = useUi((s) => s.toast);
  const { core, setCore } = useSettings();
  const [info, setInfo] = useState<{ port: number; running: boolean } | null>(null);
  useEffect(() => {
    void api.serverInfo().then(setInfo);
  }, []);

  const steps = [t("extStep1"), t("extStep2"), t("extStep3")];

  return (
    <>
      <Card>
        <Row title={t("extEnable")} hint={t("extEnableHint")}>
          <Switch label={t("extEnable")} checked={core.extensionServer} onChange={(v) => setCore({ extensionServer: v })} />
        </Row>
        <Divider />
        <div className="flex items-center gap-3 pt-3">
          <span className="relative flex size-3">
            <span className={cx("absolute inline-flex size-full rounded-full opacity-60", info?.running && core.extensionServer ? "animate-ping bg-primary" : "bg-error")} />
            <span className={cx("relative inline-flex size-3 rounded-full", info?.running && core.extensionServer ? "bg-primary" : "bg-error")} />
          </span>
          <p className="min-w-0 flex-1 text-sm text-on-surface">
            {info?.running ? t("extRunning", { port: info.port }) : t("extStopped")}
          </p>
          {info?.running && (
            <Button
              variant="text"
              icon={<Copy size={16} />}
              onClick={() => api.writeClipboard(`http://127.0.0.1:${info.port}`).then(() => toast(t("linkCopied")))}
            >
              {t("extCopyPort")}
            </Button>
          )}
        </div>
      </Card>

      <Card title={t("extHowTitle")}>
        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <ShapeBadge shape="flower" size={34} tone="secondary"><span className="text-sm font-bold">{i + 1}</span></ShapeBadge>
              <span className="pt-0.5 text-sm leading-relaxed text-on-surface">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant">
          <ClipboardList size={14} /> chrome://extensions
        </p>
      </Card>
    </>
  );
}
