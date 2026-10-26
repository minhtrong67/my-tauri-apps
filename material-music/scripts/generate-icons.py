"""
Generates every icon of Material Music (app, setup, uninstall, installer artwork) in Material 3 Expressive style:
a vivid pink squircle, a big scalloped "cookie" shape in the light pink container tone and a bold rounded music note.
The pinks are the tones of the Material 3 pink tonal palette (hue 8, from the seed #E91E63):
  tone 30 #900038 · 40 #BC004B · 50 #E61A61 · 60 #FF4E7C · 80 #FFB2BE · 90 #FFD9DE · 95 #FFECEE

    pip install pillow
    python scripts/generate-icons.py          # or: npm run icons

Outputs
  src-tauri/icons/   icon.ico (16-256) · icon.png (512) · 32x32 · 64x64 · 128x128 · 128x128@2x · 256x256
                     Square*Logo.png + StoreLogo.png (Windows tile sizes)
                     setup.ico (installer, download badge) · uninstall.ico (uninstaller, trash badge)
                     installer-header.bmp (150x57) · installer-sidebar.bmp (164x314)
  public/icon.png    256 px logo used inside the app
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ICONS = os.path.join(ROOT, 'src-tauri', 'icons')
PUBLIC = os.path.join(ROOT, 'public')
os.makedirs(ICONS, exist_ok=True)
os.makedirs(PUBLIC, exist_ok=True)

BRAND = (0xE6, 0x1A, 0x61)   # tone 50  #E61A61
TOP = (0xFF, 0x4E, 0x7C)     # tone 60  #FF4E7C, top-left of the gradient
BOTTOM = (0xBC, 0x00, 0x4B)  # tone 40  #BC004B, bottom-right
DEEP = (0x90, 0x00, 0x38)    # tone 30  #900038, the note
CONTAINER = (0xFF, 0xD9, 0xDE)  # tone 90 #FFD9DE, the cookie
SOFT = (0xFF, 0xB2, 0xBE)    # tone 80  #FFB2BE, sparkle
BIG = 1024                   # everything is drawn at 1024 px and down-sampled for crisp edges


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def squircle_mask(size, margin_ratio=0.035, n=5.0):
    """Super-ellipse ("squircle") close to the Windows 11 / Material rounded-square icon shape"""
    m = Image.new('L', (size, size), 0)
    px = m.load()
    r = size * (0.5 - margin_ratio)
    c = size / 2
    for y in range(size):
        dy = abs(y + 0.5 - c) / r
        if dy > 1:
            continue
        # solve |dx|^n + |dy|^n <= 1
        lim = (1 - dy ** n) ** (1 / n)
        x0 = int(c - lim * r)
        x1 = int(c + lim * r)
        for x in range(max(0, x0), min(size, x1 + 1)):
            px[x, y] = 255
    return m


def gradient(size):
    g = Image.new('RGB', (size, size), BRAND)
    px = g.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            # TOP -> BRAND (at 45%) -> BOTTOM
            col = lerp(TOP, BRAND, t / 0.45) if t < 0.45 else lerp(BRAND, BOTTOM, (t - 0.45) / 0.55)
            px[x, y] = col
    return g


def cookie_mask(size, radius_ratio=0.39, lobes=12, depth=0.036):
    """Scalloped 'cookie' (one of the Material 3 Expressive shapes): a circle with soft, evenly spaced bumps"""
    big = size * 2
    m = Image.new('L', (big, big), 0)
    c = big / 2
    pts = []
    for i in range(720):
        t = i / 720 * math.tau
        r = big * radius_ratio * (1 + depth * math.cos(lobes * t))
        pts.append((c + r * math.cos(t - math.pi / 2), c + r * math.sin(t - math.pi / 2)))
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def sparkle(size, cx, cy, r):
    """Four-point rounded star, an Expressive accent"""
    m = Image.new('L', (size * 2, size * 2), 0)
    pts = []
    for i in range(240):
        t = i / 240 * math.tau
        k = abs(math.cos(2 * t)) ** 1.6  # pinches into 4 points
        rr = r * 2 * (0.2 + 0.8 * k)
        pts.append((cx * 2 + rr * math.cos(t), cy * 2 + rr * math.sin(t)))
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def note_glyph(size, k=1.0):
    """Bold beamed double music note with fully rounded joins, scaled by k around the centre"""
    s = size
    layer = Image.new('L', (s, s), 0)
    d = ImageDraw.Draw(layer)

    def P(x, y):
        return (0.5 + (x - 0.5) * k) * s, (0.5 + (y - 0.5) * k + 0.012) * s

    stem_w = s * 0.074 * k

    def head(x, y, rx, ry, ang):
        cx, cy = P(x, y)
        e = Image.new('L', (s, s), 0)
        ImageDraw.Draw(e).ellipse((cx - rx * s * k, cy - ry * s * k, cx + rx * s * k, cy + ry * s * k), fill=255)
        e = e.rotate(ang, center=(cx, cy), resample=Image.BICUBIC)
        layer.paste(255, (0, 0), e)

    head(0.372, 0.665, 0.098, 0.078, 22)
    head(0.62, 0.615, 0.098, 0.078, 22)
    lx, _ = P(0.405, 0)
    rx_, _ = P(0.653, 0)
    d.rounded_rectangle((lx - stem_w / 2, P(0, 0.355)[1], lx + stem_w / 2, P(0, 0.665)[1]), radius=stem_w / 2, fill=255)
    d.rounded_rectangle((rx_ - stem_w / 2, P(0, 0.305)[1], rx_ + stem_w / 2, P(0, 0.615)[1]), radius=stem_w / 2, fill=255)
    beam = [(lx - stem_w / 2, P(0, 0.325)[1]), (rx_ + stem_w / 2, P(0, 0.272)[1]), (rx_ + stem_w / 2, P(0, 0.372)[1]), (lx - stem_w / 2, P(0, 0.425)[1])]
    d.polygon(beam, fill=255)
    # round the beam ends a little so nothing looks sharp
    for x, y in ((lx, P(0, 0.375)[1]), (rx_, P(0, 0.322)[1])):
        d.ellipse((x - stem_w / 2, y - s * 0.052 * k, x + stem_w / 2, y + s * 0.052 * k), fill=255)
    return layer


def base_icon(size=BIG):
    mask = squircle_mask(size, margin_ratio=0.03, n=4.6)
    img = gradient(size).convert('RGBA')
    img.putalpha(mask)

    # soft light from the top for depth
    hi = Image.new('L', (size, size), 0)
    ImageDraw.Draw(hi).ellipse((-size * 0.2, -size * 0.8, size * 1.2, size * 0.45), fill=34)
    hi = hi.filter(ImageFilter.GaussianBlur(size * 0.06))
    hi_rgba = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    hi_rgba.putalpha(Image.composite(hi, Image.new('L', (size, size), 0), mask))
    img = Image.alpha_composite(img, hi_rgba)

    # the cookie: a soft shadow, then the light pink container tone
    cookie = cookie_mask(size)
    sh = Image.new('RGBA', (size, size), (110, 0, 40, 0))
    sh.putalpha(cookie.filter(ImageFilter.GaussianBlur(size * 0.025)).point(lambda v: int(v * 0.38)))
    moved = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    moved.paste(sh, (0, int(size * 0.022)))
    img = Image.alpha_composite(img, moved)
    fill = Image.new('RGBA', (size, size), CONTAINER + (0,))
    fill.putalpha(cookie)
    img = Image.alpha_composite(img, fill)

    # the note in the deep tone, slightly lifted by a thin light edge underneath
    glyph = note_glyph(size)
    ink = Image.new('RGBA', (size, size), DEEP + (0,))
    ink.putalpha(glyph)
    img = Image.alpha_composite(img, ink)

    # sparkle accent top-right
    sp = sparkle(size, size * 0.80, size * 0.215, size * 0.075)
    spark = Image.new('RGBA', (size, size), SOFT + (0,))
    spark.putalpha(sp)
    spark2 = sparkle(size, size * 0.215, size * 0.80, size * 0.045)
    sk2 = Image.new('RGBA', (size, size), SOFT + (0,))
    sk2.putalpha(spark2)
    return Image.alpha_composite(Image.alpha_composite(img, spark), sk2)


def badge(img, kind):
    """Small round badge (bottom-right) so setup / uninstall icons are recognisable"""
    size = img.size[0]
    r = size * 0.19
    cx, cy = size * 0.77, size * 0.77
    b = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(b)
    d.ellipse((cx - r - size * 0.018, cy - r - size * 0.018, cx + r + size * 0.018, cy + r + size * 0.018), fill=(255, 255, 255, 255))
    fill = (0x40, 0x00, 0x14, 255) if kind == 'uninstall' else (0x66, 0x00, 0x25, 255)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)
    w = size * 0.034
    white = (255, 255, 255, 255)
    if kind == 'setup':  # arrow pointing down into a tray
        d.line((cx, cy - r * 0.50, cx, cy + r * 0.18), fill=white, width=int(w))
        d.line((cx - r * 0.36, cy - r * 0.16, cx, cy + r * 0.2), fill=white, width=int(w))
        d.line((cx + r * 0.36, cy - r * 0.16, cx, cy + r * 0.2), fill=white, width=int(w))
        d.line((cx - r * 0.48, cy + r * 0.52, cx + r * 0.48, cy + r * 0.52), fill=white, width=int(w))
        for x, y in ((cx, cy - r * 0.5), (cx - r * 0.48, cy + r * 0.52), (cx + r * 0.48, cy + r * 0.52)):
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=white)
    else:  # trash can
        d.line((cx - r * 0.5, cy - r * 0.34, cx + r * 0.5, cy - r * 0.34), fill=white, width=int(w))
        d.line((cx - r * 0.18, cy - r * 0.34, cx - r * 0.18, cy - r * 0.56), fill=white, width=int(w))
        d.line((cx + r * 0.18, cy - r * 0.34, cx + r * 0.18, cy - r * 0.56), fill=white, width=int(w))
        d.line((cx - r * 0.18, cy - r * 0.56, cx + r * 0.18, cy - r * 0.56), fill=white, width=int(w))
        d.polygon([(cx - r * 0.38, cy - r * 0.22), (cx + r * 0.38, cy - r * 0.22), (cx + r * 0.3, cy + r * 0.56), (cx - r * 0.3, cy + r * 0.56)], outline=white, width=int(w))
        d.line((cx - r * 0.08, cy - r * 0.04, cx - r * 0.08, cy + r * 0.38), fill=white, width=int(w * 0.8))
        d.line((cx + r * 0.08, cy - r * 0.04, cx + r * 0.08, cy + r * 0.38), fill=white, width=int(w * 0.8))
    return Image.alpha_composite(img, b)


def resized(img, px):
    return img.resize((px, px), Image.LANCZOS)


def save_ico(img, path, sizes):
    # Pillow writes PNG-compressed frames for every requested size
    img.save(path, format='ICO', sizes=[(s, s) for s in sizes])


ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256]

app = base_icon()
setup = badge(app.copy(), 'setup')
uninstall = badge(app.copy(), 'uninstall')

# --- app icon
for name, px in (('32x32.png', 32), ('64x64.png', 64), ('128x128.png', 128), ('128x128@2x.png', 256), ('256x256.png', 256), ('icon.png', 512)):
    resized(app, px).save(os.path.join(ICONS, name))
save_ico(app, os.path.join(ICONS, 'icon.ico'), ICO_SIZES)
# Windows tile / store sizes
for name, px in (('Square30x30Logo.png', 30), ('Square44x44Logo.png', 44), ('Square71x71Logo.png', 71), ('Square89x89Logo.png', 89), ('Square107x107Logo.png', 107),
                 ('Square142x142Logo.png', 142), ('Square150x150Logo.png', 150), ('Square284x284Logo.png', 284), ('Square310x310Logo.png', 310), ('StoreLogo.png', 50)):
    resized(app, px).save(os.path.join(ICONS, name))
resized(app, 256).save(os.path.join(PUBLIC, 'icon.png'))
resized(app, 512).save(os.path.join(PUBLIC, 'icon-512.png'))

# --- setup / uninstall icons
save_ico(setup, os.path.join(ICONS, 'setup.ico'), ICO_SIZES)
save_ico(uninstall, os.path.join(ICONS, 'uninstall.ico'), ICO_SIZES)
resized(setup, 256).save(os.path.join(ICONS, 'setup.png'))
resized(uninstall, 256).save(os.path.join(ICONS, 'uninstall.png'))


# --- NSIS artwork (BMP, 24-bit)
def pink_bg(w, h, diagonal=True):
    g = Image.new('RGB', (w, h))
    px = g.load()
    for y in range(h):
        for x in range(w):
            t = (x / max(1, w - 1) * 0.35 + y / max(1, h - 1) * 0.65) if diagonal else y / max(1, h - 1)
            px[x, y] = lerp(TOP, BRAND, t / 0.5) if t < 0.5 else lerp(BRAND, BOTTOM, (t - 0.5) / 0.5)
    return g


def circles(img, seed_points):
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for cx, cy, r, a in seed_points:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, a))
    return Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')


side = circles(pink_bg(164, 314), [(150, 40, 90, 22), (10, 300, 110, 18), (120, 250, 50, 14)])
logo = resized(app, 96)
side_rgba = side.convert('RGBA')
side_rgba.alpha_composite(logo, ((164 - 96) // 2, 70))
side_rgba.convert('RGB').save(os.path.join(ICONS, 'installer-sidebar.bmp'))

head = circles(pink_bg(150, 57, False), [(140, 6, 46, 24), (6, 60, 40, 16)])
head_rgba = head.convert('RGBA')
head_rgba.alpha_composite(resized(app, 44), (53, 6))
head_rgba.convert('RGB').save(os.path.join(ICONS, 'installer-header.bmp'))

print('icons written to', ICONS)
