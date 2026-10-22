import { toBlob, toJpeg, toSvg } from "html-to-image";
import type { ExportFormat } from "./store";

async function warmFonts(node: HTMLElement) {
  try {
    const fam = getComputedStyle(node.querySelector(".ci-code") ?? node).fontFamily;
    await document.fonts.load(`16px ${fam.split(",")[0]}`);
    await document.fonts.ready;
  } catch { /* ignore */ }
}

const dataUrlToBlob = async (u: string) => (await fetch(u)).blob();

export async function renderImage(node: HTMLElement, format: ExportFormat, scale: number, bg: string): Promise<Blob> {
  await warmFonts(node);
  const opts = { pixelRatio: scale, cacheBust: true, backgroundColor: undefined as string | undefined };
  if (format === "jpeg") {
    return dataUrlToBlob(await toJpeg(node, { ...opts, quality: 0.95, backgroundColor: bg }));
  }
  if (format === "svg") return dataUrlToBlob(await toSvg(node, opts));
  // Run once to warm up image/font caches, keep the second render (more reliable in webviews).
  await toBlob(node, opts);
  const blob = await toBlob(node, opts);
  if (!blob) throw new Error("Render failed");
  return blob;
}

export const fileStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
