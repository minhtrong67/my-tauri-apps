
import {
  ArrowUpRight, Bold, Check, Circle, Copy, Crop as CropIcon, Eraser, FlipHorizontal, FlipVertical, Highlighter, Italic, Lock, Minus, Pencil, Plus, RotateCcw, RotateCw, Save, Sparkles, Square,
  Stamp, Trash2, Type, WandSparkles, Link2, Link2Off, Droplets, Grid3x3, X,
} from "lucide-react";
import { FILTERS, ZERO_ADJ, isMovable, type Adj, type EditState, type Engine, type Item, type TextItem } from "../lib/editorEngine";
import { promptDialog, t, toast, useT, userData } from "../lib/store";
import { Btn, IconBtn, Segmented, SliderRow, Switch, Chip } from "../components/ui";
import { Select } from "../components/Select";
import { cx, uid } from "../lib/utils";


export type Tab = "crop" | "adjust" | "filters" | "draw" | "text" | "stickers" | "blur" | "export";
export type DrawTool = "pen" | "highlighter" | "line" | "arrow" | "rect" | "oval" | "eraser";
export interface ToolState { tool: DrawTool; color: string; width: number; fill: boolean; aspect: number | null; blurMode: "pixelate" | "blur" }

export interface PanelProps {
  st: EditState; engine: Engine; sel: string | null; setSel: (id: string | null) => void;
  live: (fn: (s: EditState) => EditState, label?: string) => void; commit: (label: string, fn: (s: EditState) => EditState) => void; commitDraft: (label: string) => void;
  tool: ToolState; setTool: (p: Partial<ToolState>) => void; filterThumbs: string[]; dims: { w: number; h: number };
}

export const COLORS = ["#ffffff", "#000000", "#f44336", "#ff9800", "#ffeb3b", "#4caf50", "#03a9f4", "#3f51b5", "#9c27b0", "#e91e63"];
const ASPECTS: { label: string; v: number | null | "orig" }[] = [
  { label: "ed.aspect.free", v: null }, { label: "ed.aspect.orig", v: "orig" }, { label: "1:1", v: 1 }, { label: "4:3", v: 4 / 3 }, { label: "3:2", v: 3 / 2 }, { label: "16:9", v: 16 / 9 }, { label: "3:4", v: 3 / 4 }, { label: "9:16", v: 9 / 16 },
];
const EMOJI = ["😀", "😂", "😍", "😎", "🥳", "😭", "😡", "🤔", "👍", "👏", "🙏", "💪", "❤️", "🔥", "⭐", "✨", "🎉", "🎁", "🌈", "☀️", "🌙", "🌸", "🍀", "🐶", "🐱", "🦋", "🍕", "🍰", "☕", "🎵", "📍", "✅", "❌", "⚠️", "💡", "📌", "🏆", "🚀", "💯", "👑"];

const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-on-surface">{title}</h3>{action}</div>{children}</section>
);

export function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <button key={c} aria-label={c} onClick={() => onChange(c)} style={{ background: c }}
          className={cx("size-8 rounded-full border border-outline-variant transition-all duration-300 ease-spring grid place-items-center", value.toLowerCase() === c ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface-container rounded-[10px]" : "hover:scale-110")}>
          {value.toLowerCase() === c && <Check size={14} color={c === "#ffffff" || c === "#ffeb3b" ? "#000" : "#fff"} strokeWidth={3} />}
        </button>
      ))}
      <label className="size-8 rounded-full overflow-hidden relative border border-outline-variant cursor-pointer" style={{ background: "conic-gradient(red,yellow,lime,aqua,blue,magenta,red)" }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="custom color" />
      </label>
    </div>
  );
}

/* ---------------------------------- Crop ---------------------------------- */
export function CropPanel({ st, commit, tool, setTool, dims, live, commitDraft }: PanelProps) {
  const tt = useT();
  const remap = (fn: (c: EditState["crop"]) => EditState["crop"], patch: Partial<EditState>, label: string) => commit(label, (s) => ({ ...s, ...patch, crop: fn(s.crop) }));
  const pickAspect = (v: number | null | "orig") => {
    const a = v === "orig" ? dims.w / dims.h : v;
    setTool({ aspect: a });
    if (a) commit(tt("ed.crop"), (s) => {
      const r = dims.w / dims.h; // image ratio in px
      let w = s.crop.w, h = (w * r) / a;
      if (h > 1) { h = 1; w = (h * a) / r; }
      if (w > 1) { w = 1; h = (w * r) / a; }
      const cx = s.crop.x + s.crop.w / 2, cy = s.crop.y + s.crop.h / 2;
      return { ...s, crop: { x: Math.min(1 - w, Math.max(0, cx - w / 2)), y: Math.min(1 - h, Math.max(0, cy - h / 2)), w, h } };
    });
  };
  return (
    <div className="space-y-6">
      <Section title={tt("ed.crop")} action={<Btn size="sm" kind="text" icon={RotateCcw} onClick={() => { setTool({ aspect: null }); commit(tt("reset"), (s) => ({ ...s, crop: { x: 0, y: 0, w: 1, h: 1 } })); }}>{tt("reset")}</Btn>}>
        <div className="flex flex-wrap gap-2">
          {ASPECTS.map((a) => {
            const on = a.v === "orig" ? !!tool.aspect && Math.abs(tool.aspect - dims.w / dims.h) < 0.001 : a.v === tool.aspect;
            return <Chip key={a.label} on={on} onClick={() => pickAspect(a.v)}>{a.label.startsWith("ed.") ? tt(a.label as never) : a.label}</Chip>;
          })}
        </div>
      </Section>
      <Section title={tt("ed.rotate")}>
        <div className="grid grid-cols-4 gap-2">
          <IconBtn icon={RotateCcw} label={tt("act.rotateLeft")} tone="tonal" className="!w-full" onClick={() => remap((c) => ({ x: c.y, y: 1 - c.x - c.w, w: c.h, h: c.w }), { rot: (st.rot + 3) % 4 }, tt("act.rotateLeft"))} />
          <IconBtn icon={RotateCw} label={tt("act.rotateRight")} tone="tonal" className="!w-full" onClick={() => remap((c) => ({ x: 1 - c.y - c.h, y: c.x, w: c.h, h: c.w }), { rot: (st.rot + 1) % 4 }, tt("act.rotateRight"))} />
          <IconBtn icon={FlipHorizontal} label={tt("ed.flip.h")} tone="tonal" on={st.flipH} className="!w-full" onClick={() => remap((c) => ({ ...c, x: 1 - c.x - c.w }), { flipH: !st.flipH }, tt("ed.flip.h"))} />
          <IconBtn icon={FlipVertical} label={tt("ed.flip.v")} tone="tonal" on={st.flipV} className="!w-full" onClick={() => remap((c) => ({ ...c, y: 1 - c.y - c.h }), { flipV: !st.flipV }, tt("ed.flip.v"))} />
        </div>
      </Section>
      <SliderRow label={tt("ed.straighten")} value={st.angle} min={-45} max={45} step={0.5} center reset={0} fmt={(v) => `${v}°`}
        onChange={(v) => live((s) => ({ ...s, angle: v }))} onCommit={() => commitDraft(tt("ed.straighten"))} />
    </div>
  );
}

/* ---------------------------------- Adjust ---------------------------------- */
const ADJ_ROWS: { k: keyof Adj; min: number; max: number; label: string }[] = [
  { k: "brightness", min: -100, max: 100, label: "adj.brightness" }, { k: "contrast", min: -100, max: 100, label: "adj.contrast" },
  { k: "saturation", min: -100, max: 100, label: "adj.saturation" }, { k: "warmth", min: -100, max: 100, label: "adj.warmth" },
  { k: "tint", min: -100, max: 100, label: "adj.tint" }, { k: "highlights", min: -100, max: 100, label: "adj.highlights" },
  { k: "shadows", min: -100, max: 100, label: "adj.shadows" }, { k: "sharpness", min: 0, max: 100, label: "adj.sharpness" },
  { k: "vignette", min: -100, max: 100, label: "adj.vignette" }, { k: "hue", min: -180, max: 180, label: "adj.hue" }, { k: "blur", min: 0, max: 100, label: "adj.blur" },
];
export function AdjustPanel({ st, engine, live, commit, commitDraft }: PanelProps) {
  const tt = useT();
  const presets = userData.use((s) => s.presets);
  const changed = (Object.keys(ZERO_ADJ) as (keyof Adj)[]).some((k) => st.adj[k] !== 0);
  const savePreset = () => {
    promptDialog({ title: t("adj.savePreset"), label: t("adj.presetName"), confirm: t("save"), icon: Save }).then((name) => {
      if (name) { userData.set((s) => ({ presets: [...s.presets, { id: uid(), name, adj: { ...st.adj }, filter: st.filter, amount: st.filterAmt }] })); toast("success", t("toast.presetSaved")); }
    });
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="filled" icon={WandSparkles} onClick={() => commit(tt("adj.auto"), (s) => ({ ...s, adj: { ...ZERO_ADJ, ...engine.autoEnhance(s) } }))}>{tt("adj.auto")}</Btn>
        <Btn kind="tonal" icon={RotateCcw} disabled={!changed} onClick={() => commit(tt("adj.reset"), (s) => ({ ...s, adj: { ...ZERO_ADJ } }))}>{tt("reset")}</Btn>
      </div>
      {ADJ_ROWS.map((r) => (
        <SliderRow key={r.k} label={tt(r.label as never)} value={st.adj[r.k]} min={r.min} max={r.max} center={r.min < 0} reset={0}
          onChange={(v) => live((s) => ({ ...s, adj: { ...s.adj, [r.k]: v } }))} onCommit={() => commitDraft(tt(r.label as never))} />
      ))}
      <div className="divider" />
      <Section title={tt("adj.presets")} action={<Btn size="sm" kind="text" icon={Save} onClick={savePreset} disabled={!changed && st.filter === "none"}>{tt("save")}</Btn>}>
        {presets.length === 0 ? <p className="text-sm text-on-surface-variant">{tt("adj.noPresets")}</p> : (
          <div className="flex flex-wrap gap-2">{presets.map((p) => (
            <span key={p.id} className="inline-flex items-center rounded-[10px] bg-secondary-container text-on-secondary-container overflow-hidden">
              <button className="h-8 pl-3 pr-2 text-[.8125rem] font-semibold hover:bg-on-secondary-container/10" onClick={() => commit(p.name, (s) => ({ ...s, adj: { ...ZERO_ADJ, ...p.adj }, filter: p.filter, filterAmt: p.amount }))}>{p.name}</button>
              <button className="size-8 grid place-items-center hover:bg-on-secondary-container/10" aria-label={tt("remove")} onClick={() => userData.set((s) => ({ presets: s.presets.filter((x) => x.id !== p.id) }))}><X size={14} /></button>
            </span>))}</div>
        )}
      </Section>
    </div>
  );
}

/* ---------------------------------- Filters ---------------------------------- */
export function FiltersPanel({ st, commit, live, commitDraft, filterThumbs }: PanelProps) {
  const tt = useT();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2.5">
        {FILTERS.map((f, i) => (
          <button key={f.id} onClick={() => commit(tt(`flt.${f.id}` as never), (s) => ({ ...s, filter: f.id, filterAmt: f.id === "none" ? 100 : s.filterAmt }))} className="group text-center">
            <div className={cx("aspect-square overflow-hidden bg-surface-high transition-all duration-400 ease-spring", st.filter === f.id ? "rounded-[24px] ring-[3px] ring-primary scale-[1.03]" : "rounded-[14px] group-hover:rounded-[22px]")}>
              {filterThumbs[i] ? <img src={filterThumbs[i]} alt="" className="size-full object-cover" draggable={false} /> : <div className="skeleton size-full" />}
            </div>
            <div className={cx("mt-1 text-xs font-semibold", st.filter === f.id ? "text-primary" : "text-on-surface-variant")}>{tt(`flt.${f.id}` as never)}</div>
          </button>
        ))}
      </div>
      {st.filter !== "none" && <SliderRow label={tt("flt.intensity")} value={st.filterAmt} min={0} max={100} fmt={(v) => `${v}%`} onChange={(v) => live((s) => ({ ...s, filterAmt: v }))} onCommit={() => commitDraft(tt("flt.intensity"))} />}
    </div>
  );
}

/* ---------------------------------- Draw ---------------------------------- */
const TOOLS: { id: DrawTool; icon: typeof Pencil; label: string }[] = [
  { id: "pen", icon: Pencil, label: "draw.pen" }, { id: "highlighter", icon: Highlighter, label: "draw.highlighter" }, { id: "line", icon: Minus, label: "draw.line" },
  { id: "arrow", icon: ArrowUpRight, label: "draw.arrow" }, { id: "rect", icon: Square, label: "draw.rect" }, { id: "oval", icon: Circle, label: "draw.oval" }, { id: "eraser", icon: Eraser, label: "draw.eraser" },
];
export function DrawPanel({ tool, setTool }: PanelProps) {
  const tt = useT();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-2">
        {TOOLS.map((x) => <IconBtn key={x.id} icon={x.icon} label={tt(x.label as never)} on={tool.tool === x.id} tone={tool.tool === x.id ? "filled" : "tonal"} className="!w-full !h-12" onClick={() => setTool({ tool: x.id })} />)}
      </div>
      {tool.tool !== "eraser" && (<>
        <Section title={tt("draw.color")}><Swatches value={tool.color} onChange={(c) => setTool({ color: c })} /></Section>
        <SliderRow label={tt("draw.width")} value={tool.width} min={2} max={60} onChange={(v) => setTool({ width: v })} />
        {(tool.tool === "rect" || tool.tool === "oval") && <div className="flex items-center justify-between"><span className="font-medium text-sm">{tt("draw.fill")}</span><Switch label={tt("draw.fill")} on={tool.fill} onChange={(v) => setTool({ fill: v })} /></div>}
      </>)}
    </div>
  );
}

/* ---------------------------------- Text ---------------------------------- */
export function TextPanel({ st, sel, setSel, commit, live, commitDraft, tool, setTool }: PanelProps) {
  const tt = useT();
  const cur = st.items.find((i) => i.id === sel && i.type === "text") as TextItem | undefined;
  const add = () => {
    const it: TextItem = { id: uid(), type: "text", text: tt("text.default"), x: 0.5, y: 0.5, size: 0.07, rot: 0, color: tool.color === "#000000" ? "#ffffff" : tool.color, bold: true, italic: false, bg: false };
    commit(tt("text.add"), (s) => ({ ...s, items: [...s.items, it] })); setSel(it.id);
  };
  const upd = (patch: Partial<TextItem>, label: string) => commit(label, (s) => ({ ...s, items: s.items.map((i) => (i.id === cur?.id ? ({ ...i, ...patch } as Item) : i)) }));
  return (
    <div className="space-y-5">
      <Btn kind="filled" icon={Plus} className="w-full" onClick={add}>{tt("text.add")}</Btn>
      {!cur ? <p className="text-sm text-on-surface-variant text-center py-6">{tt("ed.noSelection")}</p> : (
        <div className="space-y-5 anim-fade">
          <textarea className="field !h-28 py-3 resize-none" value={cur.text} placeholder={tt("text.placeholder")} autoFocus
            onChange={(e) => live((s) => ({ ...s, items: s.items.map((i) => (i.id === cur.id ? ({ ...i, text: e.target.value } as Item) : i)) }))} onBlur={() => commitDraft(tt("text.edit"))} />
          <SliderRow label={tt("text.size")} value={Math.round(cur.size * 1000)} min={20} max={240} onChange={(v) => live((s) => ({ ...s, items: s.items.map((i) => (i.id === cur.id ? ({ ...i, size: v / 1000 } as Item) : i)) }))} onCommit={() => commitDraft(tt("text.size"))} />
          <Section title={tt("draw.color")}><Swatches value={cur.color} onChange={(c) => { upd({ color: c }, tt("draw.color")); setTool({ color: c }); }} /></Section>
          <div className="flex gap-2">
            <Chip icon={Bold} on={cur.bold} onClick={() => upd({ bold: !cur.bold }, tt("text.bold"))}>{tt("text.bold")}</Chip>
            <Chip icon={Italic} on={cur.italic} onClick={() => upd({ italic: !cur.italic }, tt("text.italic"))}>{tt("text.italic")}</Chip>
            <Chip icon={Square} on={cur.bg} onClick={() => upd({ bg: !cur.bg }, tt("text.bg"))}>{tt("text.bg")}</Chip>
          </div>
          <Btn kind="danger" icon={Trash2} className="w-full" onClick={() => { commit(tt("ed.deleteItem"), (s) => ({ ...s, items: s.items.filter((i) => i.id !== cur.id) })); setSel(null); }}>{tt("ed.deleteItem")}</Btn>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Stickers ---------------------------------- */
export function StickersPanel({ st, sel, setSel, commit, live, commitDraft }: PanelProps) {
  const tt = useT();
  const cur = st.items.find((i) => i.id === sel && (i.type === "emoji" || i.type === "blur"));
  const add = (char: string) => { const it: Item = { id: uid(), type: "emoji", char, x: 0.5, y: 0.5, size: 0.12, rot: 0 }; commit(tt("ed.stickers"), (s) => ({ ...s, items: [...s.items, it] })); setSel(it.id); };
  const mark = () => {
    const it: TextItem = { id: uid(), type: "text", text: "© minhtrong67", x: 0.82, y: 0.94, size: 0.035, rot: 0, color: "#ffffff", bold: false, italic: false, bg: false };
    commit(tt("st.watermark"), (s) => ({ ...s, items: [...s.items, it] })); setSel(it.id);
  };
  return (
    <div className="space-y-5">
      <Section title={tt("st.emoji")}>
        <p className="text-xs text-on-surface-variant -mt-1">{tt("st.tapToAdd")}</p>
        <div className="grid grid-cols-6 gap-1.5">{EMOJI.map((e) => <button key={e} onClick={() => add(e)} className="aspect-square grid place-items-center text-2xl rounded-[14px] hover:bg-secondary-container hover:rounded-[20px] active:scale-90 transition-all duration-300 ease-spring">{e}</button>)}</div>
      </Section>
      <Btn kind="tonal" icon={Stamp} className="w-full" onClick={mark}>{tt("st.watermark")}</Btn>
      {cur?.type === "emoji" && (
        <div className="space-y-4 anim-fade">
          <SliderRow label={tt("ed.size")} value={Math.round(cur.size * 1000)} min={30} max={500} onChange={(v) => live((s) => ({ ...s, items: s.items.map((i) => (i.id === cur.id ? ({ ...i, size: v / 1000 } as Item) : i)) }))} onCommit={() => commitDraft(tt("ed.size"))} />
          <Btn kind="danger" icon={Trash2} className="w-full" onClick={() => { commit(tt("ed.deleteItem"), (s) => ({ ...s, items: s.items.filter((i) => i.id !== cur.id) })); setSel(null); }}>{tt("ed.deleteItem")}</Btn>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Blur ---------------------------------- */
export function BlurPanel({ st, sel, setSel, commit, tool, setTool }: PanelProps) {
  const tt = useT();
  const cur = st.items.find((i) => i.id === sel && i.type === "blur");
  return (
    <div className="space-y-5">
      <Segmented className="w-full" value={tool.blurMode} onChange={(v) => { setTool({ blurMode: v }); if (cur) commit(tt("ed.blur"), (s) => ({ ...s, items: s.items.map((i) => (i.id === cur.id && i.type === "blur" ? { ...i, mode: v } : i)) })); }}
        options={[{ value: "pixelate", label: tt("draw.pixelate"), icon: Grid3x3 }, { value: "blur", label: tt("draw.blurArea"), icon: Droplets }]} />
      <p className="text-sm text-on-surface-variant leading-relaxed">{tt("st.tapToAdd")}</p>
      {cur && <Btn kind="danger" icon={Trash2} className="w-full" onClick={() => { commit(tt("ed.deleteItem"), (s) => ({ ...s, items: s.items.filter((i) => i.id !== cur.id) })); setSel(null); }}>{tt("ed.deleteItem")}</Btn>}
      <div className="text-xs text-on-surface-variant">{st.items.filter(isMovable).length > 0 && ""}</div>
    </div>
  );
}

/* ---------------------------------- Export ---------------------------------- */
export interface ExportOpts { format: "png" | "jpeg" | "webp"; quality: number; w: number; h: number; lock: boolean; keepExif: boolean }
export function ExportPanel({ engine, st, opts, setOpts, onSave, onCopy, onClipboard, canOverwrite }: PanelProps & {
  opts: ExportOpts; setOpts: (p: Partial<ExportOpts>) => void; onSave: (overwrite: boolean) => void; onCopy?: () => void; onClipboard: () => void; canOverwrite: boolean;
}) {
  const tt = useT();
  const base = engine.cropSize(st);
  const pct = Math.round((opts.w / base.w) * 100);
  const setW = (w: number) => setOpts(opts.lock ? { w, h: Math.max(1, Math.round((w * base.h) / base.w)) } : { w });
  const setH = (h: number) => setOpts(opts.lock ? { h, w: Math.max(1, Math.round((h * base.w) / base.h)) } : { h });
  void onCopy;
  return (
    <div className="space-y-6">
      <Section title={tt("exp.format")}>
        <Select value={opts.format} onChange={(v) => setOpts({ format: v })} className="w-full" options={[{ value: "jpeg", label: "JPEG" }, { value: "png", label: "PNG", hint: tt("exp.pngNote") }, { value: "webp", label: "WebP" }]} />
        {opts.format !== "png" && <SliderRow label={tt("exp.quality")} value={opts.quality} min={40} max={100} fmt={(v) => `${v}%`} onChange={(v) => setOpts({ quality: v })} />}
        {opts.format === "jpeg" && <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{tt("exp.keepExif")}</span><Switch label={tt("exp.keepExif")} on={opts.keepExif} onChange={(v) => setOpts({ keepExif: v })} /></div>}
      </Section>
      <Section title={tt("exp.size")}>
        <SliderRow label={tt("exp.percent")} value={Math.min(200, Math.max(5, pct))} min={5} max={200} fmt={(v) => `${v}%`} onChange={(v) => setOpts({ w: Math.max(1, Math.round((base.w * v) / 100)), h: Math.max(1, Math.round((base.h * v) / 100)) })} />
        <div className="flex items-end gap-2">
          <label className="flex-1"><span className="text-xs font-semibold text-on-surface-variant">{tt("exp.width")}</span><input type="number" min={1} max={30000} className="field !h-11 mt-1" value={opts.w} onChange={(e) => setW(Math.max(1, +e.target.value || 1))} /></label>
          <IconBtn icon={opts.lock ? Link2 : Link2Off} label={tt("exp.lock")} on={opts.lock} onClick={() => setOpts({ lock: !opts.lock })} />
          <label className="flex-1"><span className="text-xs font-semibold text-on-surface-variant">{tt("exp.height")}</span><input type="number" min={1} max={30000} className="field !h-11 mt-1" value={opts.h} onChange={(e) => setH(Math.max(1, +e.target.value || 1))} /></label>
        </div>
        <p className="text-xs text-on-surface-variant font-medium">{tt("exp.final")}: {opts.w} × {opts.h}px</p>
      </Section>
      <div className="space-y-2.5">
        <Btn kind="filled" icon={Save} className="w-full" size="lg" onClick={() => onSave(false)}>{tt("exp.saveCopy")}</Btn>
        <Btn kind="tonal" icon={Lock} className="w-full" disabled={!canOverwrite} onClick={() => onSave(true)}>{tt("exp.overwrite")}</Btn>
        <Btn kind="outlined" icon={Copy} className="w-full" onClick={onClipboard}>{tt("exp.copyClipboard")}</Btn>
      </div>
    </div>
  );
}

