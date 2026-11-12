import { useMemo, useState } from "react";
import { ArrowCounterclockwise20Regular, Delete20Regular, DismissCircle20Regular, FolderOpen20Regular, History24Regular, Play20Regular, Search20Regular, Dismiss20Regular } from "@fluentui/react-icons";
import { useHistory, toast, type HistoryEntry } from "../lib/stores";
import { baseName, invoke } from "../lib/tauri";
import { useQueue, toolsReady } from "../lib/queue";
import { useI18n } from "../lib/i18n";
import { Button, IconButton } from "../components/ui/Button";
import { PageHeader, TextField } from "../components/ui/Controls";
import { ConfirmDialog } from "../components/ui/Overlay";
import { MoreMenu } from "../components/ui/Menu";
import { Art } from "../components/QueueList";

const dayKey = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

export default function HistoryPage() {
  const { t, tr, lang } = useI18n();
  const { items, remove, clear, restore } = useHistory();
  const add = useQueue((s) => s.add);
  const [q, setQ] = useState("");
  const [del, setDel] = useState<HistoryEntry | null>(null);
  const [clearAll, setClearAll] = useState(false);
  const loc = lang === "vi" ? "vi-VN" : "en-US";
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return s ? items.filter((i) => (i.title + " " + i.artist).toLowerCase().includes(s)) : items; }, [items, q]);
  const time = (ts: number) => new Date(ts).toLocaleTimeString(loc, { timeStyle: "short" });

  // Gom theo ngày: Hôm nay / Hôm qua / ngày cụ thể
  const groups = useMemo(() => {
    const today = dayKey(Date.now()), yest = dayKey(Date.now() - 864e5);
    const out: { key: string; label: string; rows: HistoryEntry[] }[] = [];
    for (const h of list.slice(0, 200)) {
      const k = dayKey(h.at);
      let g = out[out.length - 1];
      if (!g || g.key !== k) {
        g = { key: k, label: k === today ? t("hi.today") : k === yest ? t("hi.yesterday") : new Date(h.at).toLocaleDateString(loc, { dateStyle: "long" }), rows: [] };
        out.push(g);
      }
      g.rows.push(h);
    }
    return out;
  }, [list, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader title={t("hi.title")} subtitle={t("hi.sub")}
        actions={items.length > 0 ? <Button icon={Delete20Regular} onClick={() => setClearAll(true)}>{t("hi.clearAll")}</Button> : undefined} />
      {items.length > 0 && <div className="mt-5">
        <TextField label={t("hi.search")} value={q} onChange={setQ} leading={<Search20Regular />} trailing={q ? <IconButton icon={Dismiss20Regular} small label={t("dl.clearInput")} onClick={() => setQ("")} /> : undefined} />
        <p className="mt-3 text-cap text-fg-2">{t("hi.count", { n: list.length })}</p>
      </div>}
      {items.length === 0 ? (
        <div className="animate-pop mt-8 flex flex-col items-center gap-2 py-12 text-center">
          <History24Regular className="h-12 w-12 text-fg-3" />
          <p className="max-w-sm text-body text-fg-2">{t("hi.empty")}</p>
        </div>
      ) : list.length === 0 ? <p className="py-8 text-center text-body text-fg-2">{t("hi.noResult")}</p> : (
        <div className="mt-2 flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-1.5 px-1 text-body font-semibold">{g.label}</h2>
              <ul className="flex flex-col gap-1">
                {g.rows.map((h, i) => (
                  <li key={h.id} className="animate-enter flex items-center gap-3 rounded-ctl border border-card-line bg-card p-2.5 pr-2 transition-colors hover:bg-card-h" style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}>
                    <Art url={h.thumbnail} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="selectable truncate text-body font-semibold">{h.title}</p>
                      <p className="selectable truncate text-cap text-fg-2">{[h.artist, baseName(h.file), time(h.at)].filter(Boolean).join(" · ")}</p>
                    </div>
                    <IconButton icon={Play20Regular} label={t("act.play")} onClick={() => invoke("open_file", { path: h.file }).catch((e) => toast.error(tr(e)))} />
                    <IconButton icon={FolderOpen20Regular} label={t("act.reveal")} onClick={() => invoke("reveal_file", { path: h.file }).catch((e) => toast.error(tr(e)))} />
                    <IconButton icon={ArrowCounterclockwise20Regular} label={t("hi.again")} onClick={() => { if (toolsReady()) { add(h.url, null, h.quality); toast.success(t("toast.added", { n: 1 })); } }} />
                    <MoreMenu label={t("hi.more")} items={[
                      { label: t("hi.delFile"), icon: Delete20Regular, danger: true, onClick: () => setDel(h) },
                      { label: t("hi.remove"), icon: DismissCircle20Regular, onClick: () => { remove(h.id); toast.info(t("toast.removed"), { action: { label: t("undo"), fn: () => restore(h) } }); } },
                    ]} />
                  </li>))}
              </ul>
            </section>))}
        </div>)}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} destructive title={t("cf.delFile.t")} body={t("cf.delFile.b", { name: baseName(del?.file) })} confirmLabel={t("b.delete")}
        onConfirm={() => { if (!del) return; invoke("delete_file", { path: del.file }).then(() => { remove(del.id); toast.success(t("toast.fileDeleted")); }).catch((e) => toast.error(tr(e))); }} />
      <ConfirmDialog open={clearAll} onClose={() => setClearAll(false)} destructive title={t("cf.clearHist.t")} body={t("cf.clearHist.b")} confirmLabel={t("hi.clearAll")} onConfirm={clear} />
    </div>
  );
}
