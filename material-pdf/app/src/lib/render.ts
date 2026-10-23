import type { PDFDocumentProxy } from "pdfjs-dist";

/**
 * Page bitmap cache + job queue. Rendered canvases are kept (LRU, pixel budget) so that scrolling,
 * zooming back and flipping pages re-use them instantly instead of flashing blank pages.
 */
const ids = new WeakMap<object, number>();
let nextId = 0;
const pid = (p: object) => ids.get(p) ?? (ids.set(p, ++nextId), nextId);
const cache = new Map<string, HTMLCanvasElement>();
let pixels = 0;
const MAX_PIXELS = 110e6;

interface Job { p: Promise<HTMLCanvasElement | null>; refs: number; task?: { cancel(): void } }
const jobs = new Map<string, Job>();

export const keyOf = (pdf: PDFDocumentProxy, i: number, scale: number) => `${pid(pdf)}:${i}:${scale.toFixed(3)}`;
const outScale = (w: number, h: number) => Math.min(Math.min(devicePixelRatio || 1, 2.5), Math.sqrt(16e6 / (w * h)));

export function peek(pdf: PDFDocumentProxy, i: number, scale: number) {
  const k = keyOf(pdf, i, scale), c = cache.get(k);
  if (c) { cache.delete(k); cache.set(k, c); }
  return c ?? null;
}

function store(k: string, c: HTMLCanvasElement) {
  cache.set(k, c); pixels += c.width * c.height;
  while (pixels > MAX_PIXELS && cache.size > 1) {
    const [ok, oc] = cache.entries().next().value as [string, HTMLCanvasElement];
    cache.delete(ok); pixels -= oc.width * oc.height;
  }
}

/** Ask for a page bitmap. Call `release()` when it is no longer needed so queued work can be cancelled. */
export function request(pdf: PDFDocumentProxy, i: number, scale: number) {
  const k = keyOf(pdf, i, scale), hit = peek(pdf, i, scale);
  if (hit) return { promise: Promise.resolve(hit), release() {} };
  let job = jobs.get(k);
  if (!job) {
    const j: Job = { refs: 0, p: null as unknown as Promise<HTMLCanvasElement | null> };
    jobs.set(k, j); job = j;
    j.p = (async () => {
      try {
        const page = await pdf.getPage(i + 1);
        if (j.refs <= 0) return null;
        const vp = page.getViewport({ scale }), out = outScale(vp.width, vp.height);
        const c = document.createElement("canvas");
        c.width = Math.floor(vp.width * out); c.height = Math.floor(vp.height * out);
        const rt = page.render({ canvasContext: c.getContext("2d")!, viewport: page.getViewport({ scale: scale * out }), background: "#ffffff" });
        j.task = rt;
        await rt.promise;
        store(k, c);
        return c;
      } catch { return null; } finally { jobs.delete(k); }
    })();
  }
  job.refs++;
  let done = false; const j = job;
  return { promise: j.p, release() { if (done) return; done = true; if (--j.refs <= 0) j.task?.cancel(); } };
}
