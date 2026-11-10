#!/usr/bin/env python3
"""
Fluent Note - icon generator (Microsoft Fluent style, Windows 11 app-icon look)

Everything is drawn from code, so the whole icon family stays reproducible and can be re-themed by editing the
palette below. Design: a rounded square ("squircle") with a soft top-to-bottom accent gradient and a faint
top light, holding a white note page with a folded corner and a gentle drop shadow - the layered, softly lit
look of Windows 11 icons.

    pip install pillow
    python tools/generate_icons.py          (or: pnpm icons)

Outputs
  app/public/logo.svg          vector mark used as the web favicon
  src-tauri/icons/             app icon set (png, ico, icns, Windows Store logos)
  src-tauri/icons/installer/   installer.ico, uninstall.ico, NSIS + WiX imagery
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "src-tauri" / "icons"
INSTALLER = ICONS / "installer"
for d in (ICONS, INSTALLER, ROOT / "app" / "public"):
    d.mkdir(parents=True, exist_ok=True)

# --- palettes (Windows blue accent; red for the uninstaller) ---------------------------------
THEMES = {
    "blue": dict(top=(72, 170, 247), bottom=(0, 92, 180), shadow=(0, 40, 100), page_bottom=(226, 238, 251),
                 fold=(196, 222, 247), ink_top=(48, 140, 222), ink_bottom=(12, 104, 188)),
    "red": dict(top=(242, 116, 112), bottom=(176, 28, 36), shadow=(90, 8, 12), page_bottom=(252, 232, 232),
                fold=(250, 206, 204), ink_top=(220, 70, 70), ink_bottom=(176, 28, 36)),
}
SURFACE = (243, 243, 243)  # Windows 11 Mica light grey, behind installer imagery
WHITE = (255, 255, 255)

DESIGN = 1024     # output grid
K = 3             # supersampling factor
U = DESIGN / 100  # the mark is authored on a 100 x 100 grid (same numbers as the in-app SVG mark)
S = DESIGN * K


def s(v):
    return int(round(v * K))


def u(v):
    return s(v * U)


def hexc(c):
    return "#%02x%02x%02x" % tuple(c)


def vgrad(size, top, bottom):
    """Vertical gradient image (RGBA)."""
    return ImageOps.colorize(Image.linear_gradient("L").resize(size), black=top, white=bottom).convert("RGBA")


def mask(fn):
    m = Image.new("L", (S, S), 0)
    fn(ImageDraw.Draw(m))
    return m


def rrect(d, box, r, fill=255):
    x0, y0, x1, y1 = box
    d.rounded_rectangle((u(x0), u(y0), u(x1), u(y1)), radius=u(r), fill=fill)


def poly(d, pts, fill=255):
    d.polygon([(u(x), u(y)) for x, y in pts], fill=fill)


def logo(theme="blue", badge=None):
    """The mark. `badge` = None | 'install' | 'uninstall'."""
    t = THEMES[theme]
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # 1. squircle with accent gradient + soft top light
    bg = mask(lambda d: rrect(d, (2, 2, 98, 98), 22))
    img.paste(vgrad((S, S), t["top"], t["bottom"]), (0, 0), bg)
    light = ImageOps.invert(Image.linear_gradient("L").resize((S, S))).point(lambda v: int(v * 0.16))
    img.paste(Image.new("RGBA", (S, S), WHITE + (255,)), (0, 0), ImageChops.multiply(light, bg))

    # 2. page with a folded top-right corner and a soft shadow
    def page_shape(d):
        rrect(d, (28, 27, 67, 76), 5)
        poly(d, [(55, 26), (68, 26), (68, 40)], 0)  # cut the corner away

    page = mask(page_shape)
    shadow = ImageChops.offset(page, 0, u(2.4)).filter(ImageFilter.GaussianBlur(u(2.2))).point(lambda v: int(v * 0.38))
    img.paste(Image.new("RGBA", (S, S), t["shadow"] + (255,)), (0, 0), shadow)
    img.paste(vgrad((S, S), WHITE, t["page_bottom"]), (0, 0), page)
    img.paste(Image.new("RGBA", (S, S), t["fold"] + (255,)), (0, 0), mask(lambda d: poly(d, [(55, 27), (55, 39), (67, 39)])))

    # 3. text lines, with a gentle gradient
    def lines(d):
        for i, w in enumerate((24, 24, 14)):
            y = 48 + i * 10
            rrect(d, (36, y, 36 + w, y + 4.6), 2.3)

    img.paste(vgrad((S, S), t["ink_top"], t["ink_bottom"]), (0, 0), mask(lines))

    # 4. optional status badge (installer / uninstaller)
    if badge:
        d = ImageDraw.Draw(img)
        cx, cy, r = 76, 76, 19
        ring = tuple(int(t["top"][i] + (t["bottom"][i] - t["top"][i]) * 0.85) for i in range(3))
        d.ellipse((u(cx - r - 3.2), u(cy - r - 3.2), u(cx + r + 3.2), u(cy + r + 3.2)), fill=ring + (255,))
        fill, ink = ((10, 58, 112), WHITE) if badge == "install" else ((255, 226, 224), (176, 28, 36))
        d.ellipse((u(cx - r), u(cy - r), u(cx + r), u(cy + r)), fill=fill + (255,))
        if badge == "install":  # arrow into a tray
            rrect(d, (cx - 2.8, cy - 11, cx + 2.8, cy + 2), 2.8, ink + (255,))
            poly(d, [(cx - 9, cy - 1), (cx + 9, cy - 1), (cx, cy + 9)], ink + (255,))
            rrect(d, (cx - 11, cy + 9.5, cx + 11, cy + 13.5), 2, ink + (255,))
        else:  # cross
            w = u(5.6)
            for a, b in (((-8, -8), (8, 8)), ((8, -8), (-8, 8))):
                d.line([(u(cx + a[0]), u(cy + a[1])), (u(cx + b[0]), u(cy + b[1]))], fill=ink + (255,), width=w)
                for px, py in (a, b):
                    d.ellipse((u(cx + px) - w // 2, u(cy + py) - w // 2, u(cx + px) + w // 2, u(cy + py) + w // 2), fill=ink + (255,))
    return img.resize((DESIGN, DESIGN), Image.LANCZOS)


def svg_mark():
    t = THEMES["blue"]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>'
        f'<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{hexc(t["top"])}"/><stop offset="1" stop-color="{hexc(t["bottom"])}"/></linearGradient>'
        '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        f'<linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="{hexc(t["page_bottom"])}"/></linearGradient>'
        f'<linearGradient id="l" gradientUnits="userSpaceOnUse" x1="0" y1="48" x2="0" y2="73"><stop offset="0" stop-color="{hexc(t["ink_top"])}"/><stop offset="1" stop-color="{hexc(t["ink_bottom"])}"/></linearGradient>'
        f'<filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2.4" stdDeviation="2.2" flood-color="{hexc(t["shadow"])}" flood-opacity=".38"/></filter></defs>'
        '<rect x="2" y="2" width="96" height="96" rx="22" fill="url(#b)"/>'
        '<rect x="2" y="2" width="96" height="96" rx="22" fill="url(#g)"/>'
        '<path filter="url(#s)" d="M33 27h22l12 12v32a5 5 0 0 1-5 5H33a5 5 0 0 1-5-5V32a5 5 0 0 1 5-5z" fill="url(#p)"/>'
        f'<path d="M55 27l12 12H59a4 4 0 0 1-4-4z" fill="{hexc(t["fold"])}"/>'
        '<rect x="36" y="48" width="24" height="4.6" rx="2.3" fill="url(#l)"/>'
        '<rect x="36" y="58" width="24" height="4.6" rx="2.3" fill="url(#l)"/>'
        '<rect x="36" y="68" width="14" height="4.6" rx="2.3" fill="url(#l)"/></svg>'
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

# --- installer / uninstaller ----------------------------------------------------------------
installer = logo(badge="install")
uninstall = logo(theme="red", badge="uninstall")
installer.save(INSTALLER / "installer.ico", sizes=ICO_SIZES)
uninstall.save(INSTALLER / "uninstall.ico", sizes=ICO_SIZES)
installer.resize((256, 256), Image.LANCZOS).save(INSTALLER / "installer.png")
uninstall.resize((256, 256), Image.LANCZOS).save(INSTALLER / "uninstall.png")


def soft_square(img, x, y, w, h, radius, fill):
    layer = Image.new("RGBA", (img.width * 3, img.height * 3), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((x * 3, y * 3, (x + w) * 3, (y + h) * 3), radius=radius * 3, fill=fill)
    small = layer.resize(img.size, Image.LANCZOS)
    img.paste(small, (0, 0), small)


def sidebar(size, mark):
    """Installer side panel: light Mica-like gradient with two soft accent tiles."""
    img = vgrad(size, (248, 249, 251), (224, 236, 249)).convert("RGB")
    soft_square(img, -30, size[1] - 150, 150, 150, 34, (0, 120, 212, 34))
    soft_square(img, size[0] - 70, size[1] - 235, 110, 110, 28, (0, 120, 212, 26))
    m = mark.resize((88, 88), Image.LANCZOS)
    img.paste(m, ((size[0] - 88) // 2, 30), m)
    return img


# NSIS header (150x57), uninstaller header, sidebar (164x314)
for name, mark in (("nsis-header.bmp", app), ("nsis-header-uninstall.bmp", uninstall)):
    h = Image.new("RGB", (150, 57), SURFACE)
    m = mark.resize((44, 44), Image.LANCZOS)
    h.paste(m, (98, 6), m)
    h.save(INSTALLER / name)

sidebar((164, 314), app).save(INSTALLER / "nsis-sidebar.bmp")

# WiX (MSI) banner 493x58 and dialog 493x312
banner = Image.new("RGB", (493, 58), SURFACE)
m = app.resize((44, 44), Image.LANCZOS)
banner.paste(m, (440, 7), m)
banner.save(INSTALLER / "wix-banner.bmp")

dialog = Image.new("RGB", (493, 312), SURFACE)
dialog.paste(sidebar((164, 312), app), (0, 0))
dialog.save(INSTALLER / "wix-dialog.bmp")

print("Icons generated in", ICONS)
