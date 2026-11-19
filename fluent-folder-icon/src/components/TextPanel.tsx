import type { Design, TextLayer } from "../lib/types";
import { ColorField, Field, Group, Select, Slider, Toggle, useT } from "./ui";

const FONTS = [
  ["Segoe UI", '"Segoe UI", sans-serif'],
  ["Arial", "Arial, sans-serif"],
  ["Verdana", "Verdana, sans-serif"],
  ["Georgia", "Georgia, serif"],
  ["Times New Roman", '"Times New Roman", serif'],
  ["Consolas", "Consolas, monospace"],
  ["Impact", "Impact, sans-serif"],
  ["Comic Sans MS", '"Comic Sans MS", cursive'],
].map(([label, value]) => ({ label, value, style: { fontFamily: value } }));

export default function TextPanel({ design, onChange }: { design: Design; onChange: (d: Design) => void }) {
  const t = useT();
  const tx = design.text;
  const up = (p: Partial<TextLayer>) => onChange({ ...design, text: { ...tx, ...p } });

  return (
    <div className="flex flex-col gap-3">
      <Group>
        <Toggle label={t("showText")} checked={tx.enabled} onChange={(v) => up({ enabled: v })} />
        <Field label={t("textContent")}>
          <textarea className="input" rows={3} maxLength={60} placeholder={t("textPlaceholder")} value={tx.value} onChange={(e) => up({ value: e.target.value, enabled: true })} />
        </Field>
        <Field label={t("font")}>
          <Select value={tx.font} options={FONTS} onChange={(v) => up({ font: v })} />
        </Field>
        <Toggle label={t("bold")} checked={tx.bold} onChange={(v) => up({ bold: v })} />
        <ColorField label={t("color")} value={tx.color} onChange={(v) => up({ color: v })} />
      </Group>
      <Group>
        <Slider label={t("size")} value={tx.size} min={14} max={110} onChange={(v) => up({ size: v })} />
        <Slider label={t("letterSpacing")} value={tx.spacing} min={-4} max={20} onChange={(v) => up({ spacing: v })} />
        <Slider label={t("lineHeight")} value={tx.lineHeight} min={0.8} max={1.8} step={0.05} onChange={(v) => up({ lineHeight: v })} />
        <Slider label={t("opacity")} value={tx.opacity} min={0.1} max={1} step={0.05} onChange={(v) => up({ opacity: v })} />
        <Slider label={t("offsetY")} value={tx.y} min={-60} max={60} onChange={(v) => up({ y: v })} />
      </Group>
      <Group>
        <Toggle label={t("outline")} checked={tx.outline} onChange={(v) => up({ outline: v })} />
        {tx.outline && (
          <>
            <ColorField label={t("outlineColor")} value={tx.outlineColor} onChange={(v) => up({ outlineColor: v })} />
            <Slider label={t("outlineWidth")} value={tx.outlineWidth} min={1} max={10} onChange={(v) => up({ outlineWidth: v })} />
          </>
        )}
        <Toggle label={t("dropShadow")} checked={tx.shadow} onChange={(v) => up({ shadow: v })} />
      </Group>
    </div>
  );
}
