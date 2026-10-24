import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { gotoPage, setFormValue } from "../lib/actions";
import { openExternal } from "../lib/native";

interface Item {
  kind: "link" | "text" | "check" | "radio" | "choice";
  r: [number, number, number, number]; // scale-1 viewport units: x, y, w, h
  data: any;
}

const cache = new WeakMap<PDFDocumentProxy, Map<number, Promise<Item[]>>>();
function loadItems(pdf: PDFDocumentProxy, index: number): Promise<Item[]> {
  let m = cache.get(pdf); if (!m) cache.set(pdf, (m = new Map()));
  let p = m.get(index);
  if (!p) {
    p = (async () => {
      const page = await pdf.getPage(index + 1), vp = page.getViewport({ scale: 1 });
      const out: Item[] = [];
      for (const d of await page.getAnnotations({ intent: "display" })) {
        const [x1, y1, x2, y2] = vp.convertToViewportRectangle(d.rect);
        const r: Item["r"] = [Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)];
        if (r[2] < 2 || r[3] < 2) continue;
        if (d.subtype === "Link" && (d.url || d.dest || d.action)) out.push({ kind: "link", r, data: d });
        else if (d.subtype === "Widget" && !d.readOnly && !d.hidden && d.fieldName) {
          if (d.fieldType === "Tx") out.push({ kind: "text", r, data: d });
          else if (d.fieldType === "Btn" && d.checkBox) out.push({ kind: "check", r, data: d });
          else if (d.fieldType === "Btn" && d.radioButton) out.push({ kind: "radio", r, data: d });
          else if (d.fieldType === "Ch") out.push({ kind: "choice", r, data: d });
        }
      }
      return out;
    })();
    m.set(index, p);
  }
  return p;
}

async function destPage(pdf: PDFDocumentProxy, dest: unknown): Promise<number | null> {
  try {
    const d = typeof dest === "string" ? await pdf.getDestination(dest) : dest;
    if (!Array.isArray(d)) return null;
    return typeof d[0] === "object" ? await pdf.getPageIndex(d[0]) : Number(d[0]);
  } catch { return null; }
}

async function follow(pdf: PDFDocumentProxy, d: any, current: number) {
  if (d.url) return openExternal(d.url);
  if (d.action === "NextPage") return gotoPage(current + 1);
  if (d.action === "PrevPage") return gotoPage(current - 1);
  if (d.action === "FirstPage") return gotoPage(0);
  if (d.action === "LastPage") return gotoPage(pdf.numPages - 1);
  if (d.dest) { const i = await destPage(pdf, d.dest); if (i != null) gotoPage(i); }
}

const initial = (d: any) => (Array.isArray(d.fieldValue) ? d.fieldValue[0] ?? "" : d.fieldValue ?? "");

/** Custom dropdown (no native <select>): themed, scrollable, keyboard friendly. */
function FieldSelect({ value, options, style, onChange }: { value: string; options: { v: string; label: string }[]; style: React.CSSProperties; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<DOMRect | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!(e.target as Element).closest(".fsel-pop") && e.target !== btn.current) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("mousedown", away); addEventListener("keydown", k); addEventListener("resize", () => setOpen(false));
    return () => { removeEventListener("mousedown", away); removeEventListener("keydown", k); };
  }, [open]);
  const cur = options.find((o) => o.v === value);
  const flip = box ? box.bottom + 230 > innerHeight : false;
  return (
    <>
      <button ref={btn} className="pf-field pf-select ripple" style={style} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => { setBox(btn.current!.getBoundingClientRect()); setOpen((o) => !o); }}>
        <span>{cur?.label ?? value}</span><ChevronDown size={14} />
      </button>
      {open && box && createPortal(
        <ul className="fsel-pop" role="listbox" style={{ left: box.left, minWidth: Math.max(box.width, 140), ...(flip ? { bottom: innerHeight - box.top + 4 } : { top: box.bottom + 4 }) }}>
          {options.map((o) => (
            <li key={o.v}><button role="option" aria-selected={o.v === value} className={`menu-item ripple ${o.v === value ? "on" : ""}`} onClick={() => { onChange(o.v); setOpen(false); }}>
              <span>{o.label}</span>{o.v === value && <Check size={16} />}
            </button></li>
          ))}
        </ul>, document.body)}
    </>
  );
}

/** Clickable PDF links and fillable form fields drawn over a page. */
export const PageFields = memo(function PageFields({ pdf, index, scale, active, forms }: {
  pdf: PDFDocumentProxy; index: number; scale: number; active: boolean; forms: Record<string, string | boolean>;
}) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { let on = true; loadItems(pdf, index).then((v) => on && setItems(v)).catch(() => {}); return () => { on = false; }; }, [pdf, index]);
  if (!items.length) return null;
  return (
    <div className={`pf-layer ${active ? "" : "off"}`}>
      {items.map((it, k) => {
        const d = it.data, [x, y, w, h] = it.r;
        const pos: React.CSSProperties = { left: x * scale, top: y * scale, width: w * scale, height: h * scale };
        const val = forms[d.fieldName] ?? (it.kind === "check" ? (initial(d) !== "" && initial(d) !== "Off") : initial(d));
        if (it.kind === "link")
          return <a key={k} className="pf-link" style={pos} href="#" data-tip={d.url ? String(d.url) : undefined} aria-label={d.url ?? "link"}
            onClick={(e) => { e.preventDefault(); void follow(pdf, d, index); }} />;
        if (it.kind === "text") {
          const fs = Math.max(8, Math.min(h * 0.62, 15) * scale);
          const common = { className: "pf-field", style: { ...pos, fontSize: fs }, value: String(val), maxLength: d.maxLen || undefined, "aria-label": d.alternativeText || d.fieldName, spellCheck: false as const };
          return d.multiLine
            ? <textarea key={k} {...common} onChange={(e) => setFormValue(d.fieldName, e.target.value)} />
            : <input key={k} {...common} type={d.password ? "password" : "text"} onChange={(e) => setFormValue(d.fieldName, e.target.value)} />;
        }
        if (it.kind === "check")
          return <button key={k} role="checkbox" aria-checked={!!val} className={`pf-check ${val ? "on" : ""}`} style={pos} aria-label={d.alternativeText || d.fieldName}
            onClick={() => setFormValue(d.fieldName, !val)}>{val && <Check size={Math.max(10, Math.min(w, h) * scale * 0.8)} strokeWidth={3.2} />}</button>;
        if (it.kind === "radio")
          return <button key={k} role="radio" aria-checked={val === d.buttonValue} className={`pf-radio ${val === d.buttonValue ? "on" : ""}`} style={pos} aria-label={d.alternativeText || d.fieldName}
            onClick={() => setFormValue(d.fieldName, d.buttonValue)}><i /></button>;
        const options = (d.options ?? []).map((o: any) => ({ v: String(o.exportValue ?? o.displayValue), label: String(o.displayValue ?? o.exportValue) }));
        return <FieldSelect key={k} value={String(val)} options={options} style={{ ...pos, fontSize: Math.max(8, Math.min(h * 0.62, 15) * scale) }} onChange={(v) => setFormValue(d.fieldName, v)} />;
      })}
    </div>
  );
});
