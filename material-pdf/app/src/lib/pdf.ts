import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { BlendMode, degrees, LineCapStyle, PDFDocument, rgb } from "pdf-lib";
import type { Annot } from "./store";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export { pdfjs };

export class PasswordError extends Error { constructor(public wrong: boolean) { super("password"); } }

export async function loadPdf(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  try {
    return await pdfjs.getDocument({
      data: bytes.slice(), password, cMapUrl: "/cmaps/", cMapPacked: true, standardFontDataUrl: "/standard_fonts/",
    }).promise;
  } catch (e: any) {
    if (e?.name === "PasswordException") throw new PasswordError(e.code === 2);
    throw e;
  }
}

export async function readSizes(pdf: PDFDocumentProxy) {
  const out: { w: number; h: number }[] = new Array(pdf.numPages);
  for (let i = 0; i < pdf.numPages; i += 40) {
    await Promise.all(
      Array.from({ length: Math.min(40, pdf.numPages - i) }, async (_, k) => {
        const v = (await pdf.getPage(i + k + 1)).getViewport({ scale: 1 });
        out[i + k] = { w: v.width, h: v.height };
      }),
    );
  }
  return out;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

async function textToPng(text: string, size: number, color: string) {
  const k = 3, font = `${size * k}px system-ui, "Segoe UI", Roboto, sans-serif`;
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

/** Bakes annotations (stored in scale-1 viewport units) into the PDF. */
export async function flattenAnnots(bytes: Uint8Array, pdf: PDFDocumentProxy, annots: Annot[]): Promise<Uint8Array> {
  if (!annots.length) return bytes;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const byPage = new Map<number, Annot[]>();
  annots.forEach((a) => byPage.set(a.page, [...(byPage.get(a.page) ?? []), a]));
  for (const [pi, list] of byPage) {
    const page = doc.getPage(pi);
    const vp = (await pdf.getPage(pi + 1)).getViewport({ scale: 1 });
    const P = (x: number, y: number) => vp.convertToPdfPoint(x, y) as [number, number];
    for (const a of list) {
      if (a.type === "highlight" || a.type === "rect") {
        const [x0, y0] = P(a.x, a.y), [x1, y1] = P(a.x + a.w, a.y + a.h);
        const o = { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) };
        if (a.type === "highlight") page.drawRectangle({ ...o, color: hexRgb(a.color), opacity: 0.4, blendMode: BlendMode.Multiply, borderWidth: 0 });
        else page.drawRectangle({ ...o, borderColor: hexRgb(a.color), borderWidth: a.width });
      } else if (a.type === "pen") {
        for (let i = 1; i < a.pts.length; i++) {
          const [sx, sy] = P(...a.pts[i - 1]), [ex, ey] = P(...a.pts[i]);
          page.drawLine({ start: { x: sx, y: sy }, end: { x: ex, y: ey }, thickness: a.width, color: hexRgb(a.color), lineCap: LineCapStyle.Round });
        }
      } else if (a.text.trim()) {
        const t = await textToPng(a.text, a.size, a.color);
        const img = await doc.embedPng(t.png);
        const [x, y] = P(a.x, a.y + t.h);
        page.drawImage(img, { x, y, width: t.w, height: t.h, rotate: degrees(vp.rotation) });
      }
    }
  }
  return doc.save({ useObjectStreams: true });
}

export async function applyPageOps(bytes: Uint8Array, ops: { src: number; rot: number }[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, ops.map((o) => o.src));
  pages.forEach((p, i) => {
    p.setRotation(degrees((((p.getRotation().angle + ops[i].rot) % 360) + 360) % 360));
    out.addPage(p);
  });
  const t = src.getTitle(), a = src.getAuthor();
  if (t) out.setTitle(t);
  if (a) out.setAuthor(a);
  return out.save({ useObjectStreams: true });
}

export async function mergePdfs(list: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const b of list) {
    const src = await PDFDocument.load(b, { ignoreEncryption: true });
    (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
  }
  return out.save({ useObjectStreams: true });
}

/** "1-3, 5, 8-" -> [0,1,2,4,7,...] (0-based, order kept). Throws on invalid input. */
export function parseRanges(input: string, n: number): number[][] {
  const groups: number[][] = [];
  for (const part of input.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d*)(?:-(\d*))?$/.exec(part);
    if (!m || (!m[1] && !m[2])) throw new Error("range");
    let a = m[1] ? +m[1] : 1;
    let b = part.includes("-") ? (m[2] ? +m[2] : n) : a;
    if (a < 1 || b < 1 || a > n || b > n) throw new Error("range");
    const g: number[] = [];
    if (a <= b) for (let i = a; i <= b; i++) g.push(i - 1); else for (let i = a; i >= b; i--) g.push(i - 1);
    groups.push(g);
  }
  if (!groups.length) throw new Error("range");
  return groups;
}

async function toPng(bytes: Uint8Array): Promise<Uint8Array> {
  const bmp = await createImageBitmap(new Blob([bytes as BlobPart]));
  const c = document.createElement("canvas");
  c.width = bmp.width; c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function imagesToPdf(items: { name: string; bytes: Uint8Array }[], mode: "fit" | "a4", margin: number) {
  const doc = await PDFDocument.create();
  for (const it of items) {
    const b = it.bytes;
    const isJpg = b[0] === 0xff && b[1] === 0xd8, isPng = b[0] === 0x89 && b[1] === 0x50;
    const img = isJpg ? await doc.embedJpg(b) : await doc.embedPng(isPng ? b : await toPng(b));
    if (mode === "fit") {
      const w = img.width * 0.75, h = img.height * 0.75;
      doc.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
    } else {
      const land = img.width > img.height;
      const [pw, ph] = land ? [841.89, 595.28] : [595.28, 841.89];
      const k = Math.min((pw - margin * 2) / img.width, (ph - margin * 2) / img.height, 1.5);
      const w = img.width * k, h = img.height * k;
      doc.addPage([pw, ph]).drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    }
  }
  return doc.save({ useObjectStreams: true });
}

export async function setMetadata(bytes: Uint8Array, m: { title: string; author: string; subject: string; keywords: string }) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  doc.setTitle(m.title); doc.setAuthor(m.author); doc.setSubject(m.subject);
  doc.setKeywords(m.keywords.split(",").map((k) => k.trim()).filter(Boolean));
  return doc.save({ useObjectStreams: true });
}

/** Render a page into a canvas at a given scale. */
export async function renderToCanvas(pdf: PDFDocumentProxy, pageNo: number, scale: number, canvas?: HTMLCanvasElement) {
  const page = await pdf.getPage(pageNo);
  const vp = page.getViewport({ scale });
  const c = canvas ?? document.createElement("canvas");
  c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return c;
}
export const canvasBlob = (c: HTMLCanvasElement, type = "image/png", q?: number): Promise<Blob> =>
  new Promise((r) => c.toBlob((b) => r(b!), type, q));
