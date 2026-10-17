#!/usr/bin/env python3
"""
Generates every icon used by Material Screenshot from assets/icon.svg.

  pip install cairosvg pillow
  python scripts/generate-icons.py

Output (src-tauri/icons):
  - 32x32.png, 128x128.png, 128x128@2x.png, icon.png (512)
  - Square*Logo.png + StoreLogo.png (Windows tile / Store sizes)
  - icon.ico            application icon   (16, 24, 32, 48, 64, 128, 256)
  - installer.ico       setup icon         (same sizes, download badge)
  - uninstaller.ico     uninstall icon     (same sizes, trash badge)
Output (src-tauri/installer): NSIS header and sidebar bitmaps.
"""
import io
import struct
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SVG = (ROOT / "assets" / "icon.svg").read_text(encoding="utf-8")
ICONS = ROOT / "src-tauri" / "icons"
INSTALLER = ROOT / "src-tauri" / "installer"
ICONS.mkdir(parents=True, exist_ok=True)
INSTALLER.mkdir(parents=True, exist_ok=True)

BADGE_SETUP = """
  <circle cx="392" cy="392" r="108" fill="#FFFFFF"/>
  <circle cx="392" cy="392" r="92" fill="#365E9D"/>
  <g transform="translate(392 392) scale(6.2) translate(-12 -12)"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="#FFFFFF"/></g>
"""
BADGE_UNINSTALL = """
  <circle cx="392" cy="392" r="108" fill="#FFFFFF"/>
  <circle cx="392" cy="392" r="92" fill="#BA1A1A"/>
  <g transform="translate(392 394) scale(5.6) translate(-12 -12)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#FFFFFF"/></g>
"""


def variant(badge: str) -> str:
    return SVG.replace("</svg>", badge + "</svg>") if badge else SVG


def png_bytes(svg: str, size: int) -> bytes:
    return cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=size, output_height=size)


def write_ico(path: Path, svg: str, sizes=(16, 24, 32, 48, 64, 128, 256)):
    """Writes a multi-resolution .ico with PNG-compressed frames (Windows Vista+)."""
    frames = [(s, png_bytes(svg, s)) for s in sizes]
    header = struct.pack("<HHH", 0, 1, len(frames))
    offset = 6 + 16 * len(frames)
    entries, blobs = b"", b""
    for s, data in frames:
        w = 0 if s >= 256 else s
        entries += struct.pack("<BBBBHHII", w, w, 0, 0, 1, 32, len(data), offset)
        blobs += data
        offset += len(data)
    path.write_bytes(header + entries + blobs)


def rgba(svg: str, size: int) -> Image.Image:
    return Image.open(io.BytesIO(png_bytes(svg, size))).convert("RGBA")


# ---- PNG set ------------------------------------------------------------
png_sizes = {
    "32x32.png": 32,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "icon.png": 512,
    "Square30x30Logo.png": 30,
    "Square44x44Logo.png": 44,
    "Square71x71Logo.png": 71,
    "Square89x89Logo.png": 89,
    "Square107x107Logo.png": 107,
    "Square142x142Logo.png": 142,
    "Square150x150Logo.png": 150,
    "Square284x284Logo.png": 284,
    "Square310x310Logo.png": 310,
    "StoreLogo.png": 50,
}
for name, size in png_sizes.items():
    (ICONS / name).write_bytes(png_bytes(SVG, size))

# ---- ICO set ------------------------------------------------------------
write_ico(ICONS / "icon.ico", SVG)
write_ico(ICONS / "installer.ico", variant(BADGE_SETUP))
write_ico(ICONS / "uninstaller.ico", variant(BADGE_UNINSTALL))

# ---- NSIS bitmaps (Material surface colours) ------------------------------
def gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h), top)
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img


def circle(img, cx, cy, r, color, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (alpha,))
    img.paste(layer, (0, 0), layer)


# Sidebar 164x314 (welcome / finish pages)
side = gradient(164, 314, (214, 227, 255), (249, 249, 255)).convert("RGBA")
circle(side, 150, 40, 90, (65, 95, 145), 38)
circle(side, 20, 300, 80, (112, 85, 117), 34)
circle(side, 130, 250, 36, (250, 216, 253), 160)
logo = rgba(SVG, 112)
side.paste(logo, (26, 70), logo)
side.convert("RGB").save(INSTALLER / "sidebar.bmp", "BMP")

# Header 150x57 (installer) and uninstaller variant
for name, svg, tint in (
    ("header.bmp", SVG, (249, 249, 255)),
    ("uninstaller-header.bmp", variant(BADGE_UNINSTALL), (255, 248, 247)),
):
    head = Image.new("RGBA", (150, 57), tint + (255,))
    circle(head, 150, 0, 46, (65, 95, 145), 28)
    ic = rgba(svg, 44)
    head.paste(ic, (98, 6), ic)
    head.convert("RGB").save(INSTALLER / name, "BMP")

print("Icons generated in", ICONS)
