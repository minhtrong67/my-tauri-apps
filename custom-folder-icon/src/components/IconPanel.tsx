import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Search, Trash2 } from "lucide-react";
import type { Badge, Blend, Design, IconKind, IconLayer } from "../lib/types";
import { luminance } from "../lib/render";
import { loadSet, type IconSet, type VecKind } from "../lib/iconsets";
import { loadEmoji, type EmojiData } from "../lib/emoji";
import { fileToDataUrl } from "../lib/ico";
import { ColorField, Field, Group, Segmented, Select, Slider, Toggle, useT } from "./ui";

type LucideData = typeof import("../lib/lucideAll");
const STEP = 120;

export default function IconPanel({ design, onChange }: { design: Design; onChange: (d: Design) => void }) {
  const t = useT();
  const ic = design.icon;
  const up = (p: Partial<IconLayer>) => onChange({ ...design, icon: { ...ic, ...p } });
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(STEP);
  const [cat, setCat] = useState(0);
  const [emoji, setEmoji] = useState<EmojiData | null>(null);
  const [lucide, setLucide] = useState<LucideData | null>(null);
  const [set, setSet] = useState<IconSet | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const dark = document.documentElement.classList.contains("dark");

  const vec = ic.kind === "mdi" || ic.kind === "fa" || ic.kind === "brand";

  useEffect(() => {
    setSet(null);
    if (!vec) return;
    let off = false;
    loadSet(ic.kind as VecKind).then((s) => !off && setSet(s));
    return () => { off = true; };
  }, [ic.kind, vec]);

  useEffect(() => setLimit(STEP), [q, ic.kind]);
  useEffect(() => {
    if (ic.kind !== "lucide" || lucide) return;
    let off = false;
    import("../lib/lucideAll").then((m) => !off && setLucide(m));
    return () => { off = true; };
  }, [ic.kind, lucide]);
  useEffect(() => {
    if (ic.kind !== "emoji" || emoji) return;
    let off = false;
    loadEmoji().then((d) => !off && setEmoji(d));
    return () => { off = true; };
  }, [ic.kind, emoji]);

  const emojiList = useMemo(() => {
    if (!emoji) return [];
    const s = q.trim().toLowerCase();
    return s ? emoji.all.filter((x) => x.q.includes(s)) : emoji.categories[cat].list;
  }, [emoji, q, cat]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (ic.kind === "lucide") return !lucide ? [] : s ? lucide.lucideNames.filter((n) => n.toLowerCase().includes(s.replace(/\s+/g, ""))) : lucide.lucideNames;
    if (!set) return [];
    if (!s) return set.names;
    return set.names.filter((_, i) => set.search[i].includes(s));
  }, [q, ic.kind, set, lucide]);

  const collections: { value: IconKind; label: string }[] = [
    { value: "mdi", label: t("colMdi") },
    { value: "fa", label: t("colFa") },
    { value: "brand", label: t("colBrand") },
    { value: "emoji", label: t("iconEmoji") },
    { value: "lucide", label: t("colLucide") },
    { value: "image", label: t("iconImage") },
  ];
  const blends: { value: Blend; label: string }[] = [
    { value: "source-over", label: t("blendNormal") },
    { value: "multiply", label: t("blendMultiply") },
    { value: "screen", label: t("blendScreen") },
    { value: "overlay", label: t("blendOverlay") },
  ];
  const badges: { value: Badge; label: string }[] = [
    { value: "none", label: t("badgeNone") },
    { value: "circle", label: t("badgeCircle") },
    { value: "square", label: t("badgeSquare") },
  ];

  const tint = (hex?: string) => (hex && luminance(hex) > (dark ? 0.22 : 0.05) && luminance(hex) < (dark ? 1 : 0.92) ? hex : "currentColor");
  const showColor = ic.kind !== "emoji" && ic.kind !== "image" && !(ic.kind === "brand" && ic.useBrand);

  return (
    <div className="flex flex-col gap-3">
      <Group>
        {ic.enabled && (
          <button className="btn btn-sm self-start" onClick={() => up({ enabled: false })}><Trash2 size={14} />{t("removeIcon")}</button>
        )}
        <Field label={t("collection")}>
          <Select value={ic.kind} options={collections} onChange={(v) => { setQ(""); up({ kind: v, name: v === "lucide" ? "Star" : v === "mdi" ? "mdiStar" : v === "fa" ? "star" : v === "brand" ? "siGithub" : v === "emoji" ? "⭐" : ic.name }); }} />
        </Field>

        {(vec || ic.kind === "lucide") && (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 opacity-60" />
              <input className="input !pl-8" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="text-[11.5px]" style={{ color: "var(--text2)" }}>
              {(vec && !set) || (ic.kind === "lucide" && !lucide) ? t("loading") : t("iconCount", { n: matches.length.toLocaleString() })}
            </div>
            <div
              className="grid h-[320px] grid-cols-6 content-start gap-1.5 overflow-y-auto pr-1"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight > el.scrollHeight - 240) setLimit((l) => Math.min(l + STEP, matches.length));
              }}
            >
              {matches.length === 0 && (set || lucide) && <div className="col-span-6 py-8 text-center text-[13px]" style={{ color: "var(--text2)" }}>{t("noResults")}</div>}
              {matches.slice(0, limit).map((n) => {
                if (ic.kind === "lucide") {
                  const I = lucide!.lucideMap[n];
                  return (
                    <button key={n} data-tip={n} className="tile" data-on={ic.name === n} onClick={() => up({ name: n, enabled: true })}><I size={26} /></button>
                  );
                }
                const v = set?.get(n);
                if (!v) return null;
                return (
                  <button key={n} data-tip={set!.label(n)} className="tile" data-on={ic.name === n} onClick={() => up({ name: n, enabled: true })}>
                    <svg viewBox={`0 0 ${v.w} ${v.h}`} width={28} height={28} fill={ic.kind === "brand" ? tint(v.hex) : "currentColor"}><path d={v.path} /></svg>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {ic.kind === "emoji" && (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 opacity-60" />
              <input className="input !pl-8" placeholder={t("searchEmoji")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {!q.trim() && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                {(emoji?.categories ?? []).map((c, i) => (
                  <button key={c.icon} className="tile !aspect-auto h-9 min-w-9 text-[18px]" data-on={cat === i} onClick={() => setCat(i)}>{c.icon}</button>
                ))}
              </div>
            )}
            <div key={q.trim() ? "search" : cat} className="anim-fade grid h-[300px] grid-cols-7 content-start gap-1 overflow-y-auto pr-1">
              {!emoji && <div className="col-span-7 py-8 text-center text-[13px]" style={{ color: "var(--text2)" }}>{t("loading")}</div>}
              {emoji && emojiList.length === 0 && <div className="col-span-7 py-8 text-center text-[13px]" style={{ color: "var(--text2)" }}>{t("noResults")}</div>}
              {emojiList.map((x) => (
                <button key={x.e} data-tip={x.q.split(" ")[0]} className="tile text-[26px] leading-none" style={{ fontFamily: '"Segoe UI Emoji","Apple Color Emoji",sans-serif' }} data-on={ic.name === x.e} onClick={() => up({ name: x.e, enabled: true })}>{x.e}</button>
              ))}
            </div>
          </>
        )}

        {ic.kind === "image" && (
          <>
            <input
              ref={file}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) up({ image: await fileToDataUrl(f), enabled: true });
                e.target.value = "";
              }}
            />
            <button className="btn" onClick={() => file.current?.click()}><ImagePlus size={16} /> {t("pickImage")}</button>
            {ic.image && <img src={ic.image} alt="" className="check-bg mx-auto h-24 w-24 rounded object-contain" />}
          </>
        )}
      </Group>

      <Group>
        {ic.kind === "brand" && <Toggle label={t("brandColor")} checked={ic.useBrand} onChange={(v) => up({ useBrand: v })} />}
        {showColor && <ColorField label={t("iconColor")} value={ic.color} onChange={(v) => up({ color: v })} />}
        <Field label={t("badge")}>
          <Segmented value={ic.badge} options={badges} onChange={(v) => up({ badge: v })} />
        </Field>
        {ic.badge !== "none" && <ColorField label={t("badgeColor")} value={ic.badgeColor} onChange={(v) => up({ badgeColor: v })} />}
        <Slider label={t("size")} value={ic.size} min={30} max={170} onChange={(v) => up({ size: v })} />
        {ic.kind === "lucide" && <Slider label={t("strokeWidth")} value={ic.stroke} min={0.75} max={3} step={0.25} onChange={(v) => up({ stroke: v })} />}
        <Slider label={t("opacity")} value={ic.opacity} min={0.1} max={1} step={0.05} onChange={(v) => up({ opacity: v })} />
        <Slider label={t("offsetX")} value={ic.x} min={-60} max={60} onChange={(v) => up({ x: v })} />
        <Slider label={t("offsetY")} value={ic.y} min={-60} max={60} onChange={(v) => up({ y: v })} />
        <Toggle label={t("dropShadow")} checked={ic.shadow} onChange={(v) => up({ shadow: v })} />
        <Field label={t("blend")}>
          <Select value={ic.blend} options={blends} onChange={(v) => up({ blend: v })} />
        </Field>
      </Group>
    </div>
  );
}
