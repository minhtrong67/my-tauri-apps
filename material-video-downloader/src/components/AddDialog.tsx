import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowLeft, Clipboard, Download as DownloadIcon, FolderOpen, Link2, Loader2, Music, Sparkles, Wrench, Check,
} from "lucide-react";
import { api } from "../lib/api";
import { extractUrls, formatBytes, formatClock } from "../lib/format";
import { useT } from "../lib/hooks";
import type { MediaInfo, QualityOption } from "../lib/types";
import { useSettings } from "../store/settings";
import { useUi } from "../store/ui";
import { Button, cx, Dialog, Loader, Switch } from "./ui";
import { Thumb } from "./Thumb";

type Phase = "input" | "loading" | "result" | "error" | "engine";

function buildRequest(info: MediaInfo, opt: QualityOption, filename: string, dir: string | null, start: boolean) {
  const ext = opt.audioOnly ? opt.audioFormat || "m4a" : null;
  const name = ext ? filename.replace(/\.[^.]+$/, "") + "." + ext : filename;
  return {
    url: info.url,
    kind: info.kind,
    title: name.replace(/\.[^.]+$/, ""),
    thumbnail: info.thumbnail,
    site: info.site,
    filename: name,
    size: opt.size ?? info.size,
    duration: info.duration,
    quality: opt.id === "best" || opt.id === "original" ? opt.id : opt.label,
    selector: opt.selector,
    audioOnly: opt.audioOnly,
    audioFormat: opt.audioFormat,
    referer: info.referer,
    userAgent: info.userAgent,
    cookie: info.cookie,
    dir,
    start,
  };
}

export function AddDialog() {
  const { t } = useT();
  const seed = useUi((s) => s.dialog);
  const close = useUi((s) => s.closeDialog);
  const toast = useUi((s) => s.toast);
  const { core, defaultDir } = useSettings();

  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [error, setError] = useState("");
  const [optId, setOptId] = useState("best");
  const [filename, setFilename] = useState("");
  const [dir, setDir] = useState<string | null>(null);
  const [startNow, setStartNow] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installPct, setInstallPct] = useState(0);
  const [batchBusy, setBatchBusy] = useState(false);
  const runId = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const urls = useMemo(() => extractUrls(text), [text]);
  const open = seed !== null;

  const analyze = useCallback(
    async (url: string, extra?: { title?: string; referer?: string; userAgent?: string; cookie?: string; thumbnail?: string }) => {
      const id = ++runId.current;
      setPhase("loading");
      setError("");
      try {
        const result = await api.analyze(url, extra);
        if (id !== runId.current) return;
        setInfo(result.thumbnail || !extra?.thumbnail ? result : { ...result, thumbnail: extra.thumbnail });
        setOptId(result.options[0]?.id ?? "best");
        setFilename(result.filename);
        setPhase("result");
      } catch (e) {
        if (id !== runId.current) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "ENGINE_MISSING") {
          setPhase("engine");
          void install(url);
        }
        else {
          setError(msg);
          setPhase("error");
        }
      }
    },
    [],
  );

  // (Re)initialise whenever the dialog opens.
  useEffect(() => {
    if (!seed) return;
    runId.current++;
    setInfo(null);
    setError("");
    setDir(null);
    setStartNow(core.autoStart);
    setText(seed.url ?? "");
    setPhase("input");
    if (seed.url && seed.auto) {
      void analyze(seed.url, { title: seed.title, referer: seed.referer, userAgent: seed.userAgent, cookie: seed.cookie, thumbnail: seed.thumbnail });
    } else {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  useEffect(() => {
    if (!installing) return;
    let off: (() => void) | undefined;
    void api.onEngineProgress((p) => {
      if (p.name === "yt-dlp") setInstallPct(p.total ? Math.round((p.downloaded / p.total) * 100) : 0);
    }).then((u) => (off = u));
    return () => off?.();
  }, [installing]);

  const option = info?.options.find((o) => o.id === optId) ?? info?.options[0];

  const submit = async () => {
    if (!info || !option) return;
    try {
      await api.add(buildRequest(info, option, filename || info.filename, dir, startNow));
      toast(t("added"));
      close();
    } catch (e) {
      toast(String(e), { tone: "error" });
    }
  };

  const addBatch = async () => {
    setBatchBusy(true);
    let ok = 0;
    for (const url of urls) {
      try {
        const result = await api.analyze(url);
        const best = result.options[0];
        if (best) {
          await api.add(buildRequest(result, best, result.filename, null, true));
          ok++;
        }
      } catch (e) {
        if (e instanceof Error && e.message === "ENGINE_MISSING") {
          setPhase("engine");
          setBatchBusy(false);
          return;
        }
      }
    }
    setBatchBusy(false);
    toast(t("addedMany", { n: ok }));
    close();
  };

  async function install(retryUrl?: string) {
    setInstalling(true);
    setInstallPct(0);
    try {
      await api.installYtdlp();
      toast(t("engineInstalled"));
      setInstalling(false);
      const next = retryUrl ?? urls[0];
      if (next) void analyze(next);
    } catch (e) {
      setInstalling(false);
      setError(String(e));
      setPhase("error");
    }
  }

  const pasteFromClipboard = async () => {
    const clip = await api.readClipboard();
    if (clip) setText(clip.trim());
  };

  const pickDir = async () => {
    const picked = await api.pickFolder();
    if (picked) setDir(picked);
  };

  const title =
    phase === "result" ? t("dialogTitle") : phase === "engine" ? t("engineMissingTitle") : t("dialogTitle");

  const explained = (() => {
    const e = error || "";
    if (/unsupported url/i.test(e)) return { title: t("errUnsupportedT"), hint: t("errUnsupportedB") };
    if (/(log ?in|sign ?in|cookies|private|age[- ]restricted|members)/i.test(e)) return { title: t("errLoginT"), hint: t("errLoginB") };
    if (/(timed out|network|connection|dns|unreachable|offline)/i.test(e)) return { title: t("errNetT"), hint: t("errNetB") };
    return { title: t("errorGeneric"), hint: "" };
  })();

  const actions = (() => {
    if (phase === "input") {
      return urls.length > 1 ? (
        <>
          <Button variant="text" onClick={close}>{t("dialogCancel")}</Button>
          <Button icon={batchBusy ? <Loader2 size={18} className="animate-spin" /> : <DownloadIcon size={18} />} disabled={batchBusy} onClick={addBatch}>
            {t("dialogAddAll", { n: urls.length })}
          </Button>
        </>
      ) : (
        <>
          <Button variant="text" onClick={close}>{t("dialogCancel")}</Button>
          <Button icon={<Sparkles size={18} />} disabled={urls.length === 0} onClick={() => analyze(urls[0])}>{t("analyze")}</Button>
        </>
      );
    }
    if (phase === "result") {
      return (
        <>
          <Button variant="text" icon={<ArrowLeft size={18} />} onClick={() => setPhase("input")}>{t("dialogBack")}</Button>
          <Button icon={<DownloadIcon size={18} />} onClick={submit}>{t("download")}</Button>
        </>
      );
    }
    if (phase === "error") {
      return (
        <>
          <Button variant="text" onClick={close}>{t("dialogCancel")}</Button>
          <Button variant="tonal" onClick={() => setPhase("input")}>{t("retry")}</Button>
        </>
      );
    }
    if (phase === "engine") {
      return (
        <>
          <Button variant="text" onClick={close} disabled={installing}>{t("dialogCancel")}</Button>
          <Button icon={installing ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />} disabled={installing} onClick={() => install()}>
            {installing ? `${t("engineInstalling")} ${installPct}%` : t("engineInstall")}
          </Button>
        </>
      );
    }
    return null;
  })();

  return (
    <Dialog open={open} onClose={close} title={title} icon={<Link2 size={20} />} wide actions={actions}>
      {phase === "input" && (
        <div className="pb-2">
          <label className="mb-2 block text-sm font-medium text-on-surface-variant" htmlFor="mvd-url">
            {t("dialogLinkLabel")}
          </label>
          <div className="relative">
            <textarea
              id="mvd-url"
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && urls.length === 1) {
                  e.preventDefault();
                  void analyze(urls[0]);
                }
              }}
              rows={urls.length > 1 ? 5 : 3}
              placeholder="https://"
              spellCheck={false}
              className="w-full resize-none rounded-xl border border-outline bg-surface px-4 py-3 pr-12 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={pasteFromClipboard}
              title={t("paste")}
              aria-label={t("paste")}
              className="ripple-host absolute top-2 right-2 flex size-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface/8"
            >
              <Clipboard size={18} />
            </button>
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">
            {urls.length > 1 ? t("dialogMultiHint", { n: urls.length }) : t("dialogLinkHint")}
          </p>
        </div>
      )}

      {phase === "loading" && (
        <div className="space-y-4 pb-2" aria-live="polite">
          <div className="flex gap-4">
            <div className="skeleton h-[90px] w-40 rounded-xl" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="skeleton h-5 w-4/5 rounded-md" />
              <div className="skeleton h-4 w-2/5 rounded-md" />
            </div>
          </div>
          <p className="flex items-center gap-3 text-sm font-medium text-on-surface-variant">
            <Loader size={30} />
            {t("analyzing")}
          </p>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 w-24 rounded-xl" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        </div>
      )}

      {phase === "result" && info && (
        <div className="space-y-5 pb-2">
          <div className="flex gap-4">
            <Thumb src={info.thumbnail} seed={info.site + info.title} kind={info.kind} audio={!!option?.audioOnly} className="h-[90px] w-40" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-tertiary-container px-2 py-0.5 font-medium text-on-tertiary-container">
                  {info.kind === "direct" ? t("kindDirect") : info.kind === "hls" ? t("kindHls") : t("kindYtdlp")}
                </span>
                <span className="truncate text-on-surface-variant">{info.site}</span>
                {info.duration ? <span className="text-on-surface-variant">· {formatClock(info.duration)}</span> : null}
              </div>
              <p className="mt-1.5 line-clamp-2 text-[0.95rem] leading-snug font-medium text-on-surface" data-selectable>{info.title}</p>
              {info.uploader && <p className="mt-0.5 truncate text-xs text-on-surface-variant">{info.uploader}</p>}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-on-surface-variant">{t("dialogQuality")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("dialogQuality")}>
              {info.options.map((o) => {
                const active = o.id === optId;
                const label = o.id === "best" ? t("qualityBest") : o.id === "original" ? t("qualityOriginal") : o.label;
                return (
                  <button
                    key={o.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setOptId(o.id)}
                    className={cx(
                      "ripple-host relative flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ease-emphasized active:scale-[0.97]",
                      active ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant hover:bg-on-surface/6",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {o.audioOnly && <Music size={14} />}
                      {label}
                    </span>
                    <span className={cx("text-xs", active ? "opacity-80" : "text-on-surface-variant")}>
                      {[o.detail, o.size ? "~" + formatBytes(o.size, 0) : ""].filter(Boolean).join(" · ") || "\u00A0"}
                    </span>
                    {active && <Check size={16} className="anim-pop absolute top-2.5 right-2.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="mvd-file" className="mb-2 block text-sm font-medium text-on-surface-variant">{t("dialogFileName")}</label>
            <input
              id="mvd-file"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              spellCheck={false}
              className="h-12 w-full rounded-xl border border-outline bg-surface px-4 text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-surface-container px-4 py-3">
            <FolderOpen size={20} className="shrink-0 text-on-surface-variant" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-on-surface-variant">{t("dialogSaveTo")}</p>
              <p className="truncate text-sm text-on-surface" title={dir || core.downloadDir || defaultDir}>{dir || core.downloadDir || defaultDir}</p>
            </div>
            <Button variant="text" size="md" onClick={pickDir}>{t("dialogChange")}</Button>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 px-1">
            <span className="text-sm text-on-surface">{t("dialogStartNow")}</span>
            <Switch checked={startNow} onChange={setStartNow} label={t("dialogStartNow")} />
          </label>
        </div>
      )}

      {phase === "error" && (
        <div className="anim-pop flex items-start gap-3 rounded-3xl bg-error-container p-4 text-on-error-container">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-error/15">
            <AlertCircle size={22} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{explained.title}</p>
            {explained.hint && <p className="mt-1 text-sm leading-relaxed opacity-90">{explained.hint}</p>}
            <p className="mt-2 rounded-xl bg-error/10 px-3 py-2 font-mono text-xs break-words opacity-80" data-selectable>{error}</p>
          </div>
        </div>
      )}

      {phase === "engine" && (
        <div className="flex flex-col items-center gap-4 pb-2 text-center">
          <div className="anim-float flex size-20 items-center justify-center rounded-3xl bg-primary-container text-on-primary-container">
            <Wrench size={34} />
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">{t("engineMissingBody")}</p>
          {installing && (
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary-container">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${installPct}%` }} />
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
