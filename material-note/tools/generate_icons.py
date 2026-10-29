#!/usr/bin/env python3
"""
Material Note - icon generator (Material 3 Expressive style)

Everything is drawn from code, so the whole icon family stays reproducible and can be re-themed
by editing the palette below. Shape language: the scalloped "cookie" container that Material 3
Expressive uses for emphasis, holding a note page with a folded corner.

    pip install pillow
    python tools/generate_icons.py          (or: npm run icons)

Outputs
  app/public/logo.svg          vector mark used as the web favicon
  src-tauri/icons/             app icon set (png, ico, icns, Windows Store logos)
  src-tauri/icons/installer/   installer.ico, uninstall.ico, NSIS + WiX imagery
  logo.svg / favicon.png       used by the landing page (project root)
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "src-tauri" / "icons"
INSTALLER = ICONS / "installer"
for d in (ICONS, INSTALLER, ROOT / "app" / "public"):
    d.mkdir(parents=True, exist_ok=True)

# --- Material 3 colour roles generated from the seed #6B4EFF ------------------------------
PRIMARY = (89, 45, 255)               # #592DFF
ON_PRIMARY = (255, 255, 255)
PRIMARY_CONTAINER = (229, 222, 255)   # #E5DEFF
PRIMARY_SOFT = (200, 191, 255)        # #C8BFFF
TERTIARY = (116, 82, 126)             # #74527E
TERTIARY_CONTAINER = (250, 215, 255)  # #FAD7FF
ERROR = (186, 26, 26)                 # #BA1A1A
ERROR_CONTAINER = (255, 218, 214)     # #FFDAD6
SURFACE = (252, 248, 255)             # #FCF8FF
WHITE = (255, 255, 255)

DESIGN = 1024  # design grid
K = 3          # supersampling factor
U = DESIGN / 100  # the logo is authored on a 100 x 100 grid (same numbers as the in-app SVG mark)


def s(v):
    return int(round(v * K))


def u(v):
    return s(v * U)


def cookie(d, cx, cy, radius, amp, lobes, fill):
    pts = []
    for i in range(361):
        a = i / 360 * math.tau
        r = radius + amp * math.cos(lobes * a)
        pts.append((s(cx + r * math.cos(a)), s(cy + r * math.sin(a))))
    d.polygon(pts, fill=fill)


def rrect(d, box, r, fill):
    x0, y0, x1, y1 = box
    d.rounded_rectangle((u(x0), u(y0), u(x1), u(y1)), radius=u(r), fill=fill)


def poly(d, pts, fill):
    d.polygon([(u(x), u(y)) for x, y in pts], fill=fill)


def logo(body=PRIMARY, page=ON_PRIMARY, fold=TERTIARY_CONTAINER, badge=None):
    """The mark: cookie + note page. `badge` = None | 'install' | 'uninstall'."""
    img = Image.new("RGBA", (s(DESIGN), s(DESIGN)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cookie(d, DESIGN / 2, DESIGN / 2, 46 * U, 3.6 * U, 10, body)

    # note page with a folded top-right corner
    rrect(d, (28, 27, 67, 76), 5, page)
    poly(d, [(55, 26), (68, 26), (68, 40)], body)        # cut the corner away
    poly(d, [(55, 27), (55, 39), (67, 39)], fold)        # the fold
    for i, w in enumerate((24, 24, 14)):
        y = 48 + i * 10
        rrect(d, (36, y, 36 + w, y + 4.6), 2.3, body)

    if badge:
        cx, cy, r = 76, 76, 19
        d.ellipse((u(cx - r - 3.2), u(cy - r - 3.2), u(cx + r + 3.2), u(cy + r + 3.2)), fill=body)  # cut-out ring
        dark = TERTIARY if badge == "install" else ERROR_CONTAINER
        ink = WHITE if badge == "install" else ERROR
        d.ellipse((u(cx - r), u(cy - r), u(cx + r), u(cy + r)), fill=dark)
        if badge == "install":  # arrow into a tray
            rrect(d, (cx - 2.8, cy - 11, cx + 2.8, cy + 2), 2.8, ink)
            poly(d, [(cx - 9, cy - 1), (cx + 9, cy - 1), (cx, cy + 9)], ink)
            rrect(d, (cx - 11, cy + 9.5, cx + 11, cy + 13.5), 2, ink)
        else:  # cross
            w = u(5.6)
            for a, b in (((-8, -8), (8, 8)), ((8, -8), (-8, 8))):
                d.line([(u(cx + a[0]), u(cy + a[1])), (u(cx + b[0]), u(cy + b[1]))], fill=ink, width=w)
                for px, py in (a, b):
                    d.ellipse((u(cx + px) - w // 2, u(cy + py) - w // 2, u(cx + px) + w // 2, u(cy + py) + w // 2), fill=ink)
    return img.resize((DESIGN, DESIGN), Image.LANCZOS)


def svg_mark():
    pts = []
    for i in range(181):
        a = i / 180 * math.tau
        r = 46 + 3.6 * math.cos(10 * a)
        pts.append(f"{50 + r * math.cos(a):.2f} {50 + r * math.sin(a):.2f}")
    hex_ = lambda c: "#%02x%02x%02x" % c
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        f'<path d="M{"L".join(pts)}Z" fill="{hex_(PRIMARY)}"/>'
        f'<path d="M33 27h22l12 12v32a5 5 0 0 1-5 5H33a5 5 0 0 1-5-5V32a5 5 0 0 1 5-5z" fill="#fff"/>'
        f'<path d="M55 27l12 12H59a4 4 0 0 1-4-4z" fill="{hex_(TERTIARY_CONTAINER)}"/>'
        f'<rect x="36" y="48" width="24" height="4.6" rx="2.3" fill="{hex_(PRIMARY)}"/>'
        f'<rect x="36" y="58" width="24" height="4.6" rx="2.3" fill="{hex_(PRIMARY)}"/>'
        f'<rect x="36" y="68" width="14" height="4.6" rx="2.3" fill="{hex_(PRIMARY)}"/></svg>'
    )


def save_png_set(master, folder):
    sizes = {"32x32.png": 32, "64x64.png": 64, "128x128.png": 128, "128x128@2x.png": 256, "icon.png": 512}
    for name, px in sizes.items():
        master.resize((px, px), Image.LANCZOS).save(folder / name)
    for px in (30, 44, 71, 89, 107, 142, 150, 284, 310):  # Windows Store / MSIX logos
        master.resize((px, px), Image.LANCZOS).save(folder / f"Square{px}x{px}Logo.png")
    master.resize((50, 50), Image.LANCZOS).save(folder / "StoreLogo.png")


ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

# --- app icon set --------------------------------------------------------------------------
app = logo()
save_png_set(app, ICONS)
app.save(ICONS / "icon.ico", sizes=ICO_SIZES)
app.save(ICONS / "icon.icns")

(ROOT / "app" / "public" / "logo.svg").write_text(svg_mark(), encoding="utf-8")
(ROOT / "logo.svg").write_text(svg_mark(), encoding="utf-8")
app.resize((192, 192), Image.LANCZOS).save(ROOT / "favicon.png")

# --- installer / uninstaller ----------------------------------------------------------------
installer = logo(badge="install")
uninstall = logo(body=ERROR, fold=ERROR_CONTAINER, badge="uninstall")
installer.save(INSTALLER / "installer.ico", sizes=ICO_SIZES)
uninstall.save(INSTALLER / "uninstall.ico", sizes=ICO_SIZES)
installer.resize((256, 256), Image.LANCZOS).save(INSTALLER / "installer.png")
uninstall.resize((256, 256), Image.LANCZOS).save(INSTALLER / "uninstall.png")


def gradient(size, top, bottom):
    w, h = size
    g = Image.new("RGB", size)
    gd = ImageDraw.Draw(g)
    for y in range(h):
        t = y / max(1, h - 1)
        gd.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g


def big_cookie(img, cx, cy, radius, fill):
    layer = Image.new("RGBA", (img.width * 3, img.height * 3), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    pts = []
    for i in range(361):
        a = i / 360 * math.tau
        r = radius + radius * 0.078 * math.cos(10 * a)
        pts.append(((cx + r * math.cos(a)) * 3, (cy + r * math.sin(a)) * 3))
    ld.polygon(pts, fill=fill)
    small = layer.resize(img.size, Image.LANCZOS)
    img.paste(small, (0, 0), small)


def sidebar(size, mark, accent):
    img = gradient(size, PRIMARY_CONTAINER, (243, 237, 255))
    big_cookie(img, size[0] * 0.15, size[1] * 0.98, 118, PRIMARY_SOFT + (255,))
    big_cookie(img, size[0] * 1.0, size[1] * 0.74, 70, accent + (255,))
    m = mark.resize((88, 88), Image.LANCZOS)
    img.paste(m, ((size[0] - 88) // 2, 30), m)
    return img


# NSIS header (150x57), uninstaller header, sidebar (164x314)
for name, mark in (("nsis-header.bmp", app), ("nsis-header-uninstall.bmp", uninstall)):
    h = Image.new("RGB", (150, 57), SURFACE)
    m = mark.resize((44, 44), Image.LANCZOS)
    h.paste(m, (98, 6), m)
    h.save(INSTALLER / name)

sidebar((164, 314), app, TERTIARY_CONTAINER).save(INSTALLER / "nsis-sidebar.bmp")

# WiX (MSI) banner 493x58 and dialog 493x312
banner = Image.new("RGB", (493, 58), SURFACE)
m = app.resize((44, 44), Image.LANCZOS)
banner.paste(m, (440, 7), m)
banner.save(INSTALLER / "wix-banner.bmp")

dialog = Image.new("RGB", (493, 312), SURFACE)
dialog.paste(sidebar((164, 312), app, TERTIARY_CONTAINER), (0, 0))
dialog.save(INSTALLER / "wix-dialog.bmp")

print("Icons generated in", ICONS)
