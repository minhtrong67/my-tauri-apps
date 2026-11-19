import type { Design, FolderStyle, FillMode, PatternId } from "../lib/types";
import { shadeHex } from "../lib/render";
import { GRADIENTS, SOLID_COLORS } from "../lib/palette";
import { ColorField, Field, Group, Segmented, Select, Slider, useT } from "./ui";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export default function FolderPanel({ design, onChange }: { design: Design; onChange: (d: Design) => void }) {
  const t = useT();
  const up = (p: Partial<Design>) => onChange({ ...design, ...p });

  const styles: { value: FolderStyle; label: string }[] = [
    { value: "win11", label: t("styleWin11") },
    { value: "win10", label: t("styleWin10") },
    { value: "minimal", label: t("styleMinimal") },
    { value: "classic", label: t("styleClassic") },
    { value: "flat", label: t("styleFlat") },
    { value: "outline", label: t("styleOutline") },
    { value: "glass", label: t("styleGlass") },
    { value: "neon", label: t("styleNeon") },
  ];
  const fills: { value: FillMode; label: string }[] = [
    { value: "solid", label: t("fillSolid") },
    { value: "linear", label: t("fillLinear") },
    { value: "radial", label: t("fillRadial") },
  ];
  const patterns: { value: PatternId; label: string }[] = [
    { value: "none", label: t("pNone") },
    { value: "stripes", label: t("pStripes") },
    { value: "dots", label: t("pDots") },
    { value: "checker", label: t("pChecker") },
    { value: "zigzag", label: t("pZigzag") },
    { value: "waves", label: t("pWaves") },
    { value: "crosses", label: t("pCrosses") },
    { value: "diamonds", label: t("pDiamonds") },
  ];

  const solid = design.fill === "solid";

  // Switching mode derives a coherent second color so old values never bleed through.
  const setFill = (fill: FillMode) => {
    if (fill === design.fill) return;
    if (fill === "solid") return up({ fill, color2: design.color });
    if (design.fill === "solid") return up({ fill, color: shadeHex(design.color, 0.18), color2: shadeHex(design.color, -0.2) });
    up({ fill });
  };

  return (
    <div className="flex flex-col gap-3">
      <Group>
        <Field label={t("style")}>
          <Select value={design.style} options={styles} onChange={(v) => up({ style: v })} />
        </Field>
        <Field label={t("fill")}>
          <Segmented value={design.fill} options={fills} onChange={setFill} />
        </Field>
      </Group>

      {/* palette follows the selected fill mode */}
      <div key={design.fill} className="anim-fade">
        {solid ? (
          <Group title={t("quickColors")}>
            <div className="grid grid-cols-8 gap-2">
              {SOLID_COLORS.map((c) => (
                <button key={c.hex} className="sw" title={c.name} style={{ background: c.hex }} data-on={same(design.color, c.hex)} onClick={() => up({ color: c.hex, color2: c.hex })} />
              ))}
            </div>
            <ColorField label={t("color")} value={design.color} onChange={(v) => up({ color: v, color2: v })} />
          </Group>
        ) : (
          <Group title={t("quickGradients")}>
            <div className="grid grid-cols-6 gap-2">
              {GRADIENTS.map((g) => (
                <button key={g.name} className="sw" title={g.name} style={{ background: design.fill === "radial" ? `radial-gradient(circle at 35% 30%, ${g.c1}, ${g.c2})` : `linear-gradient(135deg, ${g.c1}, ${g.c2})` }} data-on={same(design.color, g.c1) && same(design.color2, g.c2)} onClick={() => up({ color: g.c1, color2: g.c2, ...(design.fill === "linear" ? { angle: 45 } : {}) })} />
              ))}
            </div>
            <ColorField label={t("color")} value={design.color} onChange={(v) => up({ color: v })} />
            <ColorField label={t("color2")} value={design.color2} onChange={(v) => up({ color2: v })} />
            {design.fill === "linear" && <Slider label={t("angle")} value={design.angle} min={0} max={360} suffix="°" onChange={(v) => up({ angle: v })} />}
          </Group>
        )}
      </div>

      <Group>
        <Field label={t("pattern")}>
          <Select value={design.pattern} options={patterns} onChange={(v) => up({ pattern: v })} />
        </Field>
        {design.pattern !== "none" && (
          <>
            <Slider label={t("patternSize")} value={design.patternSize} min={8} max={40} onChange={(v) => up({ patternSize: v })} />
            <Slider label={t("patternIntensity")} value={design.patternIntensity} min={0.05} max={1} step={0.05} onChange={(v) => up({ patternIntensity: v })} />
            <ColorField label={t("patternColor")} value={design.patternColor} onChange={(v) => up({ patternColor: v })} />
          </>
        )}
      </Group>
    </div>
  );
}
