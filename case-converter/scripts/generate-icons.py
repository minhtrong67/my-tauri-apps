#!/usr/bin/env python3
"""
Generates every icon and installer image of Case Converter in the Material 3 Expressive style:
a scalloped "cookie" shape in vivid deep orange (seed #FF5722), a bold "Aa" monogram and a tertiary sparkle.

Outputs (src-tauri/icons):
  32x32.png  128x128.png  128x128@2x.png  icon.png      application icon (PNG)
  icon.ico                                              application icon (16-256 px, standard Windows sizes)
  setup.ico                                             Setup.exe icon (app icon + download badge)
  uninstall.ico                                         Uninstall icon (app icon + bin badge)
  installer-header.bmp  installer-sidebar.bmp           NSIS installer images (150x57, 164x314)
  uninstall-header.bmp                                  NSIS uninstaller header (150x57)
plus src/assets/logo.svg (logo inside the app and the landing page) and src/assets/og-image.png (social preview).

Usage:  pip install cairosvg fonttools brotli pillow
        npm run icons
"""
import io
import math
import struct
from pathlib import Path

import cairosvg
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "src-tauri" / "icons"
ASSETS = ROOT / "src" / "assets"
FONTS = Path(__file__).resolve().parent / "assets"
ICONS.mkdir(parents=True, exist_ok=True)
ASSETS.mkdir(parents=True, exist_ok=True)

# Material 3 tonal palette generated from the seed #FF5722 (deep orange), plus its tertiary (golden) palette.
T = {10: "#3B0900", 20: "#5F1500", 30: "#862200", 40: "#B02F00", 50: "#DB3E03", 60: "#FF5722",
     70: "#FF8B69", 80: "#FFB5A0", 90: "#FFDBD1", 95: "#FFEDE8", 98: "#FFF8F6", 99: "#FFFBFF"}
TERT = {30: "#564500", 80: "#E0C56D", 90: "#FDE186"}
ERROR, ON_ERROR = "#BA1A1A", "#FFFFFF"


class Face:
    def __init__(self, name):
        self.font = TTFont(str(FONTS / name))
        self.gs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.upm = self.font["head"].unitsPerEm
        self.cap = self.font["OS/2"].sCapHeight

    def glyph(self, ch, scale, x, baseline):
        """SVG path (y flipped) for one character, left edge of its outline at x."""
        name = self.cmap[ord(ch)]
        bp = BoundsPen(self.gs)
        self.gs[name].draw(bp)
        xmin, _, xmax, _ = bp.bounds
        pen = SVGPathPen(self.gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        self.gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x - xmin * scale, baseline)))
        return pen.getCommands(), (xmax - xmin) * scale

    def text(self, text, size, x, baseline, gap=0.0):
        """Path for a short string, set with the font's advance widths (kerning ignored)."""
        scale = size / self.upm
        out, cx = [], x
        for ch in text:
            name = self.cmap[ord(ch)]
            pen = SVGPathPen(self.gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
            self.gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, cx, baseline)))
            out.append(pen.getCommands())
            cx += self.font["hmtx"][name][0] * scale + gap
        return " ".join(out)

    def width(self, text, size, gap=0.0):
        scale = size / self.upm
        return sum(self.font["hmtx"][self.cmap[ord(c)]][0] * scale + gap for c in text) - gap


BOLD, MEDIUM = Face("roboto-latin-700-normal.woff2"), Face("roboto-latin-500-normal.woff2")


def aa_paths(cap_px, cx, cy, gap):
    """The 'Aa' monogram centered on (cx, cy); returns (path A, path a)."""
    scale = cap_px / BOLD.cap
    _, wA = BOLD.glyph("A", scale, 0, 0)
    _, wa = BOLD.glyph("a", scale, 0, 0)
    x0 = cx - (wA + gap + wa) / 2
    base = cy + cap_px / 2
    pA, _ = BOLD.glyph("A", scale, x0, base)
    pa, _ = BOLD.glyph("a", scale, x0 + wA + gap, base)
    return pA, pa


def cookie(cx, cy, r, amp, lobes, steps=720):
    """Scalloped 'cookie' outline, the signature shape of Material 3 Expressive."""
    pts = []
    for i in range(steps):
        th = 2 * math.pi * i / steps
        rr = r * (1 + amp * math.cos(lobes * th))
        pts.append(f"{cx + rr * math.sin(th):.1f} {cy - rr * math.cos(th):.1f}")
    return "M" + " L".join(pts) + "Z"


def sparkle(cx, cy, s):
    return (f"M{cx} {cy - s} Q{cx} {cy} {cx + s} {cy} Q{cx} {cy} {cx} {cy + s} "
            f"Q{cx} {cy} {cx - s} {cy} Q{cx} {cy} {cx} {cy - s}Z")


BADGES = {  # Material icons (24x24 grid)
    "download": "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    "delete": "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
}


def icon_svg(size, badge=None, small=False):
    """Application icon as SVG (1024 design grid)."""
    amp, lobes = (0.034, 12) if small else (0.045, 12)
    r = 478 / (1 + amp)
    cap, cx, cy, gap = (470, 512, 516, 14) if small else (400, 512, 524, 22)
    if badge:
        cap, cx, cy, gap = (330, 452, 450, 18) if not small else (400, 470, 470, 12)
    pA, pa = aa_paths(cap, cx, cy, gap)
    extras = ""
    if not badge and not small:
        extras = f'\n  <path d="{sparkle(790, 262, 74)}" fill="{TERT[90]}"/>\n  <path d="{sparkle(698, 190, 30)}" fill="{TERT[90]}" opacity="0.9"/>'
    if badge:
        bg, fg = (TERT[90], TERT[30]) if badge == "download" else (ERROR, ON_ERROR)
        bx, by, br, k = 760, 760, 176, 4.4
        extras = f"""
  <circle cx="{bx}" cy="{by}" r="{br + 26}" fill="{T[30]}"/>
  <circle cx="{bx}" cy="{by}" r="{br}" fill="{bg}"/>
  <g transform="translate({bx - 12 * k} {by - 12 * k}) scale({k})"><path d="{BADGES[badge]}" fill="{fg}"/></g>"""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0" stop-color="{T[70]}"/><stop offset="0.45" stop-color="{T[60]}"/><stop offset="1" stop-color="{T[50]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.25" cy="0.12" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <path d="{cookie(512, 512, r, amp, lobes)}" fill="url(#bg)"/>
  <path d="{cookie(512, 512, r, amp, lobes)}" fill="url(#glow)"/>
  <path d="{pA}" fill="{T[99]}"/>
  <path d="{pa}" fill="{T[90]}"/>{extras}
</svg>"""


def render(svg, px):
    return cairosvg.svg2png(bytestring=svg.encode(), output_width=px, output_height=px)


def write_ico(path, badge=None, sizes=(16, 24, 32, 48, 64, 128, 256)):
    blobs = [(s, render(icon_svg(s, badge, small=s <= 32), s)) for s in sizes]
    head = struct.pack("<HHH", 0, 1, len(blobs))
    offset = 6 + 16 * len(blobs)
    entries, data = b"", b""
    for s, png in blobs:
        entries += struct.pack("<BBBBHHII", 0 if s >= 256 else s, 0 if s >= 256 else s, 0, 0, 1, 32, len(png), offset)
        offset += len(png)
        data += png
    path.write_bytes(head + entries + data)


# ---- application icons -------------------------------------------------------
for name, px in (("32x32.png", 32), ("128x128.png", 128), ("128x128@2x.png", 256), ("icon.png", 512)):
    (ICONS / name).write_bytes(render(icon_svg(px, small=px <= 32), px))
write_ico(ICONS / "icon.ico")
write_ico(ICONS / "setup.ico", "download")
write_ico(ICONS / "uninstall.ico", "delete")

# ---- logo used in the app UI and the landing page ----------------------------
(ASSETS / "logo.svg").write_text(icon_svg(256), encoding="utf-8")


# ---- NSIS installer images (24-bit BMP) -------------------------------------
def to_bmp(svg, w, h, name):
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=w, output_height=h)
    Image.open(io.BytesIO(png)).convert("RGB").save(ICONS / name, format="BMP")


def mini_icon(x, y, size, badge=None):
    k = size / 1024
    inner = icon_svg(1024, badge).split("\n", 1)[1].rsplit("</svg>", 1)[0]
    return f'<g transform="translate({x} {y}) scale({k})">{inner}</g>'


def header(badge):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="150" height="57" viewBox="0 0 150 57">
  <defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{T[99]}"/><stop offset="1" stop-color="{T[90]}"/></linearGradient></defs>
  <rect width="150" height="57" fill="url(#h)"/>
  <circle cx="18" cy="4" r="30" fill="{TERT[90]}" opacity="0.6"/>
  <circle cx="142" cy="62" r="34" fill="{T[80]}" opacity="0.55"/>
  {mini_icon(94, 6, 46, badge)}
</svg>"""


def sidebar():
    title = BOLD.text("Case", 26, 18, 232)
    title2 = BOLD.text("Converter", 26, 18, 262)
    sub = MEDIUM.text("minhtrong67", 11, 18, 288)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="{T[50]}"/><stop offset="1" stop-color="{T[20]}"/></linearGradient></defs>
  <rect width="164" height="314" fill="url(#s)"/>
  <circle cx="150" cy="40" r="90" fill="{T[80]}" opacity="0.22"/>
  <circle cx="10" cy="210" r="70" fill="{TERT[90]}" opacity="0.16"/>
  <circle cx="170" cy="300" r="80" fill="#FFFFFF" opacity="0.07"/>
  {mini_icon(24, 40, 116)}
  <path d="{title}" fill="{T[99]}"/><path d="{title2}" fill="{T[99]}"/>
  <path d="{sub}" fill="{T[90]}" opacity="0.9"/>
</svg>"""


to_bmp(header(None), 150, 57, "installer-header.bmp")
to_bmp(header("delete"), 150, 57, "uninstall-header.bmp")
to_bmp(sidebar(), 164, 314, "installer-sidebar.bmp")


# ---- social preview (1200x630) ----------------------------------------------
def og_image():
    title = BOLD.text("Case Converter", 86, 80, 318)
    tag = MEDIUM.text("Change text case in one click", 40, 84, 392)
    chips = ["21 cases", "22 tools", "EN + VI"]
    chip_svg, x = "", 84
    for c in chips:
        w = MEDIUM.width(c, 28) + 56
        chip_svg += f'<rect x="{x}" y="456" width="{w:.0f}" height="60" rx="30" fill="{T[90]}"/><path d="{MEDIUM.text(c, 28, x + 28, 496)}" fill="{T[30]}"/>'
        x += w + 16
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{T[99]}"/><stop offset="1" stop-color="{T[95]}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#b)"/>
  <circle cx="1060" cy="120" r="260" fill="{T[90]}" opacity="0.7"/>
  <circle cx="1160" cy="600" r="220" fill="{TERT[90]}" opacity="0.6"/>
  <circle cx="60" cy="640" r="160" fill="{T[80]}" opacity="0.35"/>
  {mini_icon(770, 110, 400)}
  <path d="{title}" fill="{T[30]}"/><path d="{tag}" fill="{T[40]}"/>
  {chip_svg}
</svg>"""


(ASSETS / "og-image.png").write_bytes(cairosvg.svg2png(bytestring=og_image().encode(), output_width=1200, output_height=630))
print("Icons generated in", ICONS)
