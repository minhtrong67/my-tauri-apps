#!/usr/bin/env python3
"""
Generates every icon of Material Screenshot (Material 3 Expressive style, red).

  pip install cairosvg pillow
  python scripts/generate-icons.py

Output
  assets/icon.svg, assets/icon-small.svg     master artwork (small = simplified for <= 48 px)
  assets/*.png                               web icons (favicon, PWA, Apple touch)
  src-tauri/icons/*                          32x32, 128x128, 128x128@2x, icon.png, Square*Logo, StoreLogo,
                                             icon.ico (app), installer.ico (setup), uninstaller.ico (uninstall)
  src-tauri/installer/*.bmp                  NSIS header / sidebar bitmaps
Every .ico contains the standard Windows sizes 16, 20, 24, 32, 40, 48, 64, 96, 128, 256.
"""
import io, math, struct
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS, ICONS, INST = ROOT / "assets", ROOT / "src-tauri" / "icons", ROOT / "src-tauri" / "installer"
for d in (ASSETS, ICONS, INST):
    d.mkdir(parents=True, exist_ok=True)

# Material 3 Expressive red palette (seed #F44336 = Material Red 500)
RED, RED_DEEP = "#F44336", "#BA1A1A"
CONTAINER, ON_CONTAINER = "#FFDAD5", "#73342C"
SURFACE, AMBER, AMBER_DEEP = "#FFF8F7", "#FCDFA6", "#574419"


def cookie(cx, cy, r, amp, lobes, n=720):
    """Closed 'cookie / scalloped' Expressive shape as an SVG path."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        rad = r + amp * math.cos(lobes * t)
        pts.append(f"{cx + rad * math.cos(t - math.pi / 2):.1f} {cy + rad * math.sin(t - math.pi / 2):.1f}")
    return "M" + " L".join(pts) + "Z"


def sparkle(cx, cy, s):
    """Four pointed Expressive sparkle."""
    k = s * 0.26
    return (f"M{cx} {cy - s} C{cx + k} {cy - k} {cx + k} {cy - k} {cx + s} {cy} "
            f"C{cx + k} {cy + k} {cx + k} {cy + k} {cx} {cy + s} "
            f"C{cx - k} {cy + k} {cx - k} {cy + k} {cx - s} {cy} "
            f"C{cx - k} {cy - k} {cx - k} {cy - k} {cx} {cy - s}Z")


def artwork(small=False):
    body = cookie(256, 256, 226, 15, 12)
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">',
        f'<path d="{body}" transform="translate(0 10)" fill="{RED_DEEP}"/>',   # chunky depth layer
        f'<path d="{body}" fill="{RED}"/>',
        # window card
        '<rect x="112" y="168" width="288" height="226" rx="40" fill="#690005" opacity=".4"/>',
        f'<rect x="112" y="150" width="288" height="226" rx="40" fill="{SURFACE}"/>',
        f'<path d="M112 190a40 40 0 0 1 40-40h208a40 40 0 0 1 40 40v14H112z" fill="{CONTAINER}"/>',
    ]
    if not small:
        parts += [f'<circle cx="150" cy="178" r="9" fill="{RED}"/>',
                  f'<circle cx="178" cy="178" r="9" fill="#F9A825"/>',
                  f'<circle cx="206" cy="178" r="9" fill="#4CAF50"/>']
    parts += [
        f'<rect x="134" y="222" width="244" height="132" rx="24" fill="{CONTAINER}"/>',
        f'<circle cx="326" cy="262" r="22" fill="{AMBER}"/>',
        f'<path d="M134 330v-8l62-66 46 48 34-30 102 70v10a24 24 0 0 1-24 24H158a24 24 0 0 1-24-24z" fill="{RED}"/>',
        f'<path d="M232 354l62-50 84 50z" fill="{ON_CONTAINER}"/>',
    ]
    if not small:
        parts += [f'<path d="{sparkle(402, 118, 62)}" fill="{AMBER}" stroke="{SURFACE}" stroke-width="10" stroke-linejoin="round"/>',
                  f'<path d="{sparkle(446, 186, 22)}" fill="{SURFACE}"/>']
    parts.append("</svg>")
    return "\n".join(parts)


SVG, SVG_SMALL = artwork(), artwork(True)
(ASSETS / "icon.svg").write_text(SVG, encoding="utf-8")
(ASSETS / "icon-small.svg").write_text(SVG_SMALL, encoding="utf-8")

BADGE_SETUP = f"""<circle cx="394" cy="394" r="104" fill="{SURFACE}"/><circle cx="394" cy="394" r="88" fill="{AMBER}"/>
<g transform="translate(394 394) scale(6) translate(-12 -12)"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="{AMBER_DEEP}"/></g>"""
BADGE_UNINSTALL = f"""<circle cx="394" cy="394" r="104" fill="{SURFACE}"/><circle cx="394" cy="394" r="88" fill="#410002"/>
<g transform="translate(394 396) scale(5.4) translate(-12 -12)"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#FFDAD6"/></g>"""


def with_badge(svg, badge):
    return svg.replace("</svg>", badge + "</svg>") if badge else svg


def png(svg, size):
    return cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)


def pick(svg_full, svg_small, size):
    return svg_small if size <= 48 else svg_full


def write_ico(path, full, small, sizes=(16, 20, 24, 32, 40, 48, 64, 96, 128, 256)):
    frames = [(s, png(pick(full, small, s), s)) for s in sizes]
    head = struct.pack("<HHH", 0, 1, len(frames))
    off, ent, blob = 6 + 16 * len(frames), b"", b""
    for s, data in frames:
        w = 0 if s >= 256 else s
        ent += struct.pack("<BBBBHHII", w, w, 0, 0, 1, 32, len(data), off)
        blob += data
        off += len(data)
    path.write_bytes(head + ent + blob)


# ---- PNG set ---------------------------------------------------------------
for name, size in {"32x32.png": 32, "128x128.png": 128, "128x128@2x.png": 256, "icon.png": 512,
                   "Square30x30Logo.png": 30, "Square44x44Logo.png": 44, "Square71x71Logo.png": 71,
                   "Square89x89Logo.png": 89, "Square107x107Logo.png": 107, "Square142x142Logo.png": 142,
                   "Square150x150Logo.png": 150, "Square284x284Logo.png": 284, "Square310x310Logo.png": 310,
                   "StoreLogo.png": 50}.items():
    (ICONS / name).write_bytes(png(pick(SVG, SVG_SMALL, size), size))
for name, size in {"icon-192.png": 192, "icon-512.png": 512, "apple-touch-icon.png": 180, "favicon-32.png": 32}.items():
    (ASSETS / name).write_bytes(png(pick(SVG, SVG_SMALL, size), size))

# ---- ICO set (app / setup / uninstall) --------------------------------------
write_ico(ICONS / "icon.ico", SVG, SVG_SMALL)
write_ico(ICONS / "installer.ico", with_badge(SVG, BADGE_SETUP), with_badge(SVG_SMALL, BADGE_SETUP))
write_ico(ICONS / "uninstaller.ico", with_badge(SVG, BADGE_UNINSTALL), with_badge(SVG_SMALL, BADGE_UNINSTALL))


# ---- NSIS bitmaps -----------------------------------------------------------
def gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h), top)
    px = img.load()
    for y in range(h):
        c = tuple(round(top[i] + (bottom[i] - top[i]) * y / (h - 1)) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img


def blob(img, cx, cy, r, amp, lobes, color, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pts = [(cx + (r + amp * math.cos(lobes * t)) * math.cos(t), cy + (r + amp * math.cos(lobes * t)) * math.sin(t))
           for t in [2 * math.pi * i / 240 for i in range(240)]]
    ImageDraw.Draw(layer).polygon(pts, fill=color + (alpha,))
    img.alpha_composite(layer)


def rgba(svg, size):
    return Image.open(io.BytesIO(png(svg, size))).convert("RGBA")


side = gradient(164, 314, (255, 218, 213), (255, 248, 247)).convert("RGBA")
blob(side, 150, 36, 86, 7, 9, (244, 67, 54), 60)
blob(side, 14, 306, 74, 6, 8, (252, 223, 166), 150)
blob(side, 128, 262, 30, 3, 6, (244, 67, 54), 40)
logo = rgba(SVG, 116)
side.alpha_composite(logo, (24, 76))
side.convert("RGB").save(INST / "sidebar.bmp", "BMP")

for name, svg, tint, tone in (("header.bmp", SVG_SMALL, (255, 248, 247), (244, 67, 54)),
                              ("uninstaller-header.bmp", with_badge(SVG_SMALL, BADGE_UNINSTALL), (255, 244, 242), (147, 0, 10))):
    head = Image.new("RGBA", (150, 57), tint + (255,))
    blob(head, 150, 4, 44, 4, 9, tone, 42)
    head.alpha_composite(rgba(svg, 46), (98, 5))
    head.convert("RGB").save(INST / name, "BMP")

print("Icons generated.")
