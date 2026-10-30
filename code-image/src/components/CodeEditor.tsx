import { useDeferredValue, useMemo, useState, type RefObject } from "react";
import { useApp } from "../lib/store";
import { useT } from "../lib/i18n";
import { CODE_THEMES, FONTS, LANGUAGES, MONO_FALLBACK } from "../lib/constants";
import { highlightCode } from "../lib/highlight";
import { formatCode, normalize } from "../lib/format";
import { themeVars } from "./CodeCanvas";

const LH = 20; // px, shared by gutter, highlight layer and textarea so they stay perfectly aligned
const PAD = "12px 16px 16px";

/** Insert text at a range through the browser so Ctrl+Z keeps working. */
export function insertText(el: HTMLTextAreaElement, start: number, end: number, text: string, fallback: (v: string) => void) {
  el.focus();
  el.setSelectionRange(start, end);
  if (document.execCommand("insertText", false, text)) return;
  const v = el.value;
  fallback(v.slice(0, start) + text + v.slice(end));
  requestAnimationFrame(() => el.setSelectionRange(start + text.length, start + text.length));
}

/** A small real code editor: syntax colours, line numbers, current line, auto-indent, Tab / Shift+Tab, format on paste. */
export function CodeEditor({ taRef, onFormat }: { taRef: RefObject<HTMLTextAreaElement>; onFormat: () => void }) {
  const t = useT();
  const { code, language, themeId, fontId } = useApp((s) => s.design);
  const formatOnPaste = useApp((s) => s.formatOnPaste);
  const setDesign = useApp((s) => s.setDesign);
  const theme = CODE_THEMES.find((x) => x.id === themeId) ?? CODE_THEMES[0];
  const font = `${(FONTS.find((f) => f.id === fontId) ?? FONTS[0]).family}, ${MONO_FALLBACK}`;
  const [caret, setCaret] = useState({ ln: 1, col: 1 });

  const deferred = useDeferredValue(code);
  const lineCount = code.split("\n").length;
  const hl = useMemo(() => (deferred.length > 150_000 ? null : highlightCode(deferred, language)), [deferred, language]);
  const langName = LANGUAGES.find((l) => l.id === (language === "auto" ? hl?.language : language))?.name ?? "Plain text";
  const setCode = (v: string) => setDesign({ code: v });

  const syncCaret = (el: HTMLTextAreaElement) => {
    const before = el.value.slice(0, el.selectionStart);
    const ln = before.split("\n").length, col = before.length - before.lastIndexOf("\n");
    setCaret((c) => (c.ln === ln && c.col === col ? c : { ln, col }));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget, v = el.value, a = el.selectionStart, b = el.selectionEnd;
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === "f") { e.preventDefault(); onFormat(); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      if (a === b && !e.shiftKey) return insertText(el, a, b, "  ", setCode);
      const ls = v.lastIndexOf("\n", a - 1) + 1;
      let le = v.indexOf("\n", b > a && v[b - 1] === "\n" ? b - 1 : b);
      if (le === -1) le = v.length;
      const lines = v.slice(ls, le).split("\n");
      const out = lines.map((l) => (e.shiftKey ? l.replace(/^ {1,2}/, "") : "  " + l));
      const block = out.join("\n");
      const d0 = out[0].length - lines[0].length, total = block.length - (le - ls);
      insertText(el, ls, le, block, setCode);
      el.setSelectionRange(Math.max(ls, a + d0), b + total);
    } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      const line = v.slice(v.lastIndexOf("\n", a - 1) + 1, a);
      const indent = line.match(/^ */)![0];
      const extra = /[{(\[:]\s*$/.test(line) ? "  " : "";
      const pair = /[{(\[]/.test(v[a - 1] ?? "") && /[})\]]/.test(v[b] ?? "");
      insertText(el, a, b, "\n" + indent + extra + (pair ? "\n" + indent : ""), setCode);
      if (pair) el.setSelectionRange(a + 1 + indent.length + extra.length, a + 1 + indent.length + extra.length);
    }
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    const el = e.currentTarget, a = el.selectionStart, b = el.selectionEnd;
    const whole = a === 0 && b === el.value.length; // pasting into an empty editor / over everything
    let out: string;
    if (!formatOnPaste) out = text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
    else if (whole) out = await formatCode(text, language);
    else out = normalize(text);
    insertText(el, a, b, out, setCode);
  };

  const digits = String(lineCount).length;
  const mono = { fontFamily: font, fontSize: 13, lineHeight: `${LH}px`, fontVariantLigatures: "none", tabSize: 2 } as React.CSSProperties;

  return (
    <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-m3 border border-outline-variant transition-colors duration-300"
      style={{ background: theme.bg, color: theme.fg, ...themeVars(theme) }}>
      <div className="min-h-0 flex-1 overflow-auto" onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); taRef.current?.focus(); } }}>
        <div className="flex" style={{ width: "max-content", minWidth: "100%", minHeight: "100%" }}>
          <div aria-hidden className="sticky left-0 z-10 shrink-0 select-none text-right"
            style={{ ...mono, background: theme.bg, color: theme.gutter, padding: "12px 10px 16px 14px", width: `${digits}ch`, boxSizing: "content-box", boxShadow: `1px 0 0 ${theme.fg}14` }}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} style={{ height: LH, opacity: caret.ln === i + 1 ? 1 : 0.5, color: caret.ln === i + 1 ? theme.fg : undefined }}>{i + 1}</div>
            ))}
          </div>
          <div className="relative flex-1" style={{ flex: "1 0 auto" }}>
            <pre aria-hidden className="ci-code m-0" style={{ ...mono, padding: PAD, minWidth: "100%", whiteSpace: "pre" }}>
              {code === "" && <div style={{ height: LH, color: theme.gutter, opacity: 0.8 }}>{t("codePlaceholder")}</div>}
              {code !== "" && (hl
                ? hl.lines.map((html, i) => (
                  <div key={i} style={{ height: LH, background: caret.ln === i + 1 ? `${theme.fg}12` : undefined, margin: "0 -16px", padding: "0 16px" }}
                    dangerouslySetInnerHTML={{ __html: html || " " }} />
                ))
                : code.split("\n").map((l, i) => <div key={i} style={{ height: LH }}>{l || " "}</div>))}
            </pre>
            <textarea
              ref={taRef} value={code} spellCheck={false} autoCorrect="off" autoCapitalize="off" wrap="off" aria-label={t("code")}
              onChange={(e) => { setCode(e.target.value); syncCaret(e.target); }}
              onKeyDown={onKeyDown} onPaste={onPaste}
              onSelect={(e) => syncCaret(e.currentTarget)} onClick={(e) => syncCaret(e.currentTarget)}
              className="absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent outline-none"
              style={{ ...mono, padding: PAD, whiteSpace: "pre", color: "transparent", caretColor: theme.fg, WebkitTextFillColor: "transparent" }}
            />
          </div>
        </div>
      </div>
      <div className="flex h-7 shrink-0 items-center justify-between px-3 text-[11px] tabular-nums transition-colors duration-300"
        style={{ background: theme.bar, color: theme.gutter }}>
        <span>Ln {caret.ln}, Col {caret.col}</span>
        <span>{t("spaces")}: 2 · {langName}</span>
      </div>
    </div>
  );
}
