#!/usr/bin/env python3
"""
Material File - icon generator (Material Design 3 Expressive: cookie container, amber #FFC107)

Generates every raster asset the project needs from code, so the icons stay
reproducible and can be re-themed by editing the palette below.

    pip install pillow
    python tools/generate_icons.py

Outputs
  src-tauri/icons/            app icon set (png, ico, icns)
  src-tauri/icons/installer/  installer.ico, uninstall.ico, NSIS + WiX imagery
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "src-tauri" / "icons"
INSTALLER = ICONS / "installer"
for d in (ICONS, INSTALLER):
    d.mkdir(parents=True, exist_ok=True)

# --- icon palette (Material Amber 500 container + warm tonal neighbours) -----
AMBER = (255, 193, 7)           # #FFC107  app icon color (Material Amber 500)
FOLDER_BACK = (78, 52, 0)        # #4E3400  folder back panel + tab (on-amber tone)
CREAM = (255, 236, 179)         # #FFECB3  folder front panel
PAPER_LINE_1 = (255, 213, 79)   # #FFD54F
PAPER_LINE_2 = (255, 224, 130)  # #FFE082
BADGE = (78, 52, 0)             # #4E3400  install badge / check badge
ERROR = (179, 38, 30)           # #B3261E  uninstall badge
SURFACE = (255, 248, 225)       # installer background
WHITE = (255, 255, 255)

DESIGN = 1024  # design grid
K = 3          # supersampling factor


def s(v):
    return int(round(v * K))


def rrect(d, box, r, fill):
    x0, y0, x1, y1 = box
    d.rounded_rectangle((s(x0), s(y0), s(x1), s(y1)), radius=s(r), fill=fill)


def poly(d, pts, fill):
    d.polygon([(s(x), s(y)) for x, y in pts], fill=fill)


# --- Material 3 Expressive geometry --------------------------------------------
# The container is a 9-lobed "cookie" (one of the M3 Expressive shapes); the folder glyph is built
# from fat, very round rectangles, a playfully tilted sheet and a sparkle.
import math

COOKIE = dict(cx=512, cy=512, r=456, lobes=12, amp=0.03)
GS = 0.82  # glyph scale around the centre, keeps the folder well inside the cookie
_RAW = [  # (kind, args...) shared by the PNG renderer and the SVG logo
    ("rrect", (170, 214, 482, 410), 70, FOLDER_BACK, 0),              # folder tab
    ("rrect", (170, 318, 854, 806), 96, FOLDER_BACK, 0),              # folder back
    ("rrect", (262, 232, 762, 560), 44, WHITE, -6),                   # tilted sheet
    ("rrect", (318, 308, 600, 350), 21, PAPER_LINE_1, -6),
    ("rrect", (318, 392, 508, 434), 21, PAPER_LINE_2, -6),
    ("rrect", (170, 450, 854, 830), 96, CREAM, 0),                    # folder front
    ("star", (704, 640), 84, AMBER, 0),                               # expressive sparkle
]


def _k(v):
    return 512 + (v - 512) * GS


GLYPH = []
for _g in _RAW:
    if _g[0] == "rrect":
        _b = _g[1]
        GLYPH.append(("rrect", tuple(_k(v) for v in _b), _g[2] * GS, _g[3], _g[4]))
    else:
        GLYPH.append(("star", (_k(_g[1][0]), _k(_g[1][1])), _g[2] * GS, _g[3], _g[4]))


def cookie_points(n=360):
    c = COOKIE
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = c["r"] * (1 + c["amp"] * math.cos(c["lobes"] * t))
        pts.append((c["cx"] + r * math.cos(t), c["cy"] + r * math.sin(t)))
    return pts


def star_points(cx, cy, r, inner=0.30):
    pts = []
    for i in range(8):
        a = -math.pi / 2 + i * math.pi / 4
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


def _hex(c):
    return "#%02X%02X%02X" % tuple(c)


def write_svg(path):
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="512" height="512" role="img" aria-label="Material File">']
    out.append('<path fill="%s" d="M%s Z"/>' % (_hex(AMBER), " L".join("%.1f %.1f" % p for p in cookie_points(180))))
    for g in GLYPH:
        if g[0] == "rrect":
            (x0, y0, x1, y1), r, col, rot = g[1], g[2], g[3], g[4]
            tr = ' transform="rotate(%s %.0f %.0f)"' % (rot, (x0 + x1) / 2, (y0 + y1) / 2) if rot else ""
            out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s"%s/>' % (x0, y0, x1 - x0, y1 - y0, r, _hex(col), tr))
        else:
            (cx, cy), r, col = g[1], g[2], g[3]
            out.append('<path fill="%s" d="M%s Z"/>' % (_hex(col), " L".join("%.1f %.1f" % p for p in star_points(cx, cy, r))))
    out.append("</svg>")
    Path(path).write_text("\n".join(out), encoding="utf-8")


def badge(img, kind, cx, cy, r):
    d = ImageDraw.Draw(img)
    ring = r + 24
    d.ellipse((s(cx - ring), s(cy - ring), s(cx + ring), s(cy + ring)), fill=AMBER)
    color = BADGE if kind == "install" else ERROR
    d.ellipse((s(cx - r), s(cy - r), s(cx + r), s(cy + r)), fill=color)
    w = 28
    if kind == "install":  # arrow down + tray
        rrect(d, (cx - w / 2, cy - 78, cx + w / 2, cy + 20), 14, WHITE)
        poly(d, [(cx - 60, cy - 6), (cx + 60, cy - 6), (cx, cy + 64)], WHITE)
        rrect(d, (cx - 68, cy + 74, cx + 68, cy + 74 + w), 14, WHITE)
    else:  # cross with round caps
        d.line([(s(cx - 56), s(cy - 56)), (s(cx + 56), s(cy + 56))], fill=WHITE, width=s(w), joint="curve")
        d.line([(s(cx + 56), s(cy - 56)), (s(cx - 56), s(cy + 56))], fill=WHITE, width=s(w), joint="curve")
        for px, py in ((-56, -56), (56, 56), (56, -56), (-56, 56)):
            d.ellipse((s(cx + px - w / 2), s(cy + py - w / 2), s(cx + px + w / 2), s(cy + py + w / 2)), fill=WHITE)


def render(variant="app"):
    img = Image.new("RGBA", (s(DESIGN), s(DESIGN)), (0, 0, 0, 0))
    ImageDraw.Draw(img).polygon([(s(x), s(y)) for x, y in cookie_points()], fill=AMBER)
    for g in GLYPH:
        if variant != "app" and g[0] == "star":
            continue  # the install / uninstall badges take the sparkle's place
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        if g[0] == "rrect":
            box, r, col, rot = g[1], g[2], g[3], g[4]
            rrect(ld, box, r, col)
            if rot:
                layer = layer.rotate(-rot, resample=Image.BICUBIC, center=(s((box[0] + box[2]) / 2), s((box[1] + box[3]) / 2)))
        else:
            ld.polygon([(s(x), s(y)) for x, y in star_points(*g[1], g[2])], fill=g[3])
        img.alpha_composite(layer)
    if variant != "app":
        badge(img, variant, 746, 746, 140)
    return img.resize((DESIGN, DESIGN), Image.LANCZOS)


def save_png_set(master, folder):
    sizes = {"32x32.png": 32, "64x64.png": 64, "128x128.png": 128,
             "128x128@2x.png": 256, "icon.png": 512}
    for name, px in sizes.items():
        master.resize((px, px), Image.LANCZOS).save(folder / name)
    # Windows Store / MSIX logos (optional but harmless)
    for px in (30, 44, 71, 89, 107, 142, 150, 284, 310):
        master.resize((px, px), Image.LANCZOS).save(folder / f"Square{px}x{px}Logo.png")
    master.resize((50, 50), Image.LANCZOS).save(folder / "StoreLogo.png")


ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

# --- app icon set -------------------------------------------------------------
app = render("app")
write_svg(ROOT / "src" / "assets" / "logo.svg")
save_png_set(app, ICONS)
app.save(ICONS / "icon.ico", sizes=ICO_SIZES)
app.save(ICONS / "icon.icns")

# --- installer / uninstaller icons -------------------------------------------
render("install").save(INSTALLER / "installer.ico", sizes=ICO_SIZES)
render("uninstall").save(INSTALLER / "uninstall.ico", sizes=ICO_SIZES)
render("install").resize((256, 256), Image.LANCZOS).save(INSTALLER / "installer.png")
render("uninstall").resize((256, 256), Image.LANCZOS).save(INSTALLER / "uninstall.png")


def flat(img, bg):
    base = Image.new("RGB", img.size, bg)
    base.paste(img, mask=img.split()[3])
    return base


def vertical_gradient(size, top, bottom):
    w, h = size
    g = Image.new("RGB", size)
    gd = ImageDraw.Draw(g)
    for y in range(h):
        t = y / max(1, h - 1)
        gd.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g


# NSIS header (150x57) and sidebar (164x314)
header = Image.new("RGB", (150, 57), SURFACE)
header.paste(app.resize((44, 44), Image.LANCZOS), (98, 6), app.resize((44, 44), Image.LANCZOS))
header.save(INSTALLER / "nsis-header.bmp")

# NSIS uninstaller header (150x57) uses the uninstall variant of the icon
header_un = Image.new("RGB", (150, 57), SURFACE)
un_logo = render("uninstall").resize((44, 44), Image.LANCZOS)
header_un.paste(un_logo, (98, 6), un_logo)
header_un.save(INSTALLER / "nsis-header-uninstall.bmp")

side = vertical_gradient((164, 314), CREAM, AMBER)
sd = ImageDraw.Draw(side)
sd.ellipse((-60, 200, 120, 380), fill=(255, 224, 130))
sd.ellipse((60, 230, 240, 410), fill=(255, 213, 79))
logo = app.resize((96, 96), Image.LANCZOS)
side.paste(logo, (34, 40), logo)
side.save(INSTALLER / "nsis-sidebar.bmp")

# WiX (MSI) banner 493x58 and dialog 493x312
banner = Image.new("RGB", (493, 58), SURFACE)
b_logo = app.resize((44, 44), Image.LANCZOS)
banner.paste(b_logo, (440, 7), b_logo)
banner.save(INSTALLER / "wix-banner.bmp")

dialog = Image.new("RGB", (493, 312), WHITE)
left = vertical_gradient((164, 312), CREAM, AMBER)
dialog.paste(left, (0, 0))
dd = ImageDraw.Draw(dialog)
dd.ellipse((-60, 200, 120, 380), fill=(255, 224, 130))
d_logo = app.resize((96, 96), Image.LANCZOS)
dialog.paste(d_logo, (34, 40), d_logo)
dialog.save(INSTALLER / "wix-dialog.bmp")

# --- web assets (landing page + in-app logo) ----------------------------------
WEB = ROOT / "assets"
WEB.mkdir(exist_ok=True)
app.resize((512, 512), Image.LANCZOS).save(WEB / "icon-512.png")
app.resize((180, 180), Image.LANCZOS).save(WEB / "apple-touch-icon.png")
app.resize((32, 32), Image.LANCZOS).save(WEB / "favicon-32.png")

card = Image.new("RGB", (1200, 630), SURFACE)
cd = ImageDraw.Draw(card)
cd.rectangle((0, 0, 1200, 630), fill=(255, 251, 230))
cd.ellipse((760, -140, 1360, 460), fill=(255, 241, 118))
cd.ellipse((900, 260, 1400, 760), fill=AMBER)
big = app.resize((420, 420), Image.LANCZOS)
card.paste(big, (700, 105), big)
try:
    from PIL import ImageFont
    def font(size, bold=False):
        for name in (("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"), "Arial.ttf"):
            try:
                return ImageFont.truetype(name, size)
            except OSError:
                pass
        return ImageFont.load_default()
    cd.text((80, 190), "Material File", font=font(86, True), fill=FOLDER_BACK)
    cd.text((84, 306), "A simple, fast file manager", font=font(36), fill=(78, 52, 0))
    cd.text((84, 354), "Material Design 3 - built with Tauri", font=font(36), fill=(78, 52, 0))
except Exception:
    pass
card.save(WEB / "og-image.png")

print("Icons generated in", ICONS)
