import { useDeferredValue, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Contrast, ImagePlus, Layers, Pipette, Plus, RotateCcw, Shapes, SwatchBook, Trash2 } from "lucide-react";
import { colorsFromImage, hctFromHex, readableOn } from "../lib/color";
import { CORE_KEYS, QUICK_PICKS, VARIANT_IDS, variantPreview, type CoreKey, type VariantId } from "../lib/theme";
import { cn, uid } from "../lib/utils";
import { useBuilder } from "../state/builder";
import { useSettings } from "../state/settings";
import { useToast } from "../state/toast";
import { HctPicker, HexField } from "./ColorPicker";
import { Chip, IconButton, LoadingIndicator, Range, Section, Switch } from "./ui";

const CONTRAST_STEPS: [number, "contrast.reduced" | "contrast.standard" | "contrast.medium" | "contrast.high"][] = [
  [-1, "contrast.reduced"],
  [0, "contrast.standard"],
  [0.5, "contrast.medium"],
  [1, "contrast.high"],
];

export function SourcePanel() {
  const { t } = useSettings();
  const { config, theme, update } = useBuilder();
  const toast = useToast();
  const [dragging, setDragging] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hct = useMemo(() => hctFromHex(config.source), [config.source]);
  const deferredSource = useDeferredValue(config.source);

  useEffect(() => () => void (thumb && URL.revokeObjectURL(thumb)), [thumb]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.warning(t("source.notImage"));
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const colors = await colorsFromImage(url);
      if (!colors.length) throw new Error("empty");
      setThumb(url);
      setSuggestions(colors);
      update({ source: colors[0] });
    } catch {
      URL.revokeObjectURL(url);
      toast.error(t("source.imageFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const variantDots = useMemo(
    () => Object.fromEntries(VARIANT_IDS.map((v) => [v, variantPreview(deferredSource, v)])) as Record<VariantId, [string, string, string]>,
    [deferredSource],
  );

  const derived = (key: CoreKey): string => theme.palettes.find((p) => p.id === key)?.tones[40] ?? "#000000";

  const addCustom = () => {
    if (config.custom.length >= 8) return;
    const hex = QUICK_PICKS[(config.custom.length * 3 + 2) % QUICK_PICKS.length];
    update({ custom: [...config.custom, { id: uid(), name: `${t("custom.defaultName")} ${config.custom.length + 1}`, hex, blend: true }] });
  };

  return (
    <div className="space-y-3">
      {/* -------------------------------- Source ------------------------------- */}
      <Section title={t("source.title")} icon={<Pipette className="size-5" />}>
        <div
          className="relative mb-4 flex h-28 items-end justify-between overflow-hidden rounded-2xl p-3 transition-colors duration-300"
          style={{ background: config.source, color: readableOn(config.source) }}
        >
          <div className="anim-pop">
            <div className="font-mono text-2xl font-semibold tracking-wide">{config.source}</div>
            <div className="text-xs opacity-80">
              H {Math.round(hct.h)} · C {Math.round(hct.c)} · T {Math.round(hct.t)}
            </div>
          </div>
          <label className="relative cursor-pointer" data-tip={t("source.pick")}>
            <span data-ripple className="flex size-10 items-center justify-center rounded-full bg-black/15 backdrop-blur-sm">
              <Pipette className="size-5" />
            </span>
            <input
              type="color"
              value={config.source.toLowerCase()}
              onChange={(e) => update({ source: e.target.value.toUpperCase() })}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label={t("source.pick")}
            />
          </label>
        </div>

        <HexField value={config.source} onChange={(source) => update({ source })} label={t("source.hex")} className="mb-4" />
        <HctPicker value={config.source} onChange={(source) => update({ source })} />

        <div className="mt-4 grid grid-cols-6 gap-2">
          {QUICK_PICKS.map((hex, i) => (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              data-tip={hex}
              data-ripple
              onClick={() => update({ source: hex })}
              style={{ background: hex, "--d": `${i * 25}ms` } as React.CSSProperties}
              className={cn(
                "anim-pop shape aspect-square transition-transform duration-(--spring-spatial-fast-d) ease-emphasized hover:scale-110 active:scale-90",
                config.source === hex ? "shape-cookie scale-105" : "shape-circle hover-shape-cookie",
              )}
            />
          ))}
        </div>

        {/* Image extraction */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "mt-4 rounded-2xl border-2 border-dashed p-3 transition-colors duration-200",
            dragging ? "border-primary bg-primary-container/40" : "border-outline-variant",
          )}
        >
          <button
            type="button"
            data-ripple
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl p-1 text-left"
          >
            {thumb ? (
              <img src={thumb} alt="" className="size-12 rounded-lg object-cover" />
            ) : (
              <span className="shape shape-sunny flex size-12 items-center justify-center bg-secondary-container text-on-secondary-container">
                {busy ? <LoadingIndicator size={36} /> : <ImagePlus className="size-5" />}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t("source.fromImage")}</span>
              <span className="block text-xs text-on-surface-variant">{t("source.dropHint")}</span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void handleFile(e.target.files?.[0]).then(() => (e.target.value = ""))} />
          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((hex, i) => (
                <button
                  key={hex}
                  type="button"
                  data-tip={hex}
                  aria-label={hex}
                  onClick={() => update({ source: hex })}
                  style={{ background: hex, "--d": `${i * 40}ms` } as React.CSSProperties}
                  className={cn("anim-pop shape shape-cookie size-8 transition-transform hover:scale-110", config.source === hex && "scale-110 shape-circle")}
                />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* -------------------------------- Style -------------------------------- */}
      <Section title={t("style.title")} icon={<Shapes className="size-5" />}>
        <div className="grid grid-cols-2 gap-2">
          {VARIANT_IDS.map((v) => (
            <button
              key={v}
              type="button"
              data-ripple
              onClick={() => update({ variant: v })}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-2xl border px-3 py-2.5 text-left text-sm transition-[background-color,border-color,transform] duration-200 active:scale-[0.98]",
                config.variant === v ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline-variant",
              )}
            >
              <span className="flex -space-x-1.5">
                {variantDots[v].map((c, i) => (
                  <span key={i} className="size-4 rounded-full border border-surface-container-low transition-colors duration-300" style={{ background: c }} />
                ))}
              </span>
              <span className="w-full truncate font-medium">{t(`variant.${v}` as never)}</span>
            </button>
          ))}
        </div>
        <p key={config.variant} className="anim-fade-up mt-3 text-xs leading-relaxed text-on-surface-variant">
          {t(`variant.${config.variant}.desc` as never)}
        </p>
      </Section>

      {/* ------------------------------- Contrast ------------------------------ */}
      <Section title={t("contrast.title")} icon={<Contrast className="size-5" />}>
        <Range label={t("contrast.title")} min={-1} max={1} step={0.1} value={config.contrast} onChange={(contrast) => update({ contrast: Math.round(contrast * 10) / 10 })} />
        <div className="mt-1 flex justify-between text-xs tabular-nums text-on-surface-variant">
          <span>-1</span>
          <span className="font-medium text-primary">{config.contrast.toFixed(1)}</span>
          <span>+1</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CONTRAST_STEPS.map(([v, key]) => (
            <Chip key={v} selected={config.contrast === v} onClick={() => update({ contrast: v })}>
              {t(key)}
            </Chip>
          ))}
        </div>
      </Section>

      {/* ------------------------------ Core colors ---------------------------- */}
      <Section title={t("core.title")} icon={<Layers className="size-5" />} defaultOpen={false}>
        <p className="mb-3 text-xs text-on-surface-variant">{t("core.hint")}</p>
        <div className="space-y-2">
          {CORE_KEYS.map((key) => {
            const override = config.core[key];
            const shown = override ?? derived(key);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="size-9 shrink-0 rounded-full border border-outline-variant transition-colors duration-300" style={{ background: shown }} />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs text-on-surface-variant">
                    {t(`core.${key}` as never)}
                    {!override && <span className="rounded bg-surface-container-highest px-1 text-[10px]">{t("core.auto")}</span>}
                  </div>
                  <HexField value={shown} label={t(`core.${key}` as never)} className="h-9" onChange={(hex) => update({ core: { ...config.core, [key]: hex } })} />
                </div>
                <IconButton
                  label={t("core.reset")}
                  disabled={!override}
                  onClick={() => {
                    const next = { ...config.core };
                    delete next[key];
                    update({ core: next });
                  }}
                >
                  <RotateCcw className="size-4" />
                </IconButton>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ----------------------------- Custom colors --------------------------- */}
      <Section
        title={t("custom.title")}
        icon={<SwatchBook className="size-5" />}
        defaultOpen={false}
        action={
          <IconButton
            label={t("custom.add")}
            tone="tonal"
            disabled={config.custom.length >= 8}
            onClick={(e) => {
              e.stopPropagation();
              addCustom();
            }}
          >
            <Plus className="size-5" />
          </IconButton>
        }
      >
        {config.custom.length === 0 && <p className="text-xs text-on-surface-variant">{t("custom.empty")}</p>}
        <div className="space-y-3">
          {config.custom.map((c) => (
            <div key={c.id} className="anim-fade-up rounded-2xl border border-outline-variant p-3">
              <div className="flex items-center gap-2">
                <span className="size-9 shrink-0 rounded-full border border-outline-variant" style={{ background: c.hex }} />
                <input
                  value={c.name}
                  maxLength={24}
                  aria-label={t("custom.name")}
                  onChange={(e) => update({ custom: config.custom.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-outline-variant bg-transparent px-3 text-sm outline-none focus:border-primary"
                />
                <IconButton label={t("common.delete")} onClick={() => update({ custom: config.custom.filter((x) => x.id !== c.id) })}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <HexField value={c.hex} label={t("source.hex")} className="h-9 flex-1" onChange={(hex) => update({ custom: config.custom.map((x) => (x.id === c.id ? { ...x, hex } : x)) })} />
                <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                  {t("custom.harmonize")}
                  <Switch label={t("custom.harmonize")} checked={c.blend} onChange={(blend) => update({ custom: config.custom.map((x) => (x.id === c.id ? { ...x, blend } : x)) })} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
