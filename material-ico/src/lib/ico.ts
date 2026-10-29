const toPng = (c: HTMLCanvasElement) =>
  new Promise<Uint8Array>((res, rej) =>
    c.toBlob(async (b) => (b ? res(new Uint8Array(await b.arrayBuffer())) : rej(new Error('PNG encode failed'))), 'image/png'));

/** 32-bit BGRA DIB (BMP without file header) + empty AND mask, as classic .ico entries expect. */
function toDib(c: HTMLCanvasElement): Uint8Array {
  const w = c.width, h = c.height;
  const px = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  const maskRow = Math.ceil(w / 32) * 4;
  const imgSize = w * h * 4 + maskRow * h;
  const out = new Uint8Array(40 + imgSize);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 40, true);
  dv.setInt32(4, w, true);
  dv.setInt32(8, h * 2, true); // height covers XOR + AND masks
  dv.setUint16(12, 1, true);
  dv.setUint16(14, 32, true);
  dv.setUint32(20, imgSize, true);
  let o = 40;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      out[o++] = px[i + 2]; out[o++] = px[i + 1]; out[o++] = px[i]; out[o++] = px[i + 3];
    }
  }
  return out;
}

/**
 * Builds a multi-resolution .ico. Sizes below 256 use classic DIB entries and 256 uses PNG,
 * which is what Explorer renders reliably in every view (details, large icons, tiles...).
 */
export async function buildIco(canvases: HTMLCanvasElement[]): Promise<Uint8Array> {
  const images = await Promise.all(canvases.map((c) => (c.width >= 256 ? toPng(c) : Promise.resolve(toDib(c)))));
  const count = images.length;
  const out = new Uint8Array(6 + 16 * count + images.reduce((n, p) => n + p.length, 0));
  const dv = new DataView(out.buffer);
  dv.setUint16(2, 1, true); // type = icon
  dv.setUint16(4, count, true);
  let offset = 6 + 16 * count;
  canvases.forEach((c, i) => {
    const e = 6 + 16 * i;
    out[e] = c.width >= 256 ? 0 : c.width;
    out[e + 1] = c.height >= 256 ? 0 : c.height;
    dv.setUint16(e + 4, 1, true); // planes
    dv.setUint16(e + 6, 32, true); // bits per pixel
    dv.setUint32(e + 8, images[i].length, true);
    dv.setUint32(e + 12, offset, true);
    out.set(images[i], offset);
    offset += images[i].length;
  });
  return out;
}
