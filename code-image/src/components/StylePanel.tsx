import { useState } from "react";
import { AppWindow, Bookmark, BookmarkPlus, Check, Droplet, Highlighter, ImageDown, Layers, Palette, RotateCcw, Stamp, Trash2, Type, X } from "lucide-react";
import { useApp, type Design } from "../lib/store";
import { useT } from "../lib/i18n";
import { BUILTIN_PRESETS, CODE_THEMES, FONTS, GRADIENTS, RATIOS } from "../lib/constants";
import { Btn, Chip, ColorField, ConfirmDialog, Field, PromptDialog, Section, Segmented, SelectBox, Slider, Switch, Tooltip, cx } from "./ui";

function Presets() {
  const t = useT();
  const presets = useApp((s) => s.presets);
  const savePreset = useApp((s) => s.savePreset);
  const deletePreset = useApp((s) => s.deletePreset);
  const setDesign = useApp((s) => s.setDesign);
  const [naming, setNaming] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  return (
    <Section icon={<Bookmark size={20} />} title={t("presets")} defaultOpen={false}>
      <Field label={t("builtin")}>
        <div className="flex flex-wrap gap-2">
          {BUILTIN_PRESETS.map((p) => (
            <Chip key={p.id} active={false} onClick={() => { setDesign(p.patch as Partial<Design>); }}>{p.name}</Chip>
          ))}
        </div>
      </Field>
      {presets.length > 0 && (
        <Field label={t("yours")}>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <span key={p.id} className="inline-flex h-8 animate-pop items-center overflow-hidden rounded-lg bg-secondary-container text-sm text-on-secondary-container">
                <button className="h-full pl-3 pr-2 hover:bg-on-surface/8" onClick={() => { setDesign(p.design); }}>{p.name}</button>
                <Tooltip label={t("deletePreset")}>
                  <button aria-label={t("deletePreset")} onClick={() => setDel(p.id)} className="grid h-full w-7 place-items-center hover:bg-error/15 hover:text-error"><X size={14} /></button>
                </Tooltip>
              </span>
            ))}
          </div>
        </Field>
      )}
      <Btn variant="tonal" className="w-full" icon={<BookmarkPlus size={18} />} onClick={() => setNaming(true)}>{t("savePreset")}</Btn>
      {naming && (
        <PromptDialog
          title={t("savePreset")} label={t("presetName")} placeholder={t("presetNamePh")} icon={<BookmarkPlus size={26} />}
          confirmLabel={t("save")} cancelLabel={t("cancel")} confirmIcon={<Check size={18} />}
          onCancel={() => setNaming(false)} onSubmit={(v) => { savePreset(v); setNaming(false); }}
        />
      )}
      {del && (
        <ConfirmDialog
          title={t("deletePresetTitle")} message={t("deletePresetMsg")} icon={<Trash2 size={26} />}
          confirmLabel={t("delete")} cancelLabel={t("cancel")} confirmIcon={<Trash2 size={18} />}
          onCancel={() => setDel(null)} onConfirm={() => { deletePreset(del); setDel(null); }}
        />
      )}
    </Section>
  );
}

export function StylePanel() {
  const t = useT();
  const d = useApp((s) => s.design);
  const setDesign = useApp((s) => s.setDesign);
  const reset = useApp((s) => s.resetDesign);
  const up = (p: Partial<Design>) => setDesign(p);
  const ratio = RATIOS.find((r) => r.id === d.ratio);
  const [askReset, setAskReset] = useState(false);

  return (
    <div className="space-y-3 p-4">
      <Presets />

      <Section icon={<Palette size={20} />} title={t("codeTheme")}>
        <div className="grid grid-cols-2 gap-2">
          {CODE_THEMES.map((th) => {
            const on = th.id === d.themeId;
            return (
              <button
                key={th.id} onClick={() => up({ themeId: th.id })} aria-pressed={on}
                className={cx("group relative overflow-hidden rounded-m3 border-2 p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-e2 active:scale-[.98]",
                  on ? "border-primary" : "border-transparent")}
                style={{ background: th.bg }}
              >
                <div className="mb-2 space-y-1">
                  {[[[th.keyword, 18], [th.fn, 30]], [[th.string, 38], [th.number, 14]], [[th.comment, 52]]].map((row, r) => (
                    <div key={r} className="flex gap-1" style={{ paddingLeft: r === 1 ? 8 : 0 }}>
                      {row.map(([c, w], i) => <span key={i} className="h-1.5 rounded-full" style={{ background: c as string, width: w as number }} />)}
                    </div>
                  ))}
                </div>
                <div className="truncate text-xs font-medium" style={{ color: th.fg }}>{th.name}</div>
                {on && <span className="absolute right-1.5 top-1.5 grid h-4 w-4 animate-fadeIn place-items-center rounded-full bg-primary text-on-primary"><Check size={11} strokeWidth={3} /></span>}
              </button>
            );
          })}
        </div>
      </Section>

      <Section icon={<Droplet size={20} />} title={t("background")}>
        <Segmented value={d.bgType} onChange={(v) => up({ bgType: v })} options={[
          { value: "gradient", label: t("gradient") }, { value: "solid", label: t("solid") }, { value: "transparent", label: t("transparent") },
        ]} />
        {d.bgType === "gradient" && (
          <div className="animate-fadeIn space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {GRADIENTS.map((g) => {
                const on = g.g1 === d.g1 && g.g2 === d.g2;
                return (
                  <Tooltip key={g.name} label={g.name}>
                    <button aria-label={g.name} onClick={() => up({ g1: g.g1, g2: g.g2, angle: g.angle })}
                      className={cx("aspect-square w-full transition-all duration-300 ease-spring hover:scale-110 active:scale-90", on ? "rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-surface-low" : "rounded-full")}
                      style={{ background: `linear-gradient(${g.angle}deg, ${g.g1}, ${g.g2})` }} />
                  </Tooltip>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label={`${t("color")} 1`} value={d.g1} onChange={(v) => up({ g1: v })} />
              <ColorField label={`${t("color")} 2`} value={d.g2} onChange={(v) => up({ g2: v })} />
            </div>
            <Slider label={t("angle")} value={d.angle} min={0} max={360} unit="°" onChange={(v) => up({ angle: v })} />
          </div>
        )}
        {d.bgType === "solid" && <div className="animate-fadeIn"><ColorField label={t("color")} value={d.solid} onChange={(v) => up({ solid: v })} /></div>}
      </Section>

      <Section icon={<Layers size={20} />} title={t("design")}>
        <Field label={t("ratio")}>
          <div className="flex flex-wrap gap-2">
            {RATIOS.map((r) => <Chip key={r.id} active={d.ratio === r.id} onClick={() => up({ ratio: r.id })}>{r.id === "auto" ? t("auto") : r.label}</Chip>)}
          </div>
        </Field>
        {ratio && ratio.w > 0 && (
          <Field label={t("fit")} hint={t("fitHint")} right={<Switch label={t("fit")} checked={d.fit} onChange={(v) => up({ fit: v })} />} />
        )}
        <Slider label={t("padding")} value={d.padding} min={0} max={160} step={4} unit="px" onChange={(v) => up({ padding: v })} />
        <Slider label={t("radius")} value={d.radius} min={0} max={40} unit="px" onChange={(v) => up({ radius: v })} />
      </Section>

      <Section icon={<Type size={20} />} title={t("textSection")}>
        <Field label={t("font")}>
          <SelectBox label={t("font")} value={d.fontId} onChange={(v) => up({ fontId: v })}
            options={FONTS.map((f) => ({ value: f.id, label: f.label, family: f.family }))} />
        </Field>
        <Slider label={t("fontSize")} value={d.fontSize} min={10} max={28} unit="px" onChange={(v) => up({ fontSize: v })} />
        <Field label={t("lineNumbers")} right={<Switch label={t("lineNumbers")} checked={d.lineNumbers} onChange={(v) => up({ lineNumbers: v })} />} />
        <Field label={t("highlightLines")} right={<Highlighter size={18} className="text-on-surface-variant" />}>
          <input
            value={d.highlight} onChange={(e) => up({ highlight: e.target.value })} placeholder={t("highlightHint")} spellCheck={false}
            className="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface focus:border-primary"
          />
        </Field>
        <Field label={t("focusMode")} hint={d.highlight.trim() ? t("focusHint") : t("highlightFirst")} right={<Switch label={t("focusMode")} checked={d.focus} onChange={(v) => up({ focus: v })} />} />
        <Field label={t("ligatures")} right={<Switch label={t("ligatures")} checked={d.ligatures} onChange={(v) => up({ ligatures: v })} />} />
      </Section>

      <Section icon={<AppWindow size={20} />} title={t("windowSection")}>
        <Field label={t("windowStyle")}>
          <Segmented value={d.chrome} onChange={(v) => up({ chrome: v })} options={[
            { value: "mac", label: t("mac") }, { value: "windows", label: t("windows") }, { value: "none", label: t("none") },
          ]} />
        </Field>
        {d.chrome !== "none" && <Field label={t("showTitle")} right={<Switch label={t("showTitle")} checked={d.showTitle} onChange={(v) => up({ showTitle: v })} />} />}
        <Field label={t("shadow")} right={<Switch label={t("shadow")} checked={d.shadow} onChange={(v) => up({ shadow: v })} />} />
      </Section>

      <Section icon={<Stamp size={20} />} title={t("watermark")} defaultOpen={false}>
        <Field label={t("watermark")} right={<Switch label={t("watermark")} checked={d.watermarkOn} onChange={(v) => up({ watermarkOn: v })} />} />
        {d.watermarkOn && (
          <div className="animate-fadeIn space-y-4">
            <input
              value={d.watermarkText} onChange={(e) => up({ watermarkText: e.target.value })} placeholder={t("watermarkText")} aria-label={t("watermarkText")}
              className="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface focus:border-primary"
            />
            <Field label={t("watermarkPos")}>
              <Segmented value={d.watermarkPos} onChange={(v) => up({ watermarkPos: v })} options={[
                { value: "left", label: t("left") }, { value: "center", label: t("center") }, { value: "right", label: t("right") },
              ]} />
            </Field>
            <Slider label={t("opacity")} value={Math.round(d.watermarkOpacity * 100)} min={10} max={100} step={5} unit="%" onChange={(v) => up({ watermarkOpacity: v / 100 })} />
          </div>
        )}
      </Section>

      <Section icon={<ImageDown size={20} />} title={t("export")}>
        <Field label={t("format")}>
          <Segmented value={d.format} onChange={(v) => up({ format: v })} options={[
            { value: "png", label: "PNG" }, { value: "jpeg", label: "JPG" }, { value: "svg", label: "SVG" },
          ]} />
        </Field>
        <Field label={t("scale")} right={ratio && ratio.w > 0 && <span className="text-xs tabular-nums text-on-surface-variant">{ratio.w * d.scale} × {ratio.h * d.scale}</span>}>
          <Segmented value={String(d.scale)} onChange={(v) => up({ scale: +v })} options={[
            { value: "1", label: "1×" }, { value: "2", label: "2×" }, { value: "3", label: "3×" }, { value: "4", label: "4×" },
          ]} />
        </Field>
      </Section>

      <Btn variant="outlined" className="w-full" onClick={() => setAskReset(true)} icon={<RotateCcw size={18} />}>{t("resetDesign")}</Btn>
      {askReset && (
        <ConfirmDialog
          title={t("resetDesignTitle")} message={t("resetDesignMsg")} icon={<RotateCcw size={26} />}
          confirmLabel={t("reset")} cancelLabel={t("cancel")} confirmIcon={<RotateCcw size={18} />} tone="primary"
          onCancel={() => setAskReset(false)} onConfirm={() => { reset(); setAskReset(false); }}
        />
      )}
    </div>
  );
}
