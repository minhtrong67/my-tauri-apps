import { useMemo } from "react";
import { FileUp, Sparkles, Trash2 } from "lucide-react";
import { useApp, SAMPLE } from "../lib/store";
import { useT } from "../lib/i18n";
import { LANGUAGES } from "../lib/constants";
import { highlightCode, languageFromFile } from "../lib/highlight";
import { pickCodeFile } from "../lib/tauri";
import { Btn, SelectBox } from "./ui";

export function EditorPanel() {
  const t = useT();
  const { code, language, fileName } = useApp((s) => s.design);
  const setDesign = useApp((s) => s.setDesign);
  const detected = useMemo(() => (language === "auto" ? highlightCode(code, "auto").language : null), [code, language]);
  const detectedName = LANGUAGES.find((l) => l.id === detected)?.name ?? detected;

  const open = async () => {
    const f = await pickCodeFile();
    if (f) setDesign({ code: f.text, fileName: f.name, language: languageFromFile(f.name) ?? "auto" });
  };

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

      <textarea
        value={code} spellCheck={false} placeholder={t("codePlaceholder")} aria-label={t("code")}
        onChange={(e) => setDesign({ code: e.target.value })}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          e.preventDefault();
          const el = e.currentTarget, a = el.selectionStart, b = el.selectionEnd;
          setDesign({ code: code.slice(0, a) + "  " + code.slice(b) });
          requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 2; });
        }}
        className="min-h-[220px] w-full flex-1 resize-none rounded-m3 border border-outline-variant bg-surface-low p-3 font-mono text-[13px] leading-relaxed text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-primary"
        style={{ tabSize: 2, whiteSpace: "pre", overflow: "auto" }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="tonal" onClick={open} icon={<FileUp size={18} />}>{t("openFile")}</Btn>
        <Btn variant="text" onClick={() => setDesign({ code: SAMPLE, fileName: "debounce.ts", language: "auto" })} icon={<Sparkles size={18} />}>{t("sample")}</Btn>
        <Btn variant="text" onClick={() => setDesign({ code: "" })} icon={<Trash2 size={18} />} disabled={!code}>{t("clear")}</Btn>
        <span className="ml-auto text-xs tabular-nums text-on-surface-variant">
          {code ? code.split("\n").length : 0} {t("lines")} · {code.length} {t("chars")}
        </span>
      </div>
    </div>
  );
}
