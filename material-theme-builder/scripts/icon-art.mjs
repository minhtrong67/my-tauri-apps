// Vector artwork for every icon of Material Theme Builder, in the Material 3 Expressive style:
// flat tonal color blocks, bold geometry, expressive shapes (cookie, flower, squircle, soft diamond),
// no gradients, glossy highlights or drop shadows - so it stays crisp from 16px to 1024px.
//
// Colors are roles of the official Material "Vibrant" dynamic scheme (@material/material-color-utilities), the
// saturated look used by Material 3 Expressive:
//   violet (source #6F19FF)  primary #6F18FF, onPrimaryContainer #5400CC, primaryContainer #E9DDFF, tertiaryContainer #FFD6FC
//   teal   (source #00BFA5)  primaryContainer #00FEDC, onPrimaryContainer #005145
//   yellow (source #FFD400)  primaryContainer #FFE177
//   coral  (source #FF5A36)  secondaryContainer #FFDBC9
//   red    (source #E5231B)  primary #C00006, primaryContainer #FFDAD5, onPrimaryContainer #930003
// Shared by scripts/make-icons.mjs, scripts/gen-landing-assets.mjs and the in-app logo.

export const PALETTE = {
  violet: { base: "#6F18FF", deep: "#5400CC", light: "#E9DDFF", lilac: "#F3DAFF", pink: "#FFD6FC", mint: "#00FEDC", yellow: "#FFE177", peach: "#FFDBC9" },
  teal: { base: "#00FEDC", deep: "#005145", light: "#BBECEA", dark: "#00382F" },
  red: { base: "#C00006", deep: "#930003", light: "#FFDAD5" },
};

/** Smooth n-lobed "cookie" outline, one of the signature M3 Expressive shapes. */
export function cookiePath(cx = 512, cy = 512, r = 440, amp = 40, lobes = 9, steps = 360) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const rr = r + amp * Math.cos(lobes * (a + Math.PI / 2));
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

export const COOKIE = cookiePath();

/**
 * A "petal": a square with three fully rounded corners and one small corner (index 0 TL, 1 TR, 2 BR, 3 BL).
 * Four of them, each pointing outward, make the pinwheel of tonal swatches at the heart of the icon.
 */
const petal = (x, y, s, sharp, fill) => {
  const r = [0, 1, 2, 3].map((i) => (i === sharp ? s * 0.1 : s / 2));
  return `<path d="M${x + r[0]} ${y}H${x + s - r[1]}A${r[1]} ${r[1]} 0 0 1 ${x + s} ${y + r[1]}V${y + s - r[2]}A${r[2]} ${r[2]} 0 0 1 ${x + s - r[2]} ${y + s}H${x + r[3]}A${r[3]} ${r[3]} 0 0 1 ${x} ${y + s - r[3]}V${y + r[0]}A${r[0]} ${r[0]} 0 0 1 ${x + r[0]} ${y}Z" fill="${fill}"/>`;
};

/** Inner markup of the app icon (no <svg> wrapper): a violet cookie holding a pinwheel of four tonal petals. */
export const appInner = () => {
  const c = PALETTE.violet;
  const s = 260, g = 8, lo = 512 - g - s, hi = 512 + g;
  return `<path d="${COOKIE}" fill="${c.base}"/>
  ${petal(lo, lo, s, 0, c.pink)}${petal(hi, lo, s, 1, c.yellow)}${petal(hi, hi, s, 2, c.peach)}${petal(lo, hi, s, 3, c.mint)}
  <circle cx="512" cy="512" r="62" fill="${c.light}"/><circle cx="512" cy="512" r="28" fill="${c.deep}"/>`;
};

const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${inner}</svg>`;
export const appSvg = () => wrap(appInner());

const glyphIcon = (c, tile, glyph) =>
  wrap(`<path d="${COOKIE}" fill="${c.base}"/>
  <rect x="226" y="226" width="572" height="572" rx="190" fill="${tile}"/>
  ${glyph}`);

/** Setup (installer) icon: mint cookie, deep teal tile and a download tray. */
export const setupSvg = () =>
  glyphIcon(
    PALETTE.teal,
    PALETTE.teal.dark,
    `<path d="M512 322v246m0 0-100-100m100 100 100-100" fill="none" stroke="${PALETTE.teal.base}" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M342 690h340" fill="none" stroke="${PALETTE.violet.yellow}" stroke-width="64" stroke-linecap="round"/>`,
  );

/** Uninstall icon: red cookie, pale tile and a bin. */
export const uninstallSvg = () =>
  glyphIcon(
    PALETTE.red,
    PALETTE.red.light,
    `<g fill="none" stroke="${PALETTE.red.deep}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round">
    <path d="M338 372h348M430 372v-38a26 26 0 0 1 26-26h112a26 26 0 0 1 26 26v38"/>
    <path d="M382 372l24 304a38 38 0 0 0 38 36h136a38 38 0 0 0 38-36l24-304"/>
    <path d="M468 470v146M556 470v146"/>
  </g>`,
  );

/** Flat art used for the NSIS installer header / sidebar bitmaps. */
export const bannerSvg = (w, h, vertical = false) => {
  const c = PALETTE.violet;
  const s = Math.min(w, h) * (vertical ? 1.15 : 1.3);
  const size = vertical ? s * 0.68 : h * 0.8;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${c.deep}"/>
  <circle cx="${w * (vertical ? 0.95 : 0.12)}" cy="${h * (vertical ? 0.1 : 1.1)}" r="${s * 0.55}" fill="${c.base}"/>
  <circle cx="${w * (vertical ? 0.05 : 0.96)}" cy="${h * (vertical ? 0.82 : -0.1)}" r="${s * 0.46}" fill="${c.pink}" opacity="0.9"/>
  <circle cx="${w * (vertical ? 0.78 : 0.7)}" cy="${h * (vertical ? 0.7 : 0.05)}" r="${s * 0.14}" fill="${c.mint}"/>
  <g transform="translate(${vertical ? w / 2 - size / 2 : w - h * 0.9 - 6} ${vertical ? h * 0.2 : h * 0.1}) scale(${size / 1024})">${appInner()}</g>
</svg>`;
};
