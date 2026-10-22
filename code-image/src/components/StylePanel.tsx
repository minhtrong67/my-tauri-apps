import { AppWindow, Check, Droplet, Highlighter, ImageDown, Layers, Palette, RotateCcw, Stamp, Type } from "lucide-react";
import { useApp, type Design } from "../lib/store";
import { useT } from "../lib/i18n";
import { CODE_THEMES, FONTS, GRADIENTS, RATIOS } from "../lib/constants";
import { Btn, Chip, ColorField, Field, Section, Segmented, SelectBox, Slider, Switch, cx } from "./ui";

export function StylePanel() {
  const t = useT();
  const d = useApp((s) => s.design);
  const setDesign = useApp((s) => s.setDesign);
  const reset = useApp((s) => s.resetDesign);
  const up = (p: Partial<Design>) => setDesign(p);
  const ratio = RATIOS.find((r) => r.id === d.ratio);

  return (
    <div className="space-y-3 p-4">
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
                <div className="mb-1.5 flex gap-1">
                  {[th.keyword, th.string, th.fn, th.number].map((c, i) => <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: c }} />)}
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
                  <button key={g.name} title={g.name} aria-label={g.name} onClick={() => up({ g1: g.g1, g2: g.g2, angle: g.angle })}
                    className={cx("aspect-square rounded-full ring-offset-2 ring-offset-surface-low transition-all duration-200 hover:scale-110 active:scale-95", on && "ring-2 ring-primary")}
                    style={{ background: `linear-gradient(${g.angle}deg, ${g.g1}, ${g.g2})` }} />
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

      <Btn variant="outlined" className="w-full" onClick={reset} icon={<RotateCcw size={18} />}>{t("resetDesign")}</Btn>
    </div>
  );
}
