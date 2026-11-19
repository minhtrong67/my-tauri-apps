import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open, save } from "@tauri-apps/plugin-dialog";
import { AlertCircle, CheckCircle2, FolderPlus, Download, RotateCcw, Settings as Gear, Wand2, X, Eraser, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { api, type Item } from "./lib/api";
import { buildIco, downscale, toBase64 } from "./lib/ico";
import { luminance, renderDesign } from "./lib/render";
import { applyEffect, applyNativeTheme, applyStartup, inTauri, loadSettings, saveSettings, type Settings } from "./lib/settings";
import { loadPresets, normalizeDesign, savePresets } from "./lib/presets";
import { defaultDesign, type Design, type Preset } from "./lib/types";
import { LangCtx, Segmented, useT } from "./components/ui";
import FolderSidebar, { type SideTab } from "./components/FolderSidebar";
import FolderPanel from "./components/FolderPanel";
import IconPanel from "./components/IconPanel";
import TextPanel from "./components/TextPanel";
import PresetPanel from "./components/PresetPanel";
import SettingsDialog from "./components/SettingsDialog";

const HIST_KEY = "ffi.history";
function loadHist(): Item[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HIST_KEY) || "[]") as { path: string; name: string }[];
    return raw.map((h) => ({ path: h.path, name: h.name, isDir: true, customized: true, sel: false }));
  } catch {
    return [];
  }
}
type Tab = "folder" | "icon" | "text" | "presets";
type Toast = { kind: "ok" | "err"; text: string } | null;

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  return (
    <LangCtx.Provider value={settings.lang}>
      <Shell settings={settings} setSettings={setSettings} />
    </LangCtx.Provider>
  );
}

function Shell({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  const t = useT();
  const [design, setDesign] = useState<Design>(defaultDesign);
  const [items, setItems] = useState<Item[]>([]);
  const [hist, setHist] = useState<Item[]>(loadHist);
  const [sideTab, setSideTab] = useState<SideTab>("list");
  const [tab, setTab] = useState<Tab>("folder");
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [presets, setPresets] = useState<Preset[]>(loadPresets);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const lastKey = useRef("");
  const [dragging, setDragging] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [sysDark, setSysDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);

  const dark = settings.theme === "dark" || (settings.theme === "system" && sysDark);
  const selected = useMemo(() => (sideTab === "list" ? items : hist).filter((i) => i.sel), [items, hist, sideTab]);

  // ---- theme / accent / backdrop
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const h = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  useEffect(() => {
    const r = document.documentElement;
    r.classList.toggle("dark", dark);
    r.dataset.effect = settings.effect;
    r.style.setProperty("--accent", settings.accent);
    r.style.setProperty("--on-accent", luminance(settings.accent) > 0.62 ? "#000000" : "#ffffff");
    saveSettings(settings);
  }, [settings, dark]);
  useEffect(() => { applyNativeTheme(settings.theme); }, [settings.theme]);
  useEffect(() => {
    applyEffect(settings.effect, dark).then((err) => err && setToast({ kind: "err", text: t("effectFailed", { name: settings.effect, err }) }));
  }, [settings.effect, dark]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { applyStartup(settings.startup); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { savePresets(presets); }, [presets]);

  // ---- live preview: drawn straight onto canvases (no PNG encoding), one render per frame
  useEffect(() => {
    let off = false;
    const id = requestAnimationFrame(() => {
      renderDesign(design, 576).then((big) => {
        if (off) return;
        const pc = previewRef.current;
        if (pc) {
          const g = pc.getContext("2d")!;
          g.clearRect(0, 0, pc.width, pc.height);
          g.drawImage(big, 0, 0);
          const key = [design.style, design.fill, design.pattern, design.icon.enabled, design.icon.kind, design.icon.name, design.icon.badge, design.text.enabled].join("|");
          if (key !== lastKey.current) {
            if (lastKey.current) pc.animate([{ transform: "scale(.92)" }, { transform: "scale(1.04)", offset: 0.6 }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
            lastKey.current = key;
          }
        }
        for (const sz of [64, 48, 32, 16]) {
          const el = thumbRefs.current[sz];
          if (!el) continue;
          const g = el.getContext("2d")!;
          g.clearRect(0, 0, el.width, el.height);
          g.drawImage(downscale(big, sz * 2), 0, 0);
        }
      });
    });
    return () => { off = true; cancelAnimationFrame(id); };
  }, [design]);

  // ---- pause decorative animation while the window is in the background
  useEffect(() => {
    const set = () => { document.documentElement.dataset.idle = String(document.hidden || !document.hasFocus()); };
    set();
    addEventListener("focus", set);
    addEventListener("blur", set);
    document.addEventListener("visibilitychange", set);
    return () => { removeEventListener("focus", set); removeEventListener("blur", set); document.removeEventListener("visibilitychange", set); };
  }, []);

  // ---- remember customized folders
  useEffect(() => {
    localStorage.setItem(HIST_KEY, JSON.stringify(hist.map((h) => ({ path: h.path, name: h.name }))));
  }, [hist]);
  useEffect(() => {
    if (!inTauri || !hist.length) return;
    api.inspect(hist.map((h) => h.path)).then((info) =>
      setHist((prev) => prev.filter((p) => { const i = info.find((x) => x.path === p.path); return !!i && i.isDir && i.customized; })),
    ).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  // ---- folders in / out
  const addPaths = useCallback(async (paths: string[]) => {
    if (!inTauri || !paths.length) return;
    const info = await api.inspect(paths);
    setItems((prev) => {
      const have = new Set(prev.map((i) => i.path.toLowerCase()));
      const add = info.filter((i) => i.isDir && !have.has(i.path.toLowerCase())).map((i) => ({ ...i, sel: true }));
      return [...prev, ...add];
    });
  }, []);

  useEffect(() => {
    if (!inTauri) return;
    api.launchPaths().then(addPaths).catch(() => {});
    const subs = [
      listen<string[]>("open-paths", (e) => addPaths(e.payload)),
      getCurrentWebview().onDragDropEvent((e) => {
        const p = e.payload;
        if (p.type === "enter" || p.type === "over") setDragging(true);
        else if (p.type === "leave") setDragging(false);
        else if (p.type === "drop") {
          setDragging(false);
          addPaths(p.paths);
        }
      }),
    ];
    return () => { subs.forEach((s) => s.then((un) => un())); };
  }, [addPaths]);

  const pickFolders = async () => {
    if (!inTauri) return setToast({ kind: "err", text: t("winOnly") });
    const r = await open({ directory: true, multiple: true });
    if (r) await addPaths(Array.isArray(r) ? r : [r]);
  };

  /** Re-read the real state from disk for every folder we track; drops history entries that are no longer customized. */
  const refreshAll = async () => {
    const paths = [...new Set([...items, ...hist].map((i) => i.path))];
    if (!paths.length) return;
    const info = await api.inspect(paths);
    const by = new Map(info.map((i) => [i.path, i]));
    setItems((prev) => prev.map((p) => ({ ...p, customized: by.get(p.path)?.customized ?? p.customized })));
    setHist((prev) => prev.filter((p) => { const i = by.get(p.path); return !!i && i.isDir && i.customized; }));
  };

  const changeSideTab = (v: SideTab) => {
    setSideTab(v);
    if (v === "history") refreshAll().catch(() => {});
  };

  const addHistToList = () => {
    const pick = hist.filter((h) => h.sel);
    setItems((prev) => {
      const have = new Set(prev.map((i) => i.path.toLowerCase()));
      return [...prev, ...pick.filter((h) => !have.has(h.path.toLowerCase())).map((h) => ({ ...h, sel: true }))];
    });
    setHist((prev) => prev.map((h) => ({ ...h, sel: false })));
    setSideTab("list");
  };

  // ---- actions
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { setToast({ kind: "err", text: String(e) }); } finally { setBusy(false); }
  };

  const applyDesign = (d: Design) =>
    run(async () => {
      if (!inTauri) return setToast({ kind: "err", text: t("winOnly") });
      if (!selected.length) return setToast({ kind: "err", text: t("nothingSelected") });
      const b64 = toBase64(await buildIco(await renderDesign(d, 512)));
      let ok = 0;
      const errs: string[] = [];
      const done: Item[] = [];
      for (const f of selected) {
        try { await api.apply(f.path, b64); ok++; done.push(f); } catch (e) { errs.push(`${f.name}: ${e}`); }
      }
      // remember every folder that now carries a custom icon
      setHist((prev) => {
        const have = new Set(prev.map((h) => h.path.toLowerCase()));
        return [...prev, ...done.filter((f) => !have.has(f.path.toLowerCase())).map((f) => ({ ...f, customized: true, sel: false }))];
      });
      await refreshAll();
      setToast(errs.length ? { kind: "err", text: t("failedN", { n: errs.length, err: errs[0] }) } : { kind: "ok", text: t("appliedN", { n: ok }) });
    });

  const restore = () =>
    run(async () => {
      if (!inTauri) return setToast({ kind: "err", text: t("winOnly") });
      if (!selected.length) return setToast({ kind: "err", text: t("nothingSelected") });
      let ok = 0;
      const errs: string[] = [];
      for (const f of selected) {
        try { await api.restore(f.path); ok++; } catch (e) { errs.push(`${f.name}: ${e}`); }
      }
      await refreshAll();
      setToast(errs.length ? { kind: "err", text: t("failedN", { n: errs.length, err: errs[0] }) } : { kind: "ok", text: t("restoredN", { n: ok }) });
    });

  const exportIco = () =>
    run(async () => {
      if (!inTauri) return setToast({ kind: "err", text: t("winOnly") });
      const path = await save({ defaultPath: "folder-icon.ico", filters: [{ name: "Icon", extensions: ["ico"] }] });
      if (!path) return;
      await api.saveBytes(path, toBase64(await buildIco(await renderDesign(design, 512))));
      setToast({ kind: "ok", text: t("exported", { name: path.split(/[\\/]/).pop() ?? path }) });
    });

  const exportPresets = () =>
    run(async () => {
      if (!inTauri) return setToast({ kind: "err", text: t("winOnly") });
      const path = await save({ defaultPath: "fluent-folder-icon-presets.json", filters: [{ name: "JSON", extensions: ["json"] }] });
      if (!path) return;
      await api.writeText(path, JSON.stringify(presets, null, 2));
      setToast({ kind: "ok", text: t("presetsExported") });
    });

  const importPresets = () =>
    run(async () => {
      if (!inTauri) return setToast({ kind: "err", text: t("winOnly") });
      const path = await open({ multiple: false, filters: [{ name: "JSON", extensions: ["json"] }] });
      if (!path || Array.isArray(path)) return;
      try {
        const list = JSON.parse(await api.readText(path)) as Partial<Preset>[];
        if (!Array.isArray(list)) throw new Error();
        const add: Preset[] = list
          .filter((p) => p && typeof p.name === "string" && p.design)
          .map((p) => ({ id: crypto.randomUUID(), name: p.name as string, design: normalizeDesign(p.design as Design) }));
        setPresets((prev) => [...prev, ...add]);
        setToast({ kind: "ok", text: t("presetsImported", { n: add.length }) });
      } catch {
        setToast({ kind: "err", text: t("invalidFile") });
      }
    });

  const tabs: { value: Tab; label: string }[] = [
    { value: "folder", label: t("tabFolder") },
    { value: "icon", label: t("tabIcon") },
    { value: "text", label: t("tabText") },
    { value: "presets", label: t("tabPresets") },
  ];

  return (
    <div className="relative flex h-full flex-col">
      {(settings.effect === "liquid" || settings.effect === "frosted") && (
        <div className="ambient" aria-hidden><i /><i /><i /></div>
      )}
      {/* command bar */}
      <header className="enter-down flex items-center gap-2 px-3 py-2">
        <button className="btn btn-subtle btn-icon" title={t("toggleFolders")} aria-label={t("toggleFolders")} onClick={() => setSidebar(!sidebar)}>
          {sidebar ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <img src="/icon.png" alt="" className="mr-1 h-6 w-6" draggable={false} />
        <h1 className="m-0 mr-3 text-[14px] font-semibold">{t("appName")}</h1>
        <button className="btn" onClick={pickFolders}><FolderPlus size={16} />{t("addFolders")}</button>
        <button className="btn btn-accent" disabled={busy || !selected.length} onClick={() => applyDesign(design)}><Wand2 size={16} />{t("apply")}{selected.length > 1 ? ` (${selected.length})` : ""}</button>
        <button className="btn" disabled={busy || !selected.length} onClick={restore}><RotateCcw size={16} />{t("restore")}</button>
        <button className="btn" onClick={() => { setDesign(defaultDesign); setToast({ kind: "ok", text: t("designReset") }); }} title={t("resetAll")}><Eraser size={16} />{t("resetAll")}</button>
        <button className="btn" disabled={busy} onClick={exportIco}><Download size={16} />{t("exportIco")}</button>
        <div className="flex-1" />
        <button className="btn btn-subtle btn-icon" title={t("settings")} aria-label={t("settings")} onClick={() => setShowSettings(true)}><Gear size={18} /></button>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
        {/* folders */}
        <div className="flex-none overflow-hidden transition-all duration-300 ease-out" style={{ width: sidebar ? 280 : 0, marginRight: sidebar ? 0 : -12, opacity: sidebar ? 1 : 0 }}>
          <FolderSidebar tab={sideTab} onTab={changeSideTab} items={items} hist={hist} setItems={setItems} setHist={setHist} dragging={dragging} onAddToList={addHistToList} />
        </div>

        {/* preview */}
        <main className="card enter-pop flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-4">
          <div className="check-bg grid place-items-center rounded-xl p-6" style={{ border: "1px solid var(--stroke)" }}>
            <canvas ref={previewRef} width={576} height={576} style={{ width: 288, height: 288 }} className="preview-img" aria-label={t("preview")} />
          </div>
          <div className="flex items-end gap-6">
            {[64, 48, 32, 16].map((sz) => (
              <div key={sz} className="flex flex-col items-center gap-1.5">
                <canvas ref={(el) => { thumbRefs.current[sz] = el; }} width={sz * 2} height={sz * 2} style={{ width: sz, height: sz }} />
                <span className="text-[11px]" style={{ color: "var(--text2)" }}>{sz}px</span>
              </div>
            ))}
          </div>
        </main>

        {/* properties */}
        <aside className="card enter-right flex w-[400px] flex-none flex-col gap-3 p-3">
          <Segmented value={tab} options={tabs} onChange={setTab} />
          <div key={tab} className="anim-tab min-h-0 flex-1 overflow-y-auto pr-1">
            {tab === "folder" && <FolderPanel design={design} onChange={setDesign} />}
            {tab === "icon" && <IconPanel design={design} onChange={setDesign} />}
            {tab === "text" && <TextPanel design={design} onChange={setDesign} />}
            {tab === "presets" && (
              <PresetPanel
                presets={presets}
                onPresets={setPresets}
                design={design}
                onLoad={(d) => setDesign(normalizeDesign(d))}
                onApplyPreset={(d) => applyDesign(normalizeDesign(d))}
                onReset={() => setDesign(defaultDesign)}
                onExport={exportPresets}
                onImport={importPresets}
              />
            )}
          </div>
        </aside>
      </div>

      {/* info bar */}
      {(toast || busy) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
          <div className="anim-toast pointer-events-auto flex max-w-[640px] items-center gap-3 rounded-md px-4 py-2.5 shadow-lg" style={{ background: "var(--dialog)", border: "1px solid var(--stroke-strong)", borderLeft: `4px solid ${toast?.kind === "err" ? "#d13438" : "#0f7b0f"}` }}>
            {busy ? <><span className="spinner" /><span>{t("busy")}</span></> : (
              <>
                {toast?.kind === "err" ? <AlertCircle size={18} color="#d13438" /> : <CheckCircle2 size={18} color="#0f7b0f" />}
                <span className="text-[13px]">{toast?.text}</span>
                <button className="btn btn-subtle btn-icon btn-sm" onClick={() => setToast(null)}><X size={14} /></button>
              </>
            )}
          </div>
        </div>
      )}

      {showSettings && <SettingsDialog settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
