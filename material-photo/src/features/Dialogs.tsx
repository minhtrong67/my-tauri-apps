import { useEffect, useMemo, useState } from "react";
import { Copy, Rows3, Search, Trash2, X, Check, Files, Loader2 } from "lucide-react";
import { createStore } from "../lib/createStore";
import { app, confirmDialog, t, toast, useApp, useT } from "../lib/store";
import { api } from "../lib/tauri";
import { batchRename, buildName, deleteFiles, findEntry, refresh } from "../lib/actions";
import { Modal } from "../components/Overlays";
import { Btn, EmptyState, Spinner } from "../components/ui";
import { baseName, fmtSize } from "../lib/utils";
import { src } from "../lib/tauri";

const batch = createStore<{ paths: string[] | null }>({ paths: null });
export const openBatchRename = (paths: string[]) => batch.set({ paths });

export function BatchRenameDialog() {
  const tt = useT();
  const paths = batch.use((s) => s.paths);
  const last = useMemo(() => paths ?? [], [paths]);
  const [pattern, setPattern] = useState("{name}_{n}");
  const [start, setStart] = useState(1);
  const [digits, setDigits] = useState(2);
  const close = () => batch.set({ paths: null });
  const names = last.slice(0, 6).map((p, i) => {
    const n = baseName(p), ext = n.includes(".") ? "." + n.split(".").pop() : "";
    return [n, buildName(pattern, n, start + i, digits) + ext];
  });
  return (
    <Modal open={!!paths} onClose={close} title={tt("br.title")} icon={Rows3} width={520}
      actions={<>
        <Btn kind="tonal" icon={X} onClick={close}>{tt("cancel")}</Btn>
        <Btn kind="filled" icon={Check} disabled={!pattern.trim()} onClick={async () => { close(); await batchRename(last, pattern.trim(), start, digits); app.set({ selection: [], selecting: false }); }}>{tt("br.apply", { n: last.length })}</Btn>
      </>}>
      <div className="space-y-4">
        <label className="block"><span className="text-sm font-medium text-on-surface-variant">{tt("br.pattern")}</span><input data-autofocus className="field mt-1.5" value={pattern} onChange={(e) => setPattern(e.target.value)} /></label>
        <p className="text-xs text-on-surface-variant -mt-2">{tt("br.hint")}</p>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="text-sm font-medium text-on-surface-variant">{tt("br.start")}</span><input type="number" min={0} className="field mt-1.5" value={start} onChange={(e) => setStart(Math.max(0, +e.target.value || 0))} /></label>
          <label><span className="text-sm font-medium text-on-surface-variant">{tt("br.digits")}</span><input type="number" min={1} max={8} className="field mt-1.5" value={digits} onChange={(e) => setDigits(Math.min(8, Math.max(1, +e.target.value || 1)))} /></label>
        </div>
        <div><div className="text-sm font-bold mb-2">{tt("br.preview")}</div>
          <ul className="rounded-2xl bg-surface-low divide-y divide-outline-variant/40 text-sm overflow-hidden">{names.map(([a, b]) => <li key={a} className="px-4 py-2 flex items-center gap-2 min-w-0"><span className="truncate text-on-surface-variant flex-1">{a}</span><span>→</span><span className="truncate font-semibold flex-1 text-right">{b}</span></li>)}</ul></div>
      </div>
    </Modal>
  );
}

export function DuplicatesDialog() {
  const tt = useT();
  const open = useApp((s) => s.dupOpen);
  const entries = useApp((s) => s.entries);
  const [groups, setGroups] = useState<string[][] | null>(null);
  useEffect(() => {
    if (!open) return;
    setGroups(null);
    api.duplicates(entries.map((e) => e.path)).then((g) => { setGroups(g); toast(g.length ? "info" : "success", g.length ? t("toast.found.n", { n: g.length }) : t("toast.noDup")); }).catch((e) => { setGroups([]); toast("error", t("toast.error", { msg: String(e) })); });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const extras = (groups ?? []).flatMap((g) => g.slice(1));
  const saved = extras.reduce((a, p) => a + (findEntry(p)?.size ?? 0), 0);
  const close = () => app.set({ dupOpen: false });
  return (
    <Modal open={open} onClose={close} title={tt("dup.title")} icon={Files} width={640} tall
      actions={<>
        <Btn kind="tonal" icon={X} onClick={close}>{tt("close")}</Btn>
        {extras.length > 0 && <Btn kind="danger" icon={Trash2} onClick={async () => {
          if (!(await confirmDialog({ title: tt("dup.trash"), desc: tt("dup.confirm", { n: extras.length }), confirm: tt("del.confirm"), kind: "danger", icon: Trash2 }))) return;
          for (const p of extras) { try { await api.remove(p); } catch { /* skip */ } }
          toast("success", t("dup.moved", { n: extras.length })); close(); refresh(true);
        }}>{tt("dup.trash")}</Btn>}
      </>}>
      {groups === null ? <div className="py-16 grid place-items-center gap-3 text-on-surface-variant"><Spinner size={34} /><span className="text-sm font-medium">{tt("dup.scan")}</span></div>
        : groups.length === 0 ? <EmptyState icon={Search} title={tt("dup.none")} desc={tt("dup.none.d")} />
        : (<div className="space-y-4 pt-1"><p className="text-sm text-on-surface-variant font-medium">{tt("dup.found", { n: groups.length })} · {tt("dup.recover", { size: fmtSize(saved) })}</p>
          {groups.map((g, i) => (
            <div key={i} className="rounded-[24px] bg-surface-low p-3"><div className="text-xs font-bold text-primary mb-2 px-1">{tt("dup.group", { n: i + 1 })}</div>
              <div className="flex gap-2 overflow-x-auto">{g.map((p, k) => (<div key={p} className="shrink-0 w-28"><div className={`aspect-square rounded-2xl overflow-hidden bg-surface-high ${k === 0 ? "ring-2 ring-primary" : "opacity-80"}`}><img src={src(p)} className="size-full object-cover" loading="lazy" alt="" /></div><div className="text-[.7rem] mt-1 truncate font-medium">{baseName(p)}</div>{k === 0 && <div className="text-[.65rem] font-bold text-primary">{tt("dup.keepFirst")}</div>}</div>))}</div></div>
          ))}</div>)}
    </Modal>
  );
}
