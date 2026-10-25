import { useMemo, useState } from "react";
import { FolderOpen, History as HistoryIcon, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useHistory, toast, type HistoryEntry } from "../lib/stores";
import { baseName, invoke } from "../lib/tauri";
import { useQueue, toolsReady } from "../lib/queue";
import { useI18n } from "../lib/i18n";
import { Button, IconButton } from "../components/ui/Button";
import { TextField } from "../components/ui/Controls";
import { ConfirmDialog } from "../components/ui/Overlay";
import { Art } from "../components/QueueList";
import { Cookie } from "../components/ui/Progress";

export default function HistoryPage() {
  const { t, tr, lang } = useI18n();
  const { items, remove, clear, restore } = useHistory();
  const add = useQueue((s) => s.add);
  const [q, setQ] = useState("");
  const [del, setDel] = useState<HistoryEntry | null>(null);
  const [clearAll, setClearAll] = useState(false);
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return s ? items.filter((i) => (i.title + " " + i.artist).toLowerCase().includes(s)) : items; }, [items, q]);
  const fmt = (ts: number) => new Date(ts).toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="t-display">{t("hi.title")}</h1><p className="t-body mt-1 text-on-surface-variant">{t("hi.sub")}</p></div>
        {items.length > 0 && <Button variant="errorTonal" icon={Trash2} onClick={() => setClearAll(true)}>{t("hi.clearAll")}</Button>}
      </header>
      {items.length > 0 && <>
        <TextField label={t("hi.search")} value={q} onChange={setQ} leading={<Search className="h-5 w-5" />} trailing={q ? <IconButton icon={X} label={t("dl.clearInput")} onClick={() => setQ("")} /> : undefined} />
        <p className="t-small mb-2 mt-3 text-on-surface-variant">{t("hi.count", { n: list.length })}</p>
      </>}
      {items.length === 0 ? (
        <div className="animate-pop flex flex-col items-center gap-3 py-16 text-center">
          <div className="relative grid h-28 w-28 place-items-center"><Cookie size={112} className="absolute text-secondary-container" style={{ animation: "float 5s ease-in-out infinite" }} /><HistoryIcon className="relative h-10 w-10 text-on-secondary-container" /></div>
          <p className="t-body text-on-surface-variant">{t("hi.empty")}</p>
        </div>
      ) : list.length === 0 ? <p className="t-body py-8 text-center text-on-surface-variant">{t("hi.noResult")}</p> : (
        <ul className="flex flex-col gap-2">
          {list.slice(0, 200).map((h, i) => (
            <li key={h.id} className="animate-rise flex items-center gap-3 rounded-m3-lg bg-surface-container p-3 pr-2" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
              <Art url={h.thumbnail} />
              <div className="min-w-0 flex-1">
                <p className="selectable truncate font-semibold">{h.title}</p>
                <p className="selectable t-small truncate text-on-surface-variant">{[h.artist, baseName(h.file), fmt(h.at)].filter(Boolean).join(" · ")}</p>
              </div>
              <IconButton icon={FolderOpen} label={t("act.reveal")} onClick={() => invoke("reveal_file", { path: h.file }).catch((e) => toast.error(tr(e)))} />
              <IconButton icon={RotateCcw} label={t("hi.again")} onClick={() => { if (toolsReady()) { add(h.url, null, h.quality); toast.success(t("toast.added", { n: 1 })); } }} />
              <IconButton icon={Trash2} label={t("hi.delFile")} tone="danger" onClick={() => setDel(h)} />
              <IconButton icon={X} label={t("hi.remove")} onClick={() => { remove(h.id); toast.info(t("toast.removed"), { action: { label: t("undo"), fn: () => restore(h) } }); }} />
            </li>))}
        </ul>)}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} destructive icon={Trash2} title={t("cf.delFile.t")} body={t("cf.delFile.b", { name: baseName(del?.file) })} confirmLabel={t("b.delete")} confirmIcon={Trash2}
        onConfirm={() => { if (!del) return; invoke("delete_file", { path: del.file }).then(() => { remove(del.id); toast.success(t("toast.fileDeleted")); }).catch((e) => toast.error(tr(e))); }} />
      <ConfirmDialog open={clearAll} onClose={() => setClearAll(false)} destructive icon={Trash2} title={t("cf.clearHist.t")} body={t("cf.clearHist.b")} confirmLabel={t("hi.clearAll")} confirmIcon={Trash2} onConfirm={clear} />
    </div>
  );
}
