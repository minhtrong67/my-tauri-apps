import { useEffect, useState } from "react";
import { TextBulletListAdd20Regular } from "@fluentui/react-icons";
import { SidePanel } from "./ui/Overlay";
import { Button } from "./ui/Button";
import { CheckBox } from "./ui/Controls";
import { ProgressRing } from "./ui/Progress";
import { InfoBar } from "./ui/InfoBar";
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
    <SidePanel open={open} onClose={onClose} title={data?.title || t("pl.title")} subtitle={data ? t("pl.selected", { n: sel.size, m: all.length }) : undefined}
      footer={<>
        <Button onClick={onClose}>{t("b.cancel")}</Button>
        <Button variant="accent" icon={TextBulletListAdd20Regular} disabled={!sel.size} onClick={() => { onAdd(all.filter((e) => sel.has(e.id))); onClose(); }}>{t("pl.add", { n: sel.size })}</Button>
      </>}>
      {!data && !err && <div className="flex items-center gap-3 px-2 py-8 text-fg-2"><ProgressRing size={24} />{t("pl.loading")}</div>}
      {err && <InfoBar severity="error" selectable className="m-2">{err}</InfoBar>}
      {data && <>
        <div className="mb-1 flex gap-1 px-1">
          <Button variant="link" size="sm" onClick={() => setSel(new Set(all.map((e) => e.id)))}>{t("b.selectAll")}</Button>
          <Button variant="link" size="sm" onClick={() => setSel(new Set())}>{t("b.selectNone")}</Button>
        </div>
        <ul className="flex flex-col gap-0.5">
          {all.map((e, i) => (
            <li key={e.id} className="animate-enter" style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}>
              <button type="button" onClick={() => toggle(e.id)} className="flex w-full items-center gap-3 rounded-ctl p-2 text-left hover:bg-hov active:bg-prs">
                <CheckBox checked={sel.has(e.id)} />
                <span className="min-w-0 flex-1"><span className="block truncate text-body">{e.title}</span><span className="block truncate text-cap text-fg-2">{e.channel}</span></span>
                <span className="text-cap text-fg-2">{fmtTime(e.duration)}</span>
              </button>
            </li>
          ))}
        </ul>
      </>}
    </SidePanel>
  );
}
