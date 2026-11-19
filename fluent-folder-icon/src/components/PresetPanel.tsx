import { useEffect, useRef, useState } from "react";
import { Download, Trash2, Upload, Wand2, RotateCcw } from "lucide-react";
import type { Design, Preset } from "../lib/types";
import { renderDesign } from "../lib/render";
import { Group, useT } from "./ui";

function Thumb({ design }: { design: Design }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let off = false;
    renderDesign(design, 96).then((c) => {
      const el = ref.current;
      if (off || !el) return;
      const g = el.getContext("2d")!;
      g.clearRect(0, 0, 96, 96);
      g.drawImage(c, 0, 0);
    });
    return () => { off = true; };
  }, [design]);
  return <canvas ref={ref} width={96} height={96} className="h-12 w-12 flex-none" />;
}

interface Props {
  presets: Preset[];
  onPresets: (p: Preset[]) => void;
  design: Design;
  onLoad: (d: Design) => void;
  onApplyPreset: (d: Design) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: () => void;
}

export default function PresetPanel({ presets, onPresets, design, onLoad, onApplyPreset, onReset, onExport, onImport }: Props) {
  const t = useT();
  const [name, setName] = useState("");

  const save = () => {
    const n = name.trim();
    if (!n) return;
    onPresets([...presets, { id: crypto.randomUUID(), name: n, design: structuredClone(design) }]);
    setName("");
  };

  return (
    <div className="flex flex-col gap-3">
      <Group>
        <div className="flex gap-2">
          <input className="input" placeholder={t("presetName")} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
          <button className="btn btn-accent" disabled={!name.trim()} onClick={save}>{t("savePreset").split(" ")[0]}</button>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm flex-1" onClick={onImport}><Upload size={14} />{t("importPresets")}</button>
          <button className="btn btn-sm flex-1" onClick={onExport}><Download size={14} />{t("exportPresets")}</button>
          <button className="btn btn-sm flex-1" onClick={onReset}><RotateCcw size={14} />{t("resetDesign")}</button>
        </div>
      </Group>
      <div className="flex flex-col gap-1.5">
        {presets.map((p) => (
          <div key={p.id} className="card flex items-center gap-2 p-1.5 pr-2">
            <button className="flex flex-1 items-center gap-3 rounded border-0 bg-transparent p-1 text-left" style={{ cursor: "pointer" }} onClick={() => onLoad(p.design)}>
              <Thumb design={p.design} />
              <span className="truncate font-medium">{p.name}</span>
            </button>
            <button className="btn btn-subtle btn-icon btn-sm" title={t("applyToSelected")} onClick={() => onApplyPreset(p.design)}><Wand2 size={15} /></button>
            <button className="btn btn-subtle btn-icon btn-sm" title={t("deletePreset")} onClick={() => onPresets(presets.filter((x) => x.id !== p.id))}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
