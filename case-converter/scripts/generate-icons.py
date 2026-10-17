#!/usr/bin/env python3
"""
Generates every icon and installer image of Case Converter (Material Design 3 style, brand color #FF5722).

Outputs (src-tauri/icons):
  32x32.png  128x128.png  128x128@2x.png  icon.png      application icon (PNG)
  icon.ico                                              application icon (16-256 px, standard Windows sizes)
  setup.ico                                             Setup.exe icon (app icon + download badge)
  uninstall.ico                                         Uninstall icon (app icon + bin badge)
  installer-header.bmp  installer-sidebar.bmp           NSIS installer images (150x57, 164x314)
  uninstall-header.bmp                                  NSIS uninstaller header (150x57)
and src/assets/logo.svg (logo used inside the app).

Usage:  pip install cairosvg fonttools brotli pillow
        python scripts/generate-icons.py
"""
import io
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
FONT = ROOT / "src" / "vendor" / "fonts" / "roboto-latin-500-normal.woff2"
ICONS.mkdir(parents=True, exist_ok=True)

# App icon palette: Material Deep Orange built around the brand color #FF5722
BRAND = "#FF5722"
P50, P40, P30, P20 = "#FF7A4D", BRAND, "#E64A19", "#BF360C"
PRIMARY_CONTAINER, TERTIARY_CONTAINER, ON_TERTIARY_CONTAINER = "#FFDBD0", "#FFE3D9", "#8A2A00"
ERROR, ERROR_CONTAINER = "#BA1A1A", "#FFDAD6"

font = TTFont(str(FONT))
gs = font.getGlyphSet()
cmap = font.getBestCmap()
UPM = font["head"].unitsPerEm
CAP = font["OS/2"].sCapHeight


def glyph(ch, scale, x, baseline):
    """SVG path (y flipped) for one character, left edge of its outline at x."""
    name = cmap[ord(ch)]
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    xmin, _, xmax, _ = bp.bounds
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x - xmin * scale, baseline)))
    return pen.getCommands(), (xmax - xmin) * scale


def text_path(text, size, x, baseline, gap=0.0):
    """Path for a short string, set with the font's advance widths (kerning ignored)."""
    scale = size / UPM
    out, cx = [], x
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, cx, baseline)))
        out.append(pen.getCommands())
        cx += font["hmtx"][name][0] * scale + gap
    return " ".join(out)


def aa_paths(cap_px, cx, cy, gap=26):
    """The 'Aa' monogram centered on (cx, cy); returns (path A, path a)."""
    scale = cap_px / CAP
    _, wA = glyph("A", scale, 0, 0)
    _, wa = glyph("a", scale, 0, 0)
    total = wA + gap + wa
    x0 = cx - total / 2
    base = cy + cap_px / 2
    pA, _ = glyph("A", scale, x0, base)
    pa, _ = glyph("a", scale, x0 + wA + gap, base)
    return pA, pa


BADGES = {
    # Material icons (24x24 grid)
    "download": "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    "delete": "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
}


def icon_svg(size, badge=None, small=False):
    """Application icon as SVG (1024 design grid)."""
    m = 40 if not small else 12            # outer margin
    r = 214 if not small else 200          # corner radius
    cap = 440 if not small else 540
    cx, cy = (512, 512)
    if badge:
        cap, cx, cy = (330 if not small else 400), 440, 420
    pA, pa = aa_paths(cap, cx, cy, gap=26 if not small else 18)
    badge_svg = ""
    if badge:
        bg, fg, path = (TERTIARY_CONTAINER, ON_TERTIARY_CONTAINER, BADGES["download"]) if badge == "download" \
            else (ERROR, "#FFFFFF", BADGES["delete"])
        bx, by, br = 738, 738, 168
        k = 4.0
        badge_svg = f"""
  <circle cx="{bx}" cy="{by}" r="{br + 22}" fill="{P30}"/>
  <circle cx="{bx}" cy="{by}" r="{br}" fill="{bg}"/>
  <g transform="translate({bx - 12 * k} {by - 12 * k}) scale({k})"><path d="{path}" fill="{fg}"/></g>"""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="{P50}"/><stop offset="1" stop-color="{P30}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.2" cy="0.1" r="0.8">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.28"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="{m}" y="{m}" width="{1024 - 2 * m}" height="{1024 - 2 * m}" rx="{r}" fill="url(#bg)"/>
  <rect x="{m}" y="{m}" width="{1024 - 2 * m}" height="{1024 - 2 * m}" rx="{r}" fill="url(#glow)"/>
  <path d="{pA}" fill="#FFFFFF"/>
  <path d="{pa}" fill="{TERTIARY_CONTAINER}"/>{badge_svg}
</svg>"""


def render(svg, px):
    return cairosvg.svg2png(bytestring=svg.encode(), output_width=px, output_height=px)


def write_ico(path, badge=None, sizes=(16, 24, 32, 48, 64, 128, 256)):
    blobs = []
    for s in sizes:
        blobs.append((s, render(icon_svg(s, badge, small=s <= 32), s)))
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

# ---- logo used in the app UI -------------------------------------------------
(ROOT / "src" / "assets" / "logo.svg").write_text(icon_svg(256), encoding="utf-8")


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
  <defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF8F6"/><stop offset="1" stop-color="{PRIMARY_CONTAINER}"/></linearGradient></defs>
  <rect width="150" height="57" fill="url(#h)"/>
  <circle cx="20" cy="4" r="30" fill="{TERTIARY_CONTAINER}" opacity="0.55"/>
  <circle cx="140" cy="62" r="34" fill="#FFB59E" opacity="0.55"/>
  {mini_icon(94, 6, 46, badge)}
</svg>"""


def sidebar():
    title = text_path("Case", 25, 18, 236)
    title2 = text_path("Converter", 25, 18, 266)
    sub = text_path("minhtrong67", 11, 18, 292)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="{P40}"/><stop offset="1" stop-color="{P20}"/></linearGradient></defs>
  <rect width="164" height="314" fill="url(#s)"/>
  <circle cx="150" cy="40" r="90" fill="#FFB59E" opacity="0.22"/>
  <circle cx="10" cy="210" r="70" fill="{TERTIARY_CONTAINER}" opacity="0.14"/>
  <circle cx="170" cy="300" r="80" fill="#FFFFFF" opacity="0.07"/>
  {mini_icon(26, 44, 112)}
  <path d="{title}" fill="#FFFFFF"/><path d="{title2}" fill="#FFFFFF"/>
  <path d="{sub}" fill="{PRIMARY_CONTAINER}" opacity="0.85"/>
</svg>"""


to_bmp(header(None), 150, 57, "installer-header.bmp")
to_bmp(header("delete"), 150, 57, "uninstall-header.bmp")
to_bmp(sidebar(), 164, 314, "installer-sidebar.bmp")
print("Icons generated in", ICONS)
