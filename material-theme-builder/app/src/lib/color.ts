import {
  Hct,
  QuantizerCelebi,
  Score,
  argbFromHex,
  argbFromRgb,
  hexFromArgb,
  labFromArgb,
  lstarFromArgb,
  yFromLstar,
} from "@material/material-color-utilities";

export function normalizeHex(input: string): string | null {
  let s = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return "#" + s.toUpperCase();
}

export const toHex = (argb: number): string => hexFromArgb(argb).toUpperCase();
export const toArgb = (hex: string): number => argbFromHex(hex);

function luminance(argb: number): number {
  return yFromLstar(lstarFromArgb(argb)) / 100;
}

/** WCAG 2.x contrast ratio between two ARGB colors. */
export function contrastRatio(a: number, b: number): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export function ratioOfHex(a: string, b: string): number {
  return contrastRatio(toArgb(a), toArgb(b));
}

/** Black or white, whichever is more readable on the given hex color. */
export function readableOn(hex: string): string {
  const argb = toArgb(hex);
  return contrastRatio(argb, 0xff000000) >= contrastRatio(argb, 0xffffffff) ? "#000000" : "#FFFFFF";
}

export interface HctValue {
  h: number;
  c: number;
  t: number;
}

export function hctFromHex(hex: string): HctValue {
  const x = Hct.fromInt(toArgb(hex));
  return { h: x.hue, c: x.chroma, t: x.tone };
}

export function hexFromHct(h: number, c: number, t: number): string {
  return toHex(Hct.from(h, c, t).toInt());
}

export function randomSeed(): string {
  return hexFromHct(Math.random() * 360, 36 + Math.random() * 50, 40 + Math.random() * 25);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image"));
    img.src = url;
  });
}

/** Extracts up to 6 dominant, "good looking" colors from an image file. */
export async function colorsFromImage(url: string): Promise<string[]> {
  const img = await loadImage(url);
  const max = 128;
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pixels: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 255) continue;
    pixels.push(argbFromRgb(data[i], data[i + 1], data[i + 2]));
  }
  if (!pixels.length) return [];
  const map = QuantizerCelebi.quantize(pixels, 128);
  return Score.score(map, { desired: 6 }).map(toHex);
}


/** Perceptual distance (CIE76 ΔE in L*a*b*) between two hex colors. */
export function labDistance(a: string, b: string): number {
  const [l1, a1, b1] = labFromArgb(toArgb(a));
  const [l2, a2, b2] = labFromArgb(toArgb(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * APCA lightness contrast (Lc) of text on a background, per APCA-W3 0.0.98G-4g.
 * Positive for dark text on light, negative for light text on dark. |Lc| 75+ is body text,
 * 60+ large text, 45+ UI elements, 30+ the absolute minimum.
 */
export function apcaLc(textHex: string, bgHex: string): number {
  const lum = (hex: string) => {
    const n = toArgb(hex);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.pow(v / 255, 2.4));
    const y = 0.2126729 * c[0] + 0.7151522 * c[1] + 0.072175 * c[2];
    return y < 0.022 ? y + Math.pow(0.022 - y, 1.414) : y;
  };
  const yt = lum(textHex);
  const yb = lum(bgHex);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) {
    const sapc = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14;
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
  }
  const sapc = (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14;
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}

export type ApcaLevel = "body" | "large" | "ui" | "min" | "fail";
export function apcaLevel(lc: number): ApcaLevel {
  const v = Math.abs(lc);
  return v >= 75 ? "body" : v >= 60 ? "large" : v >= 45 ? "ui" : v >= 30 ? "min" : "fail";
}
