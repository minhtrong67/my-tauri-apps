import { useDeferredValue, useMemo, useState } from "react";
import { Copy, Download, FileArchive, FileCode2 } from "lucide-react";
import { EXPORT_FORMATS, buildExport, type ExportFormat } from "../../lib/export";
import { generateAll, type GeneratedTheme } from "../../lib/theme";
import { saveBinaryFile, saveTextFile } from "../../lib/tauri";
import { buildZip } from "../../lib/zip";
import { useBuilder } from "../../state/builder";
import { useSettings } from "../../state/settings";
import { useToast } from "../../state/toast";
import { Button } from "../ui";
import { Select } from "../overlays";

export function ExportTab({ theme }: { theme: GeneratedTheme }) {
  const { t } = useSettings();
  const { config } = useBuilder();
  const toast = useToast();
  const [format, setFormat] = useState<ExportFormat>("css");
  const deferredConfig = useDeferredValue(config);
  const schemes = useMemo(() => generateAll(deferredConfig), [deferredConfig]);
  const meta = EXPORT_FORMATS.find((f) => f.id === format)!;
  const code = useMemo(() => buildExport(format, { config: deferredConfig, theme, schemes }), [format, deferredConfig, theme, schemes]);
  const lines = code.split("\n").length - 1;

  const onSave = async () => {
    try {
      const ok = await saveTextFile(meta.file, code, meta.ext);
      if (ok) toast.success(t("export.saved", { name: meta.file }));
    } catch {
      toast.error(t("export.saveFailed"));
    }
  };

  const onZip = async () => {
    try {
      const files = EXPORT_FORMATS.filter((f) => f.id !== "project").map((f) => ({ name: f.file, content: buildExport(f.id, { config: deferredConfig, theme, schemes }) }));
      files.push({ name: "my-theme.mtb.json", content: buildExport("project", { config: deferredConfig, theme, schemes }) });
      const name = "material-theme.zip";
      if (await saveBinaryFile(name, buildZip(files), "zip", "application/zip")) toast.success(t("export.zipSaved", { name, count: files.length }));
    } catch {
      toast.error(t("export.saveFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">{t("export.hint")}</p>
      <div className="flex flex-wrap items-end gap-3">
      <Select<ExportFormat>
        className="w-full max-w-xs"
        label={t("export.format")}
        icon={FileCode2}
        value={format}
        onChange={setFormat}
        options={EXPORT_FORMATS.map((f) => ({ value: f.id, label: f.label, hint: f.file, icon: FileCode2 }))}
      />
      <Button variant="tonal" icon={<FileArchive className="size-4" />} data-tip={t("export.zipHint")} onClick={() => void onZip()}>
        {t("export.zip")}
      </Button>
      </div>

      <div className="overflow-hidden rounded-3xl bg-surface-container-low">
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant px-4 py-3">
          <FileCode2 className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{meta.file}</div>
            <div className="text-xs text-on-surface-variant">{t("export.stats", { lines, size: (new Blob([code]).size / 1024).toFixed(1) })}</div>
          </div>
          <Button variant="tonal" icon={<Copy className="size-4" />} onClick={() => toast.copy(code, meta.file)}>
            {t("common.copy")}
          </Button>
          <Button icon={<Download className="size-4" />} onClick={() => void onSave()}>
            {t("export.save")}
          </Button>
        </div>
        <pre key={format} className="code-block anim-fade-up max-h-[60vh] select-text overflow-auto p-4 text-xs leading-relaxed text-on-surface">
          {code}
        </pre>
      </div>
    </div>
  );
}
