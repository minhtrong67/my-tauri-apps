#!/usr/bin/env python3
"""
Material File - icon generator (Material Design 3 style, amber #FFC107 app icon)

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


def badge(img, kind, cx, cy, r):
    d = ImageDraw.Draw(img)
    ring = r + 22
    d.ellipse((s(cx - ring), s(cy - ring), s(cx + ring), s(cy + ring)), fill=AMBER)
    color = BADGE if kind == "install" else ERROR
    d.ellipse((s(cx - r), s(cy - r), s(cx + r), s(cy + r)), fill=color)
    w = 26
    if kind == "install":  # arrow down + tray
        rrect(d, (cx - w / 2, cy - 78, cx + w / 2, cy + 20), 12, WHITE)
        poly(d, [(cx - 58, cy - 6), (cx + 58, cy - 6), (cx, cy + 62)], WHITE)
        rrect(d, (cx - 66, cy + 72, cx + 66, cy + 72 + w), 12, WHITE)
    else:  # cross
        d.line([(s(cx - 58), s(cy - 58)), (s(cx + 58), s(cy + 58))], fill=WHITE, width=s(w), joint="curve")
        d.line([(s(cx + 58), s(cy - 58)), (s(cx - 58), s(cy + 58))], fill=WHITE, width=s(w), joint="curve")
        for px, py in ((-58, -58), (58, 58), (58, -58), (-58, 58)):
            d.ellipse((s(cx + px - w / 2), s(cy + py - w / 2), s(cx + px + w / 2), s(cy + py + w / 2)), fill=WHITE)


def render(variant="app"):
    img = Image.new("RGBA", (s(DESIGN), s(DESIGN)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # container
    rrect(d, (64, 64, 960, 960), 232, AMBER)

    # folder: back panel + tab
    rrect(d, (172, 236, 472, 420), 52, FOLDER_BACK)
    rrect(d, (172, 330, 852, 800), 68, FOLDER_BACK)

    # a document peeking out of the folder
    rrect(d, (250, 262, 774, 560), 30, WHITE)
    rrect(d, (306, 330, 640, 366), 18, PAPER_LINE_1)
    rrect(d, (306, 404, 540, 440), 18, PAPER_LINE_2)

    # folder: front panel
    rrect(d, (172, 450, 852, 824), 68, CREAM)

    if variant == "app":
        # small check badge
        d.ellipse((s(676), s(612), s(796), s(732)), fill=BADGE)
        d.line([(s(704), s(674)), (s(728), s(698)), (s(770), s(646))], fill=AMBER, width=s(22), joint="curve")
        for px, py in ((704, 674), (770, 646)):
            d.ellipse((s(px - 11), s(py - 11), s(px + 11), s(py + 11)), fill=AMBER)
    else:
        badge(img, variant, 744, 744, 138)

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
