const SIZES = [256, 128, 64, 48, 32, 16];

/** Halve repeatedly (high quality) until the target size, keeping small sizes sharp. */
export function downscale(src: HTMLCanvasElement, size: number): HTMLCanvasElement {
  let cur = src;
  while (cur.width / 2 >= size) {
    const h = document.createElement("canvas");
    h.width = h.height = cur.width / 2;
    const hc = h.getContext("2d")!;
    hc.imageSmoothingQuality = "high";
    hc.drawImage(cur, 0, 0, h.width, h.height);
    cur = h;
  }
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(cur, 0, 0, size, size);
  return c;
}

/** Build a multi-size PNG-compressed .ico from a 256px canvas. */
export async function buildIco(src: HTMLCanvasElement): Promise<Uint8Array> {
  const pngs: Uint8Array[] = [];
  for (const s of SIZES) {
    const c = downscale(src, s);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
    if (!blob) throw new Error("PNG encode failed");
    pngs.push(new Uint8Array(await blob.arrayBuffer()));
  }
  const head = 6 + 16 * SIZES.length;
  const total = head + pngs.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint16(0, 0, true);
  dv.setUint16(2, 1, true);
  dv.setUint16(4, SIZES.length, true);
  let offset = head;
  SIZES.forEach((s, i) => {
    const o = 6 + i * 16;
    out[o] = s === 256 ? 0 : s;
    out[o + 1] = s === 256 ? 0 : s;
    dv.setUint16(o + 4, 1, true);
    dv.setUint16(o + 6, 32, true);
    dv.setUint32(o + 8, pngs[i].length, true);
    dv.setUint32(o + 12, offset, true);
    out.set(pngs[i], offset);
    offset += pngs[i].length;
  });
  return out;
}

export function toBase64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Read an image file and downscale it so presets stay small. */
export function fileToDataUrl(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    img.src = url;
  });
}
