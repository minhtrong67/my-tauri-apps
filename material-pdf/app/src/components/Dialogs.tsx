import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, Bot, Check, Code2, Combine, FileText, FolderOpen, Globe, ImagePlus, Info, LayoutDashboard, Lock, Maximize2, Monitor,
  Moon, RotateCcw, RotateCw, Save, Scissors, Settings as Gear, Sun, Trash2, Undo2, User, X, Plus, Scale, Languages, Palette, Type as TypeIcon,
} from "lucide-react";
import { applyPageOps, imagesToPdf, mergePdfs, parseRanges, setMetadata, uid } from "../lib/pdf";
import { closeDoc, currentBytes, openBytes, replaceBytes, saveDoc } from "../lib/actions";
import { baseName, pickFiles, pickFolder, saveAs, writeMany, isTauri, type PickedFile } from "../lib/native";
import { PALETTE, withThemeTransition } from "../lib/theme";
import { setStartupMode, destroyWindow } from "../lib/window";
import { toast, useDoc, useStore, useT, type Doc, type Settings } from "../lib/store";
import { Button, Dialog, Field, fmtSize, IconButton, Segmented, Switch } from "./ui";
import { Thumb } from "./Thumb";
import { FONTS } from "../lib/fonts";
import { Logo } from "./Logo";

export const APP_VERSION = "1.1.0";

/* ---------------- Settings ---------------- */
function Row({ title, desc, children, stack }: { title: string; desc?: string; children: React.ReactNode; stack?: boolean }) {
  return (
    <div className={`srow ${stack ? "stack" : ""}`}>
      <div className="srow-text"><b>{title}</b>{desc && <small>{desc}</small>}</div>
      <div className="srow-ctl">{children}</div>
    </div>
  );
}

function SettingsDialog() {
  const t = useT();
  const { settings: s, setSettings, resetSettings, closeDialog } = useStore();
  const [tab, setTab] = useState<"look" | "text" | "win">("look");
  const set = (p: Partial<Settings>, e?: React.MouseEvent) =>
    p.themeMode || p.seed ? withThemeTransition(() => setSettings(p), e && { x: e.clientX, y: e.clientY }, s.animations) : setSettings(p);
  const tabs = [
    { id: "look" as const, icon: <Palette size={20} />, label: t("tabAppearance") },
    { id: "text" as const, icon: <TypeIcon size={20} />, label: t("tabText") },
    { id: "win" as const, icon: <Maximize2 size={20} />, label: t("tabWindow") },
  ];
  return (
    <Dialog title={t("settings")} icon={<Gear size={24} />} onClose={closeDialog} wide
      actions={<><Button variant="text" icon={<RotateCcw size={18} />} onClick={() => { resetSettings(); setStartupMode("remember"); }}>{t("resetSettings")}</Button><Button variant="filled" icon={<Check size={18} />} onClick={closeDialog}>{t("done")}</Button></>}>
      <div className="set-layout">
        <nav className="set-nav" role="tablist">
          {tabs.map((x) => (
            <button key={x.id} role="tab" aria-selected={tab === x.id} className={`set-tab ripple ${tab === x.id ? "on" : ""}`} onClick={() => setTab(x.id)}>{x.icon}<span>{x.label}</span></button>
          ))}
        </nav>
        <div className="set-panel" key={tab}>
          {tab === "look" && <>
            <Row title={t("theme")} desc={t("themeDesc")}>
              <Segmented value={s.themeMode} onChange={(v, e) => set({ themeMode: v }, e)}
                options={[{ value: "light", label: t("light"), icon: <Sun size={16} /> }, { value: "dark", label: t("dark"), icon: <Moon size={16} /> }, { value: "system", label: t("system"), icon: <Monitor size={16} /> }]} />
            </Row>
            <Row title={t("themeColor")} desc={t("themeColorDesc")} stack>
              <div className="palette">
                {PALETTE.map((c) => (
                  <button key={c.id} className={`pal ripple ${s.seed === c.hex ? "on" : ""}`} style={{ background: c.hex }} aria-label={c.id} data-tip={c.id} onClick={(e) => set({ seed: c.hex }, e)}>
                    {s.seed === c.hex && <Check size={16} color="#fff" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </Row>
            <Row title={t("animations")} desc={t("animationsDesc")}><Switch checked={s.animations} onChange={(v) => set({ animations: v })} label={t("animations")} /></Row>
          </>}
          {tab === "text" && <>
            <Row title={t("fontFamily")} desc={t("fontFamilyDesc")} stack>
              <div className="font-grid" role="radiogroup">
                {FONTS.map((f) => (
                  <button key={f.id} role="radio" aria-checked={s.font === f.id} className={`font-card ripple ${s.font === f.id ? "on" : ""}`} onClick={() => set({ font: f.id })}>
                    <span className="font-aa" style={{ fontFamily: f.stack }}>{t("fontPreview")}</span>
                    <b style={{ fontFamily: f.stack }}>{f.id === "system" ? t("fontSystem") : f.label}</b>
                    {s.font === f.id && <Check size={16} className="font-check" />}
                  </button>
                ))}
              </div>
            </Row>
            <Row title={t("fontSize")} desc={t("fontSizeDesc")}>
              <Segmented value={s.fontSize} onChange={(v) => set({ fontSize: v })} options={[{ value: "small", label: t("small") }, { value: "medium", label: t("medium") }, { value: "large", label: t("large") }]} />
            </Row>
            <Row title={t("language")} desc={t("languageDesc")}>
              <Segmented value={s.lang} onChange={(v) => set({ lang: v })} options={[{ value: "auto", label: t("auto") }, { value: "en", label: t("english") }, { value: "vi", label: t("vietnamese") }]} />
            </Row>
          </>}
          {tab === "win" && <>
            <Row title={t("startup")} desc={t("startupDesc")} stack>
              <div className="radio-cards">
                {([["remember", t("startupRemember"), t("startupRememberDesc")], ["maximize", t("startupMax"), t("startupMaxDesc")]] as const).map(([v, a, b]) => (
                  <button key={v} className={`radio-card ripple ${s.startup === v ? "on" : ""}`} role="radio" aria-checked={s.startup === v} onClick={() => { set({ startup: v }); setStartupMode(v); }}>
                    <span className="rd" /><span><b>{a}</b><small>{b}</small></span>
                  </button>
                ))}
              </div>
            </Row>
            <Row title={t("defaultZoom")} desc={t("defaultZoomDesc")}>
              <Segmented value={s.defaultFit} onChange={(v) => set({ defaultFit: v })} options={[{ value: "width", label: t("zoomFitWidth") }, { value: "page", label: t("zoomFitPage") }, { value: "100", label: t("zoom100") }]} />
            </Row>
            <Row title={t("nightDefault")} desc={t("nightDefaultDesc")}><Switch checked={s.nightPages} onChange={(v) => set({ nightPages: v })} label={t("nightDefault")} /></Row>
          </>}
        </div>
      </div>
    </Dialog>
  );
}

/* ---------------- About ---------------- */
function AboutDialog() {
  const t = useT();
  const close = useStore((s) => s.closeDialog);
  return (
    <Dialog title={t("about")} icon={<Info size={24} />} onClose={close}>
      <div className="about">
        <Logo size={88} />
        <h2>{t("appName")}</h2>
        <p className="muted">{t("aboutDesc")}</p>
        <div className="chips"><span className="chip">{t("version")} {APP_VERSION}</span><span className="chip"><Scale size={14} /> MIT</span><span className="chip"><Code2 size={14} /> {t("openSource")}</span></div>
        <div className="about-list">
          <div><User size={18} /><span>{t("author")}</span><b>minhtrong67</b></div>
          <div><Bot size={18} /><span>{t("aiSupport")}</span><b>Claude</b></div>
          <div><Globe size={18} /><span>{t("madeWith")}</span><b>Tauri · React · pdf.js</b></div>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------------- Password / unsaved / quit ---------------- */
function PasswordDialog({ file, wrong }: { file: PickedFile; wrong: boolean }) {
  const t = useT();
  const { closeDialog } = useStore();
  const [pw, setPw] = useState("");
  const go = async () => { if (await openBytes(file, pw)) closeDialog(); else setPw(""); };
  return (
    <Dialog title={t("password")} icon={<Lock size={24} />} onClose={closeDialog}
      actions={<><Button variant="cancel" icon={<X size={18} />} onClick={closeDialog}>{t("cancel")}</Button><Button variant="filled" icon={<Lock size={18} />} onClick={go} disabled={!pw}>{t("unlock")}</Button></>}>
      <p>{t("passwordNeeded")}</p>
      <Field label={t("password")}><input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pw && go()} /></Field>
      {wrong && <p className="error-text">{t("wrongPassword")}</p>}
    </Dialog>
  );
}
function UnsavedDialog({ id }: { id: string }) {
  const t = useT();
  const { docs, closeDialog, removeDoc } = useStore();
  const doc = docs.find((d) => d.id === id);
  if (!doc) return null;
  return (
    <Dialog title={t("unsavedTitle")} icon={<Save size={24} />} onClose={closeDialog}
      actions={<>
        <Button variant="cancel" icon={<X size={18} />} onClick={closeDialog}>{t("cancel")}</Button>
        <Button variant="tonal" icon={<Trash2 size={18} />} onClick={() => { closeDialog(); removeDoc(id); }}>{t("discard")}</Button>
        <Button variant="filled" icon={<Save size={18} />} onClick={async () => { if (await saveDoc(doc)) { closeDialog(); removeDoc(id); } }}>{t("save")}</Button></>}>
      <p>{t("unsavedBody", { name: doc.name })}</p>
    </Dialog>
  );
}
function QuitDialog() {
  const t = useT();
  const close = useStore((s) => s.closeDialog);
  return (
    <Dialog title={t("quitTitle")} icon={<Info size={24} />} onClose={close}
      actions={<><Button variant="cancel" icon={<X size={18} />} onClick={close}>{t("cancel")}</Button><Button variant="filled" icon={<Check size={18} />} onClick={() => destroyWindow()}>{t("quit")}</Button></>}>
      <p>{t("quitBody")}</p>
    </Dialog>
  );
}

/* ---------------- File list helper ---------------- */
interface Item { id: string; name: string; bytes: Uint8Array; url?: string }
function FileList({ items, setItems }: { items: Item[]; setItems: (i: Item[]) => void }) {
  const t = useT();
  const move = (i: number, d: number) => { const a = [...items]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setItems(a); };
  return (
    <ul className="file-list">
      {items.map((it, i) => (
        <li key={it.id}>
          {it.url ? <img src={it.url} alt="" /> : <FileText size={20} />}
          <span className="fl-name">{it.name}</span><small>{fmtSize(it.bytes.length)}</small>
          <IconButton size="sm" icon={<ArrowUp size={16} />} label={t("moveUp")} onClick={() => move(i, -1)} disabled={i === 0} />
          <IconButton size="sm" icon={<ArrowDown size={16} />} label={t("moveDown")} onClick={() => move(i, 1)} disabled={i === items.length - 1} />
          <IconButton size="sm" icon={<Trash2 size={16} />} label={t("remove")} onClick={() => setItems(items.filter((x) => x.id !== it.id))} />
        </li>
      ))}
    </ul>
  );
}
async function finishPdf(name: string, bytes: Uint8Array) {
  const res = await saveAs(name, bytes);
  if (res) await openBytes({ path: isTauri ? res : null, name: baseName(res), bytes });
  return !!res;
}

/* ---------------- Merge ---------------- */
function MergeDialog() {
  const t = useT();
  const doc = useDoc();
  const { closeDialog } = useStore();
  const [items, setItems] = useState<Item[]>(() => (doc ? [{ id: uid(), name: doc.name, bytes: doc.bytes }] : []));
  const [busy, setBusy] = useState(false);
  const add = async () => setItems([...items, ...(await pickFiles("pdf", true)).map((f) => ({ id: uid(), name: f.name, bytes: f.bytes }))]);
  const run = async () => {
    setBusy(true);
    try { const out = await mergePdfs(items.map((i) => i.bytes)); if (await finishPdf("merged.pdf", out)) { toast("merged", { n: items.length }); closeDialog(); } }
    catch (e) { console.error(e); toast("saveFailed"); }
    setBusy(false);
  };
  return (
    <Dialog title={t("merge")} icon={<Combine size={24} />} onClose={closeDialog} wide
      actions={<><Button variant="cancel" icon={<X size={18} />} onClick={closeDialog}>{t("cancel")}</Button><Button variant="filled" icon={<Combine size={18} />} onClick={run} disabled={items.length < 2 || busy}>{t("mergeNow")}</Button></>}>
      <p className="muted">{t("mergeDesc")}</p>
      <FileList items={items} setItems={setItems} />
      {items.length < 2 && <p className="hint">{t("needTwo")}</p>}
      <Button variant="tonal" icon={<Plus size={18} />} onClick={add}>{t("addFiles")}</Button>
    </Dialog>
  );
}

/* ---------------- Images to PDF ---------------- */
function ImagesDialog() {
  const t = useT();
  const { closeDialog } = useStore();
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<"fit" | "a4">("a4");
  const [margin, setMargin] = useState(24);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => items.forEach((i) => i.url && URL.revokeObjectURL(i.url)), []);
  const add = async () => setItems([...items, ...(await pickFiles("image", true)).map((f) => ({ id: uid(), name: f.name, bytes: f.bytes, url: URL.createObjectURL(new Blob([f.bytes as BlobPart])) }))]);
  const run = async () => {
    setBusy(true);
    try { const out = await imagesToPdf(items, mode, margin); if (await finishPdf("images.pdf", out)) { toast("imagesDone", { n: items.length }); closeDialog(); } }
    catch (e) { console.error(e); toast("saveFailed"); }
    setBusy(false);
  };
  return (
    <Dialog title={t("imagesToPdf")} icon={<ImagePlus size={24} />} onClose={closeDialog} wide
      actions={<><Button variant="cancel" icon={<X size={18} />} onClick={closeDialog}>{t("cancel")}</Button><Button variant="filled" icon={<ImagePlus size={18} />} onClick={run} disabled={!items.length || busy}>{t("createPdf")}</Button></>}>
      <p className="muted">{t("imagesDesc")}</p>
      <FileList items={items} setItems={setItems} />
      {!items.length && <p className="hint">{t("needOne")}</p>}
      <Button variant="tonal" icon={<Plus size={18} />} onClick={add}>{t("addImages")}</Button>
      <div className="set-row"><span>{t("pageSize")}</span><Segmented value={mode} onChange={setMode} options={[{ value: "a4", label: t("a4") }, { value: "fit", label: t("fitImage") }]} /></div>
      {mode === "a4" && <div className="set-row"><span>{t("margin")}</span><label className="range"><input type="range" min={0} max={72} value={margin} onChange={(e) => setMargin(+e.target.value)} /><b>{margin}</b></label></div>}
    </Dialog>
  );
}

/* ---------------- Split / extract ---------------- */
function SplitDialog({ doc }: { doc: Doc }) {
  const t = useT();
  const { closeDialog } = useStore();
  const [mode, setMode] = useState<"one" | "each" | "every">("one");
  const [ranges, setRanges] = useState(`1-${doc.numPages}`);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = doc.name.replace(/\.pdf$/i, "");
  const run = async () => {
    setBusy(true); setErr(false);
    try {
      const src = await currentBytes(doc);
      const groups = mode === "every" ? Array.from({ length: doc.numPages }, (_, i) => [i]) : parseRanges(ranges, doc.numPages);
      if (mode === "one") {
        const out = await applyPageOps(src, groups.flat().map((i) => ({ src: i, rot: 0 })));
        if (await saveAs(`${base}-extract.pdf`, out)) { toast("splitDone", { n: 1 }); closeDialog(); }
      } else {
        const folder = isTauri ? await pickFolder() : null;
        if (isTauri && !folder) { setBusy(false); return; }
        const files = [];
        for (let k = 0; k < groups.length; k++)
          files.push({ name: `${base}-${String(k + 1).padStart(3, "0")}.pdf`, bytes: await applyPageOps(src, groups[k].map((i) => ({ src: i, rot: 0 }))), mime: "application/pdf" });
        await writeMany(folder, files);
        toast("splitDone", { n: files.length }); closeDialog();
      }
    } catch (e: any) { if (e?.message === "range") setErr(true); else { console.error(e); toast("saveFailed"); } }
    setBusy(false);
  };
  return (
    <Dialog title={t("split")} icon={<Scissors size={24} />} onClose={closeDialog}
      actions={<><Button variant="cancel" icon={<X size={18} />} onClick={closeDialog}>{t("cancel")}</Button><Button variant="filled" icon={<Scissors size={18} />} onClick={run} disabled={busy}>{t("extract")}</Button></>}>
      <p className="muted">{t("splitDesc")}</p>
      <div className="radio-cards col">
        {([["one", t("oneFileRanges")], ["each", t("filePerRange")], ["every", t("everyPage")]] as const).map(([v, l]) => (
          <button key={v} className={`radio-card ripple ${mode === v ? "on" : ""}`} role="radio" aria-checked={mode === v} onClick={() => setMode(v)}><span className="rd" /><span><b>{l}</b></span></button>
        ))}
      </div>
      {mode !== "every" && <Field label={`${t("ranges")} (${t("rangesHint")})`}><input value={ranges} onChange={(e) => { setRanges(e.target.value); setErr(false); }} className={err ? "invalid" : ""} /></Field>}
      {err && <p className="error-text">{t("invalidRange")}</p>}
    </Dialog>
  );
}

/* ---------------- Organize pages ---------------- */
function OrganizeDialog({ doc }: { doc: Doc }) {
  const t = useT();
  const { closeDialog } = useStore();
  const [pages, setPages] = useState(() => doc.sizes.map((_, i) => ({ id: i, src: i, rot: 0, del: false })));
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const patch = (i: number, p: Partial<(typeof pages)[0]>) => setPages(pages.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const drop = (to: number) => {
    if (drag == null || drag === to) return;
    const a = [...pages]; const [m] = a.splice(drag, 1); a.splice(to, 0, m); setPages(a);
  };
  const kept = pages.filter((p) => !p.del);
  const run = async () => {
    if (!kept.length) return toast("keepOne");
    setBusy(true);
    try {
      const out = await applyPageOps(await currentBytes(doc), kept.map((p) => ({ src: p.src, rot: p.rot })));
      closeDialog(); await replaceBytes(doc, out); toast("pagesApplied");
    } catch (e) { console.error(e); toast("encryptedEdit"); }
    setBusy(false);
  };
  return (
    <Dialog title={t("organize")} icon={<LayoutDashboard size={24} />} onClose={closeDialog} wide
      actions={<><Button variant="cancel" icon={<X size={18} />} onClick={closeDialog}>{t("cancel")}</Button><Button variant="filled" icon={<Check size={18} />} onClick={run} disabled={busy}>{t("apply")}</Button></>}>
      <p className="muted">{t("organizeHint")}</p>
      <div className="org-grid">
        {pages.map((p, i) => {
          const sz = doc.sizes[p.src]; if (!sz) return null; const swap = p.rot % 180 !== 0, tw = 96, th = (sz.h / sz.w) * tw;
          return (
            <div key={p.id} className={`org-card ${p.del ? "del" : ""} ${over === i && drag !== i ? "over" : ""} ${drag === i ? "dragging" : ""}`} draggable
              onDragStart={() => setDrag(i)} onDragEnd={() => { setDrag(null); setOver(null); }} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDrop={() => { drop(i); setOver(null); }}>
              <div className="org-thumb" style={{ width: Math.max(tw, th) + 8, height: Math.max(tw, th) + 8 }}>
                <div style={{ transform: `rotate(${p.rot}deg)`, transition: "transform .3s var(--ease)", width: swap ? th : tw, height: swap ? tw : th }}>
                  <Thumb pdf={doc.pdf} page={p.src + 1} width={tw} size={sz} rev={doc.rev} />
                </div>
              </div>
              <div className="org-actions">
                <span className="org-n">{i + 1}</span>
                <IconButton size="sm" icon={<RotateCcw size={15} />} label={t("rotateLeft")} onClick={() => patch(i, { rot: (p.rot + 270) % 360 })} />
                <IconButton size="sm" icon={<RotateCw size={15} />} label={t("rotateRight")} onClick={() => patch(i, { rot: (p.rot + 90) % 360 })} />
                <IconButton size="sm" icon={p.del ? <Undo2 size={15} /> : <Trash2 size={15} />} label={p.del ? t("restorePage") : t("delete")} onClick={() => patch(i, { del: !p.del })} />
              </div>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

/* ---------------- Properties ---------------- */
function PropsDialog({ doc }: { doc: Doc }) {
  const t = useT();
  const { closeDialog } = useStore();
  const [m, setM] = useState({ title: "", author: "", subject: "", keywords: "" });
  const [info, setInfo] = useState<Record<string, any>>({});
  useEffect(() => {
    doc.pdf.getMetadata().then((r) => {
      const i: any = r.info ?? {};
      setInfo(i);
      setM({ title: i.Title ?? "", author: i.Author ?? "", subject: i.Subject ?? "", keywords: i.Keywords ?? "" });
    });
  }, [doc.pdf]);
  const dims = useMemo(() => { const s = doc.sizes[0]; return `${Math.round((s.w / 72) * 25.4)} × ${Math.round((s.h / 72) * 25.4)} mm`; }, [doc.sizes]);
  const date = (s?: string) => { const x = /D:(\d{4})(\d\d)(\d\d)/.exec(s ?? ""); return x ? `${x[1]}-${x[2]}-${x[3]}` : "—"; };
  const save = async () => {
    try { await replaceBytes(doc, await setMetadata(await currentBytes(doc), m)); toast("metaSaved"); closeDialog(); } catch { toast("encryptedEdit"); }
  };
  return (
    <Dialog title={t("properties")} icon={<FileText size={24} />} onClose={closeDialog}
      actions={<><Button variant="cancel" icon={<X size={18} />} onClick={closeDialog}>{t("cancel")}</Button><Button variant="filled" icon={<Save size={18} />} onClick={save}>{t("saveMetadata")}</Button></>}>
      <div className="props-grid">
        <div><span>{t("fileSize")}</span><b>{fmtSize(doc.bytes.length)}</b></div>
        <div><span>{t("pages")}</span><b>{doc.numPages}</b></div>
        <div><span>{t("pageDims")}</span><b>{dims}</b></div>
        <div><span>{t("pdfVersion")}</span><b>{info.PDFFormatVersion ?? "—"}</b></div>
        <div><span>{t("created")}</span><b>{date(info.CreationDate)}</b></div>
        <div><span>{t("modified")}</span><b>{date(info.ModDate)}</b></div>
        <div className="span2"><span>{t("creator")} / {t("producer")}</span><b>{[info.Creator, info.Producer].filter(Boolean).join(" · ") || "—"}</b></div>
        {doc.path && <div className="span2"><span>{t("location")}</span><b className="wrap">{doc.path}</b></div>}
      </div>
      <Field label={t("title")}><input value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} /></Field>
      <Field label={t("authorField")}><input value={m.author} onChange={(e) => setM({ ...m, author: e.target.value })} /></Field>
      <Field label={t("subject")}><input value={m.subject} onChange={(e) => setM({ ...m, subject: e.target.value })} /></Field>
      <Field label={t("keywords")}><input value={m.keywords} onChange={(e) => setM({ ...m, keywords: e.target.value })} /></Field>
    </Dialog>
  );
}

export function DialogHost() {
  const { dialog } = useStore();
  const doc = useDoc();
  if (!dialog) return null;
  const p = dialog.props ?? {};
  switch (dialog.kind) {
    case "settings": return <SettingsDialog />;
    case "about": return <AboutDialog />;
    case "password": return <PasswordDialog file={p.file} wrong={p.wrong} />;
    case "unsaved": return <UnsavedDialog id={p.id} />;
    case "quit": return <QuitDialog />;
    case "merge": return <MergeDialog />;
    case "images": return <ImagesDialog />;
    case "split": return doc ? <SplitDialog doc={doc} /> : null;
    case "organize": return doc ? <OrganizeDialog doc={doc} /> : null;
    case "props": return doc ? <PropsDialog doc={doc} /> : null;
    default: return null;
  }
}
void closeDoc; void FolderOpen;
