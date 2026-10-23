import { useEffect, useState } from "react";
import {
  Combine, Eraser, FileText, FolderOpen, Highlighter, ImagePlus, Images, Info, LayoutDashboard, Maximize, Minus, Monitor, Moon,
  MoonStar, MousePointer2, PanelLeft, PenLine, Pencil, Plus, Presentation, Printer, Redo2, Rows3, Save, Scissors, Search, Settings, Square,
  Sun, Type, Undo2, Wrench, ChevronLeft, ChevronRight, Check, FileDown, StretchHorizontal, Fullscreen, RectangleVertical,
} from "lucide-react";
import { exportImages, gotoPage, openPicker, printDoc, redoAnnot, saveDoc, setZoom, undoAnnot } from "../lib/actions";
import { setFullscreen } from "../lib/window";
import { useStore, useT, type Doc, type Tool } from "../lib/store";
import { withThemeTransition } from "../lib/theme";
import { Button, IconButton, Menu } from "./ui";

export const toggleTheme = (e?: React.MouseEvent) => {
  const s = useStore.getState();
  const order = ["light", "dark", "system"] as const;
  const next = order[(order.indexOf(s.settings.themeMode) + 1) % 3];
  withThemeTransition(() => s.setSettings({ themeMode: next }), e && { x: e.clientX, y: e.clientY }, s.settings.animations);
};

export async function startPresent() {
  useStore.getState().setPresent(true);
  await setFullscreen(true);
}

export function Toolbar({ doc }: { doc: Doc | null }) {
  const t = useT();
  const s = useStore();
  const { sidebarOpen, setSidebar, openDialog, settings, annotBar, patchTool } = s;
  const [pageText, setPageText] = useState("1");
  useEffect(() => setPageText(String((doc?.page ?? 0) + 1)), [doc?.page, doc?.id]);
  const ThemeIcon = settings.themeMode === "light" ? Sun : settings.themeMode === "dark" ? Moon : Monitor;
  const d = doc;

  const toolsItems = d ? [
    { icon: <Combine size={20} />, label: t("merge"), onClick: () => openDialog("merge") },
    { icon: <Scissors size={20} />, label: t("split"), onClick: () => openDialog("split") },
    { icon: <LayoutDashboard size={20} />, label: t("organize"), onClick: () => openDialog("organize") },
    { icon: <ImagePlus size={20} />, label: t("imagesToPdf"), onClick: () => openDialog("images") },
    { icon: <Images size={20} />, label: t("exportImages"), onClick: () => exportImages(d), divider: true },
    { icon: <FileDown size={20} />, label: t("saveAs"), hint: "Ctrl+Shift+S", onClick: () => saveDoc(d, true) },
    { icon: <Printer size={20} />, label: t("print"), hint: "Ctrl+P", onClick: () => printDoc(d) },
    { icon: <Presentation size={20} />, label: t("present"), hint: "F5", onClick: startPresent },
    { icon: <MoonStar size={20} />, label: t("nightPages"), active: settings.nightPages, onClick: () => s.setSettings({ nightPages: !settings.nightPages }) },
    { icon: settings.layout === "continuous" ? <RectangleVertical size={20} /> : <Rows3 size={20} />, label: settings.layout === "continuous" ? t("singlePage") : t("continuous"), onClick: () => s.setSettings({ layout: settings.layout === "continuous" ? "single" : "continuous" }) },
    { icon: <FileText size={20} />, label: t("properties"), divider: true, onClick: () => openDialog("props") },
  ] : [
    { icon: <Combine size={20} />, label: t("merge"), onClick: () => openDialog("merge") },
    { icon: <ImagePlus size={20} />, label: t("imagesToPdf"), onClick: () => openDialog("images") },
  ];

  const zoomItems = d ? [
    { icon: <StretchHorizontal size={20} />, label: t("fitWidth"), active: d.fit === "width", onClick: () => s.patchDoc(d.id, { fit: "width" }) },
    { icon: <Fullscreen size={20} />, label: t("fitPage"), active: d.fit === "page", onClick: () => s.patchDoc(d.id, { fit: "page" }) },
    { icon: <Maximize size={20} />, label: t("actualSize"), onClick: () => setZoom(1) },
    ...[0.5, 0.75, 1.25, 1.5, 2, 3].map((z) => ({ icon: <span className="pct-ico">%</span>, label: `${Math.round(z * 100)}%`, onClick: () => setZoom(z) })),
  ] : [];

  return (
    <header className="toolbar">
      <div className="tb-group">
        {d && <IconButton icon={<PanelLeft size={22} />} label={t("sidebar")} active={sidebarOpen} onClick={() => setSidebar(!sidebarOpen)} />}
        <IconButton icon={<FolderOpen size={22} />} label={`${t("open")} (Ctrl+O)`} onClick={openPicker} />
        {d && <IconButton icon={<Save size={22} />} label={`${t("save")} (Ctrl+S)`} onClick={() => saveDoc(d)} className={d.dirty ? "dirty" : ""} />}
      </div>

      {d && (
        <div className="tb-group center">
          <IconButton icon={<ChevronLeft size={22} />} label={t("prevPage")} onClick={() => gotoPage(d.page - 1)} disabled={d.page <= 0} />
          <div className="page-input">
            <input value={pageText} inputMode="numeric" aria-label={t("page")}
              onChange={(e) => setPageText(e.target.value.replace(/\D/g, ""))}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => { if (e.key === "Enter") { gotoPage(+pageText - 1); (e.target as HTMLInputElement).blur(); } }}
              onBlur={() => setPageText(String(d.page + 1))} />
            <span>{t("of")} {d.numPages}</span>
          </div>
          <IconButton icon={<ChevronRight size={22} />} label={t("nextPage")} onClick={() => gotoPage(d.page + 1)} disabled={d.page >= d.numPages - 1} />
          <span className="tb-sep" />
          <IconButton icon={<Minus size={20} />} label={`${t("zoomOut")} (Ctrl -)`} onClick={() => setZoom(d.scale / 1.2)} />
          <Menu align="left" items={zoomItems} trigger={(toggle) => <button className="zoom-pill ripple" onClick={toggle} data-tip={t("zoom")}>{Math.round(d.scale * 100)}%</button>} />
          <IconButton icon={<Plus size={20} />} label={`${t("zoomIn")} (Ctrl +)`} onClick={() => setZoom(d.scale * 1.2)} />
        </div>
      )}

      <div className="tb-group right">
        {d && <IconButton icon={<Search size={22} />} label={`${t("search")} (Ctrl+F)`} onClick={() => setSidebar(true, "search")} />}
        {d && <IconButton icon={<PenLine size={22} />} label={t("annotate")} active={annotBar} onClick={() => { patchTool({ annotBar: !annotBar }); if (annotBar) s.setTool("none"); }} />}
        <Menu items={toolsItems} trigger={(toggle, open) => <IconButton icon={<Wrench size={22} />} label={t("tools")} onClick={toggle} active={open} />} />
        <IconButton icon={<ThemeIcon size={22} />} label={`${t("toggleTheme")}: ${t(settings.themeMode)}`} onClick={toggleTheme} className="theme-btn" />
        <IconButton icon={<Settings size={22} />} label={t("settings")} onClick={() => openDialog("settings")} className="gear" />
        <IconButton icon={<Info size={22} />} label={t("about")} onClick={() => openDialog("about")} />
      </div>
    </header>
  );
}

const COLORS = ["#FFEB3B", "#F44336", "#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#212121"];
export function AnnotBar({ doc }: { doc: Doc }) {
  const t = useT();
  const { tool, setTool, color, strokeW, textSize, patchTool, annotBar } = useStore();
  const tools: { id: Tool; icon: JSX.Element }[] = [
    { id: "none", icon: <MousePointer2 size={20} /> }, { id: "highlight", icon: <Highlighter size={20} /> }, { id: "pen", icon: <Pencil size={20} /> },
    { id: "text", icon: <Type size={20} /> }, { id: "rect", icon: <Square size={20} /> }, { id: "eraser", icon: <Eraser size={20} /> },
  ];
  return (
    <div className={`annot-bar ${annotBar ? "open" : ""}`} aria-hidden={!annotBar}>
      <div className="annot-inner">
        <div className="tb-group">
          {tools.map((x) => <IconButton key={x.id} icon={x.icon} label={t(`tool_${x.id}` as any)} active={tool === x.id} onClick={() => setTool(x.id)} />)}
        </div>
        <span className="tb-sep" />
        <div className="swatches" role="radiogroup" aria-label={t("color")}>
          {COLORS.map((c) => (
            <button key={c} role="radio" aria-checked={color === c} className={`swatch ${color === c ? "on" : ""}`} style={{ background: c }} aria-label={c} onClick={() => patchTool({ color: c })}>
              {color === c && <Check size={14} color={c === "#FFEB3B" ? "#222" : "#fff"} />}
            </button>
          ))}
        </div>
        <span className="tb-sep" />
        {tool === "text" ? (
          <label className="range"><span>{t("textSize")}</span><input type="range" min={10} max={48} value={textSize} onChange={(e) => patchTool({ textSize: +e.target.value })} /><b>{textSize}</b></label>
        ) : (
          <label className="range"><span>{t("thickness")}</span><input type="range" min={1} max={14} value={strokeW} onChange={(e) => patchTool({ strokeW: +e.target.value })} /><b>{strokeW}</b></label>
        )}
        <span className="tb-sep" />
        <IconButton icon={<Undo2 size={20} />} label={`${t("undo")} (Ctrl+Z)`} onClick={undoAnnot} disabled={!doc.past.length} />
        <IconButton icon={<Redo2 size={20} />} label={`${t("redo")} (Ctrl+Y)`} onClick={redoAnnot} disabled={!doc.future.length} />
        <span className="annot-hint">{t("annotHint")}</span>
      </div>
    </div>
  );
}

export { Button };
