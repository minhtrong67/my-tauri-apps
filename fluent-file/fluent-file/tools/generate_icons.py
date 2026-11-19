#!/usr/bin/env python3
"""
Fluent File - icon generator (Microsoft Fluent Design: layered, softly lit Windows 11 style folder)

Generates every raster asset the project needs from code, so the icons stay
reproducible and can be re-themed by editing the palette below.

    pip install pillow
    python tools/generate_icons.py

Outputs
  src-tauri/icons/            app icon set (png, ico, icns)
  src-tauri/icons/installer/  installer.ico, uninstall.ico, NSIS + WiX imagery
  src/assets/logo.svg         in-app logo
  assets/                     web assets (favicon, touch icon, social card)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "src-tauri" / "icons"
INSTALLER = ICONS / "installer"
for d in (ICONS, INSTALLER):
    d.mkdir(parents=True, exist_ok=True)

# --- palette (Windows 11 folder yellow + Fluent accent blue) -------------------
BACK_TOP, BACK_BOT = (232, 162, 26), (200, 128, 8)     # folder back panel + tab
FRONT_TOP, FRONT_BOT = (255, 218, 98), (247, 183, 41)  # folder front panel
EDGE_LIGHT = (255, 238, 160)                            # top highlight of the front panel
PAPER_TOP, PAPER_BOT = (255, 255, 255), (221, 230, 241)
PAPER_LINE = (150, 190, 236)
ACCENT = (0, 103, 192)       # #0067C0 install badge
DANGER = (196, 43, 28)       # #C42B1C uninstall badge
SURFACE = (243, 243, 243)    # installer background (Windows 11 base layer)
WHITE = (255, 255, 255)

DESIGN = 1024
K = 2  # supersampling


def s(v):
    return int(round(v * K))


# (name, box, radius, gradient top, gradient bottom)
SHAPES = [
    ("back_tab", (96, 168, 468, 420), 64, BACK_TOP, BACK_BOT),
    ("back", (96, 252, 928, 848), 64, BACK_TOP, BACK_BOT),
    ("paper", (176, 312, 848, 660), 28, PAPER_TOP, PAPER_BOT),
    ("line1", (252, 392, 612, 424), 16, PAPER_LINE, PAPER_LINE),
    ("line2", (252, 472, 500, 504), 16, PAPER_LINE, PAPER_LINE),
    ("front", (80, 408, 944, 876), 72, FRONT_TOP, FRONT_BOT),
]


def gradient(size, top, bottom, y0, y1):
    w, h = size
    g = Image.new("RGBA", size)
    gd = ImageDraw.Draw(g)
    for y in range(h):
        t = min(1, max(0, (y - y0) / max(1, (y1 - y0))))
        gd.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,))
    return g


def grad_rrect(img, box, r, top, bottom):
    x0, y0, x1, y1 = box
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((s(x0), s(y0), s(x1), s(y1)), radius=s(r), fill=255)
    img.paste(gradient(img.size, top, bottom, s(y0), s(y1)), (0, 0), mask)


def shadow(img, box, r, dy, blur, alpha):
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((s(x0), s(y0 + dy), s(x1), s(y1 + dy)), radius=s(r), fill=(90, 50, 0, alpha))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(s(blur))))


def fit_to_canvas(img, fill=0.96):
    """Windows icons use (almost) the whole canvas: crop to the artwork and scale it to ~96% of the width, centred."""
    alpha = img.getchannel("A").point(lambda v: 255 if v > 70 else 0)
    box = alpha.getbbox()
    art = img.crop(box)
    scale = DESIGN * fill / max(art.size)
    art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.LANCZOS)
    out = Image.new("RGBA", (DESIGN, DESIGN), (0, 0, 0, 0))
    out.alpha_composite(art, ((DESIGN - art.width) // 2, (DESIGN - art.height) // 2))
    return out


def badge(img, kind, cx, cy, r):
    s = lambda v: int(round(v))  # noqa: E731  (badge is drawn on the final 1024 canvas)
    d = ImageDraw.Draw(img)
    ring = r + 22
    d.ellipse((s(cx - ring), s(cy - ring), s(cx + ring), s(cy + ring)), fill=WHITE)
    d.ellipse((s(cx - r), s(cy - r), s(cx + r), s(cy + r)), fill=ACCENT if kind == "install" else DANGER)
    w = 30
    if kind == "install":  # arrow down + tray
        d.rounded_rectangle((s(cx - w / 2), s(cy - 80), s(cx + w / 2), s(cy + 18)), radius=s(8), fill=WHITE)
        d.polygon([(s(cx - 58), s(cy - 4)), (s(cx + 58), s(cy - 4)), (s(cx), s(cy + 62))], fill=WHITE)
        d.rounded_rectangle((s(cx - 66), s(cy + 72), s(cx + 66), s(cy + 72 + w)), radius=s(8), fill=WHITE)
    else:  # cross
        d.line([(s(cx - 52), s(cy - 52)), (s(cx + 52), s(cy + 52))], fill=WHITE, width=s(w))
        d.line([(s(cx + 52), s(cy - 52)), (s(cx - 52), s(cy + 52))], fill=WHITE, width=s(w))


def render(variant="app"):
    img = Image.new("RGBA", (s(DESIGN), s(DESIGN)), (0, 0, 0, 0))
    shadow(img, (96, 252, 928, 876), 64, 30, 26, 70)  # soft ground shadow
    for name, box, r, top, bot in SHAPES:
        if name == "front":
            shadow(img, box, r, -6, 14, 60)  # depth between paper and front panel
        grad_rrect(img, box, r, top, bot)
        if name == "front":  # 1px-style top highlight (light catching the edge)
            hl = Image.new("L", img.size, 0)
            hd = ImageDraw.Draw(hl)
            hd.rounded_rectangle((s(box[0]), s(box[1]), s(box[2]), s(box[3])), radius=s(r), fill=255)
            inner = Image.new("L", img.size, 0)
            ImageDraw.Draw(inner).rounded_rectangle((s(box[0]), s(box[1] + 6), s(box[2]), s(box[3] + 6)), radius=s(r), fill=255)
            edge = Image.composite(hl, Image.new("L", img.size, 0), Image.eval(inner, lambda v: 255 - v))
            img.paste(Image.new("RGBA", img.size, EDGE_LIGHT + (255,)), (0, 0), edge)
    out = img.resize((DESIGN, DESIGN), Image.LANCZOS)
    out = fit_to_canvas(out)
    if variant != "app":
        badge(out, variant, 790, 790, 120)
    return out


def _hex(c):
    return "#%02X%02X%02X" % tuple(c)


def write_svg(path):
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="512" height="512" role="img" aria-label="Fluent File">', "<defs>"]
    for name, _, _, top, bot in SHAPES:
        out.append('<linearGradient id="%s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>' % (name, _hex(top), _hex(bot)))
    out.append('<filter id="soft" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="26"/></filter>')
    out.append("</defs>")
    out.append('<rect x="96" y="282" width="832" height="624" rx="64" fill="#5A3200" opacity=".28" filter="url(#soft)"/>')
    for name, (x0, y0, x1, y1), r, _, _ in SHAPES:
        if name == "front":
            out.append('<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="#5A3200" opacity=".22" filter="url(#soft)" transform="translate(0 -6)"/>' % (x0, y0, x1 - x0, y1 - y0, r))
        out.append('<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="url(#%s)"/>' % (x0, y0, x1 - x0, y1 - y0, r, name))
    out.append("</svg>")
    Path(path).write_text("\n".join(out), encoding="utf-8")


def save_png_set(master, folder):
    sizes = {"32x32.png": 32, "64x64.png": 64, "128x128.png": 128, "128x128@2x.png": 256, "icon.png": 512}
    for name, px in sizes.items():
        master.resize((px, px), Image.LANCZOS).save(folder / name)
    for px in (30, 44, 71, 89, 107, 142, 150, 284, 310):
        master.resize((px, px), Image.LANCZOS).save(folder / f"Square{px}x{px}Logo.png")
    master.resize((50, 50), Image.LANCZOS).save(folder / "StoreLogo.png")


ICO_SIZES = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (96, 96), (128, 128), (256, 256)]

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


def vertical_gradient(size, top, bottom):
    return gradient(size, top, bottom, 0, size[1]).convert("RGB")


def with_logo(base, logo, xy):
    base.paste(logo, xy, logo)


header = Image.new("RGB", (150, 57), SURFACE)
with_logo(header, app.resize((44, 44), Image.LANCZOS), (98, 6))
header.save(INSTALLER / "nsis-header.bmp")

header_un = Image.new("RGB", (150, 57), SURFACE)
with_logo(header_un, render("uninstall").resize((44, 44), Image.LANCZOS), (98, 6))
header_un.save(INSTALLER / "nsis-header-uninstall.bmp")

side = vertical_gradient((164, 314), SURFACE, (203, 224, 247))
with_logo(side, app.resize((96, 96), Image.LANCZOS), (34, 40))
side.save(INSTALLER / "nsis-sidebar.bmp")

banner = Image.new("RGB", (493, 58), SURFACE)
with_logo(banner, app.resize((44, 44), Image.LANCZOS), (440, 7))
banner.save(INSTALLER / "wix-banner.bmp")

dialog = Image.new("RGB", (493, 312), WHITE)
dialog.paste(vertical_gradient((164, 312), SURFACE, (203, 224, 247)), (0, 0))
with_logo(dialog, app.resize((96, 96), Image.LANCZOS), (34, 40))
dialog.save(INSTALLER / "wix-dialog.bmp")

# --- web assets ---------------------------------------------------------------
WEB = ROOT / "assets"
WEB.mkdir(exist_ok=True)
app.resize((512, 512), Image.LANCZOS).save(WEB / "icon-512.png")
app.resize((180, 180), Image.LANCZOS).save(WEB / "apple-touch-icon.png")
app.resize((32, 32), Image.LANCZOS).save(WEB / "favicon-32.png")

card = Image.new("RGB", (1200, 630), SURFACE)
cd = ImageDraw.Draw(card)
cd.ellipse((720, -160, 1400, 520), fill=(214, 232, 250))
cd.ellipse((880, 250, 1400, 770), fill=(188, 214, 244))
with_logo(card, app.resize((420, 420), Image.LANCZOS), (700, 105))


def font(size, bold=False):
    for name in (("segoeuib.ttf" if bold else "segoeui.ttf"), ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"), "Arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


cd.text((80, 190), "Fluent File", font=font(86, True), fill=(26, 26, 26))
cd.text((84, 306), "A simple, fast file manager", font=font(36), fill=(92, 92, 92))
cd.text((84, 354), "Microsoft Fluent Design - built with Tauri", font=font(36), fill=(92, 92, 92))
card.save(WEB / "og-image.png")

print("Icons generated in", ICONS)
