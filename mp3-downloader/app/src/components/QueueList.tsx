import { useState } from "react";
import { CheckCircle2, FolderOpen, Music, RotateCcw, Square, Trash2, X } from "lucide-react";
import { ACTIVE, FINISHED, useQueue } from "../lib/queue";
import { baseName, invoke } from "../lib/tauri";
import { toast, useSettings, type QueueItem } from "../lib/stores";
import { useI18n } from "../lib/i18n";
import { Button, IconButton } from "./ui/Button";
import { ConfirmDialog } from "./ui/Overlay";
import { WavyProgress, Cookie } from "./ui/Progress";
import { ChoiceChips } from "./ui/Controls";

export function Art({ url, size = 56, className = "" }: { url?: string; size?: number; className?: string }) {
  const [bad, setBad] = useState(false);
  return (
    <div style={{ width: size, height: size }} className={`relative grid flex-none place-items-center overflow-hidden rounded-m3-md bg-primary-container text-on-primary-container ${className}`}>
      <Music className="h-1/2 w-1/2 opacity-70" />
      {url && !bad && <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className="absolute inset-0 h-full w-full object-cover" />}
    </div>
  );
}

function Row({ item, index }: { item: QueueItem; index: number }) {
  const { t, tr } = useI18n();
  const q = useQueue();
  const s = item.stage;
  const active = ACTIVE.includes(s);
  let sub = "";
  if (s === "queued") sub = t("st.queued");
  else if (s === "downloading") {
    const parts: string[] = [];
    if (item.percent > 0) parts.push(item.percent.toFixed(0) + "%");
    if (item.speed && !/unknown/i.test(item.speed)) parts.push(item.speed);
    if (item.eta && !/unknown/i.test(item.eta)) parts.push(t("st.eta", { eta: item.eta }));
    sub = parts.length ? parts.join(" · ") : tr(item.message) || t("st.starting");
  } else if (s === "converting") sub = t("st.converting");
  else if (s === "tagging") sub = tr(item.message);
  else if (s === "done") { const w = tr(item.message); sub = (item.info?.artist ? item.info.artist + " · " : "") + t("st.saved", { file: baseName(item.file) }) + (w ? " · " + w : ""); }
  else if (s === "error") sub = tr(item.message);
  else sub = t("st.cancelled");
  const title = item.info?.title || (item.file ? baseName(item.file) : item.url);
  const tone = s === "error" ? "bg-error-container/60" : "bg-surface-container";
  return (
    <li className={`animate-rise flex items-center gap-3 rounded-m3-lg p-3 pr-2 transition-colors duration-300 ${tone}`} style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}>
      <div className="relative">
        <Art url={item.info?.thumbnail} />
        {s === "done" && <span className="animate-pop absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-on-primary ring-2 ring-surface-container"><CheckCircle2 className="h-4 w-4" /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="selectable truncate text-base font-semibold">{title}</p>
        <p className={`selectable t-body ${s === "error" ? "whitespace-normal text-error" : "truncate"} ${s === "done" ? "text-primary" : s === "error" ? "" : "text-on-surface-variant"}`}>{sub}</p>
        {active && <WavyProgress className="mt-2" value={item.percent} indeterminate={s !== "downloading" || item.percent === 0} />}
      </div>
      <div className="flex flex-none">
        {s === "done" && item.file && <IconButton icon={FolderOpen} label={t("act.reveal")} onClick={() => invoke("reveal_file", { path: item.file }).catch((e) => toast.error(tr(e)))} />}
        {(s === "error" || s === "cancelled") && <IconButton icon={RotateCcw} label={t("act.retry")} onClick={() => q.retry(item.id)} />}
        {FINISHED.includes(s) ? <IconButton icon={X} label={t("act.remove")} onClick={() => { q.remove(item.id); toast.info(t("toast.removed"), { action: { label: t("undo"), fn: () => q.restore([item]) } }); }} /> : <IconButton icon={X} label={t("act.cancel")} tone="danger" onClick={() => q.cancel(item.id)} />}
      </div>
    </li>
  );
}

export function QueueList() {
  const { t, tr } = useI18n();
  const { items, clearFinished, stopAll } = useQueue();
  const [dlg, setDlg] = useState<"clear" | "stop" | null>(null);
  const [flt, setFlt] = useState<"all" | "active" | "done" | "failed">("all");
  const outDir = useSettings((x) => x.s.outDir);
  const retry = useQueue((x) => x.retry);
  const a = items.filter((i) => ACTIVE.includes(i.stage)).length;
  const w = items.filter((i) => i.stage === "queued").length;
  const d = items.filter((i) => i.stage === "done").length;
  const hasFinished = items.some((i) => FINISHED.includes(i.stage));
  const failed = items.filter((i) => i.stage === "error" || i.stage === "cancelled");
  const inFlt = (i: QueueItem) => flt === "all" || (flt === "active" ? ACTIVE.includes(i.stage) || i.stage === "queued" : flt === "done" ? i.stage === "done" : i.stage === "error" || i.stage === "cancelled");
  const shown = items.filter(inFlt);
  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="t-headline !text-2xl">{t("dl.queue")}</h2>{items.length > 0 && <p className="t-small text-on-surface-variant">{t("dl.summary", { a, q: w, d })}</p>}</div>
        <div className="flex flex-wrap items-center gap-1">
          <IconButton icon={FolderOpen} label={t("act.openFolder")} onClick={() => invoke("open_folder", { path: outDir }).catch((e) => toast.error(tr(e)))} />
          {failed.length > 0 && <Button variant="tonal" size="sm" icon={RotateCcw} onClick={() => failed.forEach((i) => retry(i.id))}>{t("act.retryFailed")}</Button>}
          {(a > 0 || w > 0) && <Button variant="errorTonal" size="sm" icon={Square} onClick={() => setDlg("stop")}>{t("dl.stopAll")}</Button>}
          {hasFinished && <Button variant="tonal" size="sm" icon={Trash2} onClick={() => setDlg("clear")}>{t("dl.clearDone")}</Button>}
        </div>
      </div>
      {items.length > 2 && (
        <div className="mb-3">
          <ChoiceChips label={t("dl.queue")} value={flt} onChange={setFlt} options={[
            { value: "all", label: `${t("flt.all")} · ${items.length}` },
            { value: "active", label: `${t("flt.active")} · ${a + w}` },
            { value: "done", label: `${t("flt.done")} · ${d}` },
            { value: "failed", label: `${t("flt.failed")} · ${failed.length}` },
          ]} />
        </div>)}
      {items.length === 0 ? (
        <div className="animate-pop flex flex-col items-center gap-3 py-10 text-center">
          <div className="relative grid h-24 w-24 place-items-center">
            <Cookie size={96} className="absolute text-secondary-container" style={{ animation: "float 5s ease-in-out infinite" }} />
            <Music className="relative h-9 w-9 text-on-secondary-container" />
          </div>
          <p className="t-title">{t("empty.title")}</p><p className="t-body text-on-surface-variant">{t("dl.empty")}</p>
        </div>
      ) : shown.length === 0 ? <p className="t-body py-6 text-center text-on-surface-variant">{t("hi.noResult")}</p> : <ul className="flex flex-col gap-2">{shown.map((it, i) => <Row key={it.id} item={it} index={i} />)}</ul>}
      <ConfirmDialog open={dlg === "clear"} onClose={() => setDlg(null)} onConfirm={clearFinished} icon={Trash2} destructive title={t("cf.clearDone.t")} body={t("cf.clearDone.b")} confirmLabel={t("b.clear")} confirmIcon={Trash2} />
      <ConfirmDialog open={dlg === "stop"} onClose={() => setDlg(null)} onConfirm={() => { stopAll(); toast.info(t("toast.stopped")); }} icon={Square} destructive title={t("cf.stopAll.t")} body={t("cf.stopAll.b")} confirmLabel={t("dl.stopAll")} confirmIcon={Square} />
    </section>
  );
}
