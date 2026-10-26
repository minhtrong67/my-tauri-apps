#!/usr/bin/env python3
"""Generate every icon the app needs in the Material 3 Expressive style:
layered "cookie" / "sunny" shapes in vivid M3 tonal colors with a bold rounded glyph.

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

# Material 3 Expressive tonal colors (baseline M3 palette, the vivid purple/rose family)
PRIMARY = (103, 80, 164)          # #6750A4
PRIMARY_LIGHT = (127, 103, 190)   # #7F67BE
PRIMARY_CONTAINER = (234, 221, 255)  # #EADDFF
PRIMARY_FIXED_DIM = (208, 188, 255)  # #D0BCFF
TERTIARY = (125, 82, 96)          # #7D5260
TERTIARY_LIGHT = (156, 104, 121)
TERTIARY_CONTAINER = (255, 216, 228)  # #FFD8E4
ERROR = (179, 38, 30)             # #B3261E
ERROR_LIGHT = (214, 72, 62)
ERROR_CONTAINER = (249, 222, 220)  # #F9DEDC
ON_DARK_ERROR = (96, 20, 16)
WHITE = (255, 255, 255)

import math


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def lobed_points(size, radius, lobes, depth, rot_deg=0.0, cx=None, cy=None):
    """Closed polar curve r = R(1 + depth*cos(n*theta)): M3 Expressive cookie / sunny shapes."""
    cx = size / 2 if cx is None else cx
    cy = size / 2 if cy is None else cy
    rot = math.radians(rot_deg)
    pts = []
    for i in range(1440):
        th = i / 1440 * math.tau
        r = radius * (1 + depth * math.cos(lobes * (th - rot)))
        pts.append((cx + r * math.cos(th), cy + r * math.sin(th)))
    return pts


def gradient(size, top, bottom):
    col = Image.new("RGB", (1, size))
    px = col.load()
    for y in range(size):
        px[0, y] = lerp(top, bottom, y / (size - 1))
    return col.resize((size, size))


def layer_shape(size, pts, top, bottom=None, shadow=0):
    """Return an RGBA layer holding one filled shape (vertical tonal gradient) with an optional soft shadow."""
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    if shadow:
        sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        sm = Image.new("L", (size, size), 0)
        ImageDraw.Draw(sm).polygon([(x, y + size * 0.012) for x, y in pts], fill=shadow)
        sh.putalpha(sm.filter(ImageFilter.GaussianBlur(size * 0.014)))
        out = Image.alpha_composite(out, sh)
    fill = gradient(size, top, bottom or top).convert("RGBA")
    out.paste(fill, (0, 0), mask)
    return out


def tile(front, front_light, back, simple=False):
    """Layered M3E badge: a big pale 'sunny' behind a saturated 'cookie' in front."""
    size = S * AA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if not simple:
        img = Image.alpha_composite(img, layer_shape(size, lobed_points(size, size * 0.455, 12, 0.062, rot_deg=7), back, back, shadow=70))
        r = size * 0.375
    else:
        r = size * 0.43
    img = Image.alpha_composite(img, layer_shape(size, lobed_points(size, r, 9, 0.055, rot_deg=-10), front_light, front, shadow=0 if not simple else 70))
    return img, r / (size * 0.5)


def glyph_layer(drawer, size, k, *args):
    """Draw a glyph on its own layer and scale it to fit inside the front shape."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    drawer(layer, *args)
    small = layer.resize((int(size * k), int(size * k)), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    off = (size - small.size[0]) // 2
    out.paste(small, (off, off), small)
    return out


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


def draw_trash(img, glyph=WHITE, tone=ON_DARK_ERROR):
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


def build(front, front_light, back, drawer, accent, simple=False):
    img, fr = tile(front, front_light, back, simple)
    k = fr * 1.2
    img = Image.alpha_composite(img, glyph_layer(drawer, img.size[0], k, accent, WHITE) if drawer is not draw_trash else glyph_layer(drawer, img.size[0], k, WHITE, accent))
    return finish(img)


def make_app(simple=False):
    return build(PRIMARY, PRIMARY_LIGHT, TERTIARY_CONTAINER, draw_download, PRIMARY_FIXED_DIM, simple)


def make_setup(simple=False):
    return build(TERTIARY, TERTIARY_LIGHT, PRIMARY_FIXED_DIM, draw_setup, TERTIARY_CONTAINER, simple)


def make_uninstall(simple=False):
    return build(ERROR, ERROR_LIGHT, ERROR_CONTAINER, draw_trash, ON_DARK_ERROR, simple)


def resize(master, px):
    return master.resize((px, px), Image.LANCZOS)


def save_ico(master, path, small=None, sizes=(16, 24, 32, 48, 64, 128, 256)):
    """Small sizes use the simplified (single-shape) artwork so they stay crisp."""
    frames = []
    for n in sizes:
        src = small if (small is not None and n <= 48) else master
        frames.append(resize(src, n))
    frames[-1].save(path, format="ICO", sizes=[(f.size[0], f.size[1]) for f in frames], append_images=frames[:-1])


app, app_s = make_app(), make_app(True)
setup, setup_s = make_setup(), make_setup(True)
uninstall, uninstall_s = make_uninstall(), make_uninstall(True)

# --- Tauri icon set --------------------------------------------------------
resize(app_s, 32).save(ICONS / "32x32.png")
resize(app_s, 64).save(ICONS / "64x64.png")
resize(app, 128).save(ICONS / "128x128.png")
resize(app, 256).save(ICONS / "128x128@2x.png")
resize(app, 512).save(ICONS / "icon.png")
save_ico(app, ICONS / "icon.ico", app_s)
app.save(ICONS / "icon.icns", format="ICNS")
for n in (30, 44, 71, 89, 107, 142, 150, 284, 310):
    resize(app_s if n <= 48 else app, n).save(ICONS / f"Square{n}x{n}Logo.png")
resize(app, 50).save(ICONS / "StoreLogo.png")

# --- Installer / uninstaller -------------------------------------------------
save_ico(setup, ICONS / "setup.ico", setup_s)
save_ico(uninstall, ICONS / "uninstall.ico", uninstall_s)
resize(setup, 256).save(ICONS / "setup.png")
resize(uninstall, 256).save(ICONS / "uninstall.png")

# --- Chrome extension --------------------------------------------------------
for n in (16, 32, 48, 128):
    resize(app_s if n <= 48 else app, n).save(EXT / f"icon{n}.png")

# --- Web ---------------------------------------------------------------------
resize(app_s, 192).save(PUBLIC / "favicon.png")
resize(app, 512).save(PUBLIC / "app-icon.png")
resize(app, 512).save(ROOT / "screenshots" / ".icon-preview.png") if (ROOT / "screenshots").exists() else None
print("Icons generated.")
