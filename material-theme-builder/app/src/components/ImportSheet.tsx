import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardPaste, FileUp, TriangleAlert, Upload, X, CircleCheck } from "lucide-react";
import { parseTheme } from "../lib/import";
import { cn } from "../lib/utils";
import { useBuilder } from "../state/builder";
import { useSettings } from "../state/settings";
import { useToast } from "../state/toast";
import { Sheet } from "./overlays";
import { Button } from "./ui";

/** Side sheet to import a theme from pasted text or a file; the format is detected live. */
export function ImportSheet({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported?: () => void }) {
  const { t } = useSettings();
  const b = useBuilder();
  const toast = useToast();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setFileName(undefined);
    }
  }, [open]);

  const result = useMemo(() => parseTheme(text, fileName), [text, fileName]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
    setFileName(file.name);
  };

  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText());
      setFileName(undefined);
    } catch {
      toast.warning(t("import.clipboardFailed"));
    }
  };

  const submit = () => {
    if (!result) return;
    b.replace(result.config, result.name ?? null, null);
    if (result.approximate) toast.warning(t("import.doneApprox"));
    else toast.success(t("library.imported"));
    onClose();
    onImported?.();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      icon={<Upload className="size-5" />}
      title={t("import.title")}
      actions={
        <>
          <Button variant="neutral" icon={<X className="size-4" />} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button icon={<Upload className="size-4" />} disabled={!result} onClick={submit}>
            {t("import.action")}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-on-surface-variant">{t("import.hint")}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button variant="tonal" icon={<FileUp className="size-4" />} onClick={() => fileRef.current?.click()}>
          {t("import.choose")}
        </Button>
        <Button variant="neutral" icon={<ClipboardPaste className="size-4" />} onClick={() => void paste()}>
          {t("import.paste")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.css,.scss,.xml,.kt,.dart,.txt,application/json,text/*"
          hidden
          onChange={(e) => void readFile(e.target.files?.[0]).then(() => (e.target.value = ""))}
        />
      </div>
      <textarea
        value={text}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          setFileName(undefined);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void readFile(e.dataTransfer.files?.[0]);
        }}
        placeholder={t("import.placeholder")}
        aria-label={t("import.title")}
        className={cn(
          "code-block h-56 w-full resize-none select-text rounded-2xl border bg-surface-container-lowest p-3 text-xs leading-relaxed text-on-surface outline-none transition-colors duration-200 placeholder:text-on-surface-variant focus:border-primary",
          drag ? "border-primary bg-primary-container/30" : "border-outline-variant",
        )}
      />
      {text.trim() && (
        <div
          key={result ? result.kind + result.approximate : "none"}
          className={cn(
            "anim-fade-up mt-3 flex items-start gap-3 rounded-2xl p-3 text-sm",
            !result ? "bg-error-container text-on-error-container" : result.approximate ? "bg-tertiary-container text-on-tertiary-container" : "bg-primary-container text-on-primary-container",
          )}
        >
          {!result ? <TriangleAlert className="mt-0.5 size-5 shrink-0" /> : result.approximate ? <TriangleAlert className="mt-0.5 size-5 shrink-0" /> : <CircleCheck className="mt-0.5 size-5 shrink-0" />}
          <div className="min-w-0 flex-1">
            {result ? (
              <>
                <div className="flex items-center gap-2 font-medium">
                  {t(`import.kind.${result.kind}` as never)}
                  <span className="size-4 rounded-full border border-black/10" style={{ background: result.config.source }} />
                  <span className="font-mono text-xs">{result.config.source}</span>
                </div>
                <div className="text-xs opacity-85">{t(result.approximate ? "import.approx" : "import.exact")}</div>
              </>
            ) : (
              <div>{t("import.unknown")}</div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
