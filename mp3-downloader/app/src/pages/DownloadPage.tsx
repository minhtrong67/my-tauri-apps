import { useEffect, useRef, useState } from "react";
import { AlertCircle, ClipboardPaste, Disc3, Download, ListMusic, ListPlus, Music2, Pencil, PlayCircle, Search, X } from "lucide-react";
import { fmtTime, invoke, sourceOf, urlsIn, type SearchItem, type TrackInfo } from "../lib/tauri";
import { toast, useSettings, type Quality } from "../lib/stores";
import { toolsReady, useQueue } from "../lib/queue";
import { useI18n } from "../lib/i18n";
import { Button, IconButton } from "../components/ui/Button";
import { ChoiceChips, TextField } from "../components/ui/Controls";
import { LoadingIndicator } from "../components/ui/Progress";
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
  const addPlaylist = (items: SearchItem[]) => {
    if (!toolsReady()) return;
    for (const e of items) addToQueue(e.url, { source: "youtube", url: e.url, title: e.title, artist: e.channel, album: "", year: "", thumbnail: e.thumbnail, duration: e.duration }, quality);
    toast.success(t("toast.added", { n: items.length })); setText(""); setMode("idle");
  };

  const canAdd = mode === "preview" || mode === "multi";
  const upd = (k: keyof TrackInfo, v: string) => { setInfo((i) => (i ? { ...i, [k]: v } : i)); setEdited(true); };
  const srcIcon = { youtube: PlayCircle, tiktok: Music2, spotify: Disc3 } as const;
  const detected = urlsIn(text)[0] ? sourceOf(urlsIn(text)[0]) : "";

  return (
    <div>
      <header className="mb-6">
        <h1 className="t-display">{t("dl.title")}</h1>
        <p className="t-body mt-1 max-w-[62ch] text-on-surface-variant">{t("dl.subtitle")}</p>
      </header>
      <ToolsBanner />

      <TextField size="lg" label={t("dl.hint")} value={text} onChange={setText} inputRef={inputRef} onEnter={() => canAdd && addAll()}
        leading={mode === "loading" ? <LoadingIndicator size={24} /> : <Search className="h-6 w-6" />}
        trailing={<>
          {text && <IconButton icon={X} label={t("dl.clearInput")} onClick={() => { setText(""); inputRef.current?.focus(); }} />}
          <IconButton icon={ClipboardPaste} label={t("dl.paste")} onClick={paste} />
        </>} />
      <div className="mt-3 flex flex-wrap gap-2">
        {(["youtube", "tiktok", "spotify"] as const).map((s) => { const I = srcIcon[s]; const on = detected === s; return (
          <span key={s} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all duration-300 ease-spring ${on ? "scale-105 bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}><I className="h-4 w-4" />{t("src." + s)}</span>); })}
      </div>

      {mode === "loading" && <div className="mt-4 flex items-center gap-3 rounded-m3-lg bg-surface-highest p-4 text-on-surface-variant animate-pop"><div className="skeleton h-16 w-16 rounded-m3-md" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/3 rounded-full" /><div className="skeleton h-3 w-1/3 rounded-full" /></div></div>}
      {mode === "error" && <div className="animate-pop selectable mt-4 flex items-center gap-3 rounded-m3-lg bg-error-container p-4 text-on-error-container"><AlertCircle className="h-5 w-5 flex-none" /><span className="t-body">{err}</span></div>}
      {mode === "multi" && <div className="animate-pop mt-4 flex items-center gap-3 rounded-m3-lg bg-surface-highest p-4"><ListPlus className="h-5 w-5" />{t("pv.multi", { n: count })}</div>}
      {mode === "playlist" && <div className="animate-pop mt-4 flex flex-wrap items-center gap-3 rounded-m3-lg bg-secondary-container p-4 text-on-secondary-container"><ListMusic className="h-6 w-6" /><span className="t-body min-w-[200px] flex-1">{t("dl.playlistFound")}</span><Button icon={ListMusic} onClick={() => setPlOpen(true)}>{t("dl.playlist")}</Button></div>}

      {mode === "search" && (
        <div className="mt-4">
          <p className="t-small mb-2 font-semibold text-primary">{t("dl.results")}</p>
          {results.length === 0 ? <p className="t-body text-on-surface-variant">{t("dl.noResults")}</p> : (
            <ul className="flex flex-col gap-1">
              {results.map((r, i) => (
                <li key={r.id} className="animate-rise" style={{ animationDelay: `${i * 30}ms` }}>
                  <button type="button" onClick={() => pickResult(r)} className="state-layer flex w-full items-center gap-3 rounded-m3-lg bg-surface-container p-2 pr-4 text-left transition-[border-radius] duration-300 ease-spring hover:rounded-m3-md">
                    <Art url={r.thumbnail} size={52} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.title}</span><span className="t-small block truncate text-on-surface-variant">{r.channel}</span></span>
                    <span className="t-small text-on-surface-variant">{fmtTime(r.duration)}</span>
                  </button>
                </li>))}
            </ul>)}
        </div>)}

      {mode === "preview" && info && (
        <div className="animate-pop mt-4 rounded-m3-xl bg-surface-highest p-3">
          <div className="flex gap-4 max-sm:flex-col">
            <Art url={info.thumbnail} size={112} className="max-sm:!h-auto max-sm:!w-full max-sm:aspect-square max-sm:max-w-[220px]" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <p className="selectable t-title line-clamp-2 !text-lg">{info.title || t("pv.untitled")}</p>
              {info.artist && <p className="selectable t-body text-on-surface-variant">{info.artist}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-m3-sm bg-primary px-2.5 py-0.5 text-xs font-bold text-on-primary">{t("src." + info.source) === "src." + info.source ? t("src.other") : t("src." + info.source)}</span>
                {info.album && <span className="rounded-m3-sm bg-secondary-container px-2.5 py-0.5 text-xs font-semibold text-on-secondary-container">{t("pv.album", { v: info.album })}</span>}
                {info.year && <span className="rounded-m3-sm bg-secondary-container px-2.5 py-0.5 text-xs font-semibold text-on-secondary-container">{info.year}</span>}
                {info.duration > 0 && <span className="rounded-m3-sm bg-secondary-container px-2.5 py-0.5 text-xs font-semibold text-on-secondary-container">{fmtTime(info.duration)}</span>}
                {edited && <span className="rounded-m3-sm bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-on-tertiary-container">{t("dl.editTags")}</span>}
              </div>
              {info.source === "spotify" && <p className="t-small mt-2 text-on-surface-variant">{t("pv.spotify")}</p>}
            </div>
            <div className="flex gap-1 self-start max-sm:self-end">
              {hasList(info.url) && <IconButton icon={ListMusic} label={t("dl.playlist")} onClick={() => setPlOpen(true)} />}
              <IconButton icon={Pencil} label={t("dl.editTags")} active={editing} onClick={() => setEditing((v) => !v)} />
            </div>
          </div>
          {editing && (
            <div className="animate-rise mt-3 grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              <TextField label={t("tag.title")} value={info.title} onChange={(v) => upd("title", v)} className="col-span-2 max-sm:col-span-1" />
              <TextField label={t("tag.artist")} value={info.artist} onChange={(v) => upd("artist", v)} />
              <TextField label={t("tag.album")} value={info.album} onChange={(v) => upd("album", v)} />
              <TextField label={t("tag.year")} value={info.year} onChange={(v) => upd("year", v.replace(/\D/g, "").slice(0, 4))} maxLength={4} mono />
            </div>)}
        </div>)}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <ChoiceChips label={t("dl.quality")} value={quality} onChange={setQuality} options={QUALITIES.map((q) => ({ value: q, label: q === "best" ? t("q.best") : q + " kbps" }))} />
        <Button size="lg" icon={Download} disabled={!canAdd} onClick={addAll}>{t("dl.button")}</Button>
      </div>

      <QueueList />
      <PlaylistSheet open={plOpen} url={urlsIn(text)[0] || info?.url || ""} onClose={() => setPlOpen(false)} onAdd={addPlaylist} />
    </div>
  );
}
