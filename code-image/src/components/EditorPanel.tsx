import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { toast } from "../lib/toast";
import { useApp, SAMPLE } from "../lib/store";
import { useT } from "../lib/i18n";
import { LANGUAGES } from "../lib/constants";
import { highlightCode, languageFromFile } from "../lib/highlight";
import { formatCode, tabsToSpaces } from "../lib/format";
import { pickCodeFile } from "../lib/tauri";
import { Btn, ConfirmDialog, IconBtn, SelectBox, Tooltip } from "./ui";
import { CodeEditor, insertText } from "./CodeEditor";

export const MAX_FILE = 500_000;

export function EditorPanel() {
  const t = useT();
  const { code, language, fileName } = useApp((s) => s.design);
  const setDesign = useApp((s) => s.setDesign);
  const ta = useRef<HTMLTextAreaElement>(null);
  const deferred = useDeferredValue(code);
  const [askClear, setAskClear] = useState(false);
  const detected = useMemo(() => (language === "auto" ? highlightCode(deferred, "auto").language : null), [deferred, language]);
  const detectedName = LANGUAGES.find((l) => l.id === detected)?.name ?? detected;

  const open = async () => {
    const f = await pickCodeFile();
    if (f && f.text.length > MAX_FILE) { toast.warning(t("fileTooLarge")); return; }
    if (f) setDesign({ code: tabsToSpaces(f.text), fileName: f.name, language: languageFromFile(f.name) ?? "auto" });
  };
  const format = async () => {
    const el = ta.current;
    if (!el || !code.trim()) return;
    const out = await formatCode(code, language);
    if (out !== code) insertText(el, 0, el.value.length, out, (v) => setDesign({ code: v }));
  };

  useEffect(() => {
    window.addEventListener("ci:open", open);
    return () => window.removeEventListener("ci:open", open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-on-surface-variant">{t("language")}</label>
          <SelectBox label={t("language")} value={language} onChange={(v) => setDesign({ language: v })}
            options={[{ value: "auto", label: t("autoDetect") }, ...LANGUAGES.map((l) => ({ value: l.id, label: l.name }))]} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-on-surface-variant">{t("fileName")}</label>
          <input
            value={fileName} onChange={(e) => setDesign({ fileName: e.target.value })} placeholder={t("untitled")} spellCheck={false}
            className="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface focus:border-primary"
          />
        </div>
      </div>
      {detectedName && <div className="-mt-1 animate-fadeIn text-xs text-on-surface-variant">{t("detected")}: <span className="font-medium text-primary">{detectedName}</span></div>}

      <CodeEditor taRef={ta} onFormat={format} />

      <div className="flex flex-wrap items-center gap-1.5">
        <Btn variant="tonal" onClick={open} className="!px-4" icon={<FileUp size={18} />}>{t("openFile")}</Btn>
        <Tooltip label={t("formatHint")} hint="Shift+Alt+F">
          <Btn variant="text" onClick={format} className="!px-3" icon={<WandSparkles size={18} />} disabled={!code.trim()}>{t("formatCode")}</Btn>
        </Tooltip>
        <IconBtn label={t("sample")} onClick={() => setDesign({ code: SAMPLE, fileName: "debounce.ts", language: "auto" })}><Sparkles size={20} /></IconBtn>
        <IconBtn label={t("clear")} onClick={() => setAskClear(true)} disabled={!code}><Trash2 size={20} /></IconBtn>
        <span className="ml-auto text-xs tabular-nums text-on-surface-variant">
          {code ? code.split("\n").length : 0} {t("lines")} · {code.length} {t("chars")}
        </span>
      </div>

      {askClear && (
        <ConfirmDialog
          title={t("clearTitle")} message={t("clearMsg")} icon={<Trash2 size={26} />}
          confirmLabel={t("clear")} cancelLabel={t("cancel")} confirmIcon={<Trash2 size={18} />}
          onCancel={() => setAskClear(false)}
          onConfirm={() => { setDesign({ code: "" }); setAskClear(false); }}
        />
      )}
    </div>
  );
}
