// Vector artwork for every icon of Material Theme Builder (Material 3 Expressive style).
// Shared by scripts/make-icons.mjs and the in-app logo so they always match.

/** 12-lobed "cookie" shape - one of the signature M3 Expressive shapes. */
export function cookiePath(cx = 512, cy = 512, r = 452, amp = 24, lobes = 12, steps = 360) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const rr = r + amp * Math.cos(lobes * (a + Math.PI / 2));
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

export const COOKIE = cookiePath();

/** Four-petal clover built from circles (a "flower" shape). */
const clover = (cx, cy, fill) => {
  const r = 58, o = 54;
  return `<g fill="${fill}"><circle cx="${cx - o}" cy="${cy - o}" r="${r}"/><circle cx="${cx + o}" cy="${cy - o}" r="${r}"/><circle cx="${cx - o}" cy="${cy + o}" r="${r}"/><circle cx="${cx + o}" cy="${cy + o}" r="${r}"/><rect x="${cx - o}" y="${cy - o}" width="${o * 2}" height="${o * 2}"/></g>`;
};

const defs = (id, from, to) => `<defs>
  <linearGradient id="bg${id}" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
  <radialGradient id="hl${id}" cx="0.3" cy="0.2" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.34"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <filter id="sh${id}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#1c0b45" flood-opacity="0.28"/></filter>
</defs>`;

const base = (id, from, to, inner) => `${defs(id, from, to)}
  <path d="${COOKIE}" fill="url(#bg${id})"/>
  <path d="${COOKIE}" fill="url(#hl${id})"/>
  ${inner}`;

/** Main app icon: palette of four expressive shapes on a violet cookie. */
export const appInner = () => `<g filter="url(#shAPP)">
    <rect x="262" y="262" width="232" height="232" rx="82" fill="#EADDFF"/>
    <circle cx="640" cy="378" r="118" fill="#D0BCFF"/>
    ${clover(378, 646, "#FFD8E4")}
    <rect x="534" y="534" width="212" height="212" rx="56" transform="rotate(45 640 640)" fill="#CCC2DC" />
  </g>`;

export const appSvg = (id = "APP") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${base(id, "#9A82DB", "#4F378B", appInner().replace("shAPP", "sh" + id))}</svg>`;

/** Setup (installer) icon: same family, teal cookie with a download tray. */
export const setupSvg = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${base(
    "SET",
    "#7C6FE0",
    "#3B2A8F",
    `<g filter="url(#shSET)">
      <rect x="236" y="236" width="552" height="552" rx="176" fill="#EADDFF"/>
      <path d="M512 330v230m0 0-92-92m92 92 92-92" fill="none" stroke="#4F378B" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M356 662h312" fill="none" stroke="#7D5260" stroke-width="56" stroke-linecap="round"/>
    </g>`,
  )}</svg>`;

/** Uninstall icon: warm (error-toned) cookie with a bin. */
export const uninstallSvg = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${base(
    "UNI",
    "#E4685D",
    "#8C1D18",
    `<g filter="url(#shUNI)">
      <rect x="236" y="236" width="552" height="552" rx="176" fill="#FFDAD6"/>
      <g fill="none" stroke="#93000A" stroke-width="52" stroke-linecap="round" stroke-linejoin="round">
        <path d="M344 372h336M432 372v-36a24 24 0 0 1 24-24h112a24 24 0 0 1 24 24v36"/>
        <path d="M388 372l22 296a36 36 0 0 0 36 34h132a36 36 0 0 0 36-34l22-296"/>
        <path d="M468 468v140M556 468v140"/>
      </g>
    </g>`,
  )}</svg>`;

/** Wide gradient art used for the NSIS installer header / sidebar bitmaps. */
export const bannerSvg = (w, h, vertical = false) => {
  const s = Math.min(w, h) * (vertical ? 1.15 : 1.3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="${vertical ? 0.4 : 1}" y2="1"><stop offset="0" stop-color="#6750A4"/><stop offset="1" stop-color="#2B1B63"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * (vertical ? 0.95 : 0.12)}" cy="${h * (vertical ? 0.1 : 1.1)}" r="${s * 0.55}" fill="#D0BCFF" opacity="0.14"/>
  <circle cx="${w * (vertical ? 0.05 : 0.96)}" cy="${h * (vertical ? 0.78 : -0.1)}" r="${s * 0.5}" fill="#EFB8C8" opacity="0.16"/>
  <g transform="translate(${vertical ? w / 2 - s * 0.34 : w - h * 0.9 - 6} ${vertical ? h * 0.2 : h * 0.1}) scale(${(vertical ? s * 0.68 : h * 0.8) / 1024})">${appSvg("BN").replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>
</svg>`;
};
