import { useEffect, useState } from "react";
import { ListMusic, ListPlus, X } from "lucide-react";
import { Sheet } from "./ui/Overlay";
import { Button } from "./ui/Button";
import { CheckBox } from "./ui/Controls";
import { LoadingIndicator } from "./ui/Progress";
import { invoke, fmtTime, type PlaylistData, type SearchItem } from "../lib/tauri";
import { useI18n } from "../lib/i18n";

export function PlaylistSheet({ open, url, onClose, onAdd }: { open: boolean; url: string; onClose: () => void; onAdd: (items: SearchItem[]) => void }) {
  const { t, tr } = useI18n();
  const [data, setData] = useState<PlaylistData | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    let live = true;
    setData(null); setErr("");
    invoke<PlaylistData>("fetch_playlist", { url })
      .then((d) => { if (live) { setData(d); setSel(new Set(d.entries.map((e) => e.id))); } })
      .catch((e) => live && setErr(tr(e)));
    return () => { live = false; };
  }, [open, url]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = data?.entries ?? [];
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <Sheet open={open} onClose={onClose} icon={ListMusic} title={data?.title || t("pl.title")} subtitle={data ? t("pl.selected", { n: sel.size, m: all.length }) : undefined}
      footer={<>
        <Button variant="errorTonal" icon={X} onClick={onClose}>{t("b.cancel")}</Button>
        <Button icon={ListPlus} disabled={!sel.size} onClick={() => { onAdd(all.filter((e) => sel.has(e.id))); onClose(); }}>{t("pl.add", { n: sel.size })}</Button>
      </>}>
      {!data && !err && <div className="flex items-center gap-3 py-8 text-on-surface-variant"><LoadingIndicator />{t("pl.loading")}</div>}
      {err && <p className="selectable rounded-m3-md bg-error-container p-4 text-sm text-on-error-container">{err}</p>}
      {data && <>
        <div className="mb-2 flex gap-2">
          <Button variant="text" size="sm" onClick={() => setSel(new Set(all.map((e) => e.id)))}>{t("b.selectAll")}</Button>
          <Button variant="text" size="sm" onClick={() => setSel(new Set())}>{t("b.selectNone")}</Button>
        </div>
        <ul className="flex flex-col gap-1">
          {all.map((e, i) => (
            <li key={e.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
              <button type="button" onClick={() => toggle(e.id)} className="state-layer flex w-full items-center gap-3 rounded-m3-md p-2 text-left">
                <CheckBox checked={sel.has(e.id)} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{e.title}</span><span className="t-small block truncate text-on-surface-variant">{e.channel}</span></span>
                <span className="t-small text-on-surface-variant">{fmtTime(e.duration)}</span>
              </button>
            </li>
          ))}
        </ul>
      </>}
    </Sheet>
  );
}
