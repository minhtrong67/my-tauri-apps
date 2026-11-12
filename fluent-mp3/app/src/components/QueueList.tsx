import { useState } from "react";
import { ArrowCounterclockwise20Regular, CheckmarkCircle16Filled, Delete20Regular, Dismiss20Regular, FolderOpen20Regular, MusicNote220Regular, Play20Regular, Stop20Regular } from "@fluentui/react-icons";
import { ACTIVE, FINISHED, useQueue } from "../lib/queue";
import { baseName, invoke } from "../lib/tauri";
import { toast, useSettings, type QueueItem } from "../lib/stores";
import { useI18n } from "../lib/i18n";
import { Button, IconButton } from "./ui/Button";
import { ConfirmDialog } from "./ui/Overlay";
import { ProgressBar } from "./ui/Progress";
import { Segmented } from "./ui/Controls";

export function Art({ url, size = 56, className = "" }: { url?: string; size?: number; className?: string }) {
  const [bad, setBad] = useState(false);
  return (
    <div style={{ width: size, height: size }} className={`relative grid flex-none place-items-center overflow-hidden rounded-ctl border border-card-line bg-acc/15 text-acc-text ${className}`}>
      <MusicNote220Regular className="h-1/2 w-1/2 opacity-80" />
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
  return (
    <li className={`animate-enter flex items-center gap-3 rounded-ctl border p-2.5 pr-2 transition-colors duration-150 ${s === "error" ? "border-err/30 bg-err-bg" : "border-card-line bg-card hover:bg-card-h"}`} style={{ animationDelay: `${Math.min(index, 6) * 35}ms` }}>
      <div className="relative">
        <Art url={item.info?.thumbnail} size={48} />
        {s === "done" && <span className="animate-pop absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-flyout text-ok"><CheckmarkCircle16Filled /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="selectable truncate text-body font-semibold">{title}</p>
        <p className={`selectable text-cap ${s === "error" ? "whitespace-normal text-err" : "truncate"} ${s === "done" ? "text-ok" : s === "error" ? "" : "text-fg-2"}`}>{sub}</p>
        {active && <ProgressBar className="mt-2" value={item.percent} indeterminate={s !== "downloading" || item.percent === 0} />}
      </div>
      <div className="flex flex-none">
        {s === "done" && item.file && <IconButton icon={Play20Regular} label={t("act.play")} onClick={() => invoke("open_file", { path: item.file }).catch((e) => toast.error(tr(e)))} />}
        {s === "done" && item.file && <IconButton icon={FolderOpen20Regular} label={t("act.reveal")} onClick={() => invoke("reveal_file", { path: item.file }).catch((e) => toast.error(tr(e)))} />}
        {(s === "error" || s === "cancelled") && <IconButton icon={ArrowCounterclockwise20Regular} label={t("act.retry")} onClick={() => q.retry(item.id)} />}
        {FINISHED.includes(s) ? <IconButton icon={Dismiss20Regular} label={t("act.remove")} onClick={() => { q.remove(item.id); toast.info(t("toast.removed"), { action: { label: t("undo"), fn: () => q.restore([item]) } }); }} /> : <IconButton icon={Dismiss20Regular} label={t("act.cancel")} tone="danger" onClick={() => q.cancel(item.id)} />}
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
    <section className="mt-9">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-subtitle font-semibold">{t("dl.queue")}</h2>{items.length > 0 && <p className="text-cap text-fg-2">{t("dl.summary", { a, q: w, d })}</p>}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <IconButton icon={FolderOpen20Regular} label={t("act.openFolder")} onClick={() => invoke("open_folder", { path: outDir }).catch((e) => toast.error(tr(e)))} />
          {failed.length > 0 && <Button size="sm" icon={ArrowCounterclockwise20Regular} onClick={() => failed.forEach((i) => retry(i.id))}>{t("act.retryFailed")}</Button>}
          {(a > 0 || w > 0) && <Button size="sm" icon={Stop20Regular} onClick={() => setDlg("stop")}>{t("dl.stopAll")}</Button>}
          {hasFinished && <Button size="sm" icon={Delete20Regular} onClick={() => setDlg("clear")}>{t("dl.clearDone")}</Button>}
        </div>
      </div>
      {items.length > 2 && (
        <div className="mb-3">
          <Segmented small label={t("dl.queue")} value={flt} onChange={setFlt} options={[
            { value: "all", label: `${t("flt.all")} · ${items.length}` },
            { value: "active", label: `${t("flt.active")} · ${a + w}` },
            { value: "done", label: `${t("flt.done")} · ${d}` },
            { value: "failed", label: `${t("flt.failed")} · ${failed.length}` },
          ]} />
        </div>)}
      {items.length === 0 ? (
        <div className="animate-pop flex flex-col items-center gap-2 rounded-ovl border border-dashed border-strong/60 py-10 text-center">
          <MusicNote220Regular className="h-10 w-10 text-fg-3" />
          <p className="text-lead font-semibold">{t("empty.title")}</p><p className="max-w-sm text-body text-fg-2">{t("dl.empty")}</p>
        </div>
      ) : shown.length === 0 ? <p className="py-6 text-center text-body text-fg-2">{t("hi.noResult")}</p> : <ul className="flex flex-col gap-1.5">{shown.map((it, i) => <Row key={it.id} item={it} index={i} />)}</ul>}
      <ConfirmDialog open={dlg === "clear"} onClose={() => setDlg(null)} onConfirm={clearFinished} destructive title={t("cf.clearDone.t")} body={t("cf.clearDone.b")} confirmLabel={t("b.clear")} />
      <ConfirmDialog open={dlg === "stop"} onClose={() => setDlg(null)} onConfirm={() => { stopAll(); toast.info(t("toast.stopped")); }} destructive title={t("cf.stopAll.t")} body={t("cf.stopAll.b")} confirmLabel={t("dl.stopAll")} />
    </section>
  );
}
