#!/usr/bin/env python3
"""Generate every icon used by Material JSON in the Material 3 Expressive style:
a scalloped "cookie" container in Material light green with a bold, round-capped { : } glyph.

Outputs: app icon (PNG/ICO/ICNS, all desktop sizes), installer + uninstaller icons, and the NSIS banners.

Requires Pillow:  pip install pillow
Run:              python scripts/generate-icons.py
"""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'src-tauri', 'icons')
PUB = os.path.join(ROOT, 'app', 'public')
os.makedirs(OUT, exist_ok=True); os.makedirs(PUB, exist_ok=True)

S = 1024          # final master size
SS = 2            # supersampling factor for crisp edges
W = S * SS

RED = ((156, 204, 101), (85, 139, 47))      # Material light green: 400 -> 800 (name kept for brevity)
MUTED = ((176, 196, 160), (96, 118, 80))    # desaturated light green for the uninstaller

def lerp(c1, c2, t): return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def gradient(size, c1, c2):
    g = Image.linear_gradient('L').resize((size, size)).rotate(45, resample=Image.BICUBIC, expand=False)
    base = Image.new('RGB', (size, size), c1)
    top = Image.new('RGB', (size, size), c2)
    return Image.composite(top, base, g).convert('RGBA')

def cookie_mask(size, lobes=12, amp=0.042, radius=0.47):
    """Scalloped 'cookie' silhouette (M3 Expressive shape)."""
    m = Image.new('L', (size, size), 0)
    cx = cy = size / 2
    pts = []
    for i in range(1440):
        a = i / 1440 * math.tau
        r = size * radius * (1 + amp * math.cos(lobes * a))
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m

def bez(p0, p1, p2, n=40):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(n + 1)]]

def brace_points(mirror=False):
    seg = []
    seg += bez((468, 250), (392, 250), (392, 330))
    seg += [(392, 330), (392, 440)]
    seg += bez((392, 440), (392, 500), (330, 512))
    seg += bez((330, 512), (392, 524), (392, 584))
    seg += [(392, 584), (392, 694)]
    seg += bez((392, 694), (392, 774), (468, 774))
    f = (lambda p: (1024 - p[0], p[1])) if mirror else (lambda p: p)
    return [f(p) for p in seg]

def stroke(draw, pts, width, fill):
    k = SS
    r = width * k / 2
    for x, y in pts:
        draw.ellipse([x * k - r, y * k - r, x * k + r, y * k + r], fill=fill)
    # connect long straight runs
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        draw.line([x0 * k, y0 * k, x1 * k, y1 * k], fill=fill, width=int(width * k))

def glyph_layer(color):
    layer = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for mirror in (False, True):
        stroke(d, brace_points(mirror), 78, color)
    for cy in (448, 576):
        r = 36 * SS
        d.ellipse([512 * SS - r, cy * SS - r, 512 * SS + r, cy * SS + r], fill=color)
    return layer

def tile(colors, glyph=(255, 255, 255, 255)):
    img = gradient(W, *colors)
    # soft light bloom, top-left (Expressive "glow")
    glow = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([-W * .25, -W * .45, W * .95, W * .5], fill=(255, 255, 255, 46))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(W * .02)))
    # inner scalloped ring for depth
    ring = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    inner = cookie_mask(W, radius=0.405)
    ringmask = Image.new('L', (W, W), 0)
    ringmask.paste(255, mask=inner)
    ImageDraw.Draw(ring).bitmap((0, 0), ringmask, fill=(255, 255, 255, 20))
    img = Image.alpha_composite(img, ring)
    # glyph with a soft coloured shadow
    shadow = glyph_layer((22, 62, 12, 255)).filter(ImageFilter.GaussianBlur(10 * SS))
    shadow = Image.merge('RGBA', (*shadow.split()[:3], shadow.split()[3].point(lambda v: int(v * .38))))
    sh = Image.new('RGBA', (W, W), (0, 0, 0, 0)); sh.paste(shadow, (0, 12 * SS), shadow)
    img = Image.alpha_composite(img, sh)
    img = Image.alpha_composite(img, glyph_layer(glyph))
    out = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    out.paste(img, (0, 0), cookie_mask(W))
    return out.resize((S, S), Image.LANCZOS)

def badge(img, kind):
    big = img.resize((W, W), Image.LANCZOS)
    d = ImageDraw.Draw(big)
    r = 250 * SS; cx, cy = (S - 235) * SS, (S - 235) * SS
    shadow = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse([cx - r, cy - r + 14 * SS, cx + r, cy + r + 14 * SS], fill=(0, 0, 0, 90))
    big = Image.alpha_composite(big, shadow.filter(ImageFilter.GaussianBlur(14 * SS)))
    d = ImageDraw.Draw(big)
    fill, ink = ((255, 255, 255, 255), (60, 110, 30, 255)) if kind == 'download' else ((32, 42, 28, 255), (255, 255, 255, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    w = 58 * SS
    def line(a, b):
        d.line([a[0] * SS, a[1] * SS, b[0] * SS, b[1] * SS], fill=ink, width=w)
        for p in (a, b):
            d.ellipse([p[0] * SS - w / 2, p[1] * SS - w / 2, p[0] * SS + w / 2, p[1] * SS + w / 2], fill=ink)
    c = (cx / SS, cy / SS)
    if kind == 'download':
        line((c[0], c[1] - 120), (c[0], c[1] + 70))
        line((c[0] - 92, c[1] - 10), (c[0], c[1] + 82)); line((c[0] + 92, c[1] - 10), (c[0], c[1] + 82))
        line((c[0] - 118, c[1] + 140), (c[0] + 118, c[1] + 140))
    else:
        line((c[0] - 100, c[1] - 100), (c[0] + 100, c[1] + 100)); line((c[0] + 100, c[1] - 100), (c[0] - 100, c[1] + 100))
    return big.resize((S, S), Image.LANCZOS)

app = tile(RED)
installer = badge(tile(RED), 'download')
uninstaller = badge(tile(MUTED), 'remove')

def save_png(img, name, size, folder=OUT):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(folder, name))

for name, size in [('32x32.png', 32), ('128x128.png', 128), ('128x128@2x.png', 256), ('icon.png', 512),
                   ('Square30x30Logo.png', 30), ('Square44x44Logo.png', 44), ('Square71x71Logo.png', 71), ('Square89x89Logo.png', 89),
                   ('Square107x107Logo.png', 107), ('Square142x142Logo.png', 142), ('Square150x150Logo.png', 150),
                   ('Square284x284Logo.png', 284), ('Square310x310Logo.png', 310), ('StoreLogo.png', 50)]:
    save_png(app, name, size)
save_png(app, 'icon.png', 512, PUB)

ICO = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)]
app.save(os.path.join(OUT, 'icon.ico'), sizes=ICO)
installer.save(os.path.join(OUT, 'installer.ico'), sizes=ICO)
uninstaller.save(os.path.join(OUT, 'uninstaller.ico'), sizes=ICO)
app.save(os.path.join(OUT, 'icon.icns'))
save_png(installer, 'installer.png', 512); save_png(uninstaller, 'uninstaller.png', 512)

# ---- NSIS banners (24-bit BMP, exact sizes required by the installer) ----
def font(size, bold=True):
    for f in ['C:/Windows/Fonts/segoeuib.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        if os.path.exists(f): return ImageFont.truetype(f, size)
    return ImageFont.load_default()

def sidebar(c1, c2, logo_tile, label):
    Wd, H = 164, 314
    bg = Image.new('RGB', (Wd, H))
    px = bg.load()
    for y in range(H):
        for x in range(Wd):
            px[x, y] = lerp(c1, c2, y / H * .78 + x / Wd * .22)
    big = logo_tile.resize((300, 300), Image.LANCZOS)
    ghost = big.copy(); ghost.putalpha(ghost.split()[3].point(lambda v: int(v * .15)))
    bg.paste(ghost, (-84, 130), ghost)
    logo = logo_tile.resize((80, 80), Image.LANCZOS)
    bg.paste(logo, (42, 48), logo)
    d = ImageDraw.Draw(bg); f = font(18)
    for i, line in enumerate(label):
        tw = d.textlength(line, font=f); d.text(((Wd - tw) / 2, 146 + i * 24), line, font=f, fill='white')
    return bg

def header(logo_tile, accent):
    Wd, H = 150, 57
    bg = Image.new('RGB', (Wd, H), (248, 253, 244))
    ImageDraw.Draw(bg).rectangle([0, H - 4, Wd, H], fill=accent)
    logo = logo_tile.resize((44, 44), Image.LANCZOS)
    bg.paste(logo, (Wd - 52, 5), logo)
    return bg

sidebar(RED[0], RED[1], app, ['Material', 'JSON']).save(os.path.join(OUT, 'nsis-sidebar.bmp'))
header(app, RED[1]).save(os.path.join(OUT, 'nsis-header.bmp'))
header(uninstaller, MUTED[1]).save(os.path.join(OUT, 'nsis-uninstaller-header.bmp'))
print('icons written to', os.path.normpath(OUT))
