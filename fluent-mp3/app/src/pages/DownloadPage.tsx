import { useEffect, useRef, useState } from "react";
import { ArrowDownload20Regular, Checkmark20Regular, ClipboardPaste20Regular, Dismiss20Regular, Edit20Regular, Headphones20Regular, Library20Regular, MusicNote220Regular, PlayCircle20Regular, Search20Regular, TextBulletListAdd20Regular } from "@fluentui/react-icons";
import { fmtTime, invoke, sourceOf, urlsIn, type SearchItem, type TrackInfo } from "../lib/tauri";
import { toast, useIntake, useSettings, type Quality } from "../lib/stores";
import { toolsReady, useQueue } from "../lib/queue";
import { useI18n } from "../lib/i18n";
import { Button, IconButton } from "../components/ui/Button";
import { PageHeader, Segmented, Tag, TextField } from "../components/ui/Controls";
import { InfoBar } from "../components/ui/InfoBar";
import { ProgressRing } from "../components/ui/Progress";
import { ToolsBanner } from "../components/ToolsBanner";
import { PlaylistSheet } from "../components/PlaylistSheet";
import { Art, QueueList } from "../components/QueueList";

type Mode = "idle" | "loading" | "preview" | "error" | "multi" | "search" | "playlist";
const QUALITIES: Quality[] = ["best", "320", "256", "192", "128"];
const isPlaylistOnly = (u: string) => /youtube\.com\/playlist\?/.test(u) && /[?&]list=/.test(u);
const hasList = (u: string) => /[?&]list=/.test(u) && /youtu/.test(u);

export default function DownloadPage() {
  const { t, tr } = useI18n();
  const defaultQ = useSettings((s) => s.s.quality);
  const addToQueue = useQueue((s) => s.add);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [info, setInfo] = useState<TrackInfo | null>(null);
  const [edited, setEdited] = useState(false);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState("");
  const [count, setCount] = useState(0);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [quality, setQuality] = useState<Quality>(defaultQ);
  const [plOpen, setPlOpen] = useState(false);
  const token = useRef(0);
  const skip = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setQuality(defaultQ), [defaultQ]);

  // Link đến từ kéo-thả / Ctrl+V toàn cục và lệnh focus ô tìm kiếm
  const intake = useIntake();
  useEffect(() => { if (intake.text) setText(intake.text); }, [intake.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, [intake.focus]);

  // Gợi ý link đã sao chép khi quay lại app
  const clipWatch = useSettings((s) => s.s.clipWatch);
  const [clip, setClip] = useState<{ raw: string; url: string } | null>(null);
  const seenClip = useRef("");
  useEffect(() => {
    if (!clipWatch) { setClip(null); return; }
    const check = async () => {
      try {
        const raw = ((await invoke<string>("read_clipboard")) || "").trim();
        if (!raw || raw === seenClip.current) return;
        const url = urlsIn(raw).find((u) => sourceOf(u) !== "other");
        if (url) setClip({ raw, url });
      } catch { /* ngoài Tauri hoặc clipboard trống */ }
    };
    check();
    addEventListener("focus", check);
    return () => removeEventListener("focus", check);
  }, [clipWatch]);
  const useClip = () => { if (!clip) return; seenClip.current = clip.raw; setText(clip.url); setClip(null); };
  const dismissClip = () => { if (clip) seenClip.current = clip.raw; setClip(null); };

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const tk = ++token.current;
    const urls = urlsIn(text);
    setEdited(false); setEditing(false);
    if (!text.trim()) { setMode("idle"); setInfo(null); return; }
    if (urls.length > 1) { setCount(urls.length); setMode("multi"); setInfo(null); return; }
    setMode("loading"); setInfo(null);
    const id = setTimeout(async () => {
      try {
        if (urls.length === 1) {
          if (isPlaylistOnly(urls[0])) { setMode("playlist"); return; }
          const i = await invoke<TrackInfo>("fetch_info", { url: urls[0] });
          if (tk === token.current) { setInfo(i); setMode("preview"); }
        } else if (text.trim().length >= 2) {
          const r = await invoke<SearchItem[]>("search_tracks", { query: text.trim() });
          if (tk === token.current) { setResults(r); setMode("search"); }
        } else setMode("idle");
      } catch (e) { if (tk === token.current) { setErr(tr(e)); setMode("error"); } }
    }, 500);
    return () => clearTimeout(id);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const paste = async () => {
    let v = "";
    try { v = await invoke<string>("read_clipboard"); } catch { try { v = await navigator.clipboard.readText(); } catch { /* */ } }
    v = (v || "").trim();
    if (!v) { toast.info(t("toast.pasteEmpty")); return; }
    setText(v); inputRef.current?.focus();
  };

  const pickResult = (r: SearchItem) => {
    skip.current = true; token.current++;
    setText(r.url);
    setInfo({ source: "youtube", url: r.url, title: r.title, artist: r.channel, album: "", year: "", thumbnail: r.thumbnail, duration: r.duration });
    setMode("preview");
  };

  const addAll = () => {
    if (!toolsReady()) return;
    const urls = urlsIn(text);
    if (mode === "preview" && info) addToQueue(info.url, info, quality, edited);
    else for (const u of urls) addToQueue(u, null, quality);
    toast.success(t("toast.added", { n: mode === "preview" ? 1 : urls.length }));
    token.current++; setText(""); setMode("idle"); setInfo(null);
  };
  const showClip = !!clip && !text.trim() && mode === "idle";
  const addPlaylist = (items: SearchItem[]) => {
    if (!toolsReady()) return;
    for (const e of items) addToQueue(e.url, { source: "youtube", url: e.url, title: e.title, artist: e.channel, album: "", year: "", thumbnail: e.thumbnail, duration: e.duration }, quality);
    toast.success(t("toast.added", { n: items.length })); setText(""); setMode("idle");
  };

  const canAdd = mode === "preview" || mode === "multi";
  const upd = (k: keyof TrackInfo, v: string) => { setInfo((i) => (i ? { ...i, [k]: v } : i)); setEdited(true); };
  const srcIcon = { youtube: PlayCircle20Regular, tiktok: MusicNote220Regular, spotify: Headphones20Regular } as const;
  const detected = urlsIn(text)[0] ? sourceOf(urlsIn(text)[0]) : "";

  return (
    <div>
      <PageHeader title={t("dl.title")} subtitle={t("dl.subtitle")} />
      <div className="mt-5"><ToolsBanner /></div>

      {showClip && clip && (
        <InfoBar className="animate-pop mb-4" title={t("clip.found")} onClose={dismissClip}
          actions={<Button size="sm" icon={Checkmark20Regular} onClick={useClip}>{t("clip.use")}</Button>}>
          <span className="selectable block truncate">{clip.url}</span>
        </InfoBar>)}

      <section>
        <TextField size="lg" label={t("dl.hint")} value={text} onChange={setText} inputRef={inputRef} onEnter={() => canAdd && addAll()}
          leading={mode === "loading" ? <ProgressRing size={20} /> : <Search20Regular />}
          trailing={<>
            {text && <IconButton icon={Dismiss20Regular} label={t("dl.clearInput")} onClick={() => { setText(""); inputRef.current?.focus(); }} />}
            <IconButton icon={ClipboardPaste20Regular} label={t("dl.paste")} onClick={paste} />
          </>} />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {(["youtube", "tiktok", "spotify"] as const).map((s) => { const I = srcIcon[s]; const on = detected === s; return (
            <span key={s} className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-cap transition-colors duration-150 ${on ? "border-acc/50 bg-acc/15 font-semibold text-acc-text" : "border-card-line bg-card text-fg-2"}`}><I className="h-4 w-4" />{t("src." + s)}</span>); })}
          <span className="ml-auto text-cap text-fg-3">{t("dl.heroTip")}</span>
        </div>
      </section>

      {mode === "loading" && <div className="animate-pop mt-4 flex items-center gap-3 rounded-ovl border border-card-line bg-card p-3"><div className="skeleton h-20 w-20 rounded-ctl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/3 rounded-ctl" /><div className="skeleton h-3 w-1/3 rounded-ctl" /></div></div>}
      {mode === "error" && <InfoBar severity="error" selectable className="animate-pop mt-4">{err}</InfoBar>}
      {mode === "multi" && <InfoBar className="animate-pop mt-4"><span className="inline-flex items-center gap-2"><TextBulletListAdd20Regular />{t("pv.multi", { n: count })}</span></InfoBar>}
      {mode === "playlist" && <InfoBar className="animate-pop mt-4" actions={<Button icon={Library20Regular} onClick={() => setPlOpen(true)}>{t("dl.playlist")}</Button>}>{t("dl.playlistFound")}</InfoBar>}

      {mode === "search" && (
        <div className="mt-5">
          <p className="mb-2 text-body font-semibold">{t("dl.results")}</p>
          {results.length === 0 ? <p className="text-body text-fg-2">{t("dl.noResults")}</p> : (
            <ul className="flex flex-col gap-0.5">
              {results.map((r, i) => (
                <li key={r.id} className="animate-enter" style={{ animationDelay: `${i * 25}ms` }}>
                  <button type="button" onClick={() => pickResult(r)} className="flex w-full items-center gap-3 rounded-ctl border border-card-line bg-card p-2 pr-4 text-left transition-colors hover:bg-card-h active:bg-ctl-p">
                    <Art url={r.thumbnail} size={48} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-body font-semibold">{r.title}</span><span className="block truncate text-cap text-fg-2">{r.channel}</span></span>
                    <span className="text-cap text-fg-2">{fmtTime(r.duration)}</span>
                  </button>
                </li>))}
            </ul>)}
        </div>)}

      {mode === "preview" && info && (
        <div className="animate-pop mt-4 rounded-ovl border border-card-line bg-card p-3">
          <div className="flex gap-4">
            <Art url={info.thumbnail} size={96} />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <p className="selectable line-clamp-2 text-lead font-semibold">{info.title || t("pv.untitled")}</p>
              {info.artist && <p className="selectable text-body text-fg-2">{info.artist}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Tag accent>{t("src." + info.source) === "src." + info.source ? t("src.other") : t("src." + info.source)}</Tag>
                {info.album && <Tag>{t("pv.album", { v: info.album })}</Tag>}
                {info.year && <Tag>{info.year}</Tag>}
                {info.duration > 0 && <Tag>{fmtTime(info.duration)}</Tag>}
                {edited && <Tag>{t("dl.editTags")}</Tag>}
              </div>
              {info.source === "spotify" && <p className="mt-2 text-cap text-fg-2">{t("pv.spotify")}</p>}
            </div>
            <div className="flex gap-1 self-start">
              {hasList(info.url) && <IconButton icon={Library20Regular} label={t("dl.playlist")} onClick={() => setPlOpen(true)} />}
              <IconButton icon={Edit20Regular} label={t("dl.editTags")} active={editing} onClick={() => setEditing((v) => !v)} />
            </div>
          </div>
          {editing && (
            <div className="animate-enter mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
              <TextField header={t("tag.title")} label={t("tag.title")} value={info.title} onChange={(v) => upd("title", v)} className="col-span-2" />
              <TextField header={t("tag.artist")} label={t("tag.artist")} value={info.artist} onChange={(v) => upd("artist", v)} />
              <TextField header={t("tag.album")} label={t("tag.album")} value={info.album} onChange={(v) => upd("album", v)} />
              <TextField header={t("tag.year")} label={t("tag.year")} value={info.year} onChange={(v) => upd("year", v.replace(/\D/g, "").slice(0, 4))} maxLength={4} mono />
            </div>)}
        </div>)}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <Segmented label={t("dl.quality")} value={quality} onChange={setQuality} options={QUALITIES.map((q) => ({ value: q, label: q === "best" ? t("q.best") : q + " kbps" }))} />
        <Button variant="accent" size="lg" icon={ArrowDownload20Regular} disabled={!canAdd} onClick={addAll}>{t("dl.button")}</Button>
      </div>

      <QueueList />
      <PlaylistSheet open={plOpen} url={urlsIn(text)[0] || info?.url || ""} onClose={() => setPlOpen(false)} onAdd={addPlaylist} />
    </div>
  );
}
