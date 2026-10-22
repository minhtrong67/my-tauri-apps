import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Minus, Square, X } from "lucide-react";
import { useApp } from "../lib/store";
import { CODE_THEMES, FONTS, MONO_FALLBACK, RATIOS } from "../lib/constants";
import { highlightCode, parseLines } from "../lib/highlight";

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

export const CodeCanvas = forwardRef<HTMLDivElement, { onCut?: (cut: boolean) => void }>(function CodeCanvas({ onCut }, ref) {
  const d = useApp((s) => s.design);
  const theme = CODE_THEMES.find((t) => t.id === d.themeId) ?? CODE_THEMES[0];
  const font = FONTS.find((f) => f.id === d.fontId) ?? FONTS[0];
  const ratio = RATIOS.find((r) => r.id === d.ratio) ?? RATIOS[0];
  const fixed = ratio.w > 0;
  const availW = ratio.w - 2 * d.padding;
  const availH = ratio.h - 2 * d.padding;

  const hl = useMemo(() => highlightCode(d.code, d.language), [d.code, d.language]);
  const marked = useMemo(() => parseLines(d.highlight), [d.highlight]);

  const winRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [cut, setCut] = useState(false);

  const measure = useCallback(() => {
    const w = winRef.current, b = bodyRef.current;
    if (!w || !b || !fixed) { setScale(1); setCut(false); return; }
    const h = w.offsetHeight, ww = w.offsetWidth, bw = b.offsetWidth;
    const s = Math.min(1, availH > 0 ? availH / h : 1, bw > ww ? ww / bw : 1);
    setScale(d.fit ? Math.max(0.2, s) : 1);
    setCut(!d.fit && (h > availH + 1 || bw > ww + 1));
  }, [fixed, availH, d.fit]);

  useLayoutEffect(measure);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (winRef.current) ro.observe(winRef.current);
    if (bodyRef.current) ro.observe(bodyRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);
  useEffect(() => { onCut?.(cut); }, [cut, onCut]);

  const bg = d.bgType === "gradient" ? `linear-gradient(${d.angle}deg, ${d.g1}, ${d.g2})` : d.bgType === "solid" ? d.solid : "transparent";
  const bgLight = d.bgType === "transparent" ? false : d.bgType === "solid" ? lum(d.solid) > 0.6 : (lum(d.g1) + lum(d.g2)) / 2 > 0.6;
  const digits = String(hl.lines.length).length;
  const barText = theme.dark ? "rgba(255,255,255,.55)" : "rgba(0,0,0,.55)";
  const title = d.fileName.trim();

  const vars = {
    "--c-fg": theme.fg, "--c-comment": theme.comment, "--c-kw": theme.keyword, "--c-str": theme.string,
    "--c-num": theme.number, "--c-fn": theme.fn, "--c-type": theme.type, "--c-var": theme.variable,
    "--c-attr": theme.attr, "--c-tag": theme.tag, "--c-builtin": theme.builtin, "--c-punct": theme.punct,
  } as React.CSSProperties;

  const wmPos = d.watermarkPos === "left" ? { left: 20 } : d.watermarkPos === "right" ? { right: 20 } : { left: 0, right: 0, textAlign: "center" as const };

  return (
    <div
      ref={ref}
      style={{
        width: fixed ? ratio.w : "max-content", height: fixed ? ratio.h : undefined, minWidth: fixed ? undefined : 360,
        padding: d.padding, background: bg, boxSizing: "border-box", position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        ref={winRef}
        style={{
          ...vars, width: fixed ? Math.max(availW, 120) : "max-content", minWidth: fixed ? undefined : 420, maxWidth: fixed ? undefined : 1700,
          background: theme.bg, color: theme.fg, borderRadius: d.radius, overflow: "hidden", flexShrink: 0,
          transform: `scale(${scale})`, transformOrigin: "center",
          border: `1px solid ${theme.dark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)"}`,
          boxShadow: d.shadow ? "0 32px 64px -16px rgba(0,0,0,.5), 0 18px 36px -18px rgba(0,0,0,.55)" : "none",
        }}
      >
        {(d.chrome !== "none" || (d.showTitle && title)) && d.chrome !== "none" && (
          <div style={{ background: theme.bar, height: 40, display: "flex", alignItems: "center", padding: "0 14px", position: "relative", color: barText, fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
            {d.chrome === "mac" && (
              <div style={{ display: "flex", gap: 8 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />)}
              </div>
            )}
            {d.showTitle && title && (
              <div style={d.chrome === "mac"
                ? { position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }
                : { flex: 1 }}>{title}</div>
            )}
            {d.chrome === "windows" && (
              <div style={{ display: "flex", gap: 18, marginLeft: "auto" }}>
                <Minus size={14} /><Square size={12} /><X size={14} />
              </div>
            )}
          </div>
        )}
        <div
          ref={bodyRef} className="ci-code"
          style={{ fontFamily: `${font.family}, ${MONO_FALLBACK}`, fontSize: d.fontSize, lineHeight: 1.65, padding: "18px 22px 20px", width: "max-content", minWidth: "100%", boxSizing: "border-box" }}
        >
          {hl.lines.map((html, i) => (
            <div
              key={i}
              style={{
                display: "flex", margin: "0 -22px", padding: "0 22px",
                background: marked.has(i + 1) ? `${theme.fg}1f` : undefined,
                boxShadow: marked.has(i + 1) ? `inset 3px 0 0 ${theme.keyword}` : undefined,
              }}
            >
              {d.lineNumbers && (
                <span style={{ flex: "none", width: `${digits}ch`, marginRight: "1.6em", textAlign: "right", color: theme.gutter, opacity: 0.75 }}>{i + 1}</span>
              )}
              <span style={{ whiteSpace: "pre" }} dangerouslySetInnerHTML={{ __html: html || " " }} />
            </div>
          ))}
        </div>
      </div>
      {d.watermarkOn && d.watermarkText.trim() && (
        <div
          style={{
            position: "absolute", bottom: Math.min(16, Math.max(6, d.padding / 3)), ...wmPos, opacity: d.watermarkOpacity,
            color: d.bgType === "transparent" ? theme.fg : bgLight ? "#1b1b1f" : "#ffffff",
            fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 500, letterSpacing: ".02em",
          }}
        >{d.watermarkText}</div>
      )}
    </div>
  );
});
