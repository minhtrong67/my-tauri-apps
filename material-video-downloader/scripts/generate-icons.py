#!/usr/bin/env python3
"""Generate every icon the app needs (Material Design style, flat + tonal).

    pip install pillow
    npm run icons

Outputs:
  src-tauri/icons/*      app icon set (PNG sizes, icon.ico, icon.icns, Windows Store logos)
  src-tauri/icons/setup.ico      installer icon  (download arrow dropping into a box)
  src-tauri/icons/uninstall.ico  uninstaller icon (trash can on error red)
  extension/icons/*      Chrome extension icons
  public/favicon.png     web favicon
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "src-tauri" / "icons"
EXT = ROOT / "extension" / "icons"
PUBLIC = ROOT / "public"
for p in (ICONS, EXT, PUBLIC):
    p.mkdir(parents=True, exist_ok=True)

S = 1024  # master canvas
AA = 2    # supersample factor

# Material palette
DEEP_PURPLE_600 = (94, 53, 177)
DEEP_PURPLE_500 = (103, 58, 183)
DEEP_PURPLE_300 = (149, 117, 205)
DEEP_PURPLE_100 = (209, 196, 233)
RED_700 = (211, 47, 47)
RED_500 = (244, 67, 54)
RED_900 = (183, 28, 28)
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def squircle_mask(size, margin_ratio=0.0625, radius_ratio=0.225):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    mg = int(size * margin_ratio)
    d.rounded_rectangle([mg, mg, size - mg - 1, size - mg - 1], radius=int(size * radius_ratio), fill=255)
    return m


def background(size, top, bottom):
    """Flat Material tile with a very soft vertical tone shift."""
    bg = Image.new("RGB", (size, size), top)
    px = bg.load()
    for y in range(size):
        c = lerp(top, bottom, y / (size - 1))
        for x in range(size):
            px[x, y] = c
    return bg


def tile(top, bottom):
    size = S * AA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # soft elevation shadow
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    mg = int(size * 0.0625)
    off = int(size * 0.012)
    sd.rounded_rectangle([mg, mg + off, size - mg - 1, size - mg - 1 + off], radius=int(size * 0.225), fill=(0, 0, 0, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.012))
    img = Image.alpha_composite(img, shadow)
    bg = background(size, top, bottom).convert("RGBA")
    mask = squircle_mask(size)
    img.paste(bg, (0, 0), mask)
    return img, mask


def poly_round(draw, pts, radius, fill):
    """Polygon with rounded corners (draws thick outline + fill)."""
    draw.polygon(pts, fill=fill)
    draw.line(pts + [pts[0]], fill=fill, width=int(radius * 2), joint="curve")
    for x, y in pts:
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=fill)


def inset(pts, cx, cy, amount):
    out = []
    for x, y in pts:
        dx, dy = x - cx, y - cy
        dist = (dx * dx + dy * dy) ** 0.5 or 1
        k = max(0, dist - amount) / dist
        out.append((cx + dx * k, cy + dy * k))
    return out


def draw_download(img, accent, glyph=WHITE):
    """Download arrow dropping into a tray, with a play triangle in the arrow head."""
    size = img.size[0]
    u = size / 1024
    d = ImageDraw.Draw(img)
    cx = size / 2
    # tray (tonal)
    tray_y = 735 * u
    tw = 190 * u
    th = 56 * u
    d.rounded_rectangle([cx - 270 * u, tray_y, cx + 270 * u, tray_y + th], radius=th / 2, fill=accent)
    d.rounded_rectangle([cx - 270 * u, tray_y - 70 * u, cx - 270 * u + th, tray_y + th], radius=th / 2, fill=accent)
    d.rounded_rectangle([cx + 270 * u - th, tray_y - 70 * u, cx + 270 * u, tray_y + th], radius=th / 2, fill=accent)
    del tw
    # arrow shaft
    shaft_w = 108 * u
    d.rounded_rectangle([cx - shaft_w / 2, 218 * u, cx + shaft_w / 2, 520 * u], radius=shaft_w / 2.4, fill=glyph)
    # arrow head (rounded triangle)
    head = [(cx - 215 * u, 480 * u), (cx + 215 * u, 480 * u), (cx, 700 * u)]
    ccx, ccy = cx, 556 * u
    poly_round(d, inset(head, ccx, ccy, 26 * u), 26 * u, glyph)


def draw_setup(img, accent, glyph=WHITE):
    """Package box receiving an arrow (installer)."""
    size = img.size[0]
    u = size / 1024
    d = ImageDraw.Draw(img)
    cx = size / 2
    # box body
    d.rounded_rectangle([cx - 270 * u, 560 * u, cx + 270 * u, 810 * u], radius=44 * u, fill=glyph)
    # box lid line (tonal)
    d.rounded_rectangle([cx - 270 * u, 560 * u, cx + 270 * u, 628 * u], radius=34 * u, fill=accent)
    d.rounded_rectangle([cx - 62 * u, 560 * u, cx + 62 * u, 640 * u], radius=26 * u, fill=glyph)
    # arrow
    shaft_w = 96 * u
    d.rounded_rectangle([cx - shaft_w / 2, 196 * u, cx + shaft_w / 2, 420 * u], radius=shaft_w / 2.4, fill=glyph)
    head = [(cx - 190 * u, 390 * u), (cx + 190 * u, 390 * u), (cx, 560 * u)]
    poly_round(d, inset(head, cx, 446 * u, 24 * u), 24 * u, glyph)


def draw_trash(img, glyph=WHITE, tone=RED_900):
    size = img.size[0]
    u = size / 1024
    d = ImageDraw.Draw(img)
    cx = size / 2
    # lid + handle
    d.rounded_rectangle([cx - 270 * u, 292 * u, cx + 270 * u, 358 * u], radius=33 * u, fill=glyph)
    d.rounded_rectangle([cx - 90 * u, 222 * u, cx + 90 * u, 306 * u], radius=34 * u, fill=glyph)
    d.rounded_rectangle([cx - 52 * u, 252 * u, cx + 52 * u, 330 * u], radius=20 * u, fill=tone)
    # can body
    body = [(cx - 220 * u, 400 * u), (cx + 220 * u, 400 * u), (cx + 188 * u, 800 * u), (cx - 188 * u, 800 * u)]
    poly_round(d, inset(body, cx, 600 * u, 24 * u), 24 * u, glyph)
    # ribs
    for dx in (-84, 0, 84):
        d.rounded_rectangle([cx + (dx - 22) * u, 470 * u, cx + (dx + 22) * u, 730 * u], radius=22 * u, fill=tone)


def finish(img):
    return img.resize((S, S), Image.LANCZOS)


def make_app():
    img, _ = tile(DEEP_PURPLE_500, DEEP_PURPLE_600)
    draw_download(img, DEEP_PURPLE_100)
    return finish(img)


def make_setup():
    img, _ = tile(DEEP_PURPLE_300, DEEP_PURPLE_500)
    draw_setup(img, DEEP_PURPLE_300)
    return finish(img)


def make_uninstall():
    img, _ = tile(RED_500, RED_700)
    draw_trash(img)
    return finish(img)


def resize(master, px):
    return master.resize((px, px), Image.LANCZOS)


def save_ico(master, path, sizes=(16, 24, 32, 48, 64, 128, 256)):
    master.save(path, format="ICO", sizes=[(s, s) for s in sizes])


app = make_app()
setup = make_setup()
uninstall = make_uninstall()

# --- Tauri icon set --------------------------------------------------------
resize(app, 32).save(ICONS / "32x32.png")
resize(app, 64).save(ICONS / "64x64.png")
resize(app, 128).save(ICONS / "128x128.png")
resize(app, 256).save(ICONS / "128x128@2x.png")
resize(app, 512).save(ICONS / "icon.png")
save_ico(app, ICONS / "icon.ico")
app.save(ICONS / "icon.icns", format="ICNS")
for n in (30, 44, 71, 89, 107, 142, 150, 284, 310):
    resize(app, n).save(ICONS / f"Square{n}x{n}Logo.png")
resize(app, 50).save(ICONS / "StoreLogo.png")

# --- Installer / uninstaller -------------------------------------------------
save_ico(setup, ICONS / "setup.ico")
save_ico(uninstall, ICONS / "uninstall.ico")
resize(setup, 256).save(ICONS / "setup.png")
resize(uninstall, 256).save(ICONS / "uninstall.png")

# --- Chrome extension --------------------------------------------------------
for n in (16, 32, 48, 128):
    resize(app, n).save(EXT / f"icon{n}.png")

# --- Web ---------------------------------------------------------------------
resize(app, 192).save(PUBLIC / "favicon.png")
resize(app, 512).save(PUBLIC / "app-icon.png")
resize(app, 512).save(ROOT / "screenshots" / ".icon-preview.png") if (ROOT / "screenshots").exists() else None
print("Icons generated.")
