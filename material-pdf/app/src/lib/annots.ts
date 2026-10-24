/**
 * Standard PDF annotations.
 *
 * Material PDF writes its annotations as real PDF annotation objects (/Highlight, /Square, /Ink, /FreeText) with
 * appearance streams, so every other reader shows them too. Each one carries a /NM name starting with "mpdf:" and the
 * Info dictionary gets an /MPDF flag, which lets the app find them again on the next open and keep them editable.
 * Annotations made by other tools are never touched.
 *
 * Coordinates in the Annot model are scale-1 viewport units (origin top-left, page rotation applied).
 */
import {
  PDFArray, PDFBool, PDFCheckBox, PDFDict, PDFDocument, PDFDropdown, PDFHexString, PDFName, PDFNumber, PDFOptionList,
  PDFRadioGroup, PDFRef, PDFString, PDFTextField,
} from "pdf-lib";
import type { Annot } from "./store";

export const MARK = "mpdf:";
const FLAG = PDFName.of("MPDF");

/** The slice of a pdf.js PageViewport we need (scale 1). */
export interface Vp {
  rotation: number;
  convertToPdfPoint(x: number, y: number): [number, number];
  convertToViewportPoint(x: number, y: number): [number, number];
}
export type VpOf = (pageIndex: number) => Promise<Vp>;
export type TextPng = (text: string, size: number, color: string) => Promise<{ png: Uint8Array; w: number; h: number }>;
export type FormValues = Record<string, string | boolean>;

const infoDict = (d: PDFDocument) => (d as unknown as { getInfoDict(): PDFDict }).getInfoDict();
const n3 = (n: number) => Math.round(n * 1000) / 1000;
const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const rgbToHex = (c: number[]) => "#" + c.slice(0, 3).map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const bbox = (pts: [number, number][]): [number, number, number, number] => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

export async function textToPng(text: string, size: number, color: string) {
  const k = 3, fam = getComputedStyle(document.documentElement).getPropertyValue("--font").trim() || "system-ui, sans-serif", font = `${size * k}px ${fam}`;
  const lines = text.split("\n");
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = font;
  const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 4;
  const lh = Math.ceil(size * k * 1.25);
  c.width = w; c.height = lh * lines.length + 4;
  ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, 2, i * lh + 2));
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
  return { png: new Uint8Array(await blob.arrayBuffer()), w: c.width / k, h: c.height / k };
}

/** Keeps pen strokes light: drops points closer than `d` to the previous kept one (always keeps the last). */
function thin(pts: [number, number][], d = 0.6): [number, number][] {
  const out: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) if (Math.hypot(pts[i][0] - out[out.length - 1][0], pts[i][1] - out[out.length - 1][1]) >= d) out.push(pts[i]);
  out.push(pts[pts.length - 1]);
  return out;
}

/** Writes annotations + form values onto `base` (a PDF that holds no Material PDF annotations). */
export async function writeAnnots(
  base: Uint8Array, vpOf: VpOf, annots: Annot[], forms: FormValues, textPng: TextPng = textToPng,
): Promise<Uint8Array> {
  const hasForms = Object.keys(forms).length > 0;
  if (!annots.length && !hasForms) return base;
  const doc = await PDFDocument.load(base, { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;

  const byPage = new Map<number, Annot[]>();
  annots.forEach((a) => byPage.set(a.page, [...(byPage.get(a.page) ?? []), a]));

  for (const [pi, list] of byPage) {
    if (pi < 0 || pi >= doc.getPageCount()) continue;
    const page = doc.getPage(pi);
    const vp = await vpOf(pi);
    const P = (x: number, y: number) => vp.convertToPdfPoint(x, y) as [number, number];
    const corners = (x: number, y: number, w: number, h: number) => bbox([P(x, y), P(x + w, y), P(x, y + h), P(x + w, y + h)]);

    const form = (rect: number[], content: string, extra: Record<string, any> = {}, resources: Record<string, any> = {}) =>
      ctx.register(ctx.stream(content, { Type: "XObject", Subtype: "Form", BBox: rect, Resources: resources, ...extra }));
    const refs: PDFRef[] = [];
    const push = (dict: Record<string, any>) => refs.push(ctx.register(ctx.obj({ Type: "Annot", F: 4, ...dict })));

    for (const a of list) {
      const nm = PDFString.of(MARK + a.id);
      const [r, g, b] = hexToRgb(a.color);
      const rg = `${n3(r)} ${n3(g)} ${n3(b)}`;

      if (a.type === "highlight") {
        const [x0, y0, x1, y1] = corners(a.x, a.y, a.w, a.h);
        const tl = P(a.x, a.y), tr = P(a.x + a.w, a.y), bl = P(a.x, a.y + a.h), br = P(a.x + a.w, a.y + a.h);
        const gs = ctx.obj({ Type: "ExtGState", BM: "Multiply", ca: 0.4, CA: 0.4 });
        const ap = form([x0, y0, x1, y1], `/G gs ${rg} rg ${n3(x0)} ${n3(y0)} ${n3(x1 - x0)} ${n3(y1 - y0)} re f`, {}, { ExtGState: { G: gs } });
        push({ Subtype: "Highlight", NM: nm, Rect: [x0, y0, x1, y1].map(n3), C: [r, g, b].map(n3), CA: 0.4, QuadPoints: [...tl, ...tr, ...bl, ...br].map(n3), AP: { N: ap } });
      } else if (a.type === "rect") {
        const [x0, y0, x1, y1] = corners(a.x, a.y, a.w, a.h), hw = a.width / 2;
        const rect = [x0 - hw, y0 - hw, x1 + hw, y1 + hw].map(n3);
        const ap = form(rect, `${rg} RG ${n3(a.width)} w ${n3(x0)} ${n3(y0)} ${n3(x1 - x0)} ${n3(y1 - y0)} re S`);
        push({ Subtype: "Square", NM: nm, Rect: rect, C: [r, g, b].map(n3), BS: { W: a.width, S: "S" }, AP: { N: ap } });
      } else if (a.type === "pen") {
        const pts = thin(a.pts).map(([x, y]) => P(x, y));
        const [x0, y0, x1, y1] = bbox(pts), hw = a.width / 2;
        const rect = [x0 - hw, y0 - hw, x1 + hw, y1 + hw].map(n3);
        const path = pts.map(([x, y], i) => `${n3(x)} ${n3(y)} ${i ? "l" : "m"}`).join(" ");
        const ap = form(rect, `${rg} RG ${n3(a.width)} w 1 J 1 j ${path} S`);
        push({ Subtype: "Ink", NM: nm, Rect: rect, C: [r, g, b].map(n3), BS: { W: a.width, S: "S" }, InkList: [pts.flatMap(([x, y]) => [n3(x), n3(y)])], AP: { N: ap } });
      } else if (a.text.trim()) {
        const t = await textPng(a.text, a.size, a.color);
        const img = await doc.embedPng(t.png);
        const [x0, y0, x1, y1] = corners(a.x, a.y, t.w, t.h);
        const th = (vp.rotation * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
        const ap = form([0, 0, t.w, t.h].map(n3), `q ${n3(t.w)} 0 0 ${n3(t.h)} 0 0 cm /Im0 Do Q`,
          { Matrix: [c, s, -s, c, 0, 0].map((v) => Math.round(v)) }, { XObject: { Im0: img.ref } });
        push({
          Subtype: "FreeText", NM: nm, Rect: [x0, y0, x1, y1].map(n3), Contents: PDFHexString.fromText(a.text),
          DA: PDFString.of(`/Helv ${a.size} Tf ${rg} rg`), AP: { N: ap },
        });
      }
    }
    if (!refs.length) continue;
    let arr = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!arr) { arr = ctx.obj([]); page.node.set(PDFName.of("Annots"), arr); }
    refs.forEach((r) => arr!.push(r));
  }
  if (annots.length) infoDict(doc).set(FLAG, PDFString.of("1"));

  let fallback = false;
  if (hasForms) {
    const form = doc.getForm();
    for (const [name, val] of Object.entries(forms)) {
      try {
        const f = form.getField(name);
        if (f instanceof PDFTextField) f.setText(String(val));
        else if (f instanceof PDFCheckBox) (val ? f.check() : f.uncheck());
        else if (f instanceof PDFRadioGroup) f.select(String(val));
        else if (f instanceof PDFDropdown || f instanceof PDFOptionList) f.select(String(val));
      } catch (e) { console.warn("form field", name, e); }
    }
    // standard fonts can't draw every character (e.g. Vietnamese): let the viewer regenerate those appearances
    try { form.updateFieldAppearances(); } catch { fallback = true; }
    if (fallback) form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }
  return doc.save({ useObjectStreams: true, updateFieldAppearances: false });
}

export interface RawAnnot {
  page: number; id: string; sub: string; rect: number[]; color: string; width: number; ink: number[]; contents: string; da: string;
}

const nums = (o: unknown): number[] => (o instanceof PDFArray ? o.asArray().map((x) => (x instanceof PDFNumber ? x.asNumber() : NaN)) : []);
const text = (o: unknown) => (o instanceof PDFString || o instanceof PDFHexString ? o.decodeText() : "");

/** Removes Material PDF annotations from `bytes`; returns the stripped PDF plus what was removed (null if none). */
export async function extractManaged(bytes: Uint8Array): Promise<{ base: Uint8Array; raws: RawAnnot[] } | null> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context, raws: RawAnnot[] = [];
  const drop = (o: unknown) => { if (o instanceof PDFRef) ctx.delete(o); };
  doc.getPages().forEach((page, pi) => {
    const arr = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!arr) return;
    for (let i = arr.size() - 1; i >= 0; i--) {
      const d = arr.lookupMaybe(i, PDFDict);
      if (!d) continue;
      const nm = text(d.lookup(PDFName.of("NM")));
      if (!nm.startsWith(MARK)) continue;
      const bs = d.lookupMaybe(PDFName.of("BS"), PDFDict);
      const w = bs?.lookup(PDFName.of("W"));
      const ink = (d.lookup(PDFName.of("InkList")) as PDFArray | undefined)?.lookup(0);
      raws.push({
        page: pi, id: nm.slice(MARK.length), sub: (d.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText() ?? "",
        rect: nums(d.lookup(PDFName.of("Rect"))), color: rgbToHex(nums(d.lookup(PDFName.of("C")))),
        width: w instanceof PDFNumber ? w.asNumber() : 1, ink: nums(ink),
        contents: text(d.lookup(PDFName.of("Contents"))), da: text(d.lookup(PDFName.of("DA"))),
      });
      // free the appearance objects too, otherwise they would pile up in the file on every save
      const ap = d.lookupMaybe(PDFName.of("AP"), PDFDict), nref = ap?.get(PDFName.of("N"));
      const nstream = ap?.lookup(PDFName.of("N"));
      const xo = (nstream as { dict?: PDFDict } | undefined)?.dict?.lookupMaybe(PDFName.of("Resources"), PDFDict)?.lookupMaybe(PDFName.of("XObject"), PDFDict);
      xo?.entries().forEach(([, v]) => {
        // an embedded PNG also owns an /SMask (alpha) object
        const img = ctx.lookup(v) as { dict?: PDFDict } | undefined;
        drop(img?.dict?.get(PDFName.of("SMask")));
        drop(v);
      });
      drop(nref);
      drop(arr.get(i));
      arr.remove(i);
    }
  });
  if (!raws.length) return null;
  infoDict(doc).delete(FLAG);
  return { base: await doc.save({ useObjectStreams: true }), raws: raws.reverse() };
}

/** True when the Info dictionary carries the Material PDF flag (cheap check via pdf.js metadata). */
export const isManaged = async (pdf: { getMetadata(): Promise<{ info: any }> }) => {
  try { return (await pdf.getMetadata()).info?.Custom?.MPDF === "1"; } catch { return false; }
};

/** Raw PDF-space annotations -> editor model. */
export async function rawToAnnots(raws: RawAnnot[], vpOf: VpOf): Promise<Annot[]> {
  const out: Annot[] = [];
  for (const r of raws) {
    if (r.rect.length < 4 || r.rect.some(Number.isNaN)) continue;
    const vp = await vpOf(r.page);
    const V = (x: number, y: number) => vp.convertToViewportPoint(x, y) as [number, number];
    const [x0, y0, x1, y1] = bbox([V(r.rect[0], r.rect[1]), V(r.rect[2], r.rect[3])]);
    const id = r.id;
    if (r.sub === "Highlight") out.push({ id, type: "highlight", page: r.page, x: x0, y: y0, w: x1 - x0, h: y1 - y0, color: r.color });
    else if (r.sub === "Square") { const hw = r.width / 2; out.push({ id, type: "rect", page: r.page, x: x0 + hw, y: y0 + hw, w: x1 - x0 - r.width, h: y1 - y0 - r.width, color: r.color, width: r.width }); }
    else if (r.sub === "Ink" && r.ink.length >= 4) {
      const pts: [number, number][] = [];
      for (let i = 0; i + 1 < r.ink.length; i += 2) pts.push(V(r.ink[i], r.ink[i + 1]));
      out.push({ id, type: "pen", page: r.page, pts, color: r.color, width: r.width });
    } else if (r.sub === "FreeText") {
      const size = /([\d.]+)\s+Tf/.exec(r.da)?.[1];
      const c = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg/.exec(r.da);
      out.push({ id, type: "text", page: r.page, x: x0, y: y0, text: r.contents, size: size ? +size : 16, color: c ? rgbToHex([+c[1], +c[2], +c[3]]) : "#000000" });
    }
  }
  return out;
}
